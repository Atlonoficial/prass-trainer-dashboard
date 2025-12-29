import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { Link, ExternalLink } from 'lucide-react'

interface ManualRecoveryProps {
  onSuccess?: () => void
}

export function ManualRecovery({ onSuccess }: ManualRecoveryProps) {
  const [, setSearchParams] = useSearchParams()
  const [recoveryLink, setRecoveryLink] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const extractTokensFromLink = (link: string) => {
    try {
      const url = new URL(link)
      const accessToken = url.searchParams.get('access_token')
      const refreshToken = url.searchParams.get('refresh_token')
      const tokenType = url.searchParams.get('type')
      const expiresAt = url.searchParams.get('expires_at')
      const expiresIn = url.searchParams.get('expires_in')
      
      return {
        accessToken,
        refreshToken,
        tokenType,
        expiresAt,
        expiresIn
      }
    } catch (error) {
      console.error('[ManualRecovery] Erro ao extrair tokens:', error)
      return null
    }
  }

  const handleProcessRecoveryLink = async () => {
    if (!recoveryLink.trim()) {
      toast({
        title: 'Link necessário',
        description: 'Cole o link de recuperação recebido por e-mail.',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)

    try {
      console.log('[ManualRecovery] Processando link manual:', recoveryLink)

      const tokens = extractTokensFromLink(recoveryLink)
      
      if (!tokens || !tokens.accessToken || !tokens.refreshToken) {
        throw new Error('Link inválido ou tokens não encontrados')
      }

      console.log('[ManualRecovery] Tokens extraídos:', {
        hasAccessToken: !!tokens.accessToken,
        hasRefreshToken: !!tokens.refreshToken,
        tokenType: tokens.tokenType
      })

      // Define a sessão com os tokens extraídos
      const { data, error } = await supabase.auth.setSession({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken
      })

      if (error) throw error

      console.log('[ManualRecovery] Sessão estabelecida com sucesso')

      // Atualiza os parâmetros da URL para simular o processamento automático
      const newParams = new URLSearchParams()
      if (tokens.tokenType) {
        newParams.set('type', tokens.tokenType)
      }
      setSearchParams(newParams, { replace: true })

      toast({
        title: 'Link processado com sucesso!',
        description: 'Agora você pode redefinir sua senha.'
      })

      // Limpa o campo
      setRecoveryLink('')
      
      if (onSuccess) {
        onSuccess()
      }

    } catch (error: any) {
      console.error('[ManualRecovery] Erro ao processar link:', error)
      
      let errorMessage = 'Não foi possível processar o link'
      
      if (error.message?.includes('expired')) {
        errorMessage = 'Link expirado. Solicite um novo link de recuperação.'
      } else if (error.message?.includes('invalid')) {
        errorMessage = 'Link inválido. Verifique se copiou o link completo.'
      } else if (error.message?.includes('tokens não encontrados')) {
        errorMessage = 'Link inválido. Certifique-se de copiar o link completo do e-mail.'
      }

      toast({
        title: 'Erro no processamento',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text && (text.includes('access_token') || text.includes('recovery'))) {
        setRecoveryLink(text)
        toast({
          title: 'Link colado',
          description: 'Link de recuperação colado da área de transferência.'
        })
      } else {
        toast({
          title: 'Nenhum link encontrado',
          description: 'Nenhum link de recuperação foi encontrado na área de transferência.',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Erro ao colar',
        description: 'Não foi possível acessar a área de transferência.',
        variant: 'destructive'
      })
    }
  }

  return (
    <Card className="mb-4 border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
          <Link className="h-4 w-4" />
          Recuperação Manual
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-xs text-yellow-700 dark:text-yellow-300 mb-3">
          Se o link de recuperação não funcionar automaticamente, cole o link completo do e-mail aqui:
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="recovery-link" className="text-xs">
            Link de Recuperação
          </Label>
          <Textarea
            id="recovery-link"
            placeholder="https://YOUR_PROJECT_ID.supabase.co/auth/v1/verify?token=..."
            value={recoveryLink}
            onChange={(e) => setRecoveryLink(e.target.value)}
            className="min-h-20 text-xs font-mono"
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handlePasteFromClipboard}
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
          >
            Colar da Área de Transferência
          </Button>
          <Button
            onClick={handleProcessRecoveryLink}
            disabled={loading || !recoveryLink.trim()}
            size="sm"
            className="flex-1 text-xs"
          >
            {loading ? 'Processando...' : 'Processar Link'}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          💡 <strong>Dica:</strong> Copie o link completo do e-mail de recuperação, incluindo todos os parâmetros.
        </div>
      </CardContent>
    </Card>
  )
}