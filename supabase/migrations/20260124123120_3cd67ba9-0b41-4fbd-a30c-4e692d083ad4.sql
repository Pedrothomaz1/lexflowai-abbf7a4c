-- =====================================================
-- MÓDULO DE SERVIÇOS PERIÓDICOS - TABELAS E POLICIES
-- =====================================================

-- 1. Tabela: unidades (filiais/locais)
CREATE TABLE public.unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT DEFAULT 'filial' CHECK (tipo IN ('filial', 'matriz', 'remoto')),
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  responsavel_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  email_contato TEXT,
  telefone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela: especificacoes_servico (tipos de serviço)
CREATE TABLE public.especificacoes_servico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('seguranca', 'manutencao', 'higiene', 'infraestrutura', 'veiculos', 'outros')),
  descricao TEXT,
  validade_padrao_meses INTEGER DEFAULT 12,
  dias_alerta_padrao INTEGER DEFAULT 30,
  requer_certificado BOOLEAN DEFAULT false,
  orgao_regulador TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela: servicos_periodicos (serviços cadastrados)
CREATE TABLE public.servicos_periodicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  especificacao_id UUID NOT NULL REFERENCES public.especificacoes_servico(id) ON DELETE RESTRICT,
  itens_detalhados TEXT,
  quantidade INTEGER DEFAULT 1,
  localizacao_fisica TEXT,
  
  -- Datas e prazos
  data_ultima_troca DATE NOT NULL,
  validade_meses INTEGER NOT NULL,
  data_validade DATE NOT NULL,
  dias_antecedencia_alerta INTEGER DEFAULT 30,
  data_alerta DATE NOT NULL,
  
  -- Status e controle
  status TEXT DEFAULT 'dentro_prazo' CHECK (status IN ('dentro_prazo', 'alerta', 'vencido', 'em_execucao')),
  prioridade TEXT DEFAULT 'normal' CHECK (prioridade IN ('baixa', 'normal', 'alta', 'critica')),
  
  -- Responsabilidade
  responsavel_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Custos estimados
  valor_estimado DECIMAL(15,2),
  fornecedor_preferencial_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  
  -- Metadados
  observacoes TEXT,
  tags TEXT[],
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabela: servico_historico (histórico de execuções)
CREATE TABLE public.servico_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servico_id UUID NOT NULL REFERENCES public.servicos_periodicos(id) ON DELETE CASCADE,
  tipo_acao TEXT NOT NULL CHECK (tipo_acao IN ('execucao', 'renovacao', 'inspecao', 'corretiva')),
  data_execucao DATE NOT NULL,
  
  -- Execução
  executado_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  
  -- Custos
  valor DECIMAL(15,2),
  numero_nota_fiscal TEXT,
  
  -- Evidências
  anexos JSONB DEFAULT '[]',
  fotos JSONB DEFAULT '[]',
  
  -- Detalhes
  observacoes TEXT,
  proxima_validade DATE,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Tabela: solicitacoes_compras (logs de envio para API)
CREATE TABLE public.solicitacoes_compras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servico_id UUID NOT NULL REFERENCES public.servicos_periodicos(id) ON DELETE CASCADE,
  
  -- Status do envio
  status_envio TEXT DEFAULT 'pendente' CHECK (status_envio IN ('pendente', 'enviado', 'erro', 'confirmado', 'cancelado')),
  
  -- Dados enviados
  payload_enviado JSONB,
  
  -- Resposta da API
  resposta_api JSONB,
  codigo_solicitacao TEXT,
  
  -- Controle de erros
  tentativas INTEGER DEFAULT 0,
  erro_mensagem TEXT,
  
  -- Timestamps
  enviado_em TIMESTAMPTZ,
  confirmado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Tabela: integracao_config (configurações de integração)
CREATE TABLE public.integracao_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  url_api TEXT,
  tipo_autenticacao TEXT CHECK (tipo_autenticacao IN ('api_key', 'oauth', 'basic_auth', 'bearer')),
  headers_customizados JSONB DEFAULT '{}',
  mapeamento_campos JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  ultimo_teste TIMESTAMPTZ,
  status_ultimo_teste TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================

