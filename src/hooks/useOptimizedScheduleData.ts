import { useState, useEffect, useCallback, useRef } from 'react'
import { useImprovedAppointments } from './useImprovedAppointments'
import { useTeacherAvailability } from './useTeacherAvailability'
import { toBrasiliaTime, nowInBrasilia, isSameDayBrasilia } from '@/lib/timezone'

export function useOptimizedScheduleData() {
  const { appointments: dbAppointments, loading } = useImprovedAppointments()
  const { availability } = useTeacherAvailability()
  const [dateRangeAppointments, setDateRangeAppointments] = useState<any[]>([])
  const fetchingRef = useRef(false)
  const lastFetchRef = useRef<string>('')

  // Fetch appointments for specific date range with optimization
  const fetchAppointmentsByDateRange = useCallback(async (startDate: Date, endDate: Date) => {
    const fetchKey = `${startDate.toISOString()}-${endDate.toISOString()}`
    
    // Prevent duplicate fetches
    if (fetchingRef.current || lastFetchRef.current === fetchKey) {
      return
    }

    fetchingRef.current = true
    lastFetchRef.current = fetchKey

    try {
      // Filter existing appointments first to avoid unnecessary API calls
      const filteredAppointments = dbAppointments.filter(appointment => {
        const appointmentDate = toBrasiliaTime(appointment.scheduled_time)
        return appointmentDate >= startDate && appointmentDate <= endDate
      })

      setDateRangeAppointments(filteredAppointments)
    } catch (error) {
      console.error('Error filtering appointments:', error)
      setDateRangeAppointments([])
    } finally {
      fetchingRef.current = false
    }
  }, [dbAppointments])

  // Optimized statistics calculation for current month
  const calculateOptimizedStats = useCallback(() => {
    const now = nowInBrasilia()
    
    // Get current month boundaries in Brasilia timezone
    const currentMonthStart = toBrasiliaTime(new Date(now.getFullYear(), now.getMonth(), 1))
    currentMonthStart.setHours(0, 0, 0, 0)
    const currentMonthEnd = toBrasiliaTime(new Date(now.getFullYear(), now.getMonth() + 1, 0))
    currentMonthEnd.setHours(23, 59, 59, 999)

    // Debug: Log raw appointments for debugging
    console.log('=== DEBUG APPOINTMENT STATS ===')
    console.log('Total appointments from DB:', dbAppointments.length)
    console.log('Current time (Brasilia):', now.toISOString())
    console.log('Month boundaries:', { start: currentMonthStart.toISOString(), end: currentMonthEnd.toISOString() })

    // Filter appointments for current month only with detailed logging
    const currentMonthAppointments = dbAppointments.filter(appointment => {
      const appointmentDate = toBrasiliaTime(appointment.scheduled_time)
      const isActiveStatus = ['scheduled', 'confirmed'].includes(appointment.status || 'scheduled')
      const isInCurrentMonth = appointmentDate >= currentMonthStart && appointmentDate <= currentMonthEnd
      
      console.log(`Appointment ${appointment.id}: ${appointmentDate.toISOString()} | Status: ${appointment.status} | Active: ${isActiveStatus} | InMonth: ${isInCurrentMonth}`)
      
      return isInCurrentMonth && isActiveStatus
    })

    console.log('Current month active appointments:', currentMonthAppointments.length)

    // Today's appointments with proper timezone handling and detailed logging
    const todaysAppointments = currentMonthAppointments.filter(appointment => {
      const appointmentDate = toBrasiliaTime(appointment.scheduled_time)
      const isToday = isSameDayBrasilia(appointmentDate, now)
      
      console.log(`Today check - Appointment ${appointment.id}: ${appointmentDate.toISOString()} | IsToday: ${isToday}`)
      
      return isToday
    })

    console.log('TODAY APPOINTMENTS FOUND:', todaysAppointments.length)
    todaysAppointments.forEach(apt => {
      console.log(`- ${apt.id}: ${toBrasiliaTime(apt.scheduled_time).toISOString()} | Status: ${apt.status}`)
    })

    // Pending appointments (scheduled but not confirmed) for current month
    const pendingToday = currentMonthAppointments.filter(a => {
      const appointmentDate = toBrasiliaTime(a.scheduled_time)
      return isSameDayBrasilia(appointmentDate, now) && a.status === 'scheduled'
    }).length

    // Weekly statistics with proper slot calculation (current week of current month)
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay() + 1) // Monday
    startOfWeek.setHours(0, 0, 0, 0)
    
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(endOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    // Filter weekly appointments (only current week of current month)
    const weeklyAppointments = currentMonthAppointments.filter(a => {
      const appointmentDate = toBrasiliaTime(a.scheduled_time)
      return appointmentDate >= startOfWeek && appointmentDate <= endOfWeek
    })

    // Calculate total available slots using correct 75-minute duration
    const totalAvailableSlots = availability.reduce((total, slot) => {
      const startTime = new Date(`1970-01-01T${slot.start_time}`)
      const endTime = new Date(`1970-01-01T${slot.end_time}`)
      const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60)
      const slotDuration = slot.slot_minutes || 75
      const slotsPerDay = Math.floor(duration / slotDuration)
      
      // Count actual days for this weekday in current week up to today
      let daysInWeek = 0
      for (let i = 0; i < 7; i++) {
        const checkDate = new Date(startOfWeek)
        checkDate.setDate(checkDate.getDate() + i)
        const todayEnd = new Date(now)
        todayEnd.setHours(23, 59, 59, 999)
        if (checkDate.getDay() === slot.weekday && checkDate <= todayEnd) {
          daysInWeek++
        }
      }
      
      return total + (slotsPerDay * daysInWeek)
    }, 0)

    const occupancyRate = totalAvailableSlots > 0 
      ? Math.round((weeklyAppointments.length / totalAvailableSlots) * 100)
      : 0

    const freeSlots = Math.max(0, totalAvailableSlots - weeklyAppointments.length)

    return {
      todaysAppointments,
      pendingToday,
      weeklyStats: {
        freeSlots,
        occupancyRate,
        weeklyAppointments: weeklyAppointments.length,
        totalSlots: totalAvailableSlots
      },
      currentMonthAppointments
    }
  }, [dbAppointments, availability])

  return {
    dbAppointments,
    dateRangeAppointments,
    loading,
    fetchAppointmentsByDateRange,
    calculateOptimizedStats
  }
}