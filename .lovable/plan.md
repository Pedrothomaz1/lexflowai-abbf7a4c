

# Plano: Consolidar Politicas RLS da Tabela contract_requests

## Situacao Atual

A tabela `contract_requests` possui **8 politicas RLS** quando deveria ter apenas **4**, causando redundancia e potenciais conflitos.

```text
Politicas Atuais:
├── INSERT (2 duplicadas)
│   ├── "Público pode inserir requisições" → WITH CHECK (true)
│   └── "mt_contract_requests_insert" → WITH CHECK (true)  [REMOVER]
├── SELECT (2 conflitantes)
│   ├── "Usuários autenticados podem visualizar" → role-based
│   └── "mt_contract_requests_select" → org-based  [MANTER E AJUSTAR]
├── UPDATE (2 conflitantes)
│   ├── "Consultores e admins podem atualizar" → sem org_id
│   └── "mt_contract_requests_update" → com org_id  [MANTER]
└── DELETE (2 conflitantes)
    ├── "Admins podem deletar" → sem org_id
    └── "mt_contract_requests_delete" → com org_id  [MANTER]
```

---

## Modelo de Acesso Proposto

### Fluxo Hibrido

```text
┌─────────────────────────────────────────────────────────────────┐
│                    REQUISICOES DE CONTRATO                       │
├─────────────────────────────────────────────────────────────────┤
│  ENTRADA PUBLICA           │  GESTAO INTERNA                    │
│  (formulario /requisicao)  │  (pagina /requisicoes)             │
│                            │                                     │
│  • Usuario anonimo         │  • Usuario autenticado             │
│  • INSERT sem auth         │  • SELECT/UPDATE/DELETE            │
│  • organization_id = NULL  │  • Requer role + organization_id   │
│                            │                                     │
│  Edge Function bypassa RLS │  Frontend usa RLS                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Plano de Acao

### Etapa 1: Remover Politicas Redundantes

Remover 4 politicas antigas que nao seguem o padrao multi-tenant:

```sql
-- Remover politicas duplicadas/antigas
DROP POLICY IF EXISTS "Público pode inserir requisições" ON contract_requests;
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar requisições" ON contract_requests;
DROP POLICY IF EXISTS "Consultores e admins podem atualizar requisições" ON contract_requests;
DROP POLICY IF EXISTS "Admins podem deletar requisições" ON contract_requests;
```

### Etapa 2: Ajustar Politica INSERT

A politica `mt_contract_requests_insert` com `true` esta correta porque:
- A Edge Function usa `SERVICE_ROLE_KEY` que bypassa RLS
- Permite insercoes publicas quando necessario

**Nenhuma alteracao necessaria na INSERT.**

### Etapa 3: Ajustar Politica SELECT

A politica atual exige `organization_id = current_user_org()`, mas requisicoes publicas tem `organization_id = NULL`.

Precisamos ajustar para permitir que admins vejam requisicoes sem organizacao:

```sql
-- Recriar politica SELECT para incluir requisicoes sem organizacao
DROP POLICY IF EXISTS "mt_contract_requests_select" ON contract_requests;

CREATE POLICY "mt_contract_requests_select" ON contract_requests
FOR SELECT USING (
  auth.uid() IS NOT NULL 
  AND has_any_role(auth.uid(), ARRAY[
    'analista_juridico'::app_role, 
    'consultoria_juridica'::app_role, 
    'administrador'::app_role
  ])
  AND (
    organization_id IS NULL  -- Requisicoes publicas (ainda nao atribuidas)
    OR organization_id = current_user_org()  -- Requisicoes da organizacao
  )
);
```

### Etapa 4: Manter Politicas UPDATE e DELETE

As politicas `mt_contract_requests_update` e `mt_contract_requests_delete` estao corretas:
- Exigem `organization_id = current_user_org()`
- Isso significa que so podem ser editadas apos serem atribuidas a uma organizacao

---

## Resultado Final

Apos consolidacao, a tabela tera **4 politicas limpas**:

| Politica | Comando | Logica |
|----------|---------|--------|
| `mt_contract_requests_insert` | INSERT | `true` (Edge Function usa service role) |
| `mt_contract_requests_select` | SELECT | Role especifica + (org_id NULL ou propria org) |
| `mt_contract_requests_update` | UPDATE | org_id + role |
| `mt_contract_requests_delete` | DELETE | org_id + admin |

---

## Consideracoes Tecnicas

### Por que manter INSERT com `true`?

O formulario publico (`/requisicao`) chama a Edge Function `processar-requisicao-contrato` que:
1. Usa `SUPABASE_SERVICE_ROLE_KEY` (bypassa RLS)
2. Implementa propria validacao e rate limiting
3. Sanitiza todos os inputs

A politica `true` no RLS e uma camada de fallback, nao a protecao principal.

### Seguranca da Edge Function

A Edge Function ja implementa:
- Rate limiting (5 req/IP/hora)
- Honeypot anti-spam
- Validacao de campos obrigatorios
- Sanitizacao HTML
- Logging de IP e User-Agent

### Fluxo de Atribuicao

Quando uma requisicao publica e analisada internamente:
1. Usuario com role apropriada visualiza requisicao (org_id = NULL)
2. Ao aprovar/converter em contrato, atribui `organization_id`
3. A partir dai, aplica-se isolamento multi-tenant normal

---

## Migracao SQL Completa

```sql
-- =============================================
-- Consolidacao de Politicas RLS: contract_requests
-- =============================================

-- 1. Remover politicas duplicadas/antigas
DROP POLICY IF EXISTS "Público pode inserir requisições" ON contract_requests;
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar requisições" ON contract_requests;
DROP POLICY IF EXISTS "Consultores e admins podem atualizar requisições" ON contract_requests;
DROP POLICY IF EXISTS "Admins podem deletar requisições" ON contract_requests;

-- 2. Recriar SELECT para incluir requisicoes sem organizacao
DROP POLICY IF EXISTS "mt_contract_requests_select" ON contract_requests;

CREATE POLICY "mt_contract_requests_select" ON contract_requests
FOR SELECT USING (
  auth.uid() IS NOT NULL 
  AND has_any_role(auth.uid(), ARRAY[
    'analista_juridico'::app_role, 
    'consultoria_juridica'::app_role, 
    'administrador'::app_role
  ])
  AND (
    organization_id IS NULL
    OR organization_id = current_user_org()
  )
);

-- 3. Manter INSERT como esta (true)
-- Politica mt_contract_requests_insert ja existe e esta correta

-- 4. Manter UPDATE e DELETE como estao
-- Politicas mt_contract_requests_update e mt_contract_requests_delete 
-- ja exigem organization_id = current_user_org()
```

---

## Validacao Pos-Implementacao

Apos aplicar a migracao:

- [ ] Testar formulario publico /requisicao - deve continuar funcionando
- [ ] Testar pagina /requisicoes - deve listar requisicoes pendentes
- [ ] Verificar que apenas 4 politicas restam na tabela
- [ ] Confirmar isolamento entre organizacoes

