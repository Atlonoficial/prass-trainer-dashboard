import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAnamneses } from '@/hooks/useAnamneses';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { 
  Heart, 
  AlertTriangle, 
  Pill, 
  Moon, 
  Clock, 
  Activity,
  FileText,
  Send,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StudentAnamneseTabProps {
  studentUserId: string;
  studentName: string;
}

export const StudentAnamneseTab = ({ studentUserId, studentName }: StudentAnamneseTabProps) => {
  const { anamneses, loading, latestAnamnesis } = useAnamneses(studentUserId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!latestAnamnesis) {
    return (
      <div className="p-6">
        <div className="flex flex-wrap gap-3 mb-6">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <FileText className="w-4 h-4 mr-2" />
            Nova Anamnese
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Send className="w-4 h-4 mr-2" />
            Solicitar nova anamnese
          </Button>
        </div>
        <EmptyState 
          title="Nenhuma anamnese encontrada"
          description="Este aluno ainda não respondeu a anamnese. Use os botões acima para solicitar uma nova anamnese."
        />
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
  };

  return (
    <div className="mobile-padding content-spacious">
      {/* Enhanced Header with better hierarchy */}
      <div className="mobile-header lg:flex lg:items-center lg:justify-between">
        <div className="flex items-center gap-3 mb-4 lg:mb-0">
          <div className="flex items-center gap-2 text-caption text-muted-foreground">
            <Calendar className="w-5 h-5 icon-info" />
            <span className="font-medium">Última atualização: {formatDate(latestAnamnesis.updated_at)}</span>
          </div>
        </div>
        <div className="mobile-button-group lg:flex lg:gap-3">
          <Button variant="outline" className="mobile-button">
            <FileText className="w-4 h-4 mr-2" />
            Solicitar Atualização
          </Button>
          <Button variant="outline" className="mobile-button">
            <Send className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Critical Information Section */}
      <div className="space-y-4">
        <h2 className="text-title text-critical flex items-center gap-2">
          <AlertTriangle className="w-6 h-6" />
          Informações Críticas
        </h2>
        
        <div className="mobile-grid lg:grid-cols-2 gap-6">
          {/* Doenças - Critical Priority */}
          <Card className="card-critical shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-subtitle icon-critical">
                <Heart className="w-6 h-6" />
                Doenças
              </CardTitle>
            </CardHeader>
            <CardContent className="content-comfortable">
              {latestAnamnesis.doencas.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {latestAnamnesis.doencas.map((doenca, index) => (
                    <Badge key={index} className="status-critical text-body px-3 py-1.5 font-medium">
                      {doenca}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-body text-muted-foreground">Nenhuma doença relatada</p>
              )}
              {latestAnamnesis.outras_doencas && (
                <>
                  <Separator className="my-4" />
                  <div className="status-critical rounded-lg p-4">
                    <p className="text-caption font-semibold mb-2">Outras doenças:</p>
                    <p className="text-body">{latestAnamnesis.outras_doencas}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Alergias - Critical Priority */}
          <Card className="card-warning shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-subtitle icon-warning">
                <AlertTriangle className="w-6 h-6" />
                Alergias
              </CardTitle>
            </CardHeader>
            <CardContent className="content-comfortable">
              {latestAnamnesis.alergias.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {latestAnamnesis.alergias.map((alergia, index) => (
                    <Badge key={index} className="status-warning text-body px-3 py-1.5 font-medium">
                      {alergia}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-body text-muted-foreground">Nenhuma alergia relatada</p>
              )}
              {latestAnamnesis.outras_alergias && (
                <>
                  <Separator className="my-4" />
                  <div className="status-warning rounded-lg p-4">
                    <p className="text-caption font-semibold mb-2">Outras alergias:</p>
                    <p className="text-body">{latestAnamnesis.outras_alergias}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Lesões - Full width critical section */}
      {latestAnamnesis.lesoes && (
        <Card className="card-warning shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-subtitle icon-warning">
              <Activity className="w-6 h-6" />
              Lesões ou Limitações Físicas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="status-warning rounded-xl p-6">
              <p className="text-body leading-relaxed">{latestAnamnesis.lesoes}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Complementary Information Section */}
      <div className="space-y-4">
        <h2 className="text-title text-info flex items-center gap-2">
          <Activity className="w-6 h-6" />
          Informações Complementares
        </h2>
        
        <div className="mobile-grid lg:grid-cols-2 gap-6">

          {/* Medicações - Informational */}
          <Card className="card-info shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-subtitle icon-info">
                <Pill className="w-6 h-6" />
                Medicações
              </CardTitle>
            </CardHeader>
            <CardContent className="content-comfortable">
              {latestAnamnesis.medicacoes.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {latestAnamnesis.medicacoes.map((medicacao, index) => (
                    <Badge key={index} className="status-info text-body px-3 py-1.5 font-medium">
                      {medicacao}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-body text-muted-foreground">Nenhuma medicação relatada</p>
              )}
            </CardContent>
          </Card>

          {/* Sono - Informational */}
          <Card className="card-neutral shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-subtitle icon-neutral">
                <Moon className="w-6 h-6" />
                Qualidade do Sono
              </CardTitle>
            </CardHeader>
            <CardContent className="content-comfortable">
              {latestAnamnesis.qualidade_sono && (
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-body font-medium">Qualidade:</span>
                  <Badge className="status-neutral text-body px-3 py-1.5 font-medium">
                    {latestAnamnesis.qualidade_sono}
                  </Badge>
                </div>
              )}
              {latestAnamnesis.horas_sono && (
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 icon-neutral" />
                  <span className="text-body">
                    <span className="font-semibold">Horas por noite:</span> {latestAnamnesis.horas_sono}
                  </span>
                </div>
              )}
              {!latestAnamnesis.qualidade_sono && !latestAnamnesis.horas_sono && (
                <p className="text-body text-muted-foreground">Informações de sono não relatadas</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Historical Records - Enhanced Section */}
      {anamneses.length > 1 && (
        <Card className="card-neutral shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-subtitle icon-neutral">
              <FileText className="w-6 h-6" />
              Histórico de Anamneses
              <Badge className="status-neutral ml-2 px-2 py-1 text-micro">
                {anamneses.length - 1} anteriores
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="content-comfortable">
            <div className="space-y-4">
              {anamneses.slice(1).map((anamnesis, index) => (
                <div key={anamnesis.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-neutral/20 flex items-center justify-center">
                      <span className="text-caption font-bold">#{anamneses.length - index - 1}</span>
                    </div>
                    <span className="text-body font-medium">Anamnese #{anamneses.length - index - 1}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-caption text-muted-foreground font-medium">
                      {formatDate(anamnesis.created_at)}
                    </span>
                    <Button variant="outline" size="sm" className="px-4">
                      Visualizar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};