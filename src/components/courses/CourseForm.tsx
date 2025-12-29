import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ImageUpload } from '@/components/ui/image-upload';

interface CourseFormProps {
  onSubmit: (course: {
    title: string;
    description: string;
    category: string;
    duration: string;
    price: number;
    isFree: boolean;
    coverImage: string;
  }) => void;
}

export default function CourseForm({ onSubmit }: CourseFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    duration: '',
    price: '',
    isFree: false,
    coverImage: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title: formData.title,
      description: formData.description,
      category: formData.category,
      duration: formData.duration,
      price: formData.isFree ? 0 : parseFloat(formData.price),
      isFree: formData.isFree,
      coverImage: formData.coverImage || 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=400&h=250&fit=crop'
    });
    setFormData({
      title: '',
      description: '',
      category: '',
      duration: '',
      price: '',
      isFree: false,
      coverImage: ''
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-1.5">
      <div>
        <Label htmlFor="title" className="text-foreground">Título do Curso</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="bg-input border-border text-foreground"
          required
        />
      </div>

      <div>
        <Label htmlFor="description" className="text-foreground">Descrição</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="bg-input border-border text-foreground"
          rows={1}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <div>
          <Label htmlFor="category" className="text-foreground">Categoria</Label>
          <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
            <SelectTrigger className="bg-input border-border text-foreground">
              <SelectValue placeholder="Selecione a categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Nutrição">Nutrição</SelectItem>
              <SelectItem value="Treinamento">Treinamento</SelectItem>
              <SelectItem value="Fitness">Fitness</SelectItem>
              <SelectItem value="Suplementação">Suplementação</SelectItem>
              <SelectItem value="Mentoria">Mentoria</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="duration" className="text-foreground">Duração</Label>
          <Input
            id="duration"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
            className="bg-input border-border text-foreground"
            placeholder="Ex: 8 semanas"
            required
          />
        </div>
      </div>

      <div className="flex items-center space-x-1.5">
        <Checkbox
          id="isFree"
          checked={formData.isFree}
          onCheckedChange={(checked) => setFormData({ ...formData, isFree: checked as boolean })}
        />
        <Label htmlFor="isFree" className="text-foreground">Curso gratuito</Label>
      </div>

      {!formData.isFree && (
        <div>
          <Label htmlFor="price" className="text-foreground">Preço (R$)</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            className="bg-input border-border text-foreground"
            required={!formData.isFree}
          />
        </div>
      )}

      <div>
        <Label className="text-foreground">Imagem de Capa do Curso</Label>
        <ImageUpload
          bucket="course-images"
          path={`courses`}
          onImageUpload={(url) => setFormData({ ...formData, coverImage: url })}
          currentImage={formData.coverImage}
          label="Selecionar imagem de capa (1280x720px recomendado)"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Tamanho recomendado: 1280x720 pixels (proporção 16:9) para melhor visualização
        </p>
      </div>

      <Button type="submit" className="w-full btn-branded">
        Criar Curso
      </Button>
    </form>
  );
}