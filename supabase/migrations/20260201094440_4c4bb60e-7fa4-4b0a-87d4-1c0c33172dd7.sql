-- Fix: Convert SECURITY DEFINER view to SECURITY INVOKER (safer)
-- Drop and recreate view with SECURITY INVOKER
DROP VIEW IF EXISTS public.fornecedores_safe;

-- Recreate view with explicit SECURITY INVOKER
CREATE VIEW public.fornecedores_safe 
WITH (security_invoker = on) AS
SELECT 
  id,
  organization_id,
  nome,
  tipo_pessoa,
  cnpj,
  cpf,
  inscricao_estadual,
  inscricao_municipal,
  email,
  telefone,
  endereco,
  cidade,
  estado,
  cep,
  website,
  contato_nome,
  contato_email,
  contato_telefone,
  contato_cargo,
  porte_empresa,
  notas,
  documentos,
  is_active,
  created_at,
  created_by,
  updated_at,
  -- Financial fields - masked for non-privileged users
  CASE 
    WHEN has_any_role(auth.uid(), ARRAY['administrador'::app_role, 'consultoria_juridica'::app_role])
    THEN banco
    ELSE '****'
  END as banco,
  CASE 
    WHEN has_any_role(auth.uid(), ARRAY['administrador'::app_role, 'consultoria_juridica'::app_role])
    THEN agencia
    ELSE '****'
  END as agencia,
  CASE 
    WHEN has_any_role(auth.uid(), ARRAY['administrador'::app_role, 'consultoria_juridica'::app_role])
    THEN conta
    ELSE '****'
  END as conta,
  CASE 
    WHEN has_any_role(auth.uid(), ARRAY['administrador'::app_role, 'consultoria_juridica'::app_role])
    THEN pix
    ELSE '****'
  END as pix,
  CASE 
    WHEN has_any_role(auth.uid(), ARRAY['administrador'::app_role, 'consultoria_juridica'::app_role])
    THEN titular_conta
    ELSE '****'
  END as titular_conta
FROM public.fornecedores;