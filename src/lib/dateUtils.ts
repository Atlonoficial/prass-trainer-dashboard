// FASE 2: SIMPLIFICAR PROCESSAMENTO DE DATAS - Unificar todas as funções de data

/**
 * Normaliza data de expiração para ISO string - CORRIGIDO para formato brasileiro
 */
export function normalizeExpirationDate(dateValue: string | Date | null | undefined): string | null {
  if (!dateValue) return null;
  
  try {
    let date: Date;
    
    if (typeof dateValue === 'string') {
      console.log('🗓️ Normalizando data string:', dateValue);
      
      // Se já está no formato YYYY-MM-DD, validar e retornar
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (dateRegex.test(dateValue.trim())) {
        const testDate = new Date(dateValue + 'T00:00:00.000Z');
        if (!isNaN(testDate.getTime())) {
          console.log('📅 Data já no formato correto:', dateValue);
          return dateValue.trim();
        }
      }
      
      // Formato brasileiro DD/MM/YYYY
      if (dateValue.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
        const [day, month, year] = dateValue.split('/').map(Number);
        date = new Date(year, month - 1, day);
        console.log('🗓️ Formato brasileiro detectado:', { day, month, year }, '→', date);
      }
      // Formato ISO YYYY-MM-DD
      else if (dateValue.match(/^\d{4}-\d{2}-\d{2}/)) {
        const [datePart] = dateValue.split(' ');
        const [year, month, day] = datePart.split('-').map(Number);
        date = new Date(year, month - 1, day);
        console.log('🗓️ Formato ISO detectado:', { year, month, day }, '→', date);
      }
      // Fallback para Date constructor
      else {
        date = new Date(dateValue);
        console.log('🗓️ Usando fallback Date constructor:', dateValue, '→', date);
      }
    } else {
      date = dateValue;
    }
    
    // Validar se é uma data válida
    if (isNaN(date.getTime())) {
      console.warn('❌ Data inválida fornecida:', dateValue);
      return null;
    }
    
    // Retornar no formato ISO (YYYY-MM-DD) usando valores locais
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const result = `${year}-${month}-${day}`;
    console.log('✅ Data normalizada final:', dateValue, '→', result);
    return result;
  } catch (error) {
    console.error('❌ Erro ao normalizar data:', error);
    return null;
  }
}

/**
 * Obtém valor de expiração formatado para o modal
 */
export function getExpirationValue(student: any): string {
  // Verificar todas as possíveis fontes de data de expiração
  const expirationSources = [
    student?.membership_expiry,
    student?.expiry,
    student?.expiration_date,
    student?.expires_at
  ];
  
  for (const source of expirationSources) {
    if (source) {
      const normalized = normalizeExpirationDate(source);
      if (normalized) {
        console.log(`📅 Data de expiração encontrada: ${source} -> ${normalized}`);
        return normalized;
      }
    }
  }
  
  console.log('📅 Nenhuma data de expiração encontrada para:', student?.name || 'estudante');
  return '';
}

/**
 * Converte data do formato ISO para Date object
 */
export function parseISODate(isoString: string): Date | null {
  if (!isoString) return null;
  
  try {
    const date = new Date(isoString + 'T00:00:00.000Z'); // Forçar UTC para evitar problemas de timezone
    return isNaN(date.getTime()) ? null : date;
  } catch (error) {
    console.error('Erro ao parse da data ISO:', error);
    return null;
  }
}

/**
 * Formata data para exibição amigável - corrigido para evitar problemas de timezone
 */
export function formatDateForDisplay(dateValue: string | Date | null | undefined): string {
  if (!dateValue) return 'Não definida';
  
  try {
    let date: Date;
    
    if (typeof dateValue === 'string') {
      // Se for string no formato YYYY-MM-DD ou YYYY-MM-DD HH:mm:ss+00
      if (dateValue.match(/^\d{4}-\d{2}-\d{2}/) && !dateValue.includes('T')) {
        // Tratar como data local para evitar conversão UTC
        const [datePart] = dateValue.split(' ');
        const [year, month, day] = datePart.split('-').map(Number);
        date = new Date(year, month - 1, day);
      } else {
        date = new Date(dateValue);
      }
    } else {
      date = dateValue;
    }
    
    if (isNaN(date.getTime())) {
      return 'Data inválida';
    }
    
    return date.toLocaleDateString('pt-BR');
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return 'Erro na data';
  }
}

/**
 * Verifica se uma data está expirada
 */
export function isExpired(dateValue: string | Date | null | undefined): boolean {
  if (!dateValue) return false;
  
  try {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    const now = new Date();
    
    return date < now;
  } catch (error) {
    console.error('Erro ao verificar expiração:', error);
    return false;
  }
}

/**
 * Adiciona dias a uma data
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Adiciona meses a uma data
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Converte timestamp para data ISO
 */
export function timestampToISO(timestamp: string | number): string {
  try {
    const date = new Date(timestamp);
    return normalizeExpirationDate(date);
  } catch (error) {
    console.error('Erro ao converter timestamp:', error);
    return '';
  }
}