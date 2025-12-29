/**
 * ULTRA-SANITIZAÇÃO DE PAYLOAD - CORREÇÃO DEFINITIVA
 * 
 * Estratégia Multicamada:
 * 1. Remove arrays vazios de campos PostgreSQL ARRAY
 * 2. Converte para null quando necessário
 * 3. Valida tipos rigorosamente
 * 4. Usa deep clone para prevenir referências
 * 5. Logging detalhado em cada etapa
 */

export interface WorkoutPayload {
  name: string;
  description?: string | null;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  status?: 'active' | 'inactive' | 'completed';
  exercises_data?: any[];  // JSONB - pode ser vazio
  exercises?: any[];  // JSONB - pode ser vazio (alias)
  assigned_students?: string[];  // ARRAY - não pode ser vazio
  tags?: string[];  // ARRAY - não pode ser vazio
  notes?: string | null;
  duration_weeks?: number | null;
  sessions_per_week?: number | null;
  is_template?: boolean;
  tenant_id?: string | null;
  created_by: string;
  [key: string]: any;
}

/**
 * FASE 1: Deep Clone para prevenir referências
 */
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * FASE 2: Ultra-sanitização de arrays
 * Remove arrays vazios de campos PostgreSQL ARRAY
 * Mantém arrays vazios apenas para JSONB (como exercises_data)
 */
function ultraSanitizeArrays(payload: any): any {
  console.log('🔬 [ULTRA-SANITIZE] Iniciando sanitização profunda...');
  console.log('📥 [INPUT]:', JSON.stringify(payload, null, 2));

  const sanitized: any = {};

  // Campos que são JSONB (podem ter arrays vazios)
  const jsonbFields = ['exercises_data', 'exercises'];

  // Campos que são PostgreSQL ARRAY (NÃO podem ter arrays vazios)
  const arrayFields = ['muscle_groups', 'tags', 'equipment', 'assigned_students'];

  for (const [key, value] of Object.entries(payload)) {
    // Pular valores undefined
    if (value === undefined) {
      console.log(`⏭️  [SKIP] Campo "${key}": undefined`);
      continue;
    }

    // Tratar arrays especificamente
    if (Array.isArray(value)) {
      if (jsonbFields.includes(key)) {
        // JSONB: manter array mesmo se vazio
        sanitized[key] = value;
        console.log(`✅ [JSONB] Campo "${key}": mantido (length: ${value.length})`);
      } else if (arrayFields.includes(key)) {
        // PostgreSQL ARRAY: remover se vazio
        if (value.length > 0) {
          sanitized[key] = value;
          console.log(`✅ [ARRAY] Campo "${key}": incluído (length: ${value.length})`);
        } else {
          // OMITIR COMPLETAMENTE - não enviar null, apenas omitir
          console.log(`🚫 [ARRAY] Campo "${key}": OMITIDO (array vazio)`);
        }
      } else {
        // Outros arrays: incluir se tiver conteúdo
        if (value.length > 0) {
          sanitized[key] = value;
          console.log(`✅ [OTHER] Campo "${key}": incluído (length: ${value.length})`);
        }
      }
    } else if (value === null) {
      // Manter null explícito
      sanitized[key] = null;
      console.log(`✅ [NULL] Campo "${key}": null explícito`);
    } else if (typeof value === 'string' && value.trim() === '') {
      // String vazia: converter para null
      sanitized[key] = null;
      console.log(`🔄 [CONVERT] Campo "${key}": "" → null`);
    } else {
      // Outros valores: incluir normalmente
      sanitized[key] = value;
      console.log(`✅ [VALUE] Campo "${key}": ${typeof value}`);
    }
  }

  console.log('📤 [OUTPUT]:', JSON.stringify(sanitized, null, 2));
  console.log('✅ [ULTRA-SANITIZE] Sanitização concluída\n');

  return sanitized;
}

/**
 * FASE 3: Validação final antes do envio
 * Garante que nenhum array vazio chegue ao Supabase
 */
