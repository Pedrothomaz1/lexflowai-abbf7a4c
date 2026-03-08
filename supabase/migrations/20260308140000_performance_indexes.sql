-- =============================================================
-- ÍNDICES DE PERFORMANCE — LexFlow AI
-- =============================================================
-- Queries mais frequentes por volume de dados em produção
-- =============================================================

-- ---------------------------------------------------------------
-- contratos: filtros por organização + status + data_fim
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_contratos_org_status
  ON public.contratos (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_contratos_org_data_fim
  ON public.contratos (organization_id, data_fim)
  WHERE data_fim IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contratos_org_created
  ON public.contratos (organization_id, created_at DESC);

-- Full-text search no título (para busca global)
CREATE INDEX IF NOT EXISTS idx_contratos_titulo_trgm
  ON public.contratos USING gin (titulo gin_trgm_ops)
  WHERE titulo IS NOT NULL;

-- ---------------------------------------------------------------
-- contract_obligations: filtros por organização + data de vencimento
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_obligations_org_vencimento
  ON public.contract_obligations (organization_id, data_vencimento)
  WHERE data_vencimento IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_obligations_contrato
  ON public.contract_obligations (contrato_id);

-- ---------------------------------------------------------------
-- organization_members: lookup de membros ativos
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_org_members_active
  ON public.organization_members (organization_id, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_org_members_user
  ON public.organization_members (user_id, organization_id);

-- ---------------------------------------------------------------
-- notifications: já existe idx_notifications_user_lida
-- Adicionar índice para org-wide queries
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_notifications_org_created
  ON public.notifications (organization_id, created_at DESC);

-- ---------------------------------------------------------------
-- audit_logs: consultas por org + período (tabela cresce rápido)
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created
  ON public.audit_logs (organization_id, created_at DESC)
  WHERE organization_id IS NOT NULL;

-- ---------------------------------------------------------------
-- profiles: lookup por user (join comum)
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_id
  ON public.profiles (id);

-- ---------------------------------------------------------------
-- COMENTÁRIO FINAL
-- Para monitorar queries lentas no Supabase:
--   Dashboard → Database → Query Performance
-- Para verificar uso de índices:
--   EXPLAIN ANALYZE SELECT ... FROM contratos WHERE organization_id = '...' AND status = 'vigente';
-- ---------------------------------------------------------------
