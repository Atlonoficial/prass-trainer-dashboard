import React, { Suspense } from 'react';
import ProfessorLayout from '@/components/layout/ProfessorLayout';
import { SkeletonLoader } from '@/components/loading/SkeletonLoader';

// Lazy load das seções do dashboard
const StudentManagementSection = React.lazy(() => import('@/components/dashboard/StudentManagementSection'));
const ScheduleSection = React.lazy(() => import('@/components/dashboard/ScheduleSection'));
const NotificationsSection = React.lazy(() => import('@/components/dashboard/NotificationsSection'));
const ConsultingSection = React.lazy(() => import('@/components/dashboard/ConsultingSection'));
const AITrainingSection = React.lazy(() => import('@/components/dashboard/AITrainingSection'));
const ProductsCoursesSection = React.lazy(() => import('@/components/dashboard/ProductsCoursesSection'));
const OptimizedPaymentSection = React.lazy(() => import('@/components/dashboard/OptimizedPaymentSection'));
const CommunicationSection = React.lazy(() => import('@/components/dashboard/CommunicationSection'));
const ReportsSection = React.lazy(() => import('@/components/dashboard/ReportsSection'));
const PredefinitionsSection = React.lazy(() => import('@/components/dashboard/PredefinitionsSection'));
const GamificationSection = React.lazy(() => import('@/components/dashboard/GamificationSection'));
const MarketingSection = React.lazy(() => import('@/components/dashboard/MarketingSection').then(m => ({ default: m.MarketingSection })));
const ConfiguracoesSection = React.lazy(() => import('@/components/dashboard/ConfiguracoesSection'));

// Wrapper para seções lazy
function SectionWrapper({ Component, sectionId }: { Component: React.LazyExoticComponent<any>, sectionId: string }) {
    return (
        <ProfessorLayout activeSection={sectionId}>
            <Suspense fallback={<SkeletonLoader />}>
                <Component />
            </Suspense>
        </ProfessorLayout>
    );
}

// Páginas de cada seção
export function GestaoAlunosPage() {
    return <SectionWrapper Component={StudentManagementSection} sectionId="gestao-alunos" />;
}

export function AgendaPage() {
    return <SectionWrapper Component={ScheduleSection} sectionId="agenda" />;
}

export function NotificacoesPage() {
    return <SectionWrapper Component={NotificationsSection} sectionId="notificacoes" />;
}

export function ConsultoriaPage() {
    return <SectionWrapper Component={ConsultingSection} sectionId="consultoria" />;
}

export function PredefinicoesPage() {
    return <SectionWrapper Component={PredefinitionsSection} sectionId="predefinicoes" />;
}

export function GamificacaoPage() {
    return <SectionWrapper Component={GamificationSection} sectionId="gamificacao" />;
}

export function MarketingPage() {
    return <SectionWrapper Component={MarketingSection} sectionId="marketing" />;
}

export function ComunicacaoPage() {
    return <SectionWrapper Component={CommunicationSection} sectionId="comunicacao" />;
}

export function PagamentosPage() {
    return <SectionWrapper Component={OptimizedPaymentSection} sectionId="pagamentos" />;
}

export function ProdutosPage() {
    return <SectionWrapper Component={ProductsCoursesSection} sectionId="produtos" />;
}

export function RelatoriosPage() {
    return <SectionWrapper Component={ReportsSection} sectionId="relatorios" />;
}

export function TreinosIAPage() {
    return <SectionWrapper Component={AITrainingSection} sectionId="treinos-ia" />;
}

export function ConfiguracoesPage() {
    return <SectionWrapper Component={ConfiguracoesSection} sectionId="configuracoes" />;
}
