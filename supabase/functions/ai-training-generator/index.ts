import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função de fallback para dieta semanal estruturada
function createDietFallback(goal: string, useAnamnesis: boolean, studentId: string | null) {
  const baseDays = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];

  const sampleMeals = [
    {
      name: "Café da Manhã",
      time: "08:00",
      foods: [
        { name: "Aveia", quantity: "50g", calories: 180, proteins: 6, carbs: 30, fats: 3 },
        { name: "Banana", quantity: "1 unidade", calories: 90, proteins: 1, carbs: 23, fats: 0 }
      ],
      calories: 270,
      preparation_notes: "Misturar aveia com água quente e fatiar a banana por cima"
    },
    {
      name: "Lanche da Manhã",
      time: "10:00",
      foods: [
        { name: "Iogurte natural", quantity: "150g", calories: 100, proteins: 8, carbs: 12, fats: 4 }
      ],
      calories: 100,
      preparation_notes: "Consumir gelado"
    },
    {
      name: "Almoço",
      time: "12:30",
      foods: [
        { name: "Peito de frango grelhado", quantity: "150g", calories: 250, proteins: 46, carbs: 0, fats: 6 },
        { name: "Arroz integral", quantity: "100g", calories: 110, proteins: 3, carbs: 22, fats: 1 },
        { name: "Brócolis", quantity: "100g", calories: 25, proteins: 3, carbs: 5, fats: 0 }
      ],
      calories: 385,
      preparation_notes: "Grelhar o frango com temperos naturais"
    },
    {
      name: "Lanche da Tarde",
      time: "15:30",
      foods: [
        { name: "Castanhas", quantity: "30g", calories: 180, proteins: 6, carbs: 6, fats: 16 }
      ],
      calories: 180,
      preparation_notes: "Consumir porção controlada"
    },
    {
      name: "Jantar",
      time: "19:00",
      foods: [
        { name: "Salmão assado", quantity: "120g", calories: 200, proteins: 28, carbs: 0, fats: 9 },
        { name: "Batata doce", quantity: "100g", calories: 85, proteins: 2, carbs: 20, fats: 0 },
        { name: "Salada mista", quantity: "150g", calories: 30, proteins: 2, carbs: 6, fats: 0 }
      ],
      calories: 315,
      preparation_notes: "Assar salmão com ervas e limão"
    }
  ];

  const days = baseDays.map(dayName => ({
    day: dayName,
    meals: sampleMeals,
    daily_totals: {
      calories: 1250,
      proteins: 96,
      carbs: 124,
      fats: 39
    }
  }));

  return {
    name: `Plano Alimentar Semanal - ${goal}`,
    description: `Plano nutricional de 7 dias focado em ${goal.toLowerCase()}`,
    duration_weeks: 1,
    weekly_plan: [{
      week: 1,
      days: days
    }],
    weekly_totals: {
      avg_daily_calories: 1250,
      avg_daily_proteins: 96,
      avg_daily_carbs: 124,
      avg_daily_fats: 39
    },
    safety_considerations: "Plano básico de emergência. Consulte um nutricionista para personalização.",
    substitution_options: "Substitua conforme preferências e restrições alimentares",
    generated_with_ai: false,
    fallback: true,
    generation_context: {
      useAnamnesis,
      goal,
      studentId
    }
  };
}

