import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CourseMaterial {
  id: string;
  course_id: string;
  name: string;
  description?: string;
  file_url: string;
  file_size?: number;
  file_type: string;
  order_index: number;
  is_downloadable: boolean;
  created_at: string;
  updated_at: string;
}

export function useCourseMaterials(courseId?: string) {
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchMaterials = async () => {
    if (!courseId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('course_materials')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setMaterials(data || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
      toast({
        title: "Erro ao carregar materiais",
        description: "Não foi possível carregar os materiais do curso.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadMaterial = async (file: File, description?: string): Promise<CourseMaterial | null> => {
    if (!courseId) return null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create file path with user ID for RLS
      const filePath = `${user.id}/${courseId}/${Date.now()}_${file.name}`;

      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('course-materials')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('course-materials')
        .getPublicUrl(filePath);

      // Get next order index
      const maxOrder = materials.length > 0 ? Math.max(...materials.map(m => m.order_index)) : -1;

      // Save material metadata to database
      const { data: materialData, error: dbError } = await supabase
        .from('course_materials')
        .insert({
          course_id: courseId,
          name: file.name,
          description,
          file_url: publicUrl,
          file_size: file.size,
          file_type: file.type || 'application/octet-stream',
          order_index: maxOrder + 1,
          is_downloadable: true
        })
        .select()
        .single();

      if (dbError) throw dbError;

      toast({
        title: "Material enviado com sucesso!",
        description: `${file.name} foi adicionado ao curso.`,
      });

      // Refresh materials list
      await fetchMaterials();
      return materialData;
    } catch (error) {
      console.error('Error uploading material:', error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível enviar o arquivo. Tente novamente.",
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteMaterial = async (materialId: string) => {
    try {
      const material = materials.find(m => m.id === materialId);
      if (!material) return;

      // Extract file path from URL
      const url = new URL(material.file_url);
      const filePath = url.pathname.split('/').slice(-3).join('/'); // Get last 3 parts: userId/courseId/filename

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('course-materials')
        .remove([filePath]);

      if (storageError) console.warn('Storage deletion error:', storageError);

      // Delete from database
      const { error: dbError } = await supabase
        .from('course_materials')
        .delete()
        .eq('id', materialId);

      if (dbError) throw dbError;

      toast({
        title: "Material removido",
        description: "O material foi removido do curso.",
      });

      // Refresh materials list
      await fetchMaterials();
    } catch (error) {
      console.error('Error deleting material:', error);
      toast({
        title: "Erro ao remover material",
        description: "Não foi possível remover o material. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const updateMaterial = async (materialId: string, updates: Partial<CourseMaterial>) => {
    try {
      const { error } = await supabase
        .from('course_materials')
        .update(updates)
        .eq('id', materialId);

      if (error) throw error;

      toast({
        title: "Material atualizado",
        description: "As informações do material foram atualizadas.",
      });

      // Refresh materials list
      await fetchMaterials();
    } catch (error) {
      console.error('Error updating material:', error);
      toast({
        title: "Erro ao atualizar material",
        description: "Não foi possível atualizar o material. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, [courseId]);

  // Set up real-time subscription
  useEffect(() => {
    if (!courseId) return;

    const channel = supabase
      .channel('course-materials-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'course_materials',
          filter: `course_id=eq.${courseId}`
        },
        () => {
          fetchMaterials();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [courseId]);

  return {
    materials,
    loading,
    uploadMaterial,
    deleteMaterial,
    updateMaterial,
    refetch: fetchMaterials
  };
}