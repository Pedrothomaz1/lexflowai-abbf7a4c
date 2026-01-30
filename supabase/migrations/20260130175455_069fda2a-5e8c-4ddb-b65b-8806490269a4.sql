-- Add tipo_franquia column to franquias table
ALTER TABLE public.franquias 
ADD COLUMN tipo_franquia text;

COMMENT ON COLUMN public.franquias.tipo_franquia IS 'Tipo da franquia: home_based_gold, home_based_silver, lojas, venda_direta';