CREATE TRIGGER update_unidades_updated_at
  BEFORE UPDATE ON public.unidades
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_especificacoes_servico_updated_at
  BEFORE UPDATE ON public.especificacoes_servico
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_servicos_periodicos_updated_at
  BEFORE UPDATE ON public.servicos_periodicos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_integracao_config_updated_at
  BEFORE UPDATE ON public.integracao_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX idx_servicos_periodicos_status ON public.servicos_periodicos(status);
CREATE INDEX idx_servicos_periodicos_unidade ON public.servicos_periodicos(unidade_id);
CREATE INDEX idx_servicos_periodicos_especificacao ON public.servicos_periodicos(especificacao_id);
CREATE INDEX idx_servicos_periodicos_data_validade ON public.servicos_periodicos(data_validade);
CREATE INDEX idx_servicos_periodicos_data_alerta ON public.servicos_periodicos(data_alerta);
CREATE INDEX idx_servico_historico_servico ON public.servico_historico(servico_id);
CREATE INDEX idx_solicitacoes_compras_servico ON public.solicitacoes_compras(servico_id);
CREATE INDEX idx_solicitacoes_compras_status ON public.solicitacoes_compras(status_envio);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.especificacoes_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos_periodicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servico_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacoes_compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integracao_config ENABLE ROW LEVEL SECURITY;

-- Policies para unidades
CREATE POLICY "Users can view all unidades" 
  ON public.unidades FOR SELECT 
  USING (true);

CREATE POLICY "Authorized users can insert unidades" 
  ON public.unidades FOR INSERT 
  WITH CHECK (has_any_role(auth.uid(), ARRAY['analista_juridico', 'consultoria_juridica', 'administrador']::public.app_role[]));

CREATE POLICY "Authorized users can update unidades" 
  ON public.unidades FOR UPDATE 
  USING (has_any_role(auth.uid(), ARRAY['analista_juridico', 'consultoria_juridica', 'administrador']::public.app_role[]));

CREATE POLICY "Admins can delete unidades" 
  ON public.unidades FOR DELETE 
  USING (has_role(auth.uid(), 'administrador'));

-- Policies para especificacoes_servico
CREATE POLICY "Users can view all especificacoes" 
  ON public.especificacoes_servico FOR SELECT 
  USING (true);

CREATE POLICY "Authorized users can insert especificacoes" 
  ON public.especificacoes_servico FOR INSERT 
  WITH CHECK (has_any_role(auth.uid(), ARRAY['analista_juridico', 'consultoria_juridica', 'administrador']::public.app_role[]));

CREATE POLICY "Authorized users can update especificacoes" 
  ON public.especificacoes_servico FOR UPDATE 
  USING (has_any_role(auth.uid(), ARRAY['analista_juridico', 'consultoria_juridica', 'administrador']::public.app_role[]));

CREATE POLICY "Admins can delete especificacoes" 
  ON public.especificacoes_servico FOR DELETE 
  USING (has_role(auth.uid(), 'administrador'));

-- Policies para servicos_periodicos
CREATE POLICY "Users can view all servicos" 
  ON public.servicos_periodicos FOR SELECT 
  USING (true);

CREATE POLICY "Authorized users can insert servicos" 
  ON public.servicos_periodicos FOR INSERT 
  WITH CHECK (has_any_role(auth.uid(), ARRAY['analista_juridico', 'consultoria_juridica', 'administrador']::public.app_role[]));

CREATE POLICY "Authorized users can update servicos" 
  ON public.servicos_periodicos FOR UPDATE 
  USING (has_any_role(auth.uid(), ARRAY['analista_juridico', 'consultoria_juridica', 'administrador']::public.app_role[]));

CREATE POLICY "Admins can delete servicos" 
  ON public.servicos_periodicos FOR DELETE 
  USING (has_role(auth.uid(), 'administrador'));

