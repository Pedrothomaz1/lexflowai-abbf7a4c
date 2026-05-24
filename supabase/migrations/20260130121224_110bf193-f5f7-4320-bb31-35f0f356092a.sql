-- 1. Funcao de mascaramento PII
CREATE OR REPLACE FUNCTION public.mask_pii(
  value TEXT,
  field_type TEXT DEFAULT 'generic'
) RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF value IS NULL OR value = '' THEN
    RETURN value;
  END IF;
  
  CASE field_type
    WHEN 'cpf' THEN
      RETURN regexp_replace(value, '(\d{3})\.(\d{3})\.(\d)(\d{2})-(\d{2})', '***.***.***\3-\5');
    WHEN 'email' THEN
      RETURN regexp_replace(value, '^(.).*(@.+)$', '\1***\2');
    WHEN 'phone' THEN
      RETURN regexp_replace(value, '(.+)(\d{4})$', '****-\2');
    WHEN 'salary' THEN
      RETURN 'R$ **.**0,00';
    ELSE
      IF length(value) > 4 THEN
        RETURN repeat('*', length(value) - 4) || right(value, 4);
      ELSE
        RETURN repeat('*', length(value));
      END IF;
  END CASE;
END;
$$;

-- 2. Funcao LGPD Erasure
CREATE OR REPLACE FUNCTION public.gdpr_delete_user(user_uuid UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Anonimizar profile
  UPDATE profiles
  SET
    full_name = 'Usuario Excluido',
    email = concat('deleted_', user_uuid::text, '@deleted.local'),
    phone = NULL,
    avatar_url = NULL,
    updated_at = NOW()
  WHERE id = user_uuid;

  -- Marcar audit_logs como anonimizados
  UPDATE audit_logs
  SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"anonymized": true}'::jsonb
  WHERE user_id = user_uuid;

  -- Registrar no compliance_logs
  INSERT INTO compliance_logs (
    tipo_evento,
    entidade,
    entidade_id,
    dados_afetados,
    base_legal,
    user_id
  ) VALUES (
    'erasure_request',
    'profiles',
    user_uuid,
    '{"campos": ["full_name", "email", "phone", "avatar_url"]}'::jsonb,
    'LGPD Art. 18',
    auth.uid()
  );

  result := jsonb_build_object(
    'success', true,
    'user_id', user_uuid,
    'action', 'erasure',
    'timestamp', NOW()
  );
  
  RETURN result;
END;
$$;

-- 3. Tabela SoD Approvals
CREATE TABLE IF NOT EXISTS public.sod_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  approver_id UUID,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  amount DECIMAL(15,2),
  threshold_rule TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  decided_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT sod_different_users CHECK (
    approver_id IS NULL OR creator_id != approver_id
  )
);

ALTER TABLE sod_approvals ENABLE ROW LEVEL SECURITY;

-- RLS: Usuarios veem suas proprias solicitacoes ou sao aprovadores
CREATE POLICY "sod_view_own_or_approver" ON sod_approvals
  FOR SELECT USING (
    creator_id = auth.uid() 
    OR approver_id = auth.uid()
    OR has_role(auth.uid(), 'administrador')
  );

CREATE POLICY "sod_insert_authenticated" ON sod_approvals
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND creator_id = auth.uid()
  );

CREATE POLICY "sod_update_approver_only" ON sod_approvals
  FOR UPDATE USING (
    approver_id = auth.uid() 
    OR has_role(auth.uid(), 'administrador')
  );

-- 4. Indice para security_alerts.status
CREATE INDEX IF NOT EXISTS idx_security_alerts_status ON security_alerts(status);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_risk_level ON audit_logs(risk_level);