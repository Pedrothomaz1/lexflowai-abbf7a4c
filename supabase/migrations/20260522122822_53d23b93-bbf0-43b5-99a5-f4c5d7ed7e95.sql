ALTER TABLE public.contract_analysis
  ADD COLUMN IF NOT EXISTS skill_aplicada text NOT NULL DEFAULT 'contract-review',
  ADD COLUMN IF NOT EXISTS payload_estruturado jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_contract_analysis_skill ON public.contract_analysis(skill_aplicada);