import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileTab } from "@/components/settings/ProfileTab"
import { PublicProfileTab } from "@/components/settings/PublicProfileTab"
import { TrainingLocationsTab } from "@/components/settings/TrainingLocationsTab"
import { NotificationsTab } from "@/components/settings/NotificationsTab"
import { PaymentsTab } from "@/components/settings/PaymentsTab"
import { SecurityTab } from "@/components/settings/SecurityTab"

interface ConfiguracoesSectionProps {
  initialTab?: string
}

export default function ConfiguracoesSection({ initialTab = "perfil" }: ConfiguracoesSectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-2">
          Gerencie suas informações pessoais, preferências e configurações do sistema
        </p>
      </div>

      <Tabs defaultValue={initialTab} className="w-full">
        <TabsList className="w-full grid grid-cols-2 sm:grid-cols-3 md:flex md:justify-start gap-1 sm:gap-2 bg-muted/50 p-1.5 sm:p-2">
          <TabsTrigger value="perfil" className="text-xs sm:text-sm px-2 sm:px-3 py-2 min-w-0">
            Perfil
          </TabsTrigger>
          <TabsTrigger value="perfil-publico" className="text-xs sm:text-sm px-2 sm:px-3 py-2 min-w-0">
            <span className="hidden sm:inline">Perfil Público</span>
            <span className="sm:hidden">Público</span>
          </TabsTrigger>
          <TabsTrigger value="locais" className="text-xs sm:text-sm px-2 sm:px-3 py-2 min-w-0">
            <span className="hidden sm:inline">Locais de Treino</span>
            <span className="sm:hidden">Locais</span>
          </TabsTrigger>
          <TabsTrigger value="notificacoes" className="text-xs sm:text-sm px-2 sm:px-3 py-2 min-w-0">
            <span className="hidden sm:inline">Notificações</span>
            <span className="sm:hidden">Notif.</span>
          </TabsTrigger>
          <TabsTrigger value="pagamentos" className="text-xs sm:text-sm px-2 sm:px-3 py-2 min-w-0">
            Pagamentos
          </TabsTrigger>
          <TabsTrigger value="seguranca" className="text-xs sm:text-sm px-2 sm:px-3 py-2 min-w-0">
            Segurança
          </TabsTrigger>
        </TabsList>

        <TabsContent value="perfil" className="mt-6">
          <ProfileTab />
        </TabsContent>

        <TabsContent value="perfil-publico" className="mt-6">
          <PublicProfileTab />
        </TabsContent>

        <TabsContent value="locais" className="mt-6">
          <TrainingLocationsTab />
        </TabsContent>

        <TabsContent value="notificacoes" className="mt-6">
          <NotificationsTab />
        </TabsContent>

        <TabsContent value="pagamentos" className="mt-6">
          <PaymentsTab />
        </TabsContent>

        <TabsContent value="seguranca" className="mt-6">
          <SecurityTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
