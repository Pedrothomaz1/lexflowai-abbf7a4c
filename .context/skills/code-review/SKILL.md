---
type: skill
name: Code Review
description: Review code quality, patterns, and best practices
skillSlug: code-review
phases: [R, V]
generated: 2026-05-23
status: filled
scaffoldVersion: "2.0.0"
---

# Code Review

## When to Use

Ativar ao revisar código para qualidade, padrões e aderência às melhores práticas do LexFlow.

## Instructions

1. **Verificar padrões de componente**:
   - Componentes React são focados (< 200 linhas)?
   - Lógica de negócio extraída em hooks (`use*`)?
   - Usando shadcn/ui primitives (não recriando do zero)?
   - Tailwind classes usando design tokens (não valores hardcoded)?

2. **Verificar TypeScript**:
   - Sem `any` desnecessário?
   - Interfaces/types definidos para props e retornos?
   - Enums ou union types para valores fixos?
   - Generics usados onde apropriado?

3. **Verificar data layer**:
   - React Query com `queryKey` consistente?
   - `staleTime` / `cacheTime` adequados?
   - Mutations com `onSuccess` para invalidar cache?
   - Supabase queries com filtros de `organization_id` (RLS)?

4. **Verificar error handling**:
   - Try/catch com mensagens descritivas?
   - Erros de UI mostrados ao usuário (toast/alert)?
   - Loading states implementados?
   - Empty states tratados?

5. **Verificar naming**:
   - camelCase para variáveis/funções
   - PascalCase para componentes/types/interfaces
   - Nomes descritivos (não `data`, `item`, `temp`)
   - Hooks começam com `use`

6. **Verificar segurança**:
   - Sem dados sensíveis em console.log
   - Input sanitizado antes de uso
   - Sem concatenação de SQL (usar parameterized)

## Examples

### Code smell detectado
```tsx
// ❌ Ruim: lógica misturada com render
function Contratos() {
  const [data, setData] = useState<any>([]);
  useEffect(() => {
    supabase.from('contratos').select('*').then(res => setData(res.data));
  }, []);
  return <div>{data.map((d: any) => <p>{d.titulo}</p>)}</div>;
}

// ✅ Melhor: hook separado com tipagem
function Contratos() {
  const { data, isLoading } = useContratos();
  if (isLoading) return <Skeleton />;
  return <ContratosTable data={data} />;
}
```
