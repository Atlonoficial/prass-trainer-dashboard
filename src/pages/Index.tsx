import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { useVisibleSection } from '@/hooks/useVisibleSection';
import { useUnifiedApp } from '@/contexts/UnifiedAppProvider';
import StudentDashboard from '@/components/student/StudentDashboard';
import { renderLazySection } from './Index.lazy';

export default function Index() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userRole: userType, loading } = useUnifiedApp();
  const {
    activeSection,
    shouldLoadSection,
    markSectionVisible,
    isTransitioning
  } = useVisibleSection();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [configurationsInitialTab, setConfigurationsInitialTab] = useState('perfil');
  const [loadingTimeout, setLoadingTimeout] = useState(false); // ✅ NOVO: Timeout de loading

  // ✅ NOVO: Timeout de 15 segundos para loading
  useEffect(() => {
    if (loading.auth || !userType) {
      const timeout = setTimeout(() => {
        console.warn('[Index] ⏱️ Timeout de loading detectado')
        setLoadingTimeout(true)
      }, 15000) // 15 segundos

      return () => clearTimeout(timeout)
    } else {
      setLoadingTimeout(false)
    }
  }, [loading.auth, userType])

  // Redirecionar professor diretamente para o dashboard
  useEffect(() => {
    if (!loading.auth && userType === 'teacher') {
      navigate('/professor/dashboard', { replace: true });
    }
  }, [loading.auth, userType, navigate])

  // Handle URL parameters navigation
  useEffect(() => {
    const section = searchParams.get('section');
    if (section) {
      markSectionVisible(section);
      // Clear URL parameter after navigation
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams, markSectionVisible]);

  // Listen for navigation events - MUST be before any conditional returns
  useEffect(() => {
    const handleNavigateToConfigurations = (event: CustomEvent) => {
      markSectionVisible('configuracoes');
      if (event.detail?.tab) {
        setConfigurationsInitialTab(event.detail.tab);
      }
    };

    const handleNavigateToSection = (event: CustomEvent) => {
      const { sectionId } = event.detail;
      markSectionVisible(sectionId);
    };

    window.addEventListener('navigateToConfigurations', handleNavigateToConfigurations as EventListener);
    window.addEventListener('navigateToSection', handleNavigateToSection as EventListener);

    return () => {
      window.removeEventListener('navigateToConfigurations', handleNavigateToConfigurations as EventListener);
      window.removeEventListener('navigateToSection', handleNavigateToSection as EventListener);
    };
  }, [markSectionVisible]);

  // ✅ Se houver timeout, mostrar mensagem de erro com opção de reload
  if (loadingTimeout) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-6xl mb-4">⏱️</div>
          <h2 className="text-2xl font-bold">Tempo Limite Excedido</h2>
          <p className="text-muted-foreground">
            A aplicação está demorando mais que o esperado para carregar.
            Isso pode ser um problema temporário de conexão.
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Recarregar Página
            </button>
            <button
              onClick={() => window.location.href = '/auth'}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
            >
              Fazer Login Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If loading user type, show loading state
  if (loading.auth && !loadingTimeout) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground animate-pulse">Carregando autenticação...</p>
        </div>
      </div>
    );
  }

  // If no user type yet, AuthGuard will redirect to setup
  if (!userType && !loadingTimeout) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground animate-pulse">Identificando perfil...</p>
        </div>
      </div>
    );
  }

  // If user is student, show student dashboard
  if (userType === 'student') {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <StudentDashboard />
        </div>
      </div>
    );
  }

  const renderSectionWithOptimization = (sectionId: string, props: any = {}) => {
    if (!shouldLoadSection(sectionId)) {
      return null // Will be loaded when visible
    }

    return renderLazySection(sectionId, props)
  }

  const renderSection = () => {
    const sectionProps: Record<string, any> = {
      'configuracoes': { initialTab: configurationsInitialTab }
    }

    return renderSectionWithOptimization(activeSection, sectionProps[activeSection])
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={markSectionVisible}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      <div className={`transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
        }`}>
        <TopBar />

        <main className={`p-3 sm:p-4 md:p-5 lg:p-6 min-h-screen transition-opacity duration-200 ${isTransitioning ? 'opacity-70' : 'opacity-100'}`}>
          {renderSection()}
        </main>
      </div>
    </div>
  );
}