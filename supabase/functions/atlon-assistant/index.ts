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

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { 
      message,
      conversationId,
      teacherId,
      threadId,
      context
    } = await req.json();

    console.log('Atlon Assistant Request:', { message: message.substring(0, 100), conversationId, teacherId, threadId });

    // ID do Assistant criado na OpenAI
    const ASSISTANT_ID = 'asst_zQ6UCKzOpMWcCJEerGbDmfjF';

    // Buscar contexto do professor (dados dos alunos)
    let professorContext = '';
    if (teacherId && context?.includeStudentData) {
      try {
        const { data: students } = await supabase
          .from('students')
          .select(`
            *,
            anamneses:anamneses(doencas, alergias, medicacoes, lesoes),
            progress:progress(type, value, unit, created_at)
          `)
          .eq('teacher_id', teacherId)
          .limit(10);

        if (students && students.length > 0) {
          professorContext = `
CONTEXTO DO PROFESSOR:
Você tem acesso aos seguintes dados de alunos para análises (use apenas quando relevante):
${students.map(s => `
- ${s.name || 'Aluno'}: ${s.goals?.join(', ') || 'Sem objetivos definidos'}
  Plano ativo: ${s.active_plan || 'Nenhum'}
  Status: ${s.membership_status || 'Ativo'}
  ${s.anamneses?.length ? `Observações médicas: ${s.anamneses[0]?.doencas?.join(', ') || 'Nenhuma'}` : ''}
`).join('')}
          `;
        }
      } catch (error) {
        console.warn('Erro ao buscar contexto do professor:', error);
      }
    }

    // Gerenciar thread da OpenAI
    let currentThreadId = threadId;
    
    if (!currentThreadId) {
      // Criar nova thread
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
            teacher_id: teacherId,
            conversation_id: conversationId
          }
        })
      });

      if (!threadResponse.ok) {
        throw new Error(`Failed to create thread: ${threadResponse.status}`);
      }

      const threadData = await threadResponse.json();
      currentThreadId = threadData.id;
      console.log('Created thread:', currentThreadId);

      // Salvar thread_id na conversa
      if (conversationId) {
        await supabase
          .from('atlon_assistant_conversations')
          .update({ 
            thread_id: currentThreadId,
            updated_at: new Date().toISOString()
          })
          .eq('id', conversationId);
      }
    }

    // Adicionar contexto do professor como mensagem adicional se houver
    if (professorContext.trim()) {
      await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          role: 'user',
          content: `CONTEXTO ADICIONAL: ${professorContext}\n\nPERGUNTA: ${message}`
        })
      });
    } else {
      // Adicionar mensagem do usuário à thread
      await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          role: 'user',
          content: message
        })
      });
    }

    // Executar o assistant
    console.log('Running assistant with ID:', ASSISTANT_ID);
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        assistant_id: ASSISTANT_ID
        // Removido max_completion_tokens - pode não ser suportado pela Assistants API
      })
    });

    if (!runResponse.ok) {
      const errorText = await runResponse.text();
      console.error('Assistant run failed:', runResponse.status, errorText);
      throw new Error(`Failed to run assistant: ${runResponse.status} - ${errorText}`);
    }

    const runData = await runResponse.json();
    const runId = runData.id;
    console.log('Assistant run started:', runId);

    // Aguardar conclusão da execução (polling) - reduzido para 15 segundos
    let runStatus = 'queued';
    let attempts = 0;
    const maxAttempts = 15; // Reduzido para evitar timeout da Edge Function
    
    while (!['completed', 'failed', 'cancelled', 'expired'].includes(runStatus) && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar 1 segundo
      
      const statusResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs/${runId}`, {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });
      
      if (!statusResponse.ok) {
        console.error('Failed to check run status:', statusResponse.status);
        break;
      }
      
      const statusData = await statusResponse.json();
      runStatus = statusData.status;
      attempts++;
      
      console.log(`Run status: ${runStatus}, attempt: ${attempts}`);
      
      // Tratamento específico para status 'incomplete'
      if (runStatus === 'incomplete') {
        console.warn('Assistant run stuck in incomplete status, will try fallback...');
        break;
      }
      
      if (runStatus === 'failed' || runStatus === 'cancelled' || runStatus === 'expired') {
        console.error('Assistant run failed with status:', runStatus, statusData);
        throw new Error(`Assistant run failed: ${runStatus}`);
      }
    }

    // Se não completou ou ficou em 'incomplete', usar fallback
    if (runStatus !== 'completed') {
      console.warn(`Assistant timeout or incomplete (status: ${runStatus}), using Chat Completions fallback...`);
      
      // Fallback para Chat Completions API
      const fallbackResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
              content: `Você é um assistente virtual especializado em educação física e nutrição esportiva da Atlon Tech. 
                       Forneça respostas profissionais, práticas e baseadas em evidências científicas.
                       Mantenha as respostas concisas (máximo 400 caracteres).
                       ${professorContext ? `\n\nCONTEXTO: ${professorContext}` : ''}`
            },
            {
              role: 'user',
              content: message
            }
          ],
          max_tokens: 150,
          temperature: 0.7
        })
      });

      if (!fallbackResponse.ok) {
        throw new Error(`Fallback API failed: ${fallbackResponse.status}`);
      }

      const fallbackData = await fallbackResponse.json();
      let aiResponse = fallbackData.choices[0].message.content;
      
      // Garantir limite de 600 caracteres
      if (aiResponse.length > 600) {
        aiResponse = aiResponse.substring(0, 597) + '...';
      }

      console.log('Fallback response generated:', aiResponse.length, 'characters');
      
      // Salvar conversa com indicação de fallback
      if (conversationId && teacherId) {
        try {
          await supabase
            .from('atlon_assistant_messages')
            .insert({
              conversation_id: conversationId,
              role: 'user',
              content: message,
              metadata: { 
                context,
                thread_id: currentThreadId,
                fallback_used: true
              }
            });

          await supabase
            .from('atlon_assistant_messages')
            .insert({
              conversation_id: conversationId,
              role: 'assistant',
              content: aiResponse,
              metadata: { 
                assistant_id: 'fallback-chat-completion',
                thread_id: currentThreadId,
                characters: aiResponse.length,
                fallback_used: true,
                original_run_status: runStatus
              }
            });

          await supabase
            .from('atlon_assistant_conversations')
            .update({ 
              updated_at: new Date().toISOString(),
              thread_id: currentThreadId,
              title: message.length > 50 ? message.substring(0, 47) + '...' : message
            })
            .eq('id', conversationId);
        } catch (error) {
          console.error('Error saving fallback conversation:', error);
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        response: aiResponse,
        characters: aiResponse.length,
        threadId: currentThreadId,
        metadata: {
          assistant_id: 'fallback-chat-completion',
          thread_id: currentThreadId,
          fallback_used: true,
          original_status: runStatus,
          timestamp: new Date().toISOString()
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar mensagens da thread
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages?order=desc&limit=1`, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    if (!messagesResponse.ok) {
      throw new Error(`Failed to fetch messages: ${messagesResponse.status}`);
    }

    const messagesData = await messagesResponse.json();
    const lastMessage = messagesData.data[0];
    
    if (!lastMessage || lastMessage.role !== 'assistant') {
      throw new Error('No assistant response found');
    }

    let aiResponse = lastMessage.content[0].text.value;
    
    // Garantir limite de 600 caracteres
    if (aiResponse.length > 600) {
      aiResponse = aiResponse.substring(0, 597) + '...';
      console.log('Response truncated to 600 characters');
    }

    console.log('OpenAI Assistant Response received:', aiResponse.length, 'characters');

    // Salvar a conversa se conversationId foi fornecido
    if (conversationId && teacherId) {
      try {
        // Salvar mensagem do usuário
        await supabase
          .from('atlon_assistant_messages')
          .insert({
            conversation_id: conversationId,
            role: 'user',
            content: message,
            metadata: { 
              context,
              thread_id: currentThreadId
            }
          });

        // Salvar resposta do assistente
        await supabase
          .from('atlon_assistant_messages')
          .insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: aiResponse,
            metadata: { 
              assistant_id: ASSISTANT_ID,
              thread_id: currentThreadId,
              run_id: runId,
              characters: aiResponse.length,
              openai_message_id: lastMessage.id
            }
          });

        // Atualizar timestamp e thread_id da conversa
        await supabase
          .from('atlon_assistant_conversations')
          .update({ 
            updated_at: new Date().toISOString(),
            thread_id: currentThreadId,
            title: message.length > 50 ? message.substring(0, 47) + '...' : message
          })
          .eq('id', conversationId);

        console.log('Conversation saved successfully');
      } catch (error) {
        console.error('Error saving conversation:', error);
        // Não falhar se salvar deu erro - apenas log
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      response: aiResponse,
      characters: aiResponse.length,
      threadId: currentThreadId,
      metadata: {
        assistant_id: ASSISTANT_ID,
        thread_id: currentThreadId,
        run_id: runId,
        timestamp: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in atlon-assistant function:', error);
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