import { useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { LoadingSpinner } from '@/components/LoadingSpinner'

/**
 * Componente de redirecionamento para unificar o fluxo de reset de senha
 * Redireciona automaticamente para /auth preservando todos os parâmetros
 */
export default function ResetPasswordRedirect() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    console.log('[ResetPasswordRedirect] Redirecionando para /auth com parâmetros:', Object.fromEntries(searchParams.entries()))
    
    // Preserva todos os parâmetros da URL original
    const newSearchParams = new URLSearchParams(searchParams)
    
    // Redireciona para /auth com todos os parâmetros preservados
    navigate(`/auth?${newSearchParams.toString()}`, { replace: true })
  }, [searchParams, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <LoadingSpinner />
        <p className="mt-4 text-muted-foreground">Redirecionando para autenticação...</p>
      </div>
    </div>
  )
}