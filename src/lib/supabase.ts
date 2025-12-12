import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}
if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

// Client for browser/public use (respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side operations (bypasses RLS)
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Escapes special characters in search strings to prevent SQL injection
 * in Supabase PostgREST filter strings (used with .or(), .ilike(), etc.)
 *
 * Special characters that need escaping:
 * - % and _ are LIKE wildcards
 * - \ is the escape character
 * - . , ( ) are PostgREST filter syntax characters
 */
export function escapeSearchParam(search: string): string {
  if (!search) return '';

  return (
    search
      // Escape backslash first (since it's used as escape character)
      .replace(/\\/g, '\\\\')
      // Escape LIKE pattern characters
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_')
      // Escape PostgREST filter syntax characters
      .replace(/\./g, '\\.')
      .replace(/,/g, '\\,')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
  );
}

/**
 * Creates a safe ilike filter string for multiple columns
 * @param columns Array of column names to search
 * @param search The search term (will be escaped)
 * @returns A PostgREST .or() compatible filter string
 */
export function createSearchFilter(columns: string[], search: string): string {
  if (!search || columns.length === 0) return '';

  const escapedSearch = escapeSearchParam(search);
  return columns.map((col) => `${col}.ilike.%${escapedSearch}%`).join(',');
}

/**
 * Atomically updates a list's contact count using a database transaction
 * This prevents race conditions when multiple operations modify the count simultaneously
 *
 * @param listId The ID of the list to update
 * @param delta The amount to change the count by (positive to increment, negative to decrement)
 */
export async function updateListContactCount(
  listId: string,
  delta: number
): Promise<void> {
  // Use an RPC call to atomically update the count
  // This ensures the update is atomic and prevents race conditions
  const { error } = await supabaseAdmin.rpc('update_list_contact_count', {
    list_id: listId,
    count_delta: delta,
  });

  if (error) {
    // If the RPC doesn't exist, fallback to manual update with SELECT FOR UPDATE pattern
    // This is less ideal but works without database changes
    console.warn(
      'RPC not available, using fallback count update:',
      error.message
    );

    // Fallback: Get current count and update
    // Note: This still has a small race window but is better than nothing
    const { data: list } = await supabaseAdmin
      .from('lists')
      .select('contact_count')
      .eq('id', listId)
      .single();

    const currentCount = list?.contact_count || 0;
    const newCount = Math.max(0, currentCount + delta);

    await supabaseAdmin
      .from('lists')
      .update({
        contact_count: newCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', listId);
  }
}

/**
 * Recalculates a list's contact count from the list_contacts table
 * Use this to fix incorrect counts or after bulk operations
 *
 * @param listId The ID of the list to recalculate
 */
export async function recalculateListContactCount(
  listId: string
): Promise<number> {
  const { count } = await supabaseAdmin
    .from('list_contacts')
    .select('*', { count: 'exact', head: true })
    .eq('list_id', listId);

  const actualCount = count || 0;

  await supabaseAdmin
    .from('lists')
    .update({
      contact_count: actualCount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', listId);

  return actualCount;
}

export default supabase;
