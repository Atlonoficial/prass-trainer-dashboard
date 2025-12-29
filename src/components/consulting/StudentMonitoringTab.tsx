import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProgress } from '@/hooks/useProgress';
import { useWorkoutActivities } from '@/hooks/useWorkoutActivities';
import { useWorkoutSessions } from '@/hooks/useWorkoutSessions';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Activity, Dumbbell, TrendingUp, MapPin, Clock, Zap, Heart } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StudentMonitoringTabProps {
  studentUserId: string;
  studentName: string;
}

export function StudentMonitoringTab({ studentUserId, studentName }: StudentMonitoringTabProps) {
  const { activities, loading: activitiesLoading, getActivitiesStats } = useWorkoutActivities(studentUserId);
  const { sessions, loading: sessionsLoading, getSessionsStats } = useWorkoutSessions(studentUserId);
  const { progress, loading: progressLoading, getProgressStats } = useProgress(studentUserId);

  const activitiesStats = getActivitiesStats();
  const sessionsStats = getSessionsStats();
  const progressStats = getProgressStats();

  const isLoading = activitiesLoading || sessionsLoading || progressLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
  };

  const formatDistance = (meters: number) => {
    return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-foreground">Monitoramento - {studentName}</h3>
          <p className="text-muted-foreground">Dados integrados de atividades, treinos e progresso</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atividades Externas</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activitiesStats.total}</div>
            <p className="text-xs text-muted-foreground">
              {activitiesStats.thisWeek} esta semana
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Treinos Internos</CardTitle>
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessionsStats.total}</div>
            <p className="text-xs text-muted-foreground">
              {sessionsStats.thisWeek} esta semana
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registros de Progresso</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progressStats.total}</div>
            <p className="text-xs text-muted-foreground">
              {progressStats.thisWeek} esta semana
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="activities" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="activities">Atividades Externas</TabsTrigger>
          <TabsTrigger value="sessions">Treinos Internos</TabsTrigger>
          <TabsTrigger value="progress">Progresso Físico</TabsTrigger>
        </TabsList>

        <TabsContent value="activities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Métricas de Atividades (Strava/Wearables)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {formatDistance(activitiesStats.totalDistance)}
                  </div>
                  <p className="text-sm text-muted-foreground">Distância Total</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {formatDuration(activitiesStats.totalDuration)}
                  </div>
                  <p className="text-sm text-muted-foreground">Tempo Total</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {Math.round(activitiesStats.totalCalories)}
                  </div>
                  <p className="text-sm text-muted-foreground">Calorias</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {Math.round(activitiesStats.avgHeartRate)} bpm
                  </div>
                  <p className="text-sm text-muted-foreground">FC Média</p>
                </div>
              </div>
              
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {activities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma atividade externa registrada
                  </div>
                ) : (
                  activities.slice(0, 10).map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{activity.name || activity.activity_type}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(activity.started_at), { 
                              locale: ptBR, 
                              addSuffix: true 
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <Badge variant="outline">{activity.activity_type}</Badge>
                        {activity.distance_meters && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {formatDistance(activity.distance_meters)}
                          </div>
                        )}
                        {activity.duration_seconds && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(activity.duration_seconds)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5" />
                Sessões de Treino
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {sessionsStats.completedSessions}
                  </div>
                  <p className="text-sm text-muted-foreground">Concluídos</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {formatDuration(sessionsStats.totalDuration)}
                  </div>
                  <p className="text-sm text-muted-foreground">Tempo Total</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {Math.round(sessionsStats.totalCalories)}
                  </div>
                  <p className="text-sm text-muted-foreground">Calorias</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {sessionsStats.avgRating.toFixed(1)}/5
                  </div>
                  <p className="text-sm text-muted-foreground">Avaliação</p>
                </div>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {sessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma sessão de treino registrada
                  </div>
                ) : (
                  sessions.slice(0, 10).map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Dumbbell className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">Treino</div>
                          <div className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(session.start_time), { 
                              locale: ptBR, 
                              addSuffix: true 
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <Badge variant={session.end_time ? "default" : "secondary"}>
                          {session.end_time ? "Concluído" : "Em Progresso"}
                        </Badge>
                        {session.total_duration && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(session.total_duration)}
                          </div>
                        )}
                        {session.rating && (
                          <div className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {session.rating}/5
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Progresso Físico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {progress.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum registro de progresso encontrado
                  </div>
                ) : (
                  progress.slice(0, 15).map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{entry.type}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(entry.date), { 
                              locale: ptBR, 
                              addSuffix: true 
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <Badge variant="outline">{entry.value} {entry.unit}</Badge>
                        {entry.notes && (
                          <div className="text-xs text-muted-foreground max-w-32 truncate">
                            {entry.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}