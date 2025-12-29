import { StudentBannerDisplay } from './StudentBannerDisplay'
import { useStableUserType } from '@/hooks/useStableUserType'

interface BannerContainerProps {
  placement: 'header' | 'between-sections' | 'modal' | 'sidebar'
  className?: string
  maxBanners?: number
  showDismiss?: boolean
}

export function BannerContainer({ placement, className, maxBanners, showDismiss }: BannerContainerProps) {
  const { isStudent, loading, userType } = useStableUserType()

  console.log('[BannerContainer] 🔍 DETAILED CHECK:', {
    placement,
    isStudent,
    loading,
    userType,
    timestamp: new Date().toISOString(),
    condition_isStudent: isStudent,
    condition_userType: userType,
    condition_notStudent: !isStudent,
    condition_notStudentType: userType !== 'student'
  })

  if (loading) {
    console.log('[BannerContainer] ⏳ Still loading user type - blocking render')
    return null
  }

  // Simplificada: Bloqueia apenas se NÃO for estudante
  if (!isStudent && userType !== 'student') {
    console.log('[BannerContainer] 🚫 Blocking - not a student:', { 
      isStudent, 
      userType,
      reason: 'User is not a student type'
    })
    return null
  }

  console.log('[BannerContainer] ✅ APPROVED - Rendering banners:', { 
    userType, 
    isStudent, 
    placement 
  })

  return (
    <StudentBannerDisplay
      placement={placement}
      className={className}
      maxBanners={maxBanners}
      showDismiss={showDismiss}
    />
  )
}