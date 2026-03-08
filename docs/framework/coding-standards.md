# Coding Standards — LexFlow AI

## Componentes React
- Sempre TypeScript com interfaces de props explícitas
- Named exports para componentes reutilizáveis (`export function Foo`)
- Default export apenas para páginas (`export default Foo`)
- Props interfaces no topo do arquivo, antes do componente

## Estado e Side Effects
- Estado local com `useState`, global com Context
- `useEffect` sempre com dependências explícitas
- Queries Supabase diretamente nos hooks/páginas (sem camada de abstração extra)

## Estilo
- Tailwind CSS para todos os estilos
- `cn()` de `@/lib/utils` para classes condicionais
- shadcn/ui para componentes de UI base
- `AnimatedCard`, `AnimatedButton` de `@/components/ui/animated-*` para cards com animação

## Supabase
- Cliente sempre importado de `@/integrations/supabase/client`
- Organização sempre via `useOrganization()` para filtrar dados por tenant
- RLS habilitado em todas as tabelas — nunca bypassar

## Testes
- Vitest + jsdom + @testing-library/react
- Mocks de supabase via `vi.mock` + `makeMockChain()`
- Factories em `src/test/utils/test-factories.ts`
- Helper de render em `src/test/utils/test-helpers.tsx`
- Importar páginas dinamicamente com `await import()` para evitar problemas de módulo

## Nomenclatura
- Componentes: PascalCase
- Hooks: camelCase com prefixo `use`
- Arquivos de página: PascalCase (ex: `Dashboard.tsx`)
- Arquivos de componente: PascalCase (ex: `ContractInfoCard.tsx`)
- Constantes: UPPER_SNAKE_CASE
