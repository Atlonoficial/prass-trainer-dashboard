import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useAdvancedMarketing } from '@/hooks/useAdvancedMarketing';
import { MarketingCampaign } from '@/services/advancedMarketingService';
import { Plus, Trash2, Clock, Users, Target } from 'lucide-react';

interface AdvancedCampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign?: MarketingCampaign;
}

export const AdvancedCampaignModal = ({
  open,
  onOpenChange,
  campaign
}: AdvancedCampaignModalProps) => {
  const { createCampaign, updateCampaign, engagementSegments, isCreatingCampaign, isUpdatingCampaign } = useAdvancedMarketing();
  
  const [campaignData, setCampaignData] = useState({
    name: campaign?.name || '',
    description: campaign?.description || '',
    campaign_type: campaign?.campaign_type || 'automated' as const,
    status: campaign?.status || 'draft' as const,
    triggers: campaign?.triggers || [],
    banner_template: campaign?.banner_template || {
      title: '',
      message: '',
      type: 'info',
      action_text: '',
      action_url: ''
    },
    target_segments: campaign?.target_segments || [],
    schedule_config: campaign?.schedule_config || null,
    start_date: campaign?.start_date || '',
    end_date: campaign?.end_date || '',
    performance_metrics: campaign?.performance_metrics || {}
  });

  const [currentTrigger, setCurrentTrigger] = useState({
    type: 'user_action',
    condition: '',
    value: ''
  });

  const addTrigger = () => {
    if (currentTrigger.type && currentTrigger.condition) {
      setCampaignData(prev => ({
        ...prev,
        triggers: [...prev.triggers, { ...currentTrigger }]
      }));
      setCurrentTrigger({ type: 'user_action', condition: '', value: '' });
    }
  };

  const removeTrigger = (index: number) => {
    setCampaignData(prev => ({
      ...prev,
      triggers: prev.triggers.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = () => {
    if (campaign) {
      updateCampaign({ id: campaign.id, updates: campaignData });
    } else {
      createCampaign(campaignData);
    }
    onOpenChange(false);
  };

  const triggerTypes = [
    { value: 'user_action', label: 'Ação do Usuário' },
    { value: 'time_based', label: 'Baseado em Tempo' },
    { value: 'engagement', label: 'Nível de Engajamento' },
    { value: 'behavioral', label: 'Comportamental' }
  ];

  const conditionsByType = {
    user_action: ['login', 'signup', 'course_completion', 'appointment_booked'],
    time_based: ['daily', 'weekly', 'monthly', 'custom_schedule'],
    engagement: ['high_engagement', 'low_engagement', 'inactive_user'],
    behavioral: ['page_visit', 'feature_usage', 'goal_completion']
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {campaign ? 'Editar Campanha' : 'Nova Campanha Automatizada'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Informações Básicas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Nome da Campanha</Label>
                <Input
                  id="name"
                  value={campaignData.name}
                  onChange={(e) => setCampaignData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Boas-vindas para novos usuários"
                />
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={campaignData.description}
                  onChange={(e) => setCampaignData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva o objetivo desta campanha..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo de Campanha</Label>
                  <Select
                    value={campaignData.campaign_type}
                    onValueChange={(value: 'automated' | 'scheduled' | 'triggered') =>
                      setCampaignData(prev => ({ ...prev, campaign_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="automated">Automatizada</SelectItem>
                      <SelectItem value="scheduled">Agendada</SelectItem>
                      <SelectItem value="triggered">Por Gatilho</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Status</Label>
                  <Select
                    value={campaignData.status}
                    onValueChange={(value: 'draft' | 'active' | 'paused' | 'completed') =>
                      setCampaignData(prev => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="active">Ativa</SelectItem>
                      <SelectItem value="paused">Pausada</SelectItem>
                      <SelectItem value="completed">Concluída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Template do Banner */}
          <Card>
            <CardHeader>
              <CardTitle>Template do Banner</CardTitle>
              <CardDescription>
                Configure como será o banner gerado por esta campanha
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Título do Banner</Label>
                <Input
                  value={campaignData.banner_template.title}
                  onChange={(e) => setCampaignData(prev => ({
                    ...prev,
                    banner_template: { ...prev.banner_template, title: e.target.value }
                  }))}
                  placeholder="Ex: Bem-vindo à plataforma!"
                />
              </div>

              <div>
                <Label>Mensagem</Label>
                <Textarea
                  value={campaignData.banner_template.message}
                  onChange={(e) => setCampaignData(prev => ({
                    ...prev,
                    banner_template: { ...prev.banner_template, message: e.target.value }
                  }))}
                  placeholder="Conteúdo da mensagem do banner..."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <Select
                    value={campaignData.banner_template.type}
                    onValueChange={(value) => setCampaignData(prev => ({
                      ...prev,
                      banner_template: { ...prev.banner_template, type: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Informativo</SelectItem>
                      <SelectItem value="success">Sucesso</SelectItem>
                      <SelectItem value="warning">Aviso</SelectItem>
                      <SelectItem value="promotion">Promoção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Texto do Botão</Label>
                  <Input
                    value={campaignData.banner_template.action_text}
                    onChange={(e) => setCampaignData(prev => ({
                      ...prev,
                      banner_template: { ...prev.banner_template, action_text: e.target.value }
                    }))}
                    placeholder="Ex: Começar agora"
                  />
                </div>

                <div>
                  <Label>URL de Ação</Label>
                  <Input
                    value={campaignData.banner_template.action_url}
                    onChange={(e) => setCampaignData(prev => ({
                      ...prev,
                      banner_template: { ...prev.banner_template, action_url: e.target.value }
                    }))}
                    placeholder="https://..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gatilhos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Gatilhos de Ativação
              </CardTitle>
              <CardDescription>
                Configure quando esta campanha deve ser executada
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Tipo de Gatilho</Label>
                  <Select
                    value={currentTrigger.type}
                    onValueChange={(value) => setCurrentTrigger(prev => ({ ...prev, type: value, condition: '' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {triggerTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Condição</Label>
                  <Select
                    value={currentTrigger.condition}
                    onValueChange={(value) => setCurrentTrigger(prev => ({ ...prev, condition: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma condição" />
                    </SelectTrigger>
                    <SelectContent>
                      {conditionsByType[currentTrigger.type]?.map(condition => (
                        <SelectItem key={condition} value={condition}>
                          {condition.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    onClick={addTrigger}
                    className="w-full"
                    disabled={!currentTrigger.type || !currentTrigger.condition}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
              </div>

              {campaignData.triggers.length > 0 && (
                <div className="space-y-2">
                  <Label>Gatilhos Configurados</Label>
                  {campaignData.triggers.map((trigger, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {triggerTypes.find(t => t.value === trigger.type)?.label}
                        </Badge>
                        <span className="text-sm">{trigger.condition}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeTrigger(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Segmentação */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Segmentação de Público
              </CardTitle>
              <CardDescription>
                Selecione quais segmentos de usuários devem receber esta campanha
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {engagementSegments.map((segment) => (
                  <div key={segment.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{segment.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {segment.description} ({segment.user_count} usuários)
                      </div>
                    </div>
                    <Switch
                      checked={campaignData.target_segments.some((s: any) => s.id === segment.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setCampaignData(prev => ({
                            ...prev,
                            target_segments: [...prev.target_segments, segment]
                          }));
                        } else {
                          setCampaignData(prev => ({
                            ...prev,
                            target_segments: prev.target_segments.filter((s: any) => s.id !== segment.id)
                          }));
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Agendamento */}
          {campaignData.campaign_type === 'scheduled' && (
            <Card>
              <CardHeader>
                <CardTitle>Agendamento</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data de Início</Label>
                  <Input
                    type="datetime-local"
                    value={campaignData.start_date}
                    onChange={(e) => setCampaignData(prev => ({ ...prev, start_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Data de Fim</Label>
                  <Input
                    type="datetime-local"
                    value={campaignData.end_date}
                    onChange={(e) => setCampaignData(prev => ({ ...prev, end_date: e.target.value }))}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isCreatingCampaign || isUpdatingCampaign || !campaignData.name}
          >
            {campaign ? 'Atualizar' : 'Criar'} Campanha
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};