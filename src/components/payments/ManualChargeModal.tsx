import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ManualChargeCreator } from './ManualChargeCreator'
import { ChargeSuccessModal } from './ChargeSuccessModal'
import { CreditCard } from 'lucide-react'

interface ManualChargeModalProps {
  isOpen: boolean
  onClose: () => void
  students: any[]
  plans: any[]
  teacherId: string
  onChargeCreated: () => void
}

export function ManualChargeModal({ 
  isOpen, 
  onClose, 
  students, 
  plans, 
  teacherId,
  onChargeCreated 
}: ManualChargeModalProps) {
  const [successData, setSuccessData] = useState<{
    chargeId: string
    paymentLink: string
    amount: number
    studentName: string
    studentPhone: string
    dueDate: string
  } | null>(null)

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl p-0 flex flex-col">
          <DialogHeader className="px-5 pt-5 pb-3 pr-12 border-b border-border/40 flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Nova Cobrança Manual
            </DialogTitle>
          </DialogHeader>
          
          <div className="px-5 pb-5 pt-3 flex-1 min-h-0 overflow-y-auto">
            <ManualChargeCreator
              students={students}
              plans={plans}
              onChargeCreated={(data) => {
                onChargeCreated()
                onClose()
                setSuccessData(data)
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de sucesso independente */}
      {successData && (
        <ChargeSuccessModal
          isOpen={true}
          onClose={() => setSuccessData(null)}
          paymentLink={successData.paymentLink}
          amount={successData.amount}
          studentName={successData.studentName}
          studentPhone={successData.studentPhone}
          dueDate={successData.dueDate}
        />
      )}
    </>
  )
}
