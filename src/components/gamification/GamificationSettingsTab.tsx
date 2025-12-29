import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Settings, RotateCcw, History, Sliders, Save, Eye } from 'lucide-react';
import { useGamificationSettings } from '@/hooks/useGamificationSettings';
import { useUserPoints, StudentRanking as BaseStudentRanking } from '@/hooks/useUserPoints';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PointsConfigurationPanel } from './PointsConfigurationPanel';
import { ResetSystemPanel } from './ResetSystemPanel';
import { ImpactPreviewChart } from './ImpactPreviewChart';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Extend StudentRanking to match ImpactPreviewChart interface
interface StudentRanking extends BaseStudentRanking {
  avatar: string | null;
  points: number;
  streak: number;
}

// Transform function to convert BaseStudentRanking to StudentRanking
const transformStudentRanking = (student: BaseStudentRanking): StudentRanking => ({
  ...student,
  avatar: student.avatar_url || null,
  points: student.total_points,
  streak: student.current_streak
});

interface GamificationSettingsTabProps {
  teacherId: string;
}

export const GamificationSettingsTab = ({ teacherId }: GamificationSettingsTabProps) => {
  const { user } = useAuth();
  const { settings, resetHistory, loading, resetting, updateSettings, resetAllPoints } = useGamificationSettings(teacherId);
  const { rankings } = useUserPoints(teacherId);
  const [activeSubTab, setActiveSubTab] = useState('points');
  const [resetReason, setResetReason] = useState('');
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [tempSettings, setTempSettings] = useState(settings);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Erro ao carregar configurações</p>
      </div>
    );
  }

  const handleResetPoints = async () => {
    try {
      await resetAllPoints(resetReason || 'Reset manual executado pelo professor');
      setIsResetDialogOpen(false);
      setResetReason('');
    } catch (error) {
      console.error('Error resetting points:', error);
    }
  };

  const totalStudents = rankings.length;
  const totalPoints = rankings.reduce((sum, student) => sum + (student.total_points || 0), 0);
  
  // Transform rankings for components that need the extended interface
  const transformedRankings = rankings.map(transformStudentRanking);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Configurações de Gamificação
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure pontuações, sistema de reset e monitore o impacto nas classificações
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs">
            {totalStudents} alunos ativos
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {totalPoints.toLocaleString()} pontos totais
          </Badge>
        </div>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="points" className="flex items-center gap-2">
            <Sliders className="h-4 w-4" />
            Pontuações
          </TabsTrigger>
          <TabsTrigger value="reset" className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Sistema de Reset
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="points" className="space-y-6">
          <PointsConfigurationPanel 
            settings={settings}
            onUpdate={updateSettings}
          />
          
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Preview de Impacto</CardTitle>
                  <CardDescription>
                    Veja como as mudanças afetarão o ranking dos alunos
                  </CardDescription>
                </div>
                <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Detalhes
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
                    <DialogHeader>
                      <DialogTitle>Análise de Impacto Detalhada</DialogTitle>
                    </DialogHeader>
                    <ImpactPreviewChart 
                      students={transformedRankings}
                      currentSettings={settings}
                      newSettings={tempSettings}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <ImpactPreviewChart 
                students={transformedRankings}
                currentSettings={settings}
                newSettings={tempSettings}
                compact
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reset" className="space-y-6">
          <ResetSystemPanel 
            settings={settings}
            onUpdate={updateSettings}
            onReset={handleResetPoints}
            resetting={resetting}
            totalStudents={totalStudents}
            totalPoints={totalPoints}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de Resets</CardTitle>
              <CardDescription>
                Últimos 10 resets de pontuação executados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {resetHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum reset foi executado ainda</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {resetHistory.map((reset) => (
                    <div key={reset.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant={reset.reset_type === 'manual' ? 'default' : 'secondary'}>
                            {reset.reset_type === 'manual' ? 'Manual' : 'Automático'}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(reset.reset_date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <div className="text-right text-sm">
                          <div className="font-medium">{reset.affected_students} alunos</div>
                          <div className="text-muted-foreground">{reset.total_points_reset.toLocaleString()} pontos</div>
                        </div>
                      </div>
                      
                      {reset.reason && (
                        <div className="text-sm">
                          <span className="font-medium">Motivo:</span> {reset.reason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};