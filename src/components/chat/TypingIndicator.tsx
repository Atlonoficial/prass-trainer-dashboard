import { usePresence } from '@/hooks/usePresence'
import { Loader2 } from 'lucide-react'

interface TypingIndicatorProps {
  userId: string
  conversationId: string
  userName?: string
  className?: string
}

export function TypingIndicator({ 
  userId, 
  conversationId, 
  userName = 'Usuário',
  className = '' 
}: TypingIndicatorProps) {
  const { isUserTyping } = usePresence()
  const isTyping = isUserTyping(userId, conversationId)

  if (!isTyping) return null

  return (
    <div className={`flex items-center gap-2 text-muted-foreground text-sm ${className}`}>
      <div className="flex items-center gap-1">
        <div className="flex space-x-1">
          <div className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-1 h-1 bg-primary rounded-full animate-bounce" />
        </div>
        <span className="text-primary">{userName} está digitando...</span>
      </div>
    </div>
  )
}