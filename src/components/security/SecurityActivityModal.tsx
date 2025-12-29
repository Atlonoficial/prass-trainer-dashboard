import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useSecurityActivity } from '@/hooks/useSecurityActivity';
import { useSessionSecurity } from '@/hooks/useSessionSecurity';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Activity, Loader2, Trash2, Shield, LogOut } from 'lucide-react';

interface SecurityActivityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SecurityActivityModal({ open, onOpenChange }: SecurityActivityModalProps) {
  const { activities, loading, clearOldActivities, getActivityIcon, getActivityColor } = useSecurityActivity();
  const { revokeAllOtherSessions, forceReauthentication } = useSessionSecurity();

  const handleClearOldActivities = async () => {
    await clearOldActivities(30); // Clear activities older than 30 days
  };

  const getActivityTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'login': 'Login',
      'logout': 'Logout',
      'password_change': 'Alteração de Senha',
      '2fa_enabled': '2FA Ativado',
      '2fa_disabled': '2FA Desativado',
      'session_revoked': 'Sessão Revogada',
      'all_sessions_revoked': 'Todas Sessões Revogadas',
      'backup_codes_regenerated': 'Códigos Regenerados',
      'profile_updated': 'Perfil Atualizado',
      'settings_changed': 'Configurações Alteradas',
      'suspicious_login': 'Login Suspeito',
      'failed_login': 'Falha no Login'
    };
    return labels[type] || type;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] p-2 sm:p-3">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Atividade de Segurança
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Security Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={revokeAllOtherSessions}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Revogar Sessões
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={forceReauthentication}
            >
              <Shield className="h-4 w-4 mr-2" />
              Forçar Relogin
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearOldActivities}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar Antigas
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Histórico das últimas atividades de segurança da sua conta
            </p>
          </div>

          <ScrollArea className="h-96">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Carregando atividades...</span>
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma atividade de segurança registrada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                  >
                    <div className="text-2xl mt-1">
                      {getActivityIcon(activity.activity_type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">
                          {getActivityTypeLabel(activity.activity_type)}
                        </h4>
                        <Badge
                          variant={activity.success ? "secondary" : "destructive"}
                          className="text-xs"
                        >
                          {activity.success ? 'Sucesso' : 'Falha'}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2">
                        {activity.activity_description}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          {formatDistanceToNow(new Date(activity.created_at), {
                            addSuffix: true,
                            locale: ptBR
                          })}
                        </span>
                        
                        {activity.device_info?.device && (
                          <span>
                            {activity.device_info.device} • {activity.device_info.browser || 'Navegador'}
                          </span>
                        )}
                        
                        {activity.ip_address && (
                          <span>IP: {activity.ip_address}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}