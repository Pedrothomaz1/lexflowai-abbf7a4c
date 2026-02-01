

# Plano: Correcao em Massa - organization_id em Todo o Sistema

## Problema Identificado

Foram encontrados **21 pontos de INSERT** em **17 arquivos** que estao **sem `organization_id`**, causando falha de RLS (Row-Level Security) em todas essas operacoes. Alem disso, ha problemas de enum invalido em Templates.

---

## Arquivos a Corrigir (Ordem de Prioridade)

### Prioridade 1: Cadastros Basicos (Mais Usados)

| Arquivo | Tabela | Correcao |
|---------|--------|----------|
| `src/components/Fornecedores/FornecedorForm.tsx` | `fornecedores` | Adicionar `organization_id` |
| `src/pages/Unidades.tsx` | `unidades` | Adicionar `organization_id` |
| `src/pages/Templates.tsx` | `contract_templates` | Adicionar `organization_id` + corrigir enum |
| `src/pages/Franquias.tsx` | `franquias` | Adicionar `organization_id` em 2 inserts |
| `src/pages/Contratos.tsx` | `contratos` | Adicionar `organization_id` |

### Prioridade 2: Funcionalidades de Contrato

| Arquivo | Tabela | Correcao |
|---------|--------|----------|
| `src/components/ContractComments.tsx` | `contract_comments` | Adicionar `organization_id` |
| `src/components/ContractDetails/ContractAttachments.tsx` | `contract_attachments` | Adicionar `organization_id` |
| `src/components/ContractDetails/ContractObligations.tsx` | `contract_obligations` | Adicionar `organization_id` |
| `src/components/ContractDetails/ContractQuickActions.tsx` | `contratos` + `contract_alerts` | Adicionar `organization_id` em 2 inserts |
| `src/components/ContractDetails/ContractRedlineEditor.tsx` | `contract_redlines` | Adicionar `organization_id` |
| `src/components/ContractSignature.tsx` | `contract_signatures` | Adicionar `organization_id` |
| `src/components/ContractImport/ContractImport.tsx` | `fornecedores` + `contratos` | Adicionar `organization_id` em 2 inserts |

### Prioridade 3: Configuracoes e Governanca

| Arquivo | Tabela | Correcao |
|---------|--------|----------|
| `src/pages/NotificationSettings.tsx` | `notification_preferences` | Adicionar `organization_id` |
| `src/pages/ComplianceLGPD.tsx` | `data_retention_policies` | Adicionar `organization_id` |
| `src/pages/Relatorios.tsx` | `report_configurations` + `compliance_logs` | Adicionar `organization_id` em 2 inserts |
| `src/pages/WorkflowAprovacoes.tsx` | `approval_workflows` | Adicionar `organization_id` |
| `src/pages/EspecificacoesServico.tsx` | `especificacoes_servico` | Adicionar `organization_id` |

### Prioridade 4: Auditoria

| Arquivo | Tabela | Correcao |
|---------|--------|----------|
| `src/hooks/useAuditLog.ts` | `audit_logs` | Adicionar `organization_id` |

---

## Padrao de Correcao

Cada arquivo seguira este padrao:

```typescript
// 1. Importar hook de organizacao
import { useOrganization } from "@/contexts/OrganizationContext";

// 2. Obter organization_id no componente
const { organization } = useOrganization();

// 3. Validar antes de inserir
if (!organization?.id) {
  toast({
    variant: "destructive",
    title: "Organizacao nao encontrada",
    description: "Finalize o onboarding ou verifique seu acesso.",
  });
  return;
}

// 4. Incluir no INSERT
const { error } = await supabase.from("tabela").insert({
  ...dados,
  organization_id: organization.id,
  created_by: user.id,
});
```

---

## Correcao Especifica: Templates (Enum)

Alem do `organization_id`, o arquivo `src/pages/Templates.tsx` precisa corrigir os valores do enum `contract_type`:

| Valor Atual (Invalido) | Valor Correto (Enum) |
|------------------------|----------------------|
| `servico` | `prestacao_servicos` |
| `compra` | `fornecimento` |
| `locacao` | `locacao` |
| `outro` | `outro` |

Novos valores disponiveis:
- `confidencialidade` (NDA)
- `parceria`

---

## Correcao Especifica: Fornecedor (UX)

