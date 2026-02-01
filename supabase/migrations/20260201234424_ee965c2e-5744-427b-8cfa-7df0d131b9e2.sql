
-- Fix audit trigger function to only check role field when table is user_roles
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  risk TEXT;
  category TEXT;
  v_org_id UUID;
BEGIN
  -- Determinar nível de risco
  risk := CASE
    WHEN TG_TABLE_NAME IN ('contratos', 'fornecedores') AND TG_OP = 'DELETE' THEN 'critical'
    WHEN TG_TABLE_NAME = 'user_roles' THEN 'critical'
    WHEN TG_TABLE_NAME IN ('contratos', 'fornecedores', 'contract_approvals') THEN 'high'
    WHEN TG_OP = 'DELETE' THEN 'high'
    WHEN TG_OP = 'UPDATE' THEN 'medium'
    ELSE 'low'
  END;
  
  -- Determinar categoria
  category := CASE
    WHEN TG_TABLE_NAME IN ('user_roles', 'profiles', 'user_2fa_settings') THEN 'auth'
    WHEN TG_TABLE_NAME IN ('contratos', 'contract_approvals', 'contract_signatures') THEN 'financial'
    WHEN TG_TABLE_NAME = 'fornecedores' THEN 'financial'
    ELSE 'data'
  END;

  -- Get organization_id from the record if it exists
  BEGIN
    IF TG_OP = 'DELETE' THEN
      v_org_id := (row_to_json(OLD)::jsonb->>'organization_id')::uuid;
    ELSE
      v_org_id := (row_to_json(NEW)::jsonb->>'organization_id')::uuid;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_org_id := current_user_org();
  END;

  -- Fallback to current user org if not found
  IF v_org_id IS NULL THEN
    v_org_id := current_user_org();
  END IF;

  -- Only insert if we have an organization_id
  IF v_org_id IS NOT NULL THEN
    INSERT INTO public.audit_logs (
      user_id, acao, entidade, entidade_id,
      dados_anteriores, dados_novos, 
      metadata, risk_level, event_category, organization_id
    ) VALUES (
      auth.uid(),
      TG_OP,
      TG_TABLE_NAME,
      COALESCE(
        CASE WHEN TG_OP != 'DELETE' THEN (row_to_json(NEW)::jsonb->>'id')::uuid ELSE NULL END,
        CASE WHEN TG_OP != 'INSERT' THEN (row_to_json(OLD)::jsonb->>'id')::uuid ELSE NULL END
      ),
      CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD) ELSE NULL END,
      CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
      jsonb_build_object(
        'trigger', TG_NAME,
        'timestamp', NOW()
      ),
      risk,
      category,
      v_org_id
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;