-- Policies para servico_historico
CREATE POLICY "Users can view all historico" 
  ON public.servico_historico FOR SELECT 
  USING (true);

CREATE POLICY "Authorized users can insert historico" 
  ON public.servico_historico FOR INSERT 
  WITH CHECK (has_any_role(auth.uid(), ARRAY['analista_juridico', 'consultoria_juridica', 'administrador']::public.app_role[]));

CREATE POLICY "Authorized users can update historico" 
  ON public.servico_historico FOR UPDATE 
  USING (has_any_role(auth.uid(), ARRAY['analista_juridico', 'consultoria_juridica', 'administrador']::public.app_role[]));

-- Policies para solicitacoes_compras
CREATE POLICY "Users can view all solicitacoes" 
  ON public.solicitacoes_compras FOR SELECT 
  USING (true);

CREATE POLICY "System can insert solicitacoes" 
  ON public.solicitacoes_compras FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "System can update solicitacoes" 
  ON public.solicitacoes_compras FOR UPDATE 
  USING (true);

-- Policies para integracao_config (somente admin)
CREATE POLICY "Admins can view integracao config" 
  ON public.integracao_config FOR SELECT 
  USING (has_role(auth.uid(), 'administrador'));

CREATE POLICY "Admins can insert integracao config" 
  ON public.integracao_config FOR INSERT 
  WITH CHECK (has_role(auth.uid(), 'administrador'));

CREATE POLICY "Admins can update integracao config" 
  ON public.integracao_config FOR UPDATE 
  USING (has_role(auth.uid(), 'administrador'));

CREATE POLICY "Admins can delete integracao config" 
  ON public.integracao_config FOR DELETE 
  USING (has_role(auth.uid(), 'administrador'));

-- =====================================================
-- DADOS INICIAIS - ESPECIFICAÇÕES DE SERVIÇO
-- =====================================================

INSERT INTO public.especificacoes_servico (nome, categoria, descricao, validade_padrao_meses, dias_alerta_padrao, requer_certificado, orgao_regulador) VALUES
  ('Recarga de Extintores', 'seguranca', 'Recarga e manutenção de extintores de incêndio', 12, 30, true, 'Corpo de Bombeiros'),
  ('Manutenção de Ar-Condicionado', 'manutencao', 'Limpeza e manutenção preventiva de sistemas de ar-condicionado', 6, 15, false, NULL),
  ('Troca de Filtro de Purificador', 'higiene', 'Substituição de filtros de purificadores de água', 6, 15, false, 'Vigilância Sanitária'),
  ('Dedetização', 'higiene', 'Controle de pragas e vetores', 6, 15, true, 'Vigilância Sanitária'),
  ('Manutenção de Elevador', 'infraestrutura', 'Manutenção preventiva e corretiva de elevadores', 1, 7, true, 'CREA'),
  ('Teste de Alarme de Incêndio', 'seguranca', 'Teste e manutenção de sistemas de alarme contra incêndio', 12, 30, true, 'Corpo de Bombeiros'),
  ('Manutenção de Gerador', 'infraestrutura', 'Manutenção preventiva de geradores de energia', 6, 15, false, NULL),
  ('Manutenção de No-Break', 'infraestrutura', 'Manutenção e teste de sistemas no-break', 6, 15, false, NULL),
  ('Limpeza de Caixa d''Água', 'higiene', 'Limpeza e desinfecção de reservatórios de água', 6, 15, true, 'Vigilância Sanitária'),
  ('Revisão Veicular', 'veiculos', 'Revisão preventiva de veículos da frota', 6, 15, false, NULL),
  ('Licenciamento de Veículos', 'veiculos', 'Renovação de licenciamento anual de veículos', 12, 60, true, 'DETRAN'),
  ('Manutenção de CFTV', 'seguranca', 'Manutenção de câmeras e sistemas de vigilância', 12, 30, false, NULL);

-- Inserir configuração inicial de integração (desativada)
INSERT INTO public.integracao_config (tipo, nome, is_active) VALUES
  ('sistema_compras', 'Sistema de Compras Interno', false);