import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DashboardLayout } from "./components/DashboardLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Contratos from "./pages/Contratos";
import ContratoDetalhes from "./pages/ContratoDetalhes";
import Kanban from "./pages/Kanban";
import Fornecedores from "./pages/Fornecedores";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
          <Route path="/contratos" element={<DashboardLayout><Contratos /></DashboardLayout>} />
          <Route path="/contratos/:id" element={<DashboardLayout><ContratoDetalhes /></DashboardLayout>} />
          <Route path="/kanban" element={<DashboardLayout><Kanban /></DashboardLayout>} />
          <Route path="/fornecedores" element={<DashboardLayout><Fornecedores /></DashboardLayout>} />
          <Route path="/usuarios" element={<DashboardLayout><Usuarios /></DashboardLayout>} />
          <Route path="/templates" element={<DashboardLayout><Templates /></DashboardLayout>} />
          <Route path="/alertas" element={<DashboardLayout><Alertas /></DashboardLayout>} />
          <Route path="/calendario" element={<DashboardLayout><Calendario /></DashboardLayout>} />
          <Route path="/obrigacoes" element={<DashboardLayout><Obrigacoes /></DashboardLayout>} />
          <Route path="/workflows" element={<DashboardLayout><WorkflowAprovacoes /></DashboardLayout>} />
          <Route path="/servicos" element={<DashboardLayout><Servicos /></DashboardLayout>} />
          <Route path="/unidades" element={<DashboardLayout><Unidades /></DashboardLayout>} />
          <Route path="/especificacoes" element={<DashboardLayout><EspecificacoesServico /></DashboardLayout>} />
          <Route path="/signature-settings" element={<DashboardLayout><SignatureSettings /></DashboardLayout>} />
          <Route path="/notification-settings" element={<DashboardLayout><NotificationSettings /></DashboardLayout>} />
          <Route path="/settings" element={<DashboardLayout><Settings /></DashboardLayout>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
