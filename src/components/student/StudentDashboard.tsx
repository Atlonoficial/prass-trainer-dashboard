import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Medal, Star, Gift, Target, Flame, Calendar, Users, Crown, Zap, Award, Dumbbell, MessageSquare } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserPoints } from '@/hooks/useUserPoints';
import { useAchievements } from '@/hooks/useAchievements';
import { StudentTrainingSection } from '@/components/dashboard/StudentTrainingSection';
import { StudentNotificationPanel } from '@/components/notifications/StudentNotificationPanel';
import { StudentFeedbackModal } from './StudentFeedbackModal';
import { StudentFeedbackHistory } from './StudentFeedbackHistory';
import { StudentChatInterface } from './StudentChatInterface';
import { useUnifiedChatSystem } from '@/hooks/useUnifiedChatSystem';
import { BannerContainer } from '@/components/banners/BannerContainer';
import { useStableUserType } from '@/hooks/useStableUserType';

export default function StudentDashboard() {
  const { user } = useAuth();
  const { rankings, loading: pointsLoading, refetch: refetchPoints } = useUserPoints(user?.id);
  const { achievements, loading: achievementsLoading } = useAchievements();
  const { unreadCount } = useUnifiedChatSystem();
  const { refreshUserType, userType, isStudent } = useStableUserType();

  // Força refresh do tipo de usuário ao carregar dashboard
  useEffect(() => {
    console.log('[StudentDashboard] 🔄 Forcing user type refresh on mount');
    refreshUserType();
  }, [refreshUserType]);
  
  // Mock user stats based on current user
  const userStats = rankings.find(r => r.user_id === user?.id) || null;
  const userAchievements = [];

  const loading = pointsLoading || achievementsLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 sm:h-56">
        <div className="animate-spin rounded-full h-7 w-7 sm:h-8 sm:w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const nextLevelPoints = Math.pow((userStats?.level || 1), 2) * 100;
  const currentLevelPoints = Math.pow((userStats?.level || 1) - 1, 2) * 100;
  const progressToNextLevel = userStats ? 
    ((userStats.total_points - currentLevelPoints) / (nextLevelPoints - currentLevelPoints)) * 100 : 0;

  const getIconComponent = (iconName: string) => {
    const icons = {
      trophy: Trophy,
      medal: Medal,
      star: Star,
      gift: Gift,
      target: Target,
      flame: Flame,
      calendar: Calendar,
      users: Users,
      crown: Crown,
      zap: Zap,
      award: Award
    };
    return icons[iconName as keyof typeof icons] || Trophy;
  };

  const getRarityColor = (rarity: string) => {
    switch(rarity) {
      case 'bronze': return 'bg-warning/20 text-warning border-warning/30';
      case 'silver': return 'bg-muted/40 text-muted-foreground border-border';
      case 'gold': return 'bg-warning/20 text-warning border-warning/30';
      case 'platinum': return 'bg-secondary/20 text-secondary border-secondary/30';
      default: return 'bg-muted/20 text-muted-foreground border-border';
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-semibold text-foreground">Painel do Aluno</h1>
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Acompanhe seu progresso, treinos e conquistas</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <StudentFeedbackModal onFeedbackSent={refetchPoints} />
          <StudentNotificationPanel />
        </div>
      </div>

      {/* Student Banners - Header placement */}
      <BannerContainer 
        placement="header" 
        maxBanners={2} 
        showDismiss={true}
        className="mb-6"
      />

      {/* Main Tabs */}
      <Tabs defaultValue="overview" className="space-y-3 sm:space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-auto p-0.5">
          <TabsTrigger value="overview" className="gap-1 flex-col sm:flex-row py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs">
            <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="leading-tight">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="training" className="gap-1 flex-col sm:flex-row py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs">
            <Dumbbell className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="leading-tight">Treinos</span>
          </TabsTrigger>
          <TabsTrigger value="achievements" className="gap-1 flex-col sm:flex-row py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs">
            <Medal className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="leading-tight">Conquistas</span>
          </TabsTrigger>
          <TabsTrigger value="chat" className="gap-1 flex-col sm:flex-row py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs relative">
            <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="leading-tight">Mensagens</span>
            {unreadCount > 0 && (
              <Badge className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground h-4 w-4 flex items-center justify-center p-0 text-[9px]">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="feedback" className="gap-1 flex-col sm:flex-row py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs">
            <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="leading-tight">Feedbacks</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3 sm:space-y-4">

      {/* Personal Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
        <Card className="bg-card border-border p-3 sm:p-3.5 lg:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-muted-foreground text-[10px] sm:text-xs leading-tight">Nível Atual</p>
              <p className="text-lg sm:text-xl lg:text-xl font-bold text-foreground mt-0.5">{userStats?.level || 0}</p>
              <div className="flex items-center space-x-1 mt-1">
                <Zap className="w-3 h-3 text-warning flex-shrink-0" />
                <span className="text-warning text-[10px] sm:text-xs truncate leading-tight">
                  {Math.round(progressToNextLevel)}% próximo
                </span>
              </div>
            </div>
            <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 bg-warning/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Crown className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-warning" />
            </div>
          </div>
        </Card>

        <Card className="bg-card border-border p-3 sm:p-3.5 lg:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-muted-foreground text-[10px] sm:text-xs leading-tight">Total de Pontos</p>
              <p className="text-lg sm:text-xl lg:text-xl font-bold text-foreground mt-0.5">{userStats?.total_points || 0}</p>
              <div className="flex items-center space-x-1 mt-1">
                <Star className="w-3 h-3 text-success flex-shrink-0" />
                <span className="text-success text-[10px] sm:text-xs leading-tight">Pontos acumulados</span>
              </div>
            </div>
            <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 bg-success/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Star className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-success" />
            </div>
          </div>
        </Card>

        <Card className="bg-card border-border p-3 sm:p-3.5 lg:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-muted-foreground text-[10px] sm:text-xs leading-tight">Conquistas</p>
              <p className="text-lg sm:text-xl lg:text-xl font-bold text-foreground mt-0.5">{userAchievements?.length || 0}</p>
              <div className="flex items-center space-x-1 mt-1">
                <Medal className="w-3 h-3 text-info flex-shrink-0" />
                <span className="text-info text-[10px] sm:text-xs leading-tight">Badges desbloqueadas</span>
              </div>
            </div>
            <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 bg-info/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Medal className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-info" />
            </div>
          </div>
        </Card>

        <Card className="bg-card border-border p-3 sm:p-3.5 lg:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-muted-foreground text-[10px] sm:text-xs leading-tight">Sequência</p>
              <p className="text-lg sm:text-xl lg:text-xl font-bold text-foreground mt-0.5">{userStats?.current_streak || 0}</p>
              <div className="flex items-center space-x-1 mt-1">
                <Flame className="w-3 h-3 text-destructive flex-shrink-0" />
                <span className="text-destructive text-[10px] sm:text-xs leading-tight">Dias consecutivos</span>
              </div>
            </div>
            <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 bg-destructive/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Flame className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-destructive" />
            </div>
          </div>
        </Card>
      </div>

      {/* Progress to Next Level */}
      <Card className="bg-card border-border p-3 sm:p-3.5 lg:p-4">
        <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-xs sm:text-sm lg:text-base font-semibold text-foreground leading-tight">Progresso para o Próximo Nível</h3>
            <p className="text-muted-foreground text-[10px] sm:text-xs mt-0.5">
              Nível {userStats?.level || 1} → Nível {(userStats?.level || 1) + 1}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-base sm:text-lg lg:text-xl font-bold text-foreground">{userStats?.total_points || 0}</p>
            <p className="text-muted-foreground text-[10px] sm:text-xs">de {nextLevelPoints}</p>
          </div>
        </div>
        <Progress value={progressToNextLevel} className="h-2 sm:h-2.5 mb-1.5 sm:mb-2" />
        <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground">
          <span>{currentLevelPoints}</span>
          <span className="hidden sm:inline">Faltam {nextLevelPoints - (userStats?.total_points || 0)}</span>
          <span className="sm:hidden">-{nextLevelPoints - (userStats?.total_points || 0)}</span>
          <span>{nextLevelPoints}</span>
        </div>
      </Card>

      {/* Recent Achievements */}
      <Card className="bg-card border-border p-3 sm:p-3.5 lg:p-4">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <h3 className="text-xs sm:text-sm lg:text-base font-semibold text-foreground">Minhas Conquistas</h3>
          <Badge variant="secondary" className="bg-muted/20 text-muted-foreground text-[10px] sm:text-xs px-1.5 py-0.5">
            {userAchievements?.length || 0}
          </Badge>
        </div>
        
        {!userAchievements || userAchievements.length === 0 ? (
          <div className="text-center py-6 sm:py-8">
            <Trophy className="w-12 h-12 sm:w-14 sm:h-14 text-muted-foreground mx-auto mb-3 sm:mb-4" />
            <h4 className="text-sm sm:text-base font-medium text-foreground mb-1 sm:mb-2">Nenhuma conquista ainda</h4>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Continue treinando para desbloquear suas primeiras conquistas!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
            {userAchievements.slice(0, 6).map((achievement) => {
              const IconComponent = getIconComponent(achievement.icon || 'trophy');
              
              return (
                <div
                  key={achievement.id}
                  className="bg-muted/10 border border-border rounded-lg p-2 sm:p-2.5 lg:p-3 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-start space-x-2 sm:space-x-2.5">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-warning/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <IconComponent className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-warning" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5 sm:mb-1 gap-1">
                        <h4 className="text-xs sm:text-sm font-medium text-foreground truncate">
                          {achievement.title}
                        </h4>
                        <Badge 
                          className={`text-[9px] sm:text-xs px-1 py-0 ${getRarityColor(achievement.rarity || 'bronze')}`}
                        >
                          {achievement.rarity}
                        </Badge>
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 sm:mb-1.5 line-clamp-2">
                        {achievement.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] sm:text-xs text-success font-medium">
                          +{achievement.points_earned}
                        </span>
                        <span className="text-[9px] sm:text-[10px] text-muted-foreground">
                          {new Date(achievement.earned_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {userAchievements && userAchievements.length > 6 && (
          <div className="text-center mt-2 sm:mt-3">
            <Button variant="outline" size="sm" className="h-8 text-xs">
              Ver Todas ({userAchievements.length})
            </Button>
          </div>
        )}
      </Card>

      {/* Activity Streak */}
      <Card className="bg-card border-border p-3 sm:p-3.5 lg:p-4">
        <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-xs sm:text-sm lg:text-base font-semibold text-foreground leading-tight">Sequência de Atividades</h3>
            <p className="text-muted-foreground text-[10px] sm:text-xs mt-0.5">
              Mantenha sua constância para ganhar mais pontos
            </p>
          </div>
          <div className="text-center flex-shrink-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-1 sm:mb-1.5">
              <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-destructive" />
            </div>
            <p className="text-base sm:text-lg lg:text-xl font-bold text-foreground leading-tight">{userStats?.current_streak || 0}</p>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground">dias</p>
          </div>
        </div>
        
        <div className="space-y-1.5 sm:space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs sm:text-sm text-muted-foreground">Sequência atual</span>
            <span className="text-xs sm:text-sm font-medium text-foreground">
              {userStats?.current_streak || 0} dias
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs sm:text-sm text-muted-foreground">Melhor sequência</span>
            <span className="text-xs sm:text-sm font-medium text-foreground">
              {userStats?.current_streak || 0} dias
            </span>
          </div>
          
          {(userStats?.current_streak || 0) >= 7 && (
            <div className="bg-success/10 border border-success/20 rounded-lg p-2 sm:p-2.5 mt-2 sm:mt-3">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <Trophy className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-success flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-success">
                  Parabéns! Sequência de {userStats?.current_streak} dias! 🔥
                </span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Student Banners - Between sections */}
      <BannerContainer 
        placement="between-sections" 
        maxBanners={1} 
        showDismiss={true}
        className="mt-6"
      />
        </TabsContent>

        <TabsContent value="training">
          <StudentTrainingSection />
        </TabsContent>

        <TabsContent value="achievements" className="space-y-6">
          {/* Recent Achievements */}
          <Card className="bg-card border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Minhas Conquistas</h3>
              <Badge variant="secondary" className="bg-muted/20 text-muted-foreground">
                {userAchievements?.length || 0} total
              </Badge>
            </div>
            
            {!userAchievements || userAchievements.length === 0 ? (
              <div className="text-center py-8">
                <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-medium text-foreground mb-2">Nenhuma conquista ainda</h4>
                <p className="text-muted-foreground">
                  Continue treinando para desbloquear suas primeiras conquistas!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {userAchievements.slice(0, 6).map((achievement) => {
                  const IconComponent = getIconComponent(achievement.icon || 'trophy');
                  
                  return (
                    <div
                      key={achievement.id}
                      className="bg-muted/10 border border-border rounded-lg p-4 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
                          <IconComponent className="w-5 h-5 text-warning" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-sm font-medium text-foreground">
                              {achievement.title}
                            </h4>
                            <Badge 
                              className={`text-xs ${getRarityColor(achievement.rarity || 'bronze')}`}
                            >
                              {achievement.rarity}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            {achievement.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-success font-medium">
                              +{achievement.points_earned} pontos
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(achievement.earned_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {userAchievements && userAchievements.length > 6 && (
              <div className="text-center mt-4">
                <Button variant="outline" size="sm">
                  Ver Todas as Conquistas ({userAchievements.length})
                </Button>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="chat">
          <StudentChatInterface />
        </TabsContent>

        <TabsContent value="feedback">
          <StudentFeedbackHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}