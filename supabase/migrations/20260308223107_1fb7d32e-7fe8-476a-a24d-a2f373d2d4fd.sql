
CREATE OR REPLACE FUNCTION public.job_notificar_vencimentos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.id AS contrato_id, c.titulo, c.numero_contrato, c.data_fim, c.organization_id,
           (c.data_fim - CURRENT_DATE) AS dias_restantes
    FROM contratos c
    WHERE c.data_fim IS NOT NULL
      AND c.data_fim BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')
      AND c.status NOT IN ('cancelado', 'encerrado')
      AND NOT EXISTS (
        SELECT 1 FROM contract_alerts ca
        WHERE ca.contrato_id = c.id
          AND ca.tipo_alerta = 'vencimento'
          AND ca.created_at > (NOW() - INTERVAL '7 days')
      )
  LOOP
    INSERT INTO contract_alerts (
      contrato_id, organization_id, tipo_alerta, titulo, mensagem, data_alerta, dias_antecedencia
    ) VALUES (
      r.contrato_id,
      r.organization_id,
      'vencimento',
      'Contrato próximo do vencimento: ' || r.titulo,
      'O contrato ' || r.numero_contrato || ' (' || r.titulo || ') vence em ' || r.dias_restantes || ' dias (' || r.data_fim || ').',
      r.data_fim,
      r.dias_restantes
    );
  END LOOP;
END;
$$;
