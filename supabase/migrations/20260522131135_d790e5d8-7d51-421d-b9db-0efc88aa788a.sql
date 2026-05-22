-- Enable extensions for scheduled HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- View for manual review of recent organization members
CREATE OR REPLACE VIEW public.vw_org_members_recent
WITH (security_invoker = true) AS
SELECT
  om.user_id,
  p.email,
  om.organization_id,
  o.nome AS org_name,
  om.role_in_org,
  om.joined_at,
  CASE
    WHEN om.joined_at >= now() - interval '24 hours' THEN 'hoje'
    WHEN om.joined_at >= now() - interval '7 days' THEN 'esta semana'
    ELSE 'este mês'
  END AS periodo
FROM public.organization_members om
JOIN public.organizations o ON o.id = om.organization_id
LEFT JOIN public.profiles p ON p.id = om.user_id
WHERE om.joined_at >= now() - interval '30 days'
ORDER BY om.joined_at DESC;

GRANT SELECT ON public.vw_org_members_recent TO authenticated;