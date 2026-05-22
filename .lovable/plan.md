## Escopo

Implementar 3 grandes módulos do master spec, na ordem de prioridade de impacto no negócio:

1. **Onboarding refinado** — converter lead em usuário ativo
2. **IA de análise de risco em contratos** — diferenciação competitiva
3. **Portal externo para contrapartes** — reduzir fricção operacional

Ordem importa: onboarding primeiro porque sem ele os leads convertidos via `/planos` abandonam antes de ver as outras features.

---

## Fase 1 — Onboarding pós-cadastro

**Objetivo:** levar o novo usuário do cadastro até o "primeiro valor" em menos de 5 minutos.

### Banco
- Tabela `onboarding_progress` (organization_id, user_id, step_completed, completed_at)
- Colunas em `profiles`: `onboarding_completed_at`, `onboarding_skipped`
- RLS multi-tenant padrão (organization_id = current_user_org())

### Wizard de boas-vindas (`/onboarding`)
5 passos, todos puláveis:
1. **Dados da empresa** — confirma nome, segmento, tamanho
2. **Convide o time** — adicionar 1-3 emails (reaproveita edge `send-invite`)
3. **Primeiro fornecedor** — formulário inline com auto-preenchimento CNPJ
4. **Primeiro contrato** — upload do PDF + dados mínimos
5. **Pronto!** — CTA para o dashboard

Redirecionamento automático após signup → `/onboarding` se `onboarding_completed_at IS NULL`.

### Checklist persistente
Componente `<OnboardingChecklist />` no canto inferior direito do `DashboardLayout`:
- Mostra "3/6 passos para configurar o LexFlow"
- Some quando 100% ou usuário fecha (salva em `profiles.onboarding_skipped`)
- Itens: completar perfil, cadastrar fornecedor, cadastrar contrato, configurar workflow, convidar membro, configurar notificações

### Empty states acionáveis
Revisar telas vazias de: Contratos, Fornecedores, Serviços, Workflows. Substituir tabela vazia por CTA grande + ilustração + 1 botão primário.

---

## Fase 2 — IA de análise de risco em contratos

**Objetivo:** quando upload de contrato acontece, IA analisa automaticamente e gera score + alertas.

### Banco
- Tabela `contract_risk_analyses`:
  - `contract_id`, `organization_id`
  - `risk_score` (int 0-100), `risk_level` ('low'|'medium'|'high')
  - `summary` (resumo executivo)
  - `clauses_flagged` (jsonb — lista de cláusulas problemáticas com trecho + categoria + severidade)
  - `key_dates` (jsonb — prazos extraídos)
  - `recommendations` (jsonb — pontos de negociação)
  - `model_used`, `tokens_used`, `analyzed_at`
- RLS multi-tenant padrão
- Trigger para atualizar `updated_at`

### Edge function `analyze-contract-risk`
- Recebe `contract_id`
- Busca PDF/texto do contrato (Storage signed URL)
- Extrai texto (já existe lógica de OCR? verificar)
- Chama Lovable AI Gateway com `google/gemini-2.5-pro` + tool calling estruturado:
  - tool `submit_analysis` com schema rígido (score, level, clauses_flagged, key_dates, recommendations)
- Persiste em `contract_risk_analyses`
- Trata erros 429/402 retornando 200 com mensagem amigável
- Validação Zod do input

### Trigger automático
- Após criar contrato com anexo, dispara análise em background (cliente chama edge fn fire-and-forget)
- Permite re-analisar manualmente via botão

### UI
- Componente `<ContractRiskBadge />` (verde/amarelo/vermelho) no card de contrato na listagem
- Aba "Análise de Risco" na página de detalhe do contrato:
  - Score grande + nível
  - Resumo executivo
  - Cláusulas sinalizadas (acordeão, com trecho destacado)
  - Prazos críticos (timeline)
  - Recomendações (cards numerados)
- Loading state durante análise
- Botão "Re-analisar" (admin only)

---

## Fase 3 — Portal externo para contrapartes

**Objetivo:** dar à contraparte (fornecedor/cliente) acesso público, sem login, aos contratos compartilhados.

### Banco
- Tabela `counterparty_portal_links`:
  - `id`, `organization_id`, `fornecedor_id` (ou `contraparte_email`)
  - `token` (uuid, único, indexado)
  - `expires_at` (default 1 ano)
  - `revoked_at` (nullable)
  - `created_by`, `created_at`
  - `last_accessed_at`, `access_count`
- Tabela `counterparty_access_log` (token_id, contract_id, action, ip, user_agent, accessed_at)
- RLS: tabela `counterparty_portal_links` só editável pela org dona; **leitura pública via edge function** (não via PostgREST direto)

### Edge function `counterparty-portal` (verify_jwt = false)
- Endpoints (via path):
  - `GET /verify/:token` — valida token, retorna dados básicos da contraparte
  - `GET /contracts/:token` — lista contratos compartilhados com aquela contraparte
  - `GET /contract/:token/:contractId` — detalhe + signed URL do PDF
  - `POST /upload/:token/:contractId` — upload de documento (ex: nota fiscal)
- Toda lógica de autorização via token, nunca expõe organization_id
- Rate limiting básico
- Log de cada acesso

### Geração de link
- Botão "Gerar link da contraparte" na página do fornecedor
- Modal mostra URL pública (`/portal/:token`), opção de copiar, enviar por email, revogar
- Listagem de links ativos com last_accessed_at

### UI pública (`/portal/:token`)
- Página standalone (fora do `DashboardLayout`), com branding LexFlow + nome da org dona
- Lista de contratos vigentes (tabela limpa: número, objeto, vigência, status)
- Detalhe do contrato com download seguro (signed URL com TTL curto)
- Upload de documentos pela contraparte
- Notice "Powered by LexFlow" no rodapé

---

## Detalhes técnicos transversais

- **Edge functions:** todas com CORS, validação Zod, retorno HTTP 200 em erros de lógica, deploy automático
- **Multi-tenant:** todo INSERT inclui `organization_id` e `created_by`; todo UPDATE usa `.select().maybeSingle()`
- **IA:** Lovable AI Gateway, modelo padrão `google/gemini-2.5-pro` para análise (precisão alta), tratamento de 429/402
- **Storage:** signed URLs para anexos (bucket privado)
- **Realtime:** ativar `ALTER PUBLICATION supabase_realtime ADD TABLE contract_risk_analyses` para atualizar UI quando análise termina
- **RBAC:** análise de risco visível a todos os membros; geração de portal links e re-análise restrita a admin
- **Testes:** adicionar caso para `contract_risk_analyses` no security-regression-runner

---

## Estimativa de complexidade

| Fase | Complexidade | Migrations | Edge functions | Componentes novos |
|------|--------------|------------|----------------|-------------------|
| 1. Onboarding | Média | 1 | 0 | ~8 |
| 2. IA Risco | Alta | 1 | 1 | ~6 |
| 3. Portal | Alta | 1 | 1 | ~5 |

Vou entregar em 3 turnos, um por fase, pausando entre cada para você validar antes de seguir.

## Sequência de execução

1. Fase 1 completa → você valida onboarding → ok?
2. Fase 2 completa → você valida análise de IA → ok?
3. Fase 3 completa → portal pronto → encerramento

Posso começar pela Fase 1 (Onboarding)?
