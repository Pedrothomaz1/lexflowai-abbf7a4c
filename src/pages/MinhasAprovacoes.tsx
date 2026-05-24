import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/skeleton-loaders";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Inbox, Eye } from "lucide-react";
import { useMinhasAprovacoes, type ApprovalStep } from "@/hooks/useAprovacoes";
import { AprovacaoSlaBadge } from "@/components/Aprovacoes/AprovacaoSlaBadge";
import { AprovacaoDecisionDialog } from "@/components/Aprovacoes/AprovacaoDecisionDialog";
import { SlaAlertBanner } from "@/components/Aprovacoes/SlaAlertBanner";

export default function MinhasAprovacoes() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"pendentes" | "decididas" | "todas">("pendentes");
  const [selectedStep, setSelectedStep] = useState<ApprovalStep | null>(null);
  const { data: steps, isLoading } = useMinhasAprovacoes(tab);

  if (isLoading) return <PageSkeleton />;

  const columns: DataTableColumn<ApprovalStep>[] = [
    {
      key: "contratos",
      header: "Contrato",
      render: (_, row) => (
        <div className="space-y-0.5">
          <div className="font-medium text-sm">{row.contratos?.titulo || "—"}</div>
          <div className="text-xs text-muted-foreground">
            {row.contratos?.numero_contrato} • {row.contratos?.fornecedores?.nome || "Sem fornecedor"}
          </div>
        </div>
      ),
    },
    {
      key: "modo",
      header: "Modo",
      render: (_, row) => (
        <Badge variant="outline">
          {row.modo === "serie" ? `Série · ordem ${row.ordem}` : `Paralelo · mín. ${row.minimo_aprovacoes}`}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (_, row) => {
        const map: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
          pendente: "outline", aprovado: "default", rejeitado: "destructive", cancelado: "secondary",
        };
        return <Badge variant={map[row.status] ?? "outline"}>{row.status}</Badge>;
      },
    },
    {
      key: "due_at",
      header: "SLA",
      render: (_, row) => <AprovacaoSlaBadge dueAt={row.due_at} status={row.status} />,
    },
    {
      key: "created_at",
      header: "Criado em",
      render: (v) => <span className="text-xs text-muted-foreground">{format(new Date(v), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>,
    },
    {
      key: "id",
      header: "",
      render: (_, row) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/contratos/${row.contrato_id}`)} title="Ver contrato">
            <Eye className="h-4 w-4" />
          </Button>
          {row.status === "pendente" && (
            <Button size="sm" onClick={() => setSelectedStep(row)}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Decidir
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Minhas Aprovações"
        description="Fila de contratos aguardando sua decisão. Aprovação obrigatória antes da assinatura."
      />

      <SlaAlertBanner steps={steps} />

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
          <TabsTrigger value="decididas">Decididas</TabsTrigger>
          <TabsTrigger value="todas">Todas</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {!steps || steps.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Nada por aqui"
              description={tab === "pendentes" ? "Sem aprovações pendentes para você." : "Sem registros."}
            />
          ) : (
            <DataTable data={steps} columns={columns} />
          )}
        </TabsContent>
      </Tabs>

      {selectedStep && (
        <AprovacaoDecisionDialog
          open={!!selectedStep}
          onOpenChange={(o) => !o && setSelectedStep(null)}
          stepId={selectedStep.id}
          contratoTitulo={selectedStep.contratos?.titulo}
        />
      )}
    </div>
  );
}
