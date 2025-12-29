import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  User, 
  Calendar,
  Target, 
  Activity, 
  FileText, 
  Dumbbell, 
  Apple, 
  MessageSquare,
  TrendingUp,
  Clock,
  ArrowRight,
  AlertCircle
} from 'lucide-react';

import { useEffect, useState } from 'react';
import { useSupabaseProfile } from '@/hooks/useSupabaseProfile';
import { useWorkoutPlans } from '@/hooks/useWorkoutPlans';
import { useMealPlans } from '@/hooks/useMealPlans';
import { useAppointments } from '@/hooks/useAppointments';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getExpirationDisplay } from '@/lib/studentUtils';
import { Student } from '@/types/student';

interface QuickViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onOpenTraining?: () => void;
  onOpenAnamnesis?: () => void;
  onOpenConsulting?: () => void;
  onOpenDiet?: () => void;
  onOpenFullProfile?: () => void;
  onSendMessage?: () => void;
  onScheduleConsultation?: () => void;
  onViewProgress?: () => void;
  onGenerateReport?: () => void;
  onEditStudent?: () => void; // Novo callback para editar
}

export default function QuickViewModal({ 
  isOpen, 
  onClose, 
  student,
  onOpenTraining,
  onOpenAnamnesis,
  onOpenConsulting,
  onOpenDiet,
  onOpenFullProfile,
  onSendMessage,
  onScheduleConsultation,
  onViewProgress,
  onGenerateReport,
  onEditStudent
}: QuickViewModalProps) {
  if (!student) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ativo': return 'bg-green-400/10 text-green-400 border-green-400/20';
      case 'Inativo': return 'bg-red-400/10 text-red-400 border-red-400/20';
      case 'Suspenso': return 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20';
      default: return 'bg-gray-400/10 text-gray-400 border-gray-400/20';
    }
  };

  // Dados reais do Supabase com validação
  const { profile, loading: loadingProfile } = useSupabaseProfile(student?.user_id);
  const { 
    workoutPlans: allTrainingPlans, 
    getActiveWorkoutPlansByStudent, 
    loading: loadingTraining,
    error: errorTraining
  } = useWorkoutPlans();
  const { mealPlans, loading: loadingDiet, error: errorDiet } = useMealPlans({ 
    studentId: student?.user_id,
    autoFetch: !!student?.user_id 
  });
  const { appointments: allAppointments } = useAppointments();

  // Filtrar planos específicos do estudante com fallback seguro
  const trainingPlans = student?.user_id ? getActiveWorkoutPlansByStudent(student.user_id) : [];

  const studentAppointments = student.user_id
    ? allAppointments.filter((a) => a.student_id === student.user_id)
    : [];

  const [hasEvaluation, setHasEvaluation] = useState<boolean>(false);
  const [lastActivity, setLastActivity] = useState<string>('—');
  const [loadingEvaluation, setLoadingEvaluation] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!student?.user_id) {
        setHasEvaluation(false);
        setLastActivity('—');
        setLoadingEvaluation(false);
        return;
      }

      try {
        setLoadingEvaluation(true);
        
        // Buscar avaliações/anamneses
        const { count } = await supabase
          .from('anamneses')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', student.user_id);
          
        if (!active) return;
        setHasEvaluation((count ?? 0) > 0);

        // Calcular última atividade
        const latestAppt = studentAppointments
          .map((a) => a.updated_at || a.created_at || a.scheduled_time)
          .filter(Boolean)
          .sort((a, b) => new Date(b as string).getTime() - new Date(a as string).getTime())[0] as string | undefined;

        if (!active) return;
        if (latestAppt) {
          setLastActivity(
            formatDistanceToNow(new Date(latestAppt), { addSuffix: true, locale: ptBR })
          );
        } else {
          setLastActivity('—');
        }
      } catch (error) {
        console.error('Erro ao buscar dados do estudante:', error);
        if (active) {
          setHasEvaluation(false);
          setLastActivity('—');
        }
      } finally {
        if (active) {
          setLoadingEvaluation(false);
        }
      }
    };
    
    run();
    return () => {
      active = false;
    };
  }, [student?.user_id, studentAppointments.length]);

  const quickStats = {
    trainingPlans: loadingTraining ? 0 : trainingPlans?.length || 0,
    dietPlans: loadingDiet ? 0 : mealPlans?.filter(p => p.status === 'active')?.length || 0,
    consultations: studentAppointments?.length || 0,
    lastActivity: loadingEvaluation ? '...' : lastActivity,
    hasErrors: !!(errorTraining || errorDiet)
  } as const;

  // Loading component para estatísticas
  const StatsSkeleton = () => (
    <div className="flex items-center space-x-2">
      <Skeleton className="h-4 w-4 rounded" />
      <Skeleton className="h-4 w-20" />
    </div>
  );

  // Error fallback component
  const ErrorFallback = ({ error }: { error: string }) => (
    <div className="flex items-center space-x-2 text-destructive">
      <AlertCircle className="h-4 w-4" />
      <span className="text-sm">Erro ao carregar</span>
    </div>
  );
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Perfil do Aluno - {student.name}</span>
            </div>
            <Button 
              size="sm"
              onClick={() => {
                // Abrindo perfil completo para o aluno
                onOpenFullProfile?.();
                onClose();
              }}
            >
              <User className="w-4 h-4 mr-2" />
              Ver Perfil Completo
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Aluno */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={profile?.avatar_url ?? student.avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {student.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">{profile?.name ?? student.name}</h3>
                  <p className="text-muted-foreground">{profile?.email ?? student.email}</p>
                  <div className="flex items-center space-x-3 mt-2">
                    <Badge className={`border ${getStatusColor(student.status)}`}>
                      {student.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{student.plan}</span>
                    <span className="text-sm text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground">{student.mode}</span>
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="text-sm">
                    <span className="text-muted-foreground">Objetivo:</span> {student.goal || 'Não definido'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="text-sm">
                    <span className="text-muted-foreground">Vencimento:</span> {getExpirationDisplay(student)}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-sm">
                    <span className="text-muted-foreground">Última atividade:</span> 
                    {loadingEvaluation ? <Skeleton className="inline-block h-3 w-16 ml-1" /> : quickStats.lastActivity}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <span className="text-sm">
                    <span className="text-muted-foreground">Avaliação:</span> 
                    {loadingEvaluation ? <Skeleton className="inline-block h-3 w-16 ml-1" /> : (hasEvaluation ? 'Completa' : 'Pendente')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Acesso Rápido às Seções - ÁREA PRINCIPAL */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Dumbbell className="w-5 h-5" />
                <span>Acesso Rápido às Seções</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors border-2 hover:border-primary/50">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Dumbbell className="w-6 h-6 text-primary" />
                        </div>
                         <div>
                           <h4 className="font-semibold">Treinos</h4>
                           {loadingTraining ? (
                             <StatsSkeleton />
                           ) : errorTraining ? (
                             <ErrorFallback error={errorTraining} />
                           ) : (
                             <p className="text-sm text-muted-foreground">
                               {quickStats.trainingPlans} planos ativos
                             </p>
                           )}
                         </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => {
                          // Abrindo treinos para o aluno
                          onOpenTraining?.();
                          onClose();
                        }}
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:bg-muted/50 transition-colors border-2 hover:border-primary/50">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Apple className="w-6 h-6 text-primary" />
                        </div>
                         <div>
                           <h4 className="font-semibold">Dietas</h4>
                           {loadingDiet ? (
                             <StatsSkeleton />
                           ) : errorDiet ? (
                             <ErrorFallback error={errorDiet} />
                           ) : (
                             <p className="text-sm text-muted-foreground">
                               {quickStats.dietPlans} planos ativos
                             </p>
                           )}
                         </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => {
                          // Abrindo dieta para o aluno
                          onOpenDiet?.();
                          onClose();
                        }}
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:bg-muted/50 transition-colors border-2 hover:border-primary/50">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                          <MessageSquare className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold">Consultorias</h4>
                          <p className="text-sm text-muted-foreground">{quickStats.consultations} sessões</p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => {
                          // Abrindo consultoria para o aluno
                          onOpenConsulting?.();
                          onClose();
                        }}
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:bg-muted/50 transition-colors border-2 hover:border-primary/50">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                          <FileText className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold">Anamnese</h4>
                          <p className="text-sm text-muted-foreground">
                            {hasEvaluation ? 'Completa' : 'Pendente'}
                          </p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => {
                          // Abrindo anamnese para o aluno
                          onOpenAnamnesis?.();
                          onClose();
                        }}
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Ações Rápidas - ÁREA PRINCIPAL */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>Ações Rápidas</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline"
                  className="h-16 flex-col space-y-2 hover:bg-primary/10 hover:border-primary"
                  onClick={() => {
                    // Enviando mensagem para o aluno
                    onSendMessage?.();
                    onClose();
                  }}
                >
                  <MessageSquare className="w-6 h-6" />
                  <span>Enviar Mensagem</span>
                </Button>
                
                <Button 
                  variant="outline"
                  className="h-16 flex-col space-y-2 hover:bg-primary/10 hover:border-primary"
                  onClick={() => {
                    // Visualizando progresso do aluno
                    onViewProgress?.();
                    onClose();
                  }}
                >
                  <TrendingUp className="w-6 h-6" />
                  <span>Ver Progresso</span>
                </Button>
                
                <Button 
                  variant="outline"
                  className="h-16 flex-col space-y-2 hover:bg-primary/10 hover:border-primary"
                  onClick={() => {
                    // Gerando relatório para o aluno
                    onGenerateReport?.();
                    onClose();
                  }}
                >
                  <FileText className="w-6 h-6" />
                  <span>Gerar Relatório</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button onClick={() => {
            if (onEditStudent) {
              onEditStudent();
              onClose();
            } else {
              console.warn('onEditStudent callback não fornecido');
            }
          }}>
            <User className="w-4 h-4 mr-2" />
            Editar Aluno
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}