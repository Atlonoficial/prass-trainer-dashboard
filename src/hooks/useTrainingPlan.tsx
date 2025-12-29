import { useState, useCallback } from 'react';

export interface Exercise {
  id: string;
  name: string;
  series: string;
  restInterval?: string;
  advancedTechnique?: string;
  observations?: string;
  category?: string;
}

export interface Workout {
  id: string;
  label: string;
  description: string;
  days: string[];
  exercises: Exercise[];
  observations?: string;
}

export interface TrainingPlan {
  id: string;
  studentName: string;
  description: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
  workouts: Workout[];
  aerobicExercise: string;
  generalObservations: string;
  createdAt: string;
  updatedAt: string;
}

// Normalizar dias da semana para português
const DAY_MAPPING: { [key: string]: string } = {
  'segunda': 'seg',
  'terca': 'ter', 
  'quarta': 'qua',
  'quinta': 'qui',
  'sexta': 'sex',
  'sabado': 'sab',
  'domingo': 'dom'
};

// Mapear de volta para exibição
const REVERSE_DAY_MAPPING: { [key: string]: string } = {
  'seg': 'segunda',
  'ter': 'terca',
  'qua': 'quarta',
  'qui': 'quinta',
  'sex': 'sexta',
  'sab': 'sabado',
  'dom': 'domingo'
};

