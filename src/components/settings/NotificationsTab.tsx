import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useUnifiedSettings } from "@/hooks/useUnifiedSettings"
import { Loader2 } from "lucide-react"

export function NotificationsTab() {
  const { notifications, loading, saveNotificationSettings } = useUnifiedSettings()

  const handleToggle = async (key: keyof typeof notifications, value: boolean) => {
    await saveNotificationSettings({
      ...notifications,
      [key]: value
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const notificationOptions = [
    {
      key: 'email' as const,
      label: 'Notificações por Email',
      description: 'Receber notificações importantes por email'
    },
    {
      key: 'achievements' as const,
      label: 'Conquistas',
      description: 'Receber notificações sobre conquistas e níveis'
    },
    {
      key: 'workout_reminders' as const,
      label: 'Lembretes de Treino',
      description: 'Receber lembretes sobre treinos agendados'
    },
    {
      key: 'teacher_messages' as const,
      label: 'Mensagens do Professor',
      description: 'Receber notificações de mensagens dos professores'
    },
    {
      key: 'sms' as const,
      label: 'SMS',
      description: 'Receber lembretes por mensagem de texto'
    },
    {
      key: 'push' as const,
      label: 'Notificações Push',
      description: 'Receber notificações no navegador'
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações de Notificação</CardTitle>
        <CardDescription>
          Escolha como deseja receber notificações
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        {notificationOptions.map((option) => (
          <div
            key={option.key}
            className="flex items-start sm:items-center justify-between gap-3 sm:gap-4 py-3 sm:py-4 border-b last:border-0"
          >
            <div className="flex-1 space-y-1 min-w-0 pr-2">
              <Label 
                htmlFor={option.key} 
                className="font-medium cursor-pointer text-sm sm:text-base block"
              >
                {option.label}
              </Label>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {option.description}
              </p>
            </div>
            <Switch
              id={option.key}
              checked={notifications[option.key]}
              onCheckedChange={(checked) => handleToggle(option.key, checked)}
              className="flex-shrink-0"
            />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
