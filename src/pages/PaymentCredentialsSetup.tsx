import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Loader2, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react'
import { QuickCredentialsSetup } from '@/components/QuickCredentialsSetup'
import { useNavigate } from 'react-router-dom'

export default function PaymentCredentialsSetup() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  
  const [formData, setFormData] = useState({
    access_token: '',
    public_key: '',
    is_sandbox: false,
    is_active: true
  })

  useEffect(() => {
    checkAuth()
    loadExistingConfig()
  }, [])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    console.log('🔐 Auth Check:', session ? 'Logged in' : 'Not logged in')
    setIsAuthenticated(!!session)
    
    if (!session) {
      toast({
        title: "Acesso Negado",
        description: "Você precisa estar logado para configurar credenciais",
        variant: "destructive"
      })
    }
  }

  const loadExistingConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('system_payment_config')
        .select('*')
        .eq('gateway_type', 'mercadopago')
        .single()

      if (data && !error) {
        console.log('📦 Existing config loaded:', data)
        const credentials = data.credentials as any
        setFormData({
          access_token: credentials?.access_token || '',
          public_key: credentials?.public_key || '',
          is_sandbox: credentials?.is_sandbox || false,
          is_active: data.is_active || false
        })
      }
    } catch (error) {
      console.log('ℹ️ No existing config found')
    }
  }

  const testCredentials = async () => {
    if (!formData.access_token) {
      toast({
        title: "Campo obrigatório",
        description: "Access Token é obrigatório",
        variant: "destructive"
      })
      return
    }

    setTesting(true)
    setTestResult(null)

    try {
      const response = await fetch('https://api.mercadopago.com/v1/account/settings', {
        headers: {
          'Authorization': `Bearer ${formData.access_token}`
        }
      })

      if (response.ok) {
        setTestResult('success')
        toast({
          title: "✅ Credenciais Válidas",
          description: "Access Token testado com sucesso!"
        })
      } else {
        setTestResult('error')
        toast({
          title: "❌ Credenciais Inválidas",
          description: "Não foi possível validar o Access Token",
          variant: "destructive"
        })
      }
    } catch (error) {
      setTestResult('error')
      toast({
        title: "Erro no teste",
        description: "Não foi possível testar as credenciais",
        variant: "destructive"
      })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    if (!formData.access_token) {
      toast({
        title: "Campo obrigatório",
        description: "Access Token é obrigatório",
        variant: "destructive"
      })
      return
    }

    setLoading(true)

    try {
      console.log('💾 Saving config...', {
        gateway_type: 'mercadopago',
        is_active: formData.is_active
      })

      const { data, error } = await supabase
        .from('system_payment_config')
        .upsert({
          gateway_type: 'mercadopago',
          credentials: {
            access_token: formData.access_token,
            public_key: formData.public_key || null,
            is_sandbox: formData.is_sandbox
          },
          is_active: formData.is_active,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'gateway_type'
        })
        .select()
        .single()

      if (error) {
        console.error('❌ Save error:', error)
        throw error
      }

      console.log('✅ Config saved successfully:', data)

      toast({
        title: "✅ Configuração Salva!",
        description: "Credenciais do Mercado Pago foram salvas com sucesso"
      })

      // Refresh the page to load new config
      setTimeout(() => {
        window.location.reload()
      }, 1500)

    } catch (error: any) {
      console.error('❌ Error saving config:', error)
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar as configurações",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleQuickSetup = (credentials: any) => {
    console.log('⚡ Quick setup data received:', credentials)
    setFormData({
      access_token: credentials.access_token || '',
      public_key: credentials.public_key || '',
      is_sandbox: credentials.is_sandbox || false,
      is_active: true
    })
    toast({
      title: "Credenciais Carregadas",
      description: "Revise os dados e clique em Salvar"
    })
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acesso Restrito</CardTitle>
            <CardDescription>Você precisa estar logado</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button onClick={() => navigate('/')} variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Configuração de Pagamentos</h1>
            <p className="text-muted-foreground">Configure as credenciais do Mercado Pago</p>
          </div>
        </div>

        {/* Quick Setup */}
        <QuickCredentialsSetup onCredentialsExtracted={handleQuickSetup} />

        {/* Manual Form */}
        <Card>
          <CardHeader>
            <CardTitle>Configuração Manual</CardTitle>
            <CardDescription>Preencha os campos abaixo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="access_token">
                Access Token <span className="text-destructive">*</span>
              </Label>
              <Input
                id="access_token"
                type="password"
                placeholder="APP_USR-..."
                value={formData.access_token}
                onChange={(e) => setFormData({ ...formData, access_token: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="public_key">Public Key (opcional)</Label>
              <Input
                id="public_key"
                placeholder="APP_USR-..."
                value={formData.public_key}
                onChange={(e) => setFormData({ ...formData, public_key: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_sandbox">Modo Sandbox (testes)</Label>
              <Switch
                id="is_sandbox"
                checked={formData.is_sandbox}
                onCheckedChange={(checked) => setFormData({ ...formData, is_sandbox: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Sistema Ativo</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            {/* Test Result */}
            {testResult && (
              <div className={`flex items-center gap-2 p-3 rounded-lg ${
                testResult === 'success' ? 'bg-green-500/10 text-green-600' : 'bg-destructive/10 text-destructive'
              }`}>
                {testResult === 'success' ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <XCircle className="h-5 w-5" />
                )}
                <span className="font-medium">
                  {testResult === 'success' ? 'Credenciais válidas!' : 'Credenciais inválidas'}
                </span>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={testCredentials}
                disabled={testing || !formData.access_token}
                variant="outline"
                className="flex-1"
              >
                {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Testar Credenciais
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading || !formData.access_token}
                className="flex-1"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Configuração
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
