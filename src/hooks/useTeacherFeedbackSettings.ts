import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface CustomQuestion {
  id: string
  question: string
  type: 'text' | 'textarea' | 'rating' | 'select' | 'multiselect'
  required: boolean
  order: number
  category: 'workout' | 'diet' | 'general'
  options?: string[]
  placeholder?: string
  min?: number
  max?: number
  metadata?: Record<string, any>
}

// Perguntas padrão do app do aluno
export const DEFAULT_QUESTIONS: CustomQuestion[] = [
  {
    id: 'default_training_rating',
    question: 'Como foi o treino esta semana?',
    type: 'rating',
    category: 'workout',
    required: true,
    order: 0
  },
  {
    id: 'default_training_feedback',
    question: 'Observações sobre o treino',
    type: 'textarea',
    category: 'workout',
    required: false,
    order: 1,
    placeholder: 'Compartilhe como foram seus treinos, dificuldades, conquistas...'
  },
  {
    id: 'default_diet_rating',
    question: 'Como foi a dieta esta semana?',
    type: 'rating',
    category: 'diet',
    required: true,
    order: 2
  },
  {
    id: 'default_diet_feedback',
    question: 'Observações sobre a dieta',
    type: 'textarea',
    category: 'diet',
    required: false,
    order: 3,
    placeholder: 'Compartilhe como foi seguir o plano alimentar, dificuldades...'
  },
  {
    id: 'default_general_feedback',
    question: 'Como você está se sentindo de forma geral?',
    type: 'textarea',
    category: 'general',
    required: false,
    order: 4,
    placeholder: 'Energia, disposição, motivação, sono, estresse...'
  }
]

export interface TeacherFeedbackSettings {
  id: string
  teacher_id: string
  feedback_frequency: string
  feedback_days: number[]
  custom_questions: CustomQuestion[]
  is_active: boolean
  default_feedback_period: number
  feedbacks_per_page: number
  auto_request_feedback: boolean
  feedback_reminder_days: number
  show_feedback_stats: boolean
  feedback_types_enabled: string[]
  feedback_retention_policy: string
  created_at: string
  updated_at: string
}

const fetchSettings = async (teacherId: string): Promise<TeacherFeedbackSettings> => {
  const { data, error } = await supabase
    .from('teacher_feedback_settings')
    .select('*')
    .eq('teacher_id', teacherId)
    .maybeSingle()

  if (error) throw error

  if (data) {
    return {
      ...data,
      custom_questions: Array.isArray(data.custom_questions) 
        ? data.custom_questions as unknown as CustomQuestion[] 
        : []
    } as TeacherFeedbackSettings
  }

  // Create default settings if none exist
  return await createDefaultSettings(teacherId)
}

const createDefaultSettings = async (teacherId: string): Promise<TeacherFeedbackSettings> => {
  const defaultSettings = {
    teacher_id: teacherId,
    feedback_frequency: 'weekly',
    feedback_days: [5],
    custom_questions: DEFAULT_QUESTIONS,
    is_active: true,
    default_feedback_period: 30,
    feedbacks_per_page: 10,
    auto_request_feedback: false,
    feedback_reminder_days: 7,
    show_feedback_stats: true,
    feedback_types_enabled: ['workout', 'diet', 'general']
  }

  const { data, error } = await supabase
    .from('teacher_feedback_settings')
    .insert({
      ...defaultSettings,
      custom_questions: defaultSettings.custom_questions as any
    })
    .select()
    .single()

  if (error) throw error

  return {
    ...data,
    custom_questions: Array.isArray(data.custom_questions) 
      ? data.custom_questions as unknown as CustomQuestion[] 
      : []
  } as TeacherFeedbackSettings
}

export function useTeacherFeedbackSettings() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch teacher ID
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      return user
    },
    staleTime: Infinity, // User data rarely changes
  })

  // Fetch settings with React Query
  const { data: settings, isLoading: loading, refetch } = useQuery({
    queryKey: ['teacher-feedback-settings', user?.id],
    queryFn: () => fetchSettings(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    retry: 2,
  })

  // Update mutation with automatic cache invalidation
  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<TeacherFeedbackSettings>) => {
      if (!settings) throw new Error('No settings to update')

      const { data, error } = await supabase
        .from('teacher_feedback_settings')
        .update({
          ...updates,
          custom_questions: updates.custom_questions as any
        })
        .eq('id', settings.id)
        .select()
        .single()

      if (error) throw error

      return {
        ...data,
        custom_questions: Array.isArray(data.custom_questions) 
          ? data.custom_questions as unknown as CustomQuestion[] 
          : []
      } as TeacherFeedbackSettings
    },
    onSuccess: (data) => {
      // Update cache immediately
      queryClient.setQueryData(['teacher-feedback-settings', user?.id], data)
      
      toast({
        title: "Configurações atualizadas",
        description: "As configurações de feedback foram salvas com sucesso.",
      })
    },
    onError: (error) => {
      console.error('Error updating settings:', error)
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      })
    }
  })

  return {
    settings: settings ?? null,
    loading,
    updateSettings: updateMutation.mutate,
    refetch,
  }
}