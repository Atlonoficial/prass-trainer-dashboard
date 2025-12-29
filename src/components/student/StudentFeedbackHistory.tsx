import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, MessageSquare, Calendar, Trophy } from 'lucide-react';
import { useFeedbacks, Feedback } from '@/hooks/useFeedbacks';
import { useAuth } from '@/hooks/useAuth';

export function StudentFeedbackHistory() {
  const { user } = useAuth();
  const { feedbacks, loading } = useFeedbacks(user?.id);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'workout': return '🏋️';
      case 'diet': return '🥗';
      case 'general': return '💬';
      default: return '📝';
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'workout': return 'Treino';
      case 'diet': return 'Dieta'; 
      case 'general': return 'Geral';
      default: return 'Outro';
    }
  };

  const StarRating = ({ rating }: { rating: number }) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'text-warning fill-warning' : 'text-muted-foreground'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          Meus Feedbacks Enviados
        </h3>
        <Badge variant="secondary" className="bg-muted/20 text-muted-foreground">
          {feedbacks.length} feedbacks
        </Badge>
      </div>

      {feedbacks.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h4 className="text-lg font-medium text-foreground mb-2">Nenhum feedback enviado</h4>
          <p className="text-muted-foreground">
            Envie seu primeiro feedback e ganhe pontos!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {feedbacks.map((feedback: Feedback) => (
            <div
              key={feedback.id}
              className="bg-muted/10 border border-border rounded-lg p-4 hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{getTypeIcon(feedback.type)}</span>
                  <Badge variant="outline" className="text-xs">
                    {getTypeName(feedback.type)}
                  </Badge>
                  <StarRating rating={feedback.rating} />
                </div>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {new Date(feedback.created_at).toLocaleDateString('pt-BR')}
                </div>
              </div>
              
              <p className="text-sm text-foreground mb-3 leading-relaxed">
                {feedback.message}
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs text-success">
                  <Trophy className="w-3 h-3" />
                  <span>Feedback enviado com sucesso</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Avaliação: {feedback.rating}/5
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}