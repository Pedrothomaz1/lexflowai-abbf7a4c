-- Garante extensão pg_net (já habilitada em outras migrações, idempotente).
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Função SECURITY DEFINER que chama o wrapper auto-notificar-financeiro.
CREATE OR REPLACE FUNCTION public.trigger_notify_finance_on_signature()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text := 'https://dxllojjazxizuylbmezc.supabase.co/functions/v1/auto-notificar-financeiro';
BEGIN
  -- Só dispara quando status muda PARA 'assinado' e ainda não foi notificado.
  IF NEW.status = 'assinado'
     AND (OLD.status IS DISTINCT FROM NEW.status)
     AND NEW.email_financeiro_notificado_em IS NULL
  THEN
    PERFORM net.http_post(
      url := v_url,
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('contratoId', NEW.id::text)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_finance_on_signature ON public.contratos;

CREATE TRIGGER trg_notify_finance_on_signature
AFTER UPDATE OF status ON public.contratos
FOR EACH ROW
EXECUTE FUNCTION public.trigger_notify_finance_on_signature();

COMMENT ON FUNCTION public.trigger_notify_finance_on_signature() IS
  'Fase E intake: dispara notificação financeira via edge function auto-notificar-financeiro quando contrato muda para status=assinado. Idempotente via coluna email_financeiro_notificado_em.';