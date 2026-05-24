-- Primeiro, remover a função e policies que dependem do tipo
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role) CASCADE;

-- Atualizar enum de roles para os novos perfis
ALTER TYPE app_role RENAME TO app_role_old;

CREATE TYPE app_role AS ENUM (
  'analista_juridico',
  'consultoria_juridica', 
  'administrador'
);

-- Migrar dados existentes
ALTER TABLE user_roles ALTER COLUMN role TYPE app_role USING 
  CASE 
    WHEN role::text = 'admin' THEN 'administrador'::app_role
    WHEN role::text = 'juridico' THEN 'consultoria_juridica'::app_role
    ELSE 'analista_juridico'::app_role
  END;

-- Agora pode dropar o tipo antigo
DROP TYPE app_role_old;

-- Recriar a função has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
  )
$$;

-- Atualizar RLS policies para contratos
DROP POLICY IF EXISTS "Users can create contratos" ON public.contratos;
DROP POLICY IF EXISTS "Users can update contratos" ON public.contratos;

-- Analistas e consultores podem criar contratos
CREATE POLICY "Analistas e consultores podem criar contratos"
ON public.contratos
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'analista_juridico'::app_role) OR
  has_role(auth.uid(), 'consultoria_juridica'::app_role) OR
  has_role(auth.uid(), 'administrador'::app_role)
);

-- Analistas podem atualizar seus próprios contratos em rascunho
-- Consultores e admins podem atualizar qualquer contrato
CREATE POLICY "Controle de atualização de contratos"
ON public.contratos
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'administrador'::app_role) OR
  has_role(auth.uid(), 'consultoria_juridica'::app_role) OR
  (has_role(auth.uid(), 'analista_juridico'::app_role) AND status = 'rascunho' AND created_by = auth.uid())
);

-- Atualizar RLS policies para fornecedores
DROP POLICY IF EXISTS "Users can create fornecedores" ON public.fornecedores;
DROP POLICY IF EXISTS "Users can update fornecedores" ON public.fornecedores;

-- Analistas, consultores e admins podem criar fornecedores
CREATE POLICY "Analistas e consultores podem criar fornecedores"
ON public.fornecedores
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'analista_juridico'::app_role) OR
  has_role(auth.uid(), 'consultoria_juridica'::app_role) OR
  has_role(auth.uid(), 'administrador'::app_role)
);

-- Analistas, consultores e admins podem atualizar fornecedores
CREATE POLICY "Analistas e consultores podem atualizar fornecedores"
ON public.fornecedores
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'analista_juridico'::app_role) OR
  has_role(auth.uid(), 'consultoria_juridica'::app_role) OR
  has_role(auth.uid(), 'administrador'::app_role)
);

-- Atualizar RLS policies para aprovações
DROP POLICY IF EXISTS "Users can create contract approvals" ON public.contract_approvals;

-- Apenas consultores e admins podem aprovar contratos
CREATE POLICY "Consultores e admins podem criar aprovações"
ON public.contract_approvals
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'consultoria_juridica'::app_role) OR
  has_role(auth.uid(), 'administrador'::app_role)
);

-- Recriar policy de roles
CREATE POLICY "Apenas administradores podem gerenciar roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'administrador'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- Criar função helper para verificar se usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(auth.uid(), 'administrador'::app_role)
$$;

-- Atualizar trigger de novo usuário para role padrão
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
    NEW.email
  );
  
  -- Assign default role as 'analista_juridico'
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'analista_juridico');
  
  RETURN NEW;
END;
$$;