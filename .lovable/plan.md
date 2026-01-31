
# Plano: Implementar Sistema de Convites por Email

## Problema Identificado

O sistema atual não possui um fluxo real de convites por email. Atualmente:
- Administradores só conseguem adicionar usuários que **já existem** no sistema
- Não há como convidar pessoas externas que ainda não têm conta
- A página "Aguardando Convite" menciona receber convite por email, mas isso não funciona

## Solução Proposta

Criar um sistema completo de convites com:
1. Tabela para armazenar convites pendentes
2. Envio de email com link de convite
3. Página para aceitar convite
4. Atualização do fluxo de cadastro

---

## Etapas de Implementação

### 1. Criar tabela de convites pendentes

**Nova tabela: `organization_invites`**
- `id` - identificador único
- `organization_id` - organização que está convidando
- `email` - email do convidado
- `role_in_org` - papel que terá (member, admin)
- `invited_by` - quem enviou o convite
- `token` - token único para o link de convite
- `expires_at` - data de expiração (7 dias)
- `accepted_at` - quando foi aceito (null se pendente)
- `created_at` - quando foi criado

**Políticas RLS:**
- Admins da organização podem criar convites
- Qualquer pessoa pode ler convite pelo token (para aceitar)

### 2. Criar Edge Function para envio de email

**Função: `enviar-convite-organizacao`**
- Recebe: email, organization_id, role, token
- Envia email com template de convite contendo:
  - Nome da organização
  - Quem convidou
  - Link para aceitar (com token)
  - Prazo de expiração

### 3. Atualizar página de Membros

**Modificar `OrganizationMembers.tsx`:**
- Ao digitar email que não existe no sistema:
  - Criar registro em `organization_invites`
  - Enviar email de convite
  - Mostrar toast: "Convite enviado para {email}"
- Listar convites pendentes abaixo da tabela de membros
- Permitir reenviar ou cancelar convites

### 4. Criar página de aceite de convite

**Nova página: `/aceitar-convite?token=xxx`**
- Valida token e verifica se não expirou
- Se usuário não tem conta: redireciona para cadastro com email preenchido
- Se usuário já tem conta: aceita convite e adiciona à organização
- Atualiza `accepted_at` e cria registro em `organization_members`

### 5. Atualizar fluxo de autenticação

**Modificar `AuthCallback.tsx`:**
- Após login/cadastro, verificar se há convite pendente para o email do usuário
- Se houver, aceitar automaticamente e redirecionar para dashboard

**Modificar `WaitingForInvite.tsx`:**
- Verificar convites pendentes ao clicar em "Verificar Novamente"
- Se encontrar convite, aceitar e redirecionar

---

## Fluxo Final do Usuário

```text
Cenário 1: Convidar pessoa SEM conta
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Admin adiciona  │───>│ Sistema envia   │───>│ Pessoa clica no │
│ email externo   │    │ email convite   │    │ link do email   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                                                       ▼
                                              ┌─────────────────┐
                                              │ Cria conta e é  │
                                              │ adicionada org  │
                                              └─────────────────┘

Cenário 2: Convidar pessoa COM conta
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Admin adiciona  │───>│ Sistema envia   │───>│ Pessoa clica no │
│ email existente │    │ email convite   │    │ link do email   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                                                       ▼
                                              ┌─────────────────┐
                                              │ Aceita e entra  │
                                              │ na organização  │
                                              └─────────────────┘
```

---

## Detalhes Técnicos

### Estrutura da tabela `organization_invites`

```sql
CREATE TABLE public.organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  email TEXT NOT NULL,
  role_in_org TEXT NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, email)
);
```

### Template de Email

Email com design profissional contendo:
- Logo do LexFlow
- "Você foi convidado para [Nome da Organização]"
- "Convidado por: [Nome do Admin]"
- Botão: "Aceitar Convite"
- Texto pequeno: "Este convite expira em 7 dias"

### Arquivos a Serem Modificados/Criados

| Arquivo | Ação |
|---------|------|
| `supabase/migrations/xxx_create_organization_invites.sql` | Criar tabela e RLS |
| `supabase/functions/enviar-convite-organizacao/index.ts` | Edge function para email |
| `src/pages/OrganizationMembers.tsx` | Adicionar lógica de convite |
| `src/pages/AcceptInvite.tsx` | Nova página para aceitar convite |
| `src/pages/AuthCallback.tsx` | Verificar convites pendentes |
| `src/pages/WaitingForInvite.tsx` | Melhorar mensagem e verificação |
| `src/App.tsx` | Adicionar rota `/aceitar-convite` |

---

## Benefícios

1. **Fluxo intuitivo** - Administradores podem convidar qualquer email
2. **Experiência guiada** - Convidados recebem email com instruções claras
3. **Segurança** - Tokens únicos com expiração
4. **Rastreabilidade** - Histórico de quem convidou quem
