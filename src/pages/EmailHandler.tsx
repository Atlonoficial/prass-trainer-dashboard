import { useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { LoadingSpinner } from '@/components/LoadingSpinner'

export default function EmailHandler() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const type = searchParams.get('type')
    const hasTokens = searchParams.get('access_token') || searchParams.get('token_hash')

    if (!hasTokens) {
      navigate('/auth', { replace: true })
      return
    }

    // Route to specific email page based on type
    switch (type) {
      case 'signup':
        navigate(`/email/confirm?${searchParams.toString()}`, { replace: true })
        break
      case 'magiclink':
        navigate(`/email/magic-link?${searchParams.toString()}`, { replace: true })
        break
      case 'recovery':
        navigate(`/email/reset-password?${searchParams.toString()}`, { replace: true })
        break
      case 'email_change':
        navigate(`/email/change-email?${searchParams.toString()}`, { replace: true })
        break
      case 'reauth':
        navigate(`/email/reauth?${searchParams.toString()}`, { replace: true })
        break
      default:
        // Fallback for any auth-related tokens
        navigate(`/email/confirm?${searchParams.toString()}`, { replace: true })
        break
    }
  }, [searchParams, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <LoadingSpinner />
        <p className="mt-4 text-muted-foreground">Processando seu email...</p>
      </div>
    </div>
  )
}