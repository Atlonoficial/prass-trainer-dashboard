import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'

export function EmailSentPage() {
  const [email, setEmail] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const pendingEmail = localStorage.getItem('pendingEmail')
    if (pendingEmail) {
      setEmail(pendingEmail)
    } else {
      // Se não há email pendente, redirecionar para auth
      navigate('/auth')
    }
  }, [navigate])

  const handleBackToLogin = () => {
    localStorage.removeItem('pendingEmail')
    navigate('/auth')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">📧 Verifique seu email</CardTitle>
          <CardDescription className="text-base">
            Enviamos um link de confirmação para
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="font-semibold text-lg">{email}</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                Clique no link do email para confirmar seu cadastro
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                Após confirmar, você poderá fazer login normalmente
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                Não esqueça de verificar sua caixa de spam
              </p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button 
              onClick={handleBackToLogin}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para o login
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Não recebeu o email? Verifique sua caixa de spam ou tente novamente.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
