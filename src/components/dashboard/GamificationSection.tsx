import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Medal, Star, Gift, Target, Flame, Calendar, Users, Plus, Edit, Trash2, Coins, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserPoints } from '@/hooks/useUserPoints';
import { useOptimizedGamification } from '@/hooks/useOptimizedGamification';
import { supabase } from '@/integrations/supabase/client';
import { Check, X, Clock, MessageSquare } from 'lucide-react';
import { useGamificationFilters } from '@/hooks/useGamificationFilters';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ImageUpload } from '@/components/ui/image-upload';
import { FilterBar } from '@/components/gamification/FilterBar';
import { GamificationSettingsTab } from '@/components/gamification/GamificationSettingsTab';
import { RedemptionManagementPanel } from '@/components/gamification/RedemptionManagementPanel';
import { useRewards } from '@/hooks/useRewards';

export default function GamificationSection() {
  const { user } = useAuth();
  const { rankings, loading: rankingsLoading, getEngagementStats } = useUserPoints(user?.id);
  const { 
    userAchievements,
    availableAchievements,
    rewards,
    loading: gamificationLoading,
    awardPoints,
    redeemReward,
    getRarityColor,
    getRarityBg,
    getActivityTypeLabel,
    refetch,
    clearCache
  } = useOptimizedGamification(user?.id);
  
  // Add useRewards hook for teacher-specific functionality
  const {
    redemptions: teacherRedemptions,
    updateRedemptionStatus: updateRedemptionStatusFromHook,
    deleteRedemption,
    loading: rewardsLoading
  } = useRewards();
  const {
    studentFilters,
    achievementFilters,
    rewardFilters,
    filterStudents,
    filterAchievements,
    filterRewards,
    setStudentFilters,
    setAchievementFilters,
    setRewardFilters,
    clearStudentFilters,
    clearAchievementFilters,
    clearRewardFilters,
  } = useGamificationFilters();
  
  const [activeTab, setActiveTab] = useState('students');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isAddAchievementOpen, setIsAddAchievementOpen] = useState(false);
  const [isEditAchievementOpen, setIsEditAchievementOpen] = useState(false);
  const [isAddRewardOpen, setIsAddRewardOpen] = useState(false);
  const [isEditRewardOpen, setIsEditRewardOpen] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<any>(null);
  const [editingReward, setEditingReward] = useState<any>(null);
  const [achievementToDelete, setAchievementToDelete] = useState<string | null>(null);
  const [rewardToDelete, setRewardToDelete] = useState<string | null>(null);
  const [newAchievement, setNewAchievement] = useState({
    title: '',
    description: '',
    rarity: 'bronze',
    points_reward: 50,
    icon: 'trophy',
    condition_type: 'training_count',
    condition_value: 1
  });
  const [newReward, setNewReward] = useState({
    title: '',
    description: '',
    points_cost: 500,
    stock: undefined as number | undefined,
    image_url: ''
  });

  const loading = rankingsLoading || gamificationLoading;
  const stats = getEngagementStats();

  // Apply filters
  const filteredStudents = filterStudents(rankings);
  const filteredAchievements = filterAchievements(availableAchievements);
  const filteredRewards = filterRewards(rewards);

  const handleFiltersChange = (tab: string, filters: any) => {
    switch(tab) {
      case 'students':
        setStudentFilters(filters);
        break;
      case 'achievements':
        setAchievementFilters(filters);
        break;
      case 'rewards':
        setRewardFilters(filters);
        break;
      case 'redemptions':
        // No filters for redemptions tab yet
        break;
    }
  };

  const handleClearFilters = (tab: string) => {
    switch(tab) {
      case 'students':
        clearStudentFilters();
        break;
      case 'achievements':
        clearAchievementFilters();
        break;
      case 'rewards':
        clearRewardFilters();
        break;
      case 'redemptions':
        // No filters for redemptions tab yet
        break;
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  // Local helper functions for teacher-specific operations
  const createAchievement = async (achievementData: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('achievements')
        .insert([{
          ...achievementData,
          created_by: user.id
        }])

      if (error) throw error
      
      // Invalidate cache and refetch
      clearCache()
      await refetch()
    } catch (error) {
      console.error('Error creating achievement:', error)
      throw error
    }
  }

  const updateAchievement = async (id: string, updates: any) => {
    try {
      const { error } = await supabase
        .from('achievements')
        .update(updates)
        .eq('id', id)

      if (error) throw error
      
      // Invalidate cache and refetch
      clearCache()
      await refetch()
    } catch (error) {
      console.error('Error updating achievement:', error)
      throw error
    }
  }

  const deleteAchievement = async (id: string) => {
    try {
      const { error } = await supabase
        .from('achievements')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error
      
      // Invalidate cache and refetch
      clearCache()
      await refetch()
    } catch (error) {
      console.error('Error deactivating achievement:', error)
      throw error
    }
  }

  const createReward = async (rewardData: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('rewards_items')
        .insert([{
          ...rewardData,
          created_by: user.id,
          is_active: true
        }])

      if (error) throw error
      
      // Invalidate cache and refetch
      clearCache()
      await refetch()
    } catch (error) {
      console.error('Error creating reward:', error)
      throw error
    }
  }

  const updateReward = async (id: string, updates: any) => {
    try {
      const { error } = await supabase
        .from('rewards_items')
        .update(updates)
        .eq('id', id)

      if (error) throw error
      
      // Invalidate cache and refetch
      clearCache()
      await refetch()
    } catch (error) {
      console.error('Error updating reward:', error)
      throw error
    }
  }

  const deleteReward = async (id: string) => {
    try {
      const { error } = await supabase
        .from('rewards_items')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error
      
      // Invalidate cache and refetch
      clearCache()
      await refetch()
    } catch (error) {
      console.error('Error deactivating reward:', error)
      throw error
    }
  }

  const handleRedemptionStatusUpdate = async (redemptionId: string, status: 'approved' | 'rejected', adminNotes?: string) => {
    try {
      await updateRedemptionStatusFromHook(redemptionId, status, adminNotes)
      
      // Invalidate cache and refetch
      clearCache()
      await refetch()
    } catch (error) {
      console.error('Error updating redemption status:', error)
      throw error
    }
  }

  const getPendingRedemptions = () => {
    return teacherRedemptions.filter(r => r.status === 'pending')
  }

  const getRarityOptions = () => [
    { value: 'bronze', label: 'Bronze', color: 'text-amber-600' },
    { value: 'silver', label: 'Prata', color: 'text-slate-400' },
    { value: 'gold', label: 'Ouro', color: 'text-yellow-500' },
    { value: 'platinum', label: 'Platina', color: 'text-purple-500' },
    { value: 'diamond', label: 'Diamante', color: 'text-blue-500' },
  ]

  const getConditionTypeOptions = () => [
    { value: 'training_count', label: 'Número de Treinos' },
    { value: 'streak_days', label: 'Dias Consecutivos' },
    { value: 'progress_milestone', label: 'Marco de Progresso' },
    { value: 'appointment_count', label: 'Número de Consultas' },
    { value: 'custom', label: 'Personalizado' },
  ]

  const getIconComponent = (iconName: string) => {
    const icons = {
      trophy: Trophy,
      medal: Medal,
      star: Star,
      gift: Gift,
      target: Target,
      flame: Flame,
      calendar: Calendar,
      users: Users
    };
    return icons[iconName as keyof typeof icons] || Trophy;
  };

  const handleAddAchievement = async () => {
    try {
      await createAchievement({
        title: newAchievement.title,
        description: newAchievement.description,
        rarity: newAchievement.rarity,
        points_reward: newAchievement.points_reward,
        icon: newAchievement.icon,
        condition_type: newAchievement.condition_type,
        condition_value: newAchievement.condition_value,
        condition_data: {},
        is_active: true
      });

      // Reset form and close modal
      setNewAchievement({
        title: '',
        description: '',
        rarity: 'bronze',
        points_reward: 50,
        icon: 'trophy',
        condition_type: 'training_count',
        condition_value: 1
      });
      setIsAddAchievementOpen(false);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleEditAchievement = (achievement: any) => {
    setEditingAchievement(achievement);
    setNewAchievement({
      title: achievement.title,
      description: achievement.description,
      rarity: achievement.rarity,
      points_reward: achievement.points_reward,
      icon: achievement.icon,
      condition_type: achievement.condition_type,
      condition_value: achievement.condition_value,
    });
    setIsEditAchievementOpen(true);
  };

  const handleUpdateAchievement = async () => {
    if (!editingAchievement) return;
    
    try {
      await updateAchievement(editingAchievement.id, {
        title: newAchievement.title,
        description: newAchievement.description,
        rarity: newAchievement.rarity,
        points_reward: newAchievement.points_reward,
        icon: newAchievement.icon,
        condition_type: newAchievement.condition_type,
        condition_value: newAchievement.condition_value,
      });

      // Reset form and close modal
      setNewAchievement({
        title: '',
        description: '',
        rarity: 'bronze',
        points_reward: 50,
        icon: 'trophy',
        condition_type: 'training_count',
        condition_value: 1
      });
      setEditingAchievement(null);
      setIsEditAchievementOpen(false);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleDeleteAchievement = async (achievementId: string) => {
    try {
      await deleteAchievement(achievementId);
      setAchievementToDelete(null);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleAddReward = async () => {
    try {
      await createReward({
        title: newReward.title,
        description: newReward.description,
        points_cost: newReward.points_cost,
        stock: newReward.stock,
        image_url: newReward.image_url
      });

      // Reset form and close modal
      setNewReward({
        title: '',
        description: '',
        points_cost: 500,
        stock: undefined,
        image_url: ''
      });
      setIsAddRewardOpen(false);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleEditReward = (reward: any) => {
    setEditingReward(reward);
    setNewReward({
      title: reward.title,
      description: reward.description,
      points_cost: reward.points_cost,
      stock: reward.stock,
      image_url: reward.image_url || ''
    });
    setIsEditRewardOpen(true);
  };

  const handleUpdateReward = async () => {
    if (!editingReward) return;
    
    try {
      await updateReward(editingReward.id, {
        title: newReward.title,
        description: newReward.description,
        points_cost: newReward.points_cost,
        stock: newReward.stock,
        image_url: newReward.image_url
      });

      // Reset form and close modal
      setNewReward({
        title: '',
        description: '',
        points_cost: 500,
        stock: undefined,
        image_url: ''
      });
      setEditingReward(null);
      setIsEditRewardOpen(false);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleDeleteReward = async (rewardId: string) => {
    try {
      await deleteReward(rewardId);
      setRewardToDelete(null);
    } catch (error) {
      // Error is handled in the hook
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
          <h1 className="text-2xl font-bold text-foreground">Sistema de Gamificação</h1>
          <p className="text-muted-foreground">Motive seus alunos com conquistas e recompensas</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="bg-card border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Alunos Ativos</p>
              <p className="text-3xl font-bold text-foreground">{stats.activeStudents}</p>
              <div className="flex items-center space-x-2 mt-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground text-sm">
                  {stats.totalStudents > 0 ? `de ${stats.totalStudents} total` : 'Nenhum aluno'}
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-success" />
            </div>
          </div>
        </Card>

        <Card className="bg-card border-border p-6">
          <div className="flex items-center justify-between">
            <div>
            <p className="text-muted-foreground text-sm">Conquistas Criadas</p>
              <p className="text-3xl font-bold text-foreground">{availableAchievements.length}</p>
              <div className="flex items-center space-x-2 mt-2">
                <Medal className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground text-sm">Conquistas ativas</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
              <Medal className="w-6 h-6 text-warning" />
            </div>
          </div>
        </Card>

        <Card className="bg-card border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Resgates Pendentes</p>
              <p className="text-3xl font-bold text-foreground">{getPendingRedemptions().length}</p>
              <div className="flex items-center space-x-2 mt-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground text-sm">
                  {teacherRedemptions.length > 0 ? `de ${teacherRedemptions.length} total` : 'Nenhum resgate'}
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-warning" />
            </div>
          </div>
        </Card>

        <Card className="bg-card border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Pontos Médios</p>
              <p className="text-3xl font-bold text-foreground">{stats.avgPoints}</p>
              <div className="flex items-center space-x-2 mt-2">
                <Flame className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground text-sm">Por aluno</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-info/10 rounded-lg flex items-center justify-center">
              <Flame className="w-6 h-6 text-info" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="students" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card border-border">
          <TabsTrigger value="students" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Ranking de Alunos
          </TabsTrigger>
          <TabsTrigger value="achievements" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Conquistas
          </TabsTrigger>
          <TabsTrigger value="rewards" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Recompensas
          </TabsTrigger>
          <TabsTrigger value="redemptions" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Resgates Pendentes ({getPendingRedemptions().length})
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Settings className="w-4 h-4 mr-2" />
            Configurações
          </TabsTrigger>
        </TabsList>

        {/* Filter Bar - Only show for tabs that need filtering */}
        {activeTab !== 'settings' && (
          <FilterBar
            activeTab={activeTab}
            filters={
              activeTab === 'students' ? studentFilters :
              activeTab === 'achievements' ? achievementFilters :
              rewardFilters
            }
            onFiltersChange={(filters) => handleFiltersChange(activeTab, filters)}
            onClearFilters={() => handleClearFilters(activeTab)}
            resultCount={
              activeTab === 'students' ? filteredStudents.length :
              activeTab === 'achievements' ? filteredAchievements.length :
              activeTab === 'rewards' ? filteredRewards.length :
              getPendingRedemptions().length
            }
            totalCount={
              activeTab === 'students' ? rankings.length :
              activeTab === 'achievements' ? availableAchievements.length :
              activeTab === 'rewards' ? rewards.length :
              teacherRedemptions.length
            }
          />
        )}

        <TabsContent value="students">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredStudents.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum aluno no ranking</h3>
                <p className="text-muted-foreground">Quando você adicionar alunos, o ranking aparecerá aqui</p>
              </div>
            ) : (
              filteredStudents.map((student, index) => {
                const nextLevelPoints = Math.pow(student.level, 2) * 100;
                const currentLevelPoints = Math.pow(student.level - 1, 2) * 100;
                const progressToNextLevel = ((student.total_points - currentLevelPoints) / (nextLevelPoints - currentLevelPoints)) * 100;
                
                return (
                  <Card key={student.user_id} className="bg-card border-border p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={student.avatar_url} alt={student.name} />
                            <AvatarFallback className="bg-muted text-muted-foreground">
                              {student.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-warning rounded-full flex items-center justify-center text-xs font-bold text-warning-foreground">
                            {student.position}
                          </div>
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{student.name}</h3>
                          <p className="text-muted-foreground text-sm">Nível {student.level}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-warning font-bold">{student.total_points} pts</p>
                        <div className="flex items-center space-x-1 mt-1">
                          <Flame className="w-4 h-4 text-info" />
                          <span className="text-info text-sm">{student.current_streak} dias</span>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Progresso para nível {student.level + 1}</span>
                        <span className="text-foreground">{student.total_points}/{nextLevelPoints}</span>
                      </div>
                      <Progress
                        value={Math.max(0, Math.min(100, progressToNextLevel))}
                        className="h-2"
                      />
                    </div>

                    <div className="text-center text-muted-foreground text-sm">
                      Sistema de conquistas em funcionamento
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="achievements">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-foreground">Conquistas Disponíveis</h2>
              <Dialog open={isAddAchievementOpen} onOpenChange={setIsAddAchievementOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Conquista
                  </Button>
                </DialogTrigger>
                <DialogContent className="p-0 bg-card border-border" aria-describedby={undefined}>
                  <DialogHeader className="px-5 pt-5 pb-3 pr-12 border-b border-border/40">
                    <DialogTitle className="text-foreground">Nova Conquista</DialogTitle>
                  </DialogHeader>
                  <div className="px-5 pt-3 pb-5 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-foreground">Nome da Conquista</Label>
                      <Input
                        id="name"
                        value={newAchievement.title}
                        onChange={(e) => setNewAchievement({ ...newAchievement, title: e.target.value })}
                        placeholder="Ex: Super Atleta"
                        className="bg-background border-border text-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-foreground">Descrição</Label>
                      <Textarea
                        id="description"
                        value={newAchievement.description}
                        onChange={(e) => setNewAchievement({ ...newAchievement, description: e.target.value })}
                        placeholder="Descreva como conquistar esta medalha..."
                        className="bg-background border-border text-foreground"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="rarity" className="text-foreground">Raridade</Label>
                        <Select
                          value={newAchievement.rarity}
                          onValueChange={(value) => setNewAchievement({ ...newAchievement, rarity: value })}
                        >
                          <SelectTrigger className="bg-background border-border text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            {getRarityOptions().map(option => (
                              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="points" className="text-foreground">Pontos</Label>
                        <Input
                          id="points"
                          type="number"
                          value={newAchievement.points_reward}
                          onChange={(e) => setNewAchievement({ ...newAchievement, points_reward: parseInt(e.target.value) || 0 })}
                          placeholder="50"
                          className="bg-background border-border text-foreground"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="icon" className="text-foreground">Ícone</Label>
                        <Select
                          value={newAchievement.icon}
                          onValueChange={(value) => setNewAchievement({ ...newAchievement, icon: value })}
                        >
                          <SelectTrigger className="bg-background border-border text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            <SelectItem value="trophy">🏆 Troféu</SelectItem>
                            <SelectItem value="medal">🥇 Medalha</SelectItem>
                            <SelectItem value="star">⭐ Estrela</SelectItem>
                            <SelectItem value="target">🎯 Alvo</SelectItem>
                            <SelectItem value="flame">🔥 Chama</SelectItem>
                            <SelectItem value="calendar">📅 Calendário</SelectItem>
                            <SelectItem value="users">👥 Usuários</SelectItem>
                            <SelectItem value="gift">🎁 Presente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="condition" className="text-foreground">Condição</Label>
                        <Select
                          value={newAchievement.condition_type}
                          onValueChange={(value) => setNewAchievement({ ...newAchievement, condition_type: value })}
                        >
                          <SelectTrigger className="bg-background border-border text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            {getConditionTypeOptions().map(option => (
                              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="condition_value" className="text-foreground">Valor da Condição</Label>
                      <Input
                        id="condition_value"
                        type="number"
                        value={newAchievement.condition_value}
                        onChange={(e) => setNewAchievement({ ...newAchievement, condition_value: parseInt(e.target.value) || 1 })}
                        placeholder="1"
                        className="bg-background border-border text-foreground"
                      />
                    </div>
                  </div>
                  <DialogFooter className="px-5 pb-5 pt-3 border-t border-border/40">
                    <Button
                      variant="outline"
                      onClick={() => setIsAddAchievementOpen(false)}
                      className="border-border text-foreground hover:bg-muted"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleAddAchievement}
                      disabled={!newAchievement.title || !newAchievement.description}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      Criar Conquista
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAchievements.map((achievement) => {
                const Icon = getIconComponent(achievement.icon || 'trophy');
                return (
                  <Card key={achievement.id} className="bg-card border-border p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-warning/10">
                          <Icon className="w-5 h-5 text-warning" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">{achievement.title}</h3>
                          <p className="text-muted-foreground text-sm">{achievement.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-warning/20 text-warning border-warning/30">
                          {achievement.points_reward} pts
                        </Badge>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditAchievement(achievement)}
                            className="h-8 w-8 p-0 hover:bg-muted"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-card border-border">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-foreground">Excluir Conquista</AlertDialogTitle>
                                <AlertDialogDescription className="text-muted-foreground">
                                  Tem certeza que deseja excluir a conquista "{achievement.title}"? 
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="border-border text-foreground hover:bg-muted">
                                  Cancelar
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteAchievement(achievement.id)}
                                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="rewards">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-foreground">Recompensas Disponíveis</h2>
              <Dialog open={isAddRewardOpen} onOpenChange={setIsAddRewardOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Recompensa
                  </Button>
                </DialogTrigger>
                <DialogContent className="p-0 bg-card border-border" aria-describedby={undefined}>
                  <DialogHeader className="px-5 pt-5 pb-3 pr-12 border-b border-border/40">
                    <DialogTitle className="text-foreground">Nova Recompensa</DialogTitle>
                  </DialogHeader>
                  <div className="px-5 pt-3 pb-5 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reward-name" className="text-foreground">Nome da Recompensa</Label>
                      <Input
                        id="reward-name"
                        value={newReward.title}
                        onChange={(e) => setNewReward({ ...newReward, title: e.target.value })}
                        placeholder="Ex: Desconto 20%"
                        className="bg-background border-border text-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reward-description" className="text-foreground">Descrição</Label>
                      <Textarea
                        id="reward-description"
                        value={newReward.description}
                        onChange={(e) => setNewReward({ ...newReward, description: e.target.value })}
                        placeholder="Descreva os detalhes da recompensa..."
                        className="bg-background border-border text-foreground"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="reward-cost" className="text-foreground">Custo em Pontos</Label>
                        <Input
                          id="reward-cost"
                          type="number"
                          value={newReward.points_cost}
                          onChange={(e) => setNewReward({ ...newReward, points_cost: parseInt(e.target.value) || 0 })}
                          placeholder="500"
                          className="bg-background border-border text-foreground"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reward-stock" className="text-foreground">Estoque (opcional)</Label>
                        <Input
                          id="reward-stock"
                          type="number"
                          value={newReward.stock || ''}
                          onChange={(e) => setNewReward({ ...newReward, stock: e.target.value ? parseInt(e.target.value) : undefined })}
                          placeholder="Ilimitado"
                          className="bg-background border-border text-foreground"
                        />
                      </div>
                     </div>
                     <ImageUpload
                       onImageUpload={(url) => setNewReward({ ...newReward, image_url: url })}
                       currentImage={newReward.image_url}
                       bucket="rewards"
                       label="Imagem da Recompensa"
                     />
                   </div>
                  <DialogFooter className="px-5 pb-5 pt-3 border-t border-border/40">
                    <Button
                      variant="outline"
                      onClick={() => setIsAddRewardOpen(false)}
                      className="border-border text-foreground hover:bg-muted"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleAddReward}
                      disabled={!newReward.title || !newReward.description}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      Criar Recompensa
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Edit Reward Modal */}
            <Dialog open={isEditRewardOpen} onOpenChange={setIsEditRewardOpen}>
              <DialogContent className="p-0 bg-card border-border" aria-describedby={undefined}>
                <DialogHeader className="px-5 pt-5 pb-3 pr-12 border-b border-border/40">
                  <DialogTitle className="text-foreground">Editar Recompensa</DialogTitle>
                </DialogHeader>
                <div className="px-5 pt-3 pb-5 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-reward-name" className="text-foreground">Nome da Recompensa</Label>
                    <Input
                      id="edit-reward-name"
                      value={newReward.title}
                      onChange={(e) => setNewReward({ ...newReward, title: e.target.value })}
                      placeholder="Ex: Desconto 20%"
                      className="bg-background border-border text-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-reward-description" className="text-foreground">Descrição</Label>
                    <Textarea
                      id="edit-reward-description"
                      value={newReward.description}
                      onChange={(e) => setNewReward({ ...newReward, description: e.target.value })}
                      placeholder="Descreva os detalhes da recompensa..."
                      className="bg-background border-border text-foreground"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-reward-cost" className="text-foreground">Custo em Pontos</Label>
                      <Input
                        id="edit-reward-cost"
                        type="number"
                        value={newReward.points_cost}
                        onChange={(e) => setNewReward({ ...newReward, points_cost: parseInt(e.target.value) || 0 })}
                        placeholder="500"
                        className="bg-background border-border text-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-reward-stock" className="text-foreground">Estoque (opcional)</Label>
                      <Input
                        id="edit-reward-stock"
                        type="number"
                        value={newReward.stock || ''}
                        onChange={(e) => setNewReward({ ...newReward, stock: e.target.value ? parseInt(e.target.value) : undefined })}
                        placeholder="Ilimitado"
                        className="bg-background border-border text-foreground"
                      />
                    </div>
                   </div>
                   <ImageUpload
                     onImageUpload={(url) => setNewReward({ ...newReward, image_url: url })}
                     currentImage={newReward.image_url}
                     bucket="rewards"
                     label="Imagem da Recompensa"
                   />
                 </div>
                <DialogFooter className="px-5 pb-5 pt-3 border-t border-border/40">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditRewardOpen(false);
                      setEditingReward(null);
                      setNewReward({
                        title: '',
                        description: '',
                        points_cost: 500,
                        stock: undefined,
                        image_url: ''
                      });
                    }}
                    className="border-border text-foreground hover:bg-muted"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleUpdateReward}
                    disabled={!newReward.title || !newReward.description}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Salvar Alterações
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRewards.map((reward) => (
                <Card key={reward.id} className="bg-card border-border p-4">
                  {reward.image_url && (
                    <div className="mb-3">
                      <img 
                        src={reward.image_url} 
                        alt={reward.title}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center">
                        <Gift className="w-5 h-5 text-secondary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{reward.title}</h3>
                        <p className="text-muted-foreground text-sm">{reward.description}</p>
                        {reward.stock === 0 && (
                          <Badge variant="secondary" className="mt-1">Esgotado</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-2">
                      <div className="text-right">
                        <p className="text-info font-bold">{reward.points_cost} pts</p>
                        <Badge variant="outline" className="mt-1">
                          {reward.stock !== null && reward.stock !== undefined ? `${reward.stock} restantes` : 'Ilimitado'}
                        </Badge>
                      </div>
                      <div className="flex flex-col space-y-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditReward(reward)}
                          className="h-8 w-8 p-0 hover:bg-muted"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-card border-border">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-foreground">Excluir Recompensa</AlertDialogTitle>
                              <AlertDialogDescription className="text-muted-foreground">
                                Tem certeza que deseja excluir a recompensa "{reward.title}"? 
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-border text-foreground hover:bg-muted">
                                Cancelar
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteReward(reward.id)}
                                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="redemptions">
          <RedemptionManagementPanel
            redemptions={teacherRedemptions}
            onUpdateStatus={handleRedemptionStatusUpdate}
            onDelete={deleteRedemption}
            loading={loading || rewardsLoading}
          />
        </TabsContent>

        <TabsContent value="settings">
          <GamificationSettingsTab teacherId={user?.id || ''} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
