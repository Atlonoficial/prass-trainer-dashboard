import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus, Users, Award } from 'lucide-react';
import { GamificationSettings } from '@/hooks/useGamificationSettings';

interface StudentRanking {
  user_id: string;
  name: string;
  avatar: string | null;
  points: number;
  level: number;
  position: number;
  streak: number;
}

interface ImpactPreviewChartProps {
  students: StudentRanking[];
  currentSettings: GamificationSettings;
  newSettings?: GamificationSettings | null;
  compact?: boolean;
}

export const ImpactPreviewChart = ({ 
  students, 
  currentSettings, 
  newSettings, 
  compact = false 
}: ImpactPreviewChartProps) => {
  const impactAnalysis = useMemo(() => {
    if (!newSettings) {
      return {
        studentsImpacted: 0,
        averagePointsChange: 0,
        levelsAffected: 0,
        rankingChanges: [],
        summary: {
          increased: 0,
          decreased: 0,
          unchanged: 0
        }
      };
    }

    // Simulate point changes based on recent activities
    const activityMultipliers = {
      points_workout: 3, // Assume 3 workouts per week on average
      points_checkin: 7, // Daily check-ins
      points_meal_log: 4, // 4 meals logged per week
      points_progress_update: 1, // Weekly progress update
      points_goal_achieved: 0.5, // Bi-weekly goals
      points_assessment: 0.25, // Monthly assessments
      points_medical_exam: 0.1, // Quarterly exams
      points_ai_interaction: 5, // AI interactions per week
      points_teacher_message: 2 // Teacher messages per week
    };

    const studentsWithImpact = students.map(student => {
      // Calculate potential weekly points with current settings
      const currentWeeklyPoints = Object.entries(activityMultipliers).reduce((sum, [activity, multiplier]) => {
        const activityKey = activity as keyof GamificationSettings;
        return sum + ((currentSettings[activityKey] as number) * multiplier);
      }, 0);

      // Calculate potential weekly points with new settings
      const newWeeklyPoints = Object.entries(activityMultipliers).reduce((sum, [activity, multiplier]) => {
        const activityKey = activity as keyof GamificationSettings;
        return sum + ((newSettings[activityKey] as number) * multiplier);
      }, 0);

      const pointsDifference = newWeeklyPoints - currentWeeklyPoints;
      const projectedNewTotal = student.points + pointsDifference;
      const newLevel = Math.floor(projectedNewTotal / 100) + 1;
      const levelChange = newLevel - student.level;

      return {
        ...student,
        currentWeeklyPoints,
        newWeeklyPoints,
        pointsDifference,
        projectedNewTotal: Math.max(0, projectedNewTotal),
        newLevel,
        levelChange,
        impactType: pointsDifference > 0 ? 'increase' : pointsDifference < 0 ? 'decrease' : 'unchanged'
      };
    });

    // Sort by new projected points to get new ranking
    const newRanking = [...studentsWithImpact]
      .sort((a, b) => b.projectedNewTotal - a.projectedNewTotal)
      .map((student, index) => ({
        ...student,
        newPosition: index + 1,
        positionChange: student.position - (index + 1)
      }));

    const studentsImpacted = studentsWithImpact.filter(s => s.pointsDifference !== 0).length;
    const averagePointsChange = studentsWithImpact.reduce((sum, s) => sum + s.pointsDifference, 0) / studentsWithImpact.length;
    const levelsAffected = studentsWithImpact.filter(s => s.levelChange !== 0).length;

    const summary = {
      increased: studentsWithImpact.filter(s => s.pointsDifference > 0).length,
      decreased: studentsWithImpact.filter(s => s.pointsDifference < 0).length,
      unchanged: studentsWithImpact.filter(s => s.pointsDifference === 0).length
    };

    return {
      studentsImpacted,
      averagePointsChange,
      levelsAffected,
      rankingChanges: newRanking.slice(0, 10), // Top 10 for preview
      summary
    };
  }, [students, currentSettings, newSettings]);

  if (!newSettings) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Faça alterações nas configurações para ver o preview de impacto</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-3">
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{impactAnalysis.summary.increased}</div>
              <div className="text-xs text-muted-foreground">Ganharão Pontos</div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">{impactAnalysis.summary.decreased}</div>
              <div className="text-xs text-muted-foreground">Perderão Pontos</div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <div className="text-lg font-bold text-muted-foreground">{impactAnalysis.summary.unchanged}</div>
              <div className="text-xs text-muted-foreground">Sem Mudança</div>
            </div>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="text-center space-y-1">
          <p className="text-sm">
            <span className="font-medium">{impactAnalysis.studentsImpacted}</span> alunos serão impactados
          </p>
          <p className="text-xs text-muted-foreground">
            Mudança média: {impactAnalysis.averagePointsChange > 0 ? '+' : ''}{Math.round(impactAnalysis.averagePointsChange)} pontos por semana
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Impact Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
            <div className="text-xl font-bold">{impactAnalysis.studentsImpacted}</div>
            <div className="text-xs text-muted-foreground">Alunos Impactados</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              {impactAnalysis.averagePointsChange > 0 ? (
                <TrendingUp className="h-6 w-6 text-green-600" />
              ) : impactAnalysis.averagePointsChange < 0 ? (
                <TrendingDown className="h-6 w-6 text-red-600" />
              ) : (
                <Minus className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="text-xl font-bold">
              {impactAnalysis.averagePointsChange > 0 ? '+' : ''}{Math.round(impactAnalysis.averagePointsChange)}
            </div>
            <div className="text-xs text-muted-foreground">Mudança Média</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Award className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
            <div className="text-xl font-bold">{impactAnalysis.levelsAffected}</div>
            <div className="text-xs text-muted-foreground">Níveis Afetados</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="grid grid-cols-3 gap-1 mb-2">
              <div className="h-2 bg-green-500 rounded"></div>
              <div className="h-2 bg-red-500 rounded"></div>
              <div className="h-2 bg-gray-300 rounded"></div>
            </div>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-green-600">+{impactAnalysis.summary.increased}</span>
                <span className="text-red-600">-{impactAnalysis.summary.decreased}</span>
                <span className="text-muted-foreground">={impactAnalysis.summary.unchanged}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ranking Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preview do Novo Ranking</CardTitle>
          <CardDescription>
            Como ficará o ranking após as mudanças (top 10)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {impactAnalysis.rankingChanges.map((student) => (
              <div key={student.user_id} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="w-8 h-6 flex items-center justify-center text-xs">
                    {student.newPosition}
                  </Badge>
                  {student.positionChange !== 0 && (
                    <div className="flex items-center">
                      {student.positionChange > 0 ? (
                        <TrendingUp className="h-3 w-3 text-green-600" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-600" />
                      )}
                      <span className="text-xs text-muted-foreground ml-1">
                        {Math.abs(student.positionChange)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{student.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {student.points.toLocaleString()} → {student.projectedNewTotal.toLocaleString()}
                      </span>
                      {student.pointsDifference !== 0 && (
                        <Badge 
                          variant={student.pointsDifference > 0 ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {student.pointsDifference > 0 ? '+' : ''}{Math.round(student.pointsDifference)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-1">
                    <div className="flex-1">
                      <Progress 
                        value={(student.projectedNewTotal % 100)} 
                        className="h-1"
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Nível {student.newLevel}
                      {student.levelChange !== 0 && (
                        <span className="ml-1">
                          ({student.levelChange > 0 ? '+' : ''}{student.levelChange})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};