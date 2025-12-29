import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { X, Upload, Plus, Edit3, Trash2, Play, FileText, Download, Image } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Course } from '@/hooks/useCourses';
import { Module, Lesson } from './types';
import AddModuleModal from './AddModuleModal';

interface EditCourseModalProps {
  course: Course;
  isOpen: boolean;
  onClose: () => void;
  onSave: (course: Course) => void;
}

interface ExtraMaterial {
  id: string;
  name: string;
  type: 'pdf' | 'video' | 'audio' | 'image' | 'document';
  url: string;
  size: string;
}

export default function EditCourseModal({ course, isOpen, onClose, onSave }: EditCourseModalProps) {
  const [editedCourse, setEditedCourse] = useState<Course>(course);
  const [activeTab, setActiveTab] = useState('info');
  const [isEditingModule, setIsEditingModule] = useState<string | null>(null);
  const [isAddModuleModalOpen, setIsAddModuleModalOpen] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [newLessonName, setNewLessonName] = useState('');
  const [lessonVideoUrl, setLessonVideoUrl] = useState('');
  const [extraMaterials, setExtraMaterials] = useState<ExtraMaterial[]>([
    { id: '1', name: 'Apostila Completa.pdf', type: 'pdf', url: '#', size: '2.5 MB' },
    { id: '2', name: 'Planilha de Exercícios.xlsx', type: 'document', url: '#', size: '1.2 MB' },
  ]);
  const { toast } = useToast();

  const handleSave = () => {
    onSave(editedCourse);
    toast({
      title: "Curso atualizado com sucesso!",
      description: "Todas as alterações foram salvas.",
    });
    onClose();
  };


  const deleteModule = (moduleId: string) => {
    setEditedCourse({
      ...editedCourse,
      modules: ((editedCourse.modules as any) || []).filter((m: Module) => m.id !== moduleId)
    });
  };

  const addLesson = () => {
    if (!newLessonName.trim() || !selectedModuleId) return;

    const newLesson: Lesson = {
      id: Date.now().toString(),
      title: newLessonName,
      videoUrl: lessonVideoUrl || undefined,
      materials: []
    };

    setEditedCourse({
      ...editedCourse,
      modules: ((editedCourse.modules as any) || []).map((module: Module) =>
        module.id === selectedModuleId
          ? { ...module, lessons: [...module.lessons, newLesson] }
          : module
      )
    });

    setNewLessonName('');
    setLessonVideoUrl('');
    setSelectedModuleId(null);
  };

  const deleteLesson = (moduleId: string, lessonId: string) => {
    setEditedCourse({
      ...editedCourse,
      modules: ((editedCourse.modules as any) || []).map((module: Module) =>
        module.id === moduleId
          ? { ...module, lessons: module.lessons.filter(l => l.id !== lessonId) }
          : module
      )
    });
  };

  const addExtraMaterial = () => {
    // Simular upload de arquivo
    const newMaterial: ExtraMaterial = {
      id: Date.now().toString(),
      name: 'Novo Material.pdf',
      type: 'pdf',
      url: '#',
      size: '1.0 MB'
    };
    setExtraMaterials([...extraMaterials, newMaterial]);
  };

  const deleteExtraMaterial = (materialId: string) => {
    setExtraMaterials(extraMaterials.filter(m => m.id !== materialId));
  };

  const getFileTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-4 h-4 text-red-500" />;
      case 'video': return <Play className="w-4 h-4 text-blue-500" />;
      case 'image': return <Image className="w-4 h-4 text-green-500" />;
      default: return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              Editar Curso: {course.title}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            Edite as informações do curso, módulos, aulas e materiais complementares.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="modules">Módulos & Aulas</TabsTrigger>
            <TabsTrigger value="materials">Materiais Extras</TabsTrigger>
            <TabsTrigger value="cover">Capa & Imagens</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
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
                <Select value={editedCourse.category} onValueChange={(value) => setEditedCourse({...editedCourse, category: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nutrição">Nutrição</SelectItem>
                    <SelectItem value="Treinamento">Treinamento</SelectItem>
                    <SelectItem value="Fitness">Fitness</SelectItem>
                    <SelectItem value="Wellness">Wellness</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duração</Label>
                <Input
                  value={editedCourse.duration || ''}
                  onChange={(e) => setEditedCourse({...editedCourse, duration: parseInt(e.target.value) || null})}
                  placeholder="Ex: 8 semanas"
                />
              </div>
              <div className="space-y-2">
                <Label>Preço (R$)</Label>
                <Input
                  type="number"
                  value={editedCourse.price}
                  onChange={(e) => setEditedCourse({...editedCourse, price: Number(e.target.value)})}
                  disabled={editedCourse.is_free}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={editedCourse.description}
                onChange={(e) => setEditedCourse({...editedCourse, description: e.target.value})}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Label>Mostrar para o Aluno</Label>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="modules" className="space-y-4 mt-4">
            {/* Adicionar Módulo */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Gerenciar Módulos</h3>
                <Button onClick={() => setIsAddModuleModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Módulo
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Organize seu curso em módulos e adicione aulas a cada módulo.
              </p>
            </Card>

            {/* Lista de Módulos */}
            <div className="space-y-4">
            {((editedCourse.modules as any) || []).map((module: Module) => (
                <Card key={module.id} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">{module.title}</h4>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingModule(isEditingModule === module.id ? null : module.id)}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteModule(module.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Aulas do Módulo */}
                  <div className="space-y-2">
                    {module.lessons.map((lesson) => (
                      <div key={lesson.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <div className="flex items-center gap-2">
                          <Play className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{lesson.title}</span>
                          {lesson.videoUrl && <Badge variant="outline" className="text-xs">Vídeo</Badge>}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteLesson(module.id, lesson.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Adicionar Aula */}
                  {isEditingModule === module.id && (
                    <div className="mt-3 p-3 bg-muted/30 rounded space-y-3">
                      <h5 className="text-sm font-medium">Adicionar Nova Aula</h5>
                      <div className="space-y-2">
                        <Input
                          placeholder="Nome da aula"
                          value={selectedModuleId === module.id ? newLessonName : ''}
                          onChange={(e) => {
                            setNewLessonName(e.target.value);
                            setSelectedModuleId(module.id);
                          }}
                        />
                        <Input
                          placeholder="URL do vídeo (opcional)"
                          value={selectedModuleId === module.id ? lessonVideoUrl : ''}
                          onChange={(e) => setLessonVideoUrl(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={addLesson}>
                            <Plus className="w-4 h-4 mr-2" />
                            Adicionar Aula
                          </Button>
                          <Button variant="outline" size="sm">
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Vídeo
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="materials" className="space-y-4 mt-4">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Materiais Extras</h3>
                <Button onClick={addExtraMaterial}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Material
                </Button>
              </div>

              <div className="space-y-3">
                {extraMaterials.map((material) => (
                  <div key={material.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getFileTypeIcon(material.type)}
                      <div>
                        <p className="text-sm font-medium">{material.name}</p>
                        <p className="text-xs text-muted-foreground">{material.size}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => deleteExtraMaterial(material.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="cover" className="space-y-4 mt-4">
            <Card className="p-4">
              <h3 className="font-medium mb-4">Capa do Curso</h3>
              
              <div className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <img 
                    src={editedCourse.thumbnail || 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=400&h=250&fit=crop'} 
                    alt="Capa atual" 
                    className="w-32 h-20 object-cover rounded mx-auto mb-4"
                  />
                  <p className="text-sm text-muted-foreground mb-4">
                    Dimensões recomendadas: 800x500px (16:10)<br/>
                    Formatos aceitos: JPG, PNG, WEBP<br/>
                    Tamanho máximo: 5MB
                  </p>
                  <Button variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    Alterar Capa
                  </Button>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Capas de Módulos</h4>
                  <p className="text-xs text-muted-foreground">
                    As capas dos módulos ajudam na organização visual do curso. Dimensões: 400x250px (16:10)
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {((editedCourse.modules as any) || []).map((module: Module) => (
                      <div key={module.id} className="border rounded-lg p-3">
                        <div className="w-full h-20 bg-muted rounded mb-2 flex items-center justify-center">
                          <Image className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <p className="text-xs font-medium truncate">{module.title}</p>
                        <Button variant="outline" size="sm" className="w-full mt-2 text-xs">
                          <Upload className="w-3 h-3 mr-1" />
                          Upload
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>

      <AddModuleModal
        isOpen={isAddModuleModalOpen}
        onClose={() => setIsAddModuleModalOpen(false)}
        courseId={editedCourse.id}
      />
    </Dialog>
  );
}