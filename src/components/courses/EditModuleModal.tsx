import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useCourseModules, CourseModule } from '@/hooks/useCourseModules';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock, Settings, X, Upload, Image as ImageIcon, Trash2, AlertCircle } from 'lucide-react';

interface EditModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  module: CourseModule | null;
}

export default function EditModuleModal({ isOpen, onClose, module }: EditModuleModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    is_published: false,
    release_mode: 'immediate' as 'immediate' | 'days_after_enrollment',
    release_after_days: 0,
    cover_image_url: ''
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { updateModule } = useCourseModules(module?.course_id);
  const { toast } = useToast();

  useEffect(() => {
    if (module) {
      setFormData({
        title: module.title,
        description: module.description || '',
        is_published: module.is_published,
        release_mode: module.release_mode,
        release_after_days: module.release_after_days || 0,
        cover_image_url: module.cover_image_url || ''
      });
      setPreviewImage(module.cover_image_url || null);
    }
  }, [module]);

  // Helper para upload com timeout
  const uploadWithTimeout = async (
    bucket: string,
    fileName: string,
    file: File,
    timeoutMs: number = 30000
  ): Promise<{ data: any; error: any }> => {
    const uploadPromise = supabase.storage
      .from(bucket)
      .upload(fileName, file, { upsert: true });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Upload timeout - servidor demorou mais de 30 segundos')), timeoutMs)
    );

    try {
      return await Promise.race([uploadPromise, timeoutPromise]) as any;
    } catch (error) {
      throw error;
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!module) return;

    try {
      setUploading(true);
      setUploadProgress(0);

      // Verificar autenticação
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Você precisa estar autenticado para fazer upload');
      }

      setUploadProgress(20);

      // Remove imagem antiga se existir
      if (formData.cover_image_url && formData.cover_image_url.includes('course-module-covers/')) {
        const oldFileName = formData.cover_image_url.split('/').pop()?.split('?')[0];
        if (oldFileName) {
          await supabase.storage
            .from('course-module-covers')
            .remove([oldFileName]);
        }
      }

      setUploadProgress(40);

      // Upload nova imagem com timeout
      const fileName = `${module.id}-${Date.now()}.${file.name.split('.').pop()}`;
      const { data, error } = await uploadWithTimeout(
        'course-module-covers',
        fileName,
        file,
        30000
      );

      if (error) throw error;

      setUploadProgress(80);

      // Cache busting para forçar atualização
      const timestamp = Date.now();
      const { data: { publicUrl } } = supabase.storage
        .from('course-module-covers')
        .getPublicUrl(fileName);

      const finalUrl = `${publicUrl}?t=${timestamp}`;

      // Atualizar estados
      setFormData({ ...formData, cover_image_url: finalUrl });
      setPreviewImage(finalUrl);

      setUploadProgress(100);

      toast({
        title: "Imagem enviada!",
        description: "A capa do módulo foi atualizada.",
      });

    } catch (error) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro no upload",
        description: error instanceof Error ? error.message : "Não foi possível enviar a imagem.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validação 1: Tamanho máximo 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 5MB.",
        variant: "destructive"
      });
      return;
    }

    // Validação 2: Tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Formato inválido",
        description: "Apenas arquivos de imagem são permitidos.",
        variant: "destructive"
      });
      return;
    }

    // Validação 3: Tipos permitidos pelo bucket
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Formato não suportado",
        description: "Use JPEG, PNG, WebP ou GIF.",
        variant: "destructive"
      });
      return;
    }

    handleImageUpload(file);
  };

  const handleRemoveImage = async () => {
    if (!formData.cover_image_url) return;

    try {
      // Remove do storage se for URL do Supabase
      if (formData.cover_image_url.includes('course-module-covers/')) {
        const fileName = formData.cover_image_url.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('course-module-covers')
            .remove([fileName]);
        }
      }

      setFormData({ ...formData, cover_image_url: '' });
      setPreviewImage(null);

      toast({
        title: "Imagem removida",
        description: "A capa do módulo foi removida.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover a imagem.",
        variant: "destructive"
      });
    }
  };

  const handleSave = async () => {
    if (!module) return;

    try {
      const updateData = {
        ...formData,
        release_after_days: formData.release_mode === 'immediate' ? null : formData.release_after_days
      };

      await updateModule(module.id, updateData);

      toast({
        title: "Módulo atualizado!",
        description: "As alterações foram salvas com sucesso.",
      });

      onClose();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o módulo.",
        variant: "destructive"
      });
    }
  };

  if (!module) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-3 pr-14 border-b border-border/40 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Editar Módulo
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-5 pt-3 flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-6">
            {/* Informações básicas */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título do Módulo</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Fundamentos da Nutrição"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva o que será abordado neste módulo..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Capa do Módulo</Label>

                {/* Preview da imagem atual */}
                {previewImage && (
                  <div className="relative inline-block">
                    <img
                      src={previewImage}
                      alt="Capa atual"
                      className="w-32 h-20 object-cover rounded-lg border"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 p-0"
                      onClick={handleRemoveImage}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                {/* Botões de ação */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    {uploading ? (
                      <>
                        Enviando... {uploadProgress > 0 && `${uploadProgress}%`}
                      </>
                    ) : (
                      previewImage ? 'Alterar' : 'Upload'
                    )}
                  </Button>

                  {!previewImage && (
                    <div className="flex-1">
                      <Input
                        placeholder="Ou cole uma URL da imagem..."
                        value={formData.cover_image_url}
                        onChange={(e) => {
                          setFormData({ ...formData, cover_image_url: e.target.value });
                          setPreviewImage(e.target.value || null);
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Input de arquivo oculto */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <p className="text-xs text-muted-foreground">
                  Formatos suportados: JPEG, PNG, WebP, GIF (máx. 5MB)
                </p>

                <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg mt-2">
                  <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <span className="font-medium text-blue-500">Tamanho recomendado:</span>
                    <span className="text-muted-foreground ml-1">800x600 pixels (4:3)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Configurações de publicação */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Configurações de Acesso
              </h3>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Status de Publicação</Label>
                  <p className="text-sm text-muted-foreground">
                    Módulos não publicados não aparecem para os alunos
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={formData.is_published ? "default" : "secondary"}>
                    {formData.is_published ? 'Publicado' : 'Rascunho'}
                  </Badge>
                  <Switch
                    checked={formData.is_published}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Modo de Liberação</Label>
                <Select
                  value={formData.release_mode}
                  onValueChange={(value: 'immediate' | 'days_after_enrollment') =>
                    setFormData({ ...formData, release_mode: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Liberação Imediata
                      </div>
                    </SelectItem>
                    <SelectItem value="days_after_enrollment">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Liberação Programada
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {formData.release_mode === 'days_after_enrollment' && (
                  <div className="space-y-2">
                    <Label htmlFor="days">Liberar após (dias)</Label>
                    <Input
                      id="days"
                      type="number"
                      min="1"
                      value={formData.release_after_days}
                      onChange={(e) => setFormData({ ...formData, release_after_days: parseInt(e.target.value) || 0 })}
                      placeholder="Ex: 7"
                    />
                    <p className="text-xs text-muted-foreground">
                      O módulo será liberado {formData.release_after_days} dias após a matrícula do aluno
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Estatísticas */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/20 rounded-lg">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{module.lessons?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Aulas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {module.lessons?.reduce((total, lesson) => total + (lesson.video_duration_minutes || 0), 0) || 0}
                </p>
                <p className="text-sm text-muted-foreground">Minutos</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-5 pb-5 pt-3 border-t border-border/40 flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}