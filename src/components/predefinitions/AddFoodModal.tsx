import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ChevronLeft, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { categoryMapping, validateMealData, sanitizeMealData } from '@/lib/predefinitionsMapping';
import { useMeals, type Meal } from '@/hooks/useMeals';

// Helper function to extract numeric value from string (removes units)
const parseNumericValue = (value: string): number => {
  const numericValue = parseFloat(value.replace(/[^\d.,]/g, '').replace(',', '.'));
  return isNaN(numericValue) ? 0 : numericValue;
};

const foodFormSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  category: z.string().optional(),
  portion_amount: z.string().min(1, 'Informe a quantidade da porção'),
  portion_unit: z.string().min(1, 'Informe a unidade da porção'),
  carbs: z.string().min(1, 'Informe os carboidratos'),
  protein: z.string().min(1, 'Informe as proteínas'),
  fat: z.string().min(1, 'Informe as gorduras'),
  fiber: z.string().optional(),
  calories: z.string().min(1, 'Informe as calorias'),
  description: z.string().optional()
});

type FoodFormData = z.infer<typeof foodFormSchema>;

interface AddFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (meal: Meal) => void;
  editData?: Meal;
}

export default function AddFoodModal({ isOpen, onClose, onSave, editData }: AddFoodModalProps) {
  const { toast } = useToast();
  const { addMeal, updateMeal } = useMeals();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FoodFormData>({
    resolver: zodResolver(foodFormSchema),
    defaultValues: {
      name: editData?.name || '',
      category: editData?.category || '',
      portion_amount: editData?.portion_amount?.toString() || '',
      portion_unit: editData?.portion_unit || '',
      carbs: editData?.carbs?.toString() || '',
      protein: editData?.protein?.toString() || '',
      fat: editData?.fat?.toString() || '',
      fiber: editData?.fiber?.toString() || '',
      calories: editData?.calories?.toString() || '',
      description: editData?.description || ''
    }
  });

  const onSubmit = async (data: FoodFormData) => {
    console.log('🔄 Form submission started with data:', data)
    setIsLoading(true);
    
    try {
      // FASE 2: Validação aprimorada de dados no frontend
      const validatedData = {
        name: data.name?.trim(),
        category: data.category?.trim() || null,
        portion_amount: parseNumericValue(data.portion_amount),
        portion_unit: data.portion_unit?.trim(),
        carbs: parseNumericValue(data.carbs),
        protein: parseNumericValue(data.protein),
        fat: parseNumericValue(data.fat),
        fiber: data.fiber ? parseNumericValue(data.fiber) : null,
        calories: Math.round(parseNumericValue(data.calories)),
        description: data.description?.trim() || null
      };

      // Validações específicas
      if (!validatedData.name) {
        throw new Error('Nome do alimento é obrigatório')
      }
      if (validatedData.calories <= 0) {
        throw new Error('Calorias devem ser maior que zero')
      }
      if (validatedData.protein < 0 || validatedData.carbs < 0 || validatedData.fat < 0) {
        throw new Error('Valores nutricionais não podem ser negativos')
      }

      console.log('✅ Form data validated:', validatedData)

      let result;
      if (editData) {
        console.log('🔄 Updating existing meal:', editData.id)
        await updateMeal(editData.id, validatedData);
        result = { ...editData, ...validatedData };
      } else {
        console.log('🔄 Creating new meal')
        result = await addMeal(validatedData);
      }

      if (onSave) {
        onSave(result);
      }

      form.reset();
      onClose();
      console.log('✅ Form submission completed successfully')
      
    } catch (error: any) {
      console.error('❌ Form submission error:', error);
      
      // FASE 3: Tratamento específico de erros do formulário
      let errorMessage = "Verifique os dados e tente novamente."
      
      if (error.message) {
        errorMessage = error.message
      }
      
      toast({
        title: "Erro ao salvar alimento",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-2xl h-[95vh] md:h-auto md:max-h-[90vh] overflow-hidden p-3 md:p-6 flex flex-col">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <Button 
              onClick={handleClose}
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground w-10 h-10 rounded-lg p-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <DialogTitle className="text-xl font-bold text-foreground">
                {editData ? 'Editar alimento' : 'Adicionar alimento'}
              </DialogTitle>
              <p className="text-muted-foreground text-sm mt-1">
                {editData ? 'Atualize as informações do alimento' : 'Preencha as informações do novo alimento'}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto min-h-0">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4 flex flex-col h-full">
              <div className="flex-1 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Nome do alimento</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Arroz branco cozido" {...field} />
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
                        <FormControl>
                           <Combobox
                            options={[
                              { value: "", label: "Sem categoria" },
                              { value: "breakfast", label: "Café da manhã" },
                              { value: "lunch", label: "Almoço" },
                              { value: "dinner", label: "Jantar" },
                              { value: "snack", label: "Lanche" }
                            ]}
                            value={field.value || ""}
                            onValueChange={field.onChange}
                            placeholder="Categoria (opcional)"
                            searchPlaceholder="Buscar categoria..."
                            emptyText="Nenhuma categoria encontrada"
                            allowCustom={true}
                            className="w-full"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="portion_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantidade da porção</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: 100" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="portion_unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unidade</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="g">gramas</SelectItem>
                            <SelectItem value="ml">ml</SelectItem>
                            <SelectItem value="unidade">unidade</SelectItem>
                            <SelectItem value="fatia">fatia</SelectItem>
                            <SelectItem value="xícara">xícara</SelectItem>
                            <SelectItem value="colher">colher</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="carbs"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Carboidratos (g)</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: 28.1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="protein"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Proteínas (g)</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: 2.5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gorduras (g)</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: 0.2" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fiber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fibras (g)</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: 1.6 (opcional)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="calories"
                  render={({ field }) => (
                    <FormItem className="md:w-1/2">
                      <FormLabel>Calorias (kcal)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 128" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição (opcional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Informações adicionais sobre o alimento"
                          className="min-h-[80px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border mt-6 bg-background sticky bottom-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1 sm:flex-none"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground flex-1 sm:flex-none"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      {editData ? 'Salvar alterações' : 'Adicionar alimento'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}