import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Save, RotateCcw, TrendingUp, AlertTriangle } from 'lucide-react';
import { GamificationSettings } from '@/hooks/useGamificationSettings';

interface PointsConfigurationPanelProps {
  settings: GamificationSettings;
  onUpdate: (updates: Partial<GamificationSettings>) => Promise<void>;
}

export const PointsConfigurationPanel = ({ settings, onUpdate }: PointsConfigurationPanelProps) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
    setHasChanges(false);
  }, [settings]);

  const handleSettingChange = (key: keyof GamificationSettings, value: number) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    
    // Check if there are changes
    const hasAnyChanges = Object.keys(pointsConfig).some(
      (configKey) => {
        const settingKey = pointsConfig[configKey as keyof typeof pointsConfig].key;
        return newSettings[settingKey] !== settings[settingKey];
      }
    );
    setHasChanges(hasAnyChanges);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const updates: Partial<GamificationSettings> = {};
      
      Object.keys(pointsConfig).forEach((configKey) => {
        const { key } = pointsConfig[configKey as keyof typeof pointsConfig];
        if (localSettings[key] !== settings[key]) {
          (updates as any)[key] = localSettings[key];
        }
      });

      if (Object.keys(updates).length > 0) {
        await onUpdate(updates);
        setHasChanges(false);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setLocalSettings(settings);
    setHasChanges(false);
  };

  const pointsConfig = {
    workout: {
      key: 'points_workout' as keyof GamificationSettings,
      label: 'Treino Concluído',
      description: 'Pontos ao completar um treino',
      icon: '💪',
      min: 0,
      max: 200,
      step: 5
    },
    checkin: {
      key: 'points_checkin' as keyof GamificationSettings,
      label: 'Check-in Diário',
      description: 'Pontos pelo check-in diário',
      icon: '📅',
      min: 0,
      max: 50,
      step: 1
    },
    meal: {
      key: 'points_meal_log' as keyof GamificationSettings,
      label: 'Refeição Registrada',
      description: 'Pontos ao registrar uma refeição',
      icon: '🍽️',
      min: 0,
      max: 100,
      step: 5
    },
    progress: {
      key: 'points_progress_update' as keyof GamificationSettings,
      label: 'Progresso Atualizado',
      description: 'Pontos ao atualizar progresso',
      icon: '📈',
      min: 0,
      max: 200,
      step: 10
    },
    goal: {
      key: 'points_goal_achieved' as keyof GamificationSettings,
      label: 'Meta Alcançada',
      description: 'Pontos ao alcançar uma meta',
      icon: '🎯',
      min: 0,
      max: 500,
      step: 25
    },
    assessment: {
      key: 'points_assessment' as keyof GamificationSettings,
      label: 'Avaliação Concluída',
      description: 'Pontos ao completar avaliação',
      icon: '📋',
      min: 0,
      max: 300,
      step: 25
    },
    medical: {
      key: 'points_medical_exam' as keyof GamificationSettings,
      label: 'Exame Médico',
      description: 'Pontos ao enviar exame médico',
      icon: '🏥',
      min: 0,
      max: 200,
      step: 10
    },
    ai: {
      key: 'points_ai_interaction' as keyof GamificationSettings,
      label: 'Interação com IA',
      description: 'Pontos por interagir com assistente',
      icon: '🤖',
      min: 0,
      max: 25,
      step: 1
    },
    message: {
      key: 'points_teacher_message' as keyof GamificationSettings,
      label: 'Mensagem do Professor',
      description: 'Pontos ao responder professor',
      icon: '💬',
      min: 0,
      max: 50,
      step: 5
    }
  };

  const bonusConfig = {
    levelUp: {
      key: 'level_up_bonus' as keyof GamificationSettings,
      label: 'Bônus de Nível',
      description: 'Pontos extras ao subir de nível',
      icon: '⭐',
      min: 0,
      max: 200,
      step: 10
    },
    maxDaily: {
      key: 'max_daily_points' as keyof GamificationSettings,
      label: 'Limite Diário',
      description: 'Máximo de pontos por dia',
      icon: '📊',
      min: 100,
      max: 2000,
      step: 50
    }
  };

  const getImpactLevel = (current: number, new_: number) => {
    const diff = Math.abs(new_ - current);
    const percentage = (diff / current) * 100;
    
    if (percentage >= 50) return { level: 'high', color: 'destructive' };
    if (percentage >= 25) return { level: 'medium', color: 'warning' };
    if (percentage > 0) return { level: 'low', color: 'secondary' };
    return { level: 'none', color: 'outline' };
  };

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      {hasChanges && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-primary" />
                <span>Você tem mudanças não salvas</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Descartar
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-1" />
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Points Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pontuação por Atividades</CardTitle>
          <CardDescription>
            Configure quantos pontos cada atividade vale
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(pointsConfig).map(([key, config]) => {
              const currentValue = localSettings[config.key] as number;
              const originalValue = settings[config.key] as number;
              const impact = getImpactLevel(originalValue, currentValue);

              return (
                <Card key={key} className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{config.icon}</span>
                        <div>
                          <Label className="text-sm font-medium">{config.label}</Label>
                          <p className="text-xs text-muted-foreground">{config.description}</p>
                        </div>
                      </div>
                      {currentValue !== originalValue && (
                        <Badge variant={impact.color as any} className="text-xs">
                          {currentValue > originalValue ? '+' : ''}{currentValue - originalValue}
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Pontos</Label>
                        <span className="text-sm font-medium">{currentValue}</span>
                      </div>
                      <Slider
                        value={[currentValue]}
                        onValueChange={(value) => handleSettingChange(config.key, value[0])}
                        min={config.min}
                        max={config.max}
                        step={config.step}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{config.min}</span>
                        <span>{config.max}</span>
                      </div>
                    </div>

                    <Input
                      type="number"
                      value={currentValue}
                      onChange={(e) => {
                        const value = Math.max(config.min, Math.min(config.max, parseInt(e.target.value) || 0));
                        handleSettingChange(config.key, value);
                      }}
                      min={config.min}
                      max={config.max}
                      step={config.step}
                      className="text-center"
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Bonus Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configurações de Bônus</CardTitle>
          <CardDescription>
            Configure bônus e limites do sistema de pontuação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {Object.entries(bonusConfig).map(([key, config]) => {
              const currentValue = localSettings[config.key] as number;
              const originalValue = settings[config.key] as number;
              const impact = getImpactLevel(originalValue, currentValue);

              return (
                <Card key={key} className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{config.icon}</span>
                        <div>
                          <Label className="text-sm font-medium">{config.label}</Label>
                          <p className="text-xs text-muted-foreground">{config.description}</p>
                        </div>
                      </div>
                      {currentValue !== originalValue && (
                        <Badge variant={impact.color as any} className="text-xs">
                          {currentValue > originalValue ? '+' : ''}{currentValue - originalValue}
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Valor</Label>
                        <span className="text-sm font-medium">{currentValue}</span>
                      </div>
                      <Slider
                        value={[currentValue]}
                        onValueChange={(value) => handleSettingChange(config.key, value[0])}
                        min={config.min}
                        max={config.max}
                        step={config.step}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{config.min}</span>
                        <span>{config.max}</span>
                      </div>
                    </div>

                    <Input
                      type="number"
                      value={currentValue}
                      onChange={(e) => {
                        const value = Math.max(config.min, Math.min(config.max, parseInt(e.target.value) || 0));
                        handleSettingChange(config.key, value);
                      }}
                      min={config.min}
                      max={config.max}
                      step={config.step}
                      className="text-center"
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};