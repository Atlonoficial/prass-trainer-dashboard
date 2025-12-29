import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ExerciseVideoMapping {
  id: string;
  name: string;
  video_url?: string;
  image_url?: string;
  instructions?: string;
  muscle_groups?: string[];
  equipment?: string[];
}

export const useExerciseVideoMapping = () => {
  const [exerciseLibrary, setExerciseLibrary] = useState<ExerciseVideoMapping[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExerciseLibrary();
  }, []);

  const fetchExerciseLibrary = async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('id, name, video_url, image_url, instructions, muscle_groups, equipment')
        .order('name');

      if (error) throw error;
      setExerciseLibrary(data || []);
    } catch (error) {
      console.error('Erro ao buscar biblioteca de exercícios:', error);
    } finally {
      setLoading(false);
    }
  };

  const findExerciseVideo = (exerciseName: string): ExerciseVideoMapping | null => {
    // Busca exata primeiro
    let match = exerciseLibrary.find(ex => 
      ex.name.toLowerCase() === exerciseName.toLowerCase()
    );

    if (!match) {
      // Busca por palavras-chave
      match = exerciseLibrary.find(ex => {
        const exerciseWords = exerciseName.toLowerCase().split(' ');
        const libraryWords = ex.name.toLowerCase().split(' ');
        return exerciseWords.some(word => 
          libraryWords.some(libWord => 
            libWord.includes(word) || word.includes(libWord)
          )
        );
      });
    }

    return match || null;
  };

  const enrichExerciseWithVideo = (exercise: any): any => {
    const videoMatch = findExerciseVideo(exercise.name);
    
    return {
      ...exercise,
      video_url: exercise.video_url || videoMatch?.video_url,
      image_url: exercise.image_url || videoMatch?.image_url,
      instructions: exercise.instructions || videoMatch?.instructions,
      equipment: exercise.equipment || videoMatch?.equipment,
      muscle_groups: exercise.muscle_groups || videoMatch?.muscle_groups
    };
  };

  const enrichWorkoutWithVideos = (workout: any): any => {
    if (!workout.exercises) return workout;

    return {
      ...workout,
      exercises: workout.exercises.map(enrichExerciseWithVideo)
    };
  };

  return {
    exerciseLibrary,
    loading,
    findExerciseVideo,
    enrichExerciseWithVideo,
    enrichWorkoutWithVideos,
    refetch: fetchExerciseLibrary
  };
};