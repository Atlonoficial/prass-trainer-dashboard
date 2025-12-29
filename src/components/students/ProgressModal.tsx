import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useProgress } from '@/hooks/useProgress';
import { 
  TrendingUp, 
  Target, 
  Clock, 
  Apple,
  Award,
  Calendar
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  studentId?: string;
}

export default function ProgressModal({ isOpen, onClose, studentName, studentId }: ProgressModalProps) {
  const { 
    progress, 
    loading, 
    getProgressByType, 
    getLatestProgress,
    getProgressStats 
  } = useProgress(studentId);

  if (!studentId) {
    return null;
  }

  // Dados reais de progresso
  const weightProgress = getProgressByType('weight');
  const workoutProgress = getProgressByType('workout_completion');
  const dietProgress = getProgressByType('diet_adherence');
  const stats = getProgressStats();

  // Preparar dados para o gráfico
  const chartData = weightProgress.slice(0, 6).reverse().map((entry, index) => ({
    month: new Date(entry.date).toLocaleDateString('pt-BR', { month: 'short' }),
    weight: entry.value,
    workouts: workoutProgress.find(w => 
      new Date(w.date).getMonth() === new Date(entry.date).getMonth()
    )?.value || 0
  }));

  // Calcular métricas
  const latestWeight = getLatestProgress('weight');
  const latestWorkout = getLatestProgress('workout_completion');
  const latestDiet = getLatestProgress('diet_adherence');

  const progressData = {
    weightLoss: { 
      current: latestWeight?.value || 0, 
      goal: 15, 
      unit: latestWeight?.unit || 'kg' 
    },
    workoutCompletion: { 
      current: latestWorkout?.value || 0, 
      goal: 100, 
      unit: latestWorkout?.unit || '%' 
    },
    dietAdherence: { 
      current: latestDiet?.value || 0, 
      goal: 90, 
      unit: latestDiet?.unit || '%' 
    },
    frequency: { 
      weekly: stats.thisWeek, 
      goal: 5 
    }
  };

  const recentAchievements = progress.slice(0, 3).map(entry => ({
    title: `Progresso: ${entry.type}`,
    description: `${entry.value} ${entry.unit}`,
    date: new Date(entry.date).toLocaleDateString('pt-BR')
  }));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>Progresso do Aluno - {studentName}</span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : (
        <div className="space-y-6">
          {/* Métricas Principais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="w-5 h-5" />
                  <span>Perda de Peso</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-2xl font-bold">
                      {progressData.weightLoss.current}{progressData.weightLoss.unit}
                    </span>
                    <span className="text-sm text-muted-foreground ml-2">
                      de {progressData.weightLoss.goal}{progressData.weightLoss.unit}
                    </span>
                  </div>
                </div>
                <Progress 
                  value={(progressData.weightLoss.current / progressData.weightLoss.goal) * 100} 
                  className="mt-2" 
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="w-5 h-5" />
                  <span>Conclusão de Treinos</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    {progressData.workoutCompletion.current}{progressData.workoutCompletion.unit}
                  </span>
                  <Badge variant="secondary">Meta: {progressData.workoutCompletion.goal}%</Badge>
                </div>
                <Progress value={progressData.workoutCompletion.current} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Apple className="w-5 h-5" />
                  <span>Adesão à Dieta</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    {progressData.dietAdherence.current}{progressData.dietAdherence.unit}
                  </span>
                  <Badge variant="secondary">Meta: {progressData.dietAdherence.goal}%</Badge>
                </div>
                <Progress value={progressData.dietAdherence.current} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          {/* Evolução Mensal */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Evolução Mensal</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="weight" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        name="Peso (kg)"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="workouts" 
                        stroke="hsl(var(--secondary))" 
                        strokeWidth={2}
                        name="Treinos"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum dado de evolução disponível
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conquistas Recentes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Award className="w-5 h-5" />
                <span>Conquistas Recentes</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentAchievements.length > 0 ? (
                  recentAchievements.map((achievement, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
                      <Award className="w-5 h-5 text-primary mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium">{achievement.title}</h4>
                        <p className="text-sm text-muted-foreground">{achievement.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">{achievement.date}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    Nenhuma conquista recente
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        )}

        <div className="flex justify-end mt-6">
          <Button onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}