No `FornecedorForm.tsx`, quando `tipo_pessoa === "fisica"`:
- Ocultar ou renomear campo "Porte da Empresa" 
- Tornar CNPJ opcional (ja esta)
- Label mais neutro para pessoa fisica

---

## Mensagens de Erro Melhoradas

Adicionar tratamento especifico para erros RLS:

```typescript
if (error) {
  if (error.message.includes("row-level security") || error.code === "42501") {
    toast({
      variant: "destructive",
      title: "Sem permissao",
      description: "Voce nao tem permissao para esta acao ou sua organizacao nao foi identificada.",
    });
  } else {
    toast({
      variant: "destructive",
      title: "Erro ao salvar",
      description: error.message,
    });
  }
}
```

---

## Ordem de Execucao

### Fase 1: Cadastros Criticos (5 arquivos)
1. `FornecedorForm.tsx` - Corrigir insert + UX pessoa fisica
2. `Unidades.tsx` - Adicionar organization_id
3. `Templates.tsx` - Adicionar organization_id + corrigir enum
4. `Franquias.tsx` - Adicionar organization_id em 2 inserts
5. `Contratos.tsx` - Adicionar organization_id

### Fase 2: Funcionalidades de Contrato (7 arquivos)
6. `ContractComments.tsx`
7. `ContractAttachments.tsx`
8. `ContractObligations.tsx`
9. `ContractQuickActions.tsx` (2 inserts)
10. `ContractRedlineEditor.tsx`
11. `ContractSignature.tsx`
12. `ContractImport.tsx` (2 inserts)

### Fase 3: Configuracoes (5 arquivos)
13. `NotificationSettings.tsx`
14. `ComplianceLGPD.tsx`
15. `Relatorios.tsx` (2 inserts)
16. `WorkflowAprovacoes.tsx`
17. `EspecificacoesServico.tsx`

### Fase 4: Auditoria (1 arquivo)
18. `useAuditLog.ts`

---

## Verificacao Pos-Correcao

Testar cada funcionalidade:
- [x] Criar fornecedor PF
- [x] Criar fornecedor PJ
- [x] Criar unidade
- [x] Criar template
- [x] Criar franquia
- [x] Criar contrato
- [x] Adicionar comentario em contrato
- [x] Upload de anexo
- [x] Criar obrigacao
- [x] Duplicar contrato
- [x] Criar alerta
- [x] Criar redline
- [x] Enviar para assinatura
- [x] Importar contratos
- [x] Salvar preferencias de notificacao
- [x] Criar politica de retencao
- [x] Criar relatorio
- [x] Criar workflow de aprovacao
- [x] Criar especificacao de servico

---

## Status: CONCLUIDO ✅

Todas as 21 correções foram aplicadas em 18 arquivos:

### Fase 1: Cadastros Criticos ✅
1. `FornecedorForm.tsx` - Corrigido + UX pessoa fisica
2. `Unidades.tsx` - organization_id adicionado
3. `Templates.tsx` - organization_id + enum corrigido
4. `Franquias.tsx` - 2 inserts corrigidos
5. `Contratos.tsx` - organization_id adicionado

### Fase 2: Funcionalidades de Contrato ✅
6. `ContractComments.tsx` - organization_id adicionado
7. `ContractAttachments.tsx` - organization_id adicionado
8. `ContractObligations.tsx` - organization_id adicionado
9. `ContractQuickActions.tsx` - 2 inserts corrigidos
10. `ContractRedlineEditor.tsx` - organization_id adicionado
11. `ContractSignature.tsx` - organization_id adicionado
12. `ContractImport.tsx` - 2 inserts corrigidos

### Fase 3: Configuracoes ✅
13. `NotificationSettings.tsx` - organization_id adicionado
14. `ComplianceLGPD.tsx` - organization_id adicionado
15. `Relatorios.tsx` - 2 inserts corrigidos
16. `WorkflowAprovacoes.tsx` - organization_id adicionado
17. `EspecificacoesServico.tsx` - organization_id adicionado

### Fase 4: Auditoria ✅
18. `useAuditLog.ts` - organization_id adicionado + busca automatica

---

## Resultado

- Todos os cadastros funcionam sem erro de RLS
- Templates usam valores validos do enum
- Formulario de fornecedor adapta-se para PF/PJ
- Mensagens de erro sao claras e orientam o usuario
- Sistema multi-tenant permanece seguro

