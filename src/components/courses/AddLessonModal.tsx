import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Play, Calendar, Upload, Loader2, FileVideo, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCourseModules } from '@/hooks/useCourseModules';
import { supabase } from '@/integrations/supabase/client';

interface AddLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleId: string;
  moduleTitle: string;
  courseId: string;
}

export default function AddLessonModal({ isOpen, onClose, moduleId, moduleTitle, courseId }: AddLessonModalProps) {
  const [lessonData, setLessonData] = useState({
    title: '',
    description: '',
    video_duration_minutes: 0,
    content: '',
    is_free: false,
    is_published: false,
    enable_support_button: false,
    release_mode: 'immediate' as 'immediate' | 'days_after_enrollment',
    release_after_days: undefined as number | undefined
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { addLesson } = useCourseModules(courseId);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Validar tipo
      if (!file.type.includes('video/')) {
        toast({
          title: 'Arquivo inválido',
          description: 'Por favor, selecione um arquivo de vídeo (.mp4, .mov)',
          variant: 'destructive'
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSave = async () => {
    if (!lessonData.title.trim()) {
      toast({
        title: 'Erro',
        description: 'O título da aula é obrigatório',
        variant: 'destructive'
      });
      return;
    }

    if (lessonData.release_mode === 'days_after_enrollment' && !lessonData.release_after_days) {
      toast({
        title: 'Erro',
        description: 'Número de dias é obrigatório para liberação por dias',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      let storagePath = null;

      // 1. Upload do vídeo se houver arquivo selecionado
      if (selectedFile) {
        // Gerar ID temporário para a aula (ou usar timestamp) para o caminho
        const tempLessonId = crypto.randomUUID();
        const fileExt = selectedFile.name.split('.').pop();
        const filePath = `${courseId}/${moduleId}/${tempLessonId}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('course-videos')
          .upload(filePath, selectedFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;
        storagePath = filePath;
      }

      // 2. Criar registro da aula
      await addLesson({
        module_id: moduleId,
        title: lessonData.title,
        description: lessonData.description || undefined,
        storage_path: storagePath,
        video_uploaded: !!storagePath,
        video_duration_minutes: lessonData.video_duration_minutes || 0,
        content: lessonData.content || undefined,
        attachments: [],
        is_free: lessonData.is_free,
        is_published: lessonData.is_published,
        enable_support_button: lessonData.enable_support_button,
        release_mode: lessonData.release_mode,
        release_after_days: lessonData.release_after_days
      });

      toast({
        title: 'Aula criada com sucesso!',
        description: `A aula "${lessonData.title}" foi adicionada ao módulo.`,
      });

      handleClose();
    } catch (error) {
      console.error('Error saving lesson:', error);
      toast({
        title: 'Erro ao criar aula',
        description: error instanceof Error ? error.message : 'Ocorreu um erro ao criar a aula. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setLessonData({
      title: '',
      description: '',
      video_duration_minutes: 0,
      content: '',
      is_free: false,
      is_published: false,
      enable_support_button: false,
      release_mode: 'immediate',
      release_after_days: undefined
    });
    setSelectedFile(null);
    setUploadProgress(0);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl p-0 flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-3 pr-14 border-b border-border/40 flex-shrink-0">
          <DialogTitle>Nova Aula - {moduleTitle}</DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-5 pt-3 flex-1 min-h-0 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Formulário */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Título da Aula *</Label>
                <Input
                  value={lessonData.title}
                  onChange={(e) => setLessonData({ ...lessonData, title: e.target.value })}
                  placeholder="Ex: Introdução aos conceitos básicos"
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={lessonData.description}
                  onChange={(e) => setLessonData({ ...lessonData, description: e.target.value })}
                  placeholder="Descreva o conteúdo da aula..."
                  rows={3}
                />
              </div>

              {/* Upload de Vídeo */}
              <div className="space-y-2">
                <Label>Vídeo da Aula</Label>
                {!selectedFile ? (
                  <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors cursor-pointer relative">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleFileSelect}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">Clique para enviar o vídeo</p>
                    <p className="text-xs text-muted-foreground">MP4 ou MOV (Max 500MB)</p>
                  </div>
                ) : (
                  <div className="border rounded-lg p-3 flex items-center justify-between bg-muted/30">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FileVideo className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedFile(null)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Duração (minutos)</Label>
                <Input
                  type="number"
                  value={lessonData.video_duration_minutes}
                  onChange={(e) => setLessonData({ ...lessonData, video_duration_minutes: parseInt(e.target.value) || 0 })}
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label>Conteúdo Textual</Label>
                <Textarea
                  value={lessonData.content}
                  onChange={(e) => setLessonData({ ...lessonData, content: e.target.value })}
                  placeholder="Conteúdo adicional, anotações, links..."
                  rows={4}
                />
              </div>

              {/* Controle de Liberação */}
              <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
                <Label className="text-sm font-medium">Liberação da Aula</Label>

                <div className="space-y-2">
                  <Select
                    value={lessonData.release_mode}
                    onValueChange={(value: 'immediate' | 'days_after_enrollment') =>
                      setLessonData({
                        ...lessonData,
                        release_mode: value,
                        release_after_days: value === 'immediate' ? undefined : lessonData.release_after_days
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Liberar Imediatamente</SelectItem>
                      <SelectItem value="days_after_enrollment">Liberar Após X Dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {lessonData.release_mode === 'days_after_enrollment' && (
                  <div className="space-y-2">
                    <Label className="text-sm">Número de Dias</Label>
                    <Input
                      type="number"
                      value={lessonData.release_after_days || ''}
                      onChange={(e) => setLessonData({
                        ...lessonData,
                        release_after_days: parseInt(e.target.value) || undefined
                      })}
                      placeholder="Ex: 7"
                      min="0"
                    />
                    <p className="text-xs text-muted-foreground">
                      A aula será liberada após este número de dias da matrícula do aluno
                    </p>
                  </div>
                )}
              </div>

              {/* Configurações */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={lessonData.is_free}
                    onCheckedChange={(checked) => setLessonData({ ...lessonData, is_free: checked })}
                  />
                  <Label>Aula Gratuita</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={lessonData.is_published}
                    onCheckedChange={(checked) => setLessonData({ ...lessonData, is_published: checked })}
                  />
                  <Label>Publicar Aula</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={lessonData.enable_support_button}
                    onCheckedChange={(checked) => setLessonData({ ...lessonData, enable_support_button: checked })}
                  />
                  <Label>Habilitar Botão de Suporte (WhatsApp)</Label>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-4">
              <Label>Preview da Aula</Label>

              <div className="bg-card border rounded-lg overflow-hidden">
                {/* Thumbnail do vídeo */}
                <div className="relative h-40 bg-gradient-to-br from-muted to-muted-foreground/20">
                  <div className="w-full h-full flex items-center justify-center">
                    {selectedFile ? (
                      <div className="flex flex-col items-center gap-2">
                        <FileVideo className="w-10 h-10 text-primary" />
                        <span className="text-xs font-medium bg-background/80 px-2 py-1 rounded">
                          Vídeo Selecionado
                        </span>
                      </div>
                    ) : (
                      <Play className="w-12 h-12 text-muted-foreground" />
                    )}
                  </div>

                  <div className="absolute top-2 right-2 flex gap-1">
                    {lessonData.is_free && (
                      <Badge variant="secondary" className="text-xs">
                        Grátis
                      </Badge>
                    )}
                    {lessonData.release_mode === 'days_after_enrollment' && (
                      <Badge variant="outline" className="text-xs">
                        <Calendar className="w-3 h-3 mr-1" />
                        {lessonData.release_after_days}d
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="p-4">
                  <h4 className="font-semibold text-base">
                    {lessonData.title || 'Título da aula'}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {lessonData.description || 'Descrição da aula'}
                  </p>
                  {lessonData.video_duration_minutes > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Duração: {lessonData.video_duration_minutes} min
                    </p>
                  )}
                </div>
              </div>

              <div className="text-xs text-muted-foreground text-center">
                Assim a aula aparecerá para os alunos
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-5 pb-5 pt-3 border-t border-border/40 flex-shrink-0">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {loading ? 'Enviando...' : 'Criar Aula'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}