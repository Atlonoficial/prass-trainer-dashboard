import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { Eye, EyeOff } from 'lucide-react'
import trainerHero from '@/assets/trainer-hero.png'
import { getClientSlug, getTenantByDomain } from '@/utils/clientSlug'

// Logo Prass Trainer
const logo = "/lovable-uploads/6ec053ec-89eb-4288-a3d1-e2719129d4cd.png"

export function AuthPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { signIn, user, loading: authLoading, authError, clearAuthState, circuitBreakerStatus } = useAuth()

  // ✅ REMOVIDO: Timeout adicional de 12s agora é gerenciado pelo hook consolidado (8s)

  // Redirect se já logado
  useEffect(() => {
    if (user) {
      navigate('/')
    }
  }, [user, navigate])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading || authLoading) return

    setLoading(true)
    try {
      // Detecta se é email completo ou username interno
      let loginEmail: string
      if (username.includes('@')) {
        // Email completo - usar diretamente
        loginEmail = username.toLowerCase().trim()
      } else {
        // Username interno - converter para @prasstrainer.local
        loginEmail = `${username.toLowerCase().replace(/\s+/g, '')}@prasstrainer.local`
      }

      console.log('🔐 Tentando login com:', loginEmail)
      const result = await signIn(loginEmail, password)
      if (!result.error) {
        toast({ title: "Login realizado com sucesso!" })
      } else {
        toast({
          title: "Erro no login",
          description: "Usuário ou senha incorretos",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Erro inesperado",
        description: error.message || "Erro ao fazer login",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Estado de loading
  if (authLoading && !authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  // ✅ Estados de erro diferenciados
  if (authError) {
    const errorConfig = {
      timeout: {
        icon: <svg className="w-12 h-12 mx-auto text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        title: 'Tempo Esgotado',
        description: 'O servidor está demorando para responder. Tente novamente em alguns instantes.',
      },
      network: {
        icon: <svg className="w-12 h-12 mx-auto text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
        title: 'Servidor Inacessível',
        description: circuitBreakerStatus.isOpen
          ? `Servidor temporariamente inacessível. Aguarde ${circuitBreakerStatus.timeToReset}s.`
          : 'Não foi possível conectar ao servidor. Verifique sua conexão.',
      },
      invalid_token: {
        icon: <svg className="w-12 h-12 mx-auto text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>,
        title: 'Sessão Expirada',
        description: 'Sua sessão expirou ou está inválida. Por favor, faça login novamente.',
      }
    }

    const config = errorConfig[authError] || errorConfig.invalid_token

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20">
        <div className="text-center max-w-md p-6">
          <div className="mb-4">
            {config.icon}
          </div>
          <h3 className="text-lg font-semibold mb-2">{config.title}</h3>
          <p className="text-muted-foreground mb-4">{config.description}</p>
          <Button
            onClick={() => {
              clearAuthState()
              window.location.reload()
            }}
            className="w-full"
            disabled={circuitBreakerStatus.isOpen}
          >
            {circuitBreakerStatus.isOpen
              ? `Aguarde ${circuitBreakerStatus.timeToReset}s`
              : 'Recarregar Página'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-sophisticated-bg min-h-screen relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="auth-bg-pattern"></div>
      <div className="auth-floating-orb auth-floating-orb-1"></div>
      <div className="auth-floating-orb auth-floating-orb-2"></div>
      <div className="auth-floating-orb auth-floating-orb-3"></div>

      {/* Main Content Grid */}
      <div className="min-h-screen grid lg:grid-cols-2 relative z-10">
        {/* Left Side - Hero Image */}
        <div className="hidden lg:flex items-center justify-center p-12">
          <img
            src={trainerHero}
            alt="Prass Trainer"
            className="max-w-[400px] max-h-[500px] w-auto h-auto object-contain"
          />
        </div>

        {/* Right Side - Auth Form */}
        <div className="flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">
            {/* Mobile Trainer Image */}
            <div className="lg:hidden mb-8 flex justify-center">
              <img
                src={trainerHero}
                alt="Prass Trainer"
                className="max-w-[250px] max-h-[300px] w-auto h-auto object-contain"
              />
            </div>

            {/* Glassmorphism Card */}
            <div className="auth-glass-card">
              <div className="p-8">
                <div className="text-center mb-8">
                  <h2 className="auth-form-title">
                    Bem-vindo de volta
                  </h2>
                  <p className="auth-form-description">
                    Acesse sua conta para continuar
                  </p>
                </div>
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="auth-input-label">Usuário</Label>
                    <Input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="auth-input min-h-12 text-base"
                      placeholder="Digite seu usuário"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="auth-input-label">Senha</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="auth-input min-h-12 text-base"
                        placeholder="••••••••"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button type="submit" disabled={loading} className="auth-submit-btn min-h-12 text-base">
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="auth-spinner"></div>
                        Entrando...
                      </div>
                    ) : (
                      '✨ Entrar'
                    )}
                  </Button>

                  {/* Support Message */}
                  <div className="text-center pt-4 border-t border-border/50">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Esqueceu sua senha ou precisa de ajuda?<br />
                      Entre em contato com o <span className="text-primary font-medium">suporte técnico da Atlon Tech</span>
                    </p>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
