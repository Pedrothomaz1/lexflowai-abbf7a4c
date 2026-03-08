-- =============================================================
-- TRIGGERS DE NOTIFICAÇÃO EM TEMPO REAL — LexFlow AI
-- =============================================================
-- Gera registros na tabela `notifications` automaticamente para:
--   1. Mudança de status de contrato
--   2. Nova obrigação contratual criada
--   3. Job diário: contratos vencendo em 30, 15 e 7 dias
-- =============================================================

-- ---------------------------------------------------------------
-- HELPER: notifica todos os membros ativos de uma organização
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_org_members(
  p_organization_id UUID,
  p_tipo           TEXT,
  p_titulo         TEXT,
  p_mensagem       TEXT,
  p_referencia_id  UUID DEFAULT NULL,
  p_referencia_tipo TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (
    organization_id,
    user_id,
    tipo,
    titulo,
    mensagem,
    referencia_id,
    referencia_tipo
  )
  SELECT
    p_organization_id,
    om.user_id,
    p_tipo,
    p_titulo,
    p_mensagem,
    p_referencia_id,
    p_referencia_tipo
  FROM public.organization_members om
  WHERE om.organization_id = p_organization_id
    AND om.is_active = true;
END;
$$;

-- ---------------------------------------------------------------
-- TRIGGER 1: Mudança de status do contrato
-- Dispara quando o campo `status` de um contrato é alterado
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_contrato_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  status_labels JSONB := '{
    "rascunho":     "Rascunho",
    "em_aprovacao": "Em Aprovação",
    "aprovado":     "Aprovado",
    "assinado":     "Assinado",
    "vigente":      "Vigente",
    "encerrado":    "Encerrado",
    "cancelado":    "Cancelado"
  }'::jsonb;
  label_novo TEXT;
BEGIN
  -- Só age quando status muda de fato
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  label_novo := COALESCE(status_labels ->> NEW.status::text, NEW.status::text);

  PERFORM public.notify_org_members(
    NEW.organization_id,
    'status_change',
    'Contrato atualizado: ' || NEW.titulo,
    'Status alterado para "' || label_novo || '"',
    NEW.id,
    'contrato'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contrato_status_change ON public.contratos;
CREATE TRIGGER trg_contrato_status_change
  AFTER UPDATE OF status ON public.contratos
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_contrato_status_change();

-- ---------------------------------------------------------------
-- TRIGGER 2: Nova obrigação contratual criada
-- Dispara quando um registro é inserido em contract_obligations
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_nova_obrigacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_titulo_contrato TEXT;
BEGIN
  SELECT titulo INTO v_titulo_contrato
  FROM public.contratos
  WHERE id = NEW.contrato_id;

  PERFORM public.notify_org_members(
    NEW.organization_id,
    'obrigacao',
    'Nova obrigação: ' || COALESCE(NEW.titulo, 'Sem título'),
    'Contrato: ' || COALESCE(v_titulo_contrato, 'N/D') ||
    CASE
      WHEN NEW.data_vencimento IS NOT NULL
      THEN ' · Vence em ' || to_char(NEW.data_vencimento, 'DD/MM/YYYY')
      ELSE ''
    END,
    NEW.contrato_id,
    'contrato'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_nova_obrigacao ON public.contract_obligations;
CREATE TRIGGER trg_nova_obrigacao
  AFTER INSERT ON public.contract_obligations
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_nova_obrigacao();

-- ---------------------------------------------------------------
-- TRIGGER 3: Novo contrato criado
-- Notifica os membros quando um contrato é inserido
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_novo_contrato()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notify_org_members(
    NEW.organization_id,
    'status_change',
    'Novo contrato criado',
    NEW.numero_contrato || ' · ' || NEW.titulo,
    NEW.id,
    'contrato'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_novo_contrato ON public.contratos;
CREATE TRIGGER trg_novo_contrato
  AFTER INSERT ON public.contratos
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_novo_contrato();

-- ---------------------------------------------------------------
-- FUNÇÃO 4: Job de vencimentos (chamar via pg_cron ou Edge Function)
-- Gera alertas para contratos vencendo em 30, 15 e 7 dias
-- Executar 1x por dia: SELECT public.job_notificar_vencimentos();
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.job_notificar_vencimentos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  dias_alerta INT;
  msg TEXT;
BEGIN
  FOR rec IN
    SELECT
      c.id,
      c.organization_id,
      c.titulo,
      c.numero_contrato,
      c.data_fim,
      (c.data_fim::date - CURRENT_DATE) AS dias_restantes
    FROM public.contratos c
    WHERE c.status IN ('vigente', 'assinado', 'aprovado')
      AND c.data_fim IS NOT NULL
      AND (c.data_fim::date - CURRENT_DATE) IN (30, 15, 7)
  LOOP
    dias_alerta := rec.dias_restantes;
    msg := 'Vence em ' || dias_alerta || ' dia' ||
           CASE WHEN dias_alerta = 1 THEN '' ELSE 's' END ||
           ' (' || to_char(rec.data_fim::date, 'DD/MM/YYYY') || ')';

    -- Evita duplicatas: não insere se já notificou hoje para este contrato/prazo
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE referencia_id = rec.id
        AND tipo = 'vencimento'
        AND mensagem ILIKE '%' || dias_alerta || ' dia%'
        AND created_at::date = CURRENT_DATE
    ) THEN
      PERFORM public.notify_org_members(
        rec.organization_id,
        'vencimento',
        'Contrato vencendo: ' || rec.titulo,
        msg,
        rec.id,
        'contrato'
      );
    END IF;
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------
-- COMENTÁRIO FINAL
-- Para agendar o job diário de vencimentos, execute no Supabase:
--
--   SELECT cron.schedule(
--     'notificar-vencimentos-diario',
--     '0 8 * * *',   -- todo dia às 8h
--     'SELECT public.job_notificar_vencimentos()'
--   );
--
-- Requer a extensão pg_cron habilitada no projeto Supabase.
-- ---------------------------------------------------------------
