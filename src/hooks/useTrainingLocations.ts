import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface TrainingLocation {
  id: string;
  teacher_id: string;
  name: string;
  type: 'gym' | 'studio' | 'outdoor' | 'online' | 'home';
  address?: string;
  description?: string;
  google_maps_link?: string;
  is_active: boolean;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export const useTrainingLocations = () => {
  const [locations, setLocations] = useState<TrainingLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchLocations = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('training_locations')
        .select('*')
        .order('name');

      if (error) throw error;
      setLocations((data || []) as TrainingLocation[]);
    } catch (error) {
      console.error('Error fetching training locations:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar locais de treino",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createLocation = async (locationData: Omit<TrainingLocation, 'id' | 'teacher_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('training_locations')
        .insert({
          ...locationData,
          teacher_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setLocations(prev => [...prev, data as TrainingLocation]);
      toast({
        title: "Sucesso",
        description: "Local de treino criado com sucesso",
      });
      
      return data;
    } catch (error) {
      console.error('Error creating training location:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar local de treino",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateLocation = async (id: string, updates: Partial<TrainingLocation>) => {
    try {
      const { data, error } = await supabase
        .from('training_locations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setLocations(prev => 
        prev.map(location => 
          location.id === id ? { ...location, ...data as TrainingLocation } : location
        )
      );

      toast({
        title: "Sucesso",
        description: "Local de treino atualizado com sucesso",
      });
      
      return data;
    } catch (error) {
      console.error('Error updating training location:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar local de treino",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteLocation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('training_locations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setLocations(prev => prev.filter(location => location.id !== id));
      toast({
        title: "Sucesso",
        description: "Local de treino removido com sucesso",
      });
    } catch (error) {
      console.error('Error deleting training location:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover local de treino",
        variant: "destructive",
      });
      throw error;
    }
  };

  const toggleLocationStatus = async (id: string, isActive: boolean) => {
    return updateLocation(id, { is_active: isActive });
  };

  useEffect(() => {
    fetchLocations();
  }, [user]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`training_locations_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'training_locations',
          filter: `teacher_id=eq.${user.id}`,
        },
        () => {
          fetchLocations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    locations,
    loading,
    createLocation,
    updateLocation,
    deleteLocation,
    toggleLocationStatus,
    refetch: fetchLocations,
  };
};