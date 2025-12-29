import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useStableUserType } from '@/hooks/useStableUserType'
import { useBannerTracking } from '@/hooks/useBannerTracking'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { X, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Banner {
  id: string
  title: string
  message: string | null
  image_url: string | null
  action_text: string | null
  action_url: string | null
  priority: number | null
}

interface StudentBannerDisplayProps {
  placement: 'header' | 'between-sections' | 'modal' | 'sidebar'
  className?: string
  maxBanners?: number
  showDismiss?: boolean
}

export function StudentBannerDisplay({ 
  placement, 
  className = '', 
  maxBanners = 3, 
  showDismiss = true 
}: StudentBannerDisplayProps) {
  // Force rebuild - useUserType hook import
  const { user } = useAuth()
  const userTypeResult = useStableUserType()
  const { userType, teacherId } = userTypeResult
  const { trackDetailView, trackRedirectClick } = useBannerTracking()
  
  console.log('[StudentBannerDisplay] 🎯 Component init:', {
    user: user?.id,
    userType,
    teacherId,
    placement
  })
  const [banners, setBanners] = useState<Banner[]>([])
  const [dismissedBanners, setDismissedBanners] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  // Fetch active banners for the student's teacher
  useEffect(() => {
    async function fetchBanners() {
      if (!user) {
        console.log('[StudentBannerDisplay] No user, skipping banner fetch')
        setLoading(false)
        return
      }

      console.log('[StudentBannerDisplay] Fetching banners for user:', user.id)

      try {
        // Get student data to find teacher_id
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('teacher_id')
          .eq('user_id', user.id)
          .single()

        if (studentError || !studentData?.teacher_id) {
          console.log('[StudentBannerDisplay] Student data not found or no teacher:', { studentError, studentData })
          setLoading(false)
          return
        }

        const teacherId = studentData.teacher_id
        console.log('[StudentBannerDisplay] Found student with teacher_id:', teacherId)

        // Get active banners from teacher
        const { data: bannersData, error: bannersError } = await supabase
          .from('banners')
          .select('id, title, message, image_url, action_text, action_url, priority')
          .eq('created_by', teacherId)
          .eq('is_active', true)
          .lte('start_date', new Date().toISOString())
          .or('end_date.is.null,end_date.gte.' + new Date().toISOString())
          .order('priority', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(maxBanners)

        console.log('[StudentBannerDisplay] Fetched banners:', bannersData)

        if (bannersError) throw bannersError

        setBanners(bannersData || [])
      } catch (error) {
        console.error('Error fetching banners:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBanners()
  }, [user, maxBanners])

  const handleDetailView = (banner: Banner, event: React.MouseEvent) => {
    console.log('[DEBUG] 👁️ Detail view clicked:', {
      bannerId: banner.id,
      bannerTitle: banner.title,
      userId: user?.id,
      timestamp: new Date().toISOString(),
      clickCoords: { x: event.clientX, y: event.clientY }
    })
    
    trackDetailView(banner.id, { 
      placement,
      hasAction: !!banner.action_url,
      clickPosition: {
        x: event.clientX,
        y: event.clientY
      }
    })
  }

  const handleRedirectClick = (banner: Banner, event: React.MouseEvent) => {
    event.stopPropagation() // Prevent detail view tracking
    
    console.log('[DEBUG] 🚀 Redirect click:', {
      bannerId: banner.id,
      actionUrl: banner.action_url,
      userId: user?.id,
      timestamp: new Date().toISOString()
    })
    
    trackRedirectClick(banner.id, { 
      placement,
      actionUrl: banner.action_url,
      clickPosition: {
        x: event.clientX,
        y: event.clientY
      }
    })

    if (banner.action_url) {
      window.open(banner.action_url, '_blank', 'noopener,noreferrer')
    }
  }

  const handleTestBanner = () => {
    if (visibleBanners.length > 0) {
      const testBanner = visibleBanners[0]
      console.log('[DEBUG] 🧪 Manual test for banner:', testBanner.id)
      
      // Test both interactions
      trackDetailView(testBanner.id, { test: true, manual: true })
      setTimeout(() => {
        trackRedirectClick(testBanner.id, { test: true, manual: true })
      }, 1000)
    }
  }

  const handleDismiss = (bannerId: string) => {
    setDismissedBanners(prev => new Set([...prev, bannerId]))
  }

  const visibleBanners = banners.filter(banner => !dismissedBanners.has(banner.id))

  console.log('[DEBUG] 📊 Banner display status:', {
    loading,
    totalBanners: banners.length,
    visibleBanners: visibleBanners.length,
    dismissedCount: dismissedBanners.size,
    hasUser: !!user,
    userId: user?.id,
    placement
  })

  if (loading || visibleBanners.length === 0) {
    return null
  }

  const getPlacementStyles = () => {
    switch (placement) {
      case 'header':
        return 'rounded-lg shadow-sm'
      case 'between-sections':
        return 'rounded-xl shadow-md'
      case 'modal':
        return 'rounded-2xl shadow-lg'
      case 'sidebar':
        return 'rounded-lg shadow-sm'
      default:
        return 'rounded-lg'
    }
  }

  return (
    <div className={cn('w-full space-y-4', className)}>
      {/* Debug Info - Only show in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-muted/50 p-3 rounded-lg text-xs space-y-1 border border-dashed">
          <div className="font-mono font-semibold">🐛 Banner Debug Panel</div>
          <div>User ID: {user?.id}</div>
          <div>Banners: {visibleBanners.length} visible / {banners.length} total</div>
          <div>Placement: {placement}</div>
          <button 
            onClick={handleTestBanner}
            className="bg-primary text-primary-foreground px-3 py-1 rounded mt-2 hover:bg-primary/90 transition-colors"
          >
            🧪 Test Banner Tracking
          </button>
        </div>
      )}
      
      {visibleBanners.map((banner) => (
        <Card
          key={banner.id}
          className={cn(
            'group relative overflow-hidden border-muted bg-card hover:shadow-lg transition-all duration-300',
            getPlacementStyles(),
            'cursor-pointer hover:scale-[1.02]'
          )}
          onClick={(e) => handleDetailView(banner, e)}
        >
          {showDismiss && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation()
                handleDismiss(banner.id)
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}

          <div className="flex items-center gap-4 p-4">
            {banner.image_url && (
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted">
                  <img
                    src={banner.image_url}
                    alt={banner.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm sm:text-base line-clamp-1">
                {banner.title}
              </h3>
              {banner.message && (
                <p className="text-muted-foreground text-xs sm:text-sm mt-1 line-clamp-2">
                  {banner.message}
                </p>
              )}
            </div>

            {banner.action_text && banner.action_url && (
              <div className="flex-shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-2"
                  onClick={(e) => handleRedirectClick(banner, e)}
                >
                  {banner.action_text}
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Subtle gradient overlay for visual appeal */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </Card>
      ))}
    </div>
  )
}