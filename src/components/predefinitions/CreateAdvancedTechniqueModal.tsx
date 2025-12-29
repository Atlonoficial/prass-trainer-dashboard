import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';
import { useAdvancedTechniques, AdvancedTechnique } from '@/hooks/useAdvancedTechniques';

interface CreateAdvancedTechniqueModalProps {
  isOpen: boolean;
  onClose: () => void;
  technique?: AdvancedTechnique | null;
}

export default function CreateAdvancedTechniqueModal({ 
  isOpen, 
  onClose, 
  technique 
}: CreateAdvancedTechniqueModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Intensidade' as AdvancedTechnique['category'],
    difficulty: 'Iniciante' as AdvancedTechnique['difficulty'],
    muscles: [] as string[],
    instructions: '',
    examples: [] as string[],
    video_url: '',
    image_url: ''
  });
  
  const [newMuscle, setNewMuscle] = useState('');
  const [newExample, setNewExample] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { addTechnique, updateTechnique } = useAdvancedTechniques();
  
  const isEditing = Boolean(technique);

  // Resetar formulário ao abrir/fechar modal
  useEffect(() => {
    if (isOpen) {
      if (technique) {
        // Modo edição - preencher com dados da técnica
        setFormData({
          name: technique.name,
          description: technique.description,
          category: technique.category,
          difficulty: technique.difficulty,
          muscles: technique.muscles || [],
          instructions: technique.instructions || '',
          examples: technique.examples || [],
          video_url: technique.video_url || '',
          image_url: technique.image_url || ''
        });
      } else {
        // Modo criação - resetar formulário
        setFormData({
          name: '',
          description: '',
          category: 'Intensidade',
          difficulty: 'Iniciante',
          muscles: [],
          instructions: '',
          examples: [],
          video_url: '',
          image_url: ''
        });
      }
      setNewMuscle('');
      setNewExample('');
    }
  }, [isOpen, technique]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.description.trim()) return;

    setIsSubmitting(true);
    try {
      if (isEditing && technique) {
        await updateTechnique(technique.id, formData);
      } else {
        await addTechnique(formData);
      }
      onClose();
    } catch (error) {
      console.error('Error saving technique:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addMuscle = () => {
    if (newMuscle.trim() && !formData.muscles.includes(newMuscle.trim())) {
      setFormData(prev => ({
        ...prev,
        muscles: [...prev.muscles, newMuscle.trim()]
      }));
      setNewMuscle('');
    }
  };

  const removeMuscle = (index: number) => {
    setFormData(prev => ({
      ...prev,
      muscles: prev.muscles.filter((_, i) => i !== index)
    }));
  };

  const addExample = () => {
    if (newExample.trim() && !formData.examples.includes(newExample.trim())) {
      setFormData(prev => ({
        ...prev,
        examples: [...prev.examples, newExample.trim()]
      }));
      setNewExample('');
    }
  };

  const removeExample = (index: number) => {
    setFormData(prev => ({
      ...prev,
      examples: prev.examples.filter((_, i) => i !== index)
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl h-[95vh] overflow-y-auto">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-foreground">
              {isEditing ? 'Editar Técnica Avançada' : 'Nova Técnica Avançada'}
            </DialogTitle>
            <Button 
              onClick={onClose}
              size="sm"
              variant="ghost"
              className="p-2 hover:bg-secondary"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 p-1">
          {/* Nome */}
          <div>
            <Label htmlFor="name" className="text-sm font-medium">Nome da Técnica *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Drop Set, Rest-Pause..."
              required
              className="mt-2"
            />
          </div>

          {/* Descrição */}
          <div>
            <Label htmlFor="description" className="text-sm font-medium">Descrição *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descreva brevemente a técnica..."
              required
              rows={3}
              className="mt-2"
            />
          </div>

          {/* Categoria e Dificuldade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category" className="text-sm font-medium">Categoria</Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as AdvancedTechnique['category'] }))}
                className="w-full mt-2 px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
              >
                <option value="Intensidade">Intensidade</option>
                <option value="Volume">Volume</option>
                <option value="Tempo">Tempo</option>
                <option value="Método">Método</option>
              </select>
            </div>

            <div>
              <Label htmlFor="difficulty" className="text-sm font-medium">Dificuldade</Label>
              <select
                id="difficulty"
                value={formData.difficulty}
                onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value as AdvancedTechnique['difficulty'] }))}
                className="w-full mt-2 px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
              >
                <option value="Iniciante">Iniciante</option>
                <option value="Intermediário">Intermediário</option>
                <option value="Avançado">Avançado</option>
              </select>
            </div>
          </div>

          {/* Músculos */}
          <div>
            <Label className="text-sm font-medium">Músculos Trabalhados</Label>
            <div className="mt-2 space-y-2">
              <div className="flex gap-2">
                <Input
                  value={newMuscle}
                  onChange={(e) => setNewMuscle(e.target.value)}
                  placeholder="Ex: Peito, Bíceps, Quadríceps..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMuscle())}
                />
                <Button type="button" onClick={addMuscle} size="sm" variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              {formData.muscles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.muscles.map((muscle, index) => (
                    <div key={index} className="flex items-center gap-1 bg-secondary px-2 py-1 rounded text-sm">
                      <span>{muscle}</span>
                      <Button
                        type="button"
                        onClick={() => removeMuscle(index)}
                        size="sm"
                        variant="ghost"
                        className="p-0 h-auto text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Instruções */}
          <div>
            <Label htmlFor="instructions" className="text-sm font-medium">Instruções de Execução</Label>
            <Textarea
              id="instructions"
              value={formData.instructions}
              onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
              placeholder="Como executar a técnica passo a passo..."
              rows={4}
              className="mt-2"
            />
          </div>

          {/* Exemplos */}
          <div>
            <Label className="text-sm font-medium">Exemplos Práticos</Label>
            <div className="mt-2 space-y-2">
              <div className="flex gap-2">
                <Input
                  value={newExample}
                  onChange={(e) => setNewExample(e.target.value)}
                  placeholder="Ex: Supino: 100kg x 8 → 80kg x 6..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addExample())}
                />
                <Button type="button" onClick={addExample} size="sm" variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              {formData.examples.length > 0 && (
                <div className="space-y-1">
                  {formData.examples.map((example, index) => (
                    <div key={index} className="flex items-center justify-between bg-secondary px-3 py-2 rounded text-sm">
                      <span>{example}</span>
                      <Button
                        type="button"
                        onClick={() => removeExample(index)}
                        size="sm"
                        variant="ghost"
                        className="p-0 h-auto text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* URLs de Mídia */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="video_url" className="text-sm font-medium">URL do Vídeo</Label>
              <Input
                id="video_url"
                type="url"
                value={formData.video_url}
                onChange={(e) => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
                placeholder="https://youtube.com/watch?v=..."
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="image_url" className="text-sm font-medium">URL da Imagem</Label>
              <Input
                id="image_url"
                type="url"
                value={formData.image_url}
                onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                placeholder="https://exemplo.com/imagem.jpg"
                className="mt-2"
              />
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !formData.name.trim() || !formData.description.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Atualizar' : 'Criar'} Técnica
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}