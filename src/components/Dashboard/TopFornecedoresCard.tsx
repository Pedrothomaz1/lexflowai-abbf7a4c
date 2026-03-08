import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Fornecedor {
  nome: string;
  valor: number;
  count: number;
}

interface TopFornecedoresCardProps {
  topFornecedores: Fornecedor[];
  onNavigate: (path: string) => void;
}

function formatCompactCurrency(value: number) {
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}K`;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function TopFornecedoresCard({ topFornecedores, onNavigate }: TopFornecedoresCardProps) {
  return (
    <Card className="card-elevated lg:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4 text-primary" />
          Top Fornecedores
        </CardTitle>
        <CardDescription className="text-xs">Por valor de contratos</CardDescription>
      </CardHeader>
      <CardContent>
        {topFornecedores.length > 0 ? (
          <div className="space-y-3">
            {topFornecedores.map((fornecedor, index) => {
              const maxValor = topFornecedores[0]?.valor || 1;
              const percentual = (fornecedor.valor / maxValor) * 100;
              return (
                <div key={index} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={cn(
                          "h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0",
                          index === 0
                            ? "bg-warning/20 text-warning"
                            : index === 1
                            ? "bg-muted text-muted-foreground"
                            : "bg-muted/50 text-muted-foreground"
                        )}
                      >
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{fornecedor.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {fornecedor.count} contrato{fornecedor.count > 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold shrink-0">
                      {formatCompactCurrency(fornecedor.valor)}
                    </span>
                  </div>
                  <Progress value={percentual} className="h-1" />
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="Adicione seus fornecedores"
            description="Cadastre fornecedores para acompanhar o valor dos contratos por parceiro."
            action={{ label: "Ir para Fornecedores", onClick: () => onNavigate("/fornecedores") }}
          />
        )}
      </CardContent>
    </Card>
  );
}
