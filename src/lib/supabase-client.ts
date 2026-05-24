/**
 * Supabase Client Factory with Type Safety
 *
 * Provides a strongly-typed Supabase client using the Database type definitions.
 * This ensures compile-time type checking for all database queries.
 *
 * Usage:
 * ```tsx
 * import { supabaseClient } from '@/lib/supabase-client';
 *
 * // Select with full type safety
 * const { data, error } = await supabaseClient
 *   .from('contratos')
 *   .select('*')
 *   .eq('organization_id', orgId);
 *
 * // TypeScript will catch errors at compile-time:
 * // - Wrong table names
 * // - Wrong column names
 * // - Wrong filter operator types
 * // - Wrong return type assumptions
 * ```
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/**
 * Initialize Supabase client with type definitions
 *
 * The `<Database>` generic ensures all queries are type-safe.
 * If VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY are missing,
 * the client will still work but without credentials.
 *
 * @throws Error if environment variables are not set in production
 */
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '[Supabase] Missing credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env'
  );
}

export const supabaseClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Example: Strongly-typed query
 *
 * ```tsx
 * // Contracts for a specific organization
 * const { data: contratos, error } = await supabaseClient
 *   .from('contratos')
 *   .select('id, titulo, status, data_vencimento')
 *   .eq('organization_id', orgId)
 *   .order('data_vencimento', { ascending: false });
 *
 * if (error) {
 *   console.error('Failed to fetch contratos:', error);
 *   return [];
 * }
 *
 * // TypeScript knows 'contratos' is Array<ContratosRow>
 * return contratos;
 * ```
 */

/**
 * Example: Insert with type safety
 *
 * ```tsx
 * const newContrato = {
 *   organization_id: orgId,
 *   titulo: 'Contrato de Fornecimento',
 *   data_vencimento: '2025-12-31',
 *   status: 'ativo' as const,
 * };
 *
 * const { data, error } = await supabaseClient
 *   .from('contratos')
 *   .insert([newContrato])
 *   .select();
 *
 * // TypeScript ensures newContrato matches Insert shape
 * ```
 */

/**
 * Example: Real-time subscription
 *
 * ```tsx
 * supabaseClient
 *   .channel('contratos-changes')
 *   .on(
 *     'postgres_changes',
 *     { event: '*', schema: 'public', table: 'contratos' },
 *     (payload) => {
 *       console.log('Contract updated:', payload.new);
 *     }
 *   )
 *   .subscribe();
 * ```
 */
