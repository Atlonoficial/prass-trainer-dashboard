import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface Meal {
  id: string
  name: string
  description?: string | null
  category?: string | null
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber?: number | null
  sodium?: number | null
  sugar?: number | null
  ingredients?: string[] | null
  instructions?: string | null
  portion_amount?: number | null
  portion_unit?: string | null
  time?: string | null
  image_url?: string | null
  created_by?: string | null
  created_at?: string | null
}

export function useMeals() {
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchMeals = async () => {
    try {
      console.log('🔄 Fetching meals...')
      setLoading(true)

      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Error fetching meals:', error)
        throw error
      }
      console.log(`✅ Fetched ${data?.length || 0} meals`)
      setMeals(data || [])
    } catch (error) {
      console.error('Error fetching meals:', error)
      toast({ title: 'Erro', description: 'Não foi possível carregar as refeições', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const addMeal = async (mealData: Omit<Meal, 'id' | 'created_at' | 'created_by'>) => {
    try {
      console.log('🔄 Starting meal creation process...', { mealData })

      // FASE 1: Validação robusta de autenticação
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        console.error('❌ Authentication error:', authError)
        throw new Error(`Authentication failed: ${authError.message}`)
      }
      if (!user?.id) {
        console.error('❌ No authenticated user found')
        throw new Error('User not authenticated - please log in again')
      }
      console.log('✅ User authenticated:', user.id)

      // FASE 2: Validação e sanitização de dados
      const sanitizedData = {
        name: mealData.name?.trim(),
        description: mealData.description?.trim() || null,
        category: mealData.category || 'snack', // Default to allowed value
        calories: Math.max(0, Math.round(Number(mealData.calories) || 0)),
        protein: Math.max(0, Number(mealData.protein) || 0),
        carbs: Math.max(0, Number(mealData.carbs) || 0),
        fat: Math.max(0, Number(mealData.fat) || 0),
        fiber: mealData.fiber !== null && mealData.fiber !== undefined ? Math.max(0, Number(mealData.fiber)) : null,
        sodium: mealData.sodium !== null && mealData.sodium !== undefined ? Math.max(0, Number(mealData.sodium)) : null,
        sugar: mealData.sugar !== null && mealData.sugar !== undefined ? Math.max(0, Number(mealData.sugar)) : null,
        portion_amount: mealData.portion_amount !== null && mealData.portion_amount !== undefined ? Math.max(0, Number(mealData.portion_amount)) : null,
        portion_unit: mealData.portion_unit?.trim() || null,
        ingredients: mealData.ingredients || null,
        instructions: mealData.instructions?.trim() || null,
        time: mealData.time?.trim() || null,
        image_url: mealData.image_url?.trim() || null,
        created_by: user.id
      }

      // Validação de campos obrigatórios
      if (!sanitizedData.name) {
        throw new Error('Nome do alimento é obrigatório')
      }
      if (sanitizedData.calories <= 0) {
        throw new Error('Calorias devem ser maior que zero')
      }
      if (sanitizedData.protein < 0 || sanitizedData.carbs < 0 || sanitizedData.fat < 0) {
        throw new Error('Valores nutricionais não podem ser negativos')
      }

      console.log('✅ Data validated and sanitized:', sanitizedData)

      // FASE 3: Tentativa de inserção com retry automático
      let attempt = 0
      const maxAttempts = 3
      let lastError: any

      while (attempt < maxAttempts) {
        attempt++
        console.log(`🔄 Insertion attempt ${attempt}/${maxAttempts}`)

        try {
          const { data, error } = await supabase
            .from('meals')
            .insert([sanitizedData])
            .select()
            .single()

          if (error) {
            console.error(`❌ Database error (attempt ${attempt}):`, error)
            lastError = error

            // Se é erro de constraint, não tentar novamente
            if (error.code === '23514' || error.message.includes('check constraint')) {
              throw new Error(`Dados inválidos: ${error.message}`)
            }

            // Para outros erros, tentar novamente após delay
            if (attempt < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
              continue
            }
            throw error
          }

          console.log('✅ Meal created successfully:', data)
          setMeals(prev => [data, ...prev])
          toast({
            title: 'Sucesso',
            description: `Alimento "${data.name}" criado com sucesso!`
          })
          return data

        } catch (error) {
          lastError = error
          if (attempt === maxAttempts) {
            throw error
          }
        }
      }

      throw lastError

    } catch (error: any) {
      console.error('❌ Final error in addMeal:', error)

      // FASE 3: Tratamento específico de erros
      let userMessage = 'Não foi possível criar o alimento'

      if (error.message.includes('not authenticated')) {
        userMessage = 'Sessão expirada. Faça login novamente.'
      } else if (error.message.includes('check constraint')) {
        userMessage = 'Dados inválidos. Verifique as informações e tente novamente.'
      } else if (error.message.includes('duplicate')) {
        userMessage = 'Um alimento com esse nome já existe.'
      } else if (error.message.includes('connection')) {
        userMessage = 'Problema de conexão. Verifique sua internet.'
      } else if (error.message) {
        userMessage = error.message
      }

      toast({
        title: 'Erro ao criar alimento',
        description: userMessage,
        variant: 'destructive'
      })
      throw error
    }
  }

  const updateMeal = async (id: string, updates: Partial<Meal>) => {
    try {
      console.log(`🔄 Updating meal ${id}:`, updates)
      const { error } = await supabase
        .from('meals')
        .update(updates)
        .eq('id', id)

      if (error) {
        console.error('❌ Error updating meal:', error)
        throw error
      }

      console.log('✅ Meal updated successfully')
      setMeals(prev => prev.map(meal =>
        meal.id === id ? { ...meal, ...updates } : meal
      ))
      toast({ title: 'Sucesso', description: 'Refeição atualizada com sucesso' })
    } catch (error: any) {
      console.error('Error updating meal:', error)

      let userMessage = 'Não foi possível atualizar a refeição'
      if (error.message.includes('check constraint')) {
        userMessage = 'Dados inválidos. Verifique as informações.'
      } else if (error.message) {
        userMessage = error.message
      }

      toast({ title: 'Erro', description: userMessage, variant: 'destructive' })
      throw error
    }
  }

  const deleteMeal = async (id: string) => {
    try {
      const { error } = await supabase
        .from('meals')
        .delete()
        .eq('id', id)

      if (error) throw error

      setMeals(prev => prev.filter(meal => meal.id !== id))
      toast({ title: 'Sucesso', description: 'Refeição excluída com sucesso' })
    } catch (error) {
      console.error('Error deleting meal:', error)
      toast({ title: 'Erro', description: 'Não foi possível excluir a refeição', variant: 'destructive' })
      throw error
    }
  }

  const searchMeals = (searchTerm: string) =>
    meals.filter(meal =>
      meal.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

  const getMealsByCategory = (category: string) =>
    meals.filter(meal => meal.category === category)

  useEffect(() => {
    fetchMeals()
  }, [])

  return {
    meals,
    loading,
    addMeal,
    updateMeal,
    deleteMeal,
    searchMeals,
    getMealsByCategory,
    refetch: fetchMeals
  }
}