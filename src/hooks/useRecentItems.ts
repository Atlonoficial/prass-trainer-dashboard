import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface RecentItem {
  id: string
  name: string
  category: 'Alimento' | 'Exercício' | 'Refeição' | 'Fórmula' | 'Treino' | 'Técnica' | 'Plano Nutricional' | 'Cardápio'
  type: 'dieta' | 'treinamento'
  lastUsed: string
  data?: any
}

export function useRecentItems() {
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchRecentItems = async () => {
    setLoading(true)
    try {
      // Fetch from recent_items_history (real usage tracking)
      const { data: historyData, error: historyError } = await supabase
        .from('recent_items_history')
        .select('*')
        .order('used_at', { ascending: false })
        .limit(5)

      if (historyError) throw historyError

      // If history exists, use it
      if (historyData && historyData.length > 0) {
        const formattedItems = historyData.map(item => ({
          id: item.item_id,
          name: item.item_name,
          category: item.item_category as RecentItem['category'],
          type: (item.item_type === 'meal' || item.item_type === 'formula' || item.item_type === 'menu' || item.item_type === 'meal_plan') ? 'dieta' as const : 'treinamento' as const,
          lastUsed: formatRelativeTime(item.used_at),
          data: undefined
        }))

        setRecentItems(formattedItems)
        setLoading(false)
        return
      }

      // Fallback: if no history, fetch from creation dates
      const [mealsResponse, exercisesResponse, nutritionResponse, formulasResponse, menusResponse, techniquesResponse, workoutsResponse] = await Promise.all([
        supabase
          .from('meals')
          .select('id, name, created_at')
          .order('created_at', { ascending: false })
          .limit(1),
        
        supabase
          .from('exercises')
          .select('id, name, created_at')
          .order('created_at', { ascending: false })
          .limit(1),
        
        supabase
          .from('meal_plans')
          .select('id, name, created_at')
          .order('created_at', { ascending: false })
          .limit(1),
        
        supabase
          .from('nutrition_formulas')
          .select('id, name, created_at')
          .order('created_at', { ascending: false })
          .limit(1),

        supabase
          .from('menu_library')
          .select('id, name, created_at')
          .order('created_at', { ascending: false })
          .limit(1),

        supabase
          .from('advanced_techniques')
          .select('id, name, created_at')
          .order('created_at', { ascending: false })
          .limit(1),

        supabase
          .from('workout_plans')
          .select('id, name, created_at')
          .order('created_at', { ascending: false })
          .limit(1)
      ])

      // Combine and format the results
      const allItems: RecentItem[] = []

      // Add meals
      if (mealsResponse.data) {
        mealsResponse.data.forEach(meal => {
          allItems.push({
            id: meal.id,
            name: meal.name,
            category: 'Alimento',
            type: 'dieta',
            lastUsed: meal.created_at
          })
        })
      }

      // Add exercises
      if (exercisesResponse.data) {
        exercisesResponse.data.forEach(exercise => {
          allItems.push({
            id: exercise.id,
            name: exercise.name,
            category: 'Exercício',
            type: 'treinamento',
            lastUsed: exercise.created_at
          })
        })
      }

      // Add nutrition plans
      if (nutritionResponse.data) {
        nutritionResponse.data.forEach(plan => {
          allItems.push({
            id: plan.id,
            name: plan.name,
            category: 'Plano Nutricional',
            type: 'dieta',
            lastUsed: plan.created_at
          })
        })
      }

      // Add nutrition formulas
      if (formulasResponse.data) {
        formulasResponse.data.forEach(formula => {
          allItems.push({
            id: formula.id,
            name: formula.name,
            category: 'Fórmula',
            type: 'dieta',
            lastUsed: formula.created_at
          })
        })
      }

      // Add menus
      if (menusResponse.data) {
        menusResponse.data.forEach(menu => {
          allItems.push({
            id: menu.id,
            name: menu.name,
            category: 'Cardápio',
            type: 'dieta',
            lastUsed: menu.created_at
          })
        })
      }

      // Add techniques
      if (techniquesResponse.data) {
        techniquesResponse.data.forEach(technique => {
          allItems.push({
            id: technique.id,
            name: technique.name,
            category: 'Técnica',
            type: 'treinamento',
            lastUsed: technique.created_at
          })
        })
      }

      // Add workouts
      if (workoutsResponse.data) {
        workoutsResponse.data.forEach(workout => {
          allItems.push({
            id: workout.id,
            name: workout.name,
            category: 'Treino',
            type: 'treinamento',
            lastUsed: workout.created_at
          })
        })
      }

      // Sort by lastUsed and limit to 5 items
      const sortedItems = allItems
        .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
        .slice(0, 5)
        .map(item => ({
          ...item,
          lastUsed: formatRelativeTime(item.lastUsed)
        }))

      setRecentItems(sortedItems)
    } catch (error) {
      console.error('Error fetching recent items:', error)
      toast({ title: 'Erro', description: 'Não foi possível carregar itens recentes', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const formatRelativeTime = (dateString: string): string => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInMilliseconds = now.getTime() - date.getTime()
    
    const diffInMinutes = Math.floor(diffInMilliseconds / (1000 * 60))
    const diffInHours = Math.floor(diffInMilliseconds / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInMilliseconds / (1000 * 60 * 60 * 24))

    if (diffInMinutes < 1) return 'agora'
    if (diffInMinutes < 60) return `${diffInMinutes} min atrás`
    if (diffInHours < 24) return `${diffInHours}h atrás`
    if (diffInDays === 1) return '1 dia atrás'
    if (diffInDays < 7) return `${diffInDays} dias atrás`
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} sem atrás`
    return `${Math.floor(diffInDays / 30)} mês atrás`
  }

  const useItem = async (item: RecentItem, onUse?: (item: RecentItem) => void) => {
    try {
      // Map category to item_type for database
      const itemTypeMap: Record<string, string> = {
        'Alimento': 'meal',
        'Exercício': 'exercise',
        'Refeição': 'meal',
        'Fórmula': 'formula',
        'Treino': 'workout',
        'Técnica': 'technique',
        'Plano Nutricional': 'meal_plan',
        'Cardápio': 'menu'
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast({ title: 'Erro', description: 'Usuário não autenticado', variant: 'destructive' })
        return
      }

      // Save to usage history
      const { error: insertError } = await supabase
        .from('recent_items_history')
        .insert({
          user_id: user.id,
          item_id: item.id,
          item_type: itemTypeMap[item.category] || 'meal',
          item_name: item.name,
          item_category: item.category
        })

      if (insertError) {
        console.error('Error saving to history:', insertError)
      }

      // Execute callback if provided
      if (onUse) {
        onUse(item)
      } else {
        toast({ 
          title: 'Item selecionado', 
          description: `${item.name} foi selecionado com sucesso`,
          duration: 2000
        })
      }

      // Refresh items to show updated usage
      fetchRecentItems()
    } catch (error) {
      console.error('Error using item:', error)
      toast({ title: 'Erro', description: 'Não foi possível usar o item', variant: 'destructive' })
    }
  }

  const addRecentItem = (name: string, category: RecentItem['category'], type: RecentItem['type'], data?: any) => {
    const newItem: RecentItem = {
      id: Date.now().toString(),
      name,
      category,
      type,
      lastUsed: 'agora',
      data
    }

    setRecentItems(prev => {
      // Remove existing item with same name and add to top
      const filtered = prev.filter(item => item.name !== name)
      return [newItem, ...filtered].slice(0, 5)
    })

    // Refresh the list to get updated data from database
    setTimeout(() => {
      fetchRecentItems()
    }, 1000)
  }

  useEffect(() => {
    fetchRecentItems()
  }, [])

  return {
    recentItems,
    loading,
    useItem,
    addRecentItem,
    refetch: fetchRecentItems
  }
}