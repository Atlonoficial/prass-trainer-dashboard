import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { X } from 'lucide-react';

interface WorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (workout: { label: string; description: string; days: string[] }) => void;
}

export default function WorkoutModal({ isOpen, onClose, onSave }: WorkoutModalProps) {
  const [workoutData, setWorkoutData] = useState({
    label: '',
    description: '',
    days: [] as string[]
  });

  const weekDays = [
    { id: 'segunda', label: 'Segunda-feira', note: '' },
    { id: 'terca', label: 'Terça-feira', note: '' },
    { id: 'quarta', label: 'Quarta-feira', note: '' },
    { id: 'quinta', label: 'Quinta-feira', note: '' },
    { id: 'sexta', label: 'Sexta-feira', note: '' },
    { id: 'sabado', label: 'Sábado', note: '' },
    { id: 'domingo', label: 'Domingo', note: '' }
  ];

  const handleDayToggle = (dayId: string) => {
    setWorkoutData(prev => ({
      ...prev,
      days: prev.days.includes(dayId) 
        ? prev.days.filter(d => d !== dayId)
        : [...prev.days, dayId]
    }));
  };

  const handleSave = () => {
    if (workoutData.label.trim()) {
      onSave(workoutData);
      setWorkoutData({ label: '', description: '', days: [] });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-border p-2 sm:p-3">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-foreground">Adicionar Novo Treino</DialogTitle>
              <DialogDescription className="text-caption text-muted-foreground">
                Configure um novo treino para o plano
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="content-spacious">
          <div>
            <Label className="text-foreground font-medium">Label do Treino</Label>
            <Input
              value={workoutData.label}
              onChange={(e) => setWorkoutData(prev => ({ ...prev, label: e.target.value.toUpperCase() }))}
              className="mt-2 bg-background border-input w-16 text-center font-bold text-lg text-foreground"
              placeholder="A"
              maxLength={1}
            />
          </div>

          <div>
            <Label className="text-foreground font-medium">Descrição do Treino</Label>
            <Input
              value={workoutData.description}
              onChange={(e) => setWorkoutData(prev => ({ ...prev, description: e.target.value }))}
              className="mt-2 bg-background border-input text-foreground"
              placeholder="Nome do treino que será exibido no plano"
            />
            <p className="text-caption text-muted-foreground mt-1">Nome do treino que será exibido no plano</p>
          </div>

          <div>
            <Label className="text-foreground font-medium">Dias da Semana para este Treino</Label>
            <p className="text-caption text-muted-foreground mb-4">Selecione os dias em que este treino será realizado:</p>
            
            <div className="grid grid-cols-2 gap-3">
              {weekDays.map((day) => (
                <div key={day.id} className="flex items-center space-x-3 p-3 bg-muted rounded-lg border border-border">
                  <Checkbox
                    id={day.id}
                    checked={workoutData.days.includes(day.id)}
                    onCheckedChange={() => handleDayToggle(day.id)}
                  />
                  <Label htmlFor={day.id} className="text-foreground cursor-pointer">
                    {day.label}
                    {day.note && <span className="text-muted-foreground ml-2">({day.note})</span>}
                  </Label>
                </div>
              ))}
            </div>
            
            <p className="text-caption text-muted-foreground mt-4">
              Dias indisponíveis já possuem outros treinos agendados. Você pode deixar dias desmarcados e definir posteriormente.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={onClose} className="text-foreground border-border">
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!workoutData.label.trim()}
              className="btn-branded"
            >
              Salvar Treino
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}