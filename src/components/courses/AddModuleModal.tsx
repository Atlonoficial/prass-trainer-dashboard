import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Upload, Image as ImageIcon, AlertCircle, Calendar, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCourseModules, CourseModule } from '@/hooks/useCourseModules';
import { supabase } from '@/integrations/supabase/client';

interface AddModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
}

export default function AddModuleModal({ isOpen, onClose, courseId }: AddModuleModalProps) {
  const [moduleName, setModuleName] = useState('');
  const [moduleDescription, setModuleDescription] = useState('');
  const [moduleImage, setModuleImage] = useState<File | null>(null);
  const [moduleImageUrl, setModuleImageUrl] = useState<string | null>(null);
  const [releaseMode, setReleaseMode] = useState<'immediate' | 'days_after_enrollment'>('immediate');
  const [releaseAfterDays, setReleaseAfterDays] = useState<number>(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { addModule, modules } = useCourseModules(courseId);

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `modules/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('course-modules')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('course-modules')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível fazer upload da imagem.",
        variant: "destructive"
      });
      return null;
    }
  };

  const handleAddModule = async () => {
    if (!moduleName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, insira um nome para o módulo.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      let imageUrl: string | null = null;

      if (moduleImage) {
        imageUrl = await uploadImage(moduleImage);
        if (!imageUrl) {
          setIsLoading(false);
          return;
        }
      }

      const moduleData: Omit<CourseModule, 'id' | 'created_at' | 'updated_at' | 'order_index'> = {
        course_id: courseId,
        title: moduleName.trim(),
        description: moduleDescription.trim() || undefined,
        is_published: false,
        release_mode: releaseMode,
        release_after_days: releaseMode === 'days_after_enrollment' ? releaseAfterDays : undefined,
        cover_image_url: imageUrl || undefined
      };

      await addModule(moduleData);

      // Reset form
      setModuleName('');
      setModuleDescription('');
      setModuleImage(null);
      setModuleImageUrl(null);
      setReleaseMode('immediate');
      setReleaseAfterDays(0);

      onClose();
    } catch (error) {
      console.error('Error adding module:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (file: File) => {
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 10MB.",
        variant: "destructive"
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione uma imagem (PNG, JPG, WEBP).",
        variant: "destructive"
      });
      return;
    }

    setModuleImage(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      setModuleImageUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleImageUpload(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleImageUpload(files[0]);
    }
  };

  const handleClose = () => {
    setModuleName('');
    setModuleDescription('');
    setModuleImage(null);
    setModuleImageUrl(null);
    setReleaseMode('immediate');
    setReleaseAfterDays(0);
    setIsDragOver(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl p-0 flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-3 pr-14 border-b border-border/40 flex-shrink-0">
          <DialogTitle className="text-base font-semibold">
            Adicionar módulo
          </DialogTitle>
          <DialogDescription>
            Crie um novo módulo para organizar o conteúdo do curso. Defina nome e imagem de capa.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-5 pt-3 flex-1 min-h-0 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Form Section */}
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="module-name" className="text-xs font-medium">
                  Nome do módulo
                </Label>
                <Input
                  id="module-name"
                  value={moduleName}
                  onChange={(e) => setModuleName(e.target.value)}
                  placeholder="Digite o nome do módulo"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="module-description" className="text-sm font-medium">
                  Descrição (opcional)
                </Label>
                <Input
                  id="module-description"
                  value={moduleDescription}
                  onChange={(e) => setModuleDescription(e.target.value)}
                  placeholder="Descrição do módulo"
                  className="w-full"
                />
              </div>

              {/* Release Control Section */}
              <div className="space-y-4 border border-border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    <Calendar className="w-3 h-3 mr-1" />
                    Controle de Liberação
                  </Badge>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Modo de liberação</Label>
                  <Select
                    value={releaseMode}
                    onValueChange={(value: 'immediate' | 'days_after_enrollment') => setReleaseMode(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">
                        <div className="flex items-center gap-2">
                          <Play className="w-4 h-4" />
                          <span>Liberação imediata</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="days_after_enrollment">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>Liberar após X dias da matrícula</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {releaseMode === 'days_after_enrollment' && (
                  <div className="space-y-2">
                    <Label htmlFor="release-days" className="text-sm font-medium">
                      Número de dias
                    </Label>
                    <Input
                      id="release-days"
                      type="number"
                      min="0"
                      max="365"
                      value={releaseAfterDays}
                      onChange={(e) => setReleaseAfterDays(Math.max(0, parseInt(e.target.value) || 0))}
                      placeholder="Ex: 7"
                      className="w-24"
                    />
                    <p className="text-xs text-muted-foreground">
                      O módulo será liberado {releaseAfterDays} {releaseAfterDays === 1 ? 'dia' : 'dias'} após a matrícula do aluno
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Imagem de Capa</Label>

                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${isDragOver
                      ? 'border-primary bg-primary/5'
                      : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                    }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  {moduleImageUrl ? (
                    <div className="space-y-3">
                      <img
                        src={moduleImageUrl}
                        alt="Preview"
                        className="w-32 h-20 object-cover rounded mx-auto"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setModuleImage(null);
                          setModuleImageUrl(null);
                        }}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Remover
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="w-16 h-16 mx-auto bg-muted rounded-lg flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                      </div>

                      <div>
                        <Button
                          variant="outline"
                          className="text-primary border-primary hover:bg-primary/10"
                          onClick={() => document.getElementById('file-upload')?.click()}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Selecione do computador
                        </Button>
                        <p className="text-sm text-muted-foreground mt-2">
                          ou arraste aqui
                        </p>
                      </div>

                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="file-upload"
                      />

                      <div className="text-xs text-muted-foreground">
                        PNG, JPG até 10 MB
                      </div>
                    </div>
                  )}
                </div>

                {/* Recommendation */}
                <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <span className="font-medium text-blue-500">Tamanho recomendado:</span>
                    <span className="text-muted-foreground ml-1">800x600 pixels (4:3)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Section */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-3">Pré-visualização</h3>
                <Card className="bg-muted/30 p-6">
                  <div className="space-y-4">
                    {/* Module Preview Card */}
                    <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
                      <div className="relative h-48 bg-gradient-to-br from-muted to-muted-foreground/20">
                        {moduleImageUrl ? (
                          <img
                            src={moduleImageUrl}
                            alt="Module cover"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute top-3 right-3 flex gap-1">
                          <Badge variant="outline" className="bg-background/80 backdrop-blur-sm text-sm font-medium">
                            0 Aulas
                          </Badge>
                          {releaseMode === 'days_after_enrollment' && (
                            <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm text-xs">
                              <Calendar className="w-3 h-3 mr-1" />
                              {releaseAfterDays}d
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="p-4">
                        <h4 className="font-semibold text-base text-foreground">
                          {moduleName || 'Nome do módulo'}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-2">
                          {moduleDescription || 'Módulo sem descrição'}
                        </p>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground text-center">
                      Assim o módulo aparecerá no curso
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-5 pb-5 pt-3 border-t border-border/40 flex-shrink-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleAddModule}
            disabled={!moduleName.trim() || isLoading}
          >
            {isLoading ? 'Criando...' : 'Adicionar módulo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}