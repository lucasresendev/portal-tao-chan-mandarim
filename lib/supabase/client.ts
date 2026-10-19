import '@/lib/demo/supabaseSandbox';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/database.types';

let clientInstance: ReturnType<typeof createClientComponentClient<Database>> | null = null;

/**
 * Cliente Supabase tipado para Client Components ('use client').
 * Implementa padrão Singleton para reaproveitar a instância do cliente durante
 * o ciclo de vida da aplicação no navegador.
 */
export function createClient() {
  if (!clientInstance) {
    clientInstance = createClientComponentClient<Database>();
  }
  return clientInstance;
}
