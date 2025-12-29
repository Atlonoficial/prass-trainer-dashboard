// Mapping utilities for predefinitions
export const difficultyMapping = {
  'Iniciante': 'beginner',
  'Intermediário': 'intermediate', 
  'Avançado': 'advanced'
} as const;

export const categoryMapping = {
  // Meals categories - match the database constraint
  meals: {
    'Café da manhã': 'breakfast',
    'Almoço': 'lunch', 
    'Jantar': 'dinner',
    'Lanche': 'snack'
  },
  // Exercise categories - Portuguese to English
  exercises: {
    'Força': 'strength',
    'Cardio': 'cardio',
    'Funcional': 'functional',
    'Flexibilidade': 'flexibility',
    'Reabilitação': 'rehabilitation'
  }
} as const;

export const muscleGroupMapping = {
  'Abdome': 'abs',
  'Peito': 'chest',
  'Costas': 'back',
  'Ombros': 'shoulders',
  'Bíceps': 'biceps',
  'Tríceps': 'triceps',
  'Pernas': 'legs',
  'Glúteos': 'glutes',
  'Panturrilha': 'calves',
  'Antebraço': 'forearms'
} as const;

// Reverse mappings for display
export const reverseDifficultyMapping = Object.fromEntries(
  Object.entries(difficultyMapping).map(([pt, en]) => [en, pt])
);

export const reverseMuscleGroupMapping = Object.fromEntries(
  Object.entries(muscleGroupMapping).map(([pt, en]) => [en, pt])
);

// Validation functions
export function validateExerciseData(data: any) {
  const errors: string[] = [];
  
  if (!data.name?.trim()) errors.push('Nome é obrigatório');
  if (!data.muscle_group) errors.push('Grupo muscular é obrigatório');
  if (!data.difficulty) errors.push('Dificuldade é obrigatória');
  if (!data.sets || data.sets <= 0) errors.push('Número de séries deve ser maior que zero');
  if (!data.reps || data.reps <= 0) errors.push('Número de repetições deve ser maior que zero');
  if (data.rest_time === undefined || data.rest_time < 0) errors.push('Tempo de descanso é obrigatório');
  
  return errors;
}

export function validateMealData(data: any) {
  const errors: string[] = [];
  
  if (!data.name?.trim()) errors.push('Nome é obrigatório');
  if (!data.calories || data.calories <= 0) errors.push('Calorias devem ser maior que zero');
  if (data.protein === undefined || data.protein < 0) errors.push('Proteína é obrigatória');
  if (data.carbs === undefined || data.carbs < 0) errors.push('Carboidratos são obrigatórios');
  if (data.fat === undefined || data.fat < 0) errors.push('Gordura é obrigatória');
  
  return errors;
}

export function sanitizeExerciseData(data: any) {
  return {
    ...data,
    name: data.name?.trim(),
    muscle_group: muscleGroupMapping[data.muscle_group as keyof typeof muscleGroupMapping] || data.muscle_group,
    difficulty: difficultyMapping[data.difficulty as keyof typeof difficultyMapping] || data.difficulty,
    category: categoryMapping.exercises[data.category as keyof typeof categoryMapping.exercises] || data.category,
    sets: Math.max(1, Number(data.sets) || 1),
    reps: Math.max(1, Number(data.reps) || 1),
    rest_time: Math.max(0, Number(data.rest_time) || 60),
    weight: data.weight ? Math.max(0, Number(data.weight)) : null,
    duration: data.duration ? Math.max(0, Number(data.duration)) : null,
    description: data.description?.trim() || null,
    instructions: data.instructions?.trim() || null,
    video_url: data.video_url?.trim() || null,
    image_url: data.image_url?.trim() || null,
    muscle_groups: data.muscle_group ? [muscleGroupMapping[data.muscle_group as keyof typeof muscleGroupMapping] || data.muscle_group] : null,
    equipment: data.equipment || null
  };
}

export function sanitizeMealData(data: any) {
  return {
    ...data,
    name: data.name?.trim(),
    category: categoryMapping.meals[data.category as keyof typeof categoryMapping.meals] || data.category,
    calories: Math.max(0, Number(data.calories) || 0),
    protein: Math.max(0, Number(data.protein) || 0),
    carbs: Math.max(0, Number(data.carbs) || 0),
    fat: Math.max(0, Number(data.fat) || 0),
    fiber: data.fiber ? Math.max(0, Number(data.fiber)) : null,
    sugar: data.sugar ? Math.max(0, Number(data.sugar)) : null,
    sodium: data.sodium ? Math.max(0, Number(data.sodium)) : null,
    portion_amount: data.portion_amount ? Math.max(0, Number(data.portion_amount)) : null,
    description: data.description?.trim() || null,
    instructions: data.instructions?.trim() || null,
    image_url: data.image_url?.trim() || null,
    ingredients: data.ingredients || null,
    portion_unit: data.portion_unit?.trim() || null,
    time: data.time?.trim() || null
  };
}