import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useGlobalPaymentSettings } from "@/hooks/useGlobalPaymentSettings"
import { CreditCard, ExternalLink, CheckCircle2, XCircle } from "lucide-react"
import { Link } from "react-router-dom"
import { Loader2 } from "lucide-react"

export function PaymentsTab() {
  const { settings, loading } = useGlobalPaymentSettings()

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const credentials = settings?.credentials as any
  const hasValidToken = credentials?.access_token && credentials.access_token.trim() !== ''
  const isActive = settings?.is_active && hasValidToken
  const isSandbox = credentials?.is_sandbox

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Configuração de Pagamentos</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Configure sua integração com o Mercado Pago para receber pagamentos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          {isActive && (
            <div className="rounded-lg bg-success/10 border border-success/20 p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm sm:text-base text-success-foreground">Gateway Ativo: Mercado Pago</p>
                  <p className="text-xs sm:text-sm text-success-foreground/80">
                    Funcionando em modo {isSandbox ? 'Teste' : 'Produção'}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Badge variant="default" className="bg-success text-xs">✓ Ativo</Badge>
                  <Badge variant={isSandbox ? "secondary" : "default"} className="text-xs">
                    {isSandbox ? '🔒 Teste' : '🔒 Produção'}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {!isActive && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm sm:text-base text-destructive-foreground">Sistema de Pagamento Inativo</p>
                  <p className="text-xs sm:text-sm text-destructive-foreground/80">
                    Configure as credenciais do Mercado Pago para ativar
                  </p>
                </div>
              </div>
            </div>
          )}

          <Card className="border-border">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="rounded-lg bg-primary/10 p-2 sm:p-3 flex-shrink-0">
                  <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold mb-1 text-sm sm:text-base">Mercado Pago</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Gateway de pagamento líder da América Latina
                  </p>
                  {hasValidToken && (
                    <div className="mt-2 sm:mt-3 space-y-1.5 sm:space-y-2">
                      <div className="text-xs sm:text-sm">
                        <span className="font-medium">Token:</span>
                        <span className="ml-2 text-muted-foreground break-all">
                          {credentials.access_token.substring(0, 15)}...
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm">
                        <span className="font-medium">Modo:</span>
                        <span className="ml-2 text-muted-foreground">
                          {isSandbox ? 'Teste (Sandbox)' : 'Produção'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="border-t pt-4 sm:pt-6">
            <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Ações Rápidas</h3>
            <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2">
              <Link to="/admin/payment-config">
                <Button variant="outline" className="w-full justify-between min-h-[44px] text-sm">
                  <span>Configurar Credenciais</span>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/admin/payment-methods">
                <Button variant="outline" className="w-full justify-between min-h-[44px] text-sm">
                  <span>Gerenciar Métodos</span>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
