import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Medal, Star, Gift, Target, Flame, Calendar, Users, Crown, Zap, Award, Coins } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useOptimizedGamification } from '@/hooks/useOptimizedGamification';
import { useUserPoints } from '@/hooks/useUserPoints';

export default function StudentGamificationView() {
  const { user } = useAuth();
  const {
    userPoints,
    userAchievements,
    availableAchievements,
    rewards,
    activities,
    redemptions,
    loading,
    redeemReward,
    getProgressToNextLevel,
    getEngagementStats
  } = useOptimizedGamification(user?.id);

  // Get rankings for the ranking tab
  const { rankings } = useUserPoints(user?.id ? undefined : user?.id);

  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Get progress information
  const progressInfo = getProgressToNextLevel;
  const engagementStats = getEngagementStats;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Progress calculation now handled by the hook

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

  const handleRedeemReward = async (rewardId: string) => {
    try {
      await redeemReward(rewardId);
    } catch (error) {
      console.error('Error redeeming reward:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
          <Trophy className="w-6 h-6 text-warning" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Centro de Gamificação</h1>
          <p className="text-muted-foreground">Seu progresso, conquistas e recompensas</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card border-border">
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="achievements" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Conquistas
          </TabsTrigger>
          <TabsTrigger value="rewards" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Recompensas
          </TabsTrigger>
          <TabsTrigger value="ranking" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Ranking
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Personal Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-card border-border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Nível Atual</p>
                  <p className="text-3xl font-bold text-foreground">{userPoints?.level || 0}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Zap className="w-4 h-4 text-warning" />
                    <span className="text-warning text-sm">
                      {Math.round(progressInfo.progress)}% para o próximo
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                  <Crown className="w-6 h-6 text-warning" />
                </div>
              </div>
            </Card>

            <Card className="bg-card border-border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Total de Pontos</p>
                  <p className="text-3xl font-bold text-foreground">{userPoints?.total_points || 0}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Star className="w-4 h-4 text-success" />
                    <span className="text-success text-sm">Pontos acumulados</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                  <Star className="w-6 h-6 text-success" />
                </div>
              </div>
            </Card>

            <Card className="bg-card border-border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Conquistas</p>
                  <p className="text-3xl font-bold text-foreground">{userAchievements?.length || 0}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Medal className="w-4 h-4 text-info" />
                    <span className="text-info text-sm">Badges desbloqueadas</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-info/10 rounded-lg flex items-center justify-center">
                  <Medal className="w-6 h-6 text-info" />
                </div>
              </div>
            </Card>

            <Card className="bg-card border-border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Sequência</p>
                  <p className="text-3xl font-bold text-foreground">{userPoints?.current_streak || 0}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Flame className="w-4 h-4 text-destructive" />
                    <span className="text-destructive text-sm">Dias consecutivos</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
                  <Flame className="w-6 h-6 text-destructive" />
                </div>
              </div>
            </Card>
          </div>

          {/* Progress to Next Level */}
          <Card className="bg-card border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Progresso para o Próximo Nível</h3>
                <p className="text-muted-foreground text-sm">
                  Nível {userPoints?.level || 1} → Nível {progressInfo.nextLevel}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-foreground">{userPoints?.total_points || 0}</p>
                <p className="text-muted-foreground text-sm">de {progressInfo.nextLevelPoints} pontos</p>
              </div>
            </div>
            <Progress value={progressInfo.progress} className="h-3 mb-2" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{progressInfo.currentLevelPoints} pontos</span>
              <span>Faltam {progressInfo.pointsNeeded} pontos</span>
              <span>{progressInfo.nextLevelPoints} pontos</span>
            </div>
          </Card>
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Unlocked Achievements */}
            <Card className="bg-card border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Conquistas Desbloqueadas ({userAchievements?.length || 0})
              </h3>
              
              {!userAchievements || userAchievements.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-foreground mb-2">Nenhuma conquista ainda</h4>
                  <p className="text-muted-foreground">
                    Continue treinando para desbloquear suas primeiras conquistas!
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {userAchievements.map((userAchievement) => {
                    const achievement = userAchievement.achievement;
                    if (!achievement) return null;
                    
                    const IconComponent = getIconComponent(achievement.icon || 'trophy');
                    
                    return (
                      <div
                        key={userAchievement.id}
                        className="bg-success/5 border border-success/20 rounded-lg p-4"
                      >
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                            <IconComponent className="w-5 h-5 text-success" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="text-sm font-medium text-foreground">
                                {achievement.title}
                              </h4>
                              <Badge className={`text-xs ${getRarityColor(achievement.rarity || 'bronze')}`}>
                                {achievement.rarity}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                              {achievement.description}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-success font-medium">
                                +{userAchievement.points_earned} pontos
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(userAchievement.earned_at).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Available Achievements */}
            <Card className="bg-card border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Conquistas Disponíveis ({availableAchievements?.length || 0})
              </h3>
              
              {!availableAchievements || availableAchievements.length === 0 ? (
                <div className="text-center py-8">
                  <Medal className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-foreground mb-2">Todas conquistadas!</h4>
                  <p className="text-muted-foreground">
                    Parabéns! Você desbloqueou todas as conquistas disponíveis.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {availableAchievements.map((achievement) => {
                    const IconComponent = getIconComponent(achievement.icon || 'trophy');
                    
                    return (
                      <div
                        key={achievement.id}
                        className="bg-muted/10 border border-border rounded-lg p-4"
                      >
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 bg-muted/20 rounded-lg flex items-center justify-center">
                            <IconComponent className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="text-sm font-medium text-foreground">
                                {achievement.title}
                              </h4>
                              <Badge className={`text-xs ${getRarityColor(achievement.rarity || 'bronze')}`}>
                                {achievement.rarity}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                              {achievement.description}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                Recompensa: {achievement.points_reward} pontos
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {achievement.condition_value} {achievement.condition_type}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Rewards Tab */}
        <TabsContent value="rewards" className="space-y-6">
          <Card className="bg-card border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Loja de Recompensas</h3>
              <div className="flex items-center space-x-2">
                <Coins className="w-5 h-5 text-warning" />
                <span className="text-lg font-semibold text-foreground">
                  {userPoints?.total_points || 0} pontos
                </span>
              </div>
            </div>
            
            {!rewards || rewards.length === 0 ? (
              <div className="text-center py-12">
                <Gift className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-medium text-foreground mb-2">Nenhuma recompensa disponível</h4>
                <p className="text-muted-foreground">
                  Seu professor ainda não configurou recompensas. Fale com ele!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rewards.map((reward) => (
                  <div
                    key={reward.id}
                    className="bg-muted/10 border border-border rounded-lg p-4 hover:bg-muted/20 transition-colors"
                  >
                    {reward.image_url && (
                      <div className="w-full h-32 bg-muted/20 rounded-lg mb-3 overflow-hidden">
                        <img 
                          src={reward.image_url} 
                          alt={reward.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    
                    <h4 className="text-sm font-medium text-foreground mb-2">
                      {reward.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      {reward.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <Coins className="w-4 h-4 text-warning" />
                        <span className="text-sm font-medium text-foreground">
                          {reward.points_cost}
                        </span>
                      </div>
                      
                      <Button
                        size="sm"
                        disabled={(userPoints?.total_points || 0) < reward.points_cost || (reward.stock && reward.stock <= 0)}
                        onClick={() => handleRedeemReward(reward.id)}
                        className="text-xs"
                      >
                        {(userPoints?.total_points || 0) < reward.points_cost ? 'Insuficiente' : 'Resgatar'}
                      </Button>
                    </div>
                    
                    {reward.stock !== null && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Estoque: {reward.stock}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Ranking Tab */}
        <TabsContent value="ranking" className="space-y-6">
          <Card className="bg-card border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Ranking Mensal</h3>
            
            {!rankings || rankings.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-medium text-foreground mb-2">Ranking não disponível</h4>
                <p className="text-muted-foreground">
                  Continue treinando para aparecer no ranking!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {rankings.map((student, index) => (
                  <div
                    key={student.user_id}
                    className={`flex items-center space-x-3 p-4 rounded-lg ${
                      student.user_id === user?.id 
                        ? 'bg-primary/10 border border-primary/20' 
                        : 'bg-muted/10 border border-border'
                    }`}
                  >
                    <div className="relative">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={student.avatar_url} alt={student.name} />
                        <AvatarFallback className="bg-muted text-muted-foreground">
                          {student.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-warning text-warning-foreground' :
                        index === 1 ? 'bg-muted text-muted-foreground' :
                        index === 2 ? 'bg-warning/60 text-warning-foreground' :
                        'bg-muted/60 text-muted-foreground'
                      }`}>
                        {student.position}
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-foreground">
                            {student.name}
                            {student.user_id === user?.id && (
                              <span className="text-primary text-sm ml-2">(Você)</span>
                            )}
                          </h4>
                          <p className="text-muted-foreground text-sm">Nível {student.level}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-foreground">{student.total_points} pts</p>
                          <div className="flex items-center space-x-1">
                            {index < 3 && (
                              <Trophy className={`w-4 h-4 ${
                                index === 0 ? 'text-warning' :
                                index === 1 ? 'text-muted-foreground' :
                                'text-warning/60'
                              }`} />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}