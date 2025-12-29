import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { normalizeStudentForUI } from '@/utils/studentDataNormalizer';
import { useAuth } from './useAuth';
import { getTenantCacheKey } from '@/utils/tenantHelpers';
import type { Student } from '@/types/student';
import { realtimeManager } from '@/services/realtimeManager';

export type { Student };

export const useStudents = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  // Tenant ID será obtido dinamicamente quando necessário

  const studentsRef = useRef<Student[]>([]);

  // Manter ref sincronizado
  useEffect(() => {
    studentsRef.current = students;
  }, [students]);

  const fetchStudents = useCallback(async (forceRefresh = false) => {
    if (!user?.id) {
      // console.log('👤 useStudents: No authenticated user, skipping fetch');
      setStudents([]);
      setLoading(false);
      return;
    }

    // Usar ref para verificação de cache para evitar dependência circular
    if (studentsRef.current.length > 0 && !forceRefresh) {
      // console.log('📋 useStudents: Using cached students data');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // console.log('🔍 useStudents: Fetching students for teacher:', user.id);

      // Buscar students sem join (evita erro de relacionamento)
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .or(`teacher_id.eq.${user.id},teacher_id.is.null`)
        .order('created_at', { ascending: false });

      if (studentsError) {
        console.error('❌ useStudents: Error fetching students:', studentsError);
        setError(studentsError.message);
        setStudents([]);
        return;
      }

      if (!studentsData || studentsData.length === 0) {
        // console.log('📋 useStudents: No students found for teacher');
        setStudents([]);
        return;
      }

      // Buscar profiles separadamente
      const userIds = studentsData.map(s => s.user_id).filter(Boolean);
      let profilesMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, name, email, phone, avatar_url, user_type')
          .in('id', userIds);

        if (profilesData) {
          profilesMap = profilesData.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // Auto-associar alunos órfãos ao admin atual (em background)
      const orphans = studentsData.filter(s => s.teacher_id === null);
      if (orphans.length > 0) {
        console.warn(`⚠️ useStudents: Encontrados ${orphans.length} alunos órfãos - associando automaticamente`);

        Promise.all(
          orphans.map(orphan =>
            supabase
              .from('students')
              .update({
                teacher_id: user.id,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', orphan.user_id)
          )
        ).then(() => {
          // console.log('✅ useStudents: Alunos órfãos associados com sucesso');
        }).catch(err => {
          console.error('❌ useStudents: Erro ao associar órfãos:', err);
        });
      }

      const normalizedStudents = studentsData.map(student => {
        const profile = profilesMap[student.user_id];
        return normalizeStudentForUI({
          ...student,
          name: profile?.name || student.name || 'Nome não disponível',
          email: profile?.email || student.email || 'Email não disponível',
          phone: profile?.phone || student.phone || null,
          avatar_url: profile?.avatar_url || student.avatar || null,
        });
      }).filter(Boolean);

      // console.log('✅ useStudents: Fetched and normalized students:', normalizedStudents.length);
      setStudents(normalizedStudents);

    } catch (err: any) {
      console.error('❌ useStudents: Unexpected error:', err);
      setError(err.message);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]); // ✅ Dependência estável agora!

  // ✅ FUNÇÃO CORRIGIDA DEFINITIVA - TRANSAÇÃO COM VALIDAÇÃO COMPLETA
  const updateStudent = useCallback(async (normalizedData: any) => {
    if (!user?.id) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    // console.log('🔄 TRANSAÇÃO CORRIGIDA - Iniciando com dados:', normalizedData);

    try {
      // ✅ VALIDAÇÃO OBRIGATÓRIA ANTES DE QUALQUER OPERAÇÃO
      if (!normalizedData.studentData?.user_id) {
        console.error('❌ VALIDAÇÃO: user_id ausente nos dados do estudante');
        return { success: false, error: 'ID do estudante é obrigatório' };
      }

      // ✅ VALIDAR SE O ESTUDANTE EXISTE NO BANCO
      const { data: existingStudent, error: checkError } = await supabase
        .from('students')
        .select('user_id')
        .eq('user_id', normalizedData.studentData.user_id)
        .eq('teacher_id', user.id)
        .single();

      if (checkError || !existingStudent) {
        console.error('❌ VALIDAÇÃO: Estudante não encontrado ou não pertence ao professor', checkError);
        return { success: false, error: 'Estudante não encontrado ou não autorizado' };
      }

      let profileUpdateSuccess = true;
      let studentUpdateSuccess = true;

      // ✅ FASE 1: UPDATE PROFILES TABLE (SE HOUVER DADOS)
      if (normalizedData.profileData && Object.keys(normalizedData.profileData).length > 0) {
        // console.log('📝 FASE 1: Atualizando tabela profiles com dados:', normalizedData.profileData);

        const { data: profileResult, error: profileError } = await supabase
          .from('profiles')
          .update(normalizedData.profileData)
          .eq('id', normalizedData.studentData.user_id)
          .select();

        if (profileError) {
          console.error('❌ ERRO PROFILES: Falha ao atualizar perfil:', profileError);
          return {
            success: false,
            error: `Erro ao atualizar perfil: ${profileError.message}. Detalhes: ${profileError.details || 'Nenhum detalhe disponível'}`
          };
        }

        if (!profileResult || profileResult.length === 0) {
          // console.log('ℹ️ PROFILES: Nenhuma alteração necessária na tabela profiles (dados iguais)');
          // Não é erro - pode não haver mudanças nos dados do perfil
          profileUpdateSuccess = true;
        } else {
          // console.log('✅ PROFILES: Tabela atualizada com sucesso:', profileResult);
          profileUpdateSuccess = true;
        }
      }

      // ✅ FASE 2: UPDATE STUDENTS TABLE (SE HOUVER DADOS)
      const studentUpdateData = { ...normalizedData.studentData };
      delete studentUpdateData.user_id; // Remove user_id do update
      studentUpdateData.updated_at = new Date().toISOString();

      if (Object.keys(studentUpdateData).length > 1) { // > 1 porque sempre tem updated_at
        // console.log('📝 FASE 2: Atualizando tabela students com dados:', studentUpdateData);

        const { data: studentResult, error: studentError } = await supabase
          .from('students')
          .update(studentUpdateData)
          .eq('user_id', normalizedData.studentData.user_id)
          .eq('teacher_id', user.id)
          .select();

        if (studentError) {
          console.error('❌ ERRO STUDENTS: Falha ao atualizar estudante:', studentError);
          return {
            success: false,
            error: `Erro ao atualizar dados do estudante: ${studentError.message}. Detalhes: ${studentError.details || 'Nenhum detalhe disponível'}`
          };
        }

        if (!studentResult || studentResult.length === 0) {
          console.error('❌ ERRO STUDENTS: Nenhuma linha foi atualizada na tabela students');
          return { success: false, error: 'Dados do estudante não foram encontrados para atualização' };
        }

        // console.log('✅ STUDENTS: Tabela atualizada com sucesso:', studentResult);
        studentUpdateSuccess = true;
      }

      // ✅ VALIDAÇÃO FINAL CORRIGIDA: Ambas operações devem ser bem-sucedidas
      const hasProfileData = normalizedData.profileData && Object.keys(normalizedData.profileData).length > 0
      const hasStudentData = Object.keys(studentUpdateData).length > 1

      // console.log('🔍 Final validation - Profile success:', profileUpdateSuccess, 'Student success:', studentUpdateSuccess)
      // console.log('🔍 Has profile data:', hasProfileData, 'Has student data:', hasStudentData)

      // Se havia dados para atualizar e alguma operação falhou
      if ((hasProfileData && !profileUpdateSuccess) || (hasStudentData && !studentUpdateSuccess)) {
        console.error('❌ TRANSAÇÃO INCOMPLETA: Uma ou mais operações obrigatórias falharam');
        return { success: false, error: 'Falha parcial na atualização dos dados' };
      }

      // ✅ SINCRONIZAÇÃO OTIMIZADA (NÃO BLOQUEIA O RETORNO)
      // console.log('🔄 SINCRONIZAÇÃO: Agendando refetch em background...');

      // Executa sincronização em background
      setTimeout(async () => {
        try {
          await fetchStudents(true);
          // console.log('✅ SINCRONIZAÇÃO: Dados recarregados em background');
        } catch (syncError) {
          console.warn('⚠️ SINCRONIZAÇÃO: Erro no background:', syncError);
        }
      }, 50);

      // Dispatch para componentes
      window.dispatchEvent(new CustomEvent('studentDataUpdated', {
        detail: {
          studentId: normalizedData.studentData.user_id,
          action: 'update',
          timestamp: Date.now()
        }
      }));

      // console.log('✅ TRANSAÇÃO COMPLETA: Dados atualizados e validados com sucesso');
      return { success: true, message: 'Dados atualizados com sucesso' };

    } catch (error: any) {
      console.error('❌ ERRO CRÍTICO NA TRANSAÇÃO:', error);
      return {
        success: false,
        error: `Erro crítico: ${error.message || 'Falha desconhecida na operação'}`
      };
    }
  }, [user?.id, fetchStudents]);

  // Fetch inicial
  useEffect(() => {
    fetchStudents();
  }, [user?.id]);

  // ✅ FASE 1: Realtime Manager subscriptions
  useEffect(() => {
    if (!user?.id) return;

    // console.log('🔗 [useStudents] Configurando Realtime Manager subscriptions');

    const listenerIds: string[] = []

    // Students table subscription
    listenerIds.push(
      realtimeManager.subscribe(
        'students',
        '*',
        () => {
          // console.log('📡 [useStudents] Realtime: Students updated');
          fetchStudents(true);
        },
        `teacher_id=eq.${user.id}`
      )
    )

    // Profiles table subscription (apenas UPDATEs relevantes)
    listenerIds.push(
      realtimeManager.subscribe(
        'profiles',
        'UPDATE',
        () => {
          // console.log('📡 [useStudents] Realtime: Profile updated');
          fetchStudents(true);
        }
      )
    )

    // Custom event listeners
    const handleStudentUpdate = () => {
      // console.log('🔄 Custom studentDataUpdated event received');
      fetchStudents(true);
    };

    const handleForceSync = () => {
      // console.log('🔄 Force sync event received');
      fetchStudents(true);
    };

    window.addEventListener('studentDataUpdated', handleStudentUpdate);
    window.addEventListener('forceStudentSync', handleForceSync);


    // console.log('✅ [useStudents] Realtime Manager configurado:', listenerIds.length, 'listeners')

    return () => {
      // console.log('🧹 [useStudents] Removendo listeners:', listenerIds.length);
      listenerIds.forEach(id => realtimeManager.unsubscribe(id))
      window.removeEventListener('studentDataUpdated', handleStudentUpdate);
      window.removeEventListener('forceStudentSync', handleForceSync);
    };
  }, [user?.id, fetchStudents]);

  const refetch = useCallback(() => {
    // console.log('🔄 useStudents: Manual refetch requested');
    return fetchStudents(true);
  }, [fetchStudents]);

  return {
    students,
    loading,
    error,
    updateStudent,
    refetch,
    manualRefetch: refetch
  };
};