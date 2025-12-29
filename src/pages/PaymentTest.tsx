import { PaymentDiagnostics } from '@/components/payments/PaymentDiagnostics'
import { PaymentSystemMonitor } from '@/components/payments/PaymentSystemMonitor'
import { PaymentConfigDiagnostic } from '@/components/payments/PaymentConfigDiagnostic'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function PaymentTest() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Sistema de Pagamentos - Teste e Diagnóstico</h1>
        <p className="text-muted-foreground mt-2">
          Ferramentas para testar e diagnosticar o sistema de pagamentos
        </p>
      </div>

      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="config">Configuração</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnóstico</TabsTrigger>
          <TabsTrigger value="monitor">Monitor</TabsTrigger>
        </TabsList>
        
        <TabsContent value="config" className="space-y-6">
          <PaymentConfigDiagnostic />
        </TabsContent>
        
        <TabsContent value="diagnostics" className="space-y-6">
          <PaymentDiagnostics />
        </TabsContent>
        
        <TabsContent value="monitor" className="space-y-6">
          <PaymentSystemMonitor />
        </TabsContent>
      </Tabs>
    </div>
  )
}