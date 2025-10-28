-- Tabela para templates de contratos
CREATE TABLE public.contract_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo contract_type NOT NULL,
  conteudo_template TEXT NOT NULL,
  campos_variaveis JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Tabela para alertas e notificações
CREATE TABLE public.contract_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID REFERENCES public.contratos(id) ON DELETE CASCADE,
  tipo_alerta TEXT NOT NULL, -- 'vencimento', 'renovacao', 'obrigacao', 'pagamento'
  titulo TEXT NOT NULL,
  mensagem TEXT,
  data_alerta DATE NOT NULL,
  dias_antecedencia INTEGER DEFAULT 30,
  enviado BOOLEAN DEFAULT false,
  data_envio TIMESTAMP WITH TIME ZONE,
  usuarios_notificados UUID[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para anexos múltiplos
CREATE TABLE public.contract_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID REFERENCES public.contratos(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  tipo_documento TEXT, -- 'aditivo', 'termo', 'anexo', 'comprovante'
  arquivo_url TEXT NOT NULL,
  tamanho_bytes BIGINT,
  mime_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para workflow de aprovação customizável
CREATE TABLE public.approval_workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo_contrato contract_type NOT NULL,
  niveis JSONB NOT NULL, -- Array de níveis de aprovação com roles e ordem
  aprovacao_paralela BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para análise de contratos com IA
CREATE TABLE public.contract_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID REFERENCES public.contratos(id) ON DELETE CASCADE,
  riscos_identificados JSONB,
  clausulas_importantes JSONB,
  sugestoes_melhoria JSONB,
  score_risco NUMERIC(3,2), -- 0.00 a 10.00
  analisado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  analisado_por UUID REFERENCES auth.users(id)
);

-- Tabela para obrigações contratuais
CREATE TABLE public.contract_obligations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID REFERENCES public.contratos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_vencimento DATE NOT NULL,
  tipo TEXT, -- 'pagamento', 'entrega', 'renovacao', 'outro'
  valor NUMERIC,
  status TEXT DEFAULT 'pendente', -- 'pendente', 'concluido', 'atrasado'
  responsavel_id UUID REFERENCES auth.users(id),
  concluido_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_obligations ENABLE ROW LEVEL SECURITY;

-- RLS Policies para contract_templates
CREATE POLICY "Users can view all templates"
  ON public.contract_templates FOR SELECT
  USING (true);

CREATE POLICY "Admins and consultores can manage templates"
  ON public.contract_templates FOR ALL
  USING (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'consultoria_juridica'::app_role));

-- RLS Policies para contract_alerts
CREATE POLICY "Users can view all alerts"
  ON public.contract_alerts FOR SELECT
  USING (true);

CREATE POLICY "System can manage alerts"
  ON public.contract_alerts FOR ALL
  USING (true);

-- RLS Policies para contract_attachments
CREATE POLICY "Users can view all attachments"
  ON public.contract_attachments FOR SELECT
  USING (true);

CREATE POLICY "Users can upload attachments"
  ON public.contract_attachments FOR INSERT
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Admins can manage attachments"
  ON public.contract_attachments FOR ALL
  USING (has_role(auth.uid(), 'administrador'::app_role));

-- RLS Policies para approval_workflows
CREATE POLICY "Users can view workflows"
  ON public.approval_workflows FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage workflows"
  ON public.approval_workflows FOR ALL
  USING (has_role(auth.uid(), 'administrador'::app_role));

-- RLS Policies para contract_analysis
CREATE POLICY "Users can view all analysis"
  ON public.contract_analysis FOR SELECT
  USING (true);

CREATE POLICY "System can create analysis"
  ON public.contract_analysis FOR INSERT
  WITH CHECK (true);

-- RLS Policies para contract_obligations
CREATE POLICY "Users can view all obligations"
  ON public.contract_obligations FOR SELECT
  USING (true);

CREATE POLICY "Users can manage obligations"
  ON public.contract_obligations FOR ALL
  USING (has_role(auth.uid(), 'analista_juridico'::app_role) OR has_role(auth.uid(), 'consultoria_juridica'::app_role) OR has_role(auth.uid(), 'administrador'::app_role));

-- Triggers para updated_at
CREATE TRIGGER update_contract_templates_updated_at
  BEFORE UPDATE ON public.contract_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_contract_alerts_contrato ON public.contract_alerts(contrato_id);
CREATE INDEX idx_contract_alerts_data ON public.contract_alerts(data_alerta);
CREATE INDEX idx_contract_attachments_contrato ON public.contract_attachments(contrato_id);
CREATE INDEX idx_contract_obligations_contrato ON public.contract_obligations(contrato_id);
CREATE INDEX idx_contract_obligations_data ON public.contract_obligations(data_vencimento);
CREATE INDEX idx_contract_analysis_contrato ON public.contract_analysis(contrato_id);