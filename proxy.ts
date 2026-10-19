import '@/lib/demo/supabaseSandbox';
import { isPortfolioDemoMode } from '@/lib/demo/supabaseSandbox';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ATUALIZAÇÃO AQUI: Mudamos de 'middleware' para 'proxy' ou 'default'
export default async function proxy(req: NextRequest) {
  const res = NextResponse.next();

  if (isPortfolioDemoMode()) {
    if (req.nextUrl.pathname === '/') {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return res;
  }

  const supabase = createMiddlewareClient({ req, res });

  // 1. Identifica o tipo de rota para não quebrar chamadas de API
  const isApiRoute = req.nextUrl.pathname.startsWith('/api/');
  const isProtectedRoute = req.nextUrl.pathname.startsWith('/dashboard') || req.nextUrl.pathname.startsWith('/admin');

  try {
    // 2. Tenta pegar a sessão ativamente
    const { data: { session }, error } = await supabase.auth.getSession();

    // ==========================================
    // ESCUDO 1: QUALQUER ERRO DE AUTENTICAÇÃO
    // ==========================================
    if (error) {
      console.error("⚠️ [Proxy] Erro de Autenticação Detectado:", error.message);

      if (isApiRoute) {
        return NextResponse.json({ error: 'Sessão inválida ou expirada.' }, { status: 401 });
      }

      // Se já estiver na rota de login, não redireciona para evitar loop de redirect
      const response = req.nextUrl.pathname === '/login' 
        ? res 
        : NextResponse.redirect(new URL('/login', req.url));

      req.cookies.getAll().forEach((cookie) => {
        if (cookie.name.includes('-auth-token') || cookie.name.startsWith('sb-')) {
          response.cookies.delete(cookie.name);
        }
      });

      return response;
    }

    // ==========================================
    // ESCUDO 2: ROTAS PROTEGIDAS SEM SESSÃO
    // ==========================================
    if (isProtectedRoute && !session) {
      if (isApiRoute) {
        return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
      }

      // Guarda a rota que o usuário tentou acessar para redirecionar após o login
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('returnTo', req.nextUrl.pathname + req.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }

    // ==========================================
    // ESCUDO 3: ROTA RAIZ COM SESSÃO ATIVA
    // ==========================================
    if (req.nextUrl.pathname === '/' && session) {
      const isAdmin = session.user?.user_metadata?.is_admin === true;
      return NextResponse.redirect(new URL(isAdmin ? '/admin' : '/dashboard', req.url));
    }

  } catch (e) {
    // ==========================================
    // ESCUDO 4: ERRO CRÍTICO INESPERADO
    // ==========================================
    console.error("🚨 [Proxy] Erro Fatal Inesperado:", e);
    
    if (isApiRoute) {
      return NextResponse.json({ error: 'Erro interno de servidor.' }, { status: 500 });
    }
    
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return res;
}

// ==========================================
// CONFIGURAÇÃO DO MATCHER
// ==========================================
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
