import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DashboardLayout } from "./components/DashboardLayout";
import { ModuloProvider } from "./contexts/ModuloContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <ModuloProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/seletor-modulo" element={<ProtectedRoute><SeletorModulo /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout><Dashboard /></DashboardLayout></ProtectedRoute>} />
              <Route path="/contratos" element={<ProtectedRoute><DashboardLayout><Contratos /></DashboardLayout></ProtectedRoute>} />
              <Route path="/contratos/:id" element={<ProtectedRoute><DashboardLayout><ContratoDetalhes /></DashboardLayout></ProtectedRoute>} />
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
              <Route path="/audit-logs" element={<ProtectedRoute><DashboardLayout><AuditLogs /></DashboardLayout></ProtectedRoute>} />
              <Route path="/relatorios" element={<ProtectedRoute><DashboardLayout><Relatorios /></DashboardLayout></ProtectedRoute>} />
              <Route path="/compliance" element={<ProtectedRoute><DashboardLayout><ComplianceLGPD /></DashboardLayout></ProtectedRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ModuloProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
