import React from 'react';
import { useSecureLessonAccess } from '@/hooks/useSecureLessonAccess';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Shield, Lock, Play, User } from 'lucide-react';

interface SecureLessonViewerProps {
  lessonId: string;
  onAccessDenied?: () => void;
}

export function SecureLessonViewer({ lessonId, onAccessDenied }: SecureLessonViewerProps) {
  const { hasAccess, loading, lesson, accessReason } = useSecureLessonAccess(lessonId);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
        <span className="ml-2">Verificando acesso...</span>
      </div>
    );
  }

  if (!hasAccess) {
    onAccessDenied?.();
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Lock className="h-5 w-5" />
            Acesso Negado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Você não tem permissão para acessar esta aula. Verifique se possui o curso ou se a aula está disponível.</p>
        </CardContent>
      </Card>
    );
  }

  const getAccessBadge = () => {
    switch (accessReason) {
      case 'instructor':
        return <Badge variant="secondary"><User className="h-3 w-3 mr-1" />Instrutor</Badge>;
      case 'free':
        return <Badge variant="outline"><Play className="h-3 w-3 mr-1" />Aula Gratuita</Badge>;
      case 'free_course':
        return <Badge variant="outline"><Play className="h-3 w-3 mr-1" />Curso Gratuito</Badge>;
      case 'purchased':
        return <Badge variant="default"><Shield className="h-3 w-3 mr-1" />Comprado</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{lesson.title}</CardTitle>
          {getAccessBadge()}
        </div>
        {lesson.description && (
          <p className="text-muted-foreground">{lesson.description}</p>
        )}
      </CardHeader>
      <CardContent>
        {lesson.video_url && (
          <div className="aspect-video bg-muted rounded-lg mb-4 flex items-center justify-center">
            <div className="text-center">
              <Play className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Video: {lesson.video_url}
              </p>
            </div>
          </div>
        )}
        
        {lesson.content && (
          <div className="prose prose-sm max-w-none">
            <div dangerouslySetInnerHTML={{ __html: lesson.content }} />
          </div>
        )}

        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Acesso verificado e autorizado pelo sistema de segurança
          </p>
        </div>
      </CardContent>
    </Card>
  );
}