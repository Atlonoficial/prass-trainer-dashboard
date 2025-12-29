import React from "react";
import { Toaster } from "@/components/ui/sonner";
import { Toaster as ShadcnToaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UnifiedAppProvider } from "@/contexts/UnifiedAppProvider";
import { GlobalCacheProvider } from "@/contexts/GlobalCacheProvider";
import { SystemStatusProvider } from "@/contexts/SystemStatus";
import { TenantProvider } from "@/contexts/TenantContext";
import { RealtimeProvider } from "@/providers/RealtimeProvider";
import { AuthSystemProvider } from "@/contexts/AuthSystemContext";
import { SecurityProvider } from "@/components/security/SecurityProvider";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import { AuthPage } from "./pages/AuthPage";
import ProfessorDashboard from "./pages/professor/Dashboard";
import StudentDetail from "./pages/professor/StudentDetail";
import ChatPage from "./pages/professor/ChatPage";
import PlansPage from "./pages/professor/Plans";
// Section Pages - Menu lateral
import {
  GestaoAlunosPage,
  AgendaPage,
  NotificacoesPage,
  ConsultoriaPage,
  PredefinicoesPage,
  GamificacaoPage,
  MarketingPage,
  ComunicacaoPage,
  PagamentosPage,
  ProdutosPage,
  RelatoriosPage,
  TreinosIAPage,
  ConfiguracoesPage
} from "./pages/professor/SectionPages";
import AcceptInvite from "./pages/AcceptInvite";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancelled from "./pages/PaymentCancelled";
import NotFound from "./pages/NotFound";
import EmailHandler from "./pages/EmailHandler";
import { EmailSentPage } from "./pages/EmailSentPage";
import ConfirmSignup from "./pages/email/ConfirmSignup";
import MagicLink from "./pages/email/MagicLink";
import ResetPasswordRedirect from "./pages/email/ResetPasswordRedirect";
import ChangeEmail from "./pages/email/ChangeEmail";
import Reauth from "./pages/email/Reauth";
import DashboardAuthConfirm from "./pages/dashboard/auth/DashboardAuthConfirm";
import DashboardResetPassword from "./pages/dashboard/auth/DashboardResetPassword";
// Auth confirmation routes
import AuthConfirm from "./pages/auth/AuthConfirm";
import LegacyRedirect from "./pages/auth/LegacyRedirect";
// Legal pages
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import TermsOfService from "./pages/legal/TermsOfService";
import Support from "./pages/legal/Support";

import PaymentTest from "./pages/PaymentTest";
import PaymentManagement from "./pages/PaymentManagement";
import PaymentSetupFlow from "./pages/PaymentSetupFlow";
import StudentPayments from "./pages/StudentPayments";
import AdminPaymentConfig from "./pages/AdminPaymentConfig";
import PaymentCredentialsSetup from "./pages/PaymentCredentialsSetup";
import PaymentMethodsConfig from "./pages/PaymentMethodsConfig";
import { BannerTestPage } from "@/components/banners/BannerTestPage";
import { OfflineBanner } from "@/components/OfflineBanner";
import SetupPage from "./pages/SetupPage";
import HealthCheck from "./pages/HealthCheck";

const queryClient = new QueryClient();

