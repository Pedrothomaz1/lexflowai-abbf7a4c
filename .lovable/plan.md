
# Fluxo ideal de Intake — upload obrigatório, financeiro com envio manual

Inverter o ponto de entrada: todo contrato novo **obrigatoriamente** começa pelo upload do PDF/DOCX, a IA pré-preenche o rascunho, o humano completa, dispara análise e segue os Gates já existentes. O Bloco Financeiro só destrava após validação e o envio à tesouraria passa a ser **acionado manualmente** pelo gestor.

## Novo fluxo

```text
1. Upload do PDF/DOCX (obrigatório) → tela "Novo Contrato" começa aqui
2. Extração IA (ia-extrair-campos + analisar-contrato) → rascunho pré-preenchido
3. Humano revisa/completa campos    (intake_status: em_cadastro)
4. "Enviar para análise"            → roda análise de cláusulas/risco
5. Gate 1 + Revisão Legal + Compliance + Gate 2 (já existe)
6. "Liberar para aprovação"         → intake_status: liberado
7. Bloco Financeiro destrava        → gestor preenche
8. Botão "Enviar ao financeiro"     → dispara enviar-notificacao-financeiro
```

## Mudanças

### A. Wizard obrigatório de novo contrato (`/contratos?novo=true`)
- Substituir o form em branco por `NovoContratoWizard.tsx` com 3 passos:
  1. **Upload** — dropzone PDF/DOCX, obrigatório, sem fallback manual.
  2. **Extração IA** — loader; chama `ia-extrair-campos` + `analisar-contrato`.
  3. **Revisão** — abre o form atual já pré-preenchido; anexo gravado em `contract_attachments` com `is_original=true`.
- Upload vai para `contratos-documentos/{org_id}/rascunhos/{uuid}.pdf`.
- Rascunho nasce com `status='rascunho'`, `intake_status='em_cadastro'`.

### B. Bloco Financeiro travado até validação
- Em `ContratoDetalhes.tsx`, envolver `BlocoFinanceiroPanel` (e a aba/dados bancários) com guard:
  - `disabled` + overlay "Disponível após liberação do contrato (Gate 2)" quando `intake_status !== 'liberado'`.
- Após `intake_status='liberado'`, libera edição.

### C. Envio ao financeiro 100% manual
- Remover/desativar o trigger automático `trg_notify_finance_on_signature` (ou condicioná-lo a `enviar_financeiro_manual=false` — preferir remover para evitar duplicidade).
- Adicionar botão **"Enviar ao financeiro"** no `BlocoFinanceiroPanel`:
  - Habilitado só quando: contrato `assinado` + campos mínimos preenchidos (`forma_pagamento`, `condicao_pagamento`, `dia_vencimento`, e-mail do financeiro configurado na organização).
  - Chama `auto-notificar-financeiro` (ou `enviar-notificacao-financeiro` direto com JWT do usuário).
  - Mostra estado "Enviado em {data}" lendo `email_financeiro_notificado_em`.
  - Permite reenvio com confirmação.

## Detalhes técnicos

- **Novo arquivo:** `src/components/contracts/NovoContratoWizard.tsx`.
- **Reaproveita:** edge functions `ia-extrair-campos`, `analisar-contrato`; form atual de contrato vira o passo 3.
- **Migração pequena:** `DROP TRIGGER trg_notify_finance_on_signature ON contratos;` (mantém a edge function — agora só via botão).
- **Sem mudanças** em RLS, enums, Gates, Revisão Legal ou Compliance.

## Fora de escopo

- Reescrita do form de contrato.
- Mudança no template do e-mail de tesouraria.
- Fallback de cadastro manual (descartado por decisão sua).
