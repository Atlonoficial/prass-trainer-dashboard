import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is not set');
        }

        // Get user from authorization header
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            throw new Error('Authorization header required');
        }

        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

        // Verify user token
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Unauthorized'
            }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const { message, conversationId } = await req.json();

        console.log('AI Assistant Request:', {
            message: message?.substring(0, 100),
            conversationId,
            userId: user.id
        });

        // Check daily usage limit
        const today = new Date().toISOString().split('T')[0];
        const { data: usageData } = await supabase
            .from('ai_usage_stats')
            .select('daily_count')
            .eq('user_id', user.id)
            .eq('usage_date', today)
            .maybeSingle();

        const currentCount = usageData?.daily_count || 0;

        // Check if user is premium (you can customize this logic)
        const { data: profileData } = await supabase
            .from('profiles')
            .select('is_premium')
            .eq('id', user.id)
            .single();

        const isPremium = profileData?.is_premium || false;
        const DAILY_LIMIT = isPremium ? 20 : 3;

        if (currentCount >= DAILY_LIMIT) {
            return new Response(JSON.stringify({
                success: false,
                error: `Você atingiu o limite diário de ${DAILY_LIMIT} perguntas. Tente novamente amanhã às 00:00.`,
                type: 'daily_limit_exceeded'
            }), {
                status: 429,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Get or create conversation
        let activeConversationId = conversationId;
        let threadId = null;

        if (conversationId) {
            const { data: convData } = await supabase
                .from('ai_conversations')
                .select('thread_id')
                .eq('id', conversationId)
                .single();

            threadId = convData?.thread_id;
        } else {
            // Create new conversation
            const { data: newConv, error: convError } = await supabase
                .from('ai_conversations')
                .insert({
                    user_id: user.id,
                    title: message.length > 50 ? message.substring(0, 47) + '...' : message
                })
                .select()
                .single();

            if (convError) {
                console.error('Error creating conversation:', convError);
                throw new Error('Failed to create conversation');
            }

            activeConversationId = newConv.id;
        }

        // Get student context (goals, anamnese, progress, trainings)
        let studentContext = '';
        let hasAnamnese = false;
        let hasTrainings = false;
        let hasAppointments = false;

        try {
            // 1. Buscar dados do aluno
            const { data: studentData } = await supabase
                .from('students')
                .select(`
                    id, name, goals, mode, membership_status, teacher_id
                `)
                .eq('user_id', user.id)
                .maybeSingle();

            if (studentData) {
                studentContext = `
DADOS DO ALUNO:
- Nome: ${studentData.name || 'Aluno'}
- Objetivos: ${studentData.goals?.length > 0 ? studentData.goals.join(', ') : 'NÃO CADASTRADOS'}
- Modalidade: ${studentData.mode || 'NÃO INFORMADA'}`;

                // 2. Buscar anamnese do aluno (usando student_id, não user_id)
                const { data: anamneseData } = await supabase
                    .from('anamneses')
                    .select('*')
                    .eq('student_id', studentData.id)
                    .maybeSingle();

                if (anamneseData) {
                    hasAnamnese = true;
                    const doencas = anamneseData.doencas?.length > 0 ? anamneseData.doencas.join(', ') : 'Nenhuma';
                    const alergias = anamneseData.alergias?.length > 0 ? anamneseData.alergias.join(', ') : 'Nenhuma';
                    const lesoes = anamneseData.lesoes || 'Nenhuma';
                    studentContext += `

ANAMNESE (DADOS REAIS):
- Doenças: ${doencas}
- Alergias: ${alergias}
- Lesões: ${lesoes}
- Qualidade do sono: ${anamneseData.qualidade_sono || 'Não informado'}
- Horas de sono: ${anamneseData.horas_sono || 'Não informado'}`;
                } else {
                    studentContext += `

ANAMNESE: NÃO PREENCHIDA - O aluno NÃO possui anamnese cadastrada.`;
                }

                // 3. Buscar treinos atribuídos ao aluno
                const { data: trainingPlans } = await supabase
                    .from('student_training_plans')
                    .select('*, training_plans(name, description)')
                    .eq('student_id', studentData.id)
                    .eq('is_active', true);

                if (trainingPlans && trainingPlans.length > 0) {
                    hasTrainings = true;
                    studentContext += `

TREINOS ATIVOS:
${trainingPlans.map(tp => `- ${tp.training_plans?.name || 'Treino sem nome'}`).join('\n')}`;
                } else {
                    studentContext += `

TREINOS: NENHUM TREINO ATRIBUÍDO - O aluno não possui planos de treino.`;
                }

                // 4. Buscar agendamentos futuros
                const { data: appointments } = await supabase
                    .from('appointments')
                    .select('scheduled_time, title, status')
                    .eq('student_id', studentData.id)
                    .gte('scheduled_time', new Date().toISOString())
                    .order('scheduled_time', { ascending: true })
                    .limit(3);

                if (appointments && appointments.length > 0) {
                    hasAppointments = true;
                    studentContext += `

PRÓXIMOS AGENDAMENTOS:
${appointments.map(a => `- ${a.title || 'Consulta'}: ${new Date(a.scheduled_time).toLocaleDateString('pt-BR')}`).join('\n')}`;
                } else {
                    studentContext += `

AGENDAMENTOS: NENHUM AGENDAMENTO FUTURO`;
                }
            } else {
                studentContext = `
ALUNO NÃO ENCONTRADO - Não foi possível encontrar dados deste aluno no sistema.`;
            }

            // Adicionar flags para o prompt
            studentContext += `

STATUS DOS DADOS:
- Anamnese preenchida: ${hasAnamnese ? 'SIM' : 'NÃO'}
- Treinos atribuídos: ${hasTrainings ? 'SIM' : 'NÃO'}
- Agendamentos futuros: ${hasAppointments ? 'SIM' : 'NÃO'}`;

        } catch (error) {
            console.warn('Error fetching student context:', error);
            studentContext = `ERRO: Não foi possível carregar os dados do aluno.`;
        }

        // Create or use existing OpenAI thread
        if (!threadId) {
            console.log('Creating new OpenAI thread...');
            const threadResponse = await fetch('https://api.openai.com/v1/threads', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                    'OpenAI-Beta': 'assistants=v2'
                },
                body: JSON.stringify({
                    metadata: {
                        user_id: user.id,
                        conversation_id: activeConversationId
                    }
                })
            });

            if (!threadResponse.ok) {
                throw new Error(`Failed to create thread: ${threadResponse.status}`);
            }

            const threadData = await threadResponse.json();
            threadId = threadData.id;
            console.log('Created thread:', threadId);

            // Save thread_id
            await supabase
                .from('ai_conversations')
                .update({
                    thread_id: threadId,
                    updated_at: new Date().toISOString()
                })
                .eq('id', activeConversationId);
        }

        // Use Chat Completions API directly for faster responses
        console.log('Calling Chat Completions API...');
        const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `Você é o Coach IA do PRAS Trainer, um assistente virtual especializado em fitness e nutrição.

## REGRA CRÍTICA - NUNCA INVENTE DADOS:
⚠️ VOCÊ SÓ PODE USAR INFORMAÇÕES QUE ESTÃO EXPLICITAMENTE LISTADAS NO "CONTEXTO DESTE ALUNO" ABAIXO.
⚠️ Se a anamnese estiver marcada como "NÃO PREENCHIDA", você NÃO SABE nada sobre a saúde do aluno.
⚠️ Se não houver treinos atribuídos, você NÃO SABE qual treino o aluno faz.
⚠️ Se os dados estiverem faltando, SEMPRE oriente o aluno a procurar o treinador.

## SUAS FUNÇÕES PRINCIPAIS:

1. **GERAR TREINOS PERSONALIZADOS**: APENAS se houver anamnese preenchida e você conhecer os objetivos. Caso contrário, diga: "Para criar um treino seguro, preciso conhecer seu histórico de saúde. Por favor, preencha sua anamnese ou converse com seu treinador."

2. **CRIAR SUGESTÕES DE DIETA**: APENAS para dicas gerais. Para planos alimentares, oriente sempre a consultar o nutricionista/treinador.

3. **AJUDAR COM AGENDAMENTOS**: Informe sobre a importância de agendar consultas regulares e como fazer isso pelo app.

4. **MONITORAR E ORIENTAR SOBRE PROGRESSO**: APENAS comente sobre dados que você realmente possui. Não invente números ou resultados.

## QUANDO DADOS ESTIVEREM FALTANDO:
- Se "Anamnese preenchida: NÃO" → Diga: "Vi que você ainda não preencheu sua anamnese. É importante para eu poder te ajudar melhor! Você pode preencher em Perfil > Anamnese ou conversar com seu treinador."
- Se "Treinos atribuídos: NÃO" → Diga: "Você ainda não tem um plano de treino. Converse com seu treinador para receber um treino personalizado."
- Se "Agendamentos futuros: NÃO" → Sugira agendar uma consulta com o treinador.

## REGRAS IMPORTANTES:
- Seja amigável, motivador e empático 💪
- Mantenha respostas concisas (máximo 400 caracteres)
- SEMPRE oriente o aluno a conversar com seu treinador para decisões importantes
- Use emojis com moderação para tornar a conversa acolhedora
- NUNCA substitua o acompanhamento profissional
- NUNCA invente informações sobre o aluno

${studentContext ? `\n## CONTEXTO DESTE ALUNO:\n${studentContext}` : '\n## CONTEXTO: DADOS NÃO DISPONÍVEIS - Oriente o aluno a conversar com o treinador.'}`
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ],
                max_tokens: 250,
                temperature: 0.7
            })
        });

        if (!chatResponse.ok) {
            const errorText = await chatResponse.text();
            console.error('Chat API failed:', chatResponse.status, errorText);
            throw new Error(`Chat API failed: ${chatResponse.status}`);
        }

        const chatData = await chatResponse.json();
        let aiResponse = chatData.choices[0].message.content;

        // Remove function call syntax that shouldn't be shown to users
        // Pattern: [assistant to=functions.xxx] { ... }
        aiResponse = aiResponse.replace(/\[assistant\s+to=functions\.[^\]]+\][\s\S]*?(?=\n\n|$)/gi, '');
        aiResponse = aiResponse.replace(/\[assistant[\s\S]*?\]/gi, '');
        // Pattern: {funções.xxx: {...}} or {functions.xxx: {...}}
        aiResponse = aiResponse.replace(/\{fun[çc][õo]es\.[^:]+:[\s\S]*?\}\}/gi, '');
        aiResponse = aiResponse.replace(/\{functions\.[^:]+:[\s\S]*?\}\}/gi, '');
        // Pattern: {"alunoId": ...} variations
        aiResponse = aiResponse.replace(/\{\s*["']?aluno[Ii]d["']?\s*:[\s\S]*?\}/gi, '');
        aiResponse = aiResponse.replace(/\{\s*["']?seu id[^"']*["']?\s*\}/gi, '');
        // Remove phrases about fetching data
        aiResponse = aiResponse.replace(/Vou buscar essas informações agora\.?/gi, '');
        aiResponse = aiResponse.replace(/Vamos analisar seus dados de anamnese primeiro\.?/gi, '');
        aiResponse = aiResponse.trim();

        // If response becomes empty after filtering, provide a fallback
        if (!aiResponse || aiResponse.length < 10) {
            aiResponse = 'Para te ajudar melhor, preciso que preencha sua anamnese ou converse diretamente com seu treinador! 💪';
        }

        // Ensure max length
        if (aiResponse.length > 600) {
            aiResponse = aiResponse.substring(0, 597) + '...';
        }

        console.log('AI Response generated:', aiResponse.length, 'characters');

        // Save messages to database
        try {
            // Save user message
            await supabase
                .from('ai_messages')
                .insert({
                    conversation_id: activeConversationId,
                    role: 'user',
                    content: message,
                    metadata: { thread_id: threadId }
                });

            // Save assistant response
            await supabase
                .from('ai_messages')
                .insert({
                    conversation_id: activeConversationId,
                    role: 'assistant',
                    content: aiResponse,
                    metadata: {
                        thread_id: threadId,
                        characters: aiResponse.length,
                        model: 'gpt-4o-mini'
                    }
                });

            // Update conversation
            await supabase
                .from('ai_conversations')
                .update({
                    updated_at: new Date().toISOString(),
                    title: message.length > 50 ? message.substring(0, 47) + '...' : message
                })
                .eq('id', activeConversationId);

            // Update daily usage count
            if (usageData) {
                await supabase
                    .from('ai_usage_stats')
                    .update({
                        daily_count: currentCount + 1,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', user.id)
                    .eq('usage_date', today);
            } else {
                await supabase
                    .from('ai_usage_stats')
                    .insert({
                        user_id: user.id,
                        usage_date: today,
                        daily_count: 1
                    });
            }

            console.log('Messages saved, usage updated');
        } catch (error) {
            console.error('Error saving conversation:', error);
        }

        return new Response(JSON.stringify({
            success: true,
            response: aiResponse,
            conversationId: activeConversationId,
            characters: aiResponse.length,
            usage: {
                used: currentCount + 1,
                limit: DAILY_LIMIT,
                remaining: DAILY_LIMIT - currentCount - 1
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error in ai-assistant function:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return new Response(JSON.stringify({
            success: false,
            error: errorMessage
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
