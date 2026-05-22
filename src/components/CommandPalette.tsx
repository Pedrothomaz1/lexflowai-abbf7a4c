import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import {
  FileText,
  Users,
  FileStack,
  ClipboardList,
  FileInput,
  Plus,
  CheckCircle2,
  LayoutDashboard,
} from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ResultGroup {
  contratos: Array<{ id: string; titulo: string; numero_contrato: string }>;
  fornecedores: Array<{ id: string; nome: string; cnpj: string | null }>;
  obrigacoes: Array<{ id: string; titulo: string; contrato_id: string }>;
  requisicoes: Array<{ id: string; numero_requisicao: string; titulo: string | null }>;
  templates: Array<{ id: string; nome: string }>;
}

const EMPTY: ResultGroup = {
  contratos: [],
  fornecedores: [],
  obrigacoes: [],
  requisicoes: [],
  templates: [],
};

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResultGroup>(EMPTY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults(EMPTY);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults(EMPTY);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      setLoading(true);
      const q = `%${query.trim()}%`;
      const [contratos, fornecedores, obrigacoes, requisicoes, templates] = await Promise.all([
        supabase
          .from("contratos")
          .select("id, titulo, numero_contrato")
          .or(`titulo.ilike.${q},numero_contrato.ilike.${q}`)
          .limit(5),
        supabase
          .from("fornecedores")
          .select("id, nome, cnpj")
          .or(`nome.ilike.${q},cnpj.ilike.${q}`)
          .limit(5),
        supabase
          .from("contract_obligations")
          .select("id, titulo, contrato_id")
          .ilike("titulo", q)
          .limit(5),
        supabase
          .from("contract_requests")
          .select("id, numero_requisicao, titulo")
          .or(`titulo.ilike.${q},numero_requisicao.ilike.${q}`)
          .limit(5),
        supabase.from("document_templates").select("id, nome").ilike("nome", q).limit(5),
      ]);

      if (cancelled) return;
      setResults({
        contratos: contratos.data ?? [],
        fornecedores: fornecedores.data ?? [],
        obrigacoes: obrigacoes.data ?? [],
        requisicoes: requisicoes.data ?? [],
        templates: templates.data ?? [],
      });
      setLoading(false);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query]);

  const go = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  const totalResults =
    results.contratos.length +
    results.fornecedores.length +
    results.obrigacoes.length +
    results.requisicoes.length +
    results.templates.length;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Buscar contratos, fornecedores, obrigações..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {query.trim().length < 2 && (
          <>
            <CommandGroup heading="Ações rápidas">
              <CommandItem onSelect={() => go("/dashboard")}>
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Ir para o Dashboard
              </CommandItem>
              <CommandItem onSelect={() => go("/contratos?novo=true")}>
                <Plus className="h-4 w-4 mr-2" />
                Novo contrato
              </CommandItem>
              <CommandItem onSelect={() => go("/requisicoes")}>
                <FileInput className="h-4 w-4 mr-2" />
                Nova requisição
              </CommandItem>
              <CommandItem onSelect={() => go("/workflows")}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Ir para Aprovações
              </CommandItem>
            </CommandGroup>
          </>
        )}

        {query.trim().length >= 2 && totalResults === 0 && !loading && (
          <CommandEmpty>Nenhum resultado para "{query}".</CommandEmpty>
        )}

        {loading && (
          <div className="py-6 text-center text-xs text-muted-foreground">Buscando…</div>
        )}

        {results.contratos.length > 0 && (
          <CommandGroup heading="Contratos">
            {results.contratos.map((c) => (
              <CommandItem key={c.id} onSelect={() => go(`/contratos/${c.id}`)}>
                <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="font-medium">{c.titulo}</span>
                <span className="ml-2 text-xs text-muted-foreground">{c.numero_contrato}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.fornecedores.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Fornecedores">
              {results.fornecedores.map((f) => (
                <CommandItem key={f.id} onSelect={() => go(`/fornecedores/${f.id}`)}>
                  <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="font-medium">{f.nome}</span>
                  {f.cnpj && (
                    <span className="ml-2 text-xs text-muted-foreground">{f.cnpj}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {results.obrigacoes.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Obrigações">
              {results.obrigacoes.map((o) => (
                <CommandItem key={o.id} onSelect={() => go(`/contratos/${o.contrato_id}`)}>
                  <ClipboardList className="h-4 w-4 mr-2 text-muted-foreground" />
                  {o.titulo}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {results.requisicoes.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Requisições">
              {results.requisicoes.map((r) => (
                <CommandItem key={r.id} onSelect={() => go(`/requisicoes`)}>
                  <FileInput className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="font-medium">{r.titulo ?? r.numero_requisicao}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{r.numero_requisicao}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {results.templates.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Modelos">
              {results.templates.map((t) => (
                <CommandItem key={t.id} onSelect={() => go(`/templates`)}>
                  <FileStack className="h-4 w-4 mr-2 text-muted-foreground" />
                  {t.nome}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
