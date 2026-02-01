-- ==============================================
-- FIX 1: Profiles - Restrict to same organization only
-- ==============================================

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Create new policy: Users can only view profiles of members in their organization
CREATE POLICY "Users can view profiles in same org"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid() 
  OR 
  EXISTS (
    SELECT 1 FROM public.organization_members om1
    JOIN public.organization_members om2 ON om1.organization_id = om2.organization_id
    WHERE om1.user_id = auth.uid() 
    AND om2.user_id = profiles.id
    AND om1.is_active = true 
    AND om2.is_active = true
  )
);

-- ==============================================
-- FIX 2: Fornecedores - Restrict financial data access
-- ==============================================

-- Drop existing SELECT policy for fornecedores
DROP POLICY IF EXISTS "mt_fornecedores_select" ON public.fornecedores;

-- Create new tiered SELECT policies:

-- Policy 1: All org members can see basic supplier info (non-financial)
-- This uses a view approach - we'll restrict via application layer for financial fields
-- But for RLS, we need to restrict who can see the full record

-- Policy for financial roles (admin, consultoria_juridica) - full access
CREATE POLICY "mt_fornecedores_select_full"
ON public.fornecedores
FOR SELECT
TO authenticated
USING (
  organization_id = current_user_org()
  AND has_any_role(auth.uid(), ARRAY['administrador'::app_role, 'consultoria_juridica'::app_role])
);

-- Policy for other roles - basic access (they can see records but financial columns should be masked in app)
CREATE POLICY "mt_fornecedores_select_basic"
ON public.fornecedores
FOR SELECT
TO authenticated
USING (
  organization_id = current_user_org()
  AND NOT has_any_role(auth.uid(), ARRAY['administrador'::app_role, 'consultoria_juridica'::app_role])
);

-- ==============================================
-- Add column-level security via database function for masking
-- ==============================================

-- Create a view that masks financial data for non-privileged users
CREATE OR REPLACE VIEW public.fornecedores_safe AS
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