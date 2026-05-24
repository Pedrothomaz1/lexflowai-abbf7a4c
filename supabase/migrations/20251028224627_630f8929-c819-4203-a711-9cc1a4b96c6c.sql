-- Habilitar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar job cron para verificar alertas diariamente às 9h
SELECT cron.schedule(
  'verificar-alertas-contratos-diario',
  '0 9 * * *', -- Às 9h da manhã todos os dias
  $$
  SELECT
    net.http_post(
        url:='https://dxllojjazxizuylbmezc.supabase.co/functions/v1/verificar-alertas',
        headers:='{"Content-Type": "application/json"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Criar job adicional para verificação às 17h (final do expediente)
SELECT cron.schedule(
  'verificar-alertas-contratos-tarde',
  '0 17 * * *', -- Às 17h todos os dias
  $$
  SELECT
    net.http_post(
        url:='https://dxllojjazxizuylbmezc.supabase.co/functions/v1/verificar-alertas',
        headers:='{"Content-Type": "application/json"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);