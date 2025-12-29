import { useState } from 'react';
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
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useUnifiedChatSystem } from '@/hooks/useUnifiedChatSystem'
import { useStableUserType } from '@/hooks/useStableUserType';
import PersonalAssistantChat from '@/components/chat/PersonalAssistantChat';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({ activeSection, onSectionChange, isCollapsed, onToggleCollapse }: SidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { stats } = useUnifiedChatSystem(); // ✅ Hook atualizado
  const unreadCount = stats?.unreadTeacherMessages || 0; // ✅ Propriedade correta
  const { userType } = useStableUserType();

  const menuItems = [
    { id: 'inicio', label: 'Início', icon: Home },
    { id: 'gestao-alunos', label: 'Gestão de Alunos', icon: User, teacherOnly: true },
    { id: 'agenda', label: 'Controle de Agenda', icon: Calendar },
    { id: 'notificacoes', label: 'Notificações', icon: Bell },
    { id: 'consultoria', label: 'Consultoria', icon: MessageSquare, teacherOnly: true },
    { id: 'predefinicoes', label: 'Predefinições', icon: FileText, teacherOnly: true },
    { id: 'gamificacao', label: 'Gamificação', icon: Trophy },
    { id: 'marketing', label: 'Marketing', icon: Megaphone, teacherOnly: true },
    { id: 'comunicacao', label: 'Comunicação', icon: MessageSquare, badge: unreadCount > 0 ? unreadCount : null },
    { id: 'meus-pagamentos', label: 'Meus Pagamentos', icon: DollarSign, studentOnly: true },
    { id: 'pagamentos', label: 'Gestão de Pagamentos', icon: DollarSign, teacherOnly: true },
    { id: 'produtos', label: 'Mentoria & Cursos', icon: ShoppingCart, teacherOnly: true },
    { id: 'relatorios', label: 'Avaliações e Relatórios', icon: ChartBar, teacherOnly: true },
    { id: 'treinos-ia', label: 'Treino e Dieta com IA', icon: Bot, teacherOnly: true },
    { id: 'configuracoes', label: 'Configurações', icon: Settings }
  ];

  // Filter menu items based on user type
  const filteredMenuItems = menuItems.filter(item => {
    if (item.teacherOnly && userType !== 'teacher') return false;
    if (item.studentOnly && userType !== 'student') return false;
    return true;
  });

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleMobileItemClick = (sectionId: string) => {
    onSectionChange(sectionId);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Menu Button - Only visible on mobile */}
      <button
        onClick={handleMobileMenuToggle}
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
        isCollapsed ? "w-14" : "w-56"
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
            onClick={onToggleCollapse}
            className="ml-auto p-1 rounded-lg hover:bg-sidebar-accent text-muted-foreground hover:text-sidebar-foreground transition-colors"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 min-h-0 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => onSectionChange(item.id)}
                    className={cn(
                      "w-full flex items-center px-2.5 py-1.5 rounded-lg text-left transition-colors relative",
                      activeSection === item.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {!isCollapsed && (
                      <span className="ml-2.5 text-xs">{item.label}</span>
                    )}
                    {item.badge && (
                      <span className="ml-auto bg-destructive text-destructive-foreground text-xs rounded-full px-2 py-1 min-w-[1.25rem] h-5 flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer com Assistente IA */}
        <div className="flex-shrink-0 p-2 border-t border-sidebar-border bg-sidebar">
          <PersonalAssistantChat embedded={true} isCollapsed={isCollapsed} />
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
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleMobileItemClick(item.id)}
                    className={cn(
                      "w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors relative",
                      activeSection === item.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="ml-3 text-sm">{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto bg-destructive text-destructive-foreground text-xs rounded-full px-2 py-1 min-w-[1.25rem] h-5 flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
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
    </>
  );
}