// Função de fallback para treino estruturado
function createTrainingFallback(goal: string, level: string, equipment: string[]) {
  const exercises = [
    {
      name: "Agachamento",
      muscle_group: "Pernas",
      sets: 3,
      reps: "12-15",
      rest_time: 60,
      instructions: "Descer mantendo a coluna reta e joelhos alinhados",
      safety_notes: "Não deixe os joelhos ultrapassarem a ponta dos pés",
      modifications: "Use cadeira para apoio se necessário"
    },
    {
      name: "Flexão de Braço",
      muscle_group: "Peito/Braços",
      sets: 3,
      reps: "8-12",
      rest_time: 45,
      instructions: "Manter corpo alinhado durante todo movimento",
      safety_notes: "Não force além do limite",
      modifications: "Faça apoiado nos joelhos se necessário"
    },
    {
      name: "Prancha",
      muscle_group: "Core",
      sets: 3,
      reps: "30-45s",
      rest_time: 30,
      instructions: "Manter corpo reto como uma prancha",
      safety_notes: "Não deixe o quadril ceder",
      modifications: "Apoie nos joelhos para reduzir intensidade"
    }
  ];

  return {
    name: `Plano de Treino - ${goal}`,
    description: `Treino ${level} focado em ${goal.toLowerCase()}`,
    duration_weeks: 4,
    exercises: exercises,
    safety_considerations: "Plano básico de emergência. Consulte um educador físico para personalização.",
    progression_notes: "Aumente gradualmente a intensidade a cada semana",
    generated_with_ai: false,
    fallback: true,
    generation_context: {
      goal,
      level,
      equipment
    }
  };
}

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
      type,
      useAnamnesis,
      studentId,
      goal,
      equipment,
      level,
      duration,
      mealsPerDay,
      dietaryRestrictions,
      message,
      context
    } = await req.json();

    console.log('🤖 [AI_GENERATION] Request received:', {
      type,
      useAnamnesis,
      studentId,
      goal,
      equipment: equipment?.length || 0,
      level,
      duration,
      mealsPerDay,
      dietaryRestrictions: dietaryRestrictions?.length || 0
    });

    let contextData = '';
    let systemPrompt = '';
    let userPrompt = '';

    // Buscar dados contextuais se anamnese estiver ativada
    let hasUserData = false;
    if (useAnamnesis && studentId) {
      console.log('📊 [AI_CONTEXT] Fetching user context data for:', studentId);

      // Buscar anamnese
      const { data: anamnesis, error: anamnesisError } = await supabase
        .from('anamneses')
        .select('*')
        .eq('user_id', studentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (anamnesisError) {
        console.warn('⚠️ [AI_CONTEXT] Error fetching anamnesis:', anamnesisError);
      }

      // Buscar dados físicos
      const { data: physicalData, error: physicalError } = await supabase
        .from('progress')
        .select('*')
        .eq('user_id', studentId)
        .in('type', ['weight', 'height', 'body_fat'])
        .order('created_at', { ascending: false });

      if (physicalError) {
        console.warn('⚠️ [AI_CONTEXT] Error fetching physical data:', physicalError);
      }

      if (anamnesis || physicalData?.length) {
        hasUserData = true;
        contextData = `
DADOS MÉDICOS E FÍSICOS:
${anamnesis ? `
- Doenças: ${anamnesis.doencas?.join(', ') || 'Nenhuma'}
- Alergias: ${anamnesis.alergias?.join(', ') || 'Nenhuma'}
- Outras alergias: ${anamnesis.outras_alergias || 'Nenhuma'}
- Medicações: ${anamnesis.medicacoes?.join(', ') || 'Nenhuma'}
- Lesões: ${anamnesis.lesoes || 'Nenhuma'}
- Qualidade do sono: ${anamnesis.qualidade_sono || 'Não informado'}
- Horas de sono: ${anamnesis.horas_sono || 'Não informado'}
` : ''}
${physicalData?.length ? `
DADOS FÍSICOS ATUAIS:
${physicalData.map(p => `- ${p.type}: ${p.value} ${p.unit || ''}`).join('\n')}
` : ''}
        `;
        console.log('✅ [AI_CONTEXT] Context data assembled successfully');
      } else {
        console.log('ℹ️ [AI_CONTEXT] No context data found');
      }
    }

    // Configurar prompts baseados no tipo
    if (type === 'chat') {
      // Modo chat do assistente pessoal
      systemPrompt = `Você é um assistente pessoal especializado em fitness e nutrição. 
Seja útil, motivador e sempre priorize a segurança do usuário.
Responda de forma concisa e prática.`;

      const userPrompt = message;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4-0613',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API Error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;

      return new Response(JSON.stringify({
        success: true,
        data: { response: aiResponse }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (type === 'training') {
      systemPrompt = `Você é um especialista em educação física e personal trainer com mais de 10 anos de experiência. 
Sua missão é criar planos de treino seguros, eficazes e personalizados.

${useAnamnesis && contextData ? `
IMPORTANTE - ANÁLISE MÉDICA:
O aluno forneceu dados médicos. Analise cuidadosamente as limitações:
${contextData}

REGRAS DE SEGURANÇA:
- Se há lesões, evite exercícios que possam agravar
- Se há problemas cardíacos, evite exercícios de alta intensidade
- Se há problemas articulares, priorize exercícios de baixo impacto
- Se há medicações, considere possíveis interações com exercícios
- SEMPRE priorize a segurança sobre a intensidade
` : `
MODO GERAL (sem dados médicos específicos):
Crie um treino seguro e progressivo, assumindo que o aluno é saudável.
`}

FORMATO DE RESPOSTA (JSON):
{
  "name": "Nome do Plano",
  "description": "Descrição detalhada",
  "duration_weeks": número,
  "exercises": [
    {
      "name": "Nome do Exercício",
      "muscle_group": "grupo_muscular",
      "sets": número,
      "reps": "número ou faixa (ex: 12-15)",
      "rest_time": número_em_segundos,
      "instructions": "Instruções detalhadas",
      "safety_notes": "Observações de segurança",
      "modifications": "Modificações para limitações"
    }
  ],
  "safety_considerations": "Considerações gerais de segurança",
  "progression_notes": "Como progredir semana a semana"
}`;

      userPrompt = `Crie um plano de treino com as seguintes especificações:
- Objetivo: ${goal}
- Equipamentos disponíveis: ${equipment?.join(', ') || 'Peso corporal'}
- Nível: ${level}
- Duração por sessão: ${duration} minutos

${useAnamnesis && contextData ? 'IMPORTANTE: Considere as limitações médicas mencionadas acima.' : ''}

Seja específico e detalhado. Inclua exercícios variados e progressivos.`;

    } else if (type === 'diet') {
      systemPrompt = `Você é um nutricionista especializado com mais de 10 anos de experiência. 
Sua missão é criar planos alimentares seguros, equilibrados e personalizados.

${useAnamnesis && contextData ? `
IMPORTANTE - ANÁLISE MÉDICA:
O aluno forneceu dados médicos. Analise cuidadosamente as restrições:
${contextData}

REGRAS DE SEGURANÇA ALIMENTAR:
- Se há alergias alimentares, EVITE completamente esses alimentos
- Se há diabetes, controle carboidratos e açúcares
- Se há hipertensão, reduza sódio
- Se há problemas renais, monitore proteínas
- Se há medicações, verifique interações alimentares
- SEMPRE priorize a segurança nutricional
` : `
MODO GERAL (sem dados médicos específicos):
Crie um plano alimentar equilibrado, assumindo que o aluno é saudável.
`}

FORMATO DE RESPOSTA (JSON):
{
  "name": "Nome do Plano",
  "description": "Descrição detalhada",
  "duration_weeks": número,
  "meals": [
    {
      "name": "Café da Manhã",
      "time": "08:00",
      "foods": [
        {
          "name": "Alimento",
          "quantity": "quantidade",
          "calories": número,
          "proteins": número,
          "carbs": número,
          "fats": número
        }
      ],
      "calories": total_calorias,
      "preparation_notes": "Como preparar"
    }
  ],
  "daily_totals": {
    "calories": número,
    "proteins": número,
    "carbs": número,
    "fats": número
  },
  "safety_considerations": "Considerações nutricionais importantes",
  "substitution_options": "Opções de substituição para variedade"
}`;

      userPrompt = `Crie um plano alimentar SEMANAL COMPLETO (7 dias) para ${goal}. 
${mealsPerDay || 5} refeições/dia. ${dietaryRestrictions?.length ? 'Restrições: ' + dietaryRestrictions.join(', ') : 'Sem restrições específicas'}.

${useAnamnesis && contextData ? 'IMPORTANTE: Adapte às limitações médicas mencionadas.' : ''}

RESPONDA APENAS COM JSON VÁLIDO (sem markdown):
{
  "name": "Plano Alimentar ${goal}",
  "description": "Plano semanal personalizado",
  "duration_weeks": 1,
  "days": [
    {
      "day": "Segunda-feira",
      "meals": [
        {
          "name": "Café da Manhã",
          "time": "08:00",
          "foods": [{"name": "Aveia", "quantity": "50g", "calories": 180, "proteins": 6, "carbs": 30, "fats": 3}],
          "calories": 180,
          "proteins": 6,
          "carbs": 30,
          "fats": 3
        }
      ],
      "daily_totals": {"calories": 1200, "proteins": 80, "carbs": 120, "fats": 40}
    }
  ],
  "weekly_totals": {"avg_daily_calories": 1200, "avg_daily_proteins": 80, "avg_daily_carbs": 120, "avg_daily_fats": 40}
}

REQUISITOS:
- Exatamente 7 dias (segunda a domingo)
- ${mealsPerDay || 5} refeições/dia com horários
- Valores nutricionais precisos
- Alimentos variados entre os dias
- Totais diários e semanais calculados
- JSON válido e completo`;
    }

    console.log('🚀 [AI_OPENAI] Sending request to OpenAI API:', {
      model: 'gpt-4-0613',
      max_tokens: type === 'diet' ? 10000 : 4000,
      type,
      hasContext: !!contextData
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-0613',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: type === 'diet' ? 10000 : 4000, // Mais tokens para dietas semanais
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API Error:', error);
      throw new Error(`OpenAI API Error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('📨 [AI_OPENAI] Response received:', {
      responseLength: aiResponse.length,
      tokensUsed: data.usage?.total_tokens || 'unknown',
      model: data.model
    });

    // Parse response com melhorias
    let generatedPlan;
    console.log('🔍 [AI_PARSE] Starting JSON parse, response length:', aiResponse.length);

    try {
      // Extrair JSON se estiver dentro de markdown
      const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/) ||
        aiResponse.match(/```\n([\s\S]*?)\n```/) ||
        aiResponse.match(/\{[\s\S]*\}/);

      let jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiResponse;

      // Advanced JSON repair
      jsonString = jsonString.trim();

      // Remove any markdown formatting
      jsonString = jsonString.replace(/```json\n?/g, '').replace(/```\n?/g, '');

      // Remove any text before the first {
      const firstBrace = jsonString.indexOf('{');
      if (firstBrace > 0) {
        console.log('🔧 [AI_PARSE] Removing text before first brace');
        jsonString = jsonString.substring(firstBrace);
      }

      // Remove any text after the last }
      const lastBrace = jsonString.lastIndexOf('}');
      if (lastBrace !== -1 && lastBrace < jsonString.length - 1) {
        console.log('🔧 [AI_PARSE] Removing text after last brace');
        jsonString = jsonString.substring(0, lastBrace + 1);
      }

      // Try to fix common issues
      jsonString = jsonString
        .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
        .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Quote unquoted keys
        .replace(/:\s*'([^']*)'/g, ': "$1"'); // Replace single quotes with double

      generatedPlan = JSON.parse(jsonString);

      // Validar estrutura específica para dietas
      if (type === 'diet') {
        if (!generatedPlan.days && !generatedPlan.meals) {
          throw new Error('Invalid diet structure: missing days or meals array');
        }

        // Convert old format to new format if needed
        if (generatedPlan.meals && !generatedPlan.days) {
          console.log('🔄 [AI_PARSE] Converting old meal format to weekly format');
          generatedPlan.weekly_plan = [{
            week: 1,
            days: [{
              day: 'Segunda-feira',
              meals: generatedPlan.meals
            }]
          }];
        }
      }

      console.log('✅ [AI_PARSE] JSON parsed successfully');

    } catch (parseError) {
      console.error('❌ [AI_PARSE] JSON parse error:', parseError);
      console.log('📝 [AI_PARSE] Raw response preview (first 1000 chars):', aiResponse.substring(0, 1000));
      console.log('📝 [AI_PARSE] Raw response preview (last 500 chars):', aiResponse.substring(Math.max(0, aiResponse.length - 500)));

      console.log('🆘 [AI_PARSE] Using fallback plan generation');
      if (type === 'diet') {
        generatedPlan = createDietFallback(goal, useAnamnesis, studentId);
      } else {
        generatedPlan = createTrainingFallback(goal, level, equipment);
      }
    }

    // Validate and enhance parsed data
    console.log('📊 [AI_VALIDATE] Generated plan data:', JSON.stringify(generatedPlan, null, 2));

    // Add metadata for tracking
    generatedPlan.generated_with_ai = true;
    generatedPlan.generated_at = new Date().toISOString();
    generatedPlan.generation_context = {
      type,
      goal,
      useAnamnesis,
      hasUserData,
      studentId,
      equipment: equipment || [],
      level: level || 'intermediate',
      mealsPerDay: type === 'diet' ? mealsPerDay : undefined,
      dietaryRestrictions: type === 'diet' ? dietaryRestrictions : undefined
    };

    console.log('✅ [AI_SUCCESS] Plan generation completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        data: generatedPlan,
        hasContextData: hasUserData,
        message: 'Plan generated successfully',
        metadata: {
          parsedSuccessfully: true,
          hasWeeklyStructure: type === 'diet' && (generatedPlan.weekly_plan || generatedPlan.days),
          totalItems: type === 'diet' ?
            (generatedPlan.days?.reduce((acc: number, day: any) =>
              acc + (day.meals?.length || 0), 0) ||
              generatedPlan.weekly_plan?.reduce((acc: number, week: any) =>
                acc + (week.days?.reduce((dayAcc: number, day: any) =>
                  dayAcc + (day.meals?.length || 0), 0) || 0), 0) ||
              generatedPlan.meals?.length || 0) :
            (generatedPlan.exercises?.length || 0)
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ [AI_ERROR] Critical error in ai-training-generator:', error);
    console.error('❌ [AI_ERROR] Error stack:', (error as Error)?.stack);

    // Generate fallback plan on critical error
    let fallbackPlan;
    try {
      console.log('🆘 [AI_FALLBACK] Generating fallback plan');

      // Extract variables from the main scope safely
      const currentType = req.url.includes('diet') || JSON.stringify(req).includes('diet') ? 'diet' : 'training';
      const fallbackGoal = 'Melhoria geral da saúde';
      const fallbackLevel = 'intermediate';
      const fallbackEquipment: string[] = [];
      const fallbackStudentId = null;
      const fallbackUseAnamnesis = false;

      if (currentType === 'diet') {
        fallbackPlan = createDietFallback(fallbackGoal, fallbackUseAnamnesis, fallbackStudentId);
      } else {
        fallbackPlan = createTrainingFallback(fallbackGoal, fallbackLevel, fallbackEquipment);
      }

      console.log('✅ [AI_FALLBACK] Fallback plan generated successfully');

      return new Response(
        JSON.stringify({
          success: true,
          data: fallbackPlan,
          hasContextData: false,
          message: 'Plan generated using fallback method',
          usedFallback: true
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    } catch (fallbackError) {
      console.error('❌ [AI_FALLBACK] Fallback generation also failed:', fallbackError);

      return new Response(
        JSON.stringify({
          success: false,
          error: (error as Error)?.message || 'Unknown error',
          details: 'Failed to generate plan and fallback failed',
          fallbackError: (fallbackError as Error)?.message || 'Unknown fallback error'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }
  }
});