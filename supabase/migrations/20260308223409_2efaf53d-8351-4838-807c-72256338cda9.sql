
-- Agendar cron job diário (substitui se já existir)
SELECT cron.unschedule('notificar-vencimentos-diario');
SELECT cron.schedule(
  'notificar-vencimentos-diario',
  '0 8 * * *',
  'SELECT public.job_notificar_vencimentos()'
);
