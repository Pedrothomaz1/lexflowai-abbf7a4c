

# Plano: Limpeza da Base de Dados e Checklist de Producao

## Resumo da Situacao Atual

### Dados Encontrados no Banco

| Tabela | Registros | Observacoes |
|--------|-----------|-------------|
| contratos | 76 | Maioria parece ser dados de teste (importados em lote) |
| fornecedores | 201 | **Muitos duplicados** (8x Rogerio Yamanishi, 8x Helder Honorio, etc.) |
| profiles | 1 | Apenas seu perfil (Pedro Eduardo Thomaz) |
| user_roles | 1 | Seu usuario como administrador |
| especificacoes_servico | 12 | Dados de configuracao |
| contract_alerts | 7 | Alertas de contratos |
| contract_approvals | 10 | Aprovacoes |
| contract_analysis | 7 | Analises de IA |
| uso_sistema | 6 | Registro de uso de tokens IA |
| notification_preferences | 1 | Suas preferencias |
| user_2fa_settings | 1 | Configuracao 2FA |
| integracao_config | 1 | Sistema de Compras (inativo) |
| Storage | 12 arquivos | 7 avatars + 5 outros documentos |

### Problemas de Dados Identificados

1. **Fornecedores duplicados**: Existem 20+ CNPJs repetidos com ate 8 copias cada
2. **Contratos de teste**: Varios com titulos como "teste", "Jovem Aprendiz" repetido, etc.
3. **Dados orfaos**: Contract analysis referenciando contratos que podem nao existir mais

---

## Secao 1: Scripts de Limpeza (Opcional)

**IMPORTANTE**: Antes de executar, voce deve decidir se quer manter os dados atuais ou comecar do zero.

### Opcao A: Limpeza Completa (Recomendado para producao limpa)

```sql
-- CUIDADO: Isso remove TODOS os dados de negocio
-- Execute na ordem para respeitar foreign keys

-- 1. Limpar tabelas dependentes primeiro
DELETE FROM contract_analysis;
DELETE FROM contract_alerts;
DELETE FROM contract_approvals;
DELETE FROM contract_comments;
DELETE FROM contract_history;
DELETE FROM contract_versions;
DELETE FROM contract_redlines;
DELETE FROM contract_attachments;
DELETE FROM contract_signatures;
DELETE FROM contract_obligations;
DELETE FROM negotiation_metrics;

-- 2. Limpar contratos
DELETE FROM contratos;

-- 3. Limpar fornecedores e relacionados
DELETE FROM fornecedor_anexos;
DELETE FROM fornecedor_categorias_servico;
DELETE FROM fornecedores;

-- 4. Limpar servicos
DELETE FROM servico_historico;
DELETE FROM servicos_periodicos;

-- 5. Limpar outros dados de teste
DELETE FROM solicitacoes_compras;
DELETE FROM uso_sistema;
DELETE FROM compliance_logs;
DELETE FROM audit_logs;

-- 6. Opcional: Manter especificacoes_servico e unidades como dados mestres
-- DELETE FROM especificacoes_servico;
-- DELETE FROM unidades;
```

### Opcao B: Limpeza Seletiva (Remover apenas duplicados)

```sql
-- Remove fornecedores duplicados mantendo o mais antigo de cada CNPJ
DELETE FROM fornecedores 
WHERE id NOT IN (
  SELECT MIN(id) 
  FROM fornecedores 
  GROUP BY cnpj
);

-- Remove contratos com titulo "teste"
DELETE FROM contratos WHERE LOWER(titulo) = 'teste';
```

---

## Secao 2: Problemas de Seguranca para Corrigir

### 2.1 RLS Policy - contract_analysis (ERRO)

A tabela `contract_analysis` expoe analises de risco para qualquer usuario autenticado.

```sql
-- Corrigir politica: apenas consultores e admins podem ver analises
DROP POLICY IF EXISTS "Authenticated users can view analysis" ON contract_analysis;

CREATE POLICY "Authorized users can view analysis"
ON contract_analysis
FOR SELECT
USING (
  has_any_role(auth.uid(), ARRAY['consultoria_juridica'::app_role, 'administrador'::app_role])
  OR EXISTS (
    SELECT 1 FROM contratos 
    WHERE contratos.id = contract_analysis.contrato_id 
    AND contratos.created_by = auth.uid()
  )
);
```

### 2.2 RLS Policy - profiles (AVISO)

Profiles esta visivel para todos usuarios autenticados. Isso e aceitavel para mostrar nomes em comentarios, mas pode ser restringido.

```sql
-- Opcional: Restringir campos sensiveis
-- Nao e critico pois ja limitamos a usuarios autenticados
```

---

## Secao 3: Configuracoes Obrigatorias para Producao

### 3.1 Leaked Password Protection

Voce deve habilitar a protecao contra senhas vazadas no painel de autenticacao.

### 3.2 URLs de Redirect

Verificar se as URLs de redirect estao configuradas para o dominio de producao.

### 3.3 Secrets Configurados

| Secret | Status |
|--------|--------|
| CRON_SECRET | OK |
| LOVABLE_API_KEY | OK |
| RESEND_API_KEY | OK |
| WEBHOOK_SECRET | OK |

### 3.4 Edge Functions

11 edge functions encontradas:
- analisar-contrato / analisar-contrato-ia
- enviar-notificacao-email / whatsapp / financeiro
- enviar-solicitacao-compras
- enviar-valores-contrato
- extrair-dados-pdf
- signature-webhook
- totp-auth
- verificar-alertas

---

## Secao 4: Checklist Pre-Producao

### Obrigatorio

| Item | Status | Acao |
|------|--------|------|
| Dados de teste removidos | Pendente | Executar scripts de limpeza |
| RLS contract_analysis | Pendente | Aplicar nova politica |
| URL Site configurada | Verificar | Backend Settings |
| Redirect URLs | Verificar | Backend Settings |
| Leaked Password Protection | Pendente | Habilitar em Auth Settings |
| 2FA funcionando | OK | Implementado |
| Cookie Banner LGPD | OK | Implementado |
| Audit Logs | OK | Implementado |

### Recomendado

| Item | Status | Acao |
|------|--------|------|
| Backup antes da limpeza | Pendente | Exportar dados se necessario |
| Testes de login | Pendente | Testar Google + Email/Senha |
| Testes de upload | OK | Avatar funcionando |
| Remover duplicados fornecedores | Pendente | Script SQL |

---

## Secao Tecnica: Resumo das Alteracoes

### Arquivos a Modificar

Nenhum arquivo de codigo precisa ser alterado para producao.

### Migrations SQL Necessarias

1. **Correcao RLS contract_analysis**: Nova politica restritiva
2. **Limpeza de dados**: Scripts DELETE (executar manualmente)

### Ordem de Execucao

1. Aprovar e executar limpeza de dados (se desejado)
2. Aplicar correcao de RLS para contract_analysis
3. Verificar configuracoes de Auth no painel
4. Publicar aplicacao

---

## Proximos Passos

Apos sua aprovacao, posso:

1. **Executar limpeza completa** - Remover todos dados de teste
2. **Corrigir RLS** - Aplicar politica mais restritiva em contract_analysis
3. **Manter dados** - Se preferir manter os dados atuais, apenas corrijo a seguranca

Qual opcao voce prefere?

