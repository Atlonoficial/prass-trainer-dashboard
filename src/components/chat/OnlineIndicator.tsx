import { usePresence } from '@/hooks/usePresence'
import { Badge } from '@/components/ui/badge'

interface OnlineIndicatorProps {
  userId: string
  showText?: boolean
  className?: string
}

export function OnlineIndicator({ userId, showText = false, className = '' }: OnlineIndicatorProps) {
  const { isUserOnline } = usePresence()
  const isOnline = isUserOnline(userId)

  if (showText) {
    return (
      <Badge 
        variant={isOnline ? 'default' : 'secondary'} 
        className={`text-xs ${className}`}
      >
        {isOnline ? 'Online' : 'Offline'}
      </Badge>
    )
  }

  return (
    <div 
      className={`w-3 h-3 rounded-full border-2 border-background ${
        isOnline ? 'bg-success' : 'bg-muted-foreground'
      } ${className}`} 
    />
  )
}