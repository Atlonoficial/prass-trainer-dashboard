import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

export interface EvaluationTemplate {
  id: string
  name: string
  description?: string
  questions: any
  physical_measurements: any
  created_by: string
  created_at: string
  updated_at: string
  is_active: boolean
}

export function useEvaluationTemplates() {
  const [templates, setTemplates] = useState<EvaluationTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const { toast } = useToast()

  const fetchTemplates = async () => {
    if (!user) {
      setTemplates([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('evaluation_templates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      setTemplates(data || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os templates',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const createTemplate = async (templateData: Omit<EvaluationTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
    try {
      if (!user) throw new Error('Usuário não autenticado')

      const { data, error } = await supabase
        .from('evaluation_templates')
        .insert([{
          ...templateData,
          created_by: user.id
        }])
        .select()
        .single()

      if (error) throw error

      toast({
        title: 'Template criado',
        description: 'O template de avaliação foi criado com sucesso'
      })

      await fetchTemplates()
      return data
    } catch (error: any) {
      console.error('Error creating template:', error)
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível criar o template',
        variant: 'destructive'
      })
      throw error
    }
  }

  const updateTemplate = async (id: string, updates: Partial<EvaluationTemplate>) => {
    try {
      const { data, error } = await supabase
        .from('evaluation_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      toast({
        title: 'Template atualizado',
        description: 'O template foi atualizado com sucesso'
      })

      await fetchTemplates()
      return data
    } catch (error: any) {
      console.error('Error updating template:', error)
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível atualizar o template',
        variant: 'destructive'
      })
      throw error
    }
  }

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('evaluation_templates')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error

      toast({
        title: 'Template removido',
        description: 'O template foi removido com sucesso'
      })

      await fetchTemplates()
    } catch (error: any) {
      console.error('Error deleting template:', error)
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível remover o template',
        variant: 'destructive'
      })
      throw error
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [user?.id])

  return {
    templates,
    loading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    refetch: fetchTemplates
  }
}