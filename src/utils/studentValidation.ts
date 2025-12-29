import { isValid, parseISO, isFuture, isPast } from 'date-fns'

export interface StudentFormData {
  name: string
  email: string
  plan: string
  mode: string
  status: string
  goals: string[]
  membership_expiry: string
}

export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

export function validateStudentForm(formData: StudentFormData): ValidationResult {
  const errors: Record<string, string> = {}

  // Validar nome
  if (!formData.name?.trim()) {
    errors.name = 'Nome é obrigatório'
  } else if (formData.name.trim().length < 2) {
    errors.name = 'Nome deve ter pelo menos 2 caracteres'
  }

  // Validar email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!formData.email?.trim()) {
    errors.email = 'Email é obrigatório'
  } else if (!emailRegex.test(formData.email.trim())) {
    errors.email = 'Email deve ter um formato válido'
  }

  // Validar plano
  if (!formData.plan || formData.plan === 'loading' || formData.plan === 'no-plans') {
    // 'none' é permitido (sem plano)
    if (formData.plan !== 'none') {
      errors.plan = 'Selecione um plano válido'
    }
  }

  // Validar modalidade
  const validModes = ['Presencial', 'Online', 'Híbrido']
  if (!formData.mode || !validModes.includes(formData.mode)) {
    errors.mode = 'Selecione uma modalidade válida'
  }

// Validar status
  const validStatuses = ['Ativo', 'Inativo', 'Suspenso']
  if (!formData.status || !validStatuses.includes(formData.status)) {
    errors.status = 'Selecione um status válido'
  }

  // Validar objetivos - agora só requer um objetivo
  if (!formData.goals || formData.goals.length === 0) {
    errors.goals = 'Selecione um objetivo'
  }

  // Validar data de expiração
  if (formData.membership_expiry) {
    try {
      const expirationDate = parseISO(formData.membership_expiry)
      if (!isValid(expirationDate)) {
        errors.membership_expiry = 'Data de expiração inválida'
      } else if (isPast(expirationDate) && !isToday(expirationDate)) {
        errors.membership_expiry = 'Data de expiração não pode ser no passado'
      }
    } catch {
      errors.membership_expiry = 'Data de expiração inválida'
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

function isToday(date: Date): boolean {
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

// Map Portuguese status to database format
export function mapStatusToDatabase(status: string): string {
  if (!status) return 'inactive';
  
  const statusMap: { [key: string]: string } = {
    'Ativo': 'active',
    'Inativo': 'inactive', 
    'Suspenso': 'suspended',
    'Pendente': 'pending',
    'Expirado': 'expired',
    // Também suportar valores já em inglês
    'active': 'active',
    'inactive': 'inactive',
    'suspended': 'suspended',
    'pending': 'pending',
    'expired': 'expired'
  };
  
  const normalizedStatus = statusMap[status] || status.toLowerCase();
  console.log(`🔄 Status mapping: "${status}" → "${normalizedStatus}"`);
  return normalizedStatus;
}

// Map database status to Portuguese for UI
export function mapStatusFromDatabase(status: string): string {
  if (!status) return 'Inativo';
  
  const statusMap: { [key: string]: string } = {
    'active': 'Ativo',
    'inactive': 'Inativo',
    'suspended': 'Suspenso',
    'pending': 'Pendente',
    'expired': 'Expirado',
    // Também suportar valores já em português
    'Ativo': 'Ativo',
    'Inativo': 'Inativo',
    'Suspenso': 'Suspenso',
    'Pendente': 'Pendente',
    'Expirado': 'Expirado'
  };
  
  const displayStatus = statusMap[status] || 'Inativo';
  console.log(`🔄 Status display: "${status}" → "${displayStatus}"`);
  return displayStatus;
}

export function sanitizeFormData(formData: StudentFormData): StudentFormData {
  console.log('🧹 Sanitizando dados:', formData);
  
  const sanitized = {
    name: formData.name?.trim() || '',
    email: formData.email?.trim().toLowerCase() || '',
    plan: formData.plan === 'none' || formData.plan === 'loading' || formData.plan === 'no-plans' ? 'none' : formData.plan,
    mode: formData.mode || '',
    status: mapStatusToDatabase(formData.status || 'Ativo'), // Converter para inglês
    goals: Array.isArray(formData.goals) ? formData.goals.filter(g => g?.trim()) : [],
    membership_expiry: formData.membership_expiry || ''
  };
  
  console.log('✅ Dados sanitizados:', sanitized);
  return sanitized;
}