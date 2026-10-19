import { installSupabaseSandbox, DEMO_ENV_FALLBACKS } from '@/lib/demo/supabaseSandbox';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database.types';

/**
 * Cliente Supabase tipado para Server Components e Server Actions ('use server').
 * Trata cookies de forma assíncrona respeitando a API do Next.js 16.
 * 
 * Recomendação: Use `supabase.auth.getUser()` para validar a identidade do usuário
 * no servidor, mantendo a renovação ativa de tokens centralizada no middleware/proxy.
 */
export async function createServerClient() {
  installSupabaseSandbox();
  const cookieStore = await cookies();
  return createServerComponentClient<Database>(
    {
      cookies: () => cookieStore as unknown as ReturnType<typeof cookies>,
    },
    {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || DEMO_ENV_FALLBACKS.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEMO_ENV_FALLBACKS.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    }
  );
}
