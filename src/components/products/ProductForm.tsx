import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUpload } from '@/components/ui/image-upload';
import { Product } from '@/hooks/useProducts';

interface ProductFormProps {
  product?: Product | null;
  onSubmit: (product: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'instructor_id'>) => void;
}

export default function ProductForm({ product, onSubmit }: ProductFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    is_digital: false,
    stock: 0,
    category: '',
    image_url: '',
    files: [] as any[],
    is_published: false
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: product.price || 0,
        is_digital: product.is_digital || false,
        stock: product.stock || 0,
        category: product.category || '',
        image_url: product.image_url || '',
        files: product.files || [],
        is_published: product.is_published || false
      });
    } else {
      // Reset form for new product
      setFormData({
        name: '',
        description: '',
        price: 0,
        is_digital: false,
        stock: 0,
        category: '',
        image_url: '',
        files: [],
        is_published: false
      });
    }
  }, [product]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const categories = [
    'Suplementos',
    'Equipamentos',
    'Acessórios',
    'Roupas',
    'Livros',
    'Materiais',
    'Outros'
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Linha 1: Nome e Categoria */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-sm font-medium">Nome do Produto *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Nome do produto"
            required
            className="h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="category" className="text-sm font-medium">Categoria</Label>
          <Select 
            value={formData.category} 
            onValueChange={(value) => setFormData({ ...formData, category: value })}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Selecione uma categoria" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Linha 2: Descrição (largura completa) */}
      <div className="space-y-1.5">
        <Label htmlFor="description" className="text-sm font-medium">Descrição</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Descreva seu produto..."
          rows={2}
          className="resize-none"
        />
      </div>

      {/* Linha 3: Preço, Estoque e Upload */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="price" className="text-sm font-medium">Preço (R$) *</Label>
          <Input
            id="price"
            type="number"
            min="0"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
            required
            className="h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="stock" className="text-sm font-medium">Estoque *</Label>
          <Input
            id="stock"
            type="number"
            min="0"
            value={formData.stock}
            onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
            required
            className="h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Imagem do Produto</Label>
          <ImageUpload
            bucket="product-images"
            path={`products`}
            onImageUpload={(url) => setFormData({ ...formData, image_url: url })}
            currentImage={formData.image_url}
            label="Selecionar imagem"
          />
        </div>
      </div>

      {/* Preview do Produto (se houver imagem) */}
      {formData.image_url && (
        <div className="flex justify-center">
          <div className="border border-border rounded-lg overflow-hidden bg-card w-full max-w-sm">
            <img 
              src={formData.image_url} 
              alt="Preview do produto"
              className="w-full h-40 object-cover"
            />
            <div className="p-3">
              <h4 className="font-medium text-foreground truncate">
                {formData.name || 'Nome do Produto'}
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                R$ {formData.price.toFixed(2)}
              </p>
              {formData.stock > 0 && (
                <p className="text-xs text-green-600 mt-1">
                  {formData.stock} em estoque
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Switch de Publicação */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center space-x-3">
          <Switch
            id="is_published"
            checked={formData.is_published}
            onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
          />
          <div>
            <Label htmlFor="is_published" className="text-sm font-medium">Publicar Produto</Label>
            <p className="text-xs text-muted-foreground">
              O produto ficará visível para os alunos
            </p>
          </div>
        </div>
      </div>


      <div className="flex gap-3 pt-4">
        <Button type="submit" className="flex-1">
          {product ? 'Atualizar Produto' : 'Criar Produto'}
        </Button>
      </div>
    </form>
  );
}