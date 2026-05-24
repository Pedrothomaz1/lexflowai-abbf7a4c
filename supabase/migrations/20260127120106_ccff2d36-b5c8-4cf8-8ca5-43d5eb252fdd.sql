-- Novos campos em fornecedores
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS inscricao_estadual text;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS inscricao_municipal text;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS contato_nome text;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS contato_cargo text;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS contato_email text;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS contato_telefone text;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS porte_empresa text;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Tabela de categorias de serviço do fornecedor
CREATE TABLE IF NOT EXISTS fornecedor_categorias_servico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id uuid REFERENCES fornecedores(id) ON DELETE CASCADE NOT NULL,
  categoria text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(fornecedor_id, categoria)
);

-- Tabela de anexos do fornecedor
CREATE TABLE IF NOT EXISTS fornecedor_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id uuid REFERENCES fornecedores(id) ON DELETE CASCADE NOT NULL,
  nome_arquivo text NOT NULL,
  arquivo_url text NOT NULL,
  tipo_documento text,
  tamanho_bytes bigint,
  uploaded_by uuid,
  created_at timestamptz DEFAULT now()
);

-- RLS para categorias
ALTER TABLE fornecedor_categorias_servico ENABLE ROW LEVEL SECURITY;

-- Políticas para categorias
CREATE POLICY "View fornecedor categories" ON fornecedor_categorias_servico
  FOR SELECT USING (true);

CREATE POLICY "Manage fornecedor categories" ON fornecedor_categorias_servico
  FOR INSERT WITH CHECK (has_any_role(auth.uid(), ARRAY['analista_juridico','consultoria_juridica','administrador']::app_role[]));

CREATE POLICY "Update fornecedor categories" ON fornecedor_categorias_servico
  FOR UPDATE USING (has_any_role(auth.uid(), ARRAY['analista_juridico','consultoria_juridica','administrador']::app_role[]));

CREATE POLICY "Delete fornecedor categories" ON fornecedor_categorias_servico
  FOR DELETE USING (has_any_role(auth.uid(), ARRAY['analista_juridico','consultoria_juridica','administrador']::app_role[]));

-- RLS para anexos
ALTER TABLE fornecedor_anexos ENABLE ROW LEVEL SECURITY;

-- Políticas para anexos
CREATE POLICY "View fornecedor attachments" ON fornecedor_anexos
  FOR SELECT USING (true);

CREATE POLICY "Manage fornecedor attachments" ON fornecedor_anexos
  FOR INSERT WITH CHECK (has_any_role(auth.uid(), ARRAY['analista_juridico','consultoria_juridica','administrador']::app_role[]));

CREATE POLICY "Update fornecedor attachments" ON fornecedor_anexos
  FOR UPDATE USING (has_any_role(auth.uid(), ARRAY['analista_juridico','consultoria_juridica','administrador']::app_role[]));

CREATE POLICY "Delete fornecedor attachments" ON fornecedor_anexos
  FOR DELETE USING (has_any_role(auth.uid(), ARRAY['analista_juridico','consultoria_juridica','administrador']::app_role[]));