import { supabase } from "@/integrations/supabase/client";

export type AuditAction = 
  | 'view' 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'approve' 
  | 'reject' 
  | 'download' 
  | 'upload' 
  | 'sign' 
  | 'export' 
  | 'analyze';

export type AuditEntity = 
  | 'contrato' 
  | 'fornecedor' 
  | 'obrigacao' 
  | 'anexo' 
  | 'assinatura' 
  | 'aprovacao'
  | 'comentario'
  | 'servico'
  | 'unidade'
  | 'usuario'
  | 'template'
  | 'alerta';

interface AuditLogParams {
  acao: AuditAction;
  entidade: AuditEntity;
  entidade_id?: string;
  dados_anteriores?: Record<string, any>;
  dados_novos?: Record<string, any>;
  metadata?: Record<string, any>;
}

export const useAuditLog = () => {
  const logAction = async ({
    acao,
    entidade,
    entidade_id,
    dados_anteriores,
    dados_novos,
    metadata = {},
  }: AuditLogParams): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Capturar informações do navegador
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null;
      
      const { error } = await supabase.from('audit_logs').insert({
        user_id: user?.id || null,
        acao,
        entidade,
        entidade_id: entidade_id || null,
        dados_anteriores: dados_anteriores || null,
        dados_novos: dados_novos || null,
        user_agent: userAgent,
        metadata: {
          ...metadata,
          url: typeof window !== 'undefined' ? window.location.pathname : null,
          timestamp_local: new Date().toISOString(),
        },
      });

      if (error) {
        console.error('Erro ao registrar log de auditoria:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao registrar log de auditoria:', error);
      return false;
    }
  };

  const logView = (entidade: AuditEntity, entidade_id: string, metadata?: Record<string, any>) =>
    logAction({ acao: 'view', entidade, entidade_id, metadata });

  const logCreate = (entidade: AuditEntity, entidade_id: string, dados_novos: Record<string, any>) =>
    logAction({ acao: 'create', entidade, entidade_id, dados_novos });

  const logUpdate = (
    entidade: AuditEntity, 
    entidade_id: string, 
    dados_anteriores: Record<string, any>, 
    dados_novos: Record<string, any>
  ) =>
    logAction({ acao: 'update', entidade, entidade_id, dados_anteriores, dados_novos });

  const logDelete = (entidade: AuditEntity, entidade_id: string, dados_anteriores: Record<string, any>) =>
    logAction({ acao: 'delete', entidade, entidade_id, dados_anteriores });

  const logApprove = (entidade: AuditEntity, entidade_id: string, metadata?: Record<string, any>) =>
    logAction({ acao: 'approve', entidade, entidade_id, metadata });

  const logReject = (entidade: AuditEntity, entidade_id: string, metadata?: Record<string, any>) =>
    logAction({ acao: 'reject', entidade, entidade_id, metadata });

  const logDownload = (entidade: AuditEntity, entidade_id: string, metadata?: Record<string, any>) =>
    logAction({ acao: 'download', entidade, entidade_id, metadata });

  const logUpload = (entidade: AuditEntity, entidade_id: string, dados_novos: Record<string, any>) =>
    logAction({ acao: 'upload', entidade, entidade_id, dados_novos });

  const logExport = (entidade: AuditEntity, entidade_id?: string, metadata?: Record<string, any>) =>
    logAction({ acao: 'export', entidade, entidade_id, metadata });

  const logAnalyze = (entidade: AuditEntity, entidade_id: string, metadata?: Record<string, any>) =>
    logAction({ acao: 'analyze', entidade, entidade_id, metadata });

  return {
    logAction,
    logView,
    logCreate,
    logUpdate,
    logDelete,
    logApprove,
    logReject,
    logDownload,
    logUpload,
    logExport,
    logAnalyze,
  };
};
