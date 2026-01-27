
# Plano: Avatar de Usuário, Documentação API de Compras e Cadastro de Fornecedores Completo

## Visão Geral

Este plano abrange três requisitos principais:
1. Upload de foto de avatar no perfil do usuário
2. Documentação sobre configuração da API do Sistema de Compras
3. Melhorias no cadastro de fornecedores (tipos de serviço e anexos)

---

## 1. Upload de Foto do Avatar

### Situação Atual
A tabela `profiles` já possui a coluna `avatar_url` (text, nullable), mas a funcionalidade de upload não está implementada na página de configurações.

### Implementação

#### Componente de Upload
Criar componente `AvatarUpload.tsx` com:
- Preview da foto atual ou iniciais do usuário
- Botão para upload de nova imagem
- Validação de tamanho (max 2MB) e tipo (JPG, PNG, WEBP)
- Indicador de progresso durante upload
- Opção de remover foto

#### Modificação na Página Settings
Adicionar seção de avatar no card "Perfil do Usuário":
- Avatar clicável para trocar foto
- Usar bucket existente `contratos-documentos` com pasta `avatars/{user_id}/`
- Atualizar `avatar_url` na tabela `profiles`

#### Exibição do Avatar
Atualizar `GlobalHeader.tsx` e outros componentes para exibir o avatar do usuário logado quando disponível.

---

## 2. Documentação - Configuração API Sistema de Compras

Baseado na análise da imagem e do código da Edge Function `enviar-solicitacao-compras`, aqui está o que você precisa solicitar ao responsável pelo sistema de compras:

### Informações Necessárias para Configurar a Integração

| Item | Descrição | Exemplo |
|------|-----------|---------|
| **URL da API** | Endpoint que receberá as solicitações via POST | `https://api.seuserp.com.br/solicitacao-compra` |
| **Tipo de Autenticação** | Como o sistema valida as requisições | API Key, Bearer Token ou Basic Auth |
| **Chave de Autenticação** | Token/credencial para acesso à API | Chave alfanumérica fornecida pelo ERP |

### Payload Enviado pelo LexFlow

O sistema enviará um JSON com a seguinte estrutura:

