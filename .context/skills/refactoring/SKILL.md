---
type: skill
name: Refactoring
description: Safe code refactoring with step-by-step approach
skillSlug: refactoring
phases: [E]
generated: 2026-05-23
status: filled
scaffoldVersion: "2.0.0"
---

# Refactoring

## When to Use

Ativar ao identificar code smells ou oportunidades de melhoria que não alteram funcionalidade.

## Instructions

1. **Identificar o code smell**:
   - Componente com 200+ linhas → quebrar em componentes menores
   - Lógica de negócio no componente → extrair para hook
   - Código duplicado → extrair para função utilitária
   - `any` no TypeScript → adicionar tipagem correta
   - Inline styles → migrar para Tailwind classes
   - Magic numbers/strings → extrair para constantes

2. **Verificar cobertura de testes antes**:
   ```bash
   npm test -- --coverage
   ```

3. **Refatorar incrementalmente** (um step por vez):
   - Fazer UMA mudança
   - Rodar `npm run lint && npm run typecheck && npm test`
   - Verificar que comportamento não mudou
   - Commitar: `refactor: descrição`
   - Repetir

4. **NÃO alterar**:
   - Lógica de RLS
   - Comportamento de edge functions
   - Componentes shadcn/ui base (`src/components/ui/`)
   - APIs existentes (contratos de input/output)

5. **Padrões alvo**:
   ```tsx
   // Hook focado
   function useContratos(filters?: ContratoFilters) {
     return useQuery({
       queryKey: ['contratos', filters],
       queryFn: () => fetchContratos(filters),
     });
   }

   // Componente focado
   function ContratosPage() {
     const { data, isLoading } = useContratos();
     if (isLoading) return <PageSkeleton />;
     return <ContratosTable data={data} />;
   }
   ```

## Examples

```
refactor(hooks): extract contract fetching into useContratos hook
refactor(components): split ContratosPage into table and filters
refactor(types): replace any with ContractStatus union type
refactor(utils): consolidate date formatting functions
```
