-- Ajustar o tipo da coluna score_risco para permitir valores até 10
ALTER TABLE public.contract_analysis 
ALTER COLUMN score_risco TYPE numeric(4,2);