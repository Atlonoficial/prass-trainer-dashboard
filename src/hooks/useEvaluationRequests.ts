import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from './useSupabaseAuth';
import { toast } from 'sonner';

export interface EvaluationRequest {
  id: string;
  template_id: string;
  teacher_id: string;
  student_id: string;
  status: string;
  due_date?: string;
  message?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  evaluation_id?: string;
  template?: {
    name: string;
    description?: string;
  };
  student?: {
    name: string;
    email: string;
  };
}

export interface CreateEvaluationRequestData {
  template_id: string;
  student_id: string;
  due_date?: string;
  message?: string;
}

export function useEvaluationRequests(studentId?: string) {
  const [requests, setRequests] = useState<EvaluationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useSupabaseAuth();

  const fetchRequests = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from('evaluation_requests')
        .select(`
          *,
          template:evaluation_templates(name, description)
        `);

      if (studentId) {
        query = query.eq('student_id', studentId);
      } else {
        // If no studentId specified, get requests where user is teacher or student
        query = query.or(`teacher_id.eq.${user.id},student_id.eq.${user.id}`);
      }

      const { data: requestsData, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch student profiles separately if needed
      const requestsWithStudents = await Promise.all(
        (requestsData || []).map(async (request: any) => {
          const { data: studentData } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', request.student_id)
            .single();

          return {
            ...request,
            student: studentData || { name: 'Usuário', email: '' }
          };
        })
      );

      setRequests(requestsWithStudents);
    } catch (error) {
      console.error('Error fetching evaluation requests:', error);
      toast.error('Erro ao carregar solicitações de avaliação');
    } finally {
      setLoading(false);
    }
  };

  const createRequest = async (requestData: CreateEvaluationRequestData) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('evaluation_requests')
        .insert({
          ...requestData,
          teacher_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Send notification to student
      await supabase.from('notifications').insert({
        title: 'Nova Solicitação de Avaliação',
        message: requestData.message || 'Você tem uma nova avaliação para preencher',
        type: 'evaluation_request',
        target_users: [requestData.student_id],
        data: {
          evaluation_request_id: data.id,
          template_id: requestData.template_id
        }
      });

      toast.success('Solicitação de avaliação enviada com sucesso');
      await fetchRequests();
      return data;
    } catch (error) {
      console.error('Error creating evaluation request:', error);
      toast.error('Erro ao criar solicitação de avaliação');
      throw error;
    }
  };

  const completeRequest = async (requestId: string, evaluationId: string) => {
    try {
      const { error } = await supabase
        .from('evaluation_requests')
        .update({
          status: 'completed',
          evaluation_id: evaluationId,
          completed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      await fetchRequests();
      toast.success('Avaliação enviada com sucesso');
    } catch (error) {
      console.error('Error completing evaluation request:', error);
      toast.error('Erro ao enviar avaliação');
      throw error;
    }
  };

  const getRequestById = (id: string) => {
    return requests.find(request => request.id === id);
  };

  const getPendingRequests = () => {
    return requests.filter(request => request.status === 'pending');
  };

  useEffect(() => {
    if (user) {
      fetchRequests();

      // Set up real-time listener
      const channel = supabase
        .channel('evaluation_requests_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'evaluation_requests'
          },
          () => {
            fetchRequests();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id, studentId]);

  return {
    requests,
    loading,
    createRequest,
    completeRequest,
    getRequestById,
    getPendingRequests,
    refetch: fetchRequests
  };
}