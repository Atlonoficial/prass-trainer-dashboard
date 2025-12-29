import { PublicLayout } from "@/components/layout/PublicLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Headphones, Mail, Clock, MessageCircle, Phone, HelpCircle, Send, Trash2, Lock } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const supportSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100, "Nome muito longo"),
  email: z.string().email("Email inválido").max(255, "Email muito longo"),
  subject: z.string().min(1, "Selecione um assunto"),
  message: z.string()
    .min(10, "Mensagem deve ter pelo menos 10 caracteres")
    .max(5000, "Mensagem muito longa")
});

type SupportFormData = z.infer<typeof supportSchema>;

export default function Support() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<SupportFormData>({
    resolver: zodResolver(supportSchema)
  });

  const onSubmit = async (data: SupportFormData) => {
    setIsSubmitting(true);
    try {
      // Save to database (using type assertion until types are updated)
      const { error } = await (supabase as any)
        .from('support_tickets')
        .insert({
          name: data.name,
          email: data.email,
          subject: data.subject,
          message: data.message,
          status: 'open'
        });

      if (error) throw error;

      toast.success("Mensagem enviada com sucesso! Responderemos em breve.", {
        description: "Verifique seu email nas próximas 24 horas."
      });
      reset();
    } catch (error: any) {
      console.error('Error submitting support ticket:', error);
      toast.error("Erro ao enviar mensagem. Tente novamente ou envie email para suporte@seu-dominio.com");
    } finally {
      setIsSubmitting(false);
    }
  };

  const faqs = [
    {
      question: "Como criar uma conta?",
      answer: "Baixe o app, clique em 'Criar Conta' e siga as instruções na tela."
    },
    {
      question: "Esqueci minha senha, o que fazer?",
      answer: "Na tela de login, clique em 'Esqueci a senha' e siga as instruções enviadas por email."
    },
    {
      question: "Como cancelar minha assinatura?",
      answer: "Vá em Configurações > Assinatura > Cancelar Assinatura."
    },
    {
      question: "Meus dados estão seguros?",
      answer: "Sim! Utilizamos criptografia de ponta e seguimos as normas da LGPD. Veja nossa Política de Privacidade."
    },
    {
      question: "Como excluir minha conta?",
      answer: "Vá em Configurações > Conta > Excluir conta permanentemente. Seus dados serão removidos em até 30 dias."
    },
    {
      question: "O app funciona offline?",
      answer: "Alguns recursos sim, mas é necessário conexão para sincronizar dados e acessar recursos online."
    },
    {
      question: "Posso usar em mais de um dispositivo?",
      answer: "Sim! Faça login com a mesma conta em diferentes dispositivos."
    }
  ];

  return (
    <PublicLayout>
      <div className="container max-w-5xl px-4 md:px-6 py-12">
        {/* Header */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Headphones className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gradient">Central de Suporte</h1>
              <p className="text-muted-foreground mt-1">Estamos aqui para ajudar!</p>
            </div>
          </div>
        </div>

        {/* Contact Methods */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Email</h3>
                  <a 
                    href="mailto:suporte@seu-dominio.com" 
                    className="text-sm text-primary hover:underline"
                  >
                    suporte@seu-dominio.com
                  </a>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>Resposta em até 24h</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="p-3 bg-success/10 rounded-full">
                  <MessageCircle className="w-6 h-6 text-success" />
                </div>
                <div>
                  <h3 className="font-semibold">Horário</h3>
                  <p className="text-sm text-muted-foreground">Seg-Sex: 9h-18h</p>
                  <p className="text-sm text-muted-foreground">Sáb: 9h-13h</p>
                </div>
                <div className="text-xs text-muted-foreground">
                  Horário de Brasília
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="p-3 bg-info/10 rounded-full">
                  <HelpCircle className="w-6 h-6 text-info" />
                </div>
                <div>
                  <h3 className="font-semibold">FAQ</h3>
                  <p className="text-sm text-muted-foreground">
                    Respostas rápidas
                  </p>
                </div>
                <a 
                  href="#faq" 
                  className="text-xs text-primary hover:underline"
                >
                  Ver perguntas frequentes
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Support Form */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-6 h-6 text-primary" />
              Enviar Mensagem
            </CardTitle>
            <CardDescription>
              Preencha o formulário abaixo e responderemos o mais breve possível
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo *</Label>
                  <Input
                    id="name"
                    placeholder="Seu nome"
                    {...register("name")}
                    className={errors.name ? "border-destructive" : ""}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    {...register("email")}
                    className={errors.email ? "border-destructive" : ""}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Tipo de problema *</Label>
                <Select onValueChange={(value) => setValue("subject", value)}>
                  <SelectTrigger id="subject" className={errors.subject ? "border-destructive" : ""}>
                    <SelectValue placeholder="Selecione o tipo de problema" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">Problema Técnico</SelectItem>
                    <SelectItem value="payment">Pagamento</SelectItem>
                    <SelectItem value="account">Conta e Login</SelectItem>
                    <SelectItem value="privacy">Privacidade/LGPD</SelectItem>
                    <SelectItem value="feature">Sugestão de Recurso</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
                {errors.subject && (
                  <p className="text-sm text-destructive">{errors.subject.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Mensagem *</Label>
                <Textarea
                  id="message"
                  placeholder="Descreva seu problema ou pergunta em detalhes..."
                  rows={6}
                  {...register("message")}
                  className={errors.message ? "border-destructive" : ""}
                />
                {errors.message && (
                  <p className="text-sm text-destructive">{errors.message.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Mínimo 10 caracteres, máximo 5000
                </p>
              </div>

              <div className="flex gap-3">
                <Button 
                  type="submit" 
                  className="btn-branded"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin mr-2" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Enviar Mensagem
                    </>
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => reset()}
                  disabled={isSubmitting}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Limpar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <section id="faq">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="w-6 h-6 text-primary" />
                Perguntas Frequentes (FAQ)
              </CardTitle>
              <CardDescription>
                Respostas rápidas para as dúvidas mais comuns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {faqs.map((faq, index) => (
                  <div key={index} className="border-b border-border pb-4 last:border-0 last:pb-0">
                    <h4 className="font-semibold mb-2 text-foreground">
                      {index + 1}. {faq.question}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      → {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* LGPD Section */}
        <Card className="mt-8 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-6 h-6 text-primary" />
              Solicitar Exclusão de Dados (LGPD)
            </CardTitle>
            <CardDescription>
              Exercer seu direito ao esquecimento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              🗑️ Para solicitar exclusão completa dos seus dados:
            </p>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li>Envie email para: <a href="mailto:privacidade@seu-dominio.com" className="text-primary hover:underline">privacidade@seu-dominio.com</a></li>
              <li>Assunto: "Solicitação de Exclusão de Dados - LGPD"</li>
              <li>Inclua: Nome, email cadastrado e confirmação de identidade</li>
              <li>Prazo de resposta: até 15 dias úteis</li>
              <li>Seus dados serão excluídos permanentemente em até 30 dias</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}
