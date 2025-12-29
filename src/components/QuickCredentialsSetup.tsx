import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Zap, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface QuickCredentialsSetupProps {
  onCredentialsExtracted: (credentials: {
    access_token: string
    public_key?: string
    is_sandbox: boolean
  }) => void
}

export function QuickCredentialsSetup({ onCredentialsExtracted }: QuickCredentialsSetupProps) {
  const [rawInput, setRawInput] = useState('')
  const [error, setError] = useState('')

  const parseCredentials = () => {
    setError('')

    if (!rawInput.trim()) {
      setError('Cole suas credenciais do Mercado Pago')
      return
    }

    try {
      // Try parsing as JSON first
      const jsonData = JSON.parse(rawInput)
      
      const credentials = {
        access_token: jsonData.access_token || jsonData.accessToken || '',
        public_key: jsonData.public_key || jsonData.publicKey || '',
        is_sandbox: jsonData.is_sandbox || jsonData.isSandbox || jsonData.sandbox || false
      }

      if (!credentials.access_token) {
        setError('Access Token não encontrado no JSON')
        return
      }

      onCredentialsExtracted(credentials)
      setRawInput('')
      return
    } catch {
      // Not JSON, try text parsing
      const lines = rawInput.split('\n')
      let access_token = ''
      let public_key = ''
      let is_sandbox = false

      for (const line of lines) {
        const lower = line.toLowerCase()
        
        // Look for access token patterns
        if (lower.includes('access') && lower.includes('token')) {
          const match = line.match(/APP_USR-[a-zA-Z0-9-]+/)
          if (match) access_token = match[0]
        }
        
        // Look for public key patterns
        if (lower.includes('public') && lower.includes('key')) {
          const match = line.match(/APP_USR-[a-zA-Z0-9-]+/)
          if (match) public_key = match[0]
        }

        // Look for sandbox indicators
        if (lower.includes('sandbox') || lower.includes('test')) {
          is_sandbox = true
        }

        // Direct token patterns
        if (line.trim().startsWith('APP_USR-')) {
          if (!access_token) {
            access_token = line.trim()
          } else if (!public_key) {
            public_key = line.trim()
          }
        }
      }

      if (!access_token) {
        setError('Access Token não encontrado. Cole no formato: APP_USR-...')
        return
      }

      onCredentialsExtracted({
        access_token,
        public_key,
        is_sandbox
      })
      setRawInput('')
    }
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <CardTitle>Quick Setup</CardTitle>
        </div>
        <CardDescription>
          Cole todas as credenciais de uma vez (JSON, texto ou chaves diretas)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder={`Cole aqui:
          
Formato JSON:
{
  "access_token": "APP_USR-...",
  "public_key": "APP_USR-...",
  "sandbox": false
}

Ou formato texto:
Access Token: APP_USR-...
Public Key: APP_USR-...
Ambiente: Produção

Ou apenas as chaves:
APP_USR-...
APP_USR-...`}
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          className="min-h-[200px] font-mono text-sm"
        />

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button onClick={parseCredentials} className="w-full" variant="default">
          <Zap className="mr-2 h-4 w-4" />
          Extrair Credenciais
        </Button>
      </CardContent>
    </Card>
  )
}
