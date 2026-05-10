
DO $$
DECLARE
  founder_id uuid := '3cac2588-c981-45c9-8f6b-710c6bd3ac1b';
BEGIN
  SET session_replication_role = 'replica';

  DELETE FROM public.contract_attachments;
  DELETE FROM public.contract_comments;
  DELETE FROM public.contract_approvals;
  DELETE FROM public.contract_signatures;
  DELETE FROM public.contract_history;
  DELETE FROM public.contract_versions;
  DELETE FROM public.contract_redlines;
  DELETE FROM public.contract_obligations;
  DELETE FROM public.contract_alerts;
  DELETE FROM public.contract_analysis;
  DELETE FROM public.contract_templates;
  DELETE FROM public.contract_requests;
  DELETE FROM public.contratos;
  DELETE FROM public.fornecedor_anexos;
  DELETE FROM public.fornecedor_categorias_servico;
  DELETE FROM public.cnpj_verification_log;
  DELETE FROM public.fornecedores;
  DELETE FROM public.servico_historico;
  DELETE FROM public.servicos_periodicos;
  DELETE FROM public.especificacoes_servico;
  DELETE FROM public.solicitacoes_compras;
  DELETE FROM public.franquias;
  DELETE FROM public.unidades;
  DELETE FROM public.approval_workflows;
  DELETE FROM public.sod_approvals;
  DELETE FROM public.go_nogo_checklist;
  DELETE FROM public.incident_playbooks;
  DELETE FROM public.data_retention_policies;
  DELETE FROM public.report_configurations;
  DELETE FROM public.negotiation_metrics;
  DELETE FROM public.integracao_config;
  DELETE FROM public.uso_sistema;
  DELETE FROM public.pre_launch_test_runs;
  DELETE FROM public.notifications;
  DELETE FROM public.notification_preferences;
  DELETE FROM public.security_alerts;
  DELETE FROM public.security_metrics;
  DELETE FROM public.audit_logs;
  DELETE FROM public.compliance_logs;
  DELETE FROM public.login_attempts;
  DELETE FROM public.user_sessions;
  DELETE FROM public.user_2fa_settings;
  DELETE FROM public.rate_limits;
  DELETE FROM public.enterprise_leads;
  DELETE FROM public.mfa_requirements;
  DELETE FROM public.organization_invites;
  DELETE FROM public.organization_members;
  DELETE FROM public.user_roles;
  DELETE FROM public.organizations;
  DELETE FROM public.profiles WHERE id <> founder_id;
  DELETE FROM auth.users WHERE id <> founder_id;

  SET session_replication_role = 'origin';
END $$;
