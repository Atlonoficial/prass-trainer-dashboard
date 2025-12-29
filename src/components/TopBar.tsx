import { Bell, Search, User, Settings, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOptimizedProfile } from '@/hooks/useOptimizedProfile';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProfileSettingsModal } from '@/components/profile/ProfileSettingsModal';

export default function TopBar() {
  const { user, isAuthenticated } = useAuth()
  const { profile, loading: profileLoading } = useOptimizedProfile()
  const [showSettings, setShowSettings] = useState(false)
  const navigate = useNavigate()

  return (
    <header className="h-14 sm:h-16 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-3 sm:px-4 md:px-6 relative z-30">
      {/* Left side - Search (hidden on mobile) */}
      <div className="hidden md:flex items-center flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar..."
            className="w-full bg-input text-foreground pl-10 pr-4 py-2 rounded-lg border border-border focus:border-primary focus:outline-none transition-colors min-h-10"
          />
        </div>
      </div>

      {/* Mobile title */}
      <div className="md:hidden flex-1 flex justify-center min-w-0">
        <img
          src="/lovable-uploads/6ec053ec-89eb-4288-a3d1-e2719129d4cd.png"
          alt="Prass Trainer Logo"
          className="h-6 sm:h-8 object-contain flex-shrink-0"
        />
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Mobile search button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-muted-foreground hover:text-foreground hover:bg-accent h-9 w-9 sm:h-10 sm:w-10"
        >
          <Search className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground hover:bg-accent h-9 w-9 sm:h-10 sm:w-10"
        >
          <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full"></span>
        </Button>

        {/* User Profile */}
        <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3">
          {isAuthenticated ? (
            <>
              {/* Settings button - hidden on very small screens */}
              <Button
                variant="ghost"
                size="icon"
                className="hidden xs:flex text-muted-foreground hover:text-foreground hover:bg-accent h-9 w-9 sm:h-10 sm:w-10"
                onClick={() => setShowSettings(true)}
              >
                <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>

              {/* User button */}
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground hover:bg-accent h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0"
                onClick={() => setShowSettings(true)}
              >
                <User className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>

              {/* User info - hidden on mobile */}
              <div className="hidden md:flex flex-col text-right cursor-pointer min-w-0" onClick={() => setShowSettings(true)}>
                <span className="text-sm font-medium text-foreground truncate max-w-32">
                  {profileLoading ? 'Carregando...' : (profile?.name || user?.email || 'Usuário')}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {(() => {
                    console.log('🔍 TopBar Debug:', {
                      authUserId: user?.id,
                      authEmail: user?.email,
                      profile,
                      user_type: profile?.user_type,
                      profileLoading
                    })
                    return profileLoading ? '...' : (profile?.user_type === 'teacher' ? 'Professor' : 'Aluno')
                  })()}
                </span>
              </div>
            </>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="flex items-center gap-1 sm:gap-2 min-h-9 px-2 sm:px-3 text-sm"
              onClick={() => navigate('/auth')}
            >
              <LogIn className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:block">Login</span>
            </Button>
          )}
        </div>
      </div>

      {isAuthenticated && (
        <ProfileSettingsModal
          open={showSettings}
          onOpenChange={setShowSettings}
        />
      )}
    </header>
  );
}