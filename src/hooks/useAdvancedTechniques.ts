import { useEffect, useState, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export interface AdvancedTechnique {
  id: string
  name: string
  description: string
  category: 'Intensidade' | 'Volume' | 'Tempo' | 'Método'
  difficulty: 'Iniciante' | 'Intermediário' | 'Avançado'
  muscles?: string[]
  instructions?: string
  examples?: string[]
  video_url?: string
  image_url?: string
  created_by?: string
  created_at: string
  updated_at?: string
}

export function useAdvancedTechniques() {
  const [techniques, setTechniques] = useState<AdvancedTechnique[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const { user } = useAuth()

  const defaultTechniques: AdvancedTechnique[] = [
    {
      id: '1',
      name: 'Drop Set',
      description: 'Redução progressiva da carga sem descanso entre as séries',
      category: 'Intensidade',
      difficulty: 'Intermediário',
      muscles: ['Todos'],
      instructions: 'Execute o exercício até a falha, reduza o peso em 20-30% e continue sem descanso',
      examples: ['Supino: 100kg x 8 → 80kg x 6 → 60kg x 4'],
      created_at: new Date().toISOString()
    },
    {
      id: '2', 
      name: 'Rest-Pause',
      description: 'Pequenas pausas durante a série para conseguir mais repetições',
      category: 'Intensidade',
      difficulty: 'Avançado',
      muscles: ['Todos'],
      instructions: 'Execute até a falha, descanse 10-15 segundos e continue até a próxima falha',
      examples: ['Rosca bíceps: 8 reps → pausa 15s → 3 reps → pausa 15s → 2 reps'],
      created_at: new Date().toISOString()
    },
    {
      id: '3',
      name: 'Super Set',
      description: 'Dois exercícios executados em sequência sem descanso',
      category: 'Volume',
      difficulty: 'Iniciante',
      muscles: ['Variados'],
      instructions: 'Execute o primeiro exercício, imediatamente execute o segundo, depois descanse',
      examples: ['Supino + Crucifixo', 'Rosca bíceps + Tríceps testa'],
      created_at: new Date().toISOString()
    },
    {
      id: '4',
      name: 'Tri-Set',
      description: 'Três exercícios executados em sequência sem descanso',
      category: 'Volume',
      difficulty: 'Intermediário',
      muscles: ['Variados'],
      instructions: 'Execute três exercícios consecutivos sem descanso entre eles',
      examples: ['Agachamento + Leg Press + Cadeira extensora'],
      created_at: new Date().toISOString()
    },
    {
      id: '5',
      name: 'Tempo Sob Tensão',
      description: 'Controle da velocidade de execução para maior estímulo',
      category: 'Tempo',
      difficulty: 'Iniciante',
      muscles: ['Todos'],
      instructions: 'Controle a fase excêntrica (descida) em 3-4 segundos',
      examples: ['Agachamento: 3s descida, 1s subida', 'Supino: 4s descida, explosivo subida'],
      created_at: new Date().toISOString()
    },
    {
      id: '6',
      name: 'Cluster Set',
      description: 'Divisão da série em mini-séries com micro-descansos',
      category: 'Método',
      difficulty: 'Avançado',
      muscles: ['Todos'],
      instructions: 'Divida uma série de 12 reps em 3x4 com 15s entre cada cluster',
      examples: ['4 reps → 15s → 4 reps → 15s → 4 reps → descanso completo'],
      created_at: new Date().toISOString()
    }
  ]

  const fetchTechniques = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true)
      
      // Buscar técnicas do banco de dados
      const { data, error } = await supabase
        .from('advanced_techniques')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // Type assertion para garantir que os dados do Supabase correspondem à interface
        const formattedData = data.map(item => ({
          ...item,
          category: item.category as AdvancedTechnique['category'],
          difficulty: item.difficulty as AdvancedTechnique['difficulty']
        }));
        setTechniques(formattedData);
      } else {
        // Se não há técnicas no banco, criar as padrões
        console.log('🔄 Migrando técnicas padrões para o banco...');
        await migrateDefaultTechniques();
      }
    } catch (error) {
      console.error('Error fetching techniques:', error)
      toast({ title: 'Erro', description: 'Não foi possível carregar as técnicas', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [user])

  const migrateDefaultTechniques = async () => {
    if (!user) return;

    try {
      const techniquesToInsert = defaultTechniques.map(tech => ({
        name: tech.name,
        description: tech.description,
        category: tech.category,
        difficulty: tech.difficulty,
        muscles: tech.muscles || [],
        instructions: tech.instructions,
        examples: tech.examples || [],
        created_by: user.id
      }));

      const { data, error } = await supabase
        .from('advanced_techniques')
        .insert(techniquesToInsert)
        .select();

      if (error) throw error;

      if (data) {
        const formattedData = data.map(item => ({
          ...item,
          category: item.category as AdvancedTechnique['category'],
          difficulty: item.difficulty as AdvancedTechnique['difficulty']
        }));
        setTechniques(formattedData);
        console.log('✅ Técnicas padrões migradas com sucesso');
        
        // Limpar localStorage após migração
        localStorage.removeItem('advanced-techniques');
      }
    } catch (error) {
      console.error('Error migrating default techniques:', error);
      // Fallback para localStorage se houver erro
      const stored = localStorage.getItem('advanced-techniques');
      if (stored) {
        setTechniques(JSON.parse(stored));
      }
    }
  }

  const addTechnique = useCallback(async (techniqueData: Omit<AdvancedTechnique, 'id' | 'created_at' | 'created_by' | 'updated_at'>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('advanced_techniques')
        .insert({
          ...techniqueData,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      setTechniques(prev => [data as AdvancedTechnique, ...prev]);
      toast({ title: 'Sucesso', description: 'Técnica criada com sucesso' });
      return data;
    } catch (error) {
      console.error('Error adding technique:', error)
      toast({ title: 'Erro', description: 'Não foi possível criar a técnica', variant: 'destructive' })
      throw error
    }
  }, [user, toast])

  const updateTechnique = useCallback(async (id: string, updates: Partial<AdvancedTechnique>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('advanced_techniques')
        .update(updates)
        .eq('id', id)
        .eq('created_by', user.id)
        .select()
        .single();

      if (error) throw error;

      setTechniques(prev => prev.map(tech => tech.id === id ? data as AdvancedTechnique : tech));
      toast({ title: 'Sucesso', description: 'Técnica atualizada com sucesso' });
      return data;
    } catch (error) {
      console.error('Error updating technique:', error)
      toast({ title: 'Erro', description: 'Não foi possível atualizar a técnica', variant: 'destructive' })
      throw error
    }
  }, [user, toast])

  const deleteTechnique = useCallback(async (id: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('advanced_techniques')
        .delete()
        .eq('id', id)
        .eq('created_by', user.id);

      if (error) throw error;

      setTechniques(prev => prev.filter(tech => tech.id !== id));
      toast({ title: 'Sucesso', description: 'Técnica excluída com sucesso' });
    } catch (error) {
      console.error('Error deleting technique:', error)
      toast({ title: 'Erro', description: 'Não foi possível excluir a técnica', variant: 'destructive' })
      throw error
    }
  }, [user, toast])

  const searchTechniques = useCallback((searchTerm: string) => {
    if (!searchTerm.trim()) return techniques;
    
    const searchLower = searchTerm.toLowerCase();
    return techniques.filter(technique =>
      technique.name.toLowerCase().includes(searchLower) ||
      technique.description.toLowerCase().includes(searchLower) ||
      (technique.instructions && technique.instructions.toLowerCase().includes(searchLower))
    );
  }, [techniques])

  const getTechniquesByCategory = useCallback((category: string) => {
    if (!category) return techniques;
    return techniques.filter(technique => technique.category === category);
  }, [techniques])

  const getTechniquesByDifficulty = useCallback((difficulty: string) => {
    if (!difficulty) return techniques;
    return techniques.filter(technique => technique.difficulty === difficulty);
  }, [techniques])

  useEffect(() => {
    fetchTechniques()
  }, [fetchTechniques])

  return {
    techniques,
    loading,
    addTechnique,
    updateTechnique,
    deleteTechnique,
    searchTechniques,
    getTechniquesByCategory,
    getTechniquesByDifficulty,
    refetch: fetchTechniques
  }
}