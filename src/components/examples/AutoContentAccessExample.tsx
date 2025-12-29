import React from 'react'
import { ContentProtection } from '@/components/common/ContentProtection'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Video, FileText } from 'lucide-react'

// Exemplo de como usar o sistema completo de liberação automática
export function AutoContentAccessExample() {
  return (
    <div className="space-y-6 p-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">🚀 Sistema de Liberação Automática</h1>
        <p className="text-muted-foreground">
          Conteúdo liberado automaticamente após pagamento confirmado
        </p>
      </div>

      {/* Curso Premium - Requer Compra */}
      <ContentProtection
        contentType="course"
        contentId="course-123"
        requiresPurchase={true}
        price={197}
        currency="BRL"
        title="Curso de Nutrição Avançada"
        description="Acesso completo ao curso com certificado"
        features={[
          "12 módulos de vídeo-aulas",
          "Material PDF complementar",
          "Exercícios práticos",
          "Certificado de conclusão",
          "Suporte direto com o professor"
        ]}
        previewContent={
          <Card className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              <span className="font-medium">Aula 1: Introdução</span>
              <Badge variant="secondary">Preview</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Nesta primeira aula você aprenderá os fundamentos da nutrição...
            </p>
          </Card>
        }
      >
        {/* Conteúdo completo do curso (só aparece após compra) */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">🎓 Curso Completo Liberado!</h2>
          <div className="grid gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Video className="h-5 w-5 text-green-500" />
                <span className="font-medium">Módulo 1: Fundamentos</span>
              </div>
              <p className="text-sm">Todos os vídeos e materiais disponíveis</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-blue-500" />
                <span className="font-medium">Materiais PDF</span>
              </div>
              <p className="text-sm">Downloads liberados automaticamente</p>
            </Card>
          </div>
        </div>
      </ContentProtection>

      {/* Plano de Assinatura */}
      <ContentProtection
        contentType="plan" 
        contentId="plan-premium"
        teacherId="teacher-123"
        requiresPurchase={true}
        price={97}
        currency="BRL"
        title="Plano Premium Mensal"
        description="Acesso completo a todos os conteúdos do professor"
        features={[
          "Acesso a todos os cursos",
          "Biblioteca de exercícios",
          "Planos nutricionais personalizados",
          "Chat direto com o professor",
          "Grupo VIP no WhatsApp"
        ]}
        previewContent={
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 opacity-50">
              <BookOpen className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-medium">Biblioteca de Exercícios</h3>
              <p className="text-sm text-muted-foreground">200+ exercícios</p>
            </Card>
            <Card className="p-4 opacity-50">
              <FileText className="h-8 w-8 text-blue-500 mb-2" />
              <h3 className="font-medium">Planos Nutricionais</h3>
              <p className="text-sm text-muted-foreground">Personalizados</p>
            </Card>
            <Card className="p-4 opacity-50">
              <Video className="h-8 w-8 text-green-500 mb-2" />
              <h3 className="font-medium">Cursos Premium</h3>
              <p className="text-sm text-muted-foreground">Acesso total</p>
            </Card>
          </div>
        }
      >
        {/* Conteúdo da assinatura (só aparece com plano ativo) */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">🌟 Assinatura Premium Ativa!</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 border-green-200">
              <BookOpen className="h-8 w-8 text-green-500 mb-2" />
              <h3 className="font-medium">Biblioteca Liberada</h3>
              <p className="text-sm">Acesso total aos exercícios</p>
            </Card>
            <Card className="p-4 border-blue-200">
              <FileText className="h-8 w-8 text-blue-500 mb-2" />
              <h3 className="font-medium">Planos Disponíveis</h3>
              <p className="text-sm">Crie planos personalizados</p>
            </Card>
            <Card className="p-4 border-purple-200">
              <Video className="h-8 w-8 text-purple-500 mb-2" />
              <h3 className="font-medium">Todos os Cursos</h3>
              <p className="text-sm">Biblioteca completa</p>
            </Card>
          </div>
        </div>
      </ContentProtection>

      {/* Fluxo Automático */}
      <Card className="p-6 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <h3 className="text-lg font-semibold mb-3">🔄 Fluxo Automático</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-2">1</div>
            <p className="font-medium">Pagamento</p>
            <p className="text-muted-foreground">Cliente efetua pagamento</p>
          </div>
          <div className="text-center">
            <div className="w-8 h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center mx-auto mb-2">2</div>
            <p className="font-medium">Webhook</p>
            <p className="text-muted-foreground">Sistema recebe confirmação</p>
          </div>
          <div className="text-center">
            <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center mx-auto mb-2">3</div>
            <p className="font-medium">Liberação</p>
            <p className="text-muted-foreground">Acesso liberado automaticamente</p>
          </div>
          <div className="text-center">
            <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-2">4</div>
            <p className="font-medium">Notificação</p>
            <p className="text-muted-foreground">Cliente recebe confirmação</p>
          </div>
        </div>
      </Card>
    </div>
  )
}