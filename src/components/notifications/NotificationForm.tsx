import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Send, Users, Target, Brain, Loader2 } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useNotificationSegments } from "@/hooks/useNotificationSegments";
import { useToast } from "@/hooks/use-toast";

interface NotificationFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationForm({ isOpen, onClose }: NotificationFormProps) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [segment, setSegment] = useState<"all" | "ativos" | "inativos" | "novos" | "custom">("all");
  const [externalUserIds, setExternalUserIds] = useState("");
  const { createCampaign, loading } = usePushNotifications();
  const { segments, loading: segmentsLoading } = useNotificationSegments();
  const { toast } = useToast();

  const resetForm = () => {
    setTitle("");
    setMessage("");
    setSegment("all");
    setExternalUserIds("");
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha o título e a mensagem.",
        variant: "destructive",
      });
      return;
    }

    if (segment === "custom" && !externalUserIds.trim()) {
      toast({
        title: "IDs necessários",
        description: "Por favor, informe os IDs dos usuários para envio personalizado.",
        variant: "destructive",
      });
      return;
    }

    const notificationData = {
      title: title.trim(),
      message: message.trim(),
      segment,
      ...(segment === "custom" && externalUserIds.trim()
        ? {
          externalUserIds: externalUserIds
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean),
        }
        : {}),
    };

    try {
      const result = await createCampaign(notificationData);

      if (result) {
        // Fechar modal apenas se houve sucesso real
        resetForm();
        onClose();
      }
    } catch (error) {
      // Error já foi tratado pelo hook usePushNotifications
      console.error("Error sending notification:", error);
    }
  };

  // Calcular estatísticas do público-alvo
  const calculateAudience = () => {
    if (!segments || segments.length === 0) return 0;

    switch (segment) {
      case "all":
        return segments.find((s) => s.id === "all")?.count || 0;
      case 'ativos':
        return segments.find(s => s.id === 'active')?.count || 0;
      case 'inativos':
        return segments.find(s => s.id === 'inactive')?.count || 0;
      case 'novos':
        return segments.find(s => s.id === 'new')?.count || 0;
      case "custom":
        return externalUserIds.split(",").filter((id) => id.trim()).length;

      default:
        return 0;
    }
  };

  const audienceCount = calculateAudience();
  const estimatedReach = Math.floor(audienceCount * 0.85); // 85% delivery rate
  const estimatedOpens = Math.floor(estimatedReach * 0.25); // 25% open rate

  if (!isOpen) return null;

  // Show loading state while segments are loading
  if (segmentsLoading) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
        <Card className="bg-card border-border p-6 max-w-md">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-foreground">Carregando dados dos alunos...</span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <Card className="bg-card border-border w-full max-w-4xl max-h-[95vh] overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
            <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
              <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground truncate">Nova Notificação Push</h2>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                Envie notificações para seus alunos
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="overflow-y-auto max-h-[calc(95vh-140px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 p-4 sm:p-6">
            {/* Coluna Esquerda - Conteúdo */}
            <div className="space-y-4 sm:space-y-6">
              {/* Título e Mensagem */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title" className="text-foreground font-medium text-sm sm:text-base">
                    Título da Notificação
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-background border-border text-foreground mt-2 text-sm sm:text-base"
                    placeholder="Ex: Lembrete do seu treino de hoje!"
                    maxLength={100}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{title.length}/100 caracteres</p>
                </div>

                <div>
                  <Label htmlFor="message" className="text-foreground font-medium text-sm sm:text-base">
                    Mensagem
                  </Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="bg-background border-border text-foreground mt-2 text-sm sm:text-base resize-none"
                    rows={4}
                    placeholder="Digite sua mensagem aqui..."
                    maxLength={500}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-muted-foreground">{message.length}/500 caracteres</p>
                    <div className="flex space-x-1">
                      <div
                        className={`w-2 h-2 rounded-full ${message.length > 400 ? "bg-destructive" : message.length > 300 ? "bg-warning" : "bg-success"}`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Público-alvo */}
              <div className="space-y-2">
                <Label htmlFor="segment" className="text-sm font-medium">
                  Público-alvo
                </Label>
                <Select
                  value={segment}
                  onValueChange={(value: "all" | "ativos" | "inativos" | "novos" | "custom") => setSegment(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os alunos</SelectItem>
                    <SelectItem value="ativos">Alunos ativos (últimos 30 dias)</SelectItem>
                    <SelectItem value="inativos">Alunos inativos (mais de 30 dias)</SelectItem>
                    <SelectItem value="novos">Novos alunos (últimos 7 dias)</SelectItem>
                    <SelectItem value="custom">Selecionar usuários específicos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom User IDs */}
              {segment === "custom" && (
                <div className="space-y-2">
                  <Label htmlFor="userIds" className="text-sm font-medium">
                    IDs dos Usuários (separados por vírgula)
                  </Label>
                  <Textarea
                    id="userIds"
                    placeholder="user-id-1, user-id-2, user-id-3..."
                    value={externalUserIds}
                    onChange={(e) => setExternalUserIds(e.target.value)}
                    className="min-h-[80px] resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Digite os IDs dos usuários separados por vírgula para envio personalizado
                  </p>
                </div>
              )}
            </div>

            {/* Coluna Direita - Preview */}
            <div className="space-y-4 sm:space-y-6">
              {/* Preview da Notificação */}
              <div className="bg-muted/30 border border-border rounded-lg p-3 sm:p-4">
                <div className="flex items-center space-x-2 mb-3 sm:mb-4">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <Brain className="w-3 h-3 sm:w-3 sm:h-3 text-primary-foreground" />
                  </div>
                  <span className="text-foreground font-medium text-sm sm:text-base">Preview da Notificação</span>
                </div>

                {/* Simulação de Push Mobile */}
                <div className="bg-background rounded-xl p-3 sm:p-4 border border-border shadow-lg max-w-sm mx-auto">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                      <Send className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-foreground text-xs sm:text-sm truncate">Prass Trainer</h4>
                        <span className="text-xs text-muted-foreground flex-shrink-0">agora</span>
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-foreground line-clamp-2 mb-1">
                        {title || "Título da notificação"}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {message || "Sua mensagem aparecerá aqui..."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Estatísticas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-success/10 rounded-lg border border-success/20 text-center">
                  <Target className="w-6 h-6 text-success mx-auto mb-2" />
                  <p className="text-lg font-semibold text-success">{audienceCount}</p>
                  <p className="text-xs text-muted-foreground">Destinatários</p>
                </div>
                <div className="p-4 bg-info/10 rounded-lg border border-info/20 text-center">
                  <Users className="w-6 h-6 text-info mx-auto mb-2" />
                  <p className="text-lg font-semibold text-info">{estimatedReach}</p>
                  <p className="text-xs text-muted-foreground">Estimativa de Entrega</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0 sm:space-x-4">
            <div className="text-sm text-muted-foreground text-center sm:text-left">
              <p>
                Será enviado para <span className="font-medium text-foreground">{audienceCount} usuários</span>
              </p>
              <p className="text-xs">Estimativa de abertura: {estimatedOpens} usuários</p>
            </div>
            <div className="flex space-x-3 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => {
                  resetForm();
                  onClose();
                }}
                className="flex-1 sm:flex-none"
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSend}
                disabled={
                  loading || !title.trim() || !message.trim() || (segment === "custom" && !externalUserIds.trim())
                }
                className="flex-1 sm:flex-none"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar Notificação"
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
