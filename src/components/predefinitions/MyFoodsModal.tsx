import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, Search, Plus, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import AddFoodModal from './AddFoodModal';
import { useToast } from '@/hooks/use-toast';
import { useMeals, type Meal } from '@/hooks/useMeals';

// Mapeamento de categorias inglês → português
const CATEGORY_TRANSLATIONS: Record<string, string> = {
  'snack': 'Lanche',
  'breakfast': 'Café da Manhã',
  'lunch': 'Almoço',
  'dinner': 'Jantar',
  'dessert': 'Sobremesa',
  'drink': 'Bebida',
  'fruit': 'Fruta',
  'vegetable': 'Vegetal',
  'protein': 'Proteína',
  'carb': 'Carboidrato',
  'fat': 'Gordura',
  'supplement': 'Suplemento',
  'other': 'Outro',
};

const translateCategory = (category: string | null | undefined): string => {
  if (!category) return 'Sem Categoria';
  return CATEGORY_TRANSLATIONS[category.toLowerCase()] || category;
};

interface MyFoodsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MyFoodsModal({ isOpen, onClose }: MyFoodsModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingFood, setEditingFood] = useState<Meal | null>(null);
  const [deletingFood, setDeletingFood] = useState<Meal | null>(null);
  const { meals, loading, deleteMeal, refetch } = useMeals();
  const { toast } = useToast();

  const handleSaveFood = async (meal: Meal) => {
    // Refresh the list after save
    await refetch();
    setShowAddModal(false);
    setEditingFood(null);
  };

  const handleDeleteFood = async () => {
    if (!deletingFood) return;

    try {
      await deleteMeal(deletingFood.id);
      setShowDeleteDialog(false);
      setDeletingFood(null);
    } catch (error) {
      // Error handling is already done in the useMeals hook
    }
  };

  const openEditModal = (meal: Meal) => {
    setEditingFood(meal);
    setShowAddModal(true);
  };

  const openDeleteDialog = (meal: Meal) => {
    setDeletingFood(meal);
    setShowDeleteDialog(true);
  };

  // Filter meals based on search and category
  const filteredMeals = meals.filter(meal => {
    const matchesSearch = meal.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || meal.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="flex flex-row items-center space-y-0 px-5 pt-5 pb-3 pr-12 border-b border-border/40">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="mr-2"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <DialogTitle>Meus Alimentos</DialogTitle>
            </div>
          </DialogHeader>

          <div className="flex flex-col space-y-4 flex-1 min-h-0 px-6 pb-6">
            <div className="flex gap-3 flex-shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar alimentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {Array.from(new Set(meals?.map(meal => meal.category).filter(Boolean))).map(category => (
                    <SelectItem key={category} value={category}>{translateCategory(category)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Novo Alimento
              </Button>
            </div>

            <div className="flex-1 min-h-0 border border-border/40 rounded-lg overflow-hidden bg-card/30 backdrop-blur-sm flex flex-col">
              {loading ? (
                <div className="overflow-y-auto flex-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--border)) transparent' }}>
                  <table className="w-full caption-bottom text-sm">
                    <TableHeader className="bg-background sticky top-0 z-10 border-b border-border">
                      <TableRow className="hover:bg-muted/30">
                        <TableHead className="font-semibold px-4 py-3">Nome</TableHead>
                        <TableHead className="font-semibold px-4 py-3">Categoria</TableHead>
                        <TableHead className="text-right font-semibold px-4 py-3">Cal (100g)</TableHead>
                        <TableHead className="text-right font-semibold px-4 py-3">Prot (g)</TableHead>
                        <TableHead className="text-right font-semibold px-4 py-3">Carb (g)</TableHead>
                        <TableHead className="text-right font-semibold px-4 py-3">Gord (g)</TableHead>
                        <TableHead className="text-right font-semibold px-4 py-3">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from({ length: 8 }).map((_, index) => (
                        <TableRow key={index}>
                          <TableCell className="px-4 py-3"><Skeleton className="h-5 w-32" /></TableCell>
                          <TableCell className="px-4 py-3"><Skeleton className="h-5 w-20" /></TableCell>
                          <TableCell className="px-4 py-3"><Skeleton className="h-5 w-12" /></TableCell>
                          <TableCell className="px-4 py-3"><Skeleton className="h-5 w-12" /></TableCell>
                          <TableCell className="px-4 py-3"><Skeleton className="h-5 w-12" /></TableCell>
                          <TableCell className="px-4 py-3"><Skeleton className="h-5 w-12" /></TableCell>
                          <TableCell className="px-4 py-3"><Skeleton className="h-5 w-8" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </table>
                </div>
              ) : filteredMeals.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Plus className="w-12 h-12 mb-4" />
                  <p className="text-lg font-medium">Nenhum alimento encontrado</p>
                  <p className="text-sm">Adicione seu primeiro alimento personalizado</p>
                </div>
              ) : (
                <div className="overflow-y-auto flex-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--border)) transparent' }}>
                  <table className="w-full caption-bottom text-sm">
                    <TableHeader className="bg-background sticky top-0 z-10 border-b border-border">
                      <TableRow className="hover:bg-muted/30">
                        <TableHead className="font-semibold px-4 py-3">Nome</TableHead>
                        <TableHead className="font-semibold px-4 py-3">Categoria</TableHead>
                        <TableHead className="text-right font-semibold px-4 py-3">Cal (100g)</TableHead>
                        <TableHead className="text-right font-semibold px-4 py-3">Prot (g)</TableHead>
                        <TableHead className="text-right font-semibold px-4 py-3">Carb (g)</TableHead>
                        <TableHead className="text-right font-semibold px-4 py-3">Gord (g)</TableHead>
                        <TableHead className="text-right font-semibold px-4 py-3">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMeals.map((meal) => (
                        <TableRow
                          key={meal.id}
                          className="hover:bg-muted/30 transition-colors group"
                        >
                          <TableCell className="font-semibold text-base px-4 py-3">{meal.name}</TableCell>
                          <TableCell className="px-4 py-3">
                            <Badge
                              variant="outline"
                              className="text-[10px] px-2 py-0.5 h-5 border-border/50"
                            >
                              {translateCategory(meal.category)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium px-4 py-3">{meal.calories}</TableCell>
                          <TableCell className="text-right px-4 py-3">{meal.protein.toFixed(1)}</TableCell>
                          <TableCell className="text-right px-4 py-3">{meal.carbs.toFixed(1)}</TableCell>
                          <TableCell className="text-right px-4 py-3">{meal.fat.toFixed(1)}</TableCell>
                          <TableCell className="text-right px-4 py-3">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEditModal(meal)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => openDeleteDialog(meal)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AddFoodModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingFood(null);
        }}
        onSave={handleSaveFood}
        editData={editingFood}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o alimento "{deletingFood?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFood}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}