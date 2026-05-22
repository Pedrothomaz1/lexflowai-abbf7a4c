## Plano Sequencial — 6 Features

Pela memória do projeto, **4 das 6 features já estão implementadas**. O plano abaixo audita cada uma e entrega o que ainda falta, na ordem de maior impacto.

---

### Status atual (memória + DB)

| # | Feature | Status registrado | Ação |
|---|---------|-------------------|------|
| 1 | Workflow Builder Kanban | ✅ Implementado (edge `workflow-advance`, bootstrap trigger ativo) | Auditar UI + regras |
| 2 | Pre-Launch Test Automation | ✅ Edge `pre-launch-test-runner` + tabela `pre_launch_test_runs` + botão em `/security` | Auditar + smoke test |
| 3 | Security Regression Suite | ⚠️ Edge `security-regression-runner` existe, **UI de execução incompleta** | **Construir UI** |
| 4 | Gest10 Integration | ✅ Edge function ativa com `COMPRAS_API_KEY` | Auditar |
| 5 | Automated Notifications | ✅ `job_notificar_vencimentos` + Realtime configurado | Auditar cron + Realtime |
| 6 | Multi Attachments | ✅ Bucket `contratos-documentos` + UI | Auditar |

---

### Ordem de execução proposta

**Sprint 1 — Auditoria rápida (1 task agrupada)**
- Verificar em paralelo: cron jobs ativos, edge functions deployadas, triggers registrados, buckets com RLS correta
- Gerar relatório curto do que está OK vs. o que precisa de ajuste
- Critério de pronto: tabela com status real de cada uma das 6 features

**Sprint 2 — Security Regression Suite UI** (única feature claramente incompleta)
- Aba "Regressão" em `/security` (ao lado da aba Pré-Venda existente)
- Botão "Executar suite agora" → chama `security-regression-runner`
- Tabela histórica lendo de `security_regression_runs` (ou criar se não existir) com: timestamp, status, testes passados/falhados, link para detalhes
- Badge de severidade por execução
- Critério de pronto: usuário admin consegue disparar suite e ver últimos 20 runs

**Sprint 3 — Ajustes derivados da Sprint 1**
- Corrigir o que a auditoria apontou (provavelmente nada crítico, mas pode haver gaps de UI ou notificação)
- Cada gap vira uma task individual

---

### Detalhes técnicos

- Sprint 1 usa `supabase--read_query` e `code--exec` para inspeção; **zero migrations**
- Sprint 2:
  - Frontend: nova aba em `src/pages/Security.tsx` (ou equivalente), componente `SecurityRegressionPanel.tsx`
  - Pode precisar de migration para tabela `security_regression_runs` se ainda não existir
  - Acesso restrito a `is_super_admin` ou `administrador` via `usePermissions`
- Sprint 3: escopo definido só após Sprint 1

---

### Saída

Após aprovar este plano, executo **Sprint 1** primeiro e te trago o relatório de auditoria antes de mexer em código. Você decide se segue para Sprint 2 ou ajusta a prioridade.