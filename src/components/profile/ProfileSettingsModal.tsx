import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useOptimizedProfile } from '@/hooks/useOptimizedProfile'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { Loader2, User, LogOut } from 'lucide-react'

interface ProfileSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProfileSettingsModal({ open, onOpenChange }: ProfileSettingsModalProps) {
  const { profile, updateProfile, loading } = useOptimizedProfile()
  const { signOut } = useAuth()
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [phone, setPhone] = useState('')
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (profile) {
      setName(profile.name || '')
      setRole(profile.role || '')
      setPhone(profile.phone || '')
    }
  }, [profile])

  const handleSave = async () => {
    if (!name) return

    try {
      setUpdating(true)

      const updates: any = {
        name,
        phone: phone || undefined
      }

      // Se a profissão ainda não foi definida, permite definir uma vez
      if (!profile?.role_set_once && role) {
        updates.role = role
        updates.role_set_once = true
      }

      await updateProfile(updates)

      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso!",
      })

      onOpenChange(false)
    } catch (error) {
      console.error('Update profile error:', error)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o perfil.",
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      onOpenChange(false)
    } catch (error) {
      // Error handled by hook
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
            <User className="w-4 h-4 sm:w-5 sm:h-5" />
            Configurações do Perfil
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome completo"
              disabled={loading || updating}
              className="min-h-11 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={profile?.email || ''}
              disabled
              className="opacity-50"
            />
            <p className="text-xs text-muted-foreground">
              O email não pode ser alterado
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Profissão</Label>
            {profile?.role_set_once ? (
              <div className="flex items-center gap-2">
                <Input
                  value={profile.role || ''}
                  disabled
                  className="bg-muted opacity-70"
                />
                <span className="text-xs text-muted-foreground">
                  (Definida permanentemente)
                </span>
              </div>
            ) : (
              <Select value={role} onValueChange={setRole} disabled={loading || updating}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione sua profissão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Personal Trainer">Personal Trainer</SelectItem>
                  <SelectItem value="Nutricionista">Nutricionista</SelectItem>
                  <SelectItem value="Fisioterapeuta">Fisioterapeuta</SelectItem>
                  <SelectItem value="Coach">Coach</SelectItem>
                  <SelectItem value="Educador Físico">Educador Físico</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
              disabled={loading || updating}
              className="min-h-11 text-base"
            />
          </div>

          <Separator />

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={handleSave}
              disabled={loading || updating || !name || (!role && !profile?.role_set_once)}
              className="flex-1 min-h-11 text-sm sm:text-base"
            >
              {updating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleSignOut}
              className="flex items-center justify-center gap-2 min-h-11 text-sm sm:text-base"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden xs:inline">Sair</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}