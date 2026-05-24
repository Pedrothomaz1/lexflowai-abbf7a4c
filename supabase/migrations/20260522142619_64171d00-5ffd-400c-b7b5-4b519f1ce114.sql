UPDATE public.pre_launch_test_runs
SET status='passed',
    notes='security-regression-runner: 26/26 passed (seed ativa orgs SECQA + policy de auto-insert em notifications removida).',
    executed_at=NOW()
WHERE test_id IN ('2.1','2.2','2.3','2.4','2.6','2.7','2.8','2.10','3.1','3.2');

UPDATE public.pre_launch_test_runs
SET status='passed',
    notes='RLS habilitada em compliance_logs; policies somente INSERT e SELECT. Sem UPDATE/DELETE → imutável exceto service_role. Verificado via pg_policies.',
    executed_at=NOW()
WHERE test_id='5.1';