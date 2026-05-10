
-- 1) Enum de status para organizações
DO $$ BEGIN
  CREATE TYPE public.org_status AS ENUM ('pendente_aprovacao', 'ativa', 'suspensa', 'cancelada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Novos campos em organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS status public.org_status NOT NULL DEFAULT 'pendente_aprovacao',
  ADD COLUMN IF NOT EXISTS aprovada_em timestamptz,
  ADD COLUMN IF NOT EXISTS aprovada_por uuid,
  ADD COLUMN IF NOT EXISTS motivo_suspensao text,
  ADD COLUMN IF NOT EXISTS suspensa_em timestamptz,
  ADD COLUMN IF NOT EXISTS suspensa_por uuid;

CREATE INDEX IF NOT EXISTS idx_organizations_status ON public.organizations(status);

-- 3) Backfill: organizações já existentes ficam ativas (não vamos quebrar quem já usa)
-- Apenas as 2 órfãs (PHARMALINDY e FlowGenAI) ficam pendentes para revisão
UPDATE public.organizations SET status = 'ativa', aprovada_em = now()
WHERE status = 'pendente_aprovacao'
  AND id NOT IN (
    '232b1bd5-56fe-47ac-99ef-1ba950d79f2c', -- PHARMALINDY
    'b8ac46a6-22dd-49d6-a4df-5a8d0790108f'  -- FlowGenAI
  );

-- 4) Tabela de super admins (gestores da plataforma LexFlow)
CREATE TABLE IF NOT EXISTS public.super_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- Seed: pedrothomaz1@gmail.com como primeiro super admin
INSERT INTO public.super_admins (user_id, email, notes)
VALUES ('3cac2588-c981-45c9-8f6b-710c6bd3ac1b', 'pedrothomaz1@gmail.com', 'Fundador LexFlow')
ON CONFLICT (user_id) DO NOTHING;

-- 5) Função SECURITY DEFINER para checar super admin (evita recursão RLS)
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = _user_id)
$$;

-- 6) RLS policies para super_admins (somente super admins podem ler/gerenciar)
DROP POLICY IF EXISTS sa_select ON public.super_admins;
DROP POLICY IF EXISTS sa_insert ON public.super_admins;
DROP POLICY IF EXISTS sa_delete ON public.super_admins;

CREATE POLICY sa_select ON public.super_admins FOR SELECT
  USING (public.is_super_admin(auth.uid()));
CREATE POLICY sa_insert ON public.super_admins FOR INSERT
  WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY sa_delete ON public.super_admins FOR DELETE
  USING (public.is_super_admin(auth.uid()));

-- 7) Atualizar current_user_org() para retornar APENAS organização ATIVA
-- Org pendente/suspensa não vê nenhum dado (RLS bloqueia tudo automaticamente)
CREATE OR REPLACE FUNCTION public.current_user_org()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT om.organization_id
  FROM public.organization_members om
  JOIN public.organizations o ON o.id = om.organization_id
  WHERE om.user_id = auth.uid()
    AND om.is_active = true
    AND o.status = 'ativa'
  ORDER BY om.joined_at ASC
  LIMIT 1;
$$;

-- 8) Função utilitária: pegar organização do usuário INDEPENDENTE de status
-- (usado pelas telas /aguardando-aprovacao e /conta-suspensa)
CREATE OR REPLACE FUNCTION public.get_user_organization_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org RECORD;
BEGIN
  SELECT o.id, o.nome, o.cnpj, o.status::text AS status, o.motivo_suspensao, o.created_at
  INTO v_org
  FROM public.organization_members om
  JOIN public.organizations o ON o.id = om.organization_id
  WHERE om.user_id = auth.uid()
    AND om.is_active = true
  ORDER BY om.joined_at ASC
  LIMIT 1;

  IF v_org IS NULL THEN
    RETURN jsonb_build_object('has_organization', false);
  END IF;

  RETURN jsonb_build_object(
    'has_organization', true,
    'organization_id', v_org.id,
    'nome', v_org.nome,
    'cnpj', v_org.cnpj,
    'status', v_org.status,
    'motivo_suspensao', v_org.motivo_suspensao,
    'created_at', v_org.created_at
  );
END;
$$;

-- 9) Policies em organizations: super admin enxerga TUDO; usuário comum só a própria
DROP POLICY IF EXISTS super_admin_select_all_orgs ON public.organizations;
DROP POLICY IF EXISTS super_admin_update_all_orgs ON public.organizations;
DROP POLICY IF EXISTS super_admin_delete_all_orgs ON public.organizations;

CREATE POLICY super_admin_select_all_orgs ON public.organizations FOR SELECT
  USING (public.is_super_admin(auth.uid()));
CREATE POLICY super_admin_update_all_orgs ON public.organizations FOR UPDATE
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY super_admin_delete_all_orgs ON public.organizations FOR DELETE
  USING (public.is_super_admin(auth.uid()));

-- 10) Policy permitindo super admin ver TODOS organization_members (suporte/visão global)
DROP POLICY IF EXISTS super_admin_select_all_members ON public.organization_members;
CREATE POLICY super_admin_select_all_members ON public.organization_members FOR SELECT
  USING (public.is_super_admin(auth.uid()));

-- 11) Função para super admin aprovar organização
CREATE OR REPLACE FUNCTION public.approve_organization(_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado');
  END IF;

  UPDATE public.organizations
  SET status = 'ativa',
      aprovada_em = now(),
      aprovada_por = auth.uid(),
      motivo_suspensao = NULL,
      suspensa_em = NULL,
      suspensa_por = NULL
  WHERE id = _org_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 12) Função para super admin suspender organização
CREATE OR REPLACE FUNCTION public.suspend_organization(_org_id uuid, _motivo text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado');
  END IF;

  UPDATE public.organizations
  SET status = 'suspensa',
      motivo_suspensao = _motivo,
      suspensa_em = now(),
      suspensa_por = auth.uid()
  WHERE id = _org_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 13) View resumida para o painel super admin
CREATE OR REPLACE VIEW public.super_admin_organizations_view
WITH (security_invoker = on) AS
SELECT 
  o.id,
  o.nome,
  o.cnpj,
  o.status,
  o.created_at,
  o.aprovada_em,
  o.aprovada_por,
  o.motivo_suspensao,
  o.suspensa_em,
  o.created_by,
  (SELECT au.email FROM auth.users au WHERE au.id = o.created_by) AS criador_email,
  (SELECT COUNT(*) FROM public.organization_members om WHERE om.organization_id = o.id AND om.is_active = true) AS total_membros
FROM public.organizations o;
