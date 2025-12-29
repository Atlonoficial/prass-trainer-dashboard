/**
 * Payment utility functions for calculating status and processing data
 */

export interface StudentWithPaymentStatus {
  id: string
  user_id: string
  teacher_id: string
  name?: string
  email?: string
  profiles?: any
  payment_status: 'paid' | 'due_soon' | 'overdue' | 'inactive'
  next_payment_date?: Date
  subscription?: any
  last_transaction?: any
  overdue_amount: number
  pending_amount: number
}

/**
 * Calculate payment status for a student based on subscriptions and transactions
 */
export function calculateStudentPaymentStatus(
  student: any,
  subscriptions: any[],
  transactions: any[]
): StudentWithPaymentStatus {
  // Find active subscription for this student
  const studentSubscription = subscriptions.find(
    sub => sub.student_user_id === student.user_id && sub.status === 'active'
  )

  // Find recent transactions for this student  
  const studentTransactions = transactions.filter(
    tx => tx.student_id === student.user_id
  ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const lastTransaction = studentTransactions[0]
  const now = new Date()

  let status: 'paid' | 'due_soon' | 'overdue' | 'inactive' = 'inactive'
  let nextPaymentDate: Date | undefined
  let overdueAmount = 0
  let pendingAmount = 0

  if (studentSubscription) {
    const endDate = new Date(studentSubscription.end_at)
    const daysDiff = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (studentSubscription.status === 'active') {
      if (daysDiff > 7) {
        status = 'paid'
      } else if (daysDiff > 0) {
        status = 'due_soon'
        pendingAmount = studentSubscription.plan_catalog?.price || 0
      } else {
        status = 'overdue'
        overdueAmount = studentSubscription.plan_catalog?.price || 0
      }

      // Calculate next payment date based on plan interval
      const interval = studentSubscription.plan_catalog?.interval || 'monthly'
      nextPaymentDate = new Date(endDate)
      if (interval === 'monthly') {
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1)
      } else if (interval === 'weekly') {
        nextPaymentDate.setDate(nextPaymentDate.getDate() + 7)
      }
    }
  } else if (lastTransaction) {
    // Fallback: use last transaction to determine status
    const transactionDate = new Date(lastTransaction.created_at)
    const daysSinceLastPayment = Math.ceil((now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24))

    if (daysSinceLastPayment <= 30) {
      status = 'paid'
    } else if (daysSinceLastPayment <= 35) {
      status = 'due_soon'
      pendingAmount = lastTransaction.amount || 100
    } else {
      status = 'overdue'
      overdueAmount = lastTransaction.amount || 100
    }

    // Estimate next payment date
    nextPaymentDate = new Date(transactionDate)
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1)
  }

  return {
    id: student.id,
    user_id: student.user_id,
    teacher_id: student.teacher_id,
    name: student.profiles?.name || student.name || 'Aluno',
    email: student.profiles?.email || student.email || '',
    profiles: student.profiles,
    payment_status: status,
    next_payment_date: nextPaymentDate,
    subscription: studentSubscription,
    last_transaction: lastTransaction,
    overdue_amount: overdueAmount,
    pending_amount: pendingAmount
  }
}

/**
 * Calculate payment metrics from students with payment status
 */
export function calculatePaymentMetrics(studentsWithPayments: StudentWithPaymentStatus[]) {
  const totalRevenue = studentsWithPayments.reduce((sum, student) => {
    return sum + (student.last_transaction?.amount || 0)
  }, 0)

  const overdueCount = studentsWithPayments.filter(s => s.payment_status === 'overdue').length
  const dueSoonCount = studentsWithPayments.filter(s => s.payment_status === 'due_soon').length
  const paidCount = studentsWithPayments.filter(s => s.payment_status === 'paid').length

  const overdueAmount = studentsWithPayments.reduce((sum, student) => {
    return sum + student.overdue_amount
  }, 0)

  const pendingAmount = studentsWithPayments.reduce((sum, student) => {
    return sum + student.pending_amount
  }, 0)

  return {
    totalRevenue,
    overdueAmount,
    pendingAmount,
    totalStudents: studentsWithPayments.length,
    overdueCount,
    dueSoonCount,
    paidCount,
    activeCount: paidCount + dueSoonCount
  }
}

/**
 * Generate chart data for payment dashboard
 */
export function generatePaymentChartData(transactions: any[]) {
  const last6Months = []
  const now = new Date()

  for (let i = 5; i >= 0; i--) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthName = month.toLocaleDateString('pt-BR', { month: 'short' })

    const monthTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.created_at)
      return txDate.getMonth() === month.getMonth() &&
        txDate.getFullYear() === month.getFullYear() &&
        tx.status === 'paid'
    })

    const revenue = monthTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0)

    last6Months.push({
      month: monthName,
      revenue,
      transactions: monthTransactions.length
    })
  }

  return last6Months
}