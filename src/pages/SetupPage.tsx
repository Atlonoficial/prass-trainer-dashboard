import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useUnifiedApp } from '@/contexts/UnifiedAppProvider'
import { UserTypeSelector } from '@/components/setup/UserTypeSelector'
import { TeacherSetup } from '@/components/setup/TeacherSetup'
import { StudentSetup } from '@/components/setup/StudentSetup'
import { useToast } from '@/hooks/use-toast'
import trainerHero from '@/assets/trainer-hero.png'

export default function SetupPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user, refetchProfile } = useUnifiedApp()
  const [userType, setUserType] = useState<'teacher' | 'student' | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fase 2: Retry mechanism para refetchProfile
  const refetchWithRetry = async (maxAttempts = 3) => {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        console.log(`🔄 [SetupPage] Refetch attempt ${i + 1}/${maxAttempts}`)
        await refetchProfile()
        console.log('✅ [SetupPage] Profile refetched successfully')
        return
      } catch (error) {
        console.warn(`⚠️ [SetupPage] Refetch attempt ${i + 1} failed:`, error)
        if (i === maxAttempts - 1) {
          console.error('❌ [SetupPage] All refetch attempts failed')
          throw error
        }
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
  }

  const handleSubmit = async (data: any) => {
    if (!user || !userType) {
      console.error('❌ [SetupPage] Missing user or userType', { user: user?.id, userType })
      return
    }

    console.log('🚀 [SetupPage] Starting setup for user:', {
      userId: user.id,
      email: user.email,
      userType,
      data
    })

    setIsSubmitting(true)
    try {
      // Fase 3: Feedback visual - Passo 1
      toast({
        title: '1/3 Salvando dados...',
        description: 'Atualizando seu perfil'
      })

      // Preparar dados para update
      const updateData = {
        user_type: userType,
        profile_complete: true,
        ...data
      }

      console.log('💾 [SetupPage] Updating profile with:', updateData)

      // Fase 1: Usar maybeSingle() e melhorar tratamento de erros
      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .maybeSingle()

      if (error) {
        console.error('❌ [SetupPage] Profile update error:', error)

        // Fase 1: Tratamento específico para erro de RLS
        if (error.code === 'PGRST116') {
          toast({
            title: 'Erro de permissão',
            description: 'Você não tem permissão para atualizar este perfil.',
            variant: 'destructive'
          })
        }
        throw error
      }

      // Fase 1: Verificar se o profile foi retornado
      if (!updatedProfile) {
        console.error('❌ [SetupPage] No profile returned after update')
        throw new Error('Perfil não foi atualizado')
      }

      console.log('✅ [SetupPage] Profile updated successfully:', updatedProfile)

      // Verificar se o tenant foi criado (para teachers)
      if (userType === 'teacher') {
        const { data: profileCheck, error: checkError } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', user.id)
          .maybeSingle()

        console.log('🏢 [SetupPage] Teacher tenant check:', {
          tenant_id: profileCheck?.tenant_id,
          error: checkError
        })

        if (!profileCheck?.tenant_id) {
          console.warn('⚠️ [SetupPage] Teacher created without tenant_id!')
        }
      }

      // Fase 3: Feedback visual - Passo 2
      toast({
        title: '2/3 Configurando conta...',
        description: 'Sincronizando dados'
      })

      // Fase 2: Usar retry mechanism para refetch
      await refetchWithRetry()

      // Fase 3: Feedback visual - Passo 3
      toast({
        title: '3/3 Redirecionando...',
        description: 'Levando você para o dashboard'
      })

      console.log('🎯 [SetupPage] Redirecting to:', userType === 'teacher' ? '/professor/dashboard' : '/aluno')

      // Fase 4: Navigate com fallback
      const targetRoute = userType === 'teacher' ? '/professor/dashboard' : '/aluno'
      navigate(targetRoute)

      // Fase 4: Fallback após 2 segundos
      setTimeout(() => {
        if (window.location.pathname === '/setup') {
          console.warn('⚠️ [SetupPage] Navigate falhou, forçando redirect')
          window.location.href = targetRoute
        }
      }, 2000)

    } catch (error: any) {
      console.error('❌ [SetupPage] Setup error:', error)
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Não foi possível concluir a configuração.',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Hero Image - Desktop */}
          <div className="hidden lg:block">
            <img
              src={trainerHero}
              alt="App Modelo"
              className="w-full h-auto object-cover"
            />
          </div>

          {/* Setup Form */}
          <div className="w-full">
            {/* Mobile Hero Image */}
            <div className="lg:hidden mb-8">
              <img
                src={trainerHero}
                alt="App Modelo"
                className="w-full h-auto object-cover"
              />
            </div>

            <div className="bg-card/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-border/50 p-8 animate-fade-in">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Bem-vindo ao Prass Trainer!
                </h1>
                <p className="text-muted-foreground">
                  Vamos configurar sua conta para começar
                </p>
              </div>

              {!userType ? (
                <UserTypeSelector onSelect={setUserType} />
              ) : userType === 'teacher' ? (
                <TeacherSetup
                  onSubmit={handleSubmit}
                  onBack={() => setUserType(null)}
                  isSubmitting={isSubmitting}
                />
              ) : (
                <StudentSetup
                  onSubmit={handleSubmit}
                  onBack={() => setUserType(null)}
                  isSubmitting={isSubmitting}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
