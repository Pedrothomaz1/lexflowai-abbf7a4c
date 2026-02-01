import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DashboardLayout } from "./components/DashboardLayout";
import { ModuloProvider } from "./contexts/ModuloContext";
import { AuthProvider } from "./contexts/AuthContext";
import { OrganizationProvider } from "./contexts/OrganizationContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { CookieBanner } from "./components/CookieBanner";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Privacidade from "./pages/Privacidade";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import Contratos from "./pages/Contratos";
import ContratoDetalhes from "./pages/ContratoDetalhes";
import Kanban from "./pages/Kanban";
import Fornecedores from "./pages/Fornecedores";
import FornecedorDetalhes from "./pages/FornecedorDetalhes";
import Usuarios from "./pages/Usuarios";
import Settings from "./pages/Settings";
import Templates from "./pages/Templates";
import Alertas from "./pages/Alertas";
import Calendario from "./pages/Calendario";
import Obrigacoes from "./pages/Obrigacoes";
import WorkflowAprovacoes from "./pages/WorkflowAprovacoes";
import SignatureSettings from "./pages/SignatureSettings";
import NotificationSettings from "./pages/NotificationSettings";
import Servicos from "./pages/Servicos";
import Unidades from "./pages/Unidades";
import EspecificacoesServico from "./pages/EspecificacoesServico";
import SeletorModulo from "./pages/SeletorModulo";
import Custos from "./pages/Custos";
import AuditLogs from "./pages/AuditLogs";
import Relatorios from "./pages/Relatorios";
import ComplianceLGPD from "./pages/ComplianceLGPD";
import TwoFactorSettings from "./pages/TwoFactorSettings";
import SecurityDashboard from "./pages/SecurityDashboard";
import NotFound from "./pages/NotFound";
import RequisicaoPublica from "./pages/RequisicaoPublica";
import Requisicoes from "./pages/Requisicoes";
import Franquias from "./pages/Franquias";
import FranquiaDetalhes from "./pages/FranquiaDetalhes";
import OnboardingOrganization from "./pages/OnboardingOrganization";
import WaitingForInvite from "./pages/WaitingForInvite";
import OrganizationSettings from "./pages/OrganizationSettings";
import OrganizationMembers from "./pages/OrganizationMembers";
import AcceptInvite from "./pages/AcceptInvite";
import TermosDeUso from "./pages/TermosDeUso";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <OrganizationProvider>
            <ModuloProvider>
              <BrowserRouter>
                <Toaster />
                <Sonner />
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/privacidade" element={<Privacidade />} />
                  <Route path="/termos" element={<TermosDeUso />} />
                  <Route path="/requisicao" element={<RequisicaoPublica />} />
                  
                  {/* Organization onboarding routes */}
                  <Route path="/onboarding" element={<ProtectedRoute requireOrg={false}><OnboardingOrganization /></ProtectedRoute>} />
                  <Route path="/waiting-for-invite" element={<ProtectedRoute requireOrg={false}><WaitingForInvite /></ProtectedRoute>} />
                  <Route path="/aceitar-convite" element={<AcceptInvite />} />
                  
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
                  <Route path="/compliance" element={<ProtectedRoute><DashboardLayout><ComplianceLGPD /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/security" element={<ProtectedRoute><DashboardLayout><SecurityDashboard /></DashboardLayout></ProtectedRoute>} />
                  
                  {/* Organization management routes */}
                  <Route path="/organization/settings" element={<ProtectedRoute><DashboardLayout><OrganizationSettings /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/organization/members" element={<ProtectedRoute><DashboardLayout><OrganizationMembers /></DashboardLayout></ProtectedRoute>} />
                  
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <CookieBanner />
              </BrowserRouter>
            </ModuloProvider>
          </OrganizationProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
