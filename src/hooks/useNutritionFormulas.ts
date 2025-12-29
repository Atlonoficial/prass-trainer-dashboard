import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface NutritionFormula {
  id: string
  name: string
  category: string
  description?: string | null
  ingredients: any[]
  servings?: number | null
  prep_time?: number | null
  cook_time?: number | null
  instructions?: string | null
  total_calories?: number | null
  total_protein?: number | null
  total_carbs?: number | null
  total_fat?: number | null
  created_by?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export function useNutritionFormulas() {
  const [formulas, setFormulas] = useState<NutritionFormula[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchFormulas = async () => {
    try {
      console.log('🔄 Fetching nutrition formulas...')
      setLoading(true)
      const { data, error } = await supabase
        .from('nutrition_formulas')
        .select('*')
        .order('name', { ascending: true })
      
      if (error) {
        console.error('❌ Error fetching formulas:', error)
        throw error
      }
      
      console.log(`✅ Fetched ${data?.length || 0} formulas`)
      setFormulas((data || []) as NutritionFormula[])
    } catch (error) {
      console.error('Error fetching formulas:', error)
      toast({ 
        title: 'Erro', 
        description: 'Não foi possível carregar as fórmulas', 
        variant: 'destructive' 
      })
    } finally {
      setLoading(false)
    }
  }

  const addFormula = async (formulaData: Omit<NutritionFormula, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
    try {
      console.log('🔄 Creating formula...', formulaData)
      
      // Robust authentication validation
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        console.error('❌ Authentication error:', authError)
        throw new Error(`Authentication failed: ${authError.message}`)
      }
      if (!user?.id) {
        console.error('❌ No authenticated user found')
        throw new Error('User not authenticated - please log in again')
      }

      // Data sanitization and validation
      const sanitizedData = {
        ...formulaData,
        name: formulaData.name?.trim(),
        category: formulaData.category?.trim() || 'outros',
        description: formulaData.description?.trim() || null,
        instructions: formulaData.instructions?.trim() || null,
        servings: formulaData.servings ? Math.max(1, Number(formulaData.servings)) : null,
        prep_time: formulaData.prep_time ? Math.max(0, Number(formulaData.prep_time)) : null,
        cook_time: formulaData.cook_time ? Math.max(0, Number(formulaData.cook_time)) : null,
        total_calories: formulaData.total_calories ? Math.max(0, Number(formulaData.total_calories)) : null,
        total_protein: formulaData.total_protein ? Math.max(0, Number(formulaData.total_protein)) : null,
        total_carbs: formulaData.total_carbs ? Math.max(0, Number(formulaData.total_carbs)) : null,
        total_fat: formulaData.total_fat ? Math.max(0, Number(formulaData.total_fat)) : null,
        ingredients: formulaData.ingredients || [],
        created_by: user.id
      }

      if (!sanitizedData.name) {
        throw new Error('Nome da fórmula é obrigatório')
      }

      if (!Array.isArray(sanitizedData.ingredients) || sanitizedData.ingredients.length === 0) {
        throw new Error('Pelo menos um ingrediente é obrigatório')
      }

      console.log('✅ Formula data sanitized:', sanitizedData)

      const { data, error } = await supabase
        .from('nutrition_formulas')
        .insert([sanitizedData])
        .select()
        .single()
      
      if (error) {
        console.error('❌ Database error:', error)
        throw error
      }
      
      console.log('✅ Formula created successfully:', data)
      setFormulas(prev => [data as NutritionFormula, ...prev])
      toast({ 
        title: 'Sucesso', 
        description: `Fórmula "${data.name}" adicionada com sucesso!` 
      })
      return data
    } catch (error: any) {
      console.error('❌ Error adding formula:', error)
      
      let userMessage = 'Não foi possível adicionar a fórmula'
      if (error.message.includes('not authenticated')) {
        userMessage = 'Sessão expirada. Faça login novamente.'
      } else if (error.message) {
        userMessage = error.message
      }

      toast({ 
        title: 'Erro', 
        description: userMessage, 
        variant: 'destructive' 
      })
      throw error
    }
  }

  const updateFormula = async (id: string, updates: Partial<NutritionFormula>) => {
    try {
      const { error } = await supabase
        .from('nutrition_formulas')
        .update(updates)
        .eq('id', id)
      
      if (error) throw error
      
      await fetchFormulas() // Refresh the list
      toast({ 
        title: 'Sucesso', 
        description: 'Fórmula atualizada com sucesso' 
      })
    } catch (error) {
      console.error('Error updating formula:', error)
      toast({ 
        title: 'Erro', 
        description: 'Não foi possível atualizar a fórmula', 
        variant: 'destructive' 
      })
      throw error
    }
  }

  const deleteFormula = async (id: string) => {
    try {
      const { error } = await supabase
        .from('nutrition_formulas')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      await fetchFormulas() // Refresh the list
      toast({ 
        title: 'Sucesso', 
        description: 'Fórmula excluída com sucesso' 
      })
    } catch (error) {
      console.error('Error deleting formula:', error)
      toast({ 
        title: 'Erro', 
        description: 'Não foi possível excluir a fórmula', 
        variant: 'destructive' 
      })
      throw error
    }
  }

  useEffect(() => { fetchFormulas() }, [])

  return { 
    formulas, 
    loading, 
    addFormula, 
    updateFormula, 
    deleteFormula, 
    refetch: fetchFormulas 
  }
}