import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ChevronLeft, Search, Plus, Zap, Edit, Trash2, PlayCircle, MoreHorizontal, Clock } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useAdvancedTechniques, AdvancedTechnique } from '@/hooks/useAdvancedTechniques';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Skeleton } from '@/components/ui/skeleton';
import CreateAdvancedTechniqueModal from './CreateAdvancedTechniqueModal';
import VideoPlayerModal from './VideoPlayerModal';

interface AdvancedTechniquesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdvancedTechniquesModal({ isOpen, onClose }: AdvancedTechniquesModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTechnique, setEditingTechnique] = useState<AdvancedTechnique | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<{ url: string; title: string } | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [techniqueToDelete, setTechniqueToDelete] = useState<AdvancedTechnique | null>(null);
  
  const {
    techniques,
    loading,
    deleteTechnique,
    searchTechniques,
    getTechniquesByCategory,
    getTechniquesByDifficulty,
    refetch
  } = useAdvancedTechniques();

  // Filtrar técnicas baseado nos critérios
  const getFilteredTechniques = () => {
    let filtered = techniques;
    
    if (searchTerm) {
      filtered = searchTechniques(searchTerm);
    }
    if (selectedCategory) {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }
    if (selectedDifficulty) {
      filtered = filtered.filter(t => t.difficulty === selectedDifficulty);
    }
    
    return filtered;
  };

  const filteredTechniques = getFilteredTechniques();

  const handleCreateTechnique = () => {
    setEditingTechnique(null);
    setShowCreateModal(true);
  };

  const handleEditTechnique = (technique: AdvancedTechnique) => {
    setEditingTechnique(technique);
    setShowCreateModal(true);
  };

  const handlePlayVideo = (videoUrl: string, title: string) => {
    setSelectedVideo({ url: videoUrl, title });
    setShowVideoModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setEditingTechnique(null);
  };

  const handleCloseVideoModal = () => {
    setShowVideoModal(false);
    setSelectedVideo(null);
  };

  const handleDeleteClick = (technique: AdvancedTechnique) => {
    setTechniqueToDelete(technique);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (techniqueToDelete) {
      try {
        await deleteTechnique(techniqueToDelete.id);
        setShowDeleteDialog(false);
        setTechniqueToDelete(null);
      } catch (error) {
        // Error handled by hook
      }
    }
  };

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
              <DialogTitle>Técnicas Avançadas</DialogTitle>
            </div>
          </DialogHeader>

          <div className="flex flex-col space-y-4 flex-1 min-h-0 px-6 py-4">
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar técnicas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm w-32"
              >
                <option value="">Categoria</option>
                <option value="Intensidade">Intensidade</option>
                <option value="Volume">Volume</option>
                <option value="Tempo">Tempo</option>
                <option value="Método">Método</option>
              </select>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm w-32"
              >
                <option value="">Dificuldade</option>
                <option value="Iniciante">Iniciante</option>
                <option value="Intermediário">Intermediário</option>
                <option value="Avançado">Avançado</option>
              </select>
              <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Nova
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
              {loading ? (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-56" />
                  ))}
                </div>
              ) : filteredTechniques.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Zap className="w-12 h-12 mb-4" />
                  <p className="text-lg font-medium">Nenhuma técnica encontrada</p>
                  <p className="text-sm">Crie sua primeira técnica avançada</p>
                </div>
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                  {filteredTechniques.map((technique) => (
                    <Card 
                      key={technique.id} 
                      className={cn(
                        "group relative overflow-hidden",
                        "border border-border/40 bg-card/50 backdrop-blur-sm",
                        "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
                        "transition-all duration-300 ease-out",
                        "p-4"
                      )}
                    >
                      {/* Header: Título + Ações */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg text-foreground leading-tight line-clamp-1 mb-2">
                            {technique.name}
                          </h3>
                          
                          {/* Badges discretos logo abaixo do título */}
                          <div className="flex gap-1.5 flex-wrap">
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-5 border-border/50">
                              {technique.category}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-[10px] px-2 py-0.5 h-5 border-border/50",
                                technique.difficulty === 'Avançado' && "border-orange-500/30 text-orange-600 dark:text-orange-400",
                                technique.difficulty === 'Intermediário' && "border-blue-500/30 text-blue-600 dark:text-blue-400",
                                technique.difficulty === 'Iniciante' && "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                              )}
                            >
                              {technique.difficulty}
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Ações - aparecem no hover */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {technique.video_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary"
                              onClick={() => handlePlayVideo(technique.video_url!, technique.name)}
                            >
                              <PlayCircle className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditTechnique(technique)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteClick(technique)}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Descrição */}
                      {technique.description && (
                        <p className="text-xs text-muted-foreground/80 line-clamp-2 mb-3">
                          {technique.description}
                        </p>
                      )}

                      {/* Instruções e Exemplos com Ícones */}
                      <div className="space-y-2.5 mb-3">
                        {technique.instructions && (
                          <div className="flex gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                              <Zap className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-semibold text-foreground mb-0.5">Instruções</h4>
                              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                {technique.instructions}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {technique.examples && (
                          <div className="flex gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                              <PlayCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-semibold text-foreground mb-0.5">Exemplos</h4>
                              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                {technique.examples}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer com Data e Ações */}
                      <div className="flex items-center justify-between pt-3 border-t border-border/40">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(technique.created_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Button 
                            onClick={() => handleEditTechnique(technique)}
                            variant="ghost" 
                            size="sm"
                            className="h-7 w-7 p-0 opacity-60 hover:opacity-100 hover:bg-primary/10 hover:text-primary"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button 
                            onClick={() => handleDeleteClick(technique)}
                            variant="ghost" 
                            size="sm"
                            className="h-7 w-7 p-0 opacity-60 hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
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

      <CreateAdvancedTechniqueModal 
        isOpen={showCreateModal}
        onClose={handleCloseCreateModal}
        technique={editingTechnique}
      />

      {selectedVideo && (
        <VideoPlayerModal 
          isOpen={showVideoModal}
          onClose={handleCloseVideoModal}
          videoUrl={selectedVideo.url}
          title={selectedVideo.title}
        />
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a técnica "{techniqueToDelete?.name}"? 
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
  );
}