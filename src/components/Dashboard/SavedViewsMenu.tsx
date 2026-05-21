import { useState } from "react";
import { Bookmark, BookmarkPlus, Trash2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useSavedViews, type SavedView } from "@/hooks/useSavedViews";
import { toast } from "sonner";
import type { DashboardFilters } from "@/hooks/useDashboardFilters";

interface Props {
  currentFilters: DashboardFilters;
  onApply: (filtros: Record<string, any>) => void;
}

export function SavedViewsMenu({ currentFilters, onApply }: Props) {
  const { savedViews, create, remove } = useSavedViews();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [isShared, setIsShared] = useState(false);

  const handleSave = async () => {
    if (!nome.trim()) return;
    try {
      await create.mutateAsync({ nome: nome.trim(), filtros: currentFilters, is_shared: isShared });
      toast.success("Visualização salva");
      setOpen(false); setNome(""); setIsShared(false);
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            <Bookmark className="h-4 w-4 mr-2" />
            Visualizações
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
            Salvas
          </DropdownMenuLabel>
          {savedViews.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              Nenhuma visualização salva
            </div>
          ) : savedViews.map((v: SavedView) => (
            <DropdownMenuItem
              key={v.id}
              onSelect={() => onApply(v.filtros)}
              className="flex items-center justify-between group"
            >
              <span className="flex items-center gap-1.5 truncate">
                {v.is_shared && <Share2 className="h-3 w-3 text-muted-foreground shrink-0" />}
                <span className="truncate">{v.nome}</span>
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); remove.mutate(v.id); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="ghost" className="h-9">
            <BookmarkPlus className="h-4 w-4 mr-2" />
            Salvar
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Salvar visualização</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="vname">Nome</Label>
              <Input
                id="vname"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Contratos vencendo este mês"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="shared" checked={isShared} onCheckedChange={(v) => setIsShared(!!v)} />
              <Label htmlFor="shared" className="text-sm font-normal cursor-pointer">
                Compartilhar com toda a organização
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!nome.trim() || create.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
