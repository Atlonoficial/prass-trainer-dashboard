import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

export type UserType = 'student' | 'teacher' | 'admin' | string

interface Profile {
  id: string
  email: string
  name: string
  user_type: UserType | null
  avatar_url?: string | null
}

export function useSupabaseProfile(userId?: string) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    const fetchProfile = async () => {
      if (!userId) {
        setProfile(null)
        setLoading(false)
        return
      }

      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, name, user_type, avatar_url')
        .eq('id', userId)
        .maybeSingle()

      if (!active) return

      if (error) {
        console.error('Error fetching profile:', error)
        setProfile(null)
      } else {
        setProfile((data as Profile) ?? null)
      }
      setLoading(false)
    }

    fetchProfile()
    return () => { active = false }
  }, [userId])

  const role: UserType = profile?.user_type ?? 'student'

  return { profile, role, loading }
}
