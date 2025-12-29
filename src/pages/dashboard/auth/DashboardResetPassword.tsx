import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff } from 'lucide-react'

/**
 * Página de reset de senha para Dashboard do Professor
 * Rota: /dashboard/auth/reset-password
 */
export default function DashboardResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isValidToken, setIsValidToken] = useState(false)

  useEffect(() => {
    const checkToken = async () => {
      const type = searchParams.get('type')
      const token_hash = searchParams.get('token_hash')
      
      console.log('[DashboardResetPassword] Verificando token...', { type, token_hash })
      
      if (type === 'recovery' && token_hash) {
        try {
          // Verificar o token de recuperação
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash,
            type: 'recovery'
          })

          if (error) throw error

          if (data.session) {
            console.log('[DashboardResetPassword] Token válido, sessão estabelecida')
            setIsValidToken(true)
          }
        } catch (error: any) {
          console.error('[DashboardResetPassword] Erro ao verificar token:', error)
          toast({
            title: "❌ Link inválido ou expirado",
            description: "Solicite um novo link de recuperação de senha.",
            variant: "destructive",
          })
          setTimeout(() => navigate('/auth'), 3000)
        }
      } else {
        toast({
          title: "❌ Link inválido",
          description: "Use o link recebido no seu email.",
          variant: "destructive",
        })
        setTimeout(() => navigate('/auth'), 3000)
      }
    }

    checkToken()
  }, [searchParams, navigate, toast])

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "As senhas devem ser iguais.",
        variant: "destructive",
      })
      return
    }

    if (newPassword.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      toast({
        title: "✅ Senha atualizada!",
        description: "Sua senha foi redefinida com sucesso.",
      })

      // Redirecionar para dashboard
      setTimeout(() => {
        navigate('/professor/dashboard')
      }, 2000)
    } catch (error: any) {
      console.error('[DashboardResetPassword] Erro ao atualizar senha:', error)
      toast({
        title: "❌ Erro ao atualizar senha",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Verificando link...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20 p-4">
      <div className="w-full max-w-md">
        <div className="bg-card/80 backdrop-blur-sm rounded-lg shadow-lg border border-border/50 p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold">Redefinir senha</h2>
            <p className="text-muted-foreground mt-2">Digite sua nova senha</p>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova senha</Label>
              <div className="relative">
                <Input 
                  id="newPassword" 
                  type={showPassword ? "text" : "password"} 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  required 
                  className="pr-10"
                  placeholder="••••••••"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <div className="relative">
                <Input 
                  id="confirmPassword" 
                  type={showConfirmPassword ? "text" : "password"} 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  required 
                  className="pr-10"
                  placeholder="••••••••"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Atualizando...
                </div>
              ) : (
                'Atualizar senha'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
