import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { supabaseShapePro } from '@/integrations/supabase/shapeProClient'
import { useToast } from '@/hooks/use-toast'
import { sanitizeExerciseData, validateExerciseData } from '@/lib/predefinitionsMapping'

export interface Exercise {
  id: string
  name: string
  muscle_group: string
  sets: number
  reps: number
  rest_time: number
  difficulty: string
  weight?: number | null
  duration?: number | null
  description?: string | null
  category?: string | null
  muscle_groups?: string[] | null
  equipment?: string[] | null
  instructions?: string | null
  video_url?: string | null
  image_url?: string | null
  created_by?: string | null
  created_at?: string | null
}

export function useExercises() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchExercises = async () => {
    try {
      console.log('🔄 Fetching exercises from Shape Pro...')
      setLoading(true)

      // Buscar exercícios do Shape Pro (projeto externo)
      const { data: shapeProData, error: shapeProError } = await supabaseShapePro
        .from('exercises')
        .select('*')
        .order('name', { ascending: true })

      if (shapeProError) {
        console.warn('⚠️ Error fetching from Shape Pro:', shapeProError)
        // Fallback: tentar buscar do projeto local
        const { data: localData, error: localError } = await supabase
          .from('exercises')
          .select('*')
          .order('name', { ascending: true })

        if (localError) throw localError
        console.log(`✅ Fetched ${localData?.length || 0} exercises from local`)
        setExercises((localData || []) as Exercise[])
        return
      }

      console.log(`✅ Fetched ${shapeProData?.length || 0} exercises from Shape Pro`)
      console.log(`🎥 Exercises with video: ${shapeProData?.filter(e => e.video_url).length || 0}`)
      setExercises((shapeProData || []) as Exercise[])
    } catch (error) {
      console.error('Error fetching exercises:', error)
      toast({ title: 'Erro', description: 'Não foi possível carregar os exercícios', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const addExercise = async (exerciseData: Omit<Exercise, 'id' | 'created_at' | 'created_by'>) => {
    try {
      console.log('🔄 Creating exercise...', exerciseData)

      // Validação robusta de autenticação
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        console.error('❌ Authentication error:', authError)
        throw new Error(`Authentication failed: ${authError.message}`)
      }
      if (!user?.id) {
        console.error('❌ No authenticated user found')
        throw new Error('User not authenticated - please log in again')
      }

      // Primeiro: validação dos dados de entrada
      const validationErrors = validateExerciseData(exerciseData)
      if (validationErrors.length > 0) {
        console.error('❌ Validation errors:', validationErrors)
        throw new Error(validationErrors[0]) // Mostra o primeiro erro
      }

      // Segundo: sanitização usando as funções do mapeamento
      const sanitizedData = sanitizeExerciseData({
        ...exerciseData,
        created_by: user.id
      })

      console.log('✅ Exercise data sanitized:', sanitizedData)

      const { data, error } = await supabase
        .from('exercises')
        .insert([sanitizedData])
        .select()
        .single()

      if (error) {
        console.error('❌ Database error:', error)
        throw error
      }

      console.log('✅ Exercise created successfully:', data)
      setExercises(prev => [data, ...prev])
      toast({ title: 'Sucesso', description: `Exercício "${data.name}" adicionado com sucesso!` })
      return data
    } catch (error: any) {
      console.error('❌ Error adding exercise:', error)

      let userMessage = 'Não foi possível adicionar o exercício'
      if (error.message.includes('not authenticated')) {
        userMessage = 'Sessão expirada. Faça login novamente.'
      } else if (error.message) {
        userMessage = error.message
      }

      toast({ title: 'Erro', description: userMessage, variant: 'destructive' })
      throw error
    }
  }

  const updateExercise = async (id: string, updates: Partial<Exercise>) => {
    try {
      console.log('🔄 Updating exercise...', updates)

      // Sanitizar dados de atualização também
      const sanitizedUpdates = sanitizeExerciseData(updates)
      console.log('✅ Updates sanitized:', sanitizedUpdates)

      const { error } = await supabase
        .from('exercises')
        .update(sanitizedUpdates)
        .eq('id', id)

      if (error) {
        console.error('❌ Database error updating exercise:', error)
        throw error
      }

      await fetchExercises() // Refresh the list
      toast({ title: 'Sucesso', description: 'Exercício atualizado com sucesso' })
    } catch (error: any) {
      console.error('❌ Error updating exercise:', error)

      let userMessage = 'Não foi possível atualizar o exercício'
      if (error.message?.includes('check constraint')) {
        userMessage = 'Dados inválidos fornecidos. Verifique os campos e tente novamente.'
      } else if (error.message) {
        userMessage = error.message
      }

      toast({ title: 'Erro', description: userMessage, variant: 'destructive' })
      throw error
    }
  }

  const deleteExercise = async (id: string) => {
    try {
      const { error } = await supabase.from('exercises').delete().eq('id', id)
      if (error) throw error

      await fetchExercises() // Refresh the list
      toast({ title: 'Sucesso', description: 'Exercício excluído com sucesso' })
    } catch (error) {
      console.error('Error deleting exercise:', error)
      toast({ title: 'Erro', description: 'Não foi possível excluir o exercício', variant: 'destructive' })
      throw error
    }
  }

  const getExercisesByCategory = (category: string) => exercises.filter((e) => e.category === category)
  const getExercisesByMuscleGroup = (muscleGroup: string) => exercises.filter((e) => (e.muscle_groups || []).includes(muscleGroup))

  useEffect(() => { fetchExercises() }, [])

  return { exercises, loading, addExercise, updateExercise, deleteExercise, getExercisesByCategory, getExercisesByMuscleGroup, refetch: fetchExercises }
}