function validatePayload(payload: any): { valid: boolean; errors: string[] } {
  console.log('🔍 [VALIDATE] Iniciando validação final...');

  const errors: string[] = [];

  // Campos obrigatórios
  if (!payload.name || typeof payload.name !== 'string' || payload.name.trim() === '') {
    errors.push('Campo "name" é obrigatório');
  }

  // Validar difficulty
  if (payload.difficulty && !['beginner', 'intermediate', 'advanced'].includes(payload.difficulty)) {
    errors.push('Campo "difficulty" deve ser: beginner, intermediate ou advanced');
  }

  // Validar status
  if (payload.status && !['active', 'inactive', 'completed'].includes(payload.status)) {
    errors.push('Campo "status" deve ser: active, inactive ou completed');
  }

  // Validar exercises_data ou exercises (deve ser array, pode estar vazio)
  const hasExercises = Array.isArray(payload.exercises_data) || Array.isArray(payload.exercises);
  if (!hasExercises) {
    errors.push('Campo "exercises" ou "exercises_data" deve ser um array');
  }

  // CRÍTICO: Verificar se há arrays vazios em campos PostgreSQL ARRAY
  const arrayFields = ['muscle_groups', 'tags', 'equipment', 'assigned_students'];
  for (const field of arrayFields) {
    if (field in payload) {
      if (Array.isArray(payload[field]) && payload[field].length === 0) {
        errors.push(`❌ CRÍTICO: Campo "${field}" contém array vazio - causará erro "malformed array literal"`);
        console.error(`🚨 [VALIDATE] Array vazio detectado em "${field}"`);
      }
    }
  }

  // Validar números
  if (payload.duration_weeks !== undefined && payload.duration_weeks !== null) {
    if (typeof payload.duration_weeks !== 'number' || payload.duration_weeks < 0) {
      errors.push('Campo "duration_weeks" deve ser um número positivo');
    }
  }

  if (payload.sessions_per_week !== undefined && payload.sessions_per_week !== null) {
    if (typeof payload.sessions_per_week !== 'number' || payload.sessions_per_week < 0) {
      errors.push('Campo "sessions_per_week" deve ser um número positivo');
    }
  }

  const valid = errors.length === 0;

  if (valid) {
    console.log('✅ [VALIDATE] Payload válido\n');
  } else {
    console.error('❌ [VALIDATE] Payload inválido:', errors);
  }

  return { valid, errors };
}

/**
 * FUNÇÃO PRINCIPAL: Ultra-sanitização com validação
 * 
 * Esta é a função definitiva que combina todas as estratégias:
 * 1. Deep clone para prevenir referências
 * 2. Ultra-sanitização de arrays
 * 3. Validação rigorosa
 * 4. Logging detalhado
 */
export function ultraSanitizeWorkoutPayload(payload: WorkoutPayload): {
  sanitized: any;
  valid: boolean;
  errors: string[];
} {
  console.log('\n🚀 ============================================');
  console.log('🚀 INICIANDO ULTRA-SANITIZAÇÃO DE PAYLOAD');
  console.log('🚀 ============================================\n');

  // FASE 1: Deep clone
  console.log('📋 [FASE 1] Deep Clone...');
  const cloned = deepClone(payload);

  // FASE 2: Ultra-sanitização
  console.log('\n🧹 [FASE 2] Ultra-Sanitização...');
  const sanitized = ultraSanitizeArrays(cloned);

  // FASE 3: Validação final
  console.log('\n✓ [FASE 3] Validação Final...');
  const validation = validatePayload(sanitized);

  // Log final
  console.log('\n📊 ============================================');
  console.log('📊 RESULTADO FINAL DA SANITIZAÇÃO');
  console.log('📊 ============================================');
  console.log('Status:', validation.valid ? '✅ VÁLIDO' : '❌ INVÁLIDO');
  if (validation.errors.length > 0) {
    console.log('Erros:', validation.errors);
  }
  console.log('Payload Final:', JSON.stringify(sanitized, null, 2));
  console.log('============================================\n');

  return {
    sanitized,
    valid: validation.valid,
    errors: validation.errors
  };
}

/**
 * Função auxiliar: Verifica se payload é seguro para PostgreSQL
 */
export function isPostgresSafe(payload: any): boolean {
  const arrayFields = ['muscle_groups', 'tags', 'equipment', 'assigned_students'];

  for (const field of arrayFields) {
    if (field in payload) {
      if (Array.isArray(payload[field]) && payload[field].length === 0) {
        return false;
      }
    }
  }

  return true;
}
