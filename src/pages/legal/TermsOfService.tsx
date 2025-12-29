import { PublicLayout } from "@/components/layout/PublicLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FileText, CheckCircle2, XCircle, AlertTriangle, Scale, CreditCard, Shield, Mail, Calendar } from "lucide-react";

export default function TermsOfService() {
  const lastUpdate = "16 de Janeiro de 2025";
  const version = "v1.0";

  return (
    <PublicLayout>
      <div className="container max-w-5xl px-4 md:px-6 py-12">
        {/* Header */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gradient">Termos de Uso</h1>
              <p className="text-muted-foreground mt-1">Prass Trainer</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Última atualização: {lastUpdate}
            </span>
            <span className="px-2 py-1 bg-primary/10 text-primary rounded-md font-medium">
              {version}
            </span>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-8">
          {/* Section: Aceitação */}
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-success" />
                  A) Aceitação dos Termos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  📜 Ao usar o <strong className="text-foreground">Prass Trainer</strong>, você concorda com:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-success mt-1">✓</span>
                    <span>Estes Termos de Uso</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-success mt-1">✓</span>
                    <span>Nossa Política de Privacidade</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-success mt-1">✓</span>
                    <span>Leis brasileiras aplicáveis (Lei nº 13.709/2018 - LGPD)</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </section>

          {/* Section: Descrição do Serviço */}
          <section>
            <Card>
              <CardHeader>
                <CardTitle>B) Descrição do Serviço</CardTitle>
                <CardDescription>O que o Prass Trainer oferece</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  💪 O <strong className="text-foreground">Prass Trainer</strong> é um aplicativo de fitness que oferece:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Planos de treino personalizados</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Acompanhamento de progresso físico</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Orientações nutricionais</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Coach virtual com inteligência artificial</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Comunidade de usuários</span>
                  </li>
                </ul>
                <Separator />
                <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                  <p className="font-semibold text-warning flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5" />
                    IMPORTANTE: O Prass Trainer NÃO substitui:
                  </p>
                  <ul className="space-y-1 text-sm text-muted-foreground ml-7">
                    <li>• Consultas médicas</li>
                    <li>• Orientação de nutricionista</li>
                    <li>• Acompanhamento de personal trainer profissional</li>
                    <li>• Tratamento médico para condições de saúde</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Section: Elegibilidade */}
          <section>
            <Card>
              <CardHeader>
                <CardTitle>C) Elegibilidade</CardTitle>
                <CardDescription>Requisitos para usar o aplicativo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">👤 Para usar o app, você deve:</p>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-success mt-1">✓</span>
                    <span>Ter pelo menos 18 anos de idade</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-success mt-1">✓</span>
                    <span>Ou ter autorização dos pais/responsáveis (13-17 anos)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-success mt-1">✓</span>
                    <span>Fornecer informações verdadeiras e atualizadas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-success mt-1">✓</span>
                    <span>Estar apto fisicamente para praticar exercícios</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </section>

          {/* Section: Uso Aceitável */}
          <section>
            <Card>
              <CardHeader>
                <CardTitle>E) Uso Aceitável</CardTitle>
                <CardDescription>O que você pode e não pode fazer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    ✅ Você PODE:
                  </h4>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-success mt-1">✓</span>
                      <span>Usar o app para fins de fitness pessoal</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-success mt-1">✓</span>
                      <span>Compartilhar seu progresso nas redes sociais</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-success mt-1">✓</span>
                      <span>Interagir respeitosamente com outros usuários</span>
                    </li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-destructive" />
                    ❌ Você NÃO PODE:
                  </h4>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-destructive mt-1">×</span>
                      <span>Usar o app para fins comerciais sem autorização</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-destructive mt-1">×</span>
                      <span>Compartilhar conteúdo ofensivo, discriminatório ou ilegal</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-destructive mt-1">×</span>
                      <span>Tentar hackear ou comprometer a segurança do sistema</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-destructive mt-1">×</span>
                      <span>Criar contas falsas ou automatizadas (bots)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-destructive mt-1">×</span>
                      <span>Copiar, redistribuir ou revender nosso conteúdo</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Section: Isenção de Responsabilidade */}
          <section>
            <Card className="border-warning/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6 text-warning" />
                  F) Isenção de Responsabilidade
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 space-y-2">
                  <p className="font-semibold text-warning">⚠️ Avisos importantes:</p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Consulte um médico antes de iniciar qualquer programa de exercícios</li>
                    <li>• Não somos responsáveis por lesões causadas por uso inadequado</li>
                    <li>• Resultados podem variar de pessoa para pessoa</li>
                    <li>• O Coach IA fornece sugestões, não prescrições médicas</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Section: Modelo de Acesso (Apple 3.1.1 Compliant) */}
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-6 h-6 text-primary" />
                  H) Modelo de Acesso
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">📱 Sobre seu acesso:</p>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>O acesso ao Prass Trainer é gerenciado pelo seu personal trainer</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Para dúvidas sobre seu acesso, entre em contato com seu treinador</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Recursos disponíveis variam conforme configuração do treinador</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </section>

          {/* Section: Lei Aplicável */}
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="w-6 h-6 text-primary" />
                  K) Lei Aplicável
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">⚖️ Jurisdição:</p>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Estes termos são regidos pelas leis do Brasil</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Disputas serão resolvidas conforme legislação brasileira</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Lei Geral de Proteção de Dados (LGPD) - Lei nº 13.709/2018</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </section>

          {/* Section: Contato */}
          <section>
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-6 h-6 text-primary" />
                  L) Contato
                </CardTitle>
                <CardDescription>Dúvidas sobre os termos?</CardDescription>
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
                    <Shield className="w-5 h-5 text-primary" />
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
