import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Plus, Clock, Users, Trophy, Gift, AlertCircle, UserPlus, TrendingDown, BarChart, Bell, Bot } from 'lucide-react';
import { useNotificationAutomation } from '@/hooks/useNotificationAutomation';
import { useNotificationTemplates } from '@/hooks/useNotificationTemplates';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface NotificationAutomationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationAutomationModal({ isOpen, onClose }: NotificationAutomationModalProps) {
  const [activeTab, setActiveTab] = useState('existing');
  const [selectedTrigger, setSelectedTrigger] = useState('');
  const [ruleName, setRuleName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [triggerConditions, setTriggerConditions] = useState<Record<string, string>>({});

  const { 
    rules, 
    availableTriggers, 
    loading, 
    createAutomationRule, 
    toggleAutomationRule 
  } = useNotificationAutomation();

  const { templates } = useNotificationTemplates();

  const getIconForTrigger = (iconName: string) => {
    const icons = {
      clock: Clock,
      gift: Gift,
      trophy: Trophy,
      'alert-circle': AlertCircle,
      'user-plus': UserPlus,
      'trending-down': TrendingDown,
      'bar-chart': BarChart,
      bell: Bell
    };
    const IconComponent = icons[iconName as keyof typeof icons] || Clock;
    return <IconComponent className="w-4 h-4" />;
  };

  const handleCreateRule = async () => {
    if (!selectedTrigger || !ruleName || !selectedTemplate) return;

    const ruleData = {
      name: ruleName,
      trigger: selectedTrigger,
      condition: triggerConditions,
      template_id: selectedTemplate,
      is_active: true
    };

    const success = await createAutomationRule(ruleData);
    if (success) {
      setRuleName('');
      setSelectedTrigger('');
      setSelectedTemplate('');
      setTriggerConditions({});
      setActiveTab('existing');
    }
  };

  const handleConditionChange = (key: string, value: string) => {
    setTriggerConditions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const renderConditionInputs = () => {
    const trigger = availableTriggers.find(t => t.id === selectedTrigger);
    if (!trigger) return null;

    return trigger.conditions.map(condition => (
      <div key={condition}>
        <Label className="text-foreground font-medium">
          {condition === 'dias_sem_treino' && 'Dias sem treinar'}
          {condition === 'dias_antecedencia' && 'Dias de antecedência'}
          {condition === 'tempo_cadastro' && 'Horas após cadastro'}
          {condition === 'treinos_por_semana' && 'Treinos por semana (mínimo)'}
          {condition === 'dias_sem_progresso' && 'Dias sem progresso'}
          {condition === 'minutos_antecedencia' && 'Minutos antes do treino'}
        </Label>
        <Input
          type="number"
          value={triggerConditions[condition] || ''}
          onChange={(e) => handleConditionChange(condition, e.target.value)}
          className="bg-background border-border text-foreground mt-2"
          placeholder={
            condition === 'dias_sem_treino' ? '3' :
            condition === 'dias_antecedencia' ? '3' :
            condition === 'tempo_cadastro' ? '24' :
            condition === 'treinos_por_semana' ? '2' :
            condition === 'dias_sem_progresso' ? '7' :
            condition === 'minutos_antecedencia' ? '30' : '1'
          }
        />
      </div>
    ));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="bg-card border-border w-full max-w-5xl max-h-[95vh] overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Automações Inteligentes</h2>
              <p className="text-sm text-muted-foreground">Configure notificações automáticas baseadas em comportamento</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="overflow-y-auto max-h-[calc(95vh-140px)]">
          <div className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="existing">Automações Ativas</TabsTrigger>
                <TabsTrigger value="new">Criar Nova Automação</TabsTrigger>
              </TabsList>

              <TabsContent value="existing" className="space-y-4">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : rules.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma automação configurada</h3>
                    <p className="text-muted-foreground mb-4">
                      Crie sua primeira automação para enviar notificações inteligentes baseadas no comportamento dos seus alunos.
                    </p>
                    <Button onClick={() => setActiveTab('new')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Primeira Automação
                    </Button>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {rules.map((rule) => (
                      <Card key={rule.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="font-medium text-foreground">{rule.name}</h4>
                              <Badge 
                                className={`${
                                  rule.is_active 
                                    ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                                    : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                                }`}
                              >
                                {rule.is_active ? 'Ativa' : 'Inativa'}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p>Trigger: {rule.trigger}</p>
                              <p>Execuções: {rule.execution_count}</p>
                              {rule.last_executed && (
                                <p>Última execução: {new Date(rule.last_executed).toLocaleString('pt-BR')}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={rule.is_active}
                              onCheckedChange={(checked) => toggleAutomationRule(rule.id, checked)}
                            />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="new" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Configuração da Automação */}
                  <div className="space-y-4">
                    <Card className="p-4">
                      <h3 className="text-lg font-semibold text-foreground mb-4">Configurar Automação</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="rule-name" className="text-foreground font-medium">Nome da Regra</Label>
                          <Input
                            id="rule-name"
                            value={ruleName}
                            onChange={(e) => setRuleName(e.target.value)}
                            className="bg-background border-border text-foreground mt-2"
                            placeholder="Ex: Lembrete para alunos inativos"
                          />
                        </div>

                        <div>
                          <Label className="text-foreground font-medium">Trigger da Automação</Label>
                          <Select value={selectedTrigger} onValueChange={setSelectedTrigger}>
                            <SelectTrigger className="bg-background border-border text-foreground mt-2">
                              <SelectValue placeholder="Selecione um trigger" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border">
                              {availableTriggers.map((trigger) => (
                                <SelectItem key={trigger.id} value={trigger.id} className="text-foreground">
                                  <div className="flex items-center space-x-3">
                                    {getIconForTrigger(trigger.icon)}
                                    <div>
                                      <p>{trigger.name}</p>
                                      <p className="text-xs text-muted-foreground">{trigger.description}</p>
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {selectedTrigger && (
                          <div className="space-y-3">
                            <Label className="text-foreground font-medium">Condições</Label>
                            {renderConditionInputs()}
                          </div>
                        )}

                        <div>
                          <Label className="text-foreground font-medium">Template de Notificação</Label>
                          <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                            <SelectTrigger className="bg-background border-border text-foreground mt-2">
                              <SelectValue placeholder="Selecione um template" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border">
                              {templates.map((template) => (
                                <SelectItem key={template.id} value={template.id} className="text-foreground">
                                  <div>
                                    <p>{template.title}</p>
                                    <p className="text-xs text-muted-foreground truncate max-w-xs">
                                      {template.message}
                                    </p>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <Button 
                          className="w-full"
                          onClick={handleCreateRule}
                          disabled={!selectedTrigger || !ruleName || !selectedTemplate || loading}
                        >
                          {loading ? (
                            <>
                              <LoadingSpinner />
                              Criando...
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-2" />
                              Criar Automação
                            </>
                          )}
                        </Button>
                      </div>
                    </Card>
                  </div>

                  {/* Triggers Disponíveis */}
                  <div>
                    <Card className="p-4">
                      <h3 className="text-lg font-semibold text-foreground mb-4">Triggers Disponíveis</h3>
                      <div className="space-y-3">
                        {availableTriggers.map((trigger) => (
                          <div 
                            key={trigger.id} 
                            className={`p-3 border rounded-lg cursor-pointer transition-all ${
                              selectedTrigger === trigger.id 
                                ? 'border-primary bg-primary/5' 
                                : 'border-border hover:border-primary/50'
                            }`}
                            onClick={() => setSelectedTrigger(trigger.id)}
                          >
                            <div className="flex items-start space-x-3">
                              {getIconForTrigger(trigger.icon)}
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className="font-medium text-foreground">{trigger.name}</h4>
                                  <Badge variant="outline" className="text-xs">
                                    {trigger.category}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{trigger.description}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </Card>
    </div>
  );
}