// Interface completa com campos reais e calculados para compatibilidade
export interface Student {
  id: string
  user_id: string
  name: string
  email: string
  phone?: string
  avatar?: string | null
  // Dados reais da tabela students
  active_plan: string | null
  mode: string
  membership_status: string
  goals: string[] | string | null
  membership_expiry: string | null
  teacher_id: string | null
  created_at: string
  updated_at: string
  // Campos calculados para compatibilidade (derivados dos campos reais)
  plan: string
  status: string
  goal: string
}