---
type: skill
name: Documentation
description: Generate and update technical documentation
skillSlug: documentation
phases: [P, C]
generated: 2026-05-23
status: filled
scaffoldVersion: "2.0.0"
---

# Documentation

## When to Use

Ativar ao criar ou atualizar documentação técnica, de usuário ou de API do LexFlow.

## Instructions

1. **Identificar o documento a atualizar**:
   - `DOCUMENTACAO_TECNICA.md` — Arquitetura, RLS, edge functions, stack
   - `MANUAL_DO_USUARIO.md` — Guia de uso para gestores
   - `MANUAL_SUPER_ADMIN.md` — Operações de plataforma
   - `PROGRESS.md` — Status de blocos e spec
   - `README.md` — Overview do módulo core
   - `SECURITY.md` — Política de segurança
   - `docs/stories/` — Stories de desenvolvimento

2. **Verificar contra código atual** — nunca confiar em cache/memória

3. **Seguir padrões de formatação**:
   - Português brasileiro para docs de usuário
   - Tabelas para informações estruturadas
   - Code blocks com syntax highlighting
   - Links internos entre docs relacionados
   - Data de atualização no header

4. **Manter consistência de marca**:
   - Nome: "LexFlow" (nunca "Veridiana")
   - Domínio: `lexflowai.com.br`
   - Ícone: `Scale` (lucide-react)

5. **SEO** (para `index.html` e landing):
   - Open Graph tags
   - JSON-LD structured data
   - Meta description atualizada

## Examples

### Documentar nova edge function
```markdown
### `nome-da-funcao`
- **Tipo**: POST
- **Auth**: Bearer token (service_role para operações internas)
- **Input**: `{ campo1: string, campo2: number }`
- **Output**: `{ success: boolean, data?: T, error?: string }`
- **RLS**: Bypass com service_role
```

### Atualizar progresso
```markdown
| 19 | Nova Funcionalidade | ✅ |
```
