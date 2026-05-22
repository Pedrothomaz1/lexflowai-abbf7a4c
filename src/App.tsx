import React, { Suspense, Component } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DashboardLayout } from "./components/DashboardLayout";
import { ModuloProvider } from "./contexts/ModuloContext";
import { AuthProvider } from "./contexts/AuthContext";
import { OrganizationProvider } from "./contexts/OrganizationContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { CookieBanner } from "./components/CookieBanner";
import { PageSkeleton } from "./components/ui/skeleton-loaders";

const Index = React.lazy(() => import("./pages/Index"));
const PortalExterno = React.lazy(() => import("./pages/PortalExterno"));
const Auth = React.lazy(() => import("./pages/Auth"));
const Privacidade = React.lazy(() => import("./pages/Privacidade"));
const AuthCallback = React.lazy(() => import("./pages/AuthCallback"));
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const Contratos = React.lazy(() => import("./pages/Contratos"));
const ContratoDetalhes = React.lazy(() => import("./pages/ContratoDetalhes"));
const Kanban = React.lazy(() => import("./pages/Kanban"));
const Fornecedores = React.lazy(() => import("./pages/Fornecedores"));
const FornecedorDetalhes = React.lazy(() => import("./pages/FornecedorDetalhes"));
const Usuarios = React.lazy(() => import("./pages/Usuarios"));
const Settings = React.lazy(() => import("./pages/Settings"));
const Templates = React.lazy(() => import("./pages/Templates"));
const Alertas = React.lazy(() => import("./pages/Alertas"));
const Calendario = React.lazy(() => import("./pages/Calendario"));
const Obrigacoes = React.lazy(() => import("./pages/Obrigacoes"));
const WorkflowAprovacoes = React.lazy(() => import("./pages/WorkflowAprovacoes"));
const WorkflowBuilder = React.lazy(() => import("./pages/WorkflowBuilder"));
const SignatureSettings = React.lazy(() => import("./pages/SignatureSettings"));
const NotificationSettings = React.lazy(() => import("./pages/NotificationSettings"));
const Servicos = React.lazy(() => import("./pages/Servicos"));
const Unidades = React.lazy(() => import("./pages/Unidades"));
const EspecificacoesServico = React.lazy(() => import("./pages/EspecificacoesServico"));
const SeletorModulo = React.lazy(() => import("./pages/SeletorModulo"));
const Custos = React.lazy(() => import("./pages/Custos"));
const AuditLogs = React.lazy(() => import("./pages/AuditLogs"));
const Relatorios = React.lazy(() => import("./pages/Relatorios"));
const ComplianceLGPD = React.lazy(() => import("./pages/ComplianceLGPD"));
const TwoFactorSettings = React.lazy(() => import("./pages/TwoFactorSettings"));
const SecurityDashboard = React.lazy(() => import("./pages/SecurityDashboard"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const RequisicaoPublica = React.lazy(() => import("./pages/RequisicaoPublica"));
const RequisicaoFormPublica = React.lazy(() => import("./pages/RequisicaoFormPublica"));
const FormBuilder = React.lazy(() => import("./pages/FormBuilder"));
const Requisicoes = React.lazy(() => import("./pages/Requisicoes"));
const MinhasAprovacoes = React.lazy(() => import("./pages/MinhasAprovacoes"));
const Franquias = React.lazy(() => import("./pages/Franquias"));
const FranquiaDetalhes = React.lazy(() => import("./pages/FranquiaDetalhes"));

const WaitingForInvite = React.lazy(() => import("./pages/WaitingForInvite"));
const OrganizationSettings = React.lazy(() => import("./pages/OrganizationSettings"));
const OrganizationMembers = React.lazy(() => import("./pages/OrganizationMembers"));
const AcceptInvite = React.lazy(() => import("./pages/AcceptInvite"));
const TermosDeUso = React.lazy(() => import("./pages/TermosDeUso"));
const CentralAjuda = React.lazy(() => import("./pages/CentralAjuda"));
const PermissoesAdmin = React.lazy(() => import("./pages/PermissoesAdmin"));
const ResetPassword = React.lazy(() => import("./pages/ResetPassword"));
const AguardandoAprovacao = React.lazy(() => import("./pages/AguardandoAprovacao"));
const ContaSuspensa = React.lazy(() => import("./pages/ContaSuspensa"));
const SuperAdminPage = React.lazy(() => import("./pages/SuperAdmin"));
const DashboardIA = React.lazy(() => import("./pages/DashboardIA"));
const ContratoWorkflow = React.lazy(() => import("./pages/ContratoWorkflow"));

// Catches chunk load failures (e.g. deploy after user session, offline)
class AppErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center flex-col gap-4 text-center p-8">
          <p className="text-lg font-semibold">Algo deu errado ao carregar a página.</p>
          <p className="text-sm text-muted-foreground">
            Verifique sua conexão e tente novamente.
          </p>
          <button
            className="mt-2 px-4 py-2 rounded bg-primary text-primary-foreground text-sm"
            onClick={() => window.location.reload()}
          >
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data considered fresh for 1 minute — avoids refetch on every navigation
      staleTime: 60_000,
      // Keep unused data in cache for 5 minutes
      gcTime: 300_000,
      // Only retry once on error (default 3 is too aggressive for user-facing errors)
      retry: 1,
      // Don't refetch when window regains focus (noisy in enterprise apps)
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <OrganizationProvider>
            <NotificationProvider>
            <ModuloProvider>
              <BrowserRouter>
                <Toaster />
                <Sonner />
                <AppErrorBoundary>
                <Suspense fallback={<PageSkeleton />}>
                  <Routes>
                    {/* Public routes */}
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    <Route path="/privacidade" element={<Privacidade />} />
                    <Route path="/termos" element={<TermosDeUso />} />
                    <Route path="/requisicao" element={<RequisicaoPublica />} />
                    <Route path="/requisicao/form/:formId" element={<RequisicaoFormPublica />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/portal/:token" element={<PortalExterno />} />

                    {/* Organization status routes (no public onboarding — orgs are created by super-admin) */}
                    <Route path="/waiting-for-invite" element={<ProtectedRoute requireOrg={false}><WaitingForInvite /></ProtectedRoute>} />
                    <Route path="/aguardando-aprovacao" element={<ProtectedRoute requireOrg={false}><AguardandoAprovacao /></ProtectedRoute>} />
                    <Route path="/conta-suspensa" element={<ProtectedRoute requireOrg={false}><ContaSuspensa /></ProtectedRoute>} />
                    <Route path="/aceitar-convite" element={<AcceptInvite />} />

                    {/* Super Admin (LexFlow team only) */}
                    <Route path="/super-admin" element={<ProtectedRoute requireOrg={false}><SuperAdminPage /></ProtectedRoute>} />

                    {/* Protected routes requiring organization */}
                    <Route path="/seletor-modulo" element={<ProtectedRoute><SeletorModulo /></ProtectedRoute>} />
                    <Route path="/requisicoes" element={<ProtectedRoute><DashboardLayout><Requisicoes /></DashboardLayout></ProtectedRoute>} />
                    <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout><Dashboard /></DashboardLayout></ProtectedRoute>} />
                    <Route path="/contratos" element={<ProtectedRoute><DashboardLayout><Contratos /></DashboardLayout></ProtectedRoute>} />
                    <Route path="/contratos/:id" element={<ProtectedRoute><DashboardLayout><ContratoDetalhes /></DashboardLayout></ProtectedRoute>} />
                    <Route path="/franquias" element={<ProtectedRoute><DashboardLayout><Franquias /></DashboardLayout></ProtectedRoute>} />
                    <Route path="/franquias/:id" element={<ProtectedRoute><DashboardLayout><FranquiaDetalhes /></DashboardLayout></ProtectedRoute>} />
                    <Route path="/kanban" element={<ProtectedRoute><DashboardLayout><Kanban /></DashboardLayout></ProtectedRoute>} />
                    <Route path="/fornecedores" element={<ProtectedRoute><DashboardLayout><Fornecedores /></DashboardLayout></ProtectedRoute>} />
                    <Route path="/fornecedores/:id" element={<ProtectedRoute><DashboardLayout><FornecedorDetalhes /></DashboardLayout></ProtectedRoute>} />
                    <Route path="/usuarios" element={<ProtectedRoute><DashboardLayout><Usuarios /></DashboardLayout></ProtectedRoute>} />
                    <Route path="/templates" element={<ProtectedRoute><DashboardLayout><Templates /></DashboardLayout></ProtectedRoute>} />
                    <Route path="/alertas" element={<ProtectedRoute><DashboardLayout><Alertas /></DashboardLayout></ProtectedRoute>} />
                    <Route path="/calendario" element={<ProtectedRoute><DashboardLayout><Calendario /></DashboardLayout></ProtectedRoute>} />
                    <Route path="/obrigacoes" element={<ProtectedRoute><DashboardLayout><Obrigacoes /></DashboardLayout></ProtectedRoute>} />
                    <Route path="/workflows" element={<ProtectedRoute><DashboardLayout><WorkflowAprovacoes /></DashboardLayout></ProtectedRoute>} />
                    <Route path="/workflows/builder" element={<ProtectedRoute><DashboardLayout><WorkflowBuilder /></DashboardLayout></ProtectedRoute>} />
                    <Route path="/forms/builder" element={<ProtectedRoute><DashboardLayout><FormBuilder /></DashboardLayout></ProtectedRoute>} />
                    <Route path="/aprovacoes" element={<ProtectedRoute><DashboardLayout><MinhasAprovacoes /></DashboardLayout></ProtectedRoute>} />
                    <Route path="/servicos" element={<ProtectedRoute><DashboardLayout><Servicos /></DashboardLayout></ProtectedRoute>} />
                    <Route path="/unidades" element={<ProtectedRoute><DashboardLayout><Unidades /></DashboardLayout></ProtectedRoute>} />
                    <Route path="/especificacoes" element={<ProtectedRoute><DashboardLayout><EspecificacoesServico /></DashboardLayout></ProtectedRoute>} />
                    <Route path="/custos" element={<ProtectedRoute><DashboardLayout><Custos /></DashboardLayout></ProtectedRoute>} />
                    <Route path="/signature-settings" element={<ProtectedRoute><DashboardLayout><SignatureSettings /></DashboardLayout></ProtectedRoute>} />
                    <Route path="/notification-settings" element={<ProtectedRoute><DashboardLayout><NotificationSettings /></DashboardLayout></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><DashboardLayout><Settings /></DashboardLayout></ProtectedRoute>} />
                    <Route path="/settings/2fa" element={<ProtectedRoute requireOrg={false}><TwoFactorSettings /></ProtectedRoute>} />
                    <Route path="/audit-logs" element={<ProtectedRoute><DashboardLayout><AuditLogs /></DashboardLayout></ProtectedRoute>} />
                    <Route path="/relatorios" element={<ProtectedRoute><DashboardLayout><Relatorios /></DashboardLayout></ProtectedRoute>} />
                    <Route path="/dashboard-ia" element={<ProtectedRoute><DashboardLayout><DashboardIA /></DashboardLayout></ProtectedRoute>} />
                    <Route path="/compliance" element={<ProtectedRoute><DashboardLayout><ComplianceLGPD /></DashboardLayout></ProtectedRoute>} />
                    <Route path="/security" element={<ProtectedRoute><DashboardLayout><SecurityDashboard /></DashboardLayout></ProtectedRoute>} />

                    {/* Organization management routes */}
                    <Route path="/organization/settings" element={<ProtectedRoute><DashboardLayout><OrganizationSettings /></DashboardLayout></ProtectedRoute>} />
                    <Route path="/organization/members" element={<ProtectedRoute><DashboardLayout><OrganizationMembers /></DashboardLayout></ProtectedRoute>} />
                    <Route path="/admin/permissoes" element={<ProtectedRoute><DashboardLayout><PermissoesAdmin /></DashboardLayout></ProtectedRoute>} />

                    {/* Help Center */}
                    <Route path="/ajuda" element={<ProtectedRoute><DashboardLayout><CentralAjuda /></DashboardLayout></ProtectedRoute>} />

                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                </AppErrorBoundary>
                <CookieBanner />
              </BrowserRouter>
            </ModuloProvider>
            </NotificationProvider>
          </OrganizationProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
