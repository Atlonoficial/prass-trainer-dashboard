import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { Student } from '@/types/student'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface StudentsState {
  students: Student[]
  loading: boolean
  error: string | null
  lastFetch: number
  isInitialized: boolean
}

type StudentsAction = 
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: Student[] }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'UPDATE_STUDENT'; payload: { id: string; updates: Partial<Student> } }
  | { type: 'RESET' }

interface StudentsContextType extends StudentsState {
  fetchStudents: (userId: string, isTeacher: boolean) => Promise<void>
  updateStudent: (studentUserId: string, updates: Partial<Student>) => Promise<boolean>
  refetch: () => Promise<void>
}

const StudentsContext = createContext<StudentsContextType | null>(null)

const initialState: StudentsState = {
  students: [],
  loading: false,
  error: null,
  lastFetch: 0,
  isInitialized: false
}

const CACHE_DURATION = 2 * 60 * 1000 // 2 minutes

function studentsReducer(state: StudentsState, action: StudentsAction): StudentsState {
  switch (action.type) {
    case 'FETCH_START':
      return {
        ...state,
        loading: true,
        error: null
      }
    case 'FETCH_SUCCESS':
      return {
        ...state,
        loading: false,
        students: action.payload,
        lastFetch: Date.now(),
        isInitialized: true,
        error: null
      }
    case 'FETCH_ERROR':
      return {
        ...state,
        loading: false,
        error: action.payload
      }
    case 'UPDATE_STUDENT':
      return {
        ...state,
        students: state.students.map(student =>
          student.user_id === action.payload.id
            ? { ...student, ...action.payload.updates }
            : student
        )
      }
    case 'RESET':
      return {
        ...initialState,
        isInitialized: true
      }
    default:
      return state
  }
}

export function StudentsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(studentsReducer, initialState)
  const { toast } = useToast()

  const isCacheValid = useCallback(() => {
    return state.lastFetch > 0 && (Date.now() - state.lastFetch) < CACHE_DURATION
  }, [state.lastFetch])

  const fetchStudents = useCallback(async (userId: string, isTeacher: boolean) => {
    if (!userId || !isTeacher) return
    
    // Use cache if valid
    if (isCacheValid() && state.students.length > 0) {
      return
    }

    dispatch({ type: 'FETCH_START' })

    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('teacher_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const mappedStudents: Student[] = (data || []).map(student => ({
        id: student.id,
        user_id: student.user_id,
        name: `Estudante ${student.user_id.slice(0, 8)}`, // Placeholder until we get profile data
        email: '',
        phone: '',
        avatar: null,
        // Dados reais da tabela
        active_plan: student.active_plan,
        mode: student.mode || '',
        membership_status: student.membership_status || 'inactive',
        goals: student.goals,
        membership_expiry: student.membership_expiry,
        teacher_id: student.teacher_id,
        created_at: student.created_at,
        updated_at: student.updated_at,
        // Campos calculados para compatibilidade
        plan: student.active_plan || 'none',
        status: student.membership_status === 'active' ? 'Ativo' : 
                student.membership_status === 'suspended' ? 'Suspenso' : 'Inativo',
        goal: Array.isArray(student.goals) && student.goals.length > 0 ? 
              student.goals[0] : 'Não definido'
      }))

      // Enhance with profile data
      if (mappedStudents.length > 0) {
        try {
          const userIds = mappedStudents.map(s => s.user_id)
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, name, email, avatar_url, phone')
            .in('id', userIds)

          if (profilesData) {
            mappedStudents.forEach(student => {
              const profile = profilesData.find(p => p.id === student.user_id)
              if (profile) {
                student.name = profile.name || student.name
                student.email = profile.email || ''
                student.phone = profile.phone || ''
                student.avatar = profile.avatar_url || null
              }
            })
          }
        } catch (profileError) {
          console.warn('Failed to load profile data:', profileError)
        }
      }

      dispatch({ type: 'FETCH_SUCCESS', payload: mappedStudents })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar estudantes'
      dispatch({ type: 'FETCH_ERROR', payload: errorMessage })
    }
  }, [isCacheValid, state.students.length])

  const updateStudent = useCallback(async (studentUserId: string, updates: Partial<Student>): Promise<boolean> => {
    console.log('⚠️ StudentsContext: updateStudent chamado - DEPRECATED');
    console.log('Use useStudents hook em vez do contexto para evitar conflitos');
    
    // Retornar false para forçar uso do hook correto
    toast({
      title: "Aviso",
      description: "Por favor, use o hook useStudents em vez do contexto",
      variant: "destructive"
    })
    return false
  }, [toast])

  const refetch = useCallback(async () => {
    // This will be called by components that have access to userId and isTeacher
    dispatch({ type: 'RESET' })
  }, [])

  return (
    <StudentsContext.Provider
      value={{
        ...state,
        fetchStudents,
        updateStudent,
        refetch
      }}
    >
      {children}
    </StudentsContext.Provider>
  )
}

export function useStudentsContext() {
  const context = useContext(StudentsContext)
  if (!context) {
    throw new Error('useStudentsContext must be used within a StudentsProvider')
  }
  return context
}