function App() {
  console.log('App component rendering');

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GlobalCacheProvider>
          <UnifiedAppProvider>
            <TenantProvider>
              <RealtimeProvider>
                <SystemStatusProvider>
                  <AuthSystemProvider>
                    <SecurityProvider>
                      <TooltipProvider>
                        <Toaster />
                        <ShadcnToaster />
                        <OfflineBanner />
                        <BrowserRouter>
                          <Routes>
                            {/* Rota principal - redireciona direto para dashboard do professor */}
                            <Route path="/" element={
                              <AuthGuard>
                                <ProfessorDashboard />
                              </AuthGuard>
                            } />
                            <Route path="/auth" element={<AuthPage />} />
                            <Route path="/setup" element={
                              <AuthGuard>
                                <SetupPage />
                              </AuthGuard>
                            } />

                            {/* Rotas das seções do menu lateral */}
                            <Route path="/gestao-alunos" element={<AuthGuard><GestaoAlunosPage /></AuthGuard>} />
                            <Route path="/agenda" element={<AuthGuard><AgendaPage /></AuthGuard>} />
                            <Route path="/notificacoes" element={<AuthGuard><NotificacoesPage /></AuthGuard>} />
                            <Route path="/consultoria" element={<AuthGuard><ConsultoriaPage /></AuthGuard>} />
                            <Route path="/predefinicoes" element={<AuthGuard><PredefinicoesPage /></AuthGuard>} />
                            <Route path="/gamificacao" element={<AuthGuard><GamificacaoPage /></AuthGuard>} />
                            <Route path="/marketing" element={<AuthGuard><MarketingPage /></AuthGuard>} />
                            <Route path="/comunicacao" element={<AuthGuard><ComunicacaoPage /></AuthGuard>} />
                            <Route path="/pagamentos" element={<AuthGuard><PagamentosPage /></AuthGuard>} />
                            <Route path="/produtos" element={<AuthGuard><ProdutosPage /></AuthGuard>} />
                            <Route path="/relatorios" element={<AuthGuard><RelatoriosPage /></AuthGuard>} />
                            <Route path="/treinos-ia" element={<AuthGuard><TreinosIAPage /></AuthGuard>} />
                            <Route path="/configuracoes" element={<AuthGuard><ConfiguracoesPage /></AuthGuard>} />

                            <Route path="/test-banners" element={
                              <AuthGuard>
                                <BannerTestPage />
                              </AuthGuard>
                            } />
                            <Route path="/health" element={<HealthCheck />} />
                            <Route path="/payment-test" element={
                              <AuthGuard>
                                <PaymentTest />
                              </AuthGuard>
                            } />
                            <Route path="/payment-management" element={
                              <AuthGuard>
                                <RoleGuard allowed={["teacher"]}>
                                  <PaymentManagement />
                                </RoleGuard>
                              </AuthGuard>
                            } />
                            <Route path="/payment-setup" element={
                              <AuthGuard>
                                <RoleGuard allowed={["teacher"]}>
                                  <PaymentSetupFlow />
                                </RoleGuard>
                              </AuthGuard>
                            } />
                            <Route path="/admin/payment-config" element={
                              <AuthGuard>
                                <AdminPaymentConfig />
                              </AuthGuard>
                            } />
                            {/* Payment methods configuration */}
                            <Route path="/admin/payment-methods" element={
                              <AuthGuard>
                                <RoleGuard allowed={["teacher"]}>
                                  <PaymentMethodsConfig />
                                </RoleGuard>
                              </AuthGuard>
                            } />
                            {/* Simplified payment credentials setup - Protected */}
                            <Route path="/config/payment-credentials" element={
                              <AuthGuard>
                                <RoleGuard allowed={["teacher"]}>
                                  <PaymentCredentialsSetup />
                                </RoleGuard>
                              </AuthGuard>
                            } />
                            <Route path="/student/payments" element={
                              <AuthGuard>
                                <RoleGuard allowed={["student"]}>
                                  <StudentPayments />
                                </RoleGuard>
                              </AuthGuard>
                            } />
                            <Route path="/meus-pagamentos" element={
                              <AuthGuard>
                                <RoleGuard allowed={["student"]}>
                                  <StudentPayments />
                                </RoleGuard>
                              </AuthGuard>
                            } />
                            {/* ROTAS DO PROFESSOR - Sincronizadas com App do Aluno */}
                            <Route
                              path="/professor/dashboard"
                              element={
                                <AuthGuard>
                                  <RoleGuard allowed={["teacher"]}>
                                    <ProfessorDashboard />
                                  </RoleGuard>
                                </AuthGuard>
                              }
                            />
                            <Route
                              path="/professor/aluno/:id"
                              element={
                                <AuthGuard>
                                  <RoleGuard allowed={["teacher"]}>
                                    <StudentDetail />
                                  </RoleGuard>
                                </AuthGuard>
                              }
                            />
                            <Route
                              path="/professor/chat/:conversationId"
                              element={
                                <AuthGuard>
                                  <RoleGuard allowed={["teacher"]}>
                                    <ChatPage />
                                  </RoleGuard>
                                </AuthGuard>
                              }
                            />
                            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                            <Route
                              path="/professor/plans"
                              element={
                                <AuthGuard>
                                  <RoleGuard allowed={["teacher"]}>
                                    <PlansPage />
                                  </RoleGuard>
                                </AuthGuard>
                              }
                            />
                            <Route path="/accept-invite" element={<AcceptInvite />} />
                            <Route path="/payment-success" element={<PaymentSuccess />} />
                            <Route path="/payment-cancelled" element={<PaymentCancelled />} />
                            <Route path="/payment/success" element={<PaymentSuccess />} />
                            <Route path="/payment/failure" element={<PaymentCancelled />} />
                            <Route path="/payment/pending" element={<PaymentSuccess />} />

                            {/* ========== PÁGINAS PÚBLICAS LEGAIS (SEM AUTH) ========== */}
                            <Route path="/app/privacy" element={<PrivacyPolicy />} />
                            <Route path="/app/terms" element={<TermsOfService />} />
                            <Route path="/app/support" element={<Support />} />

                            {/* ALIASES PARA APP STORES */}
                            <Route path="/privacy" element={<PrivacyPolicy />} />
                            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                            <Route path="/terms" element={<TermsOfService />} />
                            <Route path="/terms-of-service" element={<TermsOfService />} />
                            <Route path="/support" element={<Support />} />

                            {/* Dashboard Professor - Auth routes */}
                            <Route path="/dashboard/auth/confirm" element={<DashboardAuthConfirm />} />
                            <Route path="/dashboard/auth/reset-password" element={<DashboardResetPassword />} />

                            {/* ========== ROTA CANÔNICA DE CONFIRMAÇÃO ========== */}
                            <Route path="/auth/confirm" element={<AuthConfirm />} />

                            {/* ========== ALIASES DE COMPATIBILIDADE ========== */}
                            <Route path="/email/confirm" element={<LegacyRedirect to="/auth/confirm" />} />
                            <Route path="/auth/app/confirm.html" element={<LegacyRedirect to="/auth/confirm" />} />

                            {/* Email verification routes (legacy) */}
                            <Route path="/email" element={<EmailHandler />} />
                            <Route path="/email-sent" element={<EmailSentPage />} />
                            <Route path="/email/magic-link" element={<MagicLink />} />
                            <Route path="/email/reset-password" element={<ResetPasswordRedirect />} />
                            <Route path="/email/change-email" element={<ChangeEmail />} />
                            <Route path="/email/reauth" element={<Reauth />} />

                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </BrowserRouter>
                      </TooltipProvider>
                    </SecurityProvider>
                  </AuthSystemProvider>
                </SystemStatusProvider>
              </RealtimeProvider>
            </TenantProvider>
          </UnifiedAppProvider>
        </GlobalCacheProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
