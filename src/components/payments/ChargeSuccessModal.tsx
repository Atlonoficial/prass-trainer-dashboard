import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Check, Copy, MessageCircle, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'

interface ChargeSuccessModalProps {
  isOpen: boolean
  onClose: () => void
  paymentLink: string
  amount: number
  studentName: string
  studentPhone: string
  dueDate: string
}

export function ChargeSuccessModal({
  isOpen,
  onClose,
  paymentLink,
  amount,
  studentName,
  studentPhone,
  dueDate
}: ChargeSuccessModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyLink = () => {
    navigator.clipboard.writeText(paymentLink)
    setCopied(true)
    toast.success('Link copiado!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSendWhatsApp = () => {
    const message = `Olá ${studentName}! 👋

💰 *Nova Cobrança Disponível*

📋 Valor: *R$ ${amount.toFixed(2)}*
📅 Vencimento: ${new Date(dueDate).toLocaleDateString('pt-BR')}

🔗 *Link para pagamento:*
${paymentLink}

✅ Após confirmar o pagamento, seu acesso será liberado automaticamente!

_Qualquer dúvida, estou à disposição!_ 😊`
    
    const whatsappUrl = `https://wa.me/55${studentPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
    toast.success('WhatsApp aberto! Mensagem pronta para enviar 📱')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-3 pr-12 border-b border-border/40 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-success">
            <Check className="h-5 w-5" />
            Cobrança Criada com Sucesso!
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-5 pt-3 flex-1 min-h-0 overflow-y-auto space-y-4">
          {/* Informações da Cobrança */}
          <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Aluno:</span>
              <span className="font-medium">{studentName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor:</span>
              <span className="font-medium text-success">R$ {amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vencimento:</span>
              <span className="font-medium">{new Date(dueDate).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>

          {/* Link de Pagamento */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Link de Pagamento:</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={paymentLink}
                readOnly
                className="flex-1 px-3 py-2 bg-secondary rounded-md text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
              >
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.open(paymentLink, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Ações */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCopyLink}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar Link
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={handleSendWhatsApp}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Enviar WhatsApp
            </Button>
          </div>
        </div>

        <DialogFooter className="px-5 pb-5 pt-3 border-t border-border/40 flex-shrink-0">
          <Button
            variant="ghost"
            className="w-full"
            onClick={onClose}
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
