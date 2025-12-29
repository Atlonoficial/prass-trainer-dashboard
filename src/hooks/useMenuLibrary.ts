import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MenuItem {
  id: string;
  teacher_id: string;
  folder_name: string;
  name: string;
  description?: string;
  file_url?: string;
  file_type: string;
  file_size?: number;
  extracted_text?: string;
  created_at: string;
  updated_at: string;
}

export const useMenuLibrary = () => {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const fetchMenus = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('menu_library')
        .select('*')
        .order('folder_name', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      setMenus(data || []);
      
      // Extract unique folders
      const uniqueFolders = [...new Set(data?.map(item => item.folder_name) || [])];
      setFolders(uniqueFolders);
    } catch (error) {
      console.error('Error fetching menus:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar cardápios",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const uploadPDF = useCallback(async (file: File, folderName: string, menuName: string, description?: string) => {
    try {
      setUploading(true);
      
      // Validate file
      if (!file.type.includes('pdf')) {
        throw new Error('Apenas arquivos PDF são permitidos');
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        throw new Error('Arquivo muito grande. Máximo 10MB');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Upload file to storage
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `${user.id}/${folderName}/${fileName}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('menu-pdfs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('menu-pdfs')
        .getPublicUrl(filePath);

      // Save menu to database
      const { data, error } = await supabase
        .from('menu_library')
        .insert({
          teacher_id: user.id,
          folder_name: folderName,
          name: menuName,
          description,
          file_url: publicUrl,
          file_type: 'pdf',
          file_size: file.size,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Cardápio enviado com sucesso",
      });

      await fetchMenus();
      return data;
    } catch (error) {
      console.error('Error uploading PDF:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao enviar arquivo",
        variant: "destructive",
      });
      throw error;
    } finally {
      setUploading(false);
    }
  }, [toast, fetchMenus]);

  const saveMenu = useCallback(async (menuData: any) => {
    try {
      setUploading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Save menu to database with structured data
      const { data, error } = await supabase
        .from('menu_library')
        .insert({
          teacher_id: user.id,
          folder_name: menuData.folderName,
          name: menuData.name,
          description: menuData.description,
          file_type: 'menu',
          extracted_text: JSON.stringify({
            meals: menuData.meals,
            totals: menuData.totals,
          }),
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Cardápio criado com sucesso",
      });

      await fetchMenus();
      return data;
    } catch (error) {
      console.error('Error saving menu:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao salvar cardápio",
        variant: "destructive",
      });
      throw error;
    } finally {
      setUploading(false);
    }
  }, [toast, fetchMenus]);

  const createFolder = useCallback(async (folderName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Create a placeholder menu for the folder
      const { error } = await supabase
        .from('menu_library')
        .insert({
          teacher_id: user.id,
          folder_name: folderName,
          name: `_folder_${folderName}`,
          description: 'Pasta criada',
          file_type: 'folder',
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Pasta criada com sucesso",
      });

      await fetchMenus();
    } catch (error) {
      console.error('Error creating folder:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar pasta",
        variant: "destructive",
      });
    }
  }, [toast, fetchMenus]);

  const deleteMenu = useCallback(async (id: string) => {
    try {
      const menu = menus.find(m => m.id === id);
      if (!menu) return;

      // Delete file from storage if exists
      if (menu.file_url) {
        const fileName = menu.file_url.split('/').pop();
        if (fileName) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const filePath = `${user.id}/${menu.folder_name}/${fileName}`;
            await supabase.storage
              .from('menu-pdfs')
              .remove([filePath]);
          }
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('menu_library')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Cardápio excluído com sucesso",
      });

      await fetchMenus();
    } catch (error) {
      console.error('Error deleting menu:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir cardápio",
        variant: "destructive",
      });
    }
  }, [menus, toast, fetchMenus]);

  const updateMenu = useCallback(async (id: string, menuData: any) => {
    try {
      // ✅ SEGURANÇA: Construir payload de forma explícita e segura
      const updatePayload: any = {};

      // ✅ Campos obrigatórios
      if (menuData.name) {
        updatePayload.name = menuData.name;
      }

      // ✅ Campos opcionais
      if (menuData.description !== undefined) {
        updatePayload.description = menuData.description;
      }

      // ✅ TRANSFORMAÇÃO 1: folderName → folder_name (snake_case)
      if (menuData.folderName) {
        updatePayload.folder_name = menuData.folderName;
      }

      // ✅ TRANSFORMAÇÃO 2: meals + totals → extracted_text (JSON string)
      if (menuData.meals !== undefined || menuData.totals !== undefined) {
        updatePayload.extracted_text = JSON.stringify({
          meals: menuData.meals || [],
          totals: menuData.totals || {},
        });
      }

      // ✅ SEGURANÇA: Validar que temos algo para atualizar
      if (Object.keys(updatePayload).length === 0) {
        throw new Error('Nenhum dado válido para atualizar');
      }

      console.log('Update payload:', updatePayload); // ✅ Debug log

      const { error } = await supabase
        .from('menu_library')
        .update(updatePayload)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Cardápio atualizado com sucesso",
      });

      await fetchMenus();
    } catch (error) {
      console.error('Error updating menu:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao atualizar cardápio",
        variant: "destructive",
      });
      throw error; // ✅ Propaga erro para debug
    }
  }, [toast, fetchMenus]);

  useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

  return {
    menus,
    folders,
    loading,
    uploading,
    fetchMenus,
    uploadPDF,
    saveMenu,
    createFolder,
    deleteMenu,
    updateMenu,
  };
};