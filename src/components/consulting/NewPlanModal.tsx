import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, DollarSign, FileText, Users, Target } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface NewPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewPlanModal = ({ isOpen, onClose }: NewPlanModalProps) => {
  const [planData, setPlanData] = useState({
    name: '',
    description: '',
    duration: '',
    durationType: 'months',
    price: '',
    maxStudents: '',
    category: '',
    objectives: '',
    includes: [''],
    active: true
  });

  const handleInputChange = (field: string, value: string | boolean | number) => {
    setPlanData(prev => ({ ...prev, [field]: value }));
  };

  const handleIncludeChange = (index: number, value: string) => {
    const newIncludes = [...planData.includes];
    newIncludes[index] = value;
    setPlanData(prev => ({ ...prev, includes: newIncludes }));
  };

  const addInclude = () => {
    setPlanData(prev => ({ ...prev, includes: [...prev.includes, ''] }));
  };

  const removeInclude = (index: number) => {
    const newIncludes = planData.includes.filter((_, i) => i !== index);
    setPlanData(prev => ({ ...prev, includes: newIncludes }));
  };

  const handleSave = () => {
    if (!planData.name || !planData.duration || !planData.price) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome, duração e preço do plano.",
        variant: "destructive"
      });
      return;
    }

    // Aqui você integraria com seu sistema de backend
    // Salvando plano de consultoria

    toast({
      title: "Plano criado com sucesso!",
      description: `O plano "${planData.name}" foi criado e está ${planData.active ? 'ativo' : 'inativo'}.`,
    });

    onClose();
    // Reset form
    setPlanData({
      name: '',
      description: '',
      duration: '',
      durationType: 'months',
      price: '',
      maxStudents: '',
      category: '',
      objectives: '',
      includes: [''],
      active: true
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-background border-border max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b border-border sticky top-0 bg-background z-10">
          <DialogTitle className="text-foreground flex items-center gap-2 text-xl">
            <Target className="h-6 w-6 text-primary" />
            Criar Novo Plano de Consultoria
          </DialogTitle>
          <DialogDescription className="text-base mt-1.5">
            Configure um novo plano de consultoria com duração, preços e benefícios incluídos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8 p-6">
          {/* Informações Básicas */}
          <Card className="bg-card border-border shadow-sm">
            <CardContent className="p-6 space-y-6">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 border-b border-border pb-2">
                <FileText className="h-5 w-5 text-primary" />
                Informações Básicas
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <Label htmlFor="name" className="text-foreground text-sm font-medium">Nome do Plano *</Label>
                  <Input
                    id="name"
                    value={planData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Ex: Plano Nutricional Premium"
                    className="bg-background border-border text-foreground h-10"
                  />
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="category" className="text-foreground text-sm font-medium">Categoria</Label>
                  <Select value={planData.category} onValueChange={(value) => handleInputChange('category', value)}>
                    <SelectTrigger className="bg-background border-border text-foreground h-10">
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border">
                      <SelectItem value="nutricional">Nutricional</SelectItem>
                      <SelectItem value="treino">Treino</SelectItem>
                      <SelectItem value="completo">Completo (Nutrição + Treino)</SelectItem>
                      <SelectItem value="acompanhamento">Acompanhamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="description" className="text-foreground text-sm font-medium">Descrição</Label>
                <Textarea
                  id="description"
                  value={planData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Descreva os benefícios e características do plano..."
                  className="bg-background border-border text-foreground min-h-[100px] resize-none"
                />
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="objectives" className="text-foreground text-sm font-medium">Objetivos</Label>
                <Textarea
                  id="objectives"
                  value={planData.objectives}
                  onChange={(e) => handleInputChange('objectives', e.target.value)}
                  placeholder="Quais objetivos este plano ajuda a alcançar?"
                  className="bg-background border-border text-foreground min-h-[80px] resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Duração e Preço */}
          <Card className="bg-card border-border shadow-sm">
            <CardContent className="p-6 space-y-6">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 border-b border-border pb-2">
                <Clock className="h-5 w-5 text-primary" />
                Duração e Investimento
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2.5">
                  <Label htmlFor="duration" className="text-foreground text-sm font-medium">Duração *</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={planData.duration}
                    onChange={(e) => handleInputChange('duration', e.target.value)}
                    placeholder="Ex: 3"
                    className="bg-background border-border text-foreground h-10"
                  />
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="durationType" className="text-foreground text-sm font-medium">Período</Label>
                  <Select value={planData.durationType} onValueChange={(value) => handleInputChange('durationType', value)}>
                    <SelectTrigger className="bg-background border-border text-foreground h-10">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border">
                      <SelectItem value="days">Dias</SelectItem>
                      <SelectItem value="weeks">Semanas</SelectItem>
                      <SelectItem value="months">Meses</SelectItem>
                      <SelectItem value="years">Anos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="price" className="text-foreground text-sm font-medium">Preço *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="price"
                      value={planData.price}
                      onChange={(e) => handleInputChange('price', e.target.value)}
                      placeholder="Ex: 297,00"
                      className="bg-background border-border text-foreground pl-10 h-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="maxStudents" className="text-foreground text-sm font-medium">Limite de Alunos</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="maxStudents"
                    type="number"
                    value={planData.maxStudents}
                    onChange={(e) => handleInputChange('maxStudents', e.target.value)}
                    placeholder="Ex: 50 (deixe vazio para ilimitado)"
                    className="bg-background border-border text-foreground pl-10 h-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* O que está incluído */}
          <Card className="bg-card border-border shadow-sm">
            <CardContent className="p-6 space-y-6">
              <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">O que está incluído</h3>

              <div className="space-y-3">
                {planData.includes.map((include, index) => (
                  <div key={index} className="flex gap-3">
                    <Input
                      value={include}
                      onChange={(e) => handleIncludeChange(index, e.target.value)}
                      placeholder="Ex: Consulta inicial personalizada"
                      className="bg-background border-border text-foreground flex-1 h-10"
                    />
                    {planData.includes.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeInclude(index)}
                        className="h-10 w-10 text-muted-foreground hover:text-destructive"
                      >
                        ×
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={addInclude}
                className="w-full h-10 border-dashed"
              >
                + Adicionar Item
              </Button>
            </CardContent>
          </Card>

          {/* Status */}
          <Card className="bg-card border-border shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-foreground text-base font-medium">Status do Plano</Label>
                  <p className="text-sm text-muted-foreground">
                    Defina se o plano estará disponível para novos alunos
                  </p>
                </div>
                <Switch
                  checked={planData.active}
                  onCheckedChange={(checked) => handleInputChange('active', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-4 p-6 pt-2 border-t border-border bg-background sticky bottom-0 z-10">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 h-11"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground h-11 font-medium"
          >
            Criar Plano
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};