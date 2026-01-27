-- ============================================
-- FASE 1: Versionamento de Contratos + Audit Trail
-- ============================================

-- 1. Tabela de versões de contratos
CREATE TABLE public.contract_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  versao integer NOT NULL,
  snapshot jsonb NOT NULL,
  alteracoes jsonb DEFAULT '[]'::jsonb,
  motivo text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contrato_id, versao)
);

-- Índices para performance
CREATE INDEX idx_contract_versions_contrato ON public.contract_versions(contrato_id);
CREATE INDEX idx_contract_versions_created_at ON public.contract_versions(created_at DESC);

-- RLS para contract_versions
ALTER TABLE public.contract_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contract versions"
ON public.contract_versions FOR SELECT
USING (true);

CREATE POLICY "Authorized users can insert versions"
ON public.contract_versions FOR INSERT
WITH CHECK (has_any_role(auth.uid(), ARRAY['analista_juridico'::app_role, 'consultoria_juridica'::app_role, 'administrador'::app_role]));

-- 2. Tabela de logs de auditoria
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  acao text NOT NULL,
  entidade text NOT NULL,
  entidade_id uuid,
  dados_anteriores jsonb,
  dados_novos jsonb,
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices para performance e queries frequentes
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_entidade ON public.audit_logs(entidade, entidade_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_acao ON public.audit_logs(acao);

-- RLS para audit_logs (apenas admins podem ver)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs FOR SELECT
USING (has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "System can insert audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (true);

-- 3. Função para criar versão automaticamente ao atualizar contrato
CREATE OR REPLACE FUNCTION public.create_contract_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changes jsonb := '[]'::jsonb;
  field_name text;
  old_val text;
  new_val text;
BEGIN
  -- Comparar campos relevantes
  IF OLD.titulo IS DISTINCT FROM NEW.titulo THEN
    changes := changes || jsonb_build_object('campo', 'titulo', 'anterior', OLD.titulo, 'novo', NEW.titulo);
  END IF;
  
  IF OLD.descricao IS DISTINCT FROM NEW.descricao THEN
    changes := changes || jsonb_build_object('campo', 'descricao', 'anterior', OLD.descricao, 'novo', NEW.descricao);
  END IF;
  
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    changes := changes || jsonb_build_object('campo', 'status', 'anterior', OLD.status::text, 'novo', NEW.status::text);
  END IF;
  
  IF OLD.valor_total IS DISTINCT FROM NEW.valor_total THEN
    changes := changes || jsonb_build_object('campo', 'valor_total', 'anterior', OLD.valor_total::text, 'novo', NEW.valor_total::text);
  END IF;
  
  IF OLD.data_inicio IS DISTINCT FROM NEW.data_inicio THEN
    changes := changes || jsonb_build_object('campo', 'data_inicio', 'anterior', OLD.data_inicio::text, 'novo', NEW.data_inicio::text);
  END IF;
  
  IF OLD.data_fim IS DISTINCT FROM NEW.data_fim THEN
    changes := changes || jsonb_build_object('campo', 'data_fim', 'anterior', OLD.data_fim::text, 'novo', NEW.data_fim::text);
  END IF;
  
  IF OLD.fornecedor_id IS DISTINCT FROM NEW.fornecedor_id THEN
    changes := changes || jsonb_build_object('campo', 'fornecedor_id', 'anterior', OLD.fornecedor_id::text, 'novo', NEW.fornecedor_id::text);
  END IF;
  
  IF OLD.observacoes IS DISTINCT FROM NEW.observacoes THEN
    changes := changes || jsonb_build_object('campo', 'observacoes', 'anterior', OLD.observacoes, 'novo', NEW.observacoes);
  END IF;

  -- Só criar versão se houver alterações
  IF jsonb_array_length(changes) > 0 THEN
    INSERT INTO public.contract_versions (
      contrato_id,
      versao,
      snapshot,
      alteracoes,
      created_by
    ) VALUES (
      NEW.id,
      NEW.versao,
      jsonb_build_object(
        'titulo', OLD.titulo,
        'descricao', OLD.descricao,
        'status', OLD.status,
        'tipo', OLD.tipo,
        'valor_total', OLD.valor_total,
        'moeda', OLD.moeda,
        'data_inicio', OLD.data_inicio,
        'data_fim', OLD.data_fim,
        'data_assinatura', OLD.data_assinatura,
        'fornecedor_id', OLD.fornecedor_id,
        'observacoes', OLD.observacoes,
        'tags', OLD.tags,
        'arquivo_url', OLD.arquivo_url
      ),
      changes,
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Trigger para versionamento automático
CREATE TRIGGER trigger_contract_version
BEFORE UPDATE ON public.contratos
FOR EACH ROW
EXECUTE FUNCTION public.create_contract_version();