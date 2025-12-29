// Normalizador universal de dados de estudante
// Este arquivo centraliza toda a lógica de mapeamento e normalização

import type { Student } from '@/types/student'

export interface ProfileData {
  name: string
  email: string
  phone?: string | null
}

export interface StudentData {
  user_id: string
  active_plan: string | null
  mode: string
  membership_status: string
  goals: string[]
  membership_expiry: string | null
}

export interface NormalizedStudentData {
  user_id: string;
  profileData: ProfileData;
  studentData: StudentData;
}

// Status mapping (PT ↔ EN)
export const STATUS_MAP_PT_TO_EN: Record<string, string> = {
  'Ativo': 'active',
  'Inativo': 'inactive', 
  'Suspenso': 'suspended',
  'Pendente': 'pending',
  'Expirado': 'expired'
}

export const STATUS_MAP_EN_TO_PT: Record<string, string> = {
  'active': 'Ativo',
  'inactive': 'Inativo',
  'suspended': 'Suspenso', 
  'pending': 'Pendente',
  'expired': 'Expirado'
}

/**
 * ✅ CORRIGIDO: Normaliza status para inglês (database format)
 */
export function normalizeStatusToDatabase(status: string): string {
  if (!status) return 'inactive'
  
  console.log('🔄 Status normalization input:', status)
  
  // Normalizar entrada (trim e lowercase para comparação)
  const cleanStatus = status.trim()
  
  // Se está em português, converte
  if (STATUS_MAP_PT_TO_EN[cleanStatus]) {
    const result = STATUS_MAP_PT_TO_EN[cleanStatus]
    console.log('✅ PT→EN conversion:', cleanStatus, '→', result)
    return result
  }
  
  // Se já está em inglês, normaliza para lowercase
  const lowerStatus = cleanStatus.toLowerCase()
  if (STATUS_MAP_EN_TO_PT[lowerStatus]) {
    console.log('✅ Already in EN:', cleanStatus, '→', lowerStatus)
    return lowerStatus
  }
  
  console.warn('⚠️ Status unknown, defaulting to inactive:', cleanStatus)
  return 'inactive'
}

/**
 * Normaliza status do inglês para português (UI format)
 */
export function normalizeStatusToUI(status: string): string {
  if (!status) return 'Inativo'
  
  // Se já está em português, retorna como está
  if (STATUS_MAP_PT_TO_EN[status]) {
    return status
  }
  
  // Se está em inglês, converte
  return STATUS_MAP_EN_TO_PT[status.toLowerCase()] || 'Inativo'
}

/**
 * Normaliza goals para array
 */
export function normalizeGoals(goals: any): string[] {
  if (Array.isArray(goals)) {
    return goals.filter(goal => goal && typeof goal === 'string' && goal.trim())
  }
  
  if (typeof goals === 'string' && goals.trim()) {
    return [goals.trim()]
  }
  
  return []
}

/**
 * ✅ CORREÇÃO DEFINITIVA: Normalização robusta de data DD/MM/YYYY → YYYY-MM-DD
 */
export function normalizeMembershipExpiry(expiry: any): string | null {
  if (!expiry) {
    console.log('📅 [NORMALIZER] Data vazia, retornando null')
    return null
  }
  
  console.log('📅 [NORMALIZER] Entrada recebida:', expiry, '| Tipo:', typeof expiry)
  
  try {
    let dateObj: Date | null = null
    
    if (expiry instanceof Date) {
      dateObj = expiry
      console.log('📅 [NORMALIZER] Já é Date object')
    } 
    else if (typeof expiry === 'string') {
      const cleanExpiry = expiry.trim()
      console.log('📅 [NORMALIZER] String limpa:', cleanExpiry)
      
      // ✅ FORMATO BRASILEIRO DD/MM/YYYY
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cleanExpiry)) {
        console.log('📅 [NORMALIZER] Detectado formato brasileiro DD/MM/YYYY')
        const [day, month, year] = cleanExpiry.split('/')
        
        // Validar componentes
        const dayNum = parseInt(day, 10)
        const monthNum = parseInt(month, 10)
        const yearNum = parseInt(year, 10)
        
        if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 1900) {
          // Criar data no formato correto (month - 1 porque Date usa 0-based months)
          dateObj = new Date(yearNum, monthNum - 1, dayNum)
          console.log('📅 [NORMALIZER] Data brasileira convertida:', dateObj)
        } else {
          console.warn('⚠️ [NORMALIZER] Componentes de data inválidos:', { day: dayNum, month: monthNum, year: yearNum })
        }
      }
      // ✅ FORMATO ISO YYYY-MM-DD
      else if (/^\d{4}-\d{2}-\d{2}$/.test(cleanExpiry)) {
        console.log('📅 [NORMALIZER] Detectado formato ISO YYYY-MM-DD')
        dateObj = new Date(cleanExpiry + 'T12:00:00.000Z')
      }
      // ✅ FORMATO AMERICANO MM/DD/YYYY
      else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cleanExpiry)) {
        console.log('📅 [NORMALIZER] Tentativa com formato americano MM/DD/YYYY')
        dateObj = new Date(cleanExpiry)
      }
      // ✅ OUTROS FORMATOS - Deixar o Date tentar parsear
      else {
        console.log('📅 [NORMALIZER] Formato desconhecido, tentando parseamento genérico')
        dateObj = new Date(cleanExpiry)
      }
    } 
    else {
      console.log('📅 [NORMALIZER] Tipo não string/Date, tentando conversão direta')
      dateObj = new Date(expiry)
    }
    
    // ✅ VALIDAÇÃO FINAL DA DATA
    if (!dateObj || isNaN(dateObj.getTime())) {
      console.warn('⚠️ [NORMALIZER] Data inválida após parsing:', dateObj)
      return null
    }
    
    // ✅ CONVERSÃO PARA FORMATO YYYY-MM-DD
    const year = dateObj.getFullYear()
    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
    const day = String(dateObj.getDate()).padStart(2, '0')
    const result = `${year}-${month}-${day}`
    
    console.log('✅ [NORMALIZER] Sucesso! Data normalizada:', expiry, '→', result)
    return result
    
  } catch (error) {
    console.error('❌ [NORMALIZER] Erro crítico na normalização:', error, '| Input:', expiry)
    return null
  }
}