```text
┌─────────────────────────────────────────────────────────────────┐
│                      PAYLOAD DA SOLICITAÇÃO                      │
├─────────────────────────────────────────────────────────────────┤
│ origem: "LEXFLOW"                                                │
│ tipo: "SERVICO_PERIODICO"                                        │
│ data_solicitacao: "2026-01-27T10:30:00.000Z"                     │
│ urgencia: "normal" | "media" | "alta" | "critica"                │
│                                                                  │
│ servico: {                                                       │
│   id, especificacao, categoria, itens_detalhados,                │
│   quantidade, localizacao, data_vencimento, prioridade,          │
│   orgao_regulador                                                │
│ }                                                                │
│                                                                  │
│ unidade: {                                                       │
│   nome, endereco, cidade, estado,                                │
│   responsavel, email_responsavel                                 │
│ }                                                                │
│                                                                  │
│ estimativas: {                                                   │
│   valor_estimado, valor_ultima_execucao,                         │
│   fornecedor_preferencial: { nome, cnpj, telefone }              │
│ }                                                                │
│                                                                  │
│ historico: [ { data, valor, fornecedor, observacoes } ]          │
│ observacoes: "texto livre"                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Headers da Requisição

Dependendo do tipo de autenticação configurado:

| Tipo | Header Enviado |
|------|----------------|
| API Key | `X-API-Key: {chave}` |
| Bearer Token | `Authorization: Bearer {token}` |
| Basic Auth | `Authorization: Basic {credenciais}` |

### Resposta Esperada da API

O sistema espera um JSON de retorno com:
- `numero_solicitacao` ou `id`: Código da solicitação gerada
- Status HTTP 2xx para sucesso

### Próximos Passos para Configurar

1. **Obter do responsável pelo ERP:**
   - URL do endpoint de solicitação de compras
   - Tipo de autenticação suportado
   - Chave/token de acesso

2. **Configurar no LexFlow (Configurações > Integrações):**
   - Ativar a integração
   - Informar a URL da API
   - Selecionar tipo de autenticação

3. **Configurar o secret no backend:**
   - A chave de autenticação precisa ser cadastrada como secret `COMPRAS_API_KEY`
   - Isso será solicitado pelo sistema quando necessário

---

## 3. Cadastro Completo de Fornecedores

### Alterações no Banco de Dados

#### Novos Campos na Tabela `fornecedores`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| inscricao_estadual | text | Inscrição Estadual ou "Isento" |
| inscricao_municipal | text | Inscrição Municipal |
| website | text | Site do fornecedor |
| contato_nome | text | Nome do contato principal |
| contato_cargo | text | Cargo do contato |
| contato_email | text | Email secundário/contato |
| contato_telefone | text | Telefone direto |
| porte_empresa | text | MEI, ME, EPP, Médio, Grande |
| is_active | boolean | Status ativo/inativo |

#### Nova Tabela: `fornecedor_categorias_servico`
Relacionamento N:N entre fornecedores e tipos de serviço:
- `id` (uuid, PK)
- `fornecedor_id` (uuid, FK)
- `categoria` (text - segurança, manutenção, higiene, etc.)
- `created_at` (timestamp)

#### Nova Tabela: `fornecedor_anexos`
Documentos do fornecedor:
- `id` (uuid, PK)
- `fornecedor_id` (uuid, FK)
- `nome_arquivo` (text)
- `arquivo_url` (text)
- `tipo_documento` (text - Contrato Social, Certidões, etc.)
- `tamanho_bytes` (bigint)
- `uploaded_by` (uuid)
- `created_at` (timestamp)

### Novos Componentes

| Arquivo | Descrição |
|---------|-----------|
| `src/components/Fornecedores/FornecedorForm.tsx` | Formulário completo com abas |
| `src/components/Fornecedores/FornecedorAnexos.tsx` | Upload/gestão de anexos |
| `src/components/Fornecedores/FornecedorCategorias.tsx` | Seleção de tipos de serviço |
| `src/pages/FornecedorDetalhes.tsx` | Página de detalhes do fornecedor |

### Reorganização do Formulário

**Aba 1: Dados Básicos**
- Nome/Razão Social, Tipo Pessoa, CNPJ/CPF
- Inscrição Estadual, Inscrição Municipal
- Porte da Empresa, Website, Status Ativo

**Aba 2: Contato**
- Email principal, Telefone principal
- Contato secundário (nome, cargo, email, telefone)

**Aba 3: Endereço**
- Endereço, Cidade, Estado, CEP

**Aba 4: Dados Bancários**
- Banco, Agência, Conta, PIX, Titular

**Aba 5: Tipos de Serviço**
- Checkboxes com categorias: Segurança, Manutenção, Higiene, Infraestrutura, Veículos, Outros
- Campo de observações/especialidades

**Aba 6: Anexos**
- Upload de documentos (Contrato Social, Certidões, Atestados)
- Listagem com download e exclusão

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/Settings/AvatarUpload.tsx` | Componente de upload de avatar |
| `src/components/Fornecedores/FornecedorForm.tsx` | Formulário completo |
| `src/components/Fornecedores/FornecedorAnexos.tsx` | Gestão de anexos |
| `src/components/Fornecedores/FornecedorCategorias.tsx` | Seleção de categorias |
| `src/components/Fornecedores/index.ts` | Exports |
| `src/pages/FornecedorDetalhes.tsx` | Página de detalhes |

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Settings.tsx` | Adicionar upload de avatar no card de perfil |
| `src/pages/Fornecedores.tsx` | Usar novo formulário com abas |
| `src/components/GlobalHeader.tsx` | Exibir avatar do usuário |
| `src/App.tsx` | Adicionar rota `/fornecedores/:id` |

## Migração SQL

```sql
-- Novos campos em fornecedores
ALTER TABLE fornecedores ADD COLUMN inscricao_estadual text;
ALTER TABLE fornecedores ADD COLUMN inscricao_municipal text;
ALTER TABLE fornecedores ADD COLUMN website text;
ALTER TABLE fornecedores ADD COLUMN contato_nome text;
ALTER TABLE fornecedores ADD COLUMN contato_cargo text;
ALTER TABLE fornecedores ADD COLUMN contato_email text;
ALTER TABLE fornecedores ADD COLUMN contato_telefone text;
ALTER TABLE fornecedores ADD COLUMN porte_empresa text;
ALTER TABLE fornecedores ADD COLUMN is_active boolean DEFAULT true;

-- Tabela de categorias
CREATE TABLE fornecedor_categorias_servico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id uuid REFERENCES fornecedores(id) ON DELETE CASCADE NOT NULL,
  categoria text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(fornecedor_id, categoria)
);

-- Tabela de anexos
CREATE TABLE fornecedor_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id uuid REFERENCES fornecedores(id) ON DELETE CASCADE NOT NULL,
  nome_arquivo text NOT NULL,
  arquivo_url text NOT NULL,
  tipo_documento text,
  tamanho_bytes bigint,
  uploaded_by uuid,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE fornecedor_categorias_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedor_anexos ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "View fornecedor categories" ON fornecedor_categorias_servico
  FOR SELECT USING (true);
CREATE POLICY "Manage fornecedor categories" ON fornecedor_categorias_servico
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['analista_juridico','consultoria_juridica','administrador']));

CREATE POLICY "View fornecedor attachments" ON fornecedor_anexos
  FOR SELECT USING (true);
CREATE POLICY "Manage fornecedor attachments" ON fornecedor_anexos
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['analista_juridico','consultoria_juridica','administrador']));
```

---

## Ordem de Implementação

1. **Migração do banco** - Adicionar campos e tabelas
2. **Avatar Upload** - Componente e integração em Settings
3. **Componentes Fornecedor** - Form, Anexos, Categorias
4. **Página Fornecedores** - Integrar novos componentes
5. **Página Detalhes** - Criar visualização completa
6. **Testes** - Validar upload de avatar e anexos, salvar categorias

