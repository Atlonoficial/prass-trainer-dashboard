import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Star, MessageSquare, Heart, Star as StarFilled } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StudentFeedbackModalProps {
  onFeedbackSent?: () => void;
}

export function StudentFeedbackModal({ onFeedbackSent }: StudentFeedbackModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState('');
  const [feedbackType, setFeedbackType] = useState<'workout' | 'diet' | 'general'>('general');
  const [teacherId, setTeacherId] = useState<string>('');
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Buscar teacher_id do aluno
  useState(() => {
    const fetchTeacherId = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('students')
        .select('teacher_id')
        .eq('user_id', user.id)
        .single();
      
      if (data?.teacher_id) {
        setTeacherId(data.teacher_id);
      }
    };
    
    fetchTeacherId();
  });

  const handleSubmit = async () => {
    if (!user?.id || !teacherId || !message.trim()) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase.rpc('submit_feedback_with_points_v2', {
        p_student_id: user.id,
        p_teacher_id: teacherId,
        p_feedback_data: {
          rating,
          message: message.trim(),
          type: feedbackType,
          metadata: {
            source: 'student_dashboard',
            timestamp: new Date().toISOString()
          }
        }
      });

      if (error) throw error;

      const result = data as any;
      
      if (result.success) {
        toast({
          title: 'Feedback Enviado! 🎉',
          description: `Obrigado pelo seu feedback! Você ganhou ${result.points_awarded || 0} pontos.`,
        });
        
        // Reset form
        setMessage('');
        setRating(5);
        setFeedbackType('general');
        setOpen(false);
        
        // Callback para atualizar dados
        onFeedbackSent?.();
      } else {
        toast({
          title: 'Aviso',
          description: result.message || 'Feedback já enviado neste período',
          variant: 'default'
        });
      }
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível enviar o feedback',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const StarRating = ({ value, onChange }: { value: number; onChange: (rating: number) => void }) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`p-1 transition-colors ${
              star <= value ? 'text-warning' : 'text-muted-foreground hover:text-warning/50'
            }`}
          >
            {star <= value ? <StarFilled className="w-6 h-6" /> : <Star className="w-6 h-6" />}
          </button>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2">
          <Heart className="w-5 h-5" />
          Enviar Feedback
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Enviar Feedback ao Professor
          </DialogTitle>
          <DialogDescription>
            Compartilhe sua experiência e ganhe pontos! Seu feedback é muito importante.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tipo de Feedback */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Tipo de Feedback</label>
            <Select value={feedbackType} onValueChange={(value: 'workout' | 'diet' | 'general') => setFeedbackType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">Geral</SelectItem>
                <SelectItem value="workout">Treino</SelectItem>
                <SelectItem value="diet">Dieta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Rating */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Avaliação</label>
            <Card className="p-4 bg-muted/5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Como você avalia?</span>
                <div className="flex items-center space-x-2">
                  <StarRating value={rating} onChange={setRating} />
                  <span className="text-sm font-medium text-foreground ml-2">{rating}/5</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Mensagem */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Sua Mensagem</label>
            <Textarea
              placeholder="Conte como está sendo sua experiência, sugestões, elogios..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Botões */}
          <div className="flex space-x-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !message.trim()}
              className="flex-1"
            >
              {loading ? 'Enviando...' : 'Enviar Feedback'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}