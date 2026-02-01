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
  organizationId?: string;
}

export const useAuditLog = () => {
  const logAction = async ({
    acao,
    entidade,
    entidade_id,
    dados_anteriores,
    dados_novos,
    metadata = {},
    organizationId,
  }: AuditLogParams): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Obter organization_id se não foi passado
      let orgId = organizationId;
      if (!orgId && user) {
        const { data: memberData } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();
        orgId = memberData?.organization_id;
      }

      // Se não tiver organization_id, não registra (evita erro de RLS)
      if (!orgId) {
        console.warn('Audit log skipped: organization_id not found');
        return false;
      }
      
      // Capturar informações do navegador
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null;
      
      const { error } = await supabase.from('audit_logs').insert({
        user_id: user?.id || null,
        organization_id: orgId,
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

  const logView = (entidade: AuditEntity, entidade_id: string, metadata?: Record<string, any>, organizationId?: string) =>
    logAction({ acao: 'view', entidade, entidade_id, metadata, organizationId });

  const logCreate = (entidade: AuditEntity, entidade_id: string, dados_novos: Record<string, any>, organizationId?: string) =>
    logAction({ acao: 'create', entidade, entidade_id, dados_novos, organizationId });

  const logUpdate = (
    entidade: AuditEntity, 
    entidade_id: string, 
    dados_anteriores: Record<string, any>, 
    dados_novos: Record<string, any>,
    organizationId?: string
  ) =>
    logAction({ acao: 'update', entidade, entidade_id, dados_anteriores, dados_novos, organizationId });

  const logDelete = (entidade: AuditEntity, entidade_id: string, dados_anteriores: Record<string, any>, organizationId?: string) =>
    logAction({ acao: 'delete', entidade, entidade_id, dados_anteriores, organizationId });

  const logApprove = (entidade: AuditEntity, entidade_id: string, metadata?: Record<string, any>, organizationId?: string) =>
    logAction({ acao: 'approve', entidade, entidade_id, metadata, organizationId });

  const logReject = (entidade: AuditEntity, entidade_id: string, metadata?: Record<string, any>, organizationId?: string) =>
    logAction({ acao: 'reject', entidade, entidade_id, metadata, organizationId });

  const logDownload = (entidade: AuditEntity, entidade_id: string, metadata?: Record<string, any>, organizationId?: string) =>
    logAction({ acao: 'download', entidade, entidade_id, metadata, organizationId });

  const logUpload = (entidade: AuditEntity, entidade_id: string, dados_novos: Record<string, any>, organizationId?: string) =>
    logAction({ acao: 'upload', entidade, entidade_id, dados_novos, organizationId });

  const logExport = (entidade: AuditEntity, entidade_id?: string, metadata?: Record<string, any>, organizationId?: string) =>
    logAction({ acao: 'export', entidade, entidade_id, metadata, organizationId });

  const logAnalyze = (entidade: AuditEntity, entidade_id: string, metadata?: Record<string, any>, organizationId?: string) =>
    logAction({ acao: 'analyze', entidade, entidade_id, metadata, organizationId });

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
