import { useMemo } from 'react'
import { isSameDay } from 'date-fns'
import { nowInBrasilia, toBrasiliaTime } from '@/lib/timezone'

export function useTimeSlotFiltering(selectedDate?: Date) {
  const currentTime = nowInBrasilia()
  
  return useMemo(() => {
    // Se não há data selecionada, retorna função que sempre permite
    if (!selectedDate) {
      return {
        isSlotAvailable: () => true,
        isDateToday: false,
        currentTimeSlot: null
      }
    }

    const isDateToday = isSameDay(selectedDate, currentTime)
    
    // Se não é hoje, todos os horários estão disponíveis
    if (!isDateToday) {
      return {
        isSlotAvailable: () => true,
        isDateToday: false,
        currentTimeSlot: null
      }
    }

    // Se é hoje, filtra horários que já passaram
    const currentHour = currentTime.getHours()
    const currentMinute = currentTime.getMinutes()
    const currentTimeSlot = `${currentHour.toString().padStart(2, '0')}:${Math.floor(currentMinute / 30) * 30 === 0 ? '00' : '30'}`
    
    const isSlotAvailable = (slotTime: string | Date) => {
      let timeString: string
      
      if (typeof slotTime === 'string') {
        // Se é string, pode ser ISO ou HH:mm
        if (slotTime.includes('T')) {
          // É ISO string
          const date = new Date(slotTime)
          timeString = date.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: 'America/Sao_Paulo' 
          })
        } else {
          // É string HH:mm
          timeString = slotTime
        }
      } else {
        // É Date object
        timeString = slotTime.toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'America/Sao_Paulo' 
        })
      }
      
      // Comparar horários apenas se for hoje
      if (isDateToday) {
        return timeString > currentTimeSlot
      }
      
      return true
    }

    return {
      isSlotAvailable,
      isDateToday,
      currentTimeSlot
    }
  }, [selectedDate, currentTime])
}