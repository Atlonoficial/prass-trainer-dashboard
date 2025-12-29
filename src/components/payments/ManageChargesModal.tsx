import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ManualChargesDashboard } from './ManualChargesDashboard'
import { List } from 'lucide-react'

interface ManageChargesModalProps {
  isOpen: boolean
  onClose: () => void
  teacherId: string
}

export function ManageChargesModal({ isOpen, onClose, teacherId }: ManageChargesModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-3 pr-12 border-b border-border/40 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <List className="h-5 w-5" />
            Gerenciar Cobranças Manuais
          </DialogTitle>
        </DialogHeader>
        
        <div className="px-5 pb-5 pt-3 flex-1 min-h-0 overflow-y-auto">
          <ManualChargesDashboard teacherId={teacherId} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
