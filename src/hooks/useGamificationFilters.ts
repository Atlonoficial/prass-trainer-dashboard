import { useState, useMemo } from 'react';

export function useGamificationFilters() {
  const [studentFilters, setStudentFilters] = useState<any>({});
  const [achievementFilters, setAchievementFilters] = useState<any>({});
  const [rewardFilters, setRewardFilters] = useState<any>({});

  const filterStudents = useMemo(() => {
    return (students: any[]) => {
      let filtered = [...students];

      // Search filter
      if (studentFilters.search) {
        const searchLower = studentFilters.search.toLowerCase();
        filtered = filtered.filter(student => 
          student.name.toLowerCase().includes(searchLower)
        );
      }

      // Level range filter
      if (studentFilters.levelRange) {
        const [min, max] = studentFilters.levelRange.split('-').map(n => n.includes('+') ? Infinity : parseInt(n));
        filtered = filtered.filter(student => 
          student.level >= min && (max === Infinity || student.level <= max)
        );
      }

      // Minimum points filter
      if (studentFilters.minPoints !== undefined) {
        filtered = filtered.filter(student => student.total_points >= studentFilters.minPoints!);
      }

      // Sort
      if (studentFilters.sortBy) {
        filtered.sort((a, b) => {
          switch (studentFilters.sortBy) {
            case 'points':
              return b.total_points - a.total_points;
            case 'level':
              return b.level - a.level;
            case 'streak':
              return b.current_streak - a.current_streak;
            case 'name':
              return a.name.localeCompare(b.name);
            default:
              return b.total_points - a.total_points;
          }
        });

        // Update positions after sorting
        filtered.forEach((student, index) => {
          student.position = index + 1;
        });
      }

      return filtered;
    };
  }, [studentFilters]);

  const filterAchievements = useMemo(() => {
    return (achievements: any[]) => {
      let filtered = [...achievements];

      // Search filter
      if (achievementFilters.search) {
        const searchLower = achievementFilters.search.toLowerCase();
        filtered = filtered.filter(achievement => 
          achievement.title.toLowerCase().includes(searchLower) ||
          (achievement.description && achievement.description.toLowerCase().includes(searchLower))
        );
      }

      // Rarity filter
      if (achievementFilters.rarity && achievementFilters.rarity.length > 0) {
        filtered = filtered.filter(achievement => 
          achievementFilters.rarity!.includes(achievement.rarity)
        );
      }

      // Condition type filter
      if (achievementFilters.conditionType) {
        filtered = filtered.filter(achievement => 
          achievement.condition_type === achievementFilters.conditionType
        );
      }

      // Points reward range filter
      if (achievementFilters.minPointsReward !== undefined) {
        filtered = filtered.filter(achievement => 
          achievement.points_reward >= achievementFilters.minPointsReward!
        );
      }
      if (achievementFilters.maxPointsReward !== undefined) {
        filtered = filtered.filter(achievement => 
          achievement.points_reward <= achievementFilters.maxPointsReward!
        );
      }

      // Sort
      if (achievementFilters.sortBy) {
        filtered.sort((a, b) => {
          switch (achievementFilters.sortBy) {
            case 'points':
              return b.points_reward - a.points_reward;
            case 'name':
              return a.title.localeCompare(b.title);
            case 'rarity':
              const rarityOrder = { bronze: 1, silver: 2, gold: 3, platinum: 4 };
              return (rarityOrder[b.rarity as keyof typeof rarityOrder] || 0) - 
                     (rarityOrder[a.rarity as keyof typeof rarityOrder] || 0);
            default:
              return a.title.localeCompare(b.title);
          }
        });
      }

      return filtered;
    };
  }, [achievementFilters]);

  const filterRewards = useMemo(() => {
    return (rewards: any[]) => {
      let filtered = [...rewards];

      // Search filter
      if (rewardFilters.search) {
        const searchLower = rewardFilters.search.toLowerCase();
        filtered = filtered.filter(reward => 
          reward.title.toLowerCase().includes(searchLower) ||
          (reward.description && reward.description.toLowerCase().includes(searchLower))
        );
      }

      // Stock status filter
      if (rewardFilters.stockStatus && rewardFilters.stockStatus.length > 0) {
        filtered = filtered.filter(reward => {
          const stock = reward.stock;
          return rewardFilters.stockStatus!.some((status: string) => {
            if (status === 'available') return stock === undefined || stock > 10;
            if (status === 'low') return stock !== undefined && stock > 0 && stock <= 10;
            if (status === 'out') return stock !== undefined && stock === 0;
            return false;
          });
        });
      }

      // Cost range filter
      if (rewardFilters.minCost !== undefined) {
        filtered = filtered.filter(reward => reward.points_cost >= rewardFilters.minCost!);
      }
      if (rewardFilters.maxCost !== undefined) {
        filtered = filtered.filter(reward => reward.points_cost <= rewardFilters.maxCost!);
      }

      // Sort
      if (rewardFilters.sortBy) {
        filtered.sort((a, b) => {
          switch (rewardFilters.sortBy) {
            case 'cost':
              return a.points_cost - b.points_cost;
            case 'stock':
              const aStock = a.stock || Infinity;
              const bStock = b.stock || Infinity;
              return bStock - aStock;
            case 'name':
              return a.title.localeCompare(b.title);
            case 'recent':
              return a.id.localeCompare(b.id); // Assuming newer IDs come later
            default:
              return a.points_cost - b.points_cost;
          }
        });
      }

      return filtered;
    };
  }, [rewardFilters]);

  const clearStudentFilters = () => setStudentFilters({});
  const clearAchievementFilters = () => setAchievementFilters({});
  const clearRewardFilters = () => setRewardFilters({});

  return {
    // Filters state
    studentFilters,
    achievementFilters,
    rewardFilters,
    
    // Filter functions
    filterStudents,
    filterAchievements,
    filterRewards,
    
    // Update functions
    setStudentFilters,
    setAchievementFilters,
    setRewardFilters,
    
    // Clear functions
    clearStudentFilters,
    clearAchievementFilters,
    clearRewardFilters,
  };
}