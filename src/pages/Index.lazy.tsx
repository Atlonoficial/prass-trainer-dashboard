import React, { Suspense } from 'react'
import { SkeletonLoader } from '@/components/loading/SkeletonLoader'

// Lazy load dashboard sections
const OverviewSection = React.lazy(() => import('@/components/dashboard/OverviewSection'))
const StudentManagementSection = React.lazy(() => import('@/components/dashboard/StudentManagementSection'))
const ScheduleSection = React.lazy(() => import('@/components/dashboard/ScheduleSection'))
const NotificationsSection = React.lazy(() => import('@/components/dashboard/NotificationsSection'))
const ConsultingSection = React.lazy(() => import('@/components/dashboard/ConsultingSection'))
const AITrainingSection = React.lazy(() => import('@/components/dashboard/AITrainingSection'))
const ProductsCoursesSection = React.lazy(() => import('@/components/dashboard/ProductsCoursesSection'))
const OptimizedPaymentSection = React.lazy(() => import('@/components/dashboard/OptimizedPaymentSection'))
const CommunicationSection = React.lazy(() => import('@/components/dashboard/CommunicationSection'))
const ReportsSection = React.lazy(() => import('@/components/dashboard/ReportsSection'))
const PredefinitionsSection = React.lazy(() => import('@/components/dashboard/PredefinitionsSection'))
const GamificationSection = React.lazy(() => import('@/components/dashboard/GamificationSection'))
const MarketingSection = React.lazy(() => import('@/components/dashboard/MarketingSection').then(m => ({ default: m.MarketingSection })))
const StudentPaymentPortal = React.lazy(() => import('@/components/students/StudentPaymentPortal').then(m => ({ default: m.StudentPaymentPortal })))
const ConfiguracoesSection = React.lazy(() => import('@/components/dashboard/ConfiguracoesSection'))

interface LazyComponentProps {
  sectionId: string
  component: React.LazyExoticComponent<any>
  props?: any
}

function LazySection({ component: Component, props }: { component: React.LazyExoticComponent<any>, props?: any }) {
  return (
    <Suspense fallback={<SkeletonLoader />}>
      <Component {...props} />
    </Suspense>
  )
}

export function renderLazySection(sectionId: string, props?: any) {
  const components: Record<string, React.LazyExoticComponent<any>> = {
    'inicio': OverviewSection,
    'gestao-alunos': StudentManagementSection,
    'agenda': ScheduleSection,
    'notificacoes': NotificationsSection,
    'consultoria': ConsultingSection,
    'predefinicoes': PredefinitionsSection,
    'gamificacao': GamificationSection,
    'marketing': MarketingSection,
    'treinos-ia': AITrainingSection,
    'comunicacao': CommunicationSection,
    'meus-pagamentos': StudentPaymentPortal,
    'pagamentos': OptimizedPaymentSection,
    'produtos': ProductsCoursesSection,
    'relatorios': ReportsSection,
    'configuracoes': ConfiguracoesSection,
  }

  const Component = components[sectionId] || components['inicio']
  return <LazySection component={Component} props={props} />
}
