import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, User, Zap, Database, AlertCircle } from "lucide-react";
import { useAtlonAssistant } from "@/hooks/useAtlonAssistant";
import { useLocation } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface PersonalAssistantChatProps {
  className?: string;
  embedded?: boolean; // Para modo integrado na sidebar
  isCollapsed?: boolean; // Para respeitar estado da sidebar
}

export default function PersonalAssistantChat({ className = "", embedded = false, isCollapsed = false }: PersonalAssistantChatProps) {
  const location = useLocation();
  const isInChatPage = location.pathname.includes('/chat');
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [includeStudentData, setIncludeStudentData] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, isLoading, error, isAuthorized, sendMessage, startNewConversation, clearError } =
    useAtlonAssistant();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Inicializar nova conversa quando abrir o chat
  useEffect(() => {
    if (isOpen && isAuthorized && messages.length === 0) {
      startNewConversation();
    }
  }, [isOpen, isAuthorized, messages.length, startNewConversation]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const messageToSend = inputMessage;
    setInputMessage("");
    clearError();

    await sendMessage(messageToSend, includeStudentData);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Não mostrar se não autorizado
  if (!isAuthorized) return null;

  // Modo integrado na sidebar
  if (embedded) {
    return (
      <>
        <Button
          onClick={() => setIsOpen(true)}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all",
            "bg-gradient-to-br from-primary via-primary to-primary/80",
            "hover:from-primary/90 hover:via-primary/85 hover:to-primary/70",
            "shadow-lg hover:shadow-xl relative",
            isCollapsed && "px-0"
          )}
          size={isCollapsed ? "icon" : "default"}
          aria-label="Abrir Assistente ATLON"
        >
          <Zap className={cn(
            "text-primary-foreground animate-pulse",
            isCollapsed ? "h-5 w-5" : "h-4 w-4"
          )} />
          {!isCollapsed && (
            <span className="text-xs font-semibold text-primary-foreground">
              Assistente IA
            </span>
          )}
          <Badge className="absolute -top-1 -right-1 bg-gradient-to-r from-amber-500 to-red-500 text-white font-bold shadow-lg text-[10px] px-1.5 py-0.5">
            IA
          </Badge>
        </Button>

        {/* Modal Dialog */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-2xl h-[85vh] sm:h-[80vh] p-0 gap-0 flex flex-col z-modal">
            <DialogHeader className="px-5 pt-5 pb-3 pr-12 border-b border-border/40 bg-gradient-to-r from-primary/10 via-primary/5 to-background flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 rounded-full animate-spin-slow opacity-75 blur-sm"></div>
                  <div className="relative w-10 h-10 bg-gradient-to-br from-primary via-primary/90 to-primary/70 rounded-full flex items-center justify-center shadow-lg border-2 border-background">
                    <Zap className="w-6 h-6 text-primary-foreground" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <DialogTitle className="text-base lg:text-lg">Assistente ATLON</DialogTitle>
                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-sm">
                      IA
                    </Badge>
                    {messages.length > 0 && (
                      <Badge variant="outline" className="text-xs font-semibold">
                        {messages.length} msg
                      </Badge>
                    )}
                  </div>
                  <DialogDescription className="hidden sm:block">
                    Fitness & Nutrição baseado em evidências
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <ScrollArea className="flex-1 min-h-0 p-4">
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}
                  >
                    {message.role === "assistant" && (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md ring-2 ring-background flex-shrink-0">
                        <Zap className="w-5 h-5 text-white animate-pulse" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "rounded-2xl shadow-md max-w-[85%]",
                        message.role === "user"
                          ? "rounded-tr-sm p-4 bg-gradient-to-br from-amber-500 to-orange-600 text-white border-none"
                          : "rounded-tl-sm p-4 bg-muted/80 backdrop-blur-sm border border-border",
                      )}
                    >
                      <p
                        className={cn(
                          "text-sm font-medium leading-relaxed",
                          message.role === "user" ? "text-white" : "text-foreground",
                        )}
                      >
                        {message.content}
                      </p>
                      <div className="flex items-center justify-between mt-2 gap-2">
                        <p className={cn("text-xs", message.role === "user" ? "text-white/80" : "text-muted-foreground")}>
                          {message.timestamp.toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        {message.characters && (
                          <Badge variant="secondary" className="text-xs">
                            {message.characters}/600
                          </Badge>
                        )}
                      </div>
                    </div>
                    {message.role === "user" && (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 flex items-center justify-center shadow-md ring-2 ring-background flex-shrink-0">
                        <User className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md ring-2 ring-background flex-shrink-0">
                      <Zap className="w-5 h-5 text-white animate-pulse" />
                    </div>
                    <div className="rounded-2xl rounded-tl-sm p-4 bg-muted/80 backdrop-blur-sm border border-border shadow-md">
                      <div className="flex gap-1.5 items-center">
                        <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce"></div>
                      </div>
                    </div>
                  </div>
                )}
                {error && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center shadow-md ring-2 ring-background flex-shrink-0">
                      <AlertCircle className="w-5 h-5 text-destructive" />
                    </div>
                    <div className="rounded-2xl rounded-tl-sm p-4 bg-destructive/10 border border-destructive/30 shadow-md max-w-[85%]">
                      <p className="text-sm text-destructive font-medium">{error}</p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            <div className="flex-shrink-0 p-4 border-t border-border space-y-3 bg-gradient-to-b from-background to-muted/20 backdrop-blur-sm">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <Switch
                    id="student-data"
                    checked={includeStudentData}
                    onCheckedChange={setIncludeStudentData}
                    className="data-[state=checked]:bg-primary"
                  />
                  <Label
                    htmlFor="student-data"
                    className="text-xs font-medium flex items-center gap-1.5 text-foreground cursor-pointer"
                  >
                    <Database className="w-3.5 h-3.5 text-primary" />
                    <span>Dados dos alunos</span>
                  </Label>
                </div>
                {isLoading && <span className="text-xs text-muted-foreground animate-pulse">Pensando...</span>}
              </div>
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Pergunte sobre fitness, nutrição ou treinamento..."
                  className="flex-1 bg-background border-2 border-border hover:border-primary/50 focus:border-primary text-foreground font-medium transition-all rounded-xl h-12 px-4"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-600 hover:via-orange-600 hover:to-red-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-xl h-12 w-12 disabled:opacity-50 disabled:cursor-not-allowed"
                  size="icon"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
              <div className="text-center px-2">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="inline-flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500" />
                    <span className="font-semibold text-primary">Assistente ATLON Tech</span>
                  </span>
                  <span className="hidden sm:inline"> • Baseado em evidências (ACSM, NSCA, ISSN)</span>
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Modo flutuante (fallback - não usado mais, mas mantido por segurança)
  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed h-16 w-16 rounded-full bg-gradient-to-br from-primary via-primary to-primary/80 hover:from-primary/90 hover:via-primary/85 hover:to-primary/70 shadow-2xl hover:shadow-primary/50 transition-all duration-500 hover:scale-110 group z-modal",
          isInChatPage 
            ? "bottom-28 right-6 sm:bottom-24 sm:right-8" 
            : "bottom-6 right-6",
          className
        )}
        size="icon"
        aria-label="Abrir Assistente ATLON"
      >
        <Zap className="h-7 w-7 text-primary-foreground animate-pulse" />
        <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white font-bold shadow-lg text-xs px-2 py-1 animate-bounce">
          IA
        </Badge>
        <div className="hidden group-hover:block absolute bottom-full right-0 mb-2 px-3 py-2 bg-popover text-popover-foreground text-sm rounded-lg shadow-lg whitespace-nowrap">
          Assistente ATLON Tech
        </div>
      </Button>

      {/* Dialog Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl h-[85vh] sm:h-[80vh] p-0 gap-0 flex flex-col z-modal">
          {/* Header com controles */}
          <DialogHeader className="px-5 pt-5 pb-3 pr-12 border-b border-border/40 bg-gradient-to-r from-primary/10 via-primary/5 to-background flex-shrink-0">
            <div className="flex items-center gap-3">
              {/* Avatar com borda animada */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 rounded-full animate-spin-slow opacity-75 blur-sm"></div>
                <div className="relative w-10 h-10 bg-gradient-to-br from-primary via-primary/90 to-primary/70 rounded-full flex items-center justify-center shadow-lg border-2 border-background">
                  <Zap className="w-6 h-6 text-primary-foreground" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-base lg:text-lg">Assistente ATLON</DialogTitle>
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-sm">
                    IA
                  </Badge>
                  {messages.length > 0 && (
                    <Badge variant="outline" className="text-xs font-semibold">
                      {messages.length} msg
                    </Badge>
                  )}
                </div>
                <DialogDescription className="hidden sm:block">
                  Fitness & Nutrição baseado em evidências
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Área de mensagens (scrollable) */}
          <ScrollArea className="flex-1 min-h-0 p-4">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}
                >
                  {message.role === "assistant" && (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md ring-2 ring-background flex-shrink-0">
                      <Zap className="w-5 h-5 text-white animate-pulse" />
                    </div>
                  )}

                  <div
                    className={cn(
                      "rounded-2xl shadow-md max-w-[85%]",
                      message.role === "user"
                        ? "rounded-tr-sm p-4 bg-gradient-to-br from-amber-500 to-orange-600 text-white border-none"
                        : "rounded-tl-sm p-4 bg-muted/80 backdrop-blur-sm border border-border",
                    )}
                  >
                    <p
                      className={cn(
                        "text-sm font-medium leading-relaxed",
                        message.role === "user" ? "text-white" : "text-foreground",
                      )}
                    >
                      {message.content}
                    </p>
                    <div className="flex items-center justify-between mt-2 gap-2">
                      <p className={cn("text-xs", message.role === "user" ? "text-white/80" : "text-muted-foreground")}>
                        {message.timestamp.toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {message.characters && (
                        <Badge variant="secondary" className="text-xs">
                          {message.characters}/600
                        </Badge>
                      )}
                    </div>
                  </div>

                  {message.role === "user" && (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 flex items-center justify-center shadow-md ring-2 ring-background flex-shrink-0">
                      <User className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md ring-2 ring-background flex-shrink-0">
                    <Zap className="w-5 h-5 text-white animate-pulse" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm p-4 bg-muted/80 backdrop-blur-sm border border-border shadow-md">
                    <div className="flex gap-1.5 items-center">
                      <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce"></div>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex gap-3 justify-start">
                  <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center shadow-md ring-2 ring-background flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-destructive" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm p-4 bg-destructive/10 border border-destructive/30 shadow-md max-w-[85%]">
                    <p className="text-sm text-destructive font-medium">{error}</p>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Footer com input (fixo) */}
          <div className="flex-shrink-0 p-4 border-t border-border space-y-3 bg-gradient-to-b from-background to-muted/20 backdrop-blur-sm">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <Switch
                  id="student-data"
                  checked={includeStudentData}
                  onCheckedChange={setIncludeStudentData}
                  className="data-[state=checked]:bg-primary"
                />
                <Label
                  htmlFor="student-data"
                  className="text-xs font-medium flex items-center gap-1.5 text-foreground cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5 text-primary" />
                  <span>Dados dos alunos</span>
                </Label>
              </div>
              {isLoading && <span className="text-xs text-muted-foreground animate-pulse">Pensando...</span>}
            </div>

            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Pergunte sobre fitness, nutrição ou treinamento..."
                className="flex-1 bg-background border-2 border-border hover:border-primary/50 focus:border-primary text-foreground font-medium transition-all rounded-xl h-12 px-4"
                disabled={isLoading}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-600 hover:via-orange-600 hover:to-red-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-xl h-12 w-12 disabled:opacity-50 disabled:cursor-not-allowed"
                size="icon"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>

            <div className="text-center px-2">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="inline-flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span className="font-semibold text-primary">Assistente ATLON Tech</span>
                </span>
                <span className="hidden sm:inline"> • Baseado em evidências (ACSM, NSCA, ISSN)</span>
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
