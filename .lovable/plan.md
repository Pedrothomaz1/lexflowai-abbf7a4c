
# Plano: Atualizar Documentacao de Seguranca do Projeto

## Objetivo

Criar e atualizar arquivos de documentacao com foco em boas praticas de gestao de segredos, garantindo que desenvolvedores sigam padroes seguros ao trabalhar no projeto.

---

## Arquivos a Criar/Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `SECURITY.md` | Criar | Guia completo de seguranca do projeto |
| `.env.example` | Criar | Template de variaveis de ambiente |
| `README.md` | Modificar | Adicionar secao "Security Notes" |
| `DOCUMENTACAO_TECNICA.md` | Modificar | Adicionar nota de seguranca apos variaveis |

---

## 1. Criar SECURITY.md

Arquivo na raiz com orientacoes claras de seguranca:

### Conteudo Proposto

```text
SECURITY.md
├── Introducao
├── Gestao de Segredos
│   ├── Regra #1: Nunca commitar .env
│   ├── Regra #2: Usar apenas anon key no frontend
│   ├── Regra #3: SERVICE_ROLE_KEY apenas no backend
│   ├── Regra #4: Rotacao de chaves em caso de exposicao
│   └── Regra #5: RLS obrigatorio em tabelas sensiveis
├── Variaveis de Ambiente Seguras
│   ├── Chaves Publicas (podem ir no frontend)
│   └── Chaves Privadas (apenas Edge Functions)
├── Procedimento de Rotacao de Chaves
├── Row Level Security (RLS)
│   ├── Tabelas que exigem RLS
│   └── Verificacao de politicas
├── Checklist de Seguranca
└── Reportando Vulnerabilidades
```

### Topicos Detalhados

**Gestao de Segredos:**
- Arquivo `.env` esta no `.gitignore` - NUNCA remover
- `VITE_SUPABASE_PUBLISHABLE_KEY` (anon key) - segura para frontend
- `SUPABASE_SERVICE_ROLE_KEY` - NUNCA expor no client, apenas Edge Functions
- Se chave for exposta: rotacionar imediatamente no Lovable Cloud

**RLS Obrigatorio:**
- Listar tabelas que exigem RLS (contratos, fornecedores, profiles, etc.)
- Mencionar que o sistema usa isolamento multi-tenant via `organization_id`

---

## 2. Criar .env.example

Template com placeholders para referencia:

```bash
# Variaveis de Ambiente - LexFlowAI
# Copie este arquivo para .env e preencha os valores

# === FRONTEND (Variaveis publicas - prefixo VITE_) ===
VITE_SUPABASE_PROJECT_ID="seu-project-id"
VITE_SUPABASE_PUBLISHABLE_KEY="sua-anon-key"
VITE_SUPABASE_URL="https://seu-projeto.supabase.co"

# IMPORTANTE: As variaveis acima sao PUBLICAS e seguras para o frontend
# Chaves privadas como SERVICE_ROLE_KEY devem ser configuradas
# apenas no backend (Lovable Cloud > Secrets)
```

---

## 3. Modificar README.md

Adicionar secao "Security Notes" antes do final do arquivo:

```markdown
## Security Notes

Este projeto segue boas praticas de seguranca para proteger dados sensiveis.

- **Segredos**: Nunca commite arquivos `.env` com valores reais. Use `.env.example` como referencia.
- **Chaves de API**: Apenas a `anon key` e permitida no frontend. Chaves privadas devem ficar no backend.
- **RLS**: Todas as tabelas com dados sensiveis possuem Row Level Security habilitado.

Para mais detalhes, consulte o arquivo [SECURITY.md](./SECURITY.md).
```

---

## 4. Modificar DOCUMENTACAO_TECNICA.md

Adicionar nota de seguranca apos o bloco de variaveis do frontend (linha 145):

**Localizacao:** Apos a secao "### Frontend (.env)" na linha 141-145

**Conteudo a adicionar:**

```markdown
> **Nota de Seguranca:** O arquivo `.env` deve ser mantido apenas localmente e 
> NUNCA commitado no repositorio. Use `.env.example` como referencia para as 
> variaveis necessarias. As chaves `VITE_*` sao publicas e seguras para o frontend.
> Chaves privadas como `SERVICE_ROLE_KEY` devem ser configuradas apenas no backend
> via Lovable Cloud > Secrets.
```

---

## Resumo das Alteracoes

### SECURITY.md (Novo - ~80 linhas)
- Introducao ao modelo de seguranca
- 5 regras de gestao de segredos
- Procedimento de rotacao de chaves
- Guia de RLS
- Checklist de seguranca
- Canal para reportar vulnerabilidades

### .env.example (Novo - ~12 linhas)
- 3 variaveis com placeholders
- Comentarios explicativos
- Aviso sobre chaves privadas

### README.md (Modificar - adicionar ~10 linhas)
- Secao "Security Notes" com resumo
- Link para SECURITY.md

### DOCUMENTACAO_TECNICA.md (Modificar - adicionar ~5 linhas)
- Bloco de nota apos variaveis frontend
- Reforco sobre .env local e .env.example

---

## Validacao Final

Apos implementacao, verificar:
- [ ] `.gitignore` ja inclui `.env` (confirmado - ja esta configurado)
- [ ] `SECURITY.md` criado na raiz
- [ ] `.env.example` com placeholders corretos
- [ ] `README.md` com secao Security Notes
- [ ] `DOCUMENTACAO_TECNICA.md` com nota de seguranca

