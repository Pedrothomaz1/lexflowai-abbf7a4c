import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { handleDbError } from "@/utils/dbErrorHandler";

export interface ContractVersion {
  id: string;
  contrato_id: string;
  versao: number;
  snapshot: Record<string, any>;
  alteracoes: Array<{
    campo: string;
    anterior: string | null;
    novo: string | null;
  }>;
  motivo: string | null;
  created_by: string | null;
  created_at: string;
}

export const useVersioning = (contratoId: string) => {
  const { toast } = useToast();
  const [versions, setVersions] = useState<ContractVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<ContractVersion | null>(null);

  const fetchVersions = async () => {
    if (!contratoId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contract_versions')
        .select('*')
        .eq('contrato_id', contratoId)
        .order('versao', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      // Parse JSONB fields properly
      const parsedVersions = (data || []).map(v => ({
        ...v,
        snapshot: typeof v.snapshot === 'string' ? JSON.parse(v.snapshot) : v.snapshot,
        alteracoes: typeof v.alteracoes === 'string' ? JSON.parse(v.alteracoes) : (v.alteracoes || []),
      }));
      
      setVersions(parsedVersions);
    } catch (error: any) {
      console.error('Erro ao buscar versões:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar histórico",
        description: handleDbError(error).message,
      });
    } finally {
      setLoading(false);
    }
  };

  const restoreVersion = async (version: ContractVersion): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Incrementar versão atual do contrato
      const { data: currentContract, error: fetchError } = await supabase
        .from('contratos')
        .select('versao')
        .eq('id', contratoId)
        .single();

      if (fetchError) throw fetchError;

      const newVersion = (currentContract?.versao || 1) + 1;

      // Atualizar contrato com dados da versão selecionada
      const { error: updateError } = await supabase
        .from('contratos')
        .update({
          titulo: version.snapshot.titulo,
          descricao: version.snapshot.descricao,
          status: version.snapshot.status,
          tipo: version.snapshot.tipo,
          valor_total: version.snapshot.valor_total,
          moeda: version.snapshot.moeda,
          data_inicio: version.snapshot.data_inicio,
          data_fim: version.snapshot.data_fim,
          data_assinatura: version.snapshot.data_assinatura,
          fornecedor_id: version.snapshot.fornecedor_id,
          observacoes: version.snapshot.observacoes,
          tags: version.snapshot.tags,
          arquivo_url: version.snapshot.arquivo_url,
          versao: newVersion,
        })
        .eq('id', contratoId);

      if (updateError) throw updateError;

      toast({
        title: "Versão restaurada!",
        description: `Contrato restaurado para a versão ${version.versao}.`,
      });

      await fetchVersions();
      return true;
    } catch (error: any) {
      console.error('Erro ao restaurar versão:', error);
      toast({
        variant: "destructive",
        title: "Erro ao restaurar",
        description: handleDbError(error).message,
      });
      return false;
    }
  };

  const compareVersions = (v1: ContractVersion, v2: ContractVersion) => {
    const changes: Array<{
      campo: string;
      v1: string | null;
      v2: string | null;
    }> = [];

    const campos = [
      'titulo', 'descricao', 'status', 'tipo', 'valor_total', 
      'moeda', 'data_inicio', 'data_fim', 'observacoes'
    ];

    campos.forEach(campo => {
      const val1 = v1.snapshot[campo];
      const val2 = v2.snapshot[campo];
      if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        changes.push({
          campo,
          v1: val1?.toString() || null,
          v2: val2?.toString() || null,
        });
      }
    });

    return changes;
  };

  return {
    versions,
    loading,
    selectedVersion,
    setSelectedVersion,
    fetchVersions,
    restoreVersion,
    compareVersions,
  };
};
