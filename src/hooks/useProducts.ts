import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Product {
  id: string;
  instructor_id: string;
  name: string;
  description?: string;
  price: number;
  is_digital: boolean;
  stock?: number;
  category?: string;
  image_url?: string;
  files?: any[];
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts((data || []) as Product[]);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os produtos',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const addProduct = async (productData: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'instructor_id'>) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      
      const currentUserId = authData.user?.id;
      if (!currentUserId) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('products')
        .insert({
          ...productData,
          instructor_id: currentUserId
        })
        .select()
        .single();

      if (error) throw error;
      
      toast({
        title: 'Sucesso',
        description: 'Produto criado com sucesso'
      });
      
      await fetchProducts();
      return data;
    } catch (error) {
      console.error('Error adding product:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o produto',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      toast({
        title: 'Sucesso',
        description: 'Produto atualizado com sucesso'
      });
      
      await fetchProducts();
      return data;
    } catch (error) {
      console.error('Error updating product:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o produto',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: 'Sucesso',
        description: 'Produto removido com sucesso'
      });
      
      await fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o produto',
        variant: 'destructive'
      });
      throw error;
    }
  };

  // Real-time subscription
  useEffect(() => {
    const subscription = supabase
      .channel('products-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'products'
      }, () => {
        fetchProducts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  useEffect(() => {
    fetchProducts();
  }, []);

  return {
    products,
    loading,
    addProduct,
    updateProduct,
    deleteProduct,
    refetch: fetchProducts
  };
}