import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useStudentReports } from '@/hooks/useStudentReports';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Download, TrendingUp, Target, Activity, Award } from 'lucide-react';

interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId?: string;
  studentName?: string;
}

export default function ReportsModal({ isOpen, onClose, studentId, studentName }: ReportsModalProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'semana' | 'mes' | 'semestre'>('mes');
  const { 
    metrics, 
    progressData, 
    loading, 
    exportReport 
  } = useStudentReports(studentId, selectedPeriod);

  if (!studentId || !studentName) {
    return null;
  }

  const handleExport = () => {
    exportReport(studentName);
  };

  // Preparar dados para gráficos
  const recentProgressData = progressData.slice(-7); // últimos 7 dias

  const revenueData = [
    { name: 'Jan', value: 4500, clients: 35 },
    { name: 'Fev', value: 5200, clients: 42 },
    { name: 'Mar', value: 4800, clients: 38 },
    { name: 'Abr', value: 6100, clients: 48 },
    { name: 'Mai', value: 5800, clients: 45 },
    { name: 'Jun', value: 7500, clients: 58 },
  ];

  const planDistribution = [
    { name: 'Básico', value: 40, color: '#8884d8' },
    { name: 'Premium', value: 35, color: '#82ca9d' },
    { name: 'VIP', value: 25, color: '#ffc658' },
  ];

  const consultationData = [
    { name: 'Seg', consultations: 12, revenue: 1800 },
    { name: 'Ter', consultations: 15, revenue: 2250 },
    { name: 'Qua', consultations: 8, revenue: 1200 },
    { name: 'Qui', consultations: 18, revenue: 2700 },
    { name: 'Sex', consultations: 22, revenue: 3300 },
    { name: 'Sáb', consultations: 10, revenue: 1500 },
    { name: 'Dom', consultations: 5, revenue: 750 },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Relatório do Aluno - {studentName}</span>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="performance">Desempenho</TabsTrigger>
            <TabsTrigger value="progress">Evolução</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total de Treinos</p>
                      <p className="text-2xl font-bold">{metrics.totalWorkouts}</p>
                    </div>
                    <Activity className="w-8 h-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Conclusão de Treinos</p>
                      <p className="text-2xl font-bold">{metrics.workoutCompletion}%</p>
                    </div>
                    <Target className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Adesão à Dieta</p>
                      <p className="text-2xl font-bold">{metrics.dietAdherence}%</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Pontos Totais</p>
                      <p className="text-2xl font-bold">{metrics.points}</p>
                    </div>
                    <Award className="w-8 h-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Progresso Semanal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={recentProgressData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tickFormatter={(date) => 
                          new Date(date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })
                        } />
                        <YAxis />
                        <Tooltip labelFormatter={(date) => 
                          new Date(date).toLocaleDateString('pt-BR')
                        } />
                        <Line 
                          type="monotone" 
                          dataKey="workouts" 
                          stroke="hsl(var(--primary))" 
                          name="Treinos"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="dietScore" 
                          stroke="hsl(var(--secondary))" 
                          name="Adesão Dieta (%)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Resumo do Aluno</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Nível Atual</span>
                      <Badge variant="secondary">Nível {metrics.level}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Registros de Progresso</span>
                      <span className="font-medium">{metrics.progressEntries}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Última Atividade</span>
                      <span className="text-sm text-muted-foreground">
                        {metrics.lastActivity ? 
                          new Date(metrics.lastActivity).toLocaleDateString('pt-BR') : 
                          'Nenhuma atividade'
                        }
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <div className="flex items-center space-x-4 mb-6">
              <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as 'semana' | 'mes' | 'semestre')}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semana">Últimos 7 dias</SelectItem>
                  <SelectItem value="mes">Últimos 30 dias</SelectItem>
                  <SelectItem value="semestre">Últimos 6 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Desempenho Detalhado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={progressData.slice(-30)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={(date) => 
                        new Date(date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })
                      } />
                      <YAxis />
                      <Tooltip labelFormatter={(date) => 
                        new Date(date).toLocaleDateString('pt-BR')
                      } />
                      <Bar dataKey="points" fill="hsl(var(--primary))" name="Pontos" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Evolução de Peso e Atividades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={progressData.filter(p => p.weight)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={(date) => 
                        new Date(date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })
                      } />
                      <YAxis />
                      <Tooltip labelFormatter={(date) => 
                        new Date(date).toLocaleDateString('pt-BR')
                      } />
                      <Line 
                        type="monotone" 
                        dataKey="weight" 
                        stroke="hsl(var(--destructive))" 
                        name="Peso (kg)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Resumo de Atividades</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Total de Treinos</span>
                      <Badge variant="secondary">{metrics.totalWorkouts}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Taxa de Conclusão</span>
                      <Badge variant={metrics.workoutCompletion >= 80 ? "default" : "secondary"}>
                        {metrics.workoutCompletion}%
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Adesão à Dieta</span>
                      <Badge variant={metrics.dietAdherence >= 80 ? "default" : "secondary"}>
                        {metrics.dietAdherence}%
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Estatísticas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-primary">{metrics.level}</p>
                      <p className="text-sm text-muted-foreground">Nível Atual</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-secondary">{metrics.points}</p>
                      <p className="text-sm text-muted-foreground">Pontos Totais</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
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