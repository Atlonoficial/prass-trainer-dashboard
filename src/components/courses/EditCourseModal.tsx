import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Trash2, Edit, Plus, Play, FileText, Image, Download, Upload, Calendar, Globe, X, Pencil, Clock, Settings, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { ImageUpload } from '@/components/ui/image-upload';
import { Course } from '@/hooks/useCourses';
import { useCourseModules, CourseModule, CourseLesson } from '@/hooks/useCourseModules';
import { useCourseMaterials } from '@/hooks/useCourseMaterials';
import AddModuleModal from './AddModuleModal';
import AddLessonModal from './AddLessonModal';
import EditLessonModal from './EditLessonModal';
import EditModuleModal from './EditModuleModal';
import CoursePaymentSettings from './CoursePaymentSettings';
import { useToast } from '@/hooks/use-toast';

interface EditCourseModalProps {
  course: Course;
  isOpen: boolean;
  onClose: () => void;
  onSave: (course: Course) => void;
}

export default function EditCourseModal({ course, isOpen, onClose, onSave }: EditCourseModalProps) {
  const [editedCourse, setEditedCourse] = useState<Course>(course);
  const [activeTab, setActiveTab] = useState('info');
  const [showAddModuleModal, setShowAddModuleModal] = useState(false);
  const [showAddLessonModal, setShowAddLessonModal] = useState(false);
  const [showEditLessonModal, setShowEditLessonModal] = useState(false);
  const [showEditModuleModal, setShowEditModuleModal] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [editingModule, setEditingModule] = useState<CourseModule | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const { toast } = useToast();
  const { modules, loading, refreshing, updateModule, deleteModule: removeModule, updateLesson, deleteLesson: removeLesson, refetch } = useCourseModules(course.id);
  const { materials, uploadMaterial, deleteMaterial, loading: materialsLoading } = useCourseMaterials(course.id);

  useEffect(() => {
    setEditedCourse(course);
  }, [course]);

  // Refresh modules when modal opens
  useEffect(() => {
    if (isOpen && course.id) {
      console.log('🔄 [EditCourseModal] Modal opened, refreshing modules for course:', course.id);
      refetch();
    }
  }, [isOpen, course.id, refetch]);

  const handleSave = () => {
    onSave(editedCourse);
    toast({
      title: "Curso atualizado com sucesso!",
      description: "Todas as alterações foram salvas.",
    });
    onClose();
  };

  const handleDeleteModule = async (moduleId: string) => {
    try {
      await removeModule(moduleId);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    try {
      await removeLesson(lessonId);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleToggleModulePublish = async (module: CourseModule) => {
    try {
      await updateModule(module.id, { is_published: !module.is_published });
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleToggleLessonPublish = async (lesson: CourseLesson) => {
    try {
      await updateLesson(lesson.id, { is_published: !lesson.is_published });
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleEditModule = (module: CourseModule) => {
    setEditingModule(module);
    setShowEditModuleModal(true);
  };

  const handleEditLesson = (lesson: any, moduleTitle: string) => {
    setEditingLesson({ ...lesson, moduleTitle });
    setShowEditLessonModal(true);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingFile(true);
    
    try {
      for (const file of Array.from(files)) {
        await uploadMaterial(file);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setUploadingFile(false);
      // Reset input
      event.target.value = '';
    }
  };

  const getFileTypeIcon = (fileType: string, fileName?: string) => {
    const type = fileType.toLowerCase();
    const name = fileName?.toLowerCase() || '';
    
    if (type.includes('pdf') || name.endsWith('.pdf')) {
      return <FileText className="w-4 h-4 text-red-500" />;
    }
    if (type.includes('video') || name.includes('video')) {
      return <Play className="w-4 h-4 text-blue-500" />;
    }
    if (type.includes('image') || name.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
      return <Image className="w-4 h-4 text-green-500" />;
    }
    if (type.includes('document') || type.includes('word') || type.includes('excel') || type.includes('powerpoint') || 
        name.match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/)) {
      return <FileText className="w-4 h-4 text-blue-500" />;
    }
    return <FileText className="w-4 h-4 text-gray-500" />;
  };

  const validateYouTubeUrl = (url: string) => {
    if (!url) return true;
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return youtubeRegex.test(url);
  };

  const getTotalLessons = () => {
    return modules.reduce((total, module) => total + (module.lessons?.length || 0), 0);
  };

  const getTotalDuration = () => {
    return modules.reduce((total, module) => {
      return total + (module.lessons?.reduce((moduleTotal, lesson) => 
        moduleTotal + lesson.video_duration_minutes, 0) || 0);
    }, 0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-3 pr-16 border-b border-border/40 flex-shrink-0">
          <DialogTitle className="text-base font-semibold">
            Editar Curso: {course.title}
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-5 pt-3 flex-1 min-h-0 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex w-full overflow-x-auto scrollbar-hide relative z-10 gap-1 px-1">
            <TabsTrigger value="info" className="flex-shrink-0 min-w-[100px]">Informações</TabsTrigger>
            <TabsTrigger value="modules" className="flex-shrink-0 min-w-[140px] max-w-[180px]">
              <div className="flex items-center gap-1.5 w-full justify-center">
                <span className="truncate">Módulos & Aulas</span>
                {!loading && modules.length > 0 && (
                  <Badge variant="secondary" className="flex-shrink-0 text-[10px] px-1 py-0 h-4">
                    {modules.length}M·{getTotalLessons()}A
                  </Badge>
                )}
              </div>
            </TabsTrigger>
            <TabsTrigger value="materials" className="flex-shrink-0 min-w-[110px] max-w-[140px]">
              <div className="flex items-center gap-1.5 w-full justify-center">
                <span className="truncate">Materiais</span>
                {materials.length > 0 && (
                  <Badge variant="secondary" className="flex-shrink-0 text-[10px] px-1 py-0 h-4">
                    {materials.length}
                  </Badge>
                )}
              </div>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex-shrink-0 min-w-[130px]">
              <Settings className="w-4 h-4 mr-1" />
              Pagamentos
            </TabsTrigger>
            <TabsTrigger value="cover" className="flex-shrink-0 min-w-[130px]">Capa & Imagens</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            <Card className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Título do Curso</Label>
                  <Input
                    value={editedCourse.title}
                    onChange={(e) => setEditedCourse({...editedCourse, title: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Input
                    value={editedCourse.category || ''}
                    onChange={(e) => setEditedCourse({...editedCourse, category: e.target.value})}
                    placeholder="Ex: Nutrição, Treinamento, Fitness"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duração Total</Label>
                  <Input
                    value={`${getTotalDuration()} minutos (${Math.round(getTotalDuration() / 60)} horas)`}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preço (R$)</Label>
                  <Input
                    type="number"
                    value={editedCourse.price || 0}
                    onChange={(e) => setEditedCourse({...editedCourse, price: Number(e.target.value)})}
                    disabled={editedCourse.is_free}
                  />
                </div>
              </div>
              
              <div className="space-y-2 mt-4">
                <Label>Descrição</Label>
                <Textarea
                  value={editedCourse.description || ''}
                  onChange={(e) => setEditedCourse({...editedCourse, description: e.target.value})}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={editedCourse.is_free || false}
                    onCheckedChange={(checked) => setEditedCourse({...editedCourse, is_free: checked, price: checked ? 0 : editedCourse.price})}
                  />
                  <Label>Curso Gratuito</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={editedCourse.is_published || false}
                    onCheckedChange={(checked) => setEditedCourse({...editedCourse, is_published: checked})}
                  />
                  <Label>Publicado</Label>
                </div>
              </div>
            </Card>

            {/* Estatísticas */}
            <Card className="p-4">
              <h3 className="font-medium mb-3">Estatísticas do Curso</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">{modules.length}</p>
                  <p className="text-sm text-muted-foreground">Módulos</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{getTotalLessons()}</p>
                  <p className="text-sm text-muted-foreground">Aulas</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{Math.round(getTotalDuration() / 60)}</p>
                  <p className="text-sm text-muted-foreground">Horas</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{materials.length}</p>
                  <p className="text-sm text-muted-foreground">Materiais</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="modules" className="space-y-4">
            <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium">Gerenciar Módulos e Aulas</h3>
                    {refreshing && (
                      <Badge variant="secondary" className="animate-pulse">
                        Atualizando...
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={refetch}>
                      Atualizar
                    </Button>
                    <Button onClick={() => setShowAddModuleModal(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Módulo
                    </Button>
                  </div>
                </div>
              <p className="text-sm text-muted-foreground">
                Organize seu curso em módulos e adicione aulas a cada módulo. 
                <span className="font-medium text-primary">
                  {modules.length} módulos • {getTotalLessons()} aulas
                </span>
              </p>
            </Card>

            {loading ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">Carregando módulos...</p>
              </Card>
            ) : modules.length === 0 ? (
              <Card className="p-8 text-center">
                <h4 className="font-medium mb-2">Nenhum módulo encontrado</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Comece criando o primeiro módulo do seu curso.
                </p>
                <Button onClick={() => setShowAddModuleModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Módulo
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {modules.map((module, moduleIndex) => (
                  <Card key={module.id} className="overflow-hidden">
                    <div className="p-4 border-b bg-muted/20">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-lg">{module.title}</h4>
                            <Badge variant="outline" className="text-xs">
                              Módulo {moduleIndex + 1}
                            </Badge>
                            {module.release_mode === 'days_after_enrollment' && (
                              <Badge variant="secondary" className="text-xs">
                                <Calendar className="w-3 h-3 mr-1" />
                                {module.release_after_days}d
                              </Badge>
                            )}
                            <Badge variant={module.is_published ? "default" : "secondary"} className="text-xs">
                              {module.is_published ? 'Publicado' : 'Rascunho'}
                            </Badge>
                          </div>
                          {module.description && (
                            <p className="text-sm text-muted-foreground">{module.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {module.lessons?.length || 0} aula(s)
                          </p>
                        </div>
                        
                        <div className="flex gap-2">
                          {/* Desktop: botões visíveis */}
                          <div className="hidden md:flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditModule(module)}
                            >
                              <Pencil className="w-4 h-4 mr-1" />
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedModuleId(module.id);
                                setShowAddLessonModal(true);
                              }}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Aula
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleModulePublish(module)}
                            >
                              {module.is_published ? 'Despublicar' : 'Publicar'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteModule(module.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          {/* Mobile: DropdownMenu */}
                          <div className="md:hidden">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditModule(module)}>
                                  <Pencil className="w-4 h-4 mr-2" />
                                  Editar Módulo
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setSelectedModuleId(module.id); setShowAddLessonModal(true); }}>
                                  <Plus className="w-4 h-4 mr-2" />
                                  Adicionar Aula
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleModulePublish(module)}>
                                  {module.is_published ? 'Despublicar' : 'Publicar'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDeleteModule(module.id)} className="text-destructive">
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Deletar Módulo
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4">
                      {!module.lessons || module.lessons.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Play className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Nenhuma aula neste módulo</p>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="mt-2"
                            onClick={() => {
                              setSelectedModuleId(module.id);
                              setShowAddLessonModal(true);
                            }}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Adicionar primeira aula
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {module.lessons.map((lesson, lessonIndex) => (
                            <div key={lesson.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                              <div className="flex items-center gap-3 flex-1">
                                <div className="flex items-center gap-2">
                                  <Play className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground w-6">
                                    {lessonIndex + 1}
                                  </span>
                                </div>
                                
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{lesson.title}</p>
                                  {lesson.description && (
                                    <p className="text-xs text-muted-foreground">{lesson.description}</p>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-1">
                                  {lesson.release_mode === 'days_after_enrollment' && (
                                    <Badge variant="secondary" className="text-xs">
                                      <Calendar className="w-3 h-3 mr-1" />
                                      {lesson.release_after_days}d
                                    </Badge>
                                  )}
                                  <Badge variant={lesson.is_published ? "default" : "secondary"} className="text-xs">
                                    {lesson.is_published ? 'Pub' : 'Rasc'}
                                  </Badge>
                                </div>
                              </div>
                              
                              <div className="flex gap-2 ml-3">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditLesson(lesson, module.title)}
                                  title="Editar aula"
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleLessonPublish(lesson)}
                                  title={lesson.is_published ? 'Despublicar' : 'Publicar'}
                                >
                                  {lesson.is_published ? 'Despub' : 'Pub'}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteLesson(lesson.id)}
                                  title="Deletar aula"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="materials" className="space-y-4">
            <Card className="p-4">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Materiais Complementares</h3>
                    <p className="text-sm text-muted-foreground">
                      Adicione PDFs, documentos e outros arquivos para complementar o curso
                    </p>
                  </div>
                  <div className="relative">
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp,.mp4,.mov,.avi"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                      disabled={uploadingFile}
                    />
                    <label htmlFor="file-upload">
                      <Button asChild disabled={uploadingFile}>
                        <span className="cursor-pointer">
                          <Upload className="w-4 h-4 mr-2" />
                          {uploadingFile ? 'Enviando...' : 'Upload Material'}
                        </span>
                      </Button>
                    </label>
                  </div>
                </div>

                {materialsLoading ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Carregando materiais...</p>
                  </div>
                ) : materials.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Nenhum material adicionado ainda</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Clique em "Upload Material" para adicionar arquivos
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {materials.map((material) => (
                      <div key={material.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getFileTypeIcon(material.file_type, material.name)}
                          <div>
                            <p className="text-sm font-medium">{material.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {material.file_size && (
                                <span>{(material.file_size / 1024 / 1024).toFixed(1)} MB</span>
                              )}
                              {material.description && (
                                <span>• {material.description}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.open(material.file_url, '_blank')}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => deleteMaterial(material.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <CoursePaymentSettings 
              course={editedCourse}
              onUpdate={(updates) => setEditedCourse({...editedCourse, ...updates})}
            />
          </TabsContent>

          <TabsContent value="cover" className="space-y-4">
            <Card className="p-4">
              <h3 className="font-medium mb-4">Capa do Curso</h3>
              
              <ImageUpload
                onImageUpload={(url) => {
                  setEditedCourse({ ...editedCourse, thumbnail: url });
                  toast({
                    title: "Capa atualizada!",
                    description: "A nova capa será salva ao clicar em 'Salvar Alterações'."
                  });
                }}
                currentImage={editedCourse.thumbnail}
                bucket="avatars"
                path={`courses/${course.id}`}
                label="Capa do Curso"
                aspectRatio="16/10"
                recommendedSize="800x500px (16:10 otimizado para cards)"
                showSizeHint={true}
              />
            </Card>
          </TabsContent>
          </Tabs>
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

      <AddModuleModal
        isOpen={showAddModuleModal}
        onClose={() => setShowAddModuleModal(false)}
        courseId={editedCourse.id}
      />

      {selectedModuleId && editedCourse?.id && (
        <AddLessonModal
          isOpen={showAddLessonModal}
          onClose={() => {
            setShowAddLessonModal(false);
            setSelectedModuleId(null);
          }}
          moduleId={selectedModuleId}
          moduleTitle={modules.find(m => m.id === selectedModuleId)?.title || ''}
          courseId={editedCourse.id}
        />
      )}

      {editingLesson && (
        <EditLessonModal
          isOpen={showEditLessonModal}
          onClose={() => {
            setShowEditLessonModal(false);
            setEditingLesson(null);
          }}
          lesson={editingLesson}
          moduleTitle={editingLesson.moduleTitle}
          courseId={editedCourse.id}
        />
      )}

      {editingModule && (
        <EditModuleModal
          isOpen={showEditModuleModal}
          onClose={() => {
            setShowEditModuleModal(false);
            setEditingModule(null);
          }}
          module={editingModule}
        />
      )}
    </Dialog>
  );
}