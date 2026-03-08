import { Search, Filter, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const categoriaConfig: Record<string, { label: string }> = {
  seguranca: { label: "Segurança" },
  manutencao: { label: "Manutenção" },
  higiene: { label: "Higiene" },
  infraestrutura: { label: "Infraestrutura" },
  veiculos: { label: "Veículos" },
  outros: { label: "Outros" },
};

interface Unidade {
  id: string;
  nome: string;
}

interface ServicosFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  unidadeFilter: string;
  onUnidadeChange: (value: string) => void;
  categoriaFilter: string;
  onCategoriaChange: (value: string) => void;
  unidades: Unidade[];
}

export function ServicosFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  unidadeFilter,
  onUnidadeChange,
  categoriaFilter,
  onCategoriaChange,
  unidades,
}: ServicosFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4 items-center">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar serviços..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[160px]">
          <Filter className="h-4 w-4 mr-2" />
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os status</SelectItem>
          <SelectItem value="dentro_prazo">No prazo</SelectItem>
          <SelectItem value="alerta">Em alerta</SelectItem>
          <SelectItem value="vencido">Vencido</SelectItem>
          <SelectItem value="em_execucao">Em execução</SelectItem>
        </SelectContent>
      </Select>
      <Select value={unidadeFilter} onValueChange={onUnidadeChange}>
        <SelectTrigger className="w-[180px]">
          <Building2 className="h-4 w-4 mr-2" />
          <SelectValue placeholder="Unidade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas unidades</SelectItem>
          {unidades.map((u) => (
            <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={categoriaFilter} onValueChange={onCategoriaChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas categorias</SelectItem>
          {Object.entries(categoriaConfig).map(([key, val]) => (
            <SelectItem key={key} value={key}>{val.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
