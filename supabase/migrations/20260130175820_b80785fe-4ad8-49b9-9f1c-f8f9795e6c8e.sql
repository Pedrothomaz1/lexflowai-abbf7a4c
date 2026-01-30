-- Add missing columns to contratos table for full Excel compatibility
ALTER TABLE public.contratos 
ADD COLUMN renovacao_automatica boolean DEFAULT false,
ADD COLUMN data_renovacao date,
ADD COLUMN unidade_id uuid REFERENCES public.unidades(id);

-- Add comments for documentation
COMMENT ON COLUMN public.contratos.renovacao_automatica IS 'Indica se o contrato possui renovação automática';
COMMENT ON COLUMN public.contratos.data_renovacao IS 'Data prevista para renovação do contrato';
COMMENT ON COLUMN public.contratos.unidade_id IS 'Unidade responsável pelo contrato';

-- Create index for better performance on unidade lookups
CREATE INDEX idx_contratos_unidade_id ON public.contratos(unidade_id);