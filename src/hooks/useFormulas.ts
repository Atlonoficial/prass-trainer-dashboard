import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface FormulaIngredient {
  name: string
  quantity: string
  unit: string
}

export interface Formula {
  id: string
  name: string
  category?: string | null
  description?: string | null
  ingredients: FormulaIngredient[]
  total_calories?: number | null
  total_protein?: number | null
  total_carbs?: number | null
  total_fat?: number | null
  instructions?: string | null
  prep_time?: number | null
  cook_time?: number | null
  servings?: number | null
  created_by?: string | null
  created_at?: string | null
}

export function useFormulas() {
  const [formulas, setFormulas] = useState<Formula[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchFormulas = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('nutrition_formulas')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transform the data to match our Formula interface
      const transformedData = (data || []).map(item => ({
        ...item,
        ingredients: Array.isArray(item.ingredients) ? item.ingredients : []
      })) as unknown as Formula[]

      setFormulas(transformedData)
    } catch (error) {
      console.error('Error fetching formulas:', error)
      toast({ title: 'Erro', description: 'Não foi possível carregar as fórmulas', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const addFormula = async (formulaData: Omit<Formula, 'id' | 'created_at' | 'created_by'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('nutrition_formulas')
        .insert({
          ...formulaData,
          created_by: user.id,
          ingredients: formulaData.ingredients as any // Cast to JSON for database
        })
        .select()
        .single()

      if (error) throw error

      // Transform the response to match our Formula interface
      const transformedData = {
        ...data,
        ingredients: Array.isArray(data.ingredients) ? data.ingredients : []
      } as unknown as Formula

      setFormulas(prev => [transformedData, ...prev])
      toast({ title: 'Sucesso', description: 'Fórmula criada com sucesso' })
      return transformedData
    } catch (error) {
      console.error('Error adding formula:', error)
      toast({ title: 'Erro', description: 'Não foi possível criar a fórmula', variant: 'destructive' })
      throw error
    }
  }

  const updateFormula = async (id: string, updates: Partial<Formula>) => {
    try {
      const updateData = {
        ...updates,
        ingredients: updates.ingredients ? updates.ingredients as any : undefined // Cast to JSON for database
      }

      const { data, error } = await supabase
        .from('nutrition_formulas')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // Transform the response to match our Formula interface
      const transformedData = {
        ...data,
        ingredients: Array.isArray(data.ingredients) ? data.ingredients : []
      } as unknown as Formula

      setFormulas(prev => prev.map(formula => 
        formula.id === id ? transformedData : formula
      ))
      
      toast({ title: 'Sucesso', description: 'Fórmula atualizada com sucesso' })
    } catch (error) {
      console.error('Error updating formula:', error)
      toast({ title: 'Erro', description: 'Não foi possível atualizar a fórmula', variant: 'destructive' })
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

      setFormulas(prev => prev.filter(formula => formula.id !== id))
      toast({ title: 'Sucesso', description: 'Fórmula excluída com sucesso' })
    } catch (error) {
      console.error('Error deleting formula:', error)
      toast({ title: 'Erro', description: 'Não foi possível excluir a fórmula', variant: 'destructive' })
      throw error
    }
  }

  const searchFormulas = (searchTerm: string) =>
    formulas.filter(formula =>
      formula.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

  const getFormulasByCategory = (category: string) =>
    formulas.filter(formula => formula.category === category)

  useEffect(() => {
    fetchFormulas()
  }, [])

  return {
    formulas,
    loading,
    addFormula,
    updateFormula,
    deleteFormula,
    searchFormulas,
    getFormulasByCategory,
    refetch: fetchFormulas
  }
}