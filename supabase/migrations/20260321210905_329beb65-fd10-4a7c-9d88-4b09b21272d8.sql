
-- Recreate fornecedores_safe view with security_invoker so it respects RLS on fornecedores
DROP VIEW IF EXISTS public.fornecedores_safe;

CREATE VIEW public.fornecedores_safe
WITH (security_invoker = true)
AS
SELECT id, nome, cnpj, cidade, estado, email, telefone, is_active,
       organization_id, created_at, updated_at, tipo_pessoa, porte_empresa,
       contato_nome, contato_email, contato_telefone, contato_cargo
FROM public.fornecedores;
