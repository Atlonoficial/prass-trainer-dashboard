import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, TrendingUp, Users, Eye, Calendar, Clock, Target, Activity, MessageSquare, ArrowUp, ArrowDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface NotificationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: {
    title: string;
    sent: number;
    opened: number;
    type: string;
    date: string;
  };
}

export default function NotificationDetailsModal({ isOpen, onClose, campaign }: NotificationDetailsModalProps) {
  if (!isOpen) return null;

  // Dados simulados para os gráficos
  const hourlyData = [
    { hour: '08:00', opens: 12, clicks: 8 },
    { hour: '09:00', opens: 25, clicks: 15 },
    { hour: '10:00', opens: 45, clicks: 32 },
    { hour: '11:00', opens: 38, clicks: 28 },
    { hour: '12:00', opens: 56, clicks: 42 },
    { hour: '13:00', opens: 42, clicks: 30 },
    { hour: '14:00', opens: 35, clicks: 25 },
    { hour: '15:00', opens: 28, clicks: 18 },
    { hour: '16:00', opens: 32, clicks: 22 },
    { hour: '17:00', opens: 25, clicks: 15 },
    { hour: '18:00', opens: 18, clicks: 12 },
    { hour: '19:00', opens: 15, clicks: 10 }
  ];

  const deviceData = [
    { name: 'Mobile', value: 68, color: 'hsl(var(--primary))' },
    { name: 'Desktop', value: 24, color: 'hsl(var(--secondary))' },
    { name: 'Tablet', value: 8, color: 'hsl(var(--info))' }
  ];

  const engagementData = [
    { name: 'Seg', interactions: 45, shares: 12 },
    { name: 'Ter', interactions: 52, shares: 18 },
    { name: 'Qua', interactions: 38, shares: 8 },
    { name: 'Qui', interactions: 61, shares: 22 },
    { name: 'Sex', interactions: 55, shares: 15 },
    { name: 'Sáb', interactions: 28, shares: 5 },
    { name: 'Dom', interactions: 35, shares: 10 }
  ];

  const openRate = Math.round((campaign.opened / campaign.sent) * 100);
  const clickRate = Math.round((campaign.opened * 0.65) / campaign.sent * 100);
  const interactions = Math.round(campaign.opened * 0.45);

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <Card className="bg-card border-border w-full max-w-7xl max-h-[95vh] overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground truncate">
                Detalhes da Campanha
              </h2>
              <p className="text-sm text-muted-foreground truncate">{campaign.title}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="overflow-y-auto max-h-[calc(95vh-140px)]">
          <div className="p-4 sm:p-6 space-y-6">
            
            {/* Resumo da Campanha */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-muted/30 border-border p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Target className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Enviadas</p>
                    <p className="text-lg font-bold text-foreground">{campaign.sent}</p>
                  </div>
                </div>
              </Card>

              <Card className="bg-muted/30 border-border p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                    <Eye className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Taxa de Abertura</p>
                    <p className="text-lg font-bold text-success">{openRate}%</p>
                  </div>
                </div>
              </Card>

              <Card className="bg-muted/30 border-border p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-info/10 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-info" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Taxa de Clique</p>
                    <p className="text-lg font-bold text-info">{clickRate}%</p>
                  </div>
                </div>
              </Card>

              <Card className="bg-muted/30 border-border p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Interações</p>
                    <p className="text-lg font-bold text-secondary">{interactions}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              
              {/* Performance por Horário */}
              <Card className="bg-card border-border p-4 sm:p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Performance por Horário</h3>
                  <p className="text-sm text-muted-foreground">Aberturas e cliques ao longo do dia</p>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={hourlyData}>
                      <defs>
                        <linearGradient id="colorOpens" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="hour" axisLine={false} tickLine={false} className="text-muted-foreground text-xs" />
                      <YAxis axisLine={false} tickLine={false} className="text-muted-foreground text-xs" />
                      <Area type="monotone" dataKey="opens" stackId="1" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorOpens)" />
                      <Area type="monotone" dataKey="clicks" stackId="2" stroke="hsl(var(--success))" fillOpacity={1} fill="url(#colorClicks)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center space-x-6 mt-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-primary rounded-full"></div>
                    <span className="text-xs text-muted-foreground">Aberturas</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-success rounded-full"></div>
                    <span className="text-xs text-muted-foreground">Cliques</span>
                  </div>
                </div>
              </Card>

              {/* Dispositivos */}
              <Card className="bg-card border-border p-4 sm:p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Distribuição por Dispositivo</h3>
                  <p className="text-sm text-muted-foreground">Como os usuários acessaram</p>
                </div>
                <div className="h-64 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deviceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        dataKey="value"
                        startAngle={90}
                        endAngle={450}
                      >
                        {deviceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {deviceData.map((device, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: device.color }}></div>
                        <span className="text-sm text-foreground">{device.name}</span>
                      </div>
                      <span className="text-sm font-medium text-foreground">{device.value}%</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Engajamento Semanal */}
              <Card className="bg-card border-border p-4 sm:p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Engajamento Semanal</h3>
                  <p className="text-sm text-muted-foreground">Interações e compartilhamentos</p>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={engagementData} barGap={10}>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} className="text-muted-foreground text-xs" />
                      <YAxis axisLine={false} tickLine={false} className="text-muted-foreground text-xs" />
                      <Bar dataKey="interactions" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="shares" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center space-x-6 mt-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-info rounded-full"></div>
                    <span className="text-xs text-muted-foreground">Interações</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-secondary rounded-full"></div>
                    <span className="text-xs text-muted-foreground">Compartilhamentos</span>
                  </div>
                </div>
              </Card>

              {/* Métricas Detalhadas */}
              <Card className="bg-card border-border p-4 sm:p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Métricas Detalhadas</h3>
                  <p className="text-sm text-muted-foreground">Análise completa da campanha</p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Clock className="w-4 h-4 text-primary" />
                      <span className="text-sm text-foreground">Tempo Médio de Leitura</span>
                    </div>
                    <span className="text-sm font-medium text-foreground">2m 34s</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <ArrowUp className="w-4 h-4 text-success" />
                      <span className="text-sm text-foreground">Taxa de Conversão</span>
                    </div>
                    <span className="text-sm font-medium text-success">12.4%</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Users className="w-4 h-4 text-info" />
                      <span className="text-sm text-foreground">Novos Seguidores</span>
                    </div>
                    <span className="text-sm font-medium text-info">+47</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <ArrowDown className="w-4 h-4 text-destructive" />
                      <span className="text-sm text-foreground">Taxa de Descadastro</span>
                    </div>
                    <span className="text-sm font-medium text-destructive">0.8%</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-4 h-4 text-secondary" />
                      <span className="text-sm text-foreground">Melhor Horário</span>
                    </div>
                    <span className="text-sm font-medium text-secondary">12:00 - 13:00</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Informações da Campanha */}
            <Card className="bg-muted/30 border-border p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Informações da Campanha</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Data de Envio</p>
                  <p className="text-base font-medium text-foreground">{campaign.date}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo de Campanha</p>
                  <Badge className={
                    campaign.type === 'reminder' ? 'bg-info/10 text-info border-info/20' :
                    campaign.type === 'feature' ? 'bg-success/10 text-success border-success/20' :
                    campaign.type === 'payment' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                    'bg-secondary/10 text-secondary border-secondary/20'
                  }>
                    {campaign.type === 'reminder' ? 'Lembrete' :
                     campaign.type === 'feature' ? 'Novidade' :
                     campaign.type === 'payment' ? 'Cobrança' : 'Motivacional'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className="bg-success/10 text-success border-success/20">
                    Concluída
                  </Badge>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div className="flex justify-end items-center gap-3 p-4 sm:p-6 border-t border-border bg-muted/30">
          <Button variant="outline" onClick={onClose} className="border-border text-foreground hover:bg-muted">
            Fechar
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Exportar Relatório
          </Button>
        </div>
      </Card>
    </div>
  );
}