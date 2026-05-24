-- ============================================================
-- Hardening: revoke EXECUTE on SECURITY DEFINER functions
-- ============================================================
-- Estratégia:
--   1. Revogar EXECUTE de PUBLIC e anon em TODAS as funções SECURITY DEFINER em public.
--   2. Revogar EXECUTE de authenticated em funções internas (triggers, cron, helpers
--      chamados apenas por outras funções/edge service_role).
--   3. Re-conceder EXECUTE a service_role nas funções chamadas por edge functions/cron,
--      garantindo que jobs e edges sigam funcionando.
-- Funções de RLS (current_user_org, has_role, has_permission, is_admin, etc.) e RPCs
-- frontend (dash_*, accept_invite, get_user_organization_status, super admin actions,
-- gdpr_delete_user, etc.) PERMANECEM executáveis por authenticated.
-- Triggers continuam funcionando: a engine de triggers executa a função independente
-- de grants.
-- ============================================================

-- 1) Revoga em massa de PUBLIC e anon
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
  END LOOP;
END $$;

-- 2) Revoga de authenticated em funções internas (não chamadas via PostgREST)
REVOKE EXECUTE ON FUNCTION public.audit_trigger_func() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_novo_contrato_fn() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_contrato_status_change_fn() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_nova_obrigacao_fn() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.create_contract_version() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_contract_request_number() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_approval_decision_motivo() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_contrato_imutavel() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_org_max_usuarios() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_org_members(uuid, text, text, text, uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.job_notificar_vencimentos() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_rate_limits() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.record_login_attempt(text, boolean, uuid, inet, text, text) FROM authenticated;

-- 3) Garante service_role nas funções chamadas por edge functions / cron
GRANT EXECUTE ON FUNCTION public.notify_org_members(uuid, text, text, text, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.job_notificar_vencimentos() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_rate_limits() TO service_role;
GRANT EXECUTE ON FUNCTION public.record_login_attempt(text, boolean, uuid, inet, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.gdpr_delete_user(uuid) TO service_role;