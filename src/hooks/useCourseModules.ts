import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { queryWithTimeout } from '@/utils/supabaseTimeout';

// ✅ Funções puras fora do hook - não causam re-renders
const saveCacheToStorage = (courseId: string, data: CourseModule[]) => {
  try {
    localStorage.setItem(
      `course_modules_${courseId}`,
      JSON.stringify({ data, timestamp: Date.now() })
    );
    console.log('💾 [saveCacheToStorage] Cache saved to localStorage');
  } catch (e) {
    console.warn('⚠️ [saveCacheToStorage] Failed to save cache:', e);
  }
};

const loadCacheFromStorage = (courseId: string): CourseModule[] | null => {
  const LOCALSTORAGE_CACHE_DURATION = 300000; // 5 minutos
  try {
    const cached = localStorage.getItem(`course_modules_${courseId}`);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < LOCALSTORAGE_CACHE_DURATION) {
        console.log('💾 [loadCacheFromStorage] Using localStorage cache');
        return data;
      }
    }
  } catch (e) {
    console.warn('⚠️ [loadCacheFromStorage] Failed to load cache:', e);
  }
  return null;
};

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  order_index: number;
  is_published: boolean;
  release_mode: 'immediate' | 'days_after_enrollment';
  release_after_days?: number;
  cover_image_url?: string;
  created_at: string;
  updated_at: string;
  lessons?: CourseLesson[];
}

export interface CourseLesson {
  id: string;
  module_id: string;
  title: string;
  description?: string;
  storage_path?: string;
  video_url?: string;
  video_uploaded: boolean;
  video_duration_minutes: number;
  content?: string;
  attachments?: any[];
  order_index: number;
  is_free: boolean;
  is_published: boolean;
  release_mode: 'immediate' | 'days_after_enrollment';
  release_after_days?: number;
  enable_support_button?: boolean;
  created_at: string;
  updated_at: string;
}

