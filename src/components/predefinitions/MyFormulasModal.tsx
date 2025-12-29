import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronLeft, Plus, Search, MoreVertical, Edit, Trash2, Beaker } from 'lucide-react'
import { cn } from '@/lib/utils'
import AddFormulaModal from './AddFormulaModal'
import { useToast } from '@/hooks/use-toast'
import { useNutritionFormulas, type NutritionFormula } from '@/hooks/useNutritionFormulas'

interface MyFormulasModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function MyFormulasModal({ isOpen, onClose }: MyFormulasModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingFormula, setEditingFormula] = useState<NutritionFormula | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [formulaToDelete, setFormulaToDelete] = useState<NutritionFormula | null>(null)
  const { toast } = useToast()
  
  const { formulas, loading, addFormula, updateFormula, deleteFormula } = useNutritionFormulas()

  const filteredFormulas = formulas.filter(formula =>
    formula.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    formula.category?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSaveFormula = async (formulaData: Omit<NutritionFormula, 'id' | 'created_at' | 'created_by' | 'updated_at'>) => {
    try {
      console.log('🧪 Saving formula from modal:', formulaData);
      if (editingFormula) {
        await updateFormula(editingFormula.id, formulaData);
      } else {
        await addFormula(formulaData);
      }
      setEditingFormula(null)
      setShowAddModal(false)
    } catch (error) {
      console.error('❌ Error saving formula:', error);
    }
  }

  const handleEditFormula = (formula: NutritionFormula) => {
    setEditingFormula(formula)
    setShowAddModal(true)
  }

  const handleDeleteClick = (formula: NutritionFormula) => {
    setFormulaToDelete(formula)
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = async () => {
    if (formulaToDelete) {
      try {
        console.log('🗑️ Deleting formula:', formulaToDelete.name);
        await deleteFormula(formulaToDelete.id)
      } catch (error) {
        console.error('❌ Error deleting formula:', error);
      }
    }
    setShowDeleteDialog(false)
    setFormulaToDelete(null)
  }

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
              <DialogTitle>Minhas Fórmulas Nutricionais</DialogTitle>
            </div>
          </DialogHeader>
          
          <div className="flex flex-col space-y-4 flex-1 min-h-0 px-5 pb-5 pt-3 overflow-y-auto">
            <div className="flex gap-3 flex-shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar fórmulas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Nova Fórmula
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index} className="h-56" />
                  ))}
                </div>
              ) : filteredFormulas.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Plus className="w-12 h-12 mb-4" />
                  <p className="text-lg font-medium">Nenhuma fórmula encontrada</p>
                  <p className="text-sm">Crie sua primeira fórmula nutricional</p>
                </div>
              ) : (
                <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {filteredFormulas.map(formula => (
                    <Card 
                      key={formula.id} 
                      className={cn(
                        "group relative overflow-hidden",
                        "border border-border/40 bg-card/50 backdrop-blur-sm",
                        "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
                        "transition-all duration-300 ease-out",
                        "p-4"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg text-foreground leading-tight line-clamp-1 mb-2">
                            {formula.name}
                          </h3>
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-5 border-border/50">
                            {formula.category}
                          </Badge>
                        </div>
                        
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <MoreVertical className="w-3.5 h-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => handleEditFormula(formula)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteClick(formula)}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      
                      {formula.description && (
                        <p className="text-xs text-muted-foreground/80 line-clamp-2 mb-3 leading-relaxed">
                          {formula.description}
                        </p>
                      )}
                      
                      <div className="pt-3 border-t border-border/40">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                            <Beaker className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <h4 className="text-xs font-medium text-muted-foreground">Ingredientes</h4>
                        </div>
                        <div className="space-y-1.5">
                          {formula.ingredients.slice(0, 3).map((ingredient, index) => (
                            <div key={index} className="text-xs bg-muted/50 px-2 py-1.5 rounded border border-border/30">
                              <span className="font-medium">{ingredient.name}</span>
                              <span className="text-muted-foreground ml-1">
                                • {ingredient.quantity}{ingredient.unit}
                              </span>
                            </div>
                          ))}
                          {formula.ingredients.length > 3 && (
                            <Badge variant="outline" className="text-[10px] w-full justify-center py-1">
                              +{formula.ingredients.length - 3} ingredientes
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <AddFormulaModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          setEditingFormula(null)
        }}
        onSave={handleSaveFormula}
        editData={editingFormula}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a fórmula "{formulaToDelete?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}