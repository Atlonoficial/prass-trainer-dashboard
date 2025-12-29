import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz'
import { format, Locale } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Fuso horário padrão: Brasília
export const DEFAULT_TIMEZONE = 'America/Sao_Paulo'

/**
 * Converte uma data para o fuso horário de Brasília
 */
export function toBrasiliaTime(date: Date | string): Date {
  const inputDate = typeof date === 'string' ? new Date(date) : date
  return toZonedTime(inputDate, DEFAULT_TIMEZONE)
}

/**
 * Converte uma data do fuso de Brasília para UTC
 */
export function fromBrasiliaTime(date: Date): Date {
  return fromZonedTime(date, DEFAULT_TIMEZONE)
}

/**
 * Formata uma data no fuso horário de Brasília
 */
export function formatInBrasilia(
  date: Date | string, 
  formatStr: string = 'dd/MM/yyyy HH:mm',
  options?: { locale?: Locale }
): string {
  const inputDate = typeof date === 'string' ? new Date(date) : date
  return formatInTimeZone(inputDate, DEFAULT_TIMEZONE, formatStr, {
    locale: options?.locale || ptBR
  })
}

/**
 * Retorna a data/hora atual no fuso de Brasília
 */
export function nowInBrasilia(): Date {
  return toBrasiliaTime(new Date())
}

/**
 * Formata data e hora separadamente no fuso de Brasília
 */
export function formatDateTimeBrasilia(date: Date | string) {
  const inputDate = typeof date === 'string' ? new Date(date) : date
  
  return {
    date: formatInBrasilia(inputDate, "dd 'de' MMMM"),
    time: formatInBrasilia(inputDate, 'HH:mm'),
    dateTime: formatInBrasilia(inputDate, "dd/MM/yyyy 'às' HH:mm"),
    full: formatInBrasilia(inputDate, "EEEE, dd 'de' MMMM 'de' yyyy 'às' HH:mm")
  }
}

/**
 * Verifica se uma data está no mesmo dia (considerando fuso de Brasília)
 */
export function isSameDayBrasilia(date1: Date | string, date2: Date | string): boolean {
  const d1 = toBrasiliaTime(date1)
  const d2 = toBrasiliaTime(date2)
  
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate()
}

/**
 * Cria uma nova data no fuso de Brasília
 */
export function createBrasiliaDate(
  year: number, 
  month: number, 
  day: number, 
  hour: number = 0, 
  minute: number = 0, 
  second: number = 0
): Date {
  const localDate = new Date(year, month, day, hour, minute, second)
  return fromBrasiliaTime(localDate)
}