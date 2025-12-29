import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Meal } from '@/services/mealPlansService';

interface MenuLibraryItem {
  id: string;
  name: string;
  description: string | null;
  folder_name: string | null;
  file_type: string;
  extracted_text: any;
  created_at: string;
}

export const useMenuImport = () => {
  const [menus, setMenus] = useState<MenuLibraryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMenus = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('menu_library')
        .select('*')
        .eq('file_type', 'menu')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMenus(data || []);
    } catch (error) {
      console.error('Erro ao buscar cardápios:', error);
    } finally {
      setLoading(false);
    }
  };

  const convertMenuToMeals = (menuData: any): Meal[] => {
    try {
      if (!menuData || !menuData.meals) return [];

      return menuData.meals.map((meal: any) => ({
        id: `meal_${Date.now()}_${Math.random()}`,
        name: meal.name || '',
        time: meal.time || '08:00',
        type: meal.type || 'breakfast',
        foods: (meal.foods || []).map((food: any) => ({
          id: `food_${Date.now()}_${Math.random()}`,
          name: food.name || '',
          quantity: food.quantity || 100,
          unit: food.unit || 'g',
          calories: food.calories || 0,
          protein: food.protein || 0,
          carbs: food.carbs || 0,
          fat: food.fat || 0
        }))
      }));
    } catch (error) {
      console.error('Erro ao converter cardápio:', error);
      return [];
    }
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  return {
    menus,
    loading,
    refetch: fetchMenus,
    convertMenuToMeals
  };
};
