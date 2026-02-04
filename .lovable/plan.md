
# Plano: Atualização de Branding/SEO e Domínio Customizado

## Resumo
Atualizar o `index.html` com as informações profissionais da marca LexFlow e preparar os metadados para o domínio `www.lexflowai.com.br`.

---

## O que será atualizado

### 1. Metadados SEO no `index.html`

| Campo | Valor Atual | Novo Valor |
|-------|-------------|------------|
| Título | `lexflow-ai-contracts` | `LexFlow - Gestão de Contratos` |
| Descrição | `Lovable Generated Project` | `Plataforma inteligente para gestão preventiva de contratos. Antecipe vencimentos, organize obrigações e mantenha o controle dos seus contratos empresariais.` |
| Autor | `Lovable` | `LexFlow AI` |
| Idioma | `en` | `pt-BR` |
| URL canônica | (não existe) | `https://www.lexflowai.com.br` |

### 2. Open Graph (compartilhamento em redes sociais)

| Campo | Valor Atual | Novo Valor |
|-------|-------------|------------|
| og:title | `lexflow-ai-contracts` | `LexFlow - Gestão de Contratos` |
| og:description | `Lovable Generated Project` | `Contratos sob controle. Decisões no tempo certo.` |
| og:url | (não existe) | `https://www.lexflowai.com.br` |
| og:image | Imagem genérica Lovable | `/og-image.png` (imagem própria) |
| og:locale | (não existe) | `pt_BR` |

### 3. Twitter/X Cards

| Campo | Valor Atual | Novo Valor |
|-------|-------------|------------|
| twitter:site | `@lovable_dev` | (remover - ou criar conta própria) |
| twitter:title | (não existe) | `LexFlow - Gestão de Contratos` |
| twitter:description | (não existe) | `Contratos sob controle. Decisões no tempo certo.` |
| twitter:image | Imagem genérica Lovable | `/og-image.png` |

---

## Sobre a Imagem OG

**Situação atual:** Não existe uma imagem OG própria da marca no projeto. O arquivo `logo-veridiana.png` está desatualizado.

**Opções:**
1. **Criar placeholder:** Usar o caminho `/og-image.png` agora e você faz upload da imagem depois
2. **Manter temporariamente:** Usar a imagem do Lovable até ter a imagem própria

**Recomendação:** Vou configurar o caminho `/og-image.png` e você pode fazer upload de uma imagem com as dimensões recomendadas (1200x630 pixels) quando estiver pronta.

---

## Sobre o Domínio Customizado

Para conectar o domínio `www.lexflowai.com.br`:

1. Acesse **Project Settings → Domains**
2. Clique em **Connect Domain**
3. Digite `lexflowai.com.br`
4. Siga as instruções para adicionar os registros DNS:
   - **A Record** para `@` (raiz) → `185.158.133.1`
   - **A Record** para `www` → `185.158.133.1`
   - **TXT Record** para `_lovable` → valor fornecido pelo Lovable

O SSL (HTTPS) será provisionado automaticamente após a propagação do DNS (pode levar até 72h).

---

## Arquivos que serão modificados

| Arquivo | Alteração |
|---------|-----------|
| `index.html` | Atualização completa dos metadados SEO, OG e Twitter |

---

## Detalhes Técnicos

```text
Estrutura final do <head>:
┌─────────────────────────────────────────────────┐
│ <html lang="pt-BR">                             │
│   <head>                                        │
│     ├─ charset, viewport                        │
│     ├─ title: LexFlow - Gestão de Contratos     │
│     ├─ meta description (profissional)          │
│     ├─ meta author: LexFlow AI                  │
│     ├─ link canonical: lexflowai.com.br         │
│     ├─ Open Graph tags (og:*)                   │
│     └─ Twitter Card tags (twitter:*)            │
│   </head>                                       │
└─────────────────────────────────────────────────┘
```
