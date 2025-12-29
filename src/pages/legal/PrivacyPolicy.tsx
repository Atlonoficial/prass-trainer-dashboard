import { PublicLayout } from "@/components/layout/PublicLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Shield, Lock, Users, Database, Eye, FileText, AlertCircle, Calendar, Mail, Phone, Headphones } from "lucide-react";

export default function PrivacyPolicy() {
  const lastUpdate = "16 de Janeiro de 2025";

  return (
    <PublicLayout>
      <div className="container max-w-5xl px-4 md:px-6 py-12">
        {/* Header */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gradient">Política de Privacidade</h1>
              <p className="text-muted-foreground mt-1">Prass Trainer</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Última atualização: {lastUpdate}</span>
          </div>
        </div>

        {/* Quick Navigation */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Índice Rápido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <nav className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { id: "coleta", label: "Dados Coletados", icon: Database },
                { id: "uso", label: "Como Usamos", icon: Eye },
                { id: "compartilhamento", label: "Compartilhamento", icon: Users },
                { id: "seguranca", label: "Segurança", icon: Lock },
                { id: "direitos", label: "Seus Direitos (LGPD)", icon: Shield },
                { id: "contato", label: "Contato", icon: Mail },
              ].map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors p-2 rounded-lg hover:bg-primary/5"
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </a>
              ))}
            </nav>
          </CardContent>
        </Card>

        {/* Content Sections */}
        <div className="space-y-8">
          {/* Section: Dados Coletados */}
          <section id="coleta">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-6 h-6 text-primary" />
                  A) Dados Coletados
                </CardTitle>
                <CardDescription>Que informações coletamos sobre você</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-semibold">📊 Informações coletadas:</h4>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong>Nome completo e email</strong> (para autenticação)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong>Fotos de progresso físico</strong> (opcional, armazenadas com seu consentimento)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong>Dados biométricos:</strong> peso, altura, IMC, medidas corporais</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong>Histórico de treinos</strong> e exercícios realizados</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong>Preferências alimentares</strong> e restrições dietéticas</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong>Dados de uso do aplicativo</strong> (páginas visitadas, recursos utilizados)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong>Informações do dispositivo</strong> (modelo, versão do SO, identificador único)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong>Localização aproximada</strong> (apenas para recomendar academias próximas)</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Section: Como Usamos */}
          <section id="uso">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-6 h-6 text-primary" />
                  B) Como Usamos os Dados
                </CardTitle>
                <CardDescription>Finalidade do uso das informações</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-semibold">🎯 Finalidade do uso:</h4>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-success mt-1">✓</span>
                      <span>Personalizar treinos e planos nutricionais de acordo com seu perfil</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-success mt-1">✓</span>
                      <span>Acompanhar seu progresso físico ao longo do tempo</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-success mt-1">✓</span>
                      <span>Fornecer recomendações do Coach IA baseadas no seu histórico</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-success mt-1">✓</span>
                      <span>Enviar notificações sobre treinos, lembretes e conquistas</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-success mt-1">✓</span>
                      <span>Melhorar nossos serviços e desenvolver novos recursos</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-success mt-1">✓</span>
                      <span>Garantir a segurança da plataforma e prevenir fraudes</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-success mt-1">✓</span>
                      <span>Fornecer suporte técnico quando solicitado</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Section: Compartilhamento */}
          <section id="compartilhamento">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-6 h-6 text-primary" />
                  C) Compartilhamento de Dados
                </CardTitle>
                <CardDescription>Com quem compartilhamos suas informações</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <p className="font-semibold text-destructive flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    NÃO vendemos suas informações pessoais para terceiros
                  </p>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold">🔒 Compartilhamos dados APENAS com:</h4>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong>Supabase</strong> (armazenamento seguro de dados)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong>OneSignal</strong> (envio de notificações push)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong>Serviços de análise</strong> para melhorias (dados anonimizados)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong>Seu personal trainer</strong> (apenas se você contratar plano personalizado)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong>Autoridades legais</strong> (apenas quando exigido por lei)</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Section: Segurança */}
          <section id="seguranca">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-6 h-6 text-primary" />
                  D) Segurança dos Dados
                </CardTitle>
                <CardDescription>Como protegemos suas informações</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-semibold">🛡️ Medidas de segurança:</h4>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-success mt-1">✓</span>
                      <span>Criptografia SSL/TLS para todas as comunicações</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-success mt-1">✓</span>
                      <span>Armazenamento em servidores seguros com monitoramento 24/7</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-success mt-1">✓</span>
                      <span>Autenticação de dois fatores (quando disponível)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-success mt-1">✓</span>
                      <span>Backups automáticos para prevenir perda de dados</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-success mt-1">✓</span>
                      <span>Acesso restrito aos dados apenas para equipe autorizada</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-success mt-1">✓</span>
                      <span>Auditorias de segurança regulares</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Section: Direitos LGPD */}
          <section id="direitos">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-6 h-6 text-primary" />
                  E) Seus Direitos (LGPD/GDPR)
                </CardTitle>
                <CardDescription>Seus direitos sobre seus dados pessoais</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-semibold">✅ Você tem direito a:</h4>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Acessar todos os dados que temos sobre você</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Corrigir informações incorretas ou desatualizadas</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Solicitar a exclusão completa dos seus dados</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Exportar seus dados em formato legível (JSON/PDF)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Revogar consentimento para uso de dados a qualquer momento</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Optar por não receber notificações e emails de marketing</span>
                    </li>
                  </ul>
                </div>
                <Separator />
                <div className="bg-info/10 border border-info/20 rounded-lg p-4 space-y-2">
                  <p className="font-semibold text-info">Para exercer esses direitos:</p>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-info" />
                      Email: <a href="mailto:contato@atlontech.com" className="text-info hover:underline">contato@atlontech.com</a>
                    </p>
                    <p className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-info" />
                      Prazo de resposta: até 15 dias úteis
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Section: Retenção de Dados */}
          <section id="retencao">
            <Card>
              <CardHeader>
                <CardTitle>F) Retenção de Dados</CardTitle>
                <CardDescription>Por quanto tempo guardamos suas informações</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span><strong>Dados da conta:</strong> enquanto sua conta estiver ativa</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span><strong>Histórico de treinos:</strong> até 5 anos após inatividade</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span><strong>Dados de backup:</strong> 90 dias após exclusão da conta</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span><strong>Após exclusão:</strong> dados são anonimizados permanentemente</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </section>

          {/* Section: Contato */}
          <section id="contato">
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-6 h-6 text-primary" />
                  J) Contato
                </CardTitle>
                <CardDescription>Dúvidas sobre privacidade?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-card border rounded-lg">
                    <Mail className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <a href="mailto:contato@atlontech.com" className="text-sm text-primary hover:underline">
                        contato@atlontech.com
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-card border rounded-lg">
                    <Headphones className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Telefone</p>
                      <a href="tel:+5549920006034" className="text-sm text-primary hover:underline">
                        +55 49 92000-6034
                      </a>
                    </div>
                  </div>
                </div>
                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">
                    <strong>Website:</strong>{" "}
                    <a href="https://seu-dominio.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      https://seu-dominio.com
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Back to Top */}
        <div className="mt-8 text-center">
          <a
            href="#"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            ↑ Voltar ao topo
          </a>
        </div>
      </div>
    </PublicLayout>
  );
}
