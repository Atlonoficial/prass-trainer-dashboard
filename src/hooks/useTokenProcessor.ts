import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'

interface TokenState {
  isProcessing: boolean
  hasToken: boolean
  tokenType: 'recovery' | 'confirmation' | null
}

export function useTokenProcessor() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [state, setState] = useState<TokenState>({
    isProcessing: false,
    hasToken: false,
    tokenType: null
  })

  useEffect(() => {
    const processUrlToken = async () => {
      // Detecta tokens na URL (access_token, confirmation_token, recovery_token)
      const accessToken = searchParams.get('access_token')
      const refreshToken = searchParams.get('refresh_token')
      const tokenType = searchParams.get('type')
      const tokenHash = searchParams.get('token_hash')
      
      console.log('[TokenProcessor] Parâmetros detectados:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        hasTokenHash: !!tokenHash,
        tokenType,
        allParams: Object.fromEntries(searchParams.entries())
      })
      
      // Verifica se tem tokens válidos (access_token + refresh_token OU token_hash)
      const hasValidTokens = (accessToken && refreshToken) || tokenHash
      
      if (!hasValidTokens) {
        console.log('[TokenProcessor] Tokens não encontrados na URL')
        return
      }

      setState(prev => ({ 
        ...prev, 
        isProcessing: true, 
        hasToken: true,
        tokenType: tokenType as 'recovery' | 'confirmation' || null
      }))

      try {
        console.log('[TokenProcessor] Processando token da URL:', { 
          tokenType, 
          hasAccessToken: !!accessToken,
          hasTokenHash: !!tokenHash 
        })

        let sessionResult
        
        // Se tem access_token + refresh_token, usa setSession
        if (accessToken && refreshToken) {
          sessionResult = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })
        } 
        // Se só tem token_hash, tenta verificar com exchangeCodeForSession
        else if (tokenHash) {
          try {
            sessionResult = await supabase.auth.exchangeCodeForSession(tokenHash)
          } catch (exchangeError) {
            console.log('[TokenProcessor] Erro no exchange, tentando verifyOtp:', exchangeError)
            // Fallback para verifyOtp
            sessionResult = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: tokenType as any || 'recovery'
            })
          }
        }

        if (sessionResult?.error) throw sessionResult.error

        console.log('[TokenProcessor] Sessão estabelecida com sucesso:', sessionResult?.data?.user?.email)

        // Limpa os tokens da URL após processamento
        const newParams = new URLSearchParams(searchParams)
        newParams.delete('access_token')
        newParams.delete('refresh_token')
        newParams.delete('token_hash')
        newParams.delete('expires_at')
        newParams.delete('expires_in')
        newParams.delete('token_type')
        newParams.delete('type')
        
        setSearchParams(newParams, { replace: true })

        // Token processado com sucesso - removido toast para evitar conflitos

        setState(prev => ({ ...prev, isProcessing: false }))
        return true

      } catch (error: any) {
        console.error('[TokenProcessor] Erro ao processar token:', error)
        
        // Limpa URL mesmo em caso de erro para evitar loops
        const newParams = new URLSearchParams(searchParams)
        newParams.delete('access_token')
        newParams.delete('refresh_token')
        newParams.delete('token_hash')
        newParams.delete('expires_at')
        newParams.delete('expires_in')
        newParams.delete('token_type')
        newParams.delete('type')
        setSearchParams(newParams, { replace: true })

        let errorMessage = 'Token inválido ou expirado'
        
        if (error.message?.includes('expired')) {
          errorMessage = 'Link expirado. Solicite um novo link de recuperação.'
        } else if (error.message?.includes('invalid')) {
          errorMessage = 'Link inválido. Verifique se copiou o link completo.'
        } else if (error.message?.includes('session_not_found')) {
          errorMessage = 'Sessão não encontrada. Tente usar a recuperação manual abaixo.'
        } else if (error.message?.includes('refresh_token_not_found')) {
          errorMessage = 'Token de refresh não encontrado. Use a recuperação manual abaixo.'
        }

        console.log('[TokenProcessor] Erro detalhado:', {
          message: error.message,
          code: error.error_code,
          description: error.error_description
        })

        // Removido toast para evitar conflitos - erro será tratado pela AuthPage

        setState(prev => ({ ...prev, isProcessing: false }))
        return false
      }
    }

    processUrlToken()
  }, [searchParams, setSearchParams])

  return {
    isProcessing: state.isProcessing,
    hasToken: state.hasToken,
    tokenType: state.tokenType
  }
}