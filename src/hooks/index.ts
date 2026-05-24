/**
 * Barrel export for all React Query hooks
 *
 * Usage:
 * ```tsx
 * import { useContratos, useFornecedores, useFranquias } from '@/hooks';
 *
 * function App() {
 *   const { data: contratos } = useContratos(orgId);
 *   const { data: fornecedores } = useFornecedores(orgId);
 *   const { data: franquias } = useFranquias(orgId);
 *   // ...
 * }
 * ```
 */

export { useContratos } from './useContratos';
export { useFornecedores } from './useFornecedores';
export { useFranquias } from './useFranquias';
