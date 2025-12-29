import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { Session, User } from '@supabase/supabase-js'

export function useSupabaseAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user ?? null)
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // REMOVIDO: ensure_student_record não deve ser chamado automaticamente
  // A tabela students só deve ser preenchida quando um aluno é convidado por um professor

  return { session, user, loading, isAuthenticated: !!user }
}
