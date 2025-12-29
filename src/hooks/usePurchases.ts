import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Purchase {
  id: string;
  user_id: string;
  course_id?: string;
  product_id?: string;
  order_id: string;
  purchase_type: 'course' | 'product';
  access_granted_at: string;
  access_expires_at?: string;
  created_at: string;
}

export interface PurchasedItem {
  id: string;
  type: 'course' | 'product';
  title: string;
  description?: string;
  price: number;
  thumbnail?: string;
  purchase_date: string;
  access_expires_at?: string;
}

export function usePurchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchasedItems, setPurchasedItems] = useState<PurchasedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_purchases')
        .select(`
          *,
          courses (
            id,
            title,
            description,
            price,
            thumbnail,
            is_published
          ),
          products (
            id,
            name,
            description,
            price,
            image_url,
            is_published
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPurchases((data || []) as Purchase[]);

      // Transform purchases into purchased items
      const items: PurchasedItem[] = (data || []).map(purchase => {
        if (purchase.purchase_type === 'course' && purchase.courses) {
          return {
            id: purchase.course_id!,
            type: 'course',
            title: purchase.courses.title,
            description: purchase.courses.description,
            price: purchase.courses.price || 0,
            thumbnail: purchase.courses.thumbnail,
            purchase_date: purchase.created_at,
            access_expires_at: purchase.access_expires_at
          };
        } else if (purchase.purchase_type === 'product' && purchase.products) {
          return {
            id: purchase.product_id!,
            type: 'product',
            title: purchase.products.name,
            description: purchase.products.description,
            price: purchase.products.price,
            thumbnail: purchase.products.image_url,
            purchase_date: purchase.created_at,
            access_expires_at: purchase.access_expires_at
          };
        }
        return null;
      }).filter(Boolean) as PurchasedItem[];

      setPurchasedItems(items);
    } catch (error) {
      console.error('Error fetching purchases:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar suas compras',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const checkPurchase = async (itemId: string, type: 'course' | 'product'): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const column = type === 'course' ? 'course_id' : 'product_id';
      const { data, error } = await supabase
        .from('user_purchases')
        .select('id')
        .eq('user_id', user.id)
        .eq(column, itemId)
        .eq('purchase_type', type)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    } catch (error) {
      console.error('Error checking purchase:', error);
      return false;
    }
  };

  const createPurchase = async (itemId: string, type: 'course' | 'product') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Create order first  
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          instructor_id: user.id,
          total_amount: 0, // Will be updated below
          status: 'completed',
          currency: 'BRL'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Get item price
      let price = 0;
      if (type === 'course') {
        const { data: course } = await supabase
          .from('courses')
          .select('price')
          .eq('id', itemId)
          .single();
        price = course?.price || 0;
      } else {
        const { data: product } = await supabase
          .from('products')
          .select('price')
          .eq('id', itemId)
          .single();
        price = product?.price || 0;
      }

      // Update order total
      await supabase
        .from('orders')
        .update({ total_amount: price })
        .eq('id', order.id);

      // Create purchase record
      const purchaseData = {
        user_id: user.id,
        order_id: order.id,
        purchase_type: type,
        access_granted_at: new Date().toISOString(),
        ...(type === 'course' ? { course_id: itemId } : { product_id: itemId })
      };

      const { data, error } = await supabase
        .from('user_purchases')
        .insert(purchaseData)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: `${type === 'course' ? 'Curso' : 'Produto'} adquirido com sucesso!`
      });

      await fetchPurchases();
      return data;
    } catch (error) {
      console.error('Error creating purchase:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível completar a compra',
        variant: 'destructive'
      });
      throw error;
    }
  };

  // Real-time subscription
  useEffect(() => {
    const subscription = supabase
      .channel('purchases-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_purchases'
      }, () => {
        fetchPurchases();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  useEffect(() => {
    fetchPurchases();
  }, []);

  return {
    purchases,
    purchasedItems,
    loading,
    checkPurchase,
    createPurchase,
    refetch: fetchPurchases
  };
}