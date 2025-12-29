/**
 * Sistema de Mapeamento de Serviços - Português BR
 * Padroniza todos os tipos de agendamento para português brasileiro
 */

// Serviços disponíveis em português brasileiro
export const SERVICOS_DISPONIVEIS = [
  'Treino Individual',
  'Avaliação Física',
  'Consulta',
  'Acompanhamento',
  'Aula em Grupo',
  'Treino Personalizado'
] as const;

// Mapeamento para compatibilidade com sistema existente
export const SERVICE_MAPPING: Record<string, string> = {
  // Português -> Sistema
  'Treino Individual': 'training',
  'Avaliação Física': 'assessment',
  'Consulta': 'consultation',
  'Acompanhamento': 'follow_up',
  'Aula em Grupo': 'class',
  'Treino Personalizado': 'personal_training',
  
  // Compatibilidade reversa (Sistema -> Português)
  'training': 'Treino Individual',
  'assessment': 'Avaliação Física',
  'consultation': 'Consulta',
  'follow_up': 'Acompanhamento',
  'class': 'Aula em Grupo',
  'personal_training': 'Treino Personalizado'
};

/**
 * Converte serviço em português para valor aceito pelo sistema
 */
export const mapServiceToSystem = (service: string): string => {
  // Se já é um valor do sistema, retorna como está
  if (['training', 'assessment', 'consultation', 'follow_up', 'class', 'personal_training'].includes(service)) {
    return service;
  }
  
  // Mapeia português para sistema
  return SERVICE_MAPPING[service] || service;
};

/**
 * Converte valor do sistema para português
 */
export const mapServiceToPortuguese = (service: string): string => {
  // Se já está em português, retorna como está
  if (SERVICOS_DISPONIVEIS.includes(service as any)) {
    return service;
  }
  
  // Mapeia sistema para português
  return SERVICE_MAPPING[service] || service;
};

/**
 * Valida se o serviço é válido (em qualquer formato)
 */
export const isValidService = (service: string): boolean => {
  return SERVICOS_DISPONIVEIS.includes(service as any) || 
         Object.keys(SERVICE_MAPPING).includes(service);
};

/**
 * Retorna lista de serviços em português para UI
 */
export const getServicesForUI = (): string[] => {
  return [...SERVICOS_DISPONIVEIS];
};

/**
 * Normaliza serviço para envio ao backend
 */
export const normalizeServiceForBackend = (service: string): string => {
  return mapServiceToSystem(service);
};

/**
 * Normaliza serviço para exibição na UI
 */
export const normalizeServiceForUI = (service: string): string => {
  return mapServiceToPortuguese(service);
};