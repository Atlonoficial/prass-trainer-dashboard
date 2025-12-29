import { useEffect } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

interface LegacyRedirectProps {
  to: string
}

/**
 * Componente para redirecionar links antigos
 * Preserva query string e hash
 */
export default function LegacyRedirect({ to }: LegacyRedirectProps) {
  console.log('[LegacyRedirect] Componente carregado, redirecionando para:', to)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const location = useLocation()

  useEffect(() => {
    // Preservar toda a query string e hash
    const query = searchParams.toString()
    const hash = location.hash
    const fullPath = `${to}${query ? `?${query}` : ''}${hash}`
    
    console.log('[LegacyRedirect] Redirecionando link antigo:', {
      from: location.pathname,
      to: fullPath,
      query,
      hash
    })
    
    navigate(fullPath, { replace: true })
  }, [to, searchParams, location, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
        <p className="text-muted-foreground">Redirecionando...</p>
      </div>
    </div>
  )
}
