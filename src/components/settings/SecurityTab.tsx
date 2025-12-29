import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Smartphone, Monitor, AlertTriangle, Shield } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { use2FA } from "@/hooks/use2FA"

export function SecurityTab() {
  const { toast } = useToast()
  const { mfaSettings, loading: mfaLoading, enable2FA, disable2FA } = use2FA()
  const [changingPassword, setChangingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showMFASetup, setShowMFASetup] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState("")

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos",
        variant: "destructive"
      })
      return
    }

    if (newPassword.length < 8) {
      toast({
        title: "Erro",
        description: "A senha deve ter no mínimo 8 caracteres",
        variant: "destructive"
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive"
      })
      return
    }

    setChangingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      toast({
        title: "Sucesso",
        description: "Senha alterada com sucesso!"
      })
      setNewPassword("")
      setConfirmPassword("")
    } catch (error: any) {
      console.error('Error changing password:', error)
      toast({
        title: "Erro",
        description: error.message || "Falha ao alterar senha",
        variant: "destructive"
      })
    } finally {
      setChangingPassword(false)
    }
  }

  const handleEnable2FA = async () => {
    if (!phoneNumber) {
      toast({
        title: "Erro",
        description: "Digite um número de telefone",
        variant: "destructive"
      })
      return
    }

    try {
      await enable2FA(phoneNumber)
      setShowMFASetup(false)
      setPhoneNumber("")
    } catch (error) {
      // Error already handled by the hook
    }
  }

  const handleDisable2FA = async () => {
    try {
      await disable2FA()
    } catch (error) {
      // Error already handled by the hook
    }
  }

  const handleRevokeAllSessions = async () => {
    try {
      await supabase.auth.signOut({ scope: 'others' })
      toast({
        title: "Sucesso",
        description: "Todas as outras sessões foram encerradas"
      })
    } catch (error) {
      console.error('Error revoking sessions:', error)
      toast({
        title: "Erro",
        description: "Falha ao encerrar sessões",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Alterar Senha</CardTitle>
          <CardDescription>
            Escolha uma senha forte para proteger sua conta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-sm font-medium">Nova Senha</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="min-h-[44px] text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-sm font-medium">Confirmar Nova Senha</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Digite a mesma senha"
              className="min-h-[44px] text-base"
            />
          </div>

          <Button 
            onClick={handleChangePassword} 
            disabled={changingPassword}
            className="w-full sm:w-auto min-h-[44px]"
          >
            {changingPassword ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Alterando...
              </>
            ) : (
              'Alterar Senha'
            )}
          </Button>

          <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-3 pt-3 sm:pt-4 border-t">
            <AlertTriangle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Recomendação de segurança</p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Por segurança, recomendamos encerrar sessões ativas em outros dispositivos após trocar a senha.
              </p>
              <Button
                variant="link"
                className="h-auto p-0 text-xs sm:text-sm mt-2"
                onClick={handleRevokeAllSessions}
              >
                🔗 Encerrar sessões em outros dispositivos
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Autenticação de Dois Fatores</CardTitle>
          <CardDescription>
            Adicione uma camada extra de segurança à sua conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mfaLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : mfaSettings?.is_enabled ? (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border border-success bg-success/5">
                <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-success mt-1 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm sm:text-base text-success-foreground">2FA Ativado</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">
                    Seu telefone: {mfaSettings.phone_number}
                  </p>
                </div>
              </div>
              <Button variant="destructive" onClick={handleDisable2FA} className="min-h-[44px]">
                Desativar 2FA
              </Button>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border border-border">
                <Smartphone className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground mt-1 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm sm:text-base">☐ 2FA por SMS</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Adicione uma camada extra de segurança
                  </p>
                </div>
              </div>

              {showMFASetup ? (
                <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 rounded-lg border border-border">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium">Número de Telefone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="(00) 00000-0000"
                      className="min-h-[44px] text-base"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button onClick={handleEnable2FA} className="min-h-[44px]">
                      Ativar 2FA
                    </Button>
                    <Button variant="outline" onClick={() => setShowMFASetup(false)} className="min-h-[44px]">
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button onClick={() => setShowMFASetup(true)} className="min-h-[44px]">
                  Ativar
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sessões Ativas</CardTitle>
          <CardDescription>
            Gerencie os dispositivos conectados à sua conta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button variant="outline" size="sm" className="flex-1 sm:flex-none min-h-[40px]">
                ⚡ Ver Atividade
              </Button>
              <Button variant="destructive" size="sm" onClick={handleRevokeAllSessions} className="flex-1 sm:flex-none min-h-[40px]">
                🗑️ Revogar Todas
              </Button>
            </div>
          </div>

          <div className="border rounded-lg p-3 sm:p-4">
            <div className="flex items-start gap-3 sm:gap-4">
              <Monitor className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm sm:text-base">Sessão Atual</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Desktop • Chrome</p>
                <p className="text-xs text-muted-foreground mt-1">Ativo agora</p>
              </div>
              <Badge variant="secondary" className="flex-shrink-0">Atual</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
