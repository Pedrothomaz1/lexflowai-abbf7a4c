/**
 * React Query hook for fetching suppliers
 *
 * Features:
 * - Type-safe with Supabase Database types
 * - 5-minute stale time (cache duration)
 * - Automatic 2 retries on failure
 * - Offline-ready with persistent queries
 *
 * @example
 * ```tsx
 * import { useFornecedores } from '@/hooks/useFornecedores';
 *
 * function SupplierList({ orgId }: { orgId: string }) {
 *   const { data: fornecedores, isLoading, error } = useFornecedores(orgId);
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <ErrorAlert message="Failed to load suppliers" />;
 *
 *   return fornecedores?.map(f => (
 *     <SupplierCard key={f.id} supplier={f} />
 *   ));
 * }
 * ```
 */

import { useQuery } from '@tanstack/react-query';
import { supabaseClient } from '@/lib/supabase-client';
import type { Database } from '@/types/database';

type FornecedorRow = Database['public']['Tables']['fornecedores']['Row'];

/**
 * Fetch suppliers for a specific organization
 *
 * @param orgId - Organization ID (required for filtering)
 * @returns useQuery result with suppliers data, loading state, and error handling
 *
 * Query key structure: ['fornecedores', orgId]
 * - Enables per-org caching
 * - Automatic refetch when orgId changes
 */
export const useFornecedores = (orgId: string) => {
  return useQuery({
    queryKey: ['fornecedores', orgId],
    queryFn: async (): Promise<FornecedorRow[]> => {
      const { data, error } = await supabaseClient
        .from('fornecedores')
        .select('*')
        .eq('organization_id', orgId)
        .eq('ativo', true)
        .order('nome', { ascending: true });

      if (error) {
        console.error('[useFornecedores] Query failed:', error);
        throw new Error(`Failed to fetch suppliers: ${error.message}`);
      }

      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    enabled: !!orgId, // Disable when orgId is empty
  });
};

/**
 * Advanced usage: Filter by contact method
 *
 * ```tsx
 * const { data } = useFornecedores(orgId);
 * const withEmail = data?.filter(f => f.email !== null) || [];
 * ```
 */

/**
 * Advanced usage: Search/filter
 *
 * ```tsx
 * const { data } = useFornecedores(orgId);
 * const [searchTerm, setSearchTerm] = useState('');
 * const filtered = data?.filter(f => f.nome.includes(searchTerm)) || [];
 * ```
 */
