import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  contratos: "Contratos",
  franquias: "Franquias",
  kanban: "Kanban",
  fornecedores: "Fornecedores",
  usuarios: "Usuários",
  templates: "Modelos",
  alertas: "Alertas",
  calendario: "Calendário",
  obrigacoes: "Obrigações",
  workflows: "Aprovações",
  servicos: "Serviços",
  unidades: "Unidades",
  especificacoes: "Especificações",
  custos: "Custos",
  settings: "Configurações",
  "audit-logs": "Histórico de Ações",
  relatorios: "Relatórios",
  compliance: "Proteção de Dados",
  security: "Segurança",
  organization: "Organização",
  members: "Membros",
  admin: "Administração",
  permissoes: "Permissões",
  ajuda: "Central de Ajuda",
  requisicoes: "Requisições",
  "super-admin": "Super Admin",
  "2fa": "2FA",
};

function isUuidLike(seg: string) {
  return /^[0-9a-f-]{8,}$/i.test(seg);
}

interface BreadcrumbsProps {
  className?: string;
}

export function Breadcrumbs({ className }: BreadcrumbsProps) {
  const { pathname } = useLocation();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments.map((seg, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    const label = isUuidLike(seg) ? "Detalhes" : LABELS[seg] ?? seg;
    return { href, label, last: i === segments.length - 1 };
  });

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "flex items-center gap-1.5 text-xs text-muted-foreground mb-4",
        className,
      )}
    >
      <Link to="/dashboard" className="hover:text-foreground transition-colors flex items-center">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {crumbs.map((c) => (
        <span key={c.href} className="flex items-center gap-1.5">
          <ChevronRight className="h-3 w-3 opacity-50" />
          {c.last ? (
            <span className="text-foreground font-medium">{c.label}</span>
          ) : (
            <Link to={c.href} className="hover:text-foreground transition-colors">
              {c.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
