## Feature: Validação de CNPJ na Receita Federal

Vamos consultar o status do CNPJ via **ReceitaWS** (gratuita, limite ~3 req/min) em dois momentos: ao cadastrar/editar fornecedor e ao criar contrato. CNPJs inativos/baixados/suspensos bloquearão novos contratos. Um cron diário revalidará toda a base, e o dashboard exibirá CNPJs com problemas.

### 1. Banco de dados

Adicionar colunas em `fornecedores`:
- `cnpj_status` (text): `ativa`, `baixada`, `suspensa`, `inapta`, `nula`, `nao_verificado`, `erro_consulta`
- `cnpj_situacao_data` (date): data da situação cadastral retornada
- `cnpj_verificado_em` (timestamptz): última consulta bem-sucedida
- `cnpj_dados_receita` (jsonb): payload completo (razão social, atividade principal, endereço) para auditoria/auto-preenchimento

Criar tabela `cnpj_verification_log` para histórico de consultas (fornecedor_id, status, response, created_at, organization_id) com RLS por organização.

### 2. Edge Function: `consultar-cnpj`

- Recebe `{ cnpj }`, valida formato, chama `https://receitaws.com.br/v1/cnpj/{cnpj}`.
- Tratamento de erro 429 (rate limit) → retorna `status: "rate_limited"` com retry sugerido.
- Retorna situação cadastral + dados úteis (razão social, nome fantasia, atividade, endereço).
- Atualiza `fornecedores` se `fornecedor_id` for passado, e grava em `cnpj_verification_log`.
- `verify_jwt = true`.

### 3. Edge Function: `cron-verificar-cnpjs`

- Executada diariamente via `pg_cron` (sugestão: 03:00 UTC).
- Itera fornecedores ativos com CNPJ, respeitando rate limit (~1 req a cada 25s = ~3/min).
- Atualiza status; quando muda de `ativa` para outro estado, dispara `notify_org_members` para administradores e cria registro em `contract_alerts` (`tipo_alerta = 'cnpj_inativo'`) referenciando contratos vinculados.
- Usa `CRON_SECRET` para autenticação.

### 4. Frontend — Cadastro/edição de fornecedor

Em `FornecedorForm.tsx` e `InlineFornecedorForm`:
- Botão "Verificar Receita Federal" ao lado do CNPJ (auto-disparo no blur quando válido).
- Badge com status (verde "Ativa" / vermelho "Baixada/Suspensa" / cinza "Não verificado").
- Auto-preencher razão social, nome fantasia e endereço se vazios.
- Mostrar data da última verificação.

### 5. Frontend — Novo Contrato

Em `ContratoFormDialog.tsx`:
- Ao selecionar fornecedor, exibir badge de status do CNPJ.
- Se status ≠ `ativa` → alert vermelho e **botão Criar Contrato desabilitado**.
- Botão "Reverificar agora" para forçar consulta.
- Mesma regra para fornecedores criados via `InlineFornecedorForm`.

### 6. Dashboard — Card "CNPJs com problemas"

Novo card no `Dashboard.tsx` (próximo aos KPIs existentes):
- Contador de fornecedores com `cnpj_status` em (`baixada`, `suspensa`, `inapta`, `nula`, `erro_consulta`).
- Lista resumida (top 5) com nome, status (badge colorido) e nº de contratos ativos vinculados.
- Botão "Ver todos" → leva para `/fornecedores?filtro=cnpj_inativo`.
- Destaque visual (borda vermelha) quando houver pelo menos 1 problema.

### 7. Tela de Fornecedores

Em `Fornecedores.tsx`:
- Filtro/tab "CNPJs com problemas".
- Coluna de status do CNPJ na tabela.
- Botão "Reverificar" por linha.

### Detalhes técnicos

- ReceitaWS retorna campo `situacao` (ATIVA, BAIXADA, SUSPENSA, INAPTA, NULA). Normalizar para lowercase.
- Cache: não reconsultar se `cnpj_verificado_em` < 24h, exceto se usuário clicar "Reverificar".
- Rate limit do cron: chamadas sequenciais com delay de 25s. Para bases grandes, processar em lotes diários (ex: 100 fornecedores/dia ordenados por `cnpj_verificado_em ASC NULLS FIRST`).
- pg_cron job inserido via `supabase--insert` (não migration) por conter URL/anon key.
- Notificação de inativação reaproveita `notify_org_members` + `contract_alerts`.
