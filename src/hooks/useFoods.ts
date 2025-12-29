import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface Food {
  id: string
  name: string
  category?: string | null
  calories_per_100g?: number | null
  proteins_per_100g?: number | null
  carbs_per_100g?: number | null
  fats_per_100g?: number | null
  fiber_per_100g?: number | null
  sodium_per_100g?: number | null
  created_at?: string | null
  updated_at?: string | null
}

export function useFoods() {
  const [foods, setFoods] = useState<Food[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchFoods = async () => {
    try {
      console.log('🔄 Fetching foods...')
      setLoading(true)

      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error

      const mapped = (data || []).map((m: any) => ({
        id: m.id,
        name: m.name,
        category: m.category,
        calories_per_100g: m.calories,
        proteins_per_100g: m.protein,
        carbs_per_100g: m.carbs,
        fats_per_100g: m.fat,
        fiber_per_100g: m.fiber,
        sodium_per_100g: m.sodium,
        created_at: m.created_at,
        updated_at: m.created_at,
      })) as Food[]

      console.log(`✅ Fetched ${mapped.length} foods`)
      setFoods(mapped)
    } catch (error) {
      console.error('Error fetching foods:', error)
      toast({ title: 'Erro', description: 'Não foi possível carregar os alimentos', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const addFood = async (_foodData: Omit<Food, 'id' | 'created_at' | 'updated_at'>) => {
    toast({ title: 'Indisponível', description: 'Catálogo de alimentos é somente leitura no momento' })
  }

  const updateFood = async (_id: string, _updates: Partial<Food>) => {
    toast({ title: 'Indisponível', description: 'Catálogo de alimentos é somente leitura no momento' })
  }

  const deleteFood = async (_id: string) => {
    toast({ title: 'Indisponível', description: 'Catálogo de alimentos é somente leitura no momento' })
  }

  const getFoodsByCategory = (category: string) => foods.filter((f) => f.category === category)
  const searchFoods = (searchTerm: string) => foods.filter((f) => f.name.toLowerCase().includes(searchTerm.toLowerCase()))

  useEffect(() => { fetchFoods() }, [])

  return { foods, loading, addFood, updateFood, deleteFood, getFoodsByCategory, searchFoods, refetch: fetchFoods }
}