export function useCourseModules(courseId?: string) {
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const debounceRef = useRef<NodeJS.Timeout>();
  const lastFetchRef = useRef<number>(0);
  const cacheRef = useRef<{ courseId: string, data: CourseModule[], timestamp: number } | null>(null);
  const fetchModulesRef = useRef<(force?: boolean) => Promise<void>>(async () => { }); // ✅ Ref para evitar loops
  const CACHE_DURATION = 30000; // 30 segundos

  const fetchModules = useCallback(async (force = false) => {
    if (!courseId) {
      setLoading(false);
      return;
    }

    // Verificar cache em memória primeiro
    if (!force && cacheRef.current &&
      cacheRef.current.courseId === courseId &&
      Date.now() - cacheRef.current.timestamp < CACHE_DURATION) {
      console.log('💾 [fetchModules] Using memory cache');
      setModules(cacheRef.current.data);
      setLoading(false);
      return;
    }

    // Verificar cache localStorage como fallback
    if (!force) {
      const localStorageCache = loadCacheFromStorage(courseId);
      if (localStorageCache) {
        setModules(localStorageCache);
        setLoading(false);
        // Atualizar cache em memória
        cacheRef.current = {
          courseId,
          data: localStorageCache,
          timestamp: Date.now()
        };
        return;
      }
    }

    const now = Date.now();
    // Debounce mais agressivo para evitar loops
    if (!force && now - lastFetchRef.current < 2000) {
      console.log('🚫 [fetchModules] Skipping due to debounce');
      return;
    }
    lastFetchRef.current = now;

    try {
      console.log('🔄 [fetchModules] Starting fetch for courseId:', courseId);
      // ✅ Verificar isInitialLoad usando modules.length diretamente (closure) sem estar nas deps
      const isInitialLoad = modules.length === 0;

      // Limpar erro anterior
      setError(null);

      if (isInitialLoad) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      // Validar se o curso existe e está publicado
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('id, is_published, title')
        .eq('id', courseId)
        .single();

      if (courseError) {
        console.error('❌ [fetchModules] Course not found:', courseError);
        throw new Error('Curso não encontrado');
      }

      if (!courseData?.is_published) {
        console.warn('⚠️ [fetchModules] Course not published:', courseData?.title);
        // Para cursos não publicados, ainda permite carregamento se for o professor
      }

      console.log('🔍 [fetchModules] ===== DIAGNÓSTICO DETALHADO =====');
      console.log('🔍 [fetchModules] courseId:', courseId);
      console.log('🔍 [fetchModules] courseData:', courseData);

      // ✅ Query otimizada: Exclui o campo 'content' (que pode ser grande) da listagem
      // Isso reduz drasticamente o tamanho do payload JSON
      console.log('🔍 [fetchModules] Iniciando query para módulos...');

      const queryPromise = supabase
        .from('course_modules')
        .select(`
          *,
          course_lessons (
            id, module_id, title, description, storage_path, video_url, video_uploaded, video_duration_minutes,
            attachments, order_index, is_free, is_published, release_mode,
            release_after_days, enable_support_button, created_at, updated_at
          )
        `)
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout: servidor demorando demais para responder')), 20000)
      );

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      console.log('🔍 [fetchModules] Query concluída!');
      console.log('🔍 [fetchModules] Erro?', error ? error.message : 'Nenhum erro');
      console.log('🔍 [fetchModules] Dados retornados:', data);
      console.log('🔍 [fetchModules] Número de módulos:', data?.length || 0);

      if (error) throw error;

      const modulesWithLessons = (data || []).map((module: any) => ({
        ...module,
        release_mode: module.release_mode as 'immediate' | 'days_after_enrollment',
        lessons: (module as any).course_lessons?.sort((a: any, b: any) => a.order_index - b.order_index) || []
      }));

      // Transform lessons and add to flat array
      const allLessons: CourseLesson[] = [];
      modulesWithLessons.forEach(module => {
        if (module.lessons) {
          allLessons.push(...module.lessons.map(lesson => ({
            ...lesson,
            release_mode: lesson.release_mode as 'immediate' | 'days_after_enrollment'
          })));
        }
      });

      console.log('✅ [fetchModules] Modules fetched successfully:');
      console.log(`📊 Total modules: ${modulesWithLessons.length}`);
      console.log(`📚 Total lessons: ${allLessons.length}`);

      // Análise detalhada de status de publicação
      const publishedModules = modulesWithLessons.filter(m => m.is_published).length;
      const publishedLessons = allLessons.filter(l => l.is_published).length;
      const unpublishedModules = modulesWithLessons.length - publishedModules;
      const unpublishedLessons = allLessons.length - publishedLessons;

      console.log(`📊 Status: ${publishedModules}/${modulesWithLessons.length} módulos publicados, ${publishedLessons}/${allLessons.length} aulas publicadas`);

      modulesWithLessons.forEach((module, index) => {
        const statusIcon = module.is_published ? '✅' : '⚠️';
        const statusText = module.is_published ? 'PUBLICADO' : 'RASCUNHO';
        console.log(`📁 ${statusIcon} Módulo ${index + 1}: "${module.title}" (${module.lessons?.length || 0} aulas) - ${statusText}`);

        if (module.lessons && module.lessons.length > 0) {
          module.lessons.forEach((lesson, lessonIndex) => {
            const lessonIcon = lesson.is_published ? '✅' : '⚠️';
            const lessonStatus = lesson.is_published ? 'PUB' : 'DRAFT';
            console.log(`  📖 ${lessonIcon} Aula ${lessonIndex + 1}: "${lesson.title}" - ${lessonStatus}`);
          });
        }
      });

      if (unpublishedModules > 0 || unpublishedLessons > 0) {
        console.log(`⚠️ Atenção: ${unpublishedModules} módulos e ${unpublishedLessons} aulas não publicadas não aparecerão para os alunos`);
      }

      console.log('🔍 [fetchModules] Configurando state com', modulesWithLessons.length, 'módulos');
      setModules(modulesWithLessons);
      setLessons(allLessons);
      console.log('🔍 [fetchModules] State atualizado!');
      console.log('🔍 [fetchModules] ===== FIM DO DIAGNÓSTICO =====');

      // Atualizar cache em memória e localStorage
      cacheRef.current = {
        courseId,
        data: modulesWithLessons,
        timestamp: Date.now()
      };
      saveCacheToStorage(courseId, modulesWithLessons);

      if (!isInitialLoad) {
        console.log('📊 [fetchModules] Data refreshed successfully');
      }
    } catch (error: any) {
      console.error('❌ [fetchModules] Error fetching modules:', error);
      const errorMessage = error.message || 'Não foi possível carregar os módulos';
      setError(errorMessage);

      // Tentar carregar de localStorage como fallback final
      const localStorageCache = loadCacheFromStorage(courseId);
      if (localStorageCache) {
        console.log('💾 [fetchModules] Using localStorage fallback after error');
        setModules(localStorageCache);
        setError(null); // Limpar erro se conseguiu carregar do cache
      }

      // Toast com ação de retry
      const isTimeout = error.message?.includes('timeout') || error.code === 'TIMEOUT';

      if (!localStorageCache) {
        toast({
          title: 'Erro ao carregar módulos',
          description: isTimeout
            ? 'O servidor está demorando para responder. Tente novamente em alguns segundos.'
            : errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [courseId, toast]); // ✅ Apenas dependências estáveis - sem modules.length ou funções

  // ✅ Atualizar ref sempre que fetchModules mudar
  useEffect(() => {
    fetchModulesRef.current = fetchModules;
  }, [fetchModules]);

  const addModule = async (moduleData: Omit<CourseModule, 'id' | 'created_at' | 'updated_at' | 'order_index'> & { order_index?: number }) => {
    try {
      // Get next order index if not provided
      const orderIndex = moduleData.order_index ?? await getNextModuleOrderIndex(moduleData.course_id);

      const finalModuleData = {
        ...moduleData,
        order_index: orderIndex
      };

      const { data, error } = await supabase
        .from('course_modules')
        .insert(finalModuleData)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ [addModule] Module created:', data.title);

      // Invalidar cache e atualizar
      cacheRef.current = null;
      setTimeout(() => fetchModules(true), 100);
      return data;
    } catch (error) {
      console.error('Error adding module:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o módulo',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const updateModule = async (id: string, updates: Partial<CourseModule>) => {
    try {
      const { data, error } = await supabase
        .from('course_modules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ [updateModule] Module updated:', data.title);

      // Invalidar cache e atualizar
      cacheRef.current = null;
      setTimeout(() => fetchModules(true), 100);
      return data;
    } catch (error) {
      console.error('Error updating module:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o módulo',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const deleteModule = async (id: string) => {
    try {
      const { error } = await supabase
        .from('course_modules')
        .delete()
        .eq('id', id);

      if (error) throw error;

      console.log('✅ [deleteModule] Module deleted:', id);

      // Invalidar cache e atualizar
      cacheRef.current = null;
      setTimeout(() => fetchModules(true), 100);
    } catch (error) {
      console.error('Error deleting module:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o módulo',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const getNextLessonOrderIndex = async (moduleId: string): Promise<number> => {
    try {
      const { data, error } = await supabase
        .from('course_lessons')
        .select('order_index')
        .eq('module_id', moduleId)
        .order('order_index', { ascending: false })
        .limit(1);

      if (error) throw error;

      return data && data.length > 0 ? data[0].order_index + 1 : 1;
    } catch (error) {
      console.error('Error getting next lesson order index:', error);
      return 1; // Fallback to 1 if there's an error
    }
  };

  const getNextModuleOrderIndex = async (courseId: string): Promise<number> => {
    try {
      const { data, error } = await supabase
        .from('course_modules')
        .select('order_index')
        .eq('course_id', courseId)
        .order('order_index', { ascending: false })
        .limit(1);

      if (error) throw error;

      return data && data.length > 0 ? data[0].order_index + 1 : 1;
    } catch (error) {
      console.error('Error getting next module order index:', error);
      return 1; // Fallback to 1 if there's an error
    }
  };

  const addLesson = async (lessonData: Omit<CourseLesson, 'id' | 'created_at' | 'updated_at' | 'order_index'> & { order_index?: number }) => {
    try {
      // Get next order index if not provided
      const orderIndex = lessonData.order_index ?? await getNextLessonOrderIndex(lessonData.module_id);

      const finalLessonData = {
        ...lessonData,
        order_index: orderIndex
      };

      const { data, error } = await supabase
        .from('course_lessons')
        .insert(finalLessonData)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ [addLesson] Lesson created:', data.title);

      // Invalidar cache e atualizar
      cacheRef.current = null;
      setTimeout(() => fetchModules(true), 100);
      return data;
    } catch (error) {
      console.error('Error adding lesson:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a aula',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const updateLesson = async (id: string, updates: Partial<CourseLesson>) => {
    try {
      const { data, error } = await supabase
        .from('course_lessons')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ [updateLesson] Lesson updated:', data.title);

      // Invalidar cache e atualizar
      cacheRef.current = null;
      setTimeout(() => fetchModules(true), 100);
      return data;
    } catch (error) {
      console.error('Error updating lesson:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a aula',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const deleteLesson = async (id: string) => {
    try {
      const { error } = await supabase
        .from('course_lessons')
        .delete()
        .eq('id', id);

      if (error) throw error;

      console.log('✅ [deleteLesson] Lesson deleted:', id);

      // Invalidar cache e atualizar
      cacheRef.current = null;
      setTimeout(() => fetchModules(true), 100);
    } catch (error) {
      console.error('Error deleting lesson:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a aula',
        variant: 'destructive'
      });
      throw error;
    }
  };

  // ✅ Real-time subscription usando ref - não causa re-execução
  useEffect(() => {
    if (!courseId) return;

    console.log('🔌 [useEffect] Setting up realtime subscription for course:', courseId);

    const channelName = `course-content-${courseId}`;
    const subscription = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'course_modules',
        filter: `course_id=eq.${courseId}`
      }, (payload) => {
        console.log('📡 [Realtime] Module change detected:', payload.eventType, payload.new || payload.old);
        // Invalidar cache e debounce mais longo para evitar loops
        cacheRef.current = null;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchModulesRef.current(true), 1000);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'course_lessons'
      }, (payload) => {
        console.log('📡 [Realtime] Lesson change detected:', payload.eventType, payload.new || payload.old);
        // Invalidar cache e debounce mais longo para evitar loops
        cacheRef.current = null;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchModulesRef.current(true), 1000);
      })
      .subscribe((status) => {
        console.log('📡 [Realtime] Subscription status:', status);
      });

    return () => {
      console.log('🔌 [useEffect] Cleaning up realtime subscription');
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(subscription);
    };
  }, [courseId]); // ✅ Apenas courseId como dependência

  // ✅ Initial fetch usando ref
  useEffect(() => {
    fetchModulesRef.current(true);
  }, [courseId]); // ✅ Apenas courseId

  return {
    modules,
    lessons,
    loading,
    refreshing,
    error,
    addModule,
    updateModule,
    deleteModule,
    addLesson,
    updateLesson,
    deleteLesson,
    getNextLessonOrderIndex,
    getNextModuleOrderIndex,
    refetch: useCallback(() => {
      console.log('🔄 [refetch] Forçando atualização - limpando TODOS os caches');
      cacheRef.current = null;
      // Limpar também cache do localStorage
      if (courseId) {
        localStorage.removeItem(`course_modules_${courseId}`);
        console.log('🔄 [refetch] localStorage cache removido para courseId:', courseId);
      }
      fetchModules(true);
    }, [fetchModules, courseId])
  };
}