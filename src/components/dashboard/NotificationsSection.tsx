import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Bell,
  Users,
  Eye,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  BarChart3,
  Bot,
  Zap,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, AreaChart, Area, CartesianGrid, Tooltip } from "recharts";
import NotificationForm from "@/components/notifications/NotificationForm";
import NotificationDetailsModal from "@/components/notifications/NotificationDetailsModal";
import NotificationAnalyticsModal from "@/components/notifications/NotificationAnalyticsModal";
import NotificationAutomationModal from "@/components/notifications/NotificationAutomationModal";
import { NotificationStatusCard } from "@/components/dashboard/NotificationStatusCard";
import { supabase } from "@/integrations/supabase/client";

import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useOneSignal } from "@/hooks/useOneSignal";

const IS_DEV = import.meta.env.DEV;
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function NotificationsSection() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isAutomationOpen, setIsAutomationOpen] = useState(false);

  const { campaigns, fetchCampaigns, loading } = usePushNotifications();
  const { isInitialized, playerId, loading: oneSignalLoading, requestPermission } = useOneSignal();
  const [deviceStats, setDeviceStats] = useState({ activeDevices: 0, totalStudents: 0 });

  // FASE 3: Load campaigns when component mounts (with stable dependency)
  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // FASE 3: Fetch real device stats (interval aumentado para 5 minutos)
  useEffect(() => {
    const fetchDeviceStats = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: students } = await supabase.from("students").select("user_id").eq("teacher_id", user.id);

      if (students) {
        const studentIds = students.map((s) => s.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("onesignal_player_id, push_token")
          .in("id", studentIds);

        const active = profiles?.filter((p) => p.onesignal_player_id || p.push_token).length || 0;
        setDeviceStats({ activeDevices: active, totalStudents: studentIds.length });
      }
    };

    fetchDeviceStats();
    // Aumentado de 30s para 5 minutos para reduzir carga
    const interval = setInterval(fetchDeviceStats, 300000);
    return () => clearInterval(interval);
  }, []);

  // Helper function to calculate open rate safely
  const calculateOpenRate = (interactions: number, sent: number): number => {
    if (!sent || sent === 0) return 0;
    return Number(((interactions / sent) * 100).toFixed(1));
  };

  // Calculate real statistics (linha 67)
  const stats = {
    totalNotifications: campaigns.reduce((sum, camp) => sum + camp.sent_count, 0),
    openRate: calculateOpenRate(
      campaigns.reduce((sum, camp) => sum + camp.opened_count, 0),
      campaigns.reduce((sum, camp) => sum + camp.sent_count, 0),
    ),
    activeDevices: deviceStats.activeDevices,
    totalStudents: deviceStats.totalStudents,
  };

  // Prepare chart data from campaigns
  const chartData = campaigns.slice(0, 7).map((campaign) => ({
    name: campaign.title?.substring(0, 15) || 'Sem título',
    sent: campaign.sent_count || 0,
    interactions: campaign.opened_count || 0,
  }));

  const handleViewDetails = (campaign: any) => {
    setSelectedCampaign(campaign);
    setIsDetailsOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "scheduled":
        return <Clock className="w-4 h-4 text-blue-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Dashboard de Notificações</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Gerencie e acompanhe o desempenho das suas campanhas de notificação
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAnalyticsOpen(true)}
            className="border-border text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Analytics</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAutomationOpen(true)}
            className="border-border text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30"
          >
            <Bot className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Automações</span>
          </Button>

          <Button
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            onClick={() => setIsFormOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Nova Notificação</span>
            <span className="sm:hidden">Nova</span>
          </Button>
        </div>
      </div>

      {/* Conexão OneSignal automática em background */}

      {/* Notification Status Overview */}
      <NotificationStatusCard />

      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <Card className="bg-card border-border p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Dispositivos Ativos</p>
              <p className="text-2xl font-bold text-foreground">{stats.activeDevices.toLocaleString()}</p>
              <div className="flex items-center space-x-2 mt-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground text-sm">
                  {stats.activeDevices} de {stats.totalStudents} alunos conectados
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </Card>

        <Card className="bg-card border-border p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Notificações Enviadas</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalNotifications.toLocaleString()}</p>
              <div className="flex items-center space-x-2 mt-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground text-sm">
                  {campaigns.filter((c) => c.status === "sent").length} campanhas enviadas
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Bell className="w-6 h-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="bg-card border-border p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Taxa de Abertura</p>
              <p className="text-2xl font-bold text-foreground">{stats.openRate}%</p>
              <div className="flex items-center space-x-2 mt-2">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground text-sm">
                  {campaigns.reduce((sum, camp) => sum + camp.opened_count, 0)} aberturas totais
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Eye className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* Performance Chart */}
      <Card className="bg-card border-border p-4 md:p-6">
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Performance das Campanhas</h3>
            <p className="text-muted-foreground text-sm">Enviados vs Interações - Últimos 7 dias</p>
          </div>
        </div>

        {chartData.some((d) => d.sent > 0) ? (
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorInteractions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} className="text-muted-foreground" />
                <YAxis axisLine={false} tickLine={false} className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sent"
                  stackId="1"
                  stroke="hsl(var(--primary))"
                  fillOpacity={1}
                  fill="url(#colorSent)"
                  name="Enviadas"
                />
                <Area
                  type="monotone"
                  dataKey="interactions"
                  stackId="2"
                  stroke="#22c55e"
                  fillOpacity={1}
                  fill="url(#colorInteractions)"
                  name="Interações"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState
            icon={<TrendingUp className="w-12 h-12" />}
            title="Nenhum dado de performance ainda"
            description="Os gráficos de performance aparecerão aqui quando você começar a enviar notificações."
            action={{
              label: "Criar Primeira Notificação",
              onClick: () => setIsFormOpen(true),
            }}
          />
        )}

        {chartData.some((d) => d.sent > 0) && (
          <div className="flex flex-wrap items-center justify-center space-x-4 md:space-x-8 mt-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-primary rounded-full"></div>
              <span className="text-sm text-muted-foreground">Notificações Enviadas</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-muted-foreground">Interações</span>
            </div>
          </div>
        )}
      </Card>

      {/* Recent Campaigns */}
      <Card className="bg-card border-border">
        <div className="p-4 md:p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Campanhas Recentes</h3>
        </div>
        <div className="p-4 md:p-6">
          {campaigns.length === 0 ? (
            <EmptyState
              icon={<Bell className="w-12 h-12" />}
              title="Nenhuma campanha criada ainda"
              description="Crie sua primeira campanha de notificação para começar a se comunicar com seus alunos."
              action={{
                label: "Criar Primeira Campanha",
                onClick: () => setIsFormOpen(true),
              }}
            />
          ) : (
            <div className="space-y-2">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-3 md:p-4 bg-muted/50 rounded-lg space-y-3 md:space-y-0"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{campaign.title}</h4>
                    <div className="flex flex-wrap items-center space-x-4 mt-2 text-sm text-muted-foreground">
                      <span>Enviadas: {campaign.sent_count || 0}</span>
                      <span>Abertas: {campaign.opened_count || 0}</span>
                      <span>
                        Taxa:{" "}
                        {campaign.sent_count > 0 ? Math.round((campaign.opened_count / campaign.sent_count) * 100) : 0}%
                      </span>
                      <span>Criada: {new Date(campaign.created_at).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 self-start md:self-center">
                    <Badge
                      className={
                        campaign.status === "sent"
                          ? "bg-green-500/10 text-green-500 border-green-500/20"
                          : campaign.status === "scheduled"
                            ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                            : campaign.status === "sending"
                              ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                              : "bg-gray-500/10 text-gray-500 border-gray-500/20"
                      }
                    >
                      {campaign.status === "sent"
                        ? "Enviada"
                        : campaign.status === "scheduled"
                          ? "Agendada"
                          : campaign.status === "sending"
                            ? "Enviando"
                            : "Rascunho"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-border text-muted-foreground text-xs px-2 py-1 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                      onClick={() => handleViewDetails(campaign)}
                    >
                      Ver Detalhes
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Notification Form Modal */}
      <NotificationForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} />

      {/* Notification Details Modal */}
      <NotificationDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        campaign={selectedCampaign}
      />

      {/* Analytics Modal */}
      <NotificationAnalyticsModal isOpen={isAnalyticsOpen} onClose={() => setIsAnalyticsOpen(false)} />

      {/* Automation Modal */}
      <NotificationAutomationModal isOpen={isAutomationOpen} onClose={() => setIsAutomationOpen(false)} />
    </div>
  );
}
