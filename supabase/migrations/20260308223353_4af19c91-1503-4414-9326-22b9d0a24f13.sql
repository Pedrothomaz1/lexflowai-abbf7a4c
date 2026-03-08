
-- =============================================
-- PASSO 2: Funções helper e triggers de notificação
-- =============================================

-- Helper: insere notificação para todos os membros ativos da org
CREATE OR REPLACE FUNCTION public.notify_org_members(
  _org_id UUID,
  _tipo TEXT,
  _titulo TEXT,
  _mensagem TEXT DEFAULT NULL,
  _referencia_id UUID DEFAULT NULL,
  _referencia_tipo TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (organization_id, user_id, tipo, titulo, mensagem, referencia_id, referencia_tipo)
  SELECT _org_id, om.user_id, _tipo, _titulo, _mensagem, _referencia_id, _referencia_tipo
  FROM public.organization_members om
  WHERE om.organization_id = _org_id AND om.is_active = true;
END;
$$;

-- Trigger: mudança de status de contrato
CREATE OR REPLACE FUNCTION public.trg_contrato_status_change_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM notify_org_members(
      NEW.organization_id,
      'status_change',
      'Status alterado: ' || NEW.titulo,
      'O contrato ' || NEW.numero_contrato || ' mudou de "' || OLD.status || '" para "' || NEW.status || '".',
      NEW.id,
      'contrato'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_contrato_status_change
  AFTER UPDATE ON public.contratos
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_contrato_status_change_fn();

-- Trigger: nova obrigação
CREATE OR REPLACE FUNCTION public.trg_nova_obrigacao_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM notify_org_members(
    NEW.organization_id,
    'obrigacao',
    'Nova obrigação: ' || NEW.titulo,
    'Obrigação "' || NEW.titulo || '" com vencimento em ' || NEW.data_vencimento || '.',
    NEW.contrato_id,
    'contrato'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_nova_obrigacao
  AFTER INSERT ON public.contract_obligations
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_nova_obrigacao_fn();

-- Trigger: novo contrato
CREATE OR REPLACE FUNCTION public.trg_novo_contrato_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM notify_org_members(
    NEW.organization_id,
    'geral',
    'Novo contrato: ' || NEW.titulo,
    'O contrato ' || NEW.numero_contrato || ' foi cadastrado no sistema.',
    NEW.id,
    'contrato'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_novo_contrato
  AFTER INSERT ON public.contratos
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_novo_contrato_fn();

-- Atualizar job_notificar_vencimentos para também inserir na tabela notifications
CREATE OR REPLACE FUNCTION public.job_notificar_vencimentos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.id AS contrato_id, c.titulo, c.numero_contrato, c.data_fim, c.organization_id,
           (c.data_fim - CURRENT_DATE) AS dias_restantes
    FROM contratos c
    WHERE c.data_fim IS NOT NULL
      AND c.data_fim BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')
      AND c.status NOT IN ('cancelado', 'encerrado')
      AND NOT EXISTS (
        SELECT 1 FROM contract_alerts ca
        WHERE ca.contrato_id = c.id
          AND ca.tipo_alerta = 'vencimento'
          AND ca.created_at > (NOW() - INTERVAL '7 days')
      )
  LOOP
    -- Inserir alerta na tabela contract_alerts
    INSERT INTO contract_alerts (
      contrato_id, organization_id, tipo_alerta, titulo, mensagem, data_alerta, dias_antecedencia
    ) VALUES (
      r.contrato_id, r.organization_id, 'vencimento',
      'Contrato próximo do vencimento: ' || r.titulo,
      'O contrato ' || r.numero_contrato || ' vence em ' || r.dias_restantes || ' dias.',
      r.data_fim, r.dias_restantes
    );

    -- Também notificar membros via notifications
    PERFORM notify_org_members(
      r.organization_id,
      'vencimento',
      'Vencimento em ' || r.dias_restantes || ' dias: ' || r.titulo,
      'O contrato ' || r.numero_contrato || ' vence em ' || r.data_fim || '.',
      r.contrato_id,
      'contrato'
    );
  END LOOP;
END;
$$;
