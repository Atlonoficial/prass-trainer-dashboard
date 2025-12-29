import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface ServicePricing {
  id: string
  teacher_id: string
  service_type: 'consultation' | 'course' | 'training_plan' | 'nutrition_plan'
  service_id?: string | null
  name: string
  description?: string | null
  price: number
  currency: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export function useServicePricing() {
  const [services, setServices] = useState<ServicePricing[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchServices = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('service_pricing')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setServices((data || []) as ServicePricing[])
    } catch (error) {
      console.error('Error fetching service pricing:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os preços dos serviços',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const createService = async (serviceData: Omit<ServicePricing, 'id' | 'teacher_id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('service_pricing')
        .insert([{ ...serviceData, teacher_id: user.id }])
        .select()
        .single()

      if (error) throw error

      setServices(prev => [data as ServicePricing, ...prev])
      toast({
        title: 'Sucesso',
        description: 'Serviço criado com sucesso'
      })

      return data
    } catch (error) {
      console.error('Error creating service:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o serviço',
        variant: 'destructive'
      })
      throw error
    }
  }

  const updateService = async (id: string, updates: Partial<ServicePricing>) => {
    try {
      const { data, error } = await supabase
        .from('service_pricing')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      setServices(prev => prev.map(service => 
        service.id === id ? data as ServicePricing : service
      ))

      toast({
        title: 'Sucesso',
        description: 'Serviço atualizado com sucesso'
      })

      return data
    } catch (error) {
      console.error('Error updating service:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o serviço',
        variant: 'destructive'
      })
      throw error
    }
  }

  const deleteService = async (id: string) => {
    try {
      const { error } = await supabase
        .from('service_pricing')
        .delete()
        .eq('id', id)

      if (error) throw error

      setServices(prev => prev.filter(service => service.id !== id))
      toast({
        title: 'Sucesso',
        description: 'Serviço removido com sucesso'
      })
    } catch (error) {
      console.error('Error deleting service:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o serviço',
        variant: 'destructive'
      })
      throw error
    }
  }

  const getAvailableServices = async (teacherId: string) => {
    try {
      const { data, error } = await supabase
        .from('service_pricing')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return (data || []) as ServicePricing[]
    } catch (error) {
      console.error('Error fetching available services:', error)
      return []
    }
  }

  useEffect(() => {
    fetchServices()
  }, [])

  return {
    services,
    loading,
    createService,
    updateService,
    deleteService,
    getAvailableServices,
    refetch: fetchServices
  }
}