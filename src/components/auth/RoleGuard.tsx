
import React, { useEffect, useState } from 'react'
import { useUnifiedApp } from '@/contexts/UnifiedAppProvider'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'

interface RoleGuardProps {
  allowed: string[]
  children: React.ReactNode
}

export function RoleGuard({ allowed, children }: RoleGuardProps) {
  const { user, userRole, loading } = useUnifiedApp()
  const location = useLocation()
  const [ssoProcessing, setSsoProcessing] = useState(true)

  // Recebe sessão via hash SSO: #sso=1&access_token=...&refresh_token=...
  useEffect(() => {
    const trySsoFromHash = async () => {
      try {
        const rawHash = window.location.hash?.replace(/^#/, '') || ''
        if (!rawHash) {
          setSsoProcessing(false)
          return
        }
        const params = new URLSearchParams(rawHash)
        if (params.get('sso') !== '1') {
          setSsoProcessing(false)
          return
        }

        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token')

        if (access_token && refresh_token) {
          console.log('[RoleGuard] Applying SSO session from hash...')
          await supabase.auth.setSession({ access_token, refresh_token })

          // Limpa o hash por segurança
          history.replaceState(null, document.title, window.location.pathname + window.location.search)
        }
      } catch (err) {
        console.error('[RoleGuard] Error processing SSO hash:', err)
      } finally {
        setSsoProcessing(false)
      }
    }

    trySsoFromHash()
  }, [])

  // Normaliza papel "professor" -> "teacher"
  const normalizedRole = userRole === 'professor' ? 'teacher' : userRole
  const normalizedAllowed = allowed.map((r) => (r === 'professor' ? 'teacher' : r))

  console.log('🔒 RoleGuard:', {
    path: location.pathname,
    user: user?.id,
    userRole,
    normalizedRole,
    allowed: normalizedAllowed,
    hasAccess: normalizedAllowed.includes(normalizedRole),
    loading,
    ssoProcessing
  })

  if (!user && !ssoProcessing) {
    console.log('❌ RoleGuard: No user, redirecting to /auth')
    const returnTo = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/auth?returnTo=${returnTo}`} replace />
  }

  if (loading.auth || ssoProcessing) {
    console.log('⏳ RoleGuard: Loading or processing SSO')
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!normalizedAllowed.includes(normalizedRole)) {
    console.error('🚫 RoleGuard: Access denied!', {
      userRole,
      normalizedRole,
      allowed: normalizedAllowed,
      path: location.pathname
    })
    return <Navigate to="/" replace />
  }

  console.log('✅ RoleGuard: Access granted')
  return <>{children}</>
}