export const useTrainingPlan = () => {
  const [currentPlan, setCurrentPlan] = useState<TrainingPlan | null>(null);
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [savedPlans, setSavedPlans] = useState<{[studentName: string]: TrainingPlan[]}>({});

  // Criar novo plano
  const createPlan = useCallback((studentName: string) => {
    console.log('Creating new plan for:', studentName);
    const newPlan: TrainingPlan = {
      id: Date.now().toString(),
      studentName,
      description: `Plano de Treino de ${studentName}`,
      isActive: true,
      startDate: '',
      endDate: '',
      workouts: [],
      aerobicExercise: '',
      generalObservations: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    console.log('New plan created:', newPlan);
    setCurrentPlan(newPlan);
    return newPlan;
  }, []);

  // Atualizar plano
  const updatePlan = useCallback((updates: Partial<TrainingPlan>) => {
    setCurrentPlan(prev => {
      if (!prev) return null;
      
      const updatedPlan = {
        ...prev,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      console.log('Plan updated:', updatedPlan);
      return updatedPlan;
    });
  }, []);

  // Adicionar treino
  const addWorkout = useCallback((workoutData: Omit<Workout, 'id' | 'exercises'>) => {
    console.log('Adding workout:', workoutData);
    
    setCurrentPlan(prev => {
      if (!prev) {
        console.log('No current plan to add workout to');
        return null;
      }

      // Normalizar dias para português
      const normalizedDays = workoutData.days.map(day => DAY_MAPPING[day] || day);

      const newWorkout: Workout = {
        ...workoutData,
        id: Date.now().toString(),
        exercises: [],
        days: normalizedDays
      };

      const updatedPlan = {
        ...prev,
        workouts: [...prev.workouts, newWorkout],
        updatedAt: new Date().toISOString()
      };
      
      console.log('Workout added to plan:', updatedPlan);
      return updatedPlan;
    });
  }, []);

  // Atualizar treino
  const updateWorkout = useCallback((workoutId: string, updates: Partial<Workout>) => {
    console.log('Updating workout:', workoutId, updates);
    
    setCurrentPlan(prev => {
      if (!prev) return null;

      const updatedPlan = {
        ...prev,
        workouts: prev.workouts.map(workout =>
          workout.id === workoutId 
            ? { ...workout, ...updates }
            : workout
        ),
        updatedAt: new Date().toISOString()
      };
      
      console.log('Workout updated in plan:', updatedPlan);
      return updatedPlan;
    });
  }, []);

  // Remover treino  
  const removeWorkout = useCallback((workoutId: string) => {
    setCurrentPlan(prev => {
      if (!prev) return null;

      return {
        ...prev,
        workouts: prev.workouts.filter(w => w.id !== workoutId),
        updatedAt: new Date().toISOString()
      };
    });
  }, []);

  // Adicionar exercício a um treino
  const addExerciseToWorkout = useCallback((workoutId: string, exerciseData: Omit<Exercise, 'id'>) => {
    console.log('addExerciseToWorkout called - workoutId:', workoutId);
    console.log('addExerciseToWorkout called - exerciseData:', exerciseData);
    
    setCurrentPlan(prev => {
      if (!prev) {
        console.log('No current plan available');
        return null;
      }

      console.log('Current plan before exercise addition:', prev);

      const newExercise: Exercise = {
        ...exerciseData,
        id: `${Date.now()}-${Math.random()}`
      };
      
      console.log('New exercise created:', newExercise);

      const updatedPlan = {
        ...prev,
        workouts: prev.workouts.map(workout =>
          workout.id === workoutId
            ? { ...workout, exercises: [...workout.exercises, newExercise] }
            : workout
        ),
        updatedAt: new Date().toISOString()
      };
      
      console.log('Updated plan after exercise addition:', updatedPlan);
      return updatedPlan;
    });
  }, []);

  // Remover exercício de um treino
  const removeExerciseFromWorkout = useCallback((workoutId: string, exerciseId: string) => {
    setCurrentPlan(prev => {
      if (!prev) return null;

      return {
        ...prev,
        workouts: prev.workouts.map(workout =>
          workout.id === workoutId
            ? { ...workout, exercises: workout.exercises.filter(e => e.id !== exerciseId) }
            : workout
        ),
        updatedAt: new Date().toISOString()
      };
    });
  }, []);

  // Salvar plano (persistir)
  const savePlan = useCallback(async () => {
    if (!currentPlan) return false;

    try {
      // Salvar na lista geral
      const existingPlans = [...plans.filter(p => p.id !== currentPlan.id), currentPlan];
      setPlans(existingPlans);
      
      // Salvar na lista específica do aluno
      setSavedPlans(prev => ({
        ...prev,
        [currentPlan.studentName]: [
          ...(prev[currentPlan.studentName] || []).filter(p => p.id !== currentPlan.id),
          currentPlan
        ]
      }));
      
      // Simular salvamento
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Plano salvo com sucesso:', currentPlan);
      return true;
    } catch (error) {
      console.error('Erro ao salvar plano:', error);
      return false;
    }
  }, [currentPlan, plans]);

  // Carregar plano existente
  const loadPlan = useCallback((planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (plan) {
      setCurrentPlan(plan);
    }
    return plan;
  }, [plans]);

  // Estatísticas do plano
  const getStats = useCallback(() => {
    if (!currentPlan) return { treinos: 0, exercicios: 0, grupamentos: 0, media: 0 };

    const totalExercises = currentPlan.workouts.reduce((total, workout) => 
      total + workout.exercises.length, 0
    );
    
    const muscleGroups = new Set(
      currentPlan.workouts.flatMap(workout => 
        workout.exercises.map(exercise => exercise.category).filter(Boolean)
      )
    );

    return {
      treinos: currentPlan.workouts.length,
      exercicios: totalExercises,
      grupamentos: muscleGroups.size,
      media: currentPlan.workouts.length > 0 ? 
        Math.round((totalExercises / currentPlan.workouts.length) * 10) / 10 : 0
    };
  }, [currentPlan]);

  // Obter treinos salvos de um aluno específico
  const getStudentPlans = useCallback((studentName: string) => {
    return savedPlans[studentName] || [];
  }, [savedPlans]);

  return {
    currentPlan,
    plans,
    savedPlans,
    createPlan,
    updatePlan,
    addWorkout,
    updateWorkout,
    removeWorkout,
    addExerciseToWorkout,
    removeExerciseFromWorkout,
    savePlan,
    loadPlan,
    getStats,
    getStudentPlans,
    setCurrentPlan
  };
};
