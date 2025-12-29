import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Home,
    User,
    Calendar,
    Bell,
    MessageSquare,
    DollarSign,
    ShoppingCart,
    ChartBar,
    Bot,
    Settings,
    ChevronRight,
    ChevronDown,
    FileText,
    Trophy,
    Menu,
    X,
    Megaphone
} from 'lucide-react';
import TopBar from '@/components/TopBar';
import { cn } from '@/lib/utils';
import PersonalAssistantChat from '@/components/chat/PersonalAssistantChat';

interface ProfessorLayoutProps {
    children: React.ReactNode;
    activeSection?: string;
}

// Mapeamento de seções para rotas
const sectionRouteMap: Record<string, string> = {
    'inicio': '/',
    'gestao-alunos': '/gestao-alunos',
    'agenda': '/agenda',
    'notificacoes': '/notificacoes',
    'consultoria': '/consultoria',
    'predefinicoes': '/predefinicoes',
    'gamificacao': '/gamificacao',
    'marketing': '/marketing',
    'comunicacao': '/comunicacao',
    'pagamentos': '/pagamentos',
    'produtos': '/produtos',
    'relatorios': '/relatorios',
    'treinos-ia': '/treinos-ia',
    'configuracoes': '/configuracoes'
};

// Mapeamento de rotas para seções
const routeSectionMap: Record<string, string> = Object.fromEntries(
    Object.entries(sectionRouteMap).map(([key, value]) => [value, key])
);

const menuItems = [
    { id: 'inicio', label: 'Início', icon: Home, route: '/' },
    { id: 'gestao-alunos', label: 'Gestão de Alunos', icon: User, route: '/gestao-alunos' },
    { id: 'agenda', label: 'Controle de Agenda', icon: Calendar, route: '/agenda' },
    { id: 'notificacoes', label: 'Notificações', icon: Bell, route: '/notificacoes' },
    { id: 'consultoria', label: 'Consultoria', icon: MessageSquare, route: '/consultoria' },
    { id: 'predefinicoes', label: 'Predefinições', icon: FileText, route: '/predefinicoes' },
    { id: 'gamificacao', label: 'Gamificação', icon: Trophy, route: '/gamificacao' },
    { id: 'marketing', label: 'Marketing', icon: Megaphone, route: '/marketing' },
    { id: 'comunicacao', label: 'Comunicação', icon: MessageSquare, route: '/comunicacao' },
    { id: 'pagamentos', label: 'Gestão de Pagamentos', icon: DollarSign, route: '/pagamentos' },
    { id: 'produtos', label: 'Mentoria & Cursos', icon: ShoppingCart, route: '/produtos' },
    { id: 'relatorios', label: 'Avaliações e Relatórios', icon: ChartBar, route: '/relatorios' },
    { id: 'treinos-ia', label: 'Treino e Dieta com IA', icon: Bot, route: '/treinos-ia' },
    { id: 'configuracoes', label: 'Configurações', icon: Settings, route: '/configuracoes' }
];

export default function ProfessorLayout({
    children,
    activeSection
}: ProfessorLayoutProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Determinar seção ativa baseada na rota atual
    const currentSection = activeSection || routeSectionMap[location.pathname] || 'inicio';

    const handleSectionChange = (sectionId: string) => {
        const route = sectionRouteMap[sectionId] || '/';
        navigate(route);
        setIsMobileMenuOpen(false);
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Mobile Menu Button */}
            <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Mobile Backdrop */}
            {isMobileMenuOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Desktop Sidebar */}
            <aside className={cn(
                "hidden md:flex flex-col bg-sidebar border-r border-sidebar-border h-screen fixed left-0 top-0 z-30 transition-all duration-300",
                isSidebarCollapsed ? "w-14" : "w-56"
            )}>
                {/* Header */}
                <div className="h-14 flex items-center px-4 border-b border-sidebar-border flex-shrink-0">
                    <div className="flex items-center justify-center w-full h-full">
                        <img
                            src="/lovable-uploads/6ec053ec-89eb-4288-a3d1-e2719129d4cd.png"
                            alt="Prass Trainer Logo"
                            className="max-h-full max-w-full object-contain"
                        />
                    </div>
                    <button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className="ml-auto p-1 rounded-lg hover:bg-sidebar-accent text-muted-foreground hover:text-sidebar-foreground transition-colors"
                    >
                        {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 min-h-0 overflow-y-auto py-4">
                    <ul className="space-y-1 px-2">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <li key={item.id}>
                                    <button
                                        onClick={() => handleSectionChange(item.id)}
                                        className={cn(
                                            "w-full flex items-center px-2.5 py-1.5 rounded-lg text-left transition-colors relative",
                                            currentSection === item.id
                                                ? "bg-primary text-primary-foreground"
                                                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                                        )}
                                    >
                                        <Icon className="w-4 h-4 flex-shrink-0" />
                                        {!isSidebarCollapsed && (
                                            <span className="ml-2.5 text-xs">{item.label}</span>
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* Footer com Assistente IA */}
                <div className="flex-shrink-0 p-2 border-t border-sidebar-border bg-sidebar">
                    <PersonalAssistantChat embedded={true} isCollapsed={isSidebarCollapsed} />
                </div>
            </aside>

            {/* Mobile Sidebar */}
            <aside className={cn(
                "md:hidden fixed left-0 top-0 h-screen w-56 bg-sidebar border-r border-sidebar-border z-50 transition-transform duration-300 flex flex-col",
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                {/* Header */}
                <div className="h-14 flex items-center px-4 border-b border-sidebar-border flex-shrink-0">
                    <div className="flex items-center justify-center w-full h-full">
                        <img
                            src="/lovable-uploads/6ec053ec-89eb-4288-a3d1-e2719129d4cd.png"
                            alt="Prass Trainer Logo"
                            className="max-h-full max-w-full object-contain"
                        />
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 min-h-0 overflow-y-auto py-4">
                    <ul className="space-y-1 px-2">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <li key={item.id}>
                                    <button
                                        onClick={() => handleSectionChange(item.id)}
                                        className={cn(
                                            "w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors relative",
                                            currentSection === item.id
                                                ? "bg-primary text-primary-foreground"
                                                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                                        )}
                                    >
                                        <Icon className="w-5 h-5 flex-shrink-0" />
                                        <span className="ml-3 text-sm">{item.label}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* Footer mobile com Assistente IA */}
                <div className="flex-shrink-0 p-2 border-t border-sidebar-border bg-sidebar">
                    <PersonalAssistantChat embedded={true} isCollapsed={false} />
                </div>
            </aside>

            {/* Main Content */}
            <div className={`transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-14' : 'md:ml-56'}`}>
                <TopBar />

                <main className="p-3 sm:p-4 md:p-5 lg:p-6 min-h-screen">
                    {children}
                </main>
            </div>
        </div>
    );
}
