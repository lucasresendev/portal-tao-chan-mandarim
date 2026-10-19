'use client';

import { useState, Suspense } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { ExternalLink, GraduationCap, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react';
import posthog from 'posthog-js';
import { DEMO_ACCOUNTS, DEMO_ACTIVE_USER_KEY, isPortfolioDemoMode } from '@/lib/demo/supabaseSandbox';

const GITHUB_REPO_URL = 'https://github.com/lucasresendev/portal-tao-chan-mandarim';

function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeDemoRole, setActiveDemoRole] = useState<'student' | 'admin' | null>(null);

    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();
    const supabase = createClientComponentClient();
    const isDemo = isPortfolioDemoMode();

    const executeSignIn = async (loginEmail: string, loginPassword: string, preferredTarget?: string) => {
        setIsLoading(true);
        setError(null);

        try {
            queryClient.clear();

            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: loginEmail,
                password: loginPassword,
            });

            if (authError) {
                let mensagemErro = 'Ocorreu um erro ao tentar fazer login. Tente novamente.';

                if (authError.message === 'Invalid login credentials') {
                    mensagemErro = 'E-mail ou senha incorretos.';
                } else if (
                    authError.name === 'AuthRetryableFetchError' ||
                    authError.message.includes('Failed to fetch') ||
                    authError.message.includes('Network request failed')
                ) {
                    mensagemErro = 'Erro de conexão com o servidor. Verifique sua internet e tente novamente.';
                } else if (
                    authError.status === 429 ||
                    authError.message.toLowerCase().includes('rate limit')
                ) {
                    mensagemErro = 'Muitas tentativas de login. Aguarde alguns instantes.';
                } else {
                    mensagemErro = `Erro: ${authError.message}`;
                }

                setError(mensagemErro);
                setIsLoading(false);
                setActiveDemoRole(null);
                posthog.capture('login_failed', {
                    error_message: authError.message,
                    error_name: authError.name || 'Unknown',
                });
            } else if (authData.user) {
                const isAdmin =
                    authData.user.user_metadata?.is_admin === true ||
                    authData.user.email?.toLowerCase() === DEMO_ACCOUNTS.admin.email.toLowerCase();
                const roleLabel = isAdmin ? 'admin' : 'student';

                posthog.identify(authData.user.id, { email: authData.user.email, role: roleLabel });
                posthog.capture('user_logged_in', { role: roleLabel });

                const returnTo = searchParams.get('returnTo');
                const destination =
                    preferredTarget ||
                    (isAdmin
                        ? returnTo?.startsWith('/admin')
                            ? returnTo
                            : '/admin'
                        : returnTo?.startsWith('/dashboard')
                            ? returnTo
                            : '/dashboard');

                queryClient.clear();
                router.push(destination);
            }
        } catch (err: unknown) {
            const erro = err as Error;
            if (erro?.message?.includes('Failed to fetch') || erro?.name === 'TypeError') {
                setError('Erro de conexão. Verifique sua internet e tente novamente.');
            } else {
                setError('Ocorreu um erro inesperado. Tente novamente mais tarde.');
            }
            setIsLoading(false);
            setActiveDemoRole(null);
            posthog.capture('login_exception', { error_message: erro?.message || 'Unknown Error' });
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!navigator.onLine && !isDemo) {
            setError('Você parece estar offline. Verifique sua conexão e tente novamente.');
            return;
        }
        await executeSignIn(email, password);
    };

    const handleQuickDemoAccess = async (role: 'student' | 'admin') => {
        const account = DEMO_ACCOUNTS[role];
        if (typeof window !== 'undefined') {
            try {
                window.localStorage.setItem(DEMO_ACTIVE_USER_KEY, account.id);
            } catch {
                // Ignora
            }
        }
        setActiveDemoRole(role);
        setEmail(account.email);
        setPassword(account.password);
        await executeSignIn(account.email, account.password, role === 'admin' ? '/admin' : '/dashboard');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-chinese-pattern p-4 relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-[#f4c86b]/10 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="max-w-md w-full bg-[#5e1010]/95 backdrop-blur-md rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-[#ad1e1e] p-7 sm:p-10 relative z-10">
                <div className="text-center mb-7 flex flex-col items-center">
                    <div className="mb-3.5 drop-shadow-[0_0_15px_rgba(244,200,107,0.3)] bg-white/5 p-2 rounded-full border border-[#f4c86b]/30">
                        <Image
                            src="/favicon.webp"
                            alt="Logo Bodhidharma Tao Ch'an Mandarim"
                            width={72}
                            height={72}
                            priority
                            className="w-18 h-18 object-contain rounded-full"
                        />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Tao Ch&apos;an Mandarim</h1>
                    <p className="text-[#f4c86b] mt-1.5 text-xs uppercase tracking-widest font-bold">Portal do Aluno</p>
                </div>

                {isDemo && (
                    <div className="mb-6">
                        <div className="bg-black/20 border border-[#f4c86b]/25 rounded-2xl p-3.5 text-center">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-[#f4c86b]">
                                Versão Demo de Portfólio
                            </p>
                            <p className="text-xs text-white/70 font-medium mt-1 mb-2.5">
                                Entrar como:
                            </p>

                            <div className="grid grid-cols-2 gap-2.5">
                                <button
                                    type="button"
                                    disabled={isLoading}
                                    onClick={() => handleQuickDemoAccess('student')}
                                    className="flex items-center justify-center gap-2 bg-[#f4c86b]/15 hover:bg-[#f4c86b]/25 border border-[#f4c86b]/50 text-[#f4c86b] py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer disabled:opacity-60"
                                >
                                    {activeDemoRole === 'student' && isLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-[#f4c86b]" />
                                    ) : (
                                        <GraduationCap className="w-4 h-4 text-[#f4c86b]" />
                                    )}
                                    <span>Aluno</span>
                                </button>

                                <button
                                    type="button"
                                    disabled={isLoading}
                                    onClick={() => handleQuickDemoAccess('admin')}
                                    className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/25 text-white py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer disabled:opacity-60"
                                >
                                    {activeDemoRole === 'admin' && isLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                                    ) : (
                                        <ShieldCheck className="w-4 h-4 text-[#f4c86b]" />
                                    )}
                                    <span>Professor</span>
                                </button>
                            </div>
                        </div>

                        <div className="relative flex items-center justify-center my-5">
                            <div className="border-t border-white/10 w-full"></div>
                            <span className="bg-[#5e1010] px-3 text-[11px] uppercase tracking-wider text-white/40 font-semibold">
                                ou
                            </span>
                            <div className="border-t border-white/10 w-full"></div>
                        </div>
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    {error && (
                        <div className="bg-red-500/20 text-red-200 p-3 rounded-xl text-sm text-center border border-red-500/50 flex items-center justify-center gap-2 font-medium">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-white mb-1.5">E-mail</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#f4c86b]/70" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-[#8a1818]/50 border border-[#ad1e1e] text-white rounded-xl focus:ring-2 focus:ring-[#f4c86b] focus:border-transparent outline-none transition-all placeholder:text-white/40 text-sm"
                                    placeholder="aluno@email.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-white mb-1.5">Senha</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#f4c86b]/70" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-[#8a1818]/50 border border-[#ad1e1e] text-white rounded-xl focus:ring-2 focus:ring-[#f4c86b] focus:border-transparent outline-none transition-all placeholder:text-white/40 text-sm"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 bg-[#f4c86b] hover:bg-white text-[#5e1010] py-3.5 rounded-xl font-bold text-base transition-colors shadow-[0_0_15px_rgba(244,200,107,0.2)] hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] disabled:opacity-70 mt-2 cursor-pointer"
                    >
                        {isLoading && !activeDemoRole ? (
                            <Loader2 className="w-5 h-5 animate-spin text-[#5e1010]" />
                        ) : (
                            'Entrar na Plataforma'
                        )}
                    </button>
                </form>

                {isDemo && (
                    <div className="mt-6 pt-4 border-t border-white/10 text-center">
                        <a
                            href={GITHUB_REPO_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-white/70 hover:text-[#f4c86b] transition-colors"
                        >
                            <span>Ver código-fonte e documentação no GitHub</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function Login() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-chinese-pattern">
                    <Loader2 className="w-8 h-8 animate-spin text-[#f4c86b]" />
                </div>
            }
        >
            <LoginForm />
        </Suspense>
    );
}