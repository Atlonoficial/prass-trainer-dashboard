import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Order {
  id: string;
  user_id: string;
  instructor_id: string;
  status: 'pending' | 'paid' | 'cancelled' | 'refunded';
  total_amount: number;
  currency: string;
  stripe_session_id?: string;
  stripe_payment_intent_id?: string;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id?: string;
  course_id?: string;
  item_type: 'product' | 'course';
  price: number;
  quantity: number;
  created_at: string;
}

export interface UserPurchase {
  id: string;
  user_id: string;
  product_id?: string;
  course_id?: string;
  order_id: string;
  purchase_type: 'product' | 'course';
  access_granted_at: string;
  access_expires_at?: string;
  created_at: string;
}

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [purchases, setPurchases] = useState<UserPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data || []) as Order[]);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os pedidos',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPurchases = async () => {
    try {
      const { data, error } = await supabase
        .from('user_purchases')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPurchases((data || []) as UserPurchase[]);
    } catch (error) {
      console.error('Error fetching purchases:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as compras',
        variant: 'destructive'
      });
    }
  };

  const createOrder = async (items: Array<{
    product_id?: string;
    course_id?: string;
    item_type: 'product' | 'course';
    price: number;
    quantity?: number;
  }>) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      
      const currentUserId = authData.user?.id;
      if (!currentUserId) {
        throw new Error('Usuário não autenticado');
      }

      // Calculate total amount
      const totalAmount = items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: currentUserId,
          instructor_id: currentUserId, // For now, assuming teacher creates own orders
          total_amount: totalAmount,
          currency: 'BRL',
          status: 'pending'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map(item => ({
        order_id: orderData.id,
        product_id: item.product_id,
        course_id: item.course_id,
        item_type: item.item_type,
        price: item.price,
        quantity: item.quantity || 1
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast({
        title: 'Sucesso',
        description: 'Pedido criado com sucesso'
      });

      await fetchOrders();
      return orderData;
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o pedido',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Status do pedido atualizado'
      });

      await fetchOrders();
      await fetchUserPurchases(); // Refresh purchases in case access was granted
      return data;
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status do pedido',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const checkUserAccess = (productId?: string, courseId?: string): boolean => {
    return purchases.some(purchase => {
      if (productId && purchase.product_id === productId) return true;
      if (courseId && purchase.course_id === courseId) return true;
      return false;
    });
  };

  // Real-time subscription
  useEffect(() => {
    const subscription = supabase
      .channel('orders-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders'
      }, () => {
        fetchOrders();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'order_items'
      }, () => {
        fetchOrders();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_purchases'
      }, () => {
        fetchUserPurchases();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchUserPurchases();
  }, []);

  return {
    orders,
    purchases,
    loading,
    createOrder,
    updateOrderStatus,
    checkUserAccess,
    refetch: () => {
      fetchOrders();
      fetchUserPurchases();
    }
  };
}