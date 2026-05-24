import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

const CATEGORIAS = [
  { value: "seguranca", label: "Segurança", color: "bg-red-500" },
  { value: "manutencao", label: "Manutenção", color: "bg-blue-500" },
  { value: "higiene", label: "Higiene", color: "bg-green-500" },
  { value: "infraestrutura", label: "Infraestrutura", color: "bg-yellow-500" },
  { value: "veiculos", label: "Veículos", color: "bg-purple-500" },
  { value: "outros", label: "Outros", color: "bg-gray-500" },
];

interface FornecedorCategoriasProps {
  fornecedorId?: string;
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  readOnly?: boolean;
}

export function FornecedorCategorias({
  fornecedorId,
  selectedCategories,
  onCategoriesChange,
  readOnly = false,
}: FornecedorCategoriasProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (fornecedorId) {
      fetchCategories();
    }
  }, [fornecedorId]);

  const fetchCategories = async () => {
    if (!fornecedorId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("fornecedor_categorias_servico")
        .select("categoria")
        .eq("fornecedor_id", fornecedorId);

      if (error) throw error;

      const categories = data?.map((c) => c.categoria) || [];
      onCategoriesChange(categories);
    } catch (error: any) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (categoria: string) => {
    if (readOnly) return;

    const newCategories = selectedCategories.includes(categoria)
      ? selectedCategories.filter((c) => c !== categoria)
      : [...selectedCategories, categoria];

    onCategoriesChange(newCategories);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (readOnly) {
    return (
      <div className="flex flex-wrap gap-2">
        {selectedCategories.length === 0 ? (
          <span className="text-sm text-muted-foreground">Nenhuma categoria</span>
        ) : (
          selectedCategories.map((cat) => {
            const categoria = CATEGORIAS.find((c) => c.value === cat);
            return (
              <Badge key={cat} variant="secondary">
                {categoria?.label || cat}
              </Badge>
            );
          })
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Tipos de Serviço</Label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {CATEGORIAS.map((categoria) => (
          <div
            key={categoria.value}
            className="flex items-center space-x-2 p-2 rounded-md border hover:bg-muted/50 transition-colors"
          >
            <Checkbox
              id={`cat-${categoria.value}`}
              checked={selectedCategories.includes(categoria.value)}
              onCheckedChange={() => handleToggle(categoria.value)}
            />
            <Label
              htmlFor={`cat-${categoria.value}`}
              className="text-sm cursor-pointer flex items-center gap-2"
            >
              <span
                className={`h-2 w-2 rounded-full ${categoria.color}`}
              />
              {categoria.label}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper para salvar categorias
export async function saveFornecedorCategorias(
  fornecedorId: string,
  categories: string[],
  organizationId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Remove todas as categorias existentes
    await supabase
      .from("fornecedor_categorias_servico")
      .delete()
      .eq("fornecedor_id", fornecedorId);

    // Insere as novas categorias
    if (categories.length > 0) {
      const { error } = await supabase
        .from("fornecedor_categorias_servico")
        .insert(
          categories.map((categoria) => ({
            fornecedor_id: fornecedorId,
            categoria,
            ...(organizationId && { organization_id: organizationId }),
          }))
        );

      if (error) throw error;
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error saving categories:", error);
    return { success: false, error: error.message };
  }
}
