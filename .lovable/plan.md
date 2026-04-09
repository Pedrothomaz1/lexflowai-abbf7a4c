

# Checklist de Segurança Reutilizável para Novos Projetos

## Objetivo
Criar um arquivo `SECURITY_CHECKLIST.md` neste projeto que sirva como template padrão. Ao iniciar um novo projeto no Lovable, basta usar `@LexFlow` e pedir para aplicar o checklist de segurança.

## O que será criado

**Arquivo: `docs/security-checklist.md`**

Documento conciso com as 5 regras obrigatórias:

1. **RLS obrigatório** — Toda tabela criada deve ter `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
2. **Políticas com `auth.uid()`** — Todas as policies devem usar `auth.uid()` para escopo de usuário e `organization_id` para isolamento multi-tenant
3. **`service_role` apenas no backend** — Nunca importar ou referenciar a chave de serviço em código dentro de `src/`
4. **Storage privado** — Buckets criados com `is_public: false`, acesso via URLs assinadas (`createSignedUrl`)
5. **MCP sem `service_role`** — Nunca configurar conectores MCP com chave de serviço em produção

Incluirá também:
- Comandos SQL para verificação rápida (listar tabelas sem RLS, listar policies)
- Padrão de código para inserções com `organization_id` obrigatório
- Referência ao padrão `SECURITY DEFINER` para funções de permissão

## Como usar em novos projetos

No chat do novo projeto, enviar:
```
@LexFlow aplique o checklist de segurança de docs/security-checklist.md neste projeto
```

## Escopo técnico
- 1 arquivo Markdown criado
- Nenhuma alteração em código ou banco de dados

