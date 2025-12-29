import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PaymentHealthDashboard } from "./PaymentHealthDashboard"
import { MercadoPagoAdminDashboard } from "./MercadoPagoAdminDashboard"
import { ManualChargeCreator } from "./ManualChargeCreator"
import { ManualChargesDashboard } from "./ManualChargesDashboard"
import { AlertCircle, CheckCircle, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"

interface SimplePlan {
  id: string
  name: string
  price: number
  description: string | null
}

interface SimpleStudent {
  id: string
  name: string
  email: string
  phone: string
}

export function PaymentSystemManager() {
  const navigate = useNavigate()
  const [teacherId, setTeacherId] = useState('')
  const [students, setStudents] = useState<SimpleStudent[]>([])
  const [plans, setPlans] = useState<SimplePlan[]>([])

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setTeacherId(user.id)

        // Load students
        const { data: studentData } = await supabase
          .from('students')
          .select('user_id')
          .eq('teacher_id', user.id) as any
        
        if (studentData) {
          const studentIds = studentData.map((x: any) => x.user_id)
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, name, email, phone')
            .in('id', studentIds) as any
          
          if (profileData) {
            setStudents(profileData.map((p: any) => ({ 
              id: p.id, 
              name: p.name || '', 
              email: p.email || '', 
              phone: p.phone || '' 
            })))
          }
        }

        // Load plans - temporariamente desabilitado devido a problemas de tipo
        // TODO: Re-enable quando os tipos do Supabase forem corrigidos
        setPlans([])
      } catch (error) {
        console.error('Error loading data:', error)
      }
    }
    load()
  }, [])
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sistema de Pagamentos</h1>
        <p className="text-muted-foreground">
          Monitore transações e acompanhe a saúde do sistema
        </p>
      </div>

      <Card className="border-success bg-success/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-success">
            <CheckCircle className="h-5 w-5" />
            Sistema Centralizado Ativo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-success/10 text-success border-success/20">
              Mercado Pago
            </Badge>
            <Badge variant="outline">Configuração Global</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            O sistema de pagamentos está configurado globalmente pelo administrador. 
            Todos os professores utilizam a mesma configuração, garantindo segurança e facilidade de manutenção.
          </p>
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/admin/payment-config')}
            >
              <Settings className="h-4 w-4 mr-2" />
              Configurações Globais
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/plans')}
            >
              Criar Planos
            </Button>
          </div>
        </CardContent>
      </Card>

      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Configuração Centralizada</AlertTitle>
        <AlertDescription>
          O sistema de pagamentos é configurado globalmente. Não é mais necessário configurar individualmente por professor.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="health" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="health">Saúde do Sistema</TabsTrigger>
          <TabsTrigger value="charges">Cobranças Manuais</TabsTrigger>
          <TabsTrigger value="admin">Administração</TabsTrigger>
        </TabsList>
        
        <TabsContent value="health" className="space-y-6">
          <PaymentHealthDashboard />
        </TabsContent>

        <TabsContent value="charges" className="space-y-6">
          <Tabs defaultValue="create">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Criar Cobrança</TabsTrigger>
              <TabsTrigger value="manage">Gerenciar Cobranças</TabsTrigger>
            </TabsList>
            <TabsContent value="create" className="mt-6">
              <ManualChargeCreator 
                students={students} 
                plans={plans} 
                onChargeCreated={() => {}} 
              />
            </TabsContent>
            <TabsContent value="manage" className="mt-6">
              <ManualChargesDashboard teacherId={teacherId} />
            </TabsContent>
          </Tabs>
        </TabsContent>
        
        <TabsContent value="admin" className="space-y-6">
          <MercadoPagoAdminDashboard />
        </TabsContent>
      </Tabs>
    </div>
  )
}
