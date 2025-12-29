import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'

export interface TeacherAvailability {
  id: string
  teacher_id: string
  weekday: number
  start_time: string
  end_time: string
  slot_minutes: number
  created_at: string
  updated_at: string
}

export interface AvailabilitySlot {
  weekday: number
  start_time: string
  end_time: string
  slot_minutes: number
}

export interface BookingSettings {
  minimum_advance_minutes: number
  visibility_days: number
  allow_same_day: boolean
  auto_confirm: boolean
}

// Função para converter valores de slot para minutos inteiros
const convertSlotToMinutes = (slotValue: string | number): number => {
  const numValue = typeof slotValue === 'string' ? parseFloat(slotValue) : slotValue
  
  if (numValue < 1) {
    // Para valores menores que 1, assumimos que são frações de hora
    return Math.round(numValue * 60)
  }
  
  // Para valores maiores ou iguais a 1, assumimos que já são minutos
  return Math.round(numValue)
}

// Função para converter minutos para display (não precisa mais de conversão)
const convertMinutesToDisplay = (minutes: number): number => {
  return minutes
}

export function useTeacherAvailability() {
  const [availability, setAvailability] = useState<TeacherAvailability[]>([])
  const [bookingSettings, setBookingSettings] = useState<BookingSettings>({
    minimum_advance_minutes: 120, // 2 horas em minutos
    visibility_days: 7,
    allow_same_day: false,
    auto_confirm: false
  })
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const { user } = useAuth()

  const fetchAvailability = async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      
      // Fetch availability
      const { data: availabilityData, error: availabilityError } = await supabase
        .from('teacher_availability')
        .select('*')
        .eq('teacher_id', user.id)
        .order('weekday', { ascending: true })

      if (availabilityError) throw availabilityError

      // Fetch booking settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('teacher_booking_settings')
        .select('*')
        .eq('teacher_id', user.id)
        .maybeSingle()

      if (settingsError) throw settingsError

      setAvailability(availabilityData || [])
      if (settingsData) {
        setBookingSettings({
          minimum_advance_minutes: settingsData.minimum_advance_minutes || 120,
          visibility_days: settingsData.visibility_days || 7,
          allow_same_day: settingsData.allow_same_day || false,
          auto_confirm: settingsData.auto_confirm || false
        })
      }
    } catch (error) {
      console.error('Error fetching teacher availability:', error)
      toast({ 
        title: 'Erro', 
        description: 'Não foi possível carregar sua disponibilidade', 
        variant: 'destructive' 
      })
    } finally {
      setLoading(false)
    }
  }

  const saveAvailability = async (slots: AvailabilitySlot[], settings?: BookingSettings) => {
    if (!user?.id) return

    try {
      console.log('Saving availability slots:', slots)
      
      // Delete existing availability for this teacher
      await supabase
        .from('teacher_availability')
        .delete()
        .eq('teacher_id', user.id)

      // Insert new availability slots
      if (slots.length > 0) {
        const insertData = slots.map(slot => {
          const convertedSlotMinutes = convertSlotToMinutes(slot.slot_minutes)
          console.log(`Converting slot_minutes: ${slot.slot_minutes} -> ${convertedSlotMinutes}`)
          
          return {
            teacher_id: user.id,
            weekday: slot.weekday,
            start_time: slot.start_time,
            end_time: slot.end_time,
            slot_minutes: convertedSlotMinutes
          }
        })

        console.log('Insert data prepared:', insertData)

        const { error } = await supabase
          .from('teacher_availability')
          .insert(insertData)

        if (error) throw error
      }

      // Save booking settings if provided
      if (settings) {
        console.log(`Saving booking settings:`, settings)
        
        // First try to update existing settings
        const { data: existingSettings } = await supabase
          .from('teacher_booking_settings')
          .select('id')
          .eq('teacher_id', user.id)
          .maybeSingle()

        if (existingSettings) {
          // Update existing record
          const { error: updateError } = await supabase
            .from('teacher_booking_settings')
            .update(settings)
            .eq('teacher_id', user.id)

          if (updateError) throw updateError
        } else {
          // Insert new record
          const { error: insertError } = await supabase
            .from('teacher_booking_settings')
            .insert({
              teacher_id: user.id,
              ...settings
            })

          if (insertError) throw insertError
        }
        
        setBookingSettings(settings)
      }

      toast({ 
        title: 'Sucesso', 
        description: 'Disponibilidade atualizada com sucesso' 
      })
      
      await fetchAvailability()
    } catch (error) {
      console.error('Error saving teacher availability:', error)
      toast({ 
        title: 'Erro', 
        description: 'Não foi possível salvar sua disponibilidade', 
        variant: 'destructive' 
      })
      throw error
    }
  }

  const deleteAvailability = async (id: string) => {
    try {
      const { error } = await supabase
        .from('teacher_availability')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({ 
        title: 'Sucesso', 
        description: 'Horário removido com sucesso' 
      })
      
      await fetchAvailability()
    } catch (error) {
      console.error('Error deleting availability:', error)
      toast({ 
        title: 'Erro', 
        description: 'Não foi possível remover o horário', 
        variant: 'destructive' 
      })
      throw error
    }
  }

  useEffect(() => {
    fetchAvailability()
  }, [user?.id])

  // Real-time subscription for teacher availability changes
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel('teacher_availability_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teacher_availability',
          filter: `teacher_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Teacher availability real-time update:', payload)
          fetchAvailability()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  return { 
    availability, 
    bookingSettings,
    loading, 
    saveAvailability, 
    deleteAvailability, 
    refetch: fetchAvailability 
  }
}
