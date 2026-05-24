/**
 * React Query hook for fetching contracts
 *
 * Features:
 * - Type-safe with Supabase Database types
 * - 5-minute stale time (cache duration)
 * - Automatic 2 retries on failure
 * - Offline-ready with persistent queries
 *
 * @example
 * ```tsx
 * import { useContratos } from '@/hooks/useContratos';
 *
 * function Dashboard({ orgId }: { orgId: string }) {
 *   const { data: contratos, isLoading, error, refetch } = useContratos(orgId);
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <ErrorAlert message="Failed to load contracts" />;
 *
 *   return (
 *     <>
 *       {contratos?.map(c => <ContratoCard key={c.id} contrato={c} />)}
 *       <Button onClick={() => refetch()}>Refresh</Button>
 *     </>
 *   );
 * }
 * ```
 */

import { useQuery } from '@tanstack/react-query';
import { supabaseClient } from '@/lib/supabase-client';
import type { Database } from '@/types/database';

type ContratoRow = Database['public']['Tables']['contratos']['Row'];

/**
 * Fetch contracts for a specific organization
 *
 * @param orgId - Organization ID (required for filtering)
 * @returns useQuery result with contracts data, loading state, and error handling
 *
 * Query key structure: ['contratos', orgId]
 * - Enables per-org caching
 * - Automatic refetch when orgId changes
 */
export const useContratos = (orgId: string) => {
  return useQuery({
    queryKey: ['contratos', orgId],
    queryFn: async (): Promise<ContratoRow[]> => {
      const { data, error } = await supabaseClient
        .from('contratos')
        .select('*')
        .eq('organization_id', orgId)
        .order('data_vencimento', { ascending: true });

      if (error) {
        console.error('[useContratos] Query failed:', error);
        throw new Error(`Failed to fetch contracts: ${error.message}`);
      }

      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    enabled: !!orgId, // Disable when orgId is empty
  });
};

/**
 * Advanced usage: Filter by status
 *
 * ```tsx
 * const { data } = useContratos(orgId);
 * const expiredContracts = data?.filter(c => c.status === 'vencido') || [];
 * ```
 */

/**
 * Advanced usage: Refetch on demand
 *
 * ```tsx
 * const { refetch } = useContratos(orgId);
 *
 * const handleCreate = async (title: string) => {
 *   // Create contract...
 *   await refetch(); // Refresh list
 * };
 * ```
 */
