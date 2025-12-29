import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'

interface ContentAccessStatus {
  hasAccess: boolean
  accessType: 'free' | 'subscription' | 'purchase' | 'teacher' | 'none'
  expiresAt?: string
}

export function useContentAccess() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)

  const checkPlanAccess = useCallback(async (teacherId: string): Promise<ContentAccessStatus> => {
    if (!user?.id) {
      return { hasAccess: false, accessType: 'none' }
    }

    try {
      // Check if user is the teacher
      if (user.id === teacherId) {
        return { hasAccess: true, accessType: 'teacher' }
      }

      // Check active subscription
      const { data: subscription } = await supabase
        .from('active_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('teacher_id', teacherId)
        .eq('status', 'active')
        .gte('end_date', new Date().toISOString().split('T')[0])
        .single()

      if (subscription) {
        return {
          hasAccess: true,
          accessType: 'subscription',
          expiresAt: subscription.end_date
        }
      }

      return { hasAccess: false, accessType: 'none' }
    } catch (error) {
      console.error('Error checking plan access:', error)
      return { hasAccess: false, accessType: 'none' }
    }
  }, [user?.id])

  const checkCourseAccess = useCallback(async (courseId: string): Promise<ContentAccessStatus> => {
    if (!user?.id) {
      return { hasAccess: false, accessType: 'none' }
    }

    try {
      // Get course info
      const { data: course } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single()

      if (!course) {
        return { hasAccess: false, accessType: 'none' }
      }

      // Check if user is the instructor
      if (user.id === course.instructor) {
        return { hasAccess: true, accessType: 'teacher' }
      }

      // Check if course is free
      if (course.is_free) {
        return { hasAccess: true, accessType: 'free' }
      }

      // Check if user is enrolled
      if (course.enrolled_users?.includes(user.id)) {
        return { hasAccess: true, accessType: 'free' }
      }

      return { hasAccess: false, accessType: 'none' }
    } catch (error) {
      console.error('Error checking course access:', error)
      return { hasAccess: false, accessType: 'none' }
    }
  }, [user?.id])

  const checkContentPermission = useCallback(async (contentType: string, teacherId: string): Promise<boolean> => {
    if (!user?.id) return false

    try {
      const { data } = await supabase
        .from('student_content_permissions')
        .select('*')
        .eq('student_id', user.id)
        .eq('teacher_id', teacherId)
        .eq('content_id', contentType)
        .single()

      return !!data
    } catch (error) {
      return false
    }
  }, [user?.id])

  return {
    checkPlanAccess,
    checkCourseAccess,
    checkContentPermission,
    loading
  }
}