import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Play, Lock, Calendar, Globe, Clock } from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  description?: string;
  video_duration_minutes?: number;
  release_mode: string;
  release_after_days?: number;
  video_url?: string;
  content?: string;
  module_id: string;
  order_index: number;
}

interface Module {
  id: string;
  title: string;
  description?: string;
  cover_image_url?: string;
  release_mode: string;
  release_after_days?: number;
  order_index: number;
}

interface ModuleCardProps {
  module: Module;
  moduleIndex: number;
  lessons: Lesson[];
  currentLesson: string | null;
  onLessonSelect: (lessonId: string) => void;
  isLessonBlocked?: (lesson: Lesson) => boolean;
  isLocked?: boolean;
  onUnlockClick?: () => void;
}

export default function ModuleCard({ 
  module, 
  moduleIndex, 
  lessons, 
  currentLesson, 
  onLessonSelect,
  isLessonBlocked = () => false,
  isLocked = false,
  onUnlockClick
}: ModuleCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const moduleLessons = lessons
    .filter(lesson => lesson.module_id === module.id)
    .sort((a, b) => a.order_index - b.order_index);

  const totalDuration = moduleLessons.reduce((total, lesson) => 
    total + (lesson.video_duration_minutes || 0), 0
  );

  const handleCardClick = () => {
    if (isLocked && onUnlockClick) {
      onUnlockClick();
    } else if (!isLocked) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <Card className={`overflow-hidden transition-all duration-200 ${
      isLocked 
        ? 'border-warning/30 shadow-warning/10' 
        : 'hover:shadow-md border-border'
    }`}>
      <Collapsible open={isOpen && !isLocked} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full p-0 h-auto"
            onClick={handleCardClick}
          >
            <CardContent className="p-0 w-full">
              {/* Module Cover Image */}
              <div className="relative h-32 overflow-hidden">
                {module.cover_image_url ? (
                  <img 
                    src={module.cover_image_url}
                    alt={module.title}
                    className={`w-full h-full object-cover transition-all duration-200 ${
                      isLocked ? 'blur-sm opacity-60' : ''
                    }`}
                  />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center transition-all duration-200 ${
                    isLocked ? 'opacity-60' : ''
                  }`}>
                    <div className="text-center">
                      <Play className="w-8 h-8 text-primary mx-auto mb-1 opacity-60" />
                      <p className="text-xs text-muted-foreground">Módulo {moduleIndex + 1}</p>
                    </div>
                  </div>
                )}

                {/* Lock Overlay for Paid Modules */}
                {isLocked && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="text-center text-white">
                      <Lock className="w-12 h-12 mx-auto mb-2 opacity-90" />
                      <p className="text-xs font-medium">Módulo Bloqueado</p>
                      <p className="text-xs opacity-75">Clique para desbloquear</p>
                    </div>
                  </div>
                )}
                
                {/* Overlay with module info */}
                <div className={`absolute inset-0 flex items-end ${isLocked ? 'bg-black/20' : 'bg-black/40'}`}>
                  <div className="p-3 w-full text-white">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-xs">
                            Módulo {moduleIndex + 1}
                          </Badge>
                          {isLocked && (
                            <Badge variant="destructive" className="text-xs">
                              <Lock className="w-3 h-3 mr-1" />
                              Bloqueado
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-medium text-sm leading-tight truncate">
                          {module.title}
                        </h3>
                      </div>
                      <div className="ml-2 flex items-center">
                        {isLocked ? (
                          <Lock className="w-4 h-4" />
                        ) : (
                          isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Module Summary */}
              <div className="p-3 text-left">
                {module.description && (
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                    {module.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span>{moduleLessons.length} aulas</span>
                    {totalDuration > 0 && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{totalDuration} min</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {isLocked ? (
                      <Badge variant="destructive" className="text-xs px-1 py-0">
                        <Lock className="w-3 h-3 mr-1" />
                        Bloqueado
                      </Badge>
                    ) : module.release_mode === 'days_after_enrollment' ? (
                      <Badge variant="outline" className="text-xs px-1 py-0">
                        <Calendar className="w-3 h-3 mr-1" />
                        {module.release_after_days}d
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs px-1 py-0">
                        <Globe className="w-3 h-3 mr-1" />
                        Livre
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="border-t">
          <div className="p-3 space-y-2">
            {isLocked ? (
              <div className="text-center py-4">
                <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  Módulo bloqueado. Adquira o curso para acessar.
                </p>
              </div>
            ) : moduleLessons.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 text-center">
                Nenhuma aula neste módulo
              </p>
            ) : (
              moduleLessons.map((lesson, lessonIndex) => {
                const isCurrent = currentLesson === lesson.id;
                const isBlocked = isLessonBlocked(lesson);
                
                return (
                  <div
                    key={lesson.id}
                    className={`flex items-center gap-2 p-2 rounded text-sm transition-colors ${
                      isCurrent ? 'bg-primary/10 text-primary border border-primary/20' : 
                      (isBlocked || isLocked) ? 'opacity-60' : 'hover:bg-muted/50 cursor-pointer'
                    }`}
                    onClick={() => !(isBlocked || isLocked) && onLessonSelect(lesson.id)}
                  >
                    <div className="w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0">
                      {(isBlocked || isLocked) ? (
                        <Lock className="w-2.5 h-2.5" />
                      ) : (
                        <Play className="w-2.5 h-2.5" />
                      )}
                    </div>
                    <span className="flex-1 truncate">
                      {lessonIndex + 1}. {lesson.title}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {lesson.video_duration_minutes > 0 && (
                        <span>{lesson.video_duration_minutes}min</span>
                      )}
                      {lesson.release_mode === 'days_after_enrollment' && (
                        <Badge variant="outline" className="text-xs px-1 py-0">
                          {lesson.release_after_days}d
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}