/**
 * React Query hook for fetching franchises
 *
 * Features:
 * - Type-safe with Supabase Database types
 * - 5-minute stale time (cache duration)
 * - Automatic 2 retries on failure
 * - Offline-ready with persistent queries
 *
 * @example
 * ```tsx
 * import { useFranquias } from '@/hooks/useFranquias';
 *
 * function FranchiseMap({ orgId }: { orgId: string }) {
 *   const { data: franquias, isLoading, error } = useFranquias(orgId);
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <ErrorAlert message="Failed to load franchises" />;
 *
 *   return franquias?.map(f => (
 *     <FranchiseMarker key={f.id} franchise={f} />
 *   ));
 * }
 * ```
 */

import { useQuery } from '@tanstack/react-query';
import { supabaseClient } from '@/lib/supabase-client';
import type { Database } from '@/types/database';

type FranquiaRow = Database['public']['Tables']['franquias']['Row'];

/**
 * Fetch franchises for a specific organization
 *
 * @param orgId - Organization ID (required for filtering)
 * @returns useQuery result with franchises data, loading state, and error handling
 *
 * Query key structure: ['franquias', orgId]
 * - Enables per-org caching
 * - Automatic refetch when orgId changes
 */
export const useFranquias = (orgId: string) => {
  return useQuery({
    queryKey: ['franquias', orgId],
    queryFn: async (): Promise<FranquiaRow[]> => {
      const { data, error } = await supabaseClient
        .from('franquias')
        .select('*')
        .eq('organization_id', orgId)
        .order('nome', { ascending: true });

      if (error) {
        console.error('[useFranquias] Query failed:', error);
        throw new Error(`Failed to fetch franchises: ${error.message}`);
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
 * const { data } = useFranquias(orgId);
 * const activeOnly = data?.filter(f => f.status === 'ativa') || [];
 * const suspendedCount = data?.filter(f => f.status === 'suspensa').length || 0;
 * ```
 */

/**
 * Advanced usage: Calculate metrics
 *
 * ```tsx
 * const { data } = useFranquias(orgId);
 * const stats = {
 *   total: data?.length || 0,
 *   active: data?.filter(f => f.status === 'ativa').length || 0,
 *   inactive: data?.filter(f => f.status === 'inativa').length || 0,
 * };
 * ```
 */
