import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

export interface UserProfile {
  id: string
  name: string
  email: string
  user_type?: string | null
  avatar_url?: string | null
  created_at?: string
  updated_at?: string
  role?: string
  role_set_once?: boolean
  phone?: string
  professional_title?: string | null
  bio?: string | null
  instagram_url?: string | null
  facebook_url?: string | null
  youtube_url?: string | null
  whatsapp_url?: string | null
  show_profile_to_students?: boolean
  gym_name?: string | null
  gym_cnpj?: string | null
  gym_address?: string | null
  specialties?: string | null
}

// Cache inteligente de perfil
const profileCache = new Map<string, { profile: UserProfile | null; timestamp: number }>()
const CACHE_DURATION = 60000 // 1 minuto

export function useOptimizedProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastFetchTime, setLastFetchTime] = useState(0)
  const { user, isAuthenticated } = useAuth()
  const { toast } = useToast()

  // Cache key baseado no user ID
  const cacheKey = useMemo(() => user?.id || '', [user?.id])

  // Verifica se deve usar cache
  const shouldUseCache = useCallback((userId: string): UserProfile | null => {
    const cached = profileCache.get(userId)
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log('[useOptimizedProfile] 📋 Usando perfil do cache para:', userId)
      return cached.profile
    }
    return null
  }, [])

  // Atualiza cache
  const updateCache = useCallback((userId: string, profile: UserProfile | null) => {
    profileCache.set(userId, { profile, timestamp: Date.now() })
    console.log('[useOptimizedProfile] 💾 Perfil salvo no cache para:', userId)
  }, [])

  const fetchProfile = useCallback(async (userId?: string) => {
    const targetUserId = userId || user?.id
    if (!targetUserId || !isAuthenticated) {
      setProfile(null)
      setLoading(false)
      console.log('[useOptimizedProfile] ❌ Sem usuário ou não autenticado')
      return
    }

    // Verifica cache primeiro
    const cachedProfile = shouldUseCache(targetUserId)
    if (cachedProfile !== null) {
      setProfile(cachedProfile)
      setLoading(false)
      return
    }

    // Debounce - evita múltiplas requisições simultâneas
    const now = Date.now()
    if (now - lastFetchTime < 1000) {
      console.log('[useOptimizedProfile] ⏳ Ignorando fetch - debounce ativo')
      return
    }
    setLastFetchTime(now)

    try {
      setLoading(true)
      console.log('[useOptimizedProfile] 🔄 Buscando perfil para:', targetUserId)

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .maybeSingle()

      console.log('[useOptimizedProfile] 🔍 Query result:', { data, error, targetUserId })

      if (error) {
        console.error('[useOptimizedProfile] ❌ Erro ao buscar perfil:', error)
        throw error
      }

      const mappedProfile: UserProfile | null = data ? data : null

      setProfile(mappedProfile)
      updateCache(targetUserId, mappedProfile)

      console.log('[useOptimizedProfile] ✅ Perfil carregado:', mappedProfile?.name || 'Sem nome', 'user_type:', mappedProfile?.user_type)

    } catch (error: any) {
      console.error('[useOptimizedProfile] ❌ Erro na busca:', error)
      setProfile(null)
      // Não mostra toast para evitar spam
    } finally {
      setLoading(false)
    }
  }, [user?.id, isAuthenticated, shouldUseCache, updateCache, lastFetchTime])

  const createProfile = useCallback(async (profileData: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user) throw new Error('Usuário não autenticado')

    try {
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        email: profileData.email,
        name: profileData.name,
      })

      if (error) throw error

      // Limpa cache e recarrega
      profileCache.delete(user.id)
      await fetchProfile()

      toast({ title: 'Sucesso', description: 'Perfil criado/atualizado com sucesso' })
      return profile
    } catch (error: any) {
      console.error('[useOptimizedProfile] Erro ao criar perfil:', error)
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível criar o perfil',
        variant: 'destructive'
      })
      throw error
    }
  }, [user, fetchProfile, profile, toast])

  const updateProfile = useCallback(async (updates: Partial<Omit<UserProfile, 'id' | 'created_at'>>) => {
    if (!user) throw new Error('Usuário não autenticado')

    try {
      const payload: any = {}
      if (typeof updates.name === 'string') payload.name = updates.name
      if (typeof updates.avatar_url === 'string') payload.avatar_url = updates.avatar_url
      if (typeof updates.professional_title === 'string') payload.professional_title = updates.professional_title
      if (typeof updates.bio === 'string') payload.bio = updates.bio
      if (typeof updates.instagram_url === 'string') payload.instagram_url = updates.instagram_url
      if (typeof updates.facebook_url === 'string') payload.facebook_url = updates.facebook_url
      if (typeof updates.youtube_url === 'string') payload.youtube_url = updates.youtube_url
      if (typeof updates.whatsapp_url === 'string') payload.whatsapp_url = updates.whatsapp_url
      if (typeof updates.show_profile_to_students === 'boolean') payload.show_profile_to_students = updates.show_profile_to_students
      if (typeof updates.role === 'string') payload.role = updates.role
      if (typeof updates.role_set_once === 'boolean') payload.role_set_once = updates.role_set_once
      if (typeof updates.phone === 'string') payload.phone = updates.phone
      if (typeof updates.gym_name === 'string') payload.gym_name = updates.gym_name
      if (typeof updates.gym_cnpj === 'string') payload.gym_cnpj = updates.gym_cnpj
      if (typeof updates.gym_address === 'string') payload.gym_address = updates.gym_address
      if (typeof updates.specialties === 'string') payload.specialties = updates.specialties

      const { error } = await supabase.from('profiles').update(payload).eq('id', user.id)
      if (error) throw error

      // Limpa cache e recarrega
      profileCache.delete(user.id)
      await fetchProfile()

      toast({ title: 'Sucesso', description: 'Perfil atualizado com sucesso' })
      return profile
    } catch (error: any) {
      console.error('[useOptimizedProfile] Erro ao atualizar perfil:', error)
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível atualizar o perfil',
        variant: 'destructive'
      })
      throw error
    }
  }, [user, fetchProfile, profile, toast])

  // Efeito otimizado - só executa quando necessário
  useEffect(() => {
    if (isAuthenticated && user?.id && cacheKey) {
      // Verifica cache primeiro antes de fazer fetch
      const cachedProfile = shouldUseCache(cacheKey)
      if (cachedProfile !== null) {
        setProfile(cachedProfile)
        setLoading(false)
      } else {
        fetchProfile()
      }
    } else if (!isAuthenticated || !user?.id) {
      setProfile(null)
      setLoading(false)
    }
  }, [cacheKey, isAuthenticated, user?.id, fetchProfile, shouldUseCache])

  // Limpa cache quando usuário faz logout
  useEffect(() => {
    if (!isAuthenticated) {
      profileCache.clear()
      console.log('[useOptimizedProfile] 🧹 Cache limpo - logout detectado')
    }
  }, [isAuthenticated])

  return {
    profile,
    loading,
    createProfile,
    updateProfile,
    fetchProfile,
    // Função utilitária para forçar refresh
    refreshProfile: useCallback(() => {
      if (user?.id) {
        profileCache.delete(user.id)
        fetchProfile()
      }
    }, [user?.id, fetchProfile])
  }
}