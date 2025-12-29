/**
 * Mapping for evaluation field translations and formatting
 * Maps English field names to Portuguese labels with units
 */

export interface FieldMapping {
  label: string
  unit: string
  category: 'physical' | 'performance' | 'health' | 'assessment'
}

export const evaluationFieldsMapping: Record<string, FieldMapping> = {
  // Physical measurements
  weight: { label: 'Peso', unit: 'kg', category: 'physical' },
  height: { label: 'Altura', unit: 'cm', category: 'physical' },
  body_fat: { label: '% Gordura', unit: '%', category: 'physical' },
  muscle_mass: { label: 'Massa Muscular', unit: 'kg', category: 'physical' },
  waist: { label: 'Cintura', unit: 'cm', category: 'physical' },
  chest: { label: 'Peito', unit: 'cm', category: 'physical' },
  arm: { label: 'Braço', unit: 'cm', category: 'physical' },
  thigh: { label: 'Coxa', unit: 'cm', category: 'physical' },
  neck: { label: 'Pescoço', unit: 'cm', category: 'physical' },
  hip: { label: 'Quadril', unit: 'cm', category: 'physical' },
  forearm: { label: 'Antebraço', unit: 'cm', category: 'physical' },
  calf: { label: 'Panturrilha', unit: 'cm', category: 'physical' },
  
  // Health metrics
  blood_pressure: { label: 'Pressão Arterial', unit: 'mmHg', category: 'health' },
  heart_rate: { label: 'Frequência Cardíaca', unit: 'bpm', category: 'health' },
  resting_heart_rate: { label: 'FC Repouso', unit: 'bpm', category: 'health' },
  max_heart_rate: { label: 'FC Máxima', unit: 'bpm', category: 'health' },
  
  // Performance metrics
  flexibility: { label: 'Flexibilidade', unit: 'cm', category: 'performance' },
  strength: { label: 'Força', unit: 'kg', category: 'performance' },
  cardio: { label: 'Cardio', unit: 'min', category: 'performance' },
  endurance: { label: 'Resistência', unit: 'min', category: 'performance' },
  speed: { label: 'Velocidade', unit: 'km/h', category: 'performance' },
  power: { label: 'Potência', unit: 'watts', category: 'performance' },
  
  // Assessment types
  physical_assessment: { label: 'Avaliação Física', unit: '', category: 'assessment' },
  postural_assessment: { label: 'Avaliação Postural', unit: '', category: 'assessment' },
  movement_assessment: { label: 'Análise de Movimento', unit: '', category: 'assessment' },
  fitness_assessment: { label: 'Teste de Aptidão', unit: '', category: 'assessment' },
  
  // Body composition
  lean_mass: { label: 'Massa Magra', unit: 'kg', category: 'physical' },
  fat_mass: { label: 'Massa Gorda', unit: 'kg', category: 'physical' },
  bone_mass: { label: 'Massa Óssea', unit: 'kg', category: 'physical' },
  water_percentage: { label: '% Água', unit: '%', category: 'physical' },
  metabolic_rate: { label: 'Taxa Metabólica', unit: 'kcal', category: 'health' },
  
  // Additional measurements
  bmi: { label: 'IMC', unit: 'kg/m²', category: 'health' },
  body_age: { label: 'Idade Corporal', unit: 'anos', category: 'assessment' },
  visceral_fat: { label: 'Gordura Visceral', unit: '', category: 'health' },
}

/**
 * Translates an evaluation field key to Portuguese
 * @param fieldKey - The English field key
 * @returns Translated field with label and unit
 */
export function translateEvaluationField(fieldKey: string): FieldMapping {
  const mapping = evaluationFieldsMapping[fieldKey.toLowerCase()]
  
  if (mapping) {
    return mapping
  }
  
  // Fallback for unknown fields - try to make it more readable
  const fallbackLabel = fieldKey
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
  
  return {
    label: fallbackLabel,
    unit: '',
    category: 'assessment'
  }
}

/**
 * Formats an evaluation value with proper translation and unit
 * @param fieldKey - The field key
 * @param value - The value to format
 * @returns Formatted string with value and unit
 */
export function formatEvaluationValue(fieldKey: string, value: any): string {
  const mapping = translateEvaluationField(fieldKey)
  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0
  
  if (mapping.unit) {
    return `${numericValue} ${mapping.unit}`
  }
  
  return String(numericValue)
}

/**
 * Gets all available evaluation types in Portuguese
 * @returns Array of evaluation types with icons and colors
 */
export function getEvaluationTypes() {
  return [
    { key: 'weight', label: 'Peso', icon: 'Scale', color: 'text-blue-600' },
    { key: 'height', label: 'Altura', icon: 'Ruler', color: 'text-green-600' },
    { key: 'body_fat', label: '% Gordura', icon: 'Activity', color: 'text-orange-600' },
    { key: 'muscle_mass', label: 'Massa Muscular', icon: 'TrendingUp', color: 'text-purple-600' },
    { key: 'blood_pressure', label: 'Pressão Arterial', icon: 'Heart', color: 'text-red-600' },
    { key: 'flexibility', label: 'Flexibilidade', icon: 'Activity', color: 'text-indigo-600' },
    { key: 'strength', label: 'Força', icon: 'TrendingUp', color: 'text-amber-600' },
    { key: 'cardio', label: 'Cardio', icon: 'Heart', color: 'text-pink-600' },
    { key: 'physical_assessment', label: 'Avaliação Física', icon: 'ClipboardCheck', color: 'text-slate-600' }
  ]
}