import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { NutritionFormula } from '@/hooks/useNutritionFormulas';

const formulaFormSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  category: z.string().min(1, 'Selecione uma categoria'),
  description: z.string().optional(),
  ingredients: z.array(z.object({
    name: z.string().min(1, 'Nome do ingrediente é obrigatório'),
    quantity: z.string().min(1, 'Quantidade é obrigatória'),
    unit: z.string().min(1, 'Unidade é obrigatória')
  })).min(1, 'Adicione pelo menos um ingrediente')
});

type FormulaFormData = z.infer<typeof formulaFormSchema>;

interface AddFormulaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formula: Omit<NutritionFormula, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => void;
  editData?: NutritionFormula | null;
}

export default function AddFormulaModal({ isOpen, onClose, onSave, editData }: AddFormulaModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormulaFormData>({
    resolver: zodResolver(formulaFormSchema),
    defaultValues: {
      name: editData?.name || '',
      category: editData?.category || '',
      description: editData?.description || '',
      ingredients: editData?.ingredients || [{ name: '', quantity: '', unit: '' }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'ingredients'
  });

  const onSubmit = async (data: FormulaFormData) => {
    setIsLoading(true);
    try {
      // Validate ingredients have all required fields
      const validIngredients = data.ingredients.filter(ing => 
        ing.name.trim() && ing.quantity.trim() && ing.unit.trim()
      );
      
      if (validIngredients.length === 0) {
        toast({
          title: "Erro",
          description: "Adicione pelo menos um ingrediente completo.",
          variant: "destructive",
        });
        return;
      }

      const formulaData = {
        name: data.name.trim(),
        category: data.category.trim(),
        description: data.description?.trim() || null,
        ingredients: validIngredients,
        servings: null,
        prep_time: null,
        cook_time: null,
        instructions: null,
        total_calories: null,
        total_protein: null,
        total_carbs: null,
        total_fat: null
      };

      console.log('🧪 Formula data being sent:', formulaData);

      onSave(formulaData);
      
      toast({
        title: editData ? "Fórmula atualizada!" : "Fórmula adicionada!",
        description: editData 
          ? "A fórmula foi atualizada com sucesso."
          : "A nova fórmula foi adicionada à sua biblioteca.",
      });

      form.reset();
      onClose();
    } catch (error) {
      console.error('❌ Error in formula submission:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao salvar a fórmula. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addIngredient = () => {
    append({ name: '', quantity: '', unit: '' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-3xl h-[95vh] md:h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 pr-12 border-b border-border/40 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button 
              onClick={onClose}
              size="sm"
              variant="ghost"
              className="w-10 h-10 rounded-lg p-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <DialogTitle className="text-xl font-bold text-foreground">
                {editData ? 'Editar fórmula' : 'Adicionar fórmula'}
              </DialogTitle>
              <p className="text-muted-foreground text-sm mt-1">
                {editData ? 'Edite os dados da fórmula' : 'Preencha os dados da nova fórmula'}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5 pt-3">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da fórmula</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Shake proteico de banana" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="shakes">Shakes</SelectItem>
                          <SelectItem value="sucos">Sucos</SelectItem>
                          <SelectItem value="vitaminas">Vitaminas</SelectItem>
                          <SelectItem value="smoothies">Smoothies</SelectItem>
                          <SelectItem value="bebidas">Bebidas</SelectItem>
                          <SelectItem value="outros">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição (opcional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descreva a fórmula, modo de preparo ou observações..."
                        className="min-h-[80px] resize-none"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Ingredientes */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Ingredientes</Label>
                  <Button
                    type="button"
                    onClick={addIngredient}
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar ingrediente
                  </Button>
                </div>

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 border border-border rounded-lg">
                      <div className="md:col-span-5">
                        <FormField
                          control={form.control}
                          name={`ingredients.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ingrediente</FormLabel>
                              <FormControl>
                                <Input placeholder="Ex: Whey protein" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="md:col-span-3">
                        <FormField
                          control={form.control}
                          name={`ingredients.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantidade</FormLabel>
                              <FormControl>
                                <Input placeholder="Ex: 30" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="md:col-span-3">
                        <FormField
                          control={form.control}
                          name={`ingredients.${index}.unit`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Unidade</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Unidade" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="g">Gramas (g)</SelectItem>
                                  <SelectItem value="ml">Mililitros (ml)</SelectItem>
                                  <SelectItem value="unidade">Unidade</SelectItem>
                                  <SelectItem value="colher-sopa">Colher de sopa</SelectItem>
                                  <SelectItem value="colher-cha">Colher de chá</SelectItem>
                                  <SelectItem value="xicara">Xícara</SelectItem>
                                  <SelectItem value="copo">Copo</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="md:col-span-1 flex items-end">
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            onClick={() => remove(index)}
                            size="sm"
                            variant="outline"
                            className="w-full md:w-auto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </form>
          </Form>
        </div>

        {/* Footer fixo */}
        <div className="flex justify-end gap-2 px-5 pb-5 pt-3 border-t border-border/40 flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button 
            onClick={form.handleSubmit(onSubmit)}
            disabled={isLoading}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8"
          >
            {isLoading ? "Salvando..." : editData ? "Atualizar fórmula" : "Adicionar fórmula"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}