-- Add modulo_padrao column to user_roles
ALTER TABLE public.user_roles 
ADD COLUMN modulo_padrao TEXT DEFAULT 'contratos' 
CHECK (modulo_padrao IN ('contratos', 'servicos', 'ambos'));

-- Create uso_sistema table for tracking operational costs
CREATE TABLE public.uso_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('ai_tokens', 'email', 'api_compras', 'storage', 'edge_function')),
  recurso TEXT NOT NULL,
  quantidade INTEGER DEFAULT 1,
  custo_unitario DECIMAL(10,6) DEFAULT 0,
  custo_total DECIMAL(10,2) DEFAULT 0,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  contrato_id UUID REFERENCES public.contratos(id) ON DELETE SET NULL,
  servico_id UUID REFERENCES public.servicos_periodicos(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on uso_sistema
ALTER TABLE public.uso_sistema ENABLE ROW LEVEL SECURITY;

-- RLS Policies for uso_sistema
-- Only admins can view all usage data
CREATE POLICY "Admins can view all usage" 
ON public.uso_sistema 
FOR SELECT 
USING (has_role(auth.uid(), 'administrador'::app_role));

-- System can insert usage records (via service role)
CREATE POLICY "System can insert usage" 
ON public.uso_sistema 
FOR INSERT 
WITH CHECK (true);

-- Create index for efficient queries
CREATE INDEX idx_uso_sistema_created_at ON public.uso_sistema(created_at DESC);
CREATE INDEX idx_uso_sistema_tipo ON public.uso_sistema(tipo);

-- Update existing users to have 'contratos' as default module
UPDATE public.user_roles SET modulo_padrao = 'contratos' WHERE modulo_padrao IS NULL;