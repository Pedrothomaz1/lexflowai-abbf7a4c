
## Decisões confirmadas

1. **`nivel_risco`** — derivado do `score_risco` da IA, manual prevalece se preenchido.
2. **Sanction list** — campo manual nesta fase (`sanction_check_status`).
3. **`intake_status` paralelo ao `status`** — opção A (seguro, zero quebra).
4. **E-mail financeiro** — campo único de texto em `organizations.email_financeiro`.

Adições do usuário absorvidas: auto-preenchimento via IA no import, bloco financeiro estruturado com notificação por e-mail após assinatura, e correção da análise de risco que não está funcionando.

---

## Fase B — Diagnóstico e correção da análise de risco (PRIMEIRO)

Tarefas:
- Ler edge function `analyze-contract` (e variantes), logs recentes, `contract_analysis` (escritas), componentes `PDFDataExtractor` / `RevisaoExtracoesPanel` / `ContractRiskBadge`.
- Identificar causa raiz (modelo Lovable AI desatualizado, prompt quebrado, RLS bloqueando insert, erro silencioso no front, JSON parsing).
- Corrigir sem mexer no schema desta tabela.
- Validar manualmente em um contrato real.

Entrega: análise voltando a popular `score_risco`, `clausulas_criticas`, e UI mostrando resultado.

---

## Fase A — Schema (1 migração)

**`contratos` — novas colunas:**

Intake & compliance:
- `intake_status text default 'novo'`
- `nivel_risco text` (baixo/medio/alto/critico)
- `nivel_confidencialidade text`, `centro_custo text`, `departamento_responsavel text`
- `dados_pessoais_envolvidos bool`, `intermediario_envolvido bool`, `terceirizacao bool`
- `dias_aviso_nao_renovacao int`
- `due_diligence_status text`, `due_diligence_justificativa text`
- `sanction_check_status text default 'nao_verificado'`

Bloco financeiro:
- `forma_pagamento text` (boleto/pix/ted/cartao/debito_automatico)
- `condicao_pagamento text` (à vista, 30 dias, parcelado, etc.)
- `numero_parcelas int`, `dia_vencimento int`
- `valor_parcela numeric`, `data_primeiro_vencimento date`
- `indice_reajuste text`, `periodicidade_reajuste text`
- `multa_atraso_pct numeric`, `juros_mora_pct numeric`
- `dados_bancarios jsonb` (banco, agência, conta, pix, favorecido)
- `email_financeiro_notificado_em timestamptz`

**`contract_attachments` — novas colunas:**
- `sha256 text`, `is_original bool default false`, `versao int default 1`
- CHECK em `tipo_documento`

**`organizations` — nova coluna:**
- `email_financeiro text` (destinatário único para notificações)

**Triggers:**
- Auto-popular `nivel_risco` a partir de `score_risco` (se manual estiver vazio): <0.4 baixo · 0.4–0.7 medio · 0.7–0.9 alto · >0.9 critico.
- Bloquear 2º anexo `is_original=true` por contrato.
- Exigir `dias_aviso_nao_renovacao` quando `renovacao_automatica=true`.

---

## Fase C — Gates SQL (compliance + liberação)

Funções:
- `seed_compliance_checklist(contrato_id)` — popula `contract_checklist` conforme flags (LGPD, anticorrupção, NDA, terceirização).
- `evaluate_intake_gate_1(contrato_id) RETURNS jsonb` — campos obrigatórios + checklist + DD + hash + risco.
- `evaluate_intake_gate_2(contrato_id) RETURNS jsonb` — matriz por nível de risco; nova tabela `intake_legal_reviews` (decisao, motivo, parecer).
- `release_intake_to_approval(contrato_id)` — roda gates; se ok seta `intake_status='liberado_para_aprovacao'` e `status='em_aprovacao'`. Audit em `audit_logs`.

---

## Fase D — UI Intake Stepper + Bloco Financeiro

Novo `IntakeStepper` em `src/components/contracts/intake/` com 7 etapas:

1. **Ingestão** — reusa `ContractImport` (upload + hash sha256).
2. **Extração IA** — expandir `PDFDataExtractor` para extrair também: forma/condição de pagamento, parcelas, vencimentos, índice de reajuste, multa, juros, dados bancários.
3. **Revisão** — reusa `RevisaoExtracoesPanel` + novo `BlocoFinanceiroForm`.
4. **Compliance** — novo `ContractChecklistPanel` (chama `seed_compliance_checklist`).
5. **Gate 1** — botão "Validar" chama `evaluate_intake_gate_1`, mostra `missing_fields`.
6. **Revisão Legal** — UI para `intake_legal_reviews`.
7. **Liberação** — chama `release_intake_to_approval`.

Encaixe: **nova tab "Intake"** em `ContratoDetalhes`, visível enquanto `intake_status != 'liberado_para_aprovacao'`.

Configuração: nova seção em `Settings` (org) para editar `email_financeiro`.

---

## Fase E — Notificação financeira por e-mail

- Nova edge function `notify-financial-on-signature` usando Lovable Emails (infra já existe — Resend backup).
- Disparo: trigger AFTER UPDATE em `contratos` quando `status` muda para `assinado`, OU pela função `release_intake_to_approval` (a decidir na implementação — provavelmente trigger).
- Destinatário: `organizations.email_financeiro`; fallback para admins se vazio.
- Conteúdo: nº contrato, fornecedor, valor total, forma/condição pagamento, parcelas, vencimentos, dados bancários, link assinado para PDF original.
- Marca `email_financeiro_notificado_em` para evitar reenvio (idempotência).

---

## Fora deste plano (intencional)

- Integração automática de sanction list (API/scraping).
- Substituir enum `contract_status`.
- Unificar `contract_requests` com intake.
- Refatorar Franquias, Fornecedores, LGPD, RBAC, Auth, Super Admin, Workflow pós-aprovação.

---

## Ordem de execução

1. **Fase B** (diagnóstico análise de risco) — começa imediatamente.
2. **Fase A** (migração) — aprovação separada antes de aplicar.
3. **Fase C** (gates SQL) — aprovação separada.
4. **Fase D** (UI).
5. **Fase E** (notificação financeira).

Pergunto antes de avançar entre fases.

Aprovado? Começo pela Fase B.
