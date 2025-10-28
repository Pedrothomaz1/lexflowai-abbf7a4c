import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type FiltrosAvancados = {
  busca?: string;
  tipo?: string;
  status?: string;
  fornecedor?: string;
  valorMin?: string;
  valorMax?: string;
  dataInicioMin?: string;
  dataInicioMax?: string;
  dataFimMin?: string;
  dataFimMax?: string;
};

type Props = {
  filtros: FiltrosAvancados;
  onFiltrosChange: (filtros: FiltrosAvancados) => void;
  fornecedores?: Array<{ id: string; nome: string }>;
};

export const BuscaAvancada = ({ filtros, onFiltrosChange, fornecedores = [] }: Props) => {
  const [localFiltros, setLocalFiltros] = useState<FiltrosAvancados>(filtros);
  const [isOpen, setIsOpen] = useState(false);

  const aplicarFiltros = () => {
    onFiltrosChange(localFiltros);
    setIsOpen(false);
  };

  const limparFiltros = () => {
    const filtrosVazios: FiltrosAvancados = {};
    setLocalFiltros(filtrosVazios);
    onFiltrosChange(filtrosVazios);
  };

  const contarFiltrosAtivos = () => {
    return Object.values(filtros).filter((v) => v !== undefined && v !== "").length;
  };

  const filtrosAtivos = contarFiltrosAtivos();

  return (
    <div className="flex gap-2 items-center">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por número, título ou descrição..."
          value={localFiltros.busca || ""}
          onChange={(e) => setLocalFiltros({ ...localFiltros, busca: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              aplicarFiltros();
            }
          }}
          className="pl-10"
        />
      </div>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="relative">
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filtros Avançados
            {filtrosAtivos > 0 && (
              <Badge className="ml-2 rounded-full h-5 w-5 p-0 flex items-center justify-center">
                {filtrosAtivos}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filtros Avançados</SheetTitle>
            <SheetDescription>
              Refine sua busca com múltiplos critérios
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label>Tipo de Contrato</Label>
              <Select
                value={localFiltros.tipo || ""}
                onValueChange={(value) =>
                  setLocalFiltros({ ...localFiltros, tipo: value || undefined })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="servico">Serviço</SelectItem>
                  <SelectItem value="compra">Compra</SelectItem>
                  <SelectItem value="locacao">Locação</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={localFiltros.status || ""}
                onValueChange={(value) =>
                  setLocalFiltros({ ...localFiltros, status: value || undefined })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="em_aprovacao">Em Aprovação</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="assinado">Assinado</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="encerrado">Encerrado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {fornecedores.length > 0 && (
              <div className="space-y-2">
                <Label>Fornecedor</Label>
                <Select
                  value={localFiltros.fornecedor || ""}
                  onValueChange={(value) =>
                    setLocalFiltros({ ...localFiltros, fornecedor: value || undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os fornecedores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {fornecedores.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Valor Total</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Mínimo"
                  value={localFiltros.valorMin || ""}
                  onChange={(e) =>
                    setLocalFiltros({ ...localFiltros, valorMin: e.target.value })
                  }
                />
                <Input
                  type="number"
                  placeholder="Máximo"
                  value={localFiltros.valorMax || ""}
                  onChange={(e) =>
                    setLocalFiltros({ ...localFiltros, valorMax: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Data de Início</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={localFiltros.dataInicioMin || ""}
                  onChange={(e) =>
                    setLocalFiltros({ ...localFiltros, dataInicioMin: e.target.value })
                  }
                />
                <Input
                  type="date"
                  value={localFiltros.dataInicioMax || ""}
                  onChange={(e) =>
                    setLocalFiltros({ ...localFiltros, dataInicioMax: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Data de Fim</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={localFiltros.dataFimMin || ""}
                  onChange={(e) =>
                    setLocalFiltros({ ...localFiltros, dataFimMin: e.target.value })
                  }
                />
                <Input
                  type="date"
                  value={localFiltros.dataFimMax || ""}
                  onChange={(e) =>
                    setLocalFiltros({ ...localFiltros, dataFimMax: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={aplicarFiltros} className="flex-1">
                Aplicar Filtros
              </Button>
              <Button onClick={limparFiltros} variant="outline">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {filtrosAtivos > 0 && (
        <Button onClick={limparFiltros} variant="ghost" size="sm">
          Limpar
        </Button>
      )}
    </div>
  );
};
