-- Criar tabela de comentários de contrato
CREATE TABLE public.contract_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.contract_comments(id) ON DELETE CASCADE,
  secao TEXT,
  tipo TEXT NOT NULL DEFAULT 'comentario' CHECK (tipo IN ('comentario', 'sugestao', 'anotacao', 'questao')),
  conteudo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'resolvido', 'em_analise')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices para melhor performance
CREATE INDEX idx_contract_comments_contrato ON public.contract_comments(contrato_id);
CREATE INDEX idx_contract_comments_user ON public.contract_comments(user_id);
CREATE INDEX idx_contract_comments_parent ON public.contract_comments(parent_id);
CREATE INDEX idx_contract_comments_status ON public.contract_comments(status);

-- Habilitar RLS
ALTER TABLE public.contract_comments ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Usuários podem visualizar comentários de contratos"
ON public.contract_comments
FOR SELECT
USING (true);

CREATE POLICY "Usuários autenticados podem criar comentários"
ON public.contract_comments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem editar seus próprios comentários"
ON public.contract_comments
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios comentários"
ON public.contract_comments
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_contract_comments_updated_at
BEFORE UPDATE ON public.contract_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar realtime para comentários
ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_comments;