---
type: skill
name: PR Review
description: Review pull requests against team standards and best practices
skillSlug: pr-review
phases: [R, V]
generated: 2026-05-23
status: filled
scaffoldVersion: "2.0.0"
---

# PR Review

## When to Use

Ativar ao revisar um Pull Request para garantir que segue os padrões do LexFlow antes do merge.

## Instructions

1. **Verificar conventional commit** no título do PR
2. **Checar lint e typecheck**: `npm run lint && npm run typecheck`
3. **Revisar segurança**:
   - Novas tabelas têm RLS com `organization_id = current_user_org()`?
   - Edge functions validam input?
   - Sem secrets/credenciais hardcoded?
   - Sem SQL injection (usar parameterized queries)?
4. **Revisar qualidade de código**:
   - TypeScript strict (sem `any` desnecessário)?
   - Error handling com mensagens descritivas?
   - Imports absolutos (`@/`) preferidos?
   - Componentes focados (single responsibility)?
   - Hooks extraídos para lógica reutilizável?
5. **Verificar testes**:
   - Testes adicionados para código novo?
   - Edge cases cobertos?
   - `npm test` passando?
6. **Verificar documentação**:
   - Story atualizada com checkboxes e File List?
   - Docs atualizados se comportamento mudou?
   - Breaking changes documentados?
7. **Resultado**: Aprovar ou solicitar mudanças com feedback específico

## Examples

### Aprovação
```
✅ LGTM! 
- RLS correto para nova tabela
- Testes cobrem happy path e error cases
- Conventional commit adequado
```

### Solicitação de mudanças
```
🔄 Mudanças necessárias:
1. [BLOCKER] Tabela `nova_entidade` não tem RLS policy — adicionar USING (organization_id = current_user_org())
2. [MAJOR] Hook `useNovaEntidade` está usando `any` — tipar corretamente
3. [MINOR] Considerar extrair validação de form para hook separado
```
