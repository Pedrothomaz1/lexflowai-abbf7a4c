-- Drop the global unique constraint on tipo
ALTER TABLE public.integracao_config DROP CONSTRAINT integracao_config_tipo_key;

-- Add a per-organization unique constraint
ALTER TABLE public.integracao_config ADD CONSTRAINT integracao_config_tipo_org_key UNIQUE (tipo, organization_id);