/**
 * Normaliza plano para formato correto
 */
export function normalizePlan(plan: any): string | null {
  if (!plan || plan === 'none' || plan === 'loading' || plan === 'no-plans') {
    return null
  }
  
  return String(plan)
}

/**
 * ✅ NORMALIZAÇÃO DEFINITIVA SEPARADA POR TABELAS
 */
export function normalizeStudentForDatabase(student: any): NormalizedStudentData {
  console.log('🔧 NORMALIZADOR CORRIGIDO - Dados recebidos:', student)
  
  const user_id = String(student.user_id || student.id || '')
  if (!user_id) {
    throw new Error('user_id é obrigatório para normalização')
  }
  
  // ✅ PROFILES DATA - CAMPOS CORRETOS DA TABELA PROFILES
  const profiles: ProfileData = {
    name: String(student.name || '').trim(),
    email: String(student.email || '').trim(),
    phone: String(student.phone || '').trim() || null, // ⚠️ CORRIGIDO: phone pode ser null
  }
  
  // ✅ STUDENTS DATA - CAMPOS CORRETOS DA TABELA STUDENTS
  const students: StudentData = {
    user_id,
    active_plan: normalizePlan(student.plan || student.active_plan),
    mode: String(student.mode || 'Online'),
    membership_status: normalizeStatusToDatabase(student.status || student.membership_status || 'inactive'),
    goals: normalizeGoals(student.goals || []),
    membership_expiry: normalizeMembershipExpiry(student.membership_expiry),
  }
  
  console.log('📋 PROFILES normalizados:', profiles)
  console.log('📋 STUDENTS normalizados:', students)
  
  const normalized: NormalizedStudentData = {
    user_id,
    profileData: profiles,
    studentData: students
  }
  
  console.log('✅ RESULTADO FINAL normalizado:', normalized)
  return normalized
}

/**
 * Normaliza dados do estudante para exibição na UI
 */
export function normalizeStudentForUI(student: any): Student {
  const goals = normalizeGoals(student.goals)
  
  return {
    id: student.id,
    user_id: student.user_id,
    name: student.name || 'Nome não disponível',
    email: student.email || 'Email não disponível', 
    phone: student.phone || null,
    avatar: student.avatar_url || student.avatar || null,
    // Dados reais da tabela
    active_plan: student.active_plan,
    mode: student.mode || 'Online',
    membership_status: student.membership_status || 'inactive',
    goals: goals,
    membership_expiry: student.membership_expiry,
    teacher_id: student.teacher_id,
    created_at: student.created_at,
    updated_at: student.updated_at,
    // Campos calculados para compatibilidade
    plan: student.active_plan || 'none',
    status: normalizeStatusToUI(student.membership_status || student.status || 'inactive'),
    goal: goals.length > 0 ? goals[0] : 'Não definido'
  }
}

/**
 * ✅ VALIDAÇÃO DEFINITIVA DOS DADOS SEPARADOS
 */
export function validateNormalizedData(data: NormalizedStudentData): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!data.user_id) errors.push('user_id é obrigatório')
  if (!data.profileData.name.trim()) errors.push('Nome é obrigatório')
  if (!data.profileData.email.trim()) errors.push('Email é obrigatório')
  
  // Validar email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (data.profileData.email && !emailRegex.test(data.profileData.email)) {
    errors.push('Email deve ter formato válido')
  }
  
  // Validar status
  const validStatuses = ['active', 'inactive', 'suspended', 'pending', 'expired']
  if (!validStatuses.includes(data.studentData.membership_status)) {
    errors.push('Status deve ser válido')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}