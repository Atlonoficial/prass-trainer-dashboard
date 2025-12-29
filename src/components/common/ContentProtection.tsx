import React, { useState, useEffect } from 'react'
import { Lock, Crown, BookOpen, Play, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useContentAccess } from '@/hooks/useContentAccess'
import { usePaymentProcessing } from '@/hooks/usePaymentProcessing'
import { useToast } from '@/hooks/use-toast'

interface ContentProtectionProps {
  children: React.ReactNode
  contentType: 'course' | 'plan' | 'lesson' | 'material'
  contentId: string
  teacherId?: string
  requiresPurchase?: boolean
  price?: number
  currency?: string
  title?: string
  description?: string
  features?: string[]
  previewContent?: React.ReactNode
  onAccessGranted?: () => void
}

export function ContentProtection({
  children,
  contentType,
  contentId,
  teacherId,
  requiresPurchase = true,
  price,
  currency = 'BRL',
  title,
  description,
  features,
  previewContent,
  onAccessGranted
}: ContentProtectionProps) {
  const [accessStatus, setAccessStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(false)
  
  const { checkCourseAccess, checkPlanAccess } = useContentAccess()
  const { createCheckout } = usePaymentProcessing()
  const { toast } = useToast()

  useEffect(() => {
    checkAccess()
  }, [contentId, contentType, teacherId])

  const checkAccess = async () => {
    setLoading(true)
    try {
      let status
      if (contentType === 'course' || contentType === 'lesson' || contentType === 'material') {
        status = await checkCourseAccess(contentId)
      } else if (contentType === 'plan' && teacherId) {
        status = await checkPlanAccess(teacherId)
      }
      
      setAccessStatus(status)
      
      if (status?.hasAccess && onAccessGranted) {
        onAccessGranted()
      }
    } catch (error) {
      console.error('Error checking access:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePurchase = async () => {
    if (!requiresPurchase) return

    setPurchasing(true)
    try {
      let checkoutData
      if (contentType === 'course') {
        checkoutData = await createCheckout(null, contentId)
      } else if (contentType === 'plan') {
        checkoutData = await createCheckout(contentId, null)
      }

      if (checkoutData?.checkout_url) {
        window.open(checkoutData.checkout_url, '_blank')
        toast({
          title: 'Redirecionamento para pagamento',
          description: 'Você será redirecionado para completar o pagamento.',
        })
      }
    } catch (error) {
      console.error('Error creating checkout:', error)
      toast({
        title: 'Erro no pagamento',
        description: 'Não foi possível processar o pagamento. Tente novamente.',
        variant: 'destructive'
      })
    } finally {
      setPurchasing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // If user has access, show content
  if (accessStatus?.hasAccess) {
    return <>{children}</>
  }

  // Content protection UI
  return (
    <div className="space-y-6">
      {/* Preview content if available */}
      {previewContent && (
        <div className="relative">
          <div className="opacity-50 pointer-events-none">
            {previewContent}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <Badge variant="secondary" className="bg-background/80 backdrop-blur">
              <Play className="h-3 w-3 mr-1" />
              Preview Limitado
            </Badge>
          </div>
        </div>
      )}

      {/* Access required card */}
      <Card className="p-6 text-center space-y-4">
        <div className="flex justify-center">
          {contentType === 'course' ? (
            <BookOpen className="h-12 w-12 text-primary" />
          ) : (
            <Crown className="h-12 w-12 text-primary" />
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">
            {title || (contentType === 'course' ? 'Curso Premium' : 'Acesso Premium')}
          </h3>
          <p className="text-muted-foreground">
            {description || 'Este conteúdo requer acesso premium para ser visualizado.'}
          </p>
        </div>

        {features && features.length > 0 && (
          <div className="space-y-2">
            <p className="font-medium">O que você terá acesso:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center justify-center gap-2">
                  <Star className="h-3 w-3 text-primary fill-current" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}

        {price && (
          <div className="bg-muted rounded-lg p-4">
            <div className="text-2xl font-bold text-primary">
              {currency === 'BRL' ? 'R$' : '$'} {price.toFixed(2)}
            </div>
            <div className="text-sm text-muted-foreground">
              {contentType === 'course' ? 'Pagamento único' : 'Por mês'}
            </div>
          </div>
        )}

        {requiresPurchase && (
          <div className="space-y-3">
            <Button 
              onClick={handlePurchase} 
              disabled={purchasing}
              className="w-full"
              size="lg"
            >
              {purchasing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                  Processando...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  {contentType === 'course' ? 'Comprar Curso' : 'Assinar Plano'}
                </>
              )}
            </Button>
            
            <p className="text-xs text-muted-foreground">
              Acesso liberado automaticamente após confirmação do pagamento
            </p>
          </div>
        )}

        {!requiresPurchase && (
          <div className="space-y-2">
            <Badge variant="outline">
              <Lock className="h-3 w-3 mr-1" />
              Conteúdo Restrito
            </Badge>
            <p className="text-sm text-muted-foreground">
              Entre em contato com seu professor para obter acesso
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}