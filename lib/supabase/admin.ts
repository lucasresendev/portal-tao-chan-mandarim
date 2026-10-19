import { installSupabaseSandbox, DEMO_ENV_FALLBACKS } from '@/lib/demo/supabaseSandbox';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

/**
 * Cliente administrativo com privilégios de Service Role.
 * Apenas para uso exclusivo dentro de Server Actions ou Route Handlers restritos.
 * NUNCA importe ou utilize este cliente em Client Components ('use client').
 */
export function createAdminClient() {
  installSupabaseSandbox();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEMO_ENV_FALLBACKS.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || DEMO_ENV_FALLBACKS.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Configurações de Supabase Admin incompletas no ambiente (NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY).');
  }

  return createSupabaseClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
