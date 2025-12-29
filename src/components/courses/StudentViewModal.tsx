import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Play, FileText, Download, Clock, Star, Award } from 'lucide-react';
import { Course } from '@/hooks/useCourses';
import { useCourseModules } from '@/hooks/useCourseModules';
import { useCourseMaterials } from '@/hooks/useCourseMaterials';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import ModuleCard from './ModuleCard';
import UnlockModuleModal from './UnlockModuleModal';
import { supabase } from '@/integrations/supabase/client';

interface StudentViewModalProps {
  course: Course;
  isOpen: boolean;
  onClose: () => void;
  hasAccess: boolean;
}

export default function StudentViewModal({ course, isOpen, onClose, hasAccess }: StudentViewModalProps) {
  const [currentLesson, setCurrentLesson] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('content');
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [currentAccess, setCurrentAccess] = useState(hasAccess);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const { modules, lessons, loading } = useCourseModules(course?.id);
  const { materials, loading: materialsLoading } = useCourseMaterials(course?.id);

  // Calcular dados reais
  const totalLessons = lessons.length;
  const totalDuration = lessons.reduce((total, lesson) => total + (lesson.video_duration_minutes || 0), 0);

  // Filtrar módulos e aulas publicados
  const publishedModules = modules.filter(module => module.is_published);
  const publishedLessons = lessons.filter(lesson => lesson.is_published);

  // Simular como um novo aluno veria (sem progresso)
  const progressPercentage = 0;

  const certificateAvailable = course.has_certificate && progressPercentage >= 80;

  // Verificar se aula está bloqueada
  const isLessonBlocked = (lesson: any) => {
    // Se não tem acesso ao curso, bloquear todas as aulas (exceto preview)
    if (!course.is_free && !currentAccess) {
      return true;
    }
    // Se tem acesso, verificar liberação por dias
    if (lesson.release_mode === 'days_after_enrollment' && lesson.release_after_days > 0) {
      return true; // Para preview, mostrar como bloqueado
    }
    return false;
  };

  // Verificar se módulo está bloqueado
  const isModuleBlocked = (module: any) => {
    if (!course.is_free && !currentAccess) {
      return true;
    }
    return false;
  };

  // Handler para quando o usuário clica em desbloquear
  const handleUnlockClick = () => {
    setIsUnlockModalOpen(true);
  };

  // Handler para quando a compra é bem-sucedida
  const handlePurchaseSuccess = () => {
    setCurrentAccess(true);
  };

  // Encontrar aula atual ou primeira disponível
  const currentLessonData = currentLesson ?
    publishedLessons.find(lesson => lesson.id === currentLesson) : null;

  // Helper para processar URLs de vídeo
  const getEmbedUrl = (url: string) => {
    if (!url) return null;

    // YouTube Short Link (youtu.be/ID)
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${id}`;
    }

    // YouTube Watch Link (youtube.com/watch?v=ID)
    if (url.includes('youtube.com/watch?v=')) {
      const id = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${id}`;
    }

    // YouTube Embed Link (youtube.com/embed/ID)
    if (url.includes('youtube.com/embed/')) {
      return url;
    }

    // Vimeo
    if (url.includes('vimeo.com/')) {
      const id = url.split('vimeo.com/')[1]?.split('?')[0];
      return `https://player.vimeo.com/video/${id}`;
    }

    return url; // Retorna original se não reconhecer (pode ser MP4 direto)
  };

  // Resolver URL do vídeo (Storage ou Externo)
  useEffect(() => {
    const resolveVideoUrl = async () => {
      if (!currentLessonData) {
        setVideoUrl(null);
        return;
      }

      // 1. Tentar storage_path (vídeo enviado) - Igual ao App do Aluno
      if (currentLessonData.storage_path) {
        try {
          console.log('🎥 Resolvendo URL do Storage:', currentLessonData.storage_path);
          const { data, error } = await supabase.storage
            .from('course-videos')
            .createSignedUrl(currentLessonData.storage_path, 21600); // 6 horas

          if (error) throw error;

          if (data?.signedUrl) {
            setVideoUrl(data.signedUrl);
            return;
          }
        } catch (err) {
          console.error('❌ Erro ao gerar URL assinada:', err);
        }
      }

      // 2. Tentar video_url (link externo)
      if (currentLessonData.video_url) {
        setVideoUrl(getEmbedUrl(currentLessonData.video_url));
        return;
      }

      setVideoUrl(null);
    };

    resolveVideoUrl();
  }, [currentLessonData]);

  const isDirectVideo = videoUrl?.match(/\.(mp4|webm|ogg)(\?.*)?$/i) || currentLessonData?.storage_path;

  const getFileType = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return 'pdf';
      case 'doc':
      case 'docx':
      case 'xls':
      case 'xlsx':
      case 'ppt':
      case 'pptx': return 'document';
      case 'mp4':
      case 'avi':
      case 'mov': return 'video';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return 'image';
      default: return 'file';
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-4 h-4 text-red-500" />;
      case 'document': return <FileText className="w-4 h-4 text-blue-500" />;
      case 'video': return <Play className="w-4 h-4 text-purple-500" />;
      case 'image': return <FileText className="w-4 h-4 text-green-500" />;
      default: return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <LoadingSpinner message="Carregando preview do curso..." />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-[90vw] lg:max-w-6xl max-h-[88vh] sm:max-h-[90vh] overflow-y-auto p-3 sm:p-4 lg:p-6">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold">
                {course.title}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">Visualização como Aluno</p>
            </div>

          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Course Header */}
          <div className="flex flex-col md:flex-row gap-6">
            <img
              src={course.thumbnail || 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=400&h=250&fit=crop'}
              alt={course.title}
              className="w-full md:w-80 h-48 object-cover rounded-lg"
            />
            <div className="flex-1 space-y-4">
              <div>
                <Badge variant="outline" className="mb-2">{course.category || 'Sem categoria'}</Badge>
                <p className="text-muted-foreground">{course.description}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Preview do Curso</span>
                  <Badge variant="outline" className="text-xs">Visualização</Badge>
                </div>
                <div className="p-3 bg-muted/50 border rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    Este é um preview de como o aluno verá o curso. Progresso e interações não são salvos.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{totalDuration > 0 ? `${Math.round(totalDuration / 60)}h ${totalDuration % 60}min` : 'N/A'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4" />
                  <span>{(course.rating || 0).toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Award className="w-4 h-4" />
                  <span>{publishedModules.length} módulos</span>
                </div>
                <div className="flex items-center gap-1">
                  <Play className="w-4 h-4" />
                  <span>{publishedLessons.length} aulas</span>
                </div>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="content">Conteúdo</TabsTrigger>
              <TabsTrigger value="materials">Materiais</TabsTrigger>
              <TabsTrigger value="certificate">Certificado</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4 mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Course Content */}
                <div className="lg:col-span-2">
                  {currentLessonData ? (
                    <Card className="p-4">
                      {videoUrl ? (
                        <div className="aspect-video bg-black rounded-lg mb-4 relative overflow-hidden">
                          {isDirectVideo ? (
                            <video
                              src={videoUrl}
                              controls
                              className="w-full h-full"
                            />
                          ) : (
                            <iframe
                              src={videoUrl}
                              className="w-full h-full"
                              frameBorder="0"
                              allowFullScreen
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              title={currentLessonData.title}
                            />
                          )}
                        </div>
                      ) : (
                        <div className="aspect-video bg-muted rounded-lg mb-4 flex items-center justify-center">
                          <div className="text-center">
                            <Play className="w-16 h-16 text-muted-foreground mx-auto mb-2" />
                            <p className="text-muted-foreground">Nenhum vídeo disponível</p>
                          </div>
                        </div>
                      )}
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold text-lg">{currentLessonData.title}</h3>
                          {currentLessonData.video_duration_minutes > 0 && (
                            <p className="text-sm text-muted-foreground">
                              Duração: {currentLessonData.video_duration_minutes} minutos
                            </p>
                          )}
                        </div>
                        {currentLessonData.description && (
                          <p className="text-muted-foreground">{currentLessonData.description}</p>
                        )}
                        {currentLessonData.content && (
                          <div className="prose prose-sm max-w-none">
                            <div dangerouslySetInnerHTML={{ __html: currentLessonData.content }} />
                          </div>
                        )}
                      </div>
                    </Card>
                  ) : (
                    <Card className="p-8 text-center">
                      <Play className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-semibold mb-2">Selecione uma aula</h3>
                      <p className="text-muted-foreground">Escolha uma aula na lista ao lado para começar o preview</p>
                    </Card>
                  )}
                </div>

                {/* Modules List */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Módulos do Curso</h3>
                  {publishedModules.length === 0 ? (
                    <Card className="p-6 text-center space-y-3">
                      <Award className="w-12 h-12 text-muted-foreground mx-auto" />
                      {modules.length > 0 ? (
                        <div className="space-y-2">
                          <p className="font-medium text-muted-foreground">📚 Módulos em preparação</p>
                          <p className="text-sm text-muted-foreground">
                            Este curso possui {modules.length} módulo(s) que será(ão) liberado(s) pelo professor em breve.
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {modules.length} módulo(s) não publicado(s)
                          </Badge>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">Nenhum módulo criado ainda</p>
                      )}
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {publishedModules
                        .sort((a, b) => a.order_index - b.order_index)
                        .map((module, moduleIndex) => (
                          <ModuleCard
                            key={module.id}
                            module={module}
                            moduleIndex={moduleIndex}
                            lessons={publishedLessons}
                            currentLesson={currentLesson}
                            onLessonSelect={setCurrentLesson}
                            isLessonBlocked={isLessonBlocked}
                            isLocked={isModuleBlocked(module)}
                            onUnlockClick={handleUnlockClick}
                          />
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="materials" className="space-y-4 mt-6">
              <Card className="p-6">
                <h3 className="font-semibold mb-4">Materiais Complementares</h3>
                {materialsLoading ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Carregando materiais...</p>
                  </div>
                ) : materials.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Nenhum material disponível ainda</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {materials.map((material) => (
                      <div key={material.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getFileIcon(material.file_type)}
                          <div>
                            <p className="text-sm font-medium">{material.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {material.file_size && `${(material.file_size / 1024 / 1024).toFixed(1)} MB`}
                              {material.description && ` • ${material.description}`}
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" disabled>
                          <Download className="w-4 h-4 mr-2" />
                          Preview
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="certificate" className="space-y-4 mt-6">
              <Card className="p-6">
                <div className="text-center space-y-4">
                  <Award className={`w-16 h-16 mx-auto ${certificateAvailable ? 'text-success' : 'text-muted-foreground'}`} />
                  <div>
                    <h3 className="font-semibold text-lg">Certificado de Conclusão</h3>
                    {course.has_certificate ? (
                      <p className="text-muted-foreground mt-2">
                        Complete 80% do curso para desbloquear seu certificado.
                      </p>
                    ) : (
                      <p className="text-muted-foreground mt-2">
                        Este curso não oferece certificado de conclusão.
                      </p>
                    )}
                  </div>

                  {course.has_certificate ? (
                    <div className="p-4 bg-muted/50 border rounded-lg">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Progresso necessário:</span>
                          <span className="font-medium">0/80%</span>
                        </div>
                        <Progress value={0} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          No preview, o certificado aparecerá aqui após conclusão
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-muted/50 border rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Este curso não foi configurado para gerar certificados automaticamente.
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Unlock Module Modal */}
        <UnlockModuleModal
          course={course}
          isOpen={isUnlockModalOpen}
          onClose={() => setIsUnlockModalOpen(false)}
          onPurchaseSuccess={handlePurchaseSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}