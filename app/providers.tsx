'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, useEffect } from 'react';
import { NavbarProvider } from './components/NavbarContext';
import PortfolioDemoBar from './components/PortfolioDemoBar';
import { createClient } from '@/lib/supabase/client';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, 
        refetchOnWindowFocus: false,
        retry: 1, 
      },
    },
  }));

  // Previne flood de requests e loops de reload: quando o refresh token é inválido
  // limpamos as chaves órfãs sem disparar recarregamento infinito se já estiver no login.
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
        return;
      }

      // TOKEN_REFRESH_FAILED: sessão stale/inválida
      if ((event as string) === 'TOKEN_REFRESH_FAILED') {
        // 1. Limpa chaves do Supabase no localStorage para interromper tentativas contínuas de refresh
        if (typeof window !== 'undefined') {
          try {
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && (key.startsWith('sb-') || key.includes('-auth-token'))) {
                keysToRemove.push(key);
              }
            }
            keysToRemove.forEach((k) => localStorage.removeItem(k));
          } catch {
            // Ignora se localStorage estiver bloqueado
          }
        }

        // 2. Executa signOut local silencioso
        try {
          await supabase.auth.signOut();
        } catch {
          // Ignora erro se já estiver desautenticado
        }

        // 3. Apenas redireciona se estiver fora da página de login (evita loop infinito de reload)
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname;
          if (currentPath !== '/login' && !currentPath.startsWith('/login')) {
            window.location.href = '/login';
          }
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <NavbarProvider>
        {children}
        <PortfolioDemoBar />
      </NavbarProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}