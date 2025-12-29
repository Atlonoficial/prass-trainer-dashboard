import { Student } from "@/types/student";
import { getExpirationValue as getExpirationValueNew, normalizeExpirationDate as normalizeExpirationDateNew, formatDateForDisplay } from "./dateUtils";

/**
 * Função centralizada para exibir data de expiração do aluno
 * SEMPRE prioriza membership_expiry como fonte única da verdade
 * CORRIGIDO: Usa nova função unificada de formatação
 */
export function getExpirationDisplay(student: Student): string {
  try {
    const dateString = student.membership_expiry;
    if (!dateString) return 'Sem data definida';
    
    return formatDateForDisplay(dateString);
  } catch (error) {
    console.error('Erro ao formatar data de expiração:', error);
    return 'Erro na data';
  }
}

/**
 * Função para obter a data de expiração em formato ISO para forms
 * SEMPRE usar membership_expiry como fonte única da verdade
 * MIGRADO: Usa nova função unificada
 */
export function getExpirationValue(student: Student): string {
  return getExpirationValueNew(student);
}

/**
 * Função para validar e normalizar data de input
 * MIGRADO: Usa nova função unificada
 */
export function normalizeExpirationDate(dateInput: string): string | null {
  const result = normalizeExpirationDateNew(dateInput);
  return result || null;
}

/**
 * Função centralizada para validar se um aluno pode agendar consultas
 * Verifica se o aluno tem:
 * - Membership ativo
 * - Modalidade Híbrido ou Presencial
 * - Plano pago (não é 'free')
 */
export function canStudentSchedule(student: Student): boolean {
  // Verifica se o membership está ativo
  if (student.membership_status !== 'active') {
    return false
  }

  // Verifica se a modalidade permite agendamento
  if (student.mode !== 'Híbrido' && student.mode !== 'Presencial') {
    return false
  }

  // Verifica se tem plano pago (não é free ou vazio)
  if (!student.active_plan || student.active_plan === 'free' || student.active_plan === '') {
    return false
  }

  return true
}

/**
 * Retorna a mensagem explicativa de por que o aluno não pode agendar
 */
export function getSchedulingBlockReason(student: Student): string {
  if (student.membership_status !== 'active') {
    return 'Membership inativo'
  }

  if (student.mode !== 'Híbrido' && student.mode !== 'Presencial') {
    return 'Modalidade não permite agendamento'
  }

  if (!student.active_plan || student.active_plan === 'free' || student.active_plan === '') {
    return 'Necessário plano pago'
  }

  return ''
}