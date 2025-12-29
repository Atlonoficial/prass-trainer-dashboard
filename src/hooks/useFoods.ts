import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { supabaseShapePro } from '@/integrations/supabase/shapeProClient'
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
      console.log('🔄 Fetching foods from Shape Pro...')
      setLoading(true)

      // Tentar diferentes nomes de tabela no Shape Pro
      const tableNames = ['meals', 'foods', 'alimentos', 'food_items', 'nutrition_foods']
      let shapeProData: any[] | null = null
      let successfulTable = ''

      for (const tableName of tableNames) {
        const { data, error } = await supabaseShapePro
          .from(tableName)
          .select('*')
          .order('name', { ascending: true })

        if (!error && data && data.length > 0) {
          console.log(`✅ Found ${data.length} items in table "${tableName}" from Shape Pro`)
          shapeProData = data
          successfulTable = tableName
          break
        } else {
          console.log(`⏭️ Table "${tableName}" not found or empty in Shape Pro`)
        }
      }

      if (shapeProData && shapeProData.length > 0) {
        // Mapear dados do Shape Pro
        const mapped = shapeProData.map((f: any) => ({
          id: f.id,
          name: f.name,
          category: f.category,
          calories_per_100g: f.calories_per_100g || f.calories || f.cal,
          proteins_per_100g: f.proteins_per_100g || f.protein || f.prot,
          carbs_per_100g: f.carbs_per_100g || f.carbs || f.carb,
          fats_per_100g: f.fats_per_100g || f.fat || f.fats,
          fiber_per_100g: f.fiber_per_100g || f.fiber,
          sodium_per_100g: f.sodium_per_100g || f.sodium,
          created_at: f.created_at,
          updated_at: f.updated_at,
        })) as Food[]

        console.log(`✅ Fetched ${mapped.length} foods from Shape Pro (table: ${successfulTable})`)
        setFoods(mapped)
        return
      }

      console.warn('⚠️ No foods found in Shape Pro, falling back to local')
      // Fallback: tentar buscar do projeto local (meals)
      const { data: localData, error: localError } = await supabase
        .from('meals')
        .select('*')
        .order('name', { ascending: true })

      if (localError) throw localError

      const mapped = (localData || []).map((m: any) => ({
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

      console.log(`✅ Fetched ${mapped.length} foods from local`)
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
