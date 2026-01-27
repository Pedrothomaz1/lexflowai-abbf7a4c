-- ==========================
-- FASE 3: RELATÓRIOS, LGPD E MÉTRICAS DE NEGOCIAÇÃO
-- ==========================

-- Tabela para configurações de relatórios customizáveis
CREATE TABLE public.report_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo_relatorio TEXT NOT NULL DEFAULT 'contratos',
  filtros JSONB DEFAULT '{}',
  colunas JSONB DEFAULT '[]',
  ordenacao JSONB DEFAULT '{}',
  visualizacao TEXT DEFAULT 'tabela',
  agendamento TEXT, -- 'diario', 'semanal', 'mensal'
  destinatarios TEXT[],
  is_public BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para logs de compliance LGPD/GDPR
CREATE TABLE public.compliance_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo_evento TEXT NOT NULL, -- 'acesso_dados', 'exportacao', 'anonimizacao', 'exclusao', 'consentimento'
  entidade TEXT NOT NULL,
  entidade_id UUID,
  dados_afetados JSONB,
  justificativa TEXT,
  base_legal TEXT, -- 'consentimento', 'contrato', 'obrigacao_legal', 'interesse_legitimo'
  user_id UUID,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para métricas de negociação de contratos
CREATE TABLE public.negotiation_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID REFERENCES public.contratos(id) ON DELETE CASCADE,
  data_inicio_negociacao DATE,
  data_fim_negociacao DATE,
  numero_revisoes INTEGER DEFAULT 0,
  tempo_total_dias INTEGER,
  tempo_por_etapa JSONB DEFAULT '{}',
  partes_envolvidas JSONB DEFAULT '[]',
  principais_pontos_negociados JSONB DEFAULT '[]',
  resultado TEXT, -- 'aprovado', 'rejeitado', 'cancelado', 'em_andamento'
  valor_inicial NUMERIC,
  valor_final NUMERIC,
  economia_percentual NUMERIC,
  satisfacao_partes INTEGER, -- 1 a 5
  notas TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para políticas de retenção de dados (LGPD)
CREATE TABLE public.data_retention_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  entidade TEXT NOT NULL,
  periodo_retencao_meses INTEGER NOT NULL DEFAULT 60,
  acao_pos_retencao TEXT NOT NULL DEFAULT 'anonimizar', -- 'anonimizar', 'excluir', 'arquivar'
  base_legal TEXT,
  descricao TEXT,
  is_active BOOLEAN DEFAULT true,
  ultima_execucao TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.report_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.negotiation_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;

-- Políticas para report_configurations
CREATE POLICY "Users can view public reports or own reports"
ON public.report_configurations
FOR SELECT
USING (is_public = true OR created_by = auth.uid() OR has_role(auth.uid(), 'administrador'));

CREATE POLICY "Users can create their own reports"
ON public.report_configurations
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own reports or admins"
ON public.report_configurations
FOR UPDATE
USING (created_by = auth.uid() OR has_role(auth.uid(), 'administrador'));

CREATE POLICY "Users can delete their own reports or admins"
ON public.report_configurations
FOR DELETE
USING (created_by = auth.uid() OR has_role(auth.uid(), 'administrador'));

-- Políticas para compliance_logs (apenas admins podem ver)
CREATE POLICY "Admins can view compliance logs"
ON public.compliance_logs
FOR SELECT
USING (has_role(auth.uid(), 'administrador'));

CREATE POLICY "System can insert compliance logs"
ON public.compliance_logs
FOR INSERT
WITH CHECK (true);

-- Políticas para negotiation_metrics
CREATE POLICY "Users can view all negotiation metrics"
ON public.negotiation_metrics
FOR SELECT
USING (true);

CREATE POLICY "Authorized users can manage negotiation metrics"
ON public.negotiation_metrics
FOR ALL
USING (has_any_role(auth.uid(), ARRAY['analista_juridico'::app_role, 'consultoria_juridica'::app_role, 'administrador'::app_role]));

-- Políticas para data_retention_policies (apenas admins)
CREATE POLICY "Admins can manage retention policies"
ON public.data_retention_policies
FOR ALL
USING (has_role(auth.uid(), 'administrador'));

CREATE POLICY "Users can view retention policies"
ON public.data_retention_policies
FOR SELECT
USING (true);

-- Índices para performance
CREATE INDEX idx_compliance_logs_tipo ON public.compliance_logs(tipo_evento);
CREATE INDEX idx_compliance_logs_entidade ON public.compliance_logs(entidade, entidade_id);
CREATE INDEX idx_compliance_logs_created ON public.compliance_logs(created_at DESC);
CREATE INDEX idx_negotiation_metrics_contrato ON public.negotiation_metrics(contrato_id);
CREATE INDEX idx_report_configurations_created_by ON public.report_configurations(created_by);