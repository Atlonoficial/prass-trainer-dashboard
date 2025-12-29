import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, DollarSign, Calendar, BarChart3, CheckCircle } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { BannerContainer } from "@/components/banners/BannerContainer";

import NewAppointmentModal from "@/components/schedule/NewAppointmentModal";
import TrainingPlanModal from "@/components/training/TrainingPlanModal";
import { useOverviewMetrics } from '@/hooks/useOverviewMetrics';
import { useRevenueChart } from '@/hooks/useRevenueChart';
import { useRecentActivities } from '@/hooks/useRecentActivities';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function OverviewSection() {

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isTrainingModalOpen, setIsTrainingModalOpen] = useState(false);

  // Função para navegar para outras seções
  const navigateToSection = (sectionId: string) => {
    const event = new CustomEvent('navigateToSection', { detail: { sectionId } });
    window.dispatchEvent(event);
  };

  const {
    activeStudents,
    monthlyRevenue,
    scheduledConsultations,
    monthlyEvaluations,
    loading
  } = useOverviewMetrics();

  const { chartData, loading: chartLoading } = useRevenueChart();
  const { activities, loading: activitiesLoading } = useRecentActivities();

  // Keyboard shortcuts for accessibility
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '2') {
        e.preventDefault();
        setIsScheduleModalOpen(true);
      }
      if (e.ctrlKey && e.key === '3') {
        e.preventDefault();
        setIsTrainingModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, []);

  if (loading) {
    return (
      <div className="space-y-3 sm:space-y-4 lg:space-y-5 animate-fade-in">
        {/* Header skeleton */}
        <div className="space-y-2">
          <div className="h-8 sm:h-10 bg-muted/30 rounded-lg w-48 animate-pulse"></div>
          <div className="h-3 sm:h-4 bg-muted/20 rounded w-96 animate-pulse"></div>
        </div>

        {/* Metrics skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border p-3 sm:p-4 lg:p-5 rounded-lg animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 bg-muted/30 rounded-xl"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-2.5 sm:h-3 bg-muted/30 rounded w-24"></div>
                  <div className="h-6 sm:h-7 bg-muted/30 rounded w-16"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className="bg-card border border-border p-4 sm:p-5 rounded-lg animate-pulse">
            <div className="h-5 sm:h-6 bg-muted/30 rounded w-48 mb-4"></div>
            <div className="h-48 sm:h-56 lg:h-64 bg-gradient-to-t from-muted/20 to-muted/30 rounded-lg"></div>
          </div>
          <div className="bg-card border border-border p-4 sm:p-5 rounded-lg animate-pulse">
            <div className="h-5 sm:h-6 bg-muted/30 rounded w-40 mb-4"></div>
            <div className="space-y-2.5 sm:space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 sm:h-16 bg-muted/20 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick actions skeleton */}
        <div className="bg-card border border-border p-4 sm:p-5 rounded-lg animate-pulse">
          <div className="h-5 sm:h-6 bg-muted/30 rounded w-32 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 sm:h-32 bg-muted/20 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-100 tracking-tight">
            Visão Geral
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Acompanhe suas métricas e atividades em tempo real
          </p>
        </div>
      </div>

      {/* Teacher Banners - Header placement */}
      <BannerContainer
        placement="header"
        maxBanners={2}
        showDismiss={true}
        className="mb-6"
      />

      {/* Key Metrics */}
      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-card border-border p-4 hover:shadow-xl hover:bg-neutral-800/70 hover:border-success/40 transition-all duration-300 group">
          <CardContent className="p-0">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 p-2 bg-success/10 rounded-lg group-hover:bg-success/20 transition-colors">
                <Users className="w-5 h-5 text-success group-hover:scale-110 transition-transform" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
                  Alunos Ativos
                </p>
                <p className="text-xl font-bold text-gray-100">
                  {activeStudents}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border p-4 hover:shadow-xl hover:bg-neutral-800/70 hover:border-warning/40 transition-all duration-300 group">
          <CardContent className="p-0">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 p-2 bg-warning/10 rounded-lg group-hover:bg-warning/20 transition-colors">
                <DollarSign className="w-5 h-5 text-warning group-hover:scale-110 transition-transform" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
                  Faturamento Mensal
                </p>
                <p className="text-xl font-bold text-gray-100 truncate">
                  R$ {monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border p-4 hover:shadow-xl hover:bg-neutral-800/70 hover:border-info/40 transition-all duration-300 group">
          <CardContent className="p-0">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 p-2 bg-info/10 rounded-lg group-hover:bg-info/20 transition-colors">
                <Calendar className="w-5 h-5 text-info group-hover:scale-110 transition-transform" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
                  Consultas Agendadas
                </p>
                <p className="text-xl font-bold text-gray-100">
                  {scheduledConsultations}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border p-4 hover:shadow-xl hover:bg-neutral-800/70 hover:border-primary/40 transition-all duration-300 group">
          <CardContent className="p-0">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                <CheckCircle className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
                  Avaliações do Mês
                </p>
                <p className="text-xl font-bold text-gray-100">
                  {monthlyEvaluations}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Student Banners - Between sections */}
      <BannerContainer
        placement="between-sections"
        maxBanners={1}
        showDismiss={true}
        className="my-6"
      />

      {/* Chart Section */}
      {/* Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-border p-4 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-100">Evolução do Faturamento</h3>
            <div className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
              Últimos 6 meses
            </div>
          </div>
          <div className="h-48 sm:h-56">
            {chartLoading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/3"></div>
                <div className="h-48 bg-gradient-to-t from-muted/50 to-muted rounded-lg"></div>
                <div className="flex justify-between">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-3 bg-muted rounded w-12"></div>
                  ))}
                </div>
              </div>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `R$${value}`}
                  />
                  <Tooltip
                    formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Faturamento']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full space-y-3">
                <div className="w-12 h-12 bg-muted/30 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <div className="text-center max-w-xs">
                  <p className="text-sm font-medium text-gray-200 mb-0.5">Sem dados</p>
                  <p className="text-xs text-muted-foreground">
                    Registre receitas para ver o gráfico
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateToSection('payments')}
                  className="mt-1 h-7 text-xs"
                >
                  Registrar
                </Button>
              </div>
            )}
          </div>
        </Card>

        <Card className="bg-card border-border p-4 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-100">Atividades Recentes</h3>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-primary hover:text-primary/80 h-6 px-2"
              onClick={() => navigateToSection('activities')}
            >
              Ver todas →
            </Button>
          </div>
          <div className="h-48 sm:h-56 overflow-y-auto custom-scrollbar pr-2">
            {activitiesLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-start space-x-3 p-2 bg-muted/30 rounded-lg animate-pulse">
                    <div className="w-2 h-2 bg-muted rounded-full mt-2"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-muted rounded w-3/4"></div>
                      <div className="h-2 bg-muted rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : activities.length > 0 ? (
              <div className="space-y-2">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start space-x-3 p-2 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                  >
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 shadow-sm ${activity.type === 'payment' ? 'bg-warning shadow-warning/50' :
                      activity.type === 'appointment' ? 'bg-info shadow-info/50' :
                        activity.type === 'feedback' ? 'bg-success shadow-success/50' :
                          'bg-primary shadow-primary/50'
                      }`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-200 group-hover:text-gray-100 transition-colors line-clamp-1">
                        {activity.description}
                      </p>
                      {activity.studentName && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {activity.studentName}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full space-y-3">
                <div className="w-12 h-12 bg-muted/30 rounded-full flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <div className="text-center max-w-xs">
                  <p className="text-sm font-medium text-gray-200 mb-0.5">Nenhuma atividade</p>
                  <p className="text-xs text-muted-foreground">
                    Suas atividades aparecerão aqui
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-card border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-100">Ações Rápidas</h3>
          <p className="text-[10px] text-muted-foreground hidden md:block">
            Atalhos para tarefas comuns
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button
            onClick={() => setIsScheduleModalOpen(true)}
            variant="ghost"
            className="flex flex-col items-center justify-center p-3 h-auto min-h-[80px] bg-gradient-to-br from-info/5 to-info/10 hover:from-info/10 hover:to-info/20 border border-info/20 hover:border-info/40 transition-all duration-300 group rounded-lg hover-scale focus-visible:ring-2 focus-visible:ring-info focus-visible:ring-offset-2"
            aria-label="Agendar nova consulta"
          >
            <div className="w-8 h-8 bg-info/10 rounded-full flex items-center justify-center mb-2 group-hover:bg-info/20 transition-colors">
              <Calendar className="w-4 h-4 text-info group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-xs font-semibold text-gray-100">Agendar Consulta</span>
            <span className="text-[10px] text-muted-foreground mt-0.5">Marcar horário • Ctrl+2</span>
          </Button>

          <Button
            onClick={() => setIsTrainingModalOpen(true)}
            variant="ghost"
            className="flex flex-col items-center justify-center p-3 h-auto min-h-[80px] bg-gradient-to-br from-warning/5 to-warning/10 hover:from-warning/10 hover:to-warning/20 border border-warning/20 hover:border-warning/40 transition-all duration-300 group rounded-lg hover-scale focus-visible:ring-2 focus-visible:ring-warning focus-visible:ring-offset-2"
            aria-label="Criar novo plano de treino"
          >
            <div className="w-8 h-8 bg-warning/10 rounded-full flex items-center justify-center mb-2 group-hover:bg-warning/20 transition-colors">
              <BarChart3 className="w-4 h-4 text-warning group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-xs font-semibold text-gray-100">Criar Treino</span>
            <span className="text-[10px] text-muted-foreground mt-0.5">Novo programa • Ctrl+3</span>
          </Button>
        </div>
      </Card>

      {/* Bottom Banners */}
      <BannerContainer
        placement="sidebar"
        maxBanners={1}
        showDismiss={true}
        className="mt-6"
      />

      {/* Modais Funcionais */}
      <NewAppointmentModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
      />

      <TrainingPlanModal
        isOpen={isTrainingModalOpen}
        onClose={() => setIsTrainingModalOpen(false)}
        studentName=""
        studentId=""
      />
    </div>
  );
}