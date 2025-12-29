import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Calendar, Users, AlertTriangle, Save, Clock } from 'lucide-react';
import { GamificationSettings } from '@/hooks/useGamificationSettings';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ResetSystemPanelProps {
  settings: GamificationSettings;
  onUpdate: (updates: Partial<GamificationSettings>) => Promise<void>;
  onReset: (reason: string) => Promise<void>;
  resetting: boolean;
  totalStudents: number;
  totalPoints: number;
}

export const ResetSystemPanel = ({ 
  settings, 
  onUpdate, 
  onReset, 
  resetting, 
  totalStudents, 
  totalPoints 
}: ResetSystemPanelProps) => {
  const [resetReason, setResetReason] = useState('');
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [autoReset, setAutoReset] = useState(settings.auto_reset_enabled);
  const [nextResetDate, setNextResetDate] = useState(settings.next_reset_date || '');
  const [resetFrequency, setResetFrequency] = useState(settings.reset_frequency);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAutoResetChange = (enabled: boolean) => {
    setAutoReset(enabled);
    setHasChanges(true);
  };

  const handleDateChange = (date: string) => {
    setNextResetDate(date);
    setHasChanges(true);
  };

  const handleFrequencyChange = (frequency: string) => {
    setResetFrequency(frequency);
    setHasChanges(true);
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await onUpdate({
        auto_reset_enabled: autoReset,
        next_reset_date: nextResetDate || null,
        reset_frequency: resetFrequency
      });
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving reset settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleManualReset = async () => {
    try {
      await onReset(resetReason || 'Reset manual executado pelo professor');
      setIsResetDialogOpen(false);
      setResetReason('');
    } catch (error) {
      console.error('Error resetting points:', error);
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels: Record<string, string> = {
      'manual': 'Apenas Manual',
      'monthly': 'Mensal',
      'quarterly': 'Trimestral',
      'yearly': 'Anual'
    };
    return labels[frequency] || frequency;
  };

  const isDateInPast = nextResetDate && new Date(nextResetDate) < new Date();

  return (
    <div className="space-y-6">
      {/* Manual Reset Section */}
      <Card className="border-destructive/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-destructive" />
                Reset Manual de Pontuações
              </CardTitle>
              <CardDescription>
                Zerar todos os pontos, níveis e streaks dos alunos
              </CardDescription>
            </div>
            <div className="text-right space-y-1">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{totalStudents} alunos</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {totalPoints.toLocaleString()} pontos totais
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-destructive">
                    Ação Irreversível
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Esta ação não pode ser desfeita. Todos os dados serão salvos em backup automaticamente.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reset-reason">Motivo do Reset (opcional)</Label>
              <Textarea
                id="reset-reason"
                placeholder="Ex: Início do novo período letivo, rebalanceamento do sistema, etc."
                value={resetReason}
                onChange={(e) => setResetReason(e.target.value)}
                rows={3}
              />
            </div>

            <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full" disabled={resetting}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {resetting ? 'Resetando...' : 'Resetar Todas as Pontuações'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Confirmar Reset de Pontuações
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3">
                    <p>
                      Esta ação irá <strong>zerar permanentemente</strong> todas as pontuações de todos os seus alunos:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li><strong>{totalStudents}</strong> alunos serão afetados</li>
                      <li><strong>{totalPoints.toLocaleString()}</strong> pontos serão perdidos</li>
                      <li>Todos os níveis voltarão para nível 1</li>
                      <li>Todas as sequências (streaks) serão zeradas</li>
                    </ul>
                    <p className="text-xs bg-muted p-2 rounded">
                      <strong>Backup automático:</strong> Todos os dados serão salvos automaticamente 
                      no histórico antes do reset.
                    </p>
                    {resetReason && (
                      <p className="text-xs">
                        <strong>Motivo:</strong> {resetReason}
                      </p>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleManualReset}
                    className="bg-destructive hover:bg-destructive/90"
                    disabled={resetting}
                  >
                    {resetting ? 'Resetando...' : 'Confirmar Reset'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Automatic Reset Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Reset Automático
          </CardTitle>
          <CardDescription>
            Configure resets automáticos baseados em datas e frequência
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Enable/Disable Auto Reset */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Ativar Reset Automático</Label>
                <p className="text-xs text-muted-foreground">
                  Permitir que o sistema execute resets automaticamente
                </p>
              </div>
              <Switch
                checked={autoReset}
                onCheckedChange={handleAutoResetChange}
              />
            </div>

            {/* Frequency Selection */}
            <div className="space-y-2">
              <Label>Frequência do Reset</Label>
              <Select value={resetFrequency} onValueChange={handleFrequencyChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Apenas Manual</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Next Reset Date */}
            {autoReset && resetFrequency !== 'manual' && (
              <div className="space-y-2">
                <Label>Próximo Reset</Label>
                <Input
                  type="date"
                  value={nextResetDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
                {isDateInPast && (
                  <p className="text-xs text-destructive">
                    A data selecionada está no passado
                  </p>
                )}
                {nextResetDate && !isDateInPast && (
                  <p className="text-xs text-muted-foreground">
                    Próximo reset em: {format(new Date(nextResetDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                )}
              </div>
            )}

            {/* Current Settings Display */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <h4 className="text-sm font-medium">Configuração Atual</h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={autoReset ? "default" : "secondary"} className="ml-2 text-xs">
                    {autoReset ? 'Ativado' : 'Desativado'}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Frequência:</span>
                  <span className="ml-2 font-medium">{getFrequencyLabel(resetFrequency)}</span>
                </div>
                {nextResetDate && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Próximo reset:</span>
                    <span className="ml-2 font-medium">
                      {format(new Date(nextResetDate), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Save Button */}
            {hasChanges && (
              <Button onClick={handleSaveSettings} disabled={saving} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar Configurações de Reset'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};