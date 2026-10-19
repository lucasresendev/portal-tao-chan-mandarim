'use client';

import '@/lib/demo/supabaseSandbox';
import { DEMO_ACTIVE_USER_KEY } from '@/lib/demo/supabaseSandbox';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Home, BookOpen, MessageSquare, FileText, 
    Video, ExternalLink, ShieldCheck, Users, BookOpenCheck, 
    Library, TrendingUp, LogOut, ArrowRightLeft, Settings,
    User, Mail, Lock, Save, AlertCircle, Loader2, Brain
} from 'lucide-react';
import posthog from 'posthog-js';

type SidebarProps = {
    isOpen: boolean;
    onClose: () => void;
};

function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const queryClient = useQueryClient();
    const supabase = createClientComponentClient();
    const sidebarRef = useRef<HTMLDivElement>(null);

    // Consulta de Sessão no Cache ou Busca Nova
    const { data: sessionData } = useQuery({
        queryKey: ['user-session'],
        queryFn: async () => {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error || !user) throw new Error('Não autenticado');
            const { data: profile } = await supabase.from('alunos').select('nome, is_admin').eq('id', user.id).single();
            return { user, profile };
        },
        staleTime: Infinity,
    });

    const userId = sessionData?.user?.id;
    const userName = sessionData?.profile?.nome || '';
    const userEmail = sessionData?.user?.email || '';

    const isAdmin = pathname?.startsWith('/admin');
    const hasAdminPrivilege = sessionData?.profile?.is_admin || false;

    // Consulta para verificar se o aluno assistiu à aula 008 (Lição 05)
    const { data: hasWatchedClass008 = false } = useQuery({
        queryKey: ['progresso-classe-008', userId],
        enabled: !!userId,
        queryFn: async () => {
            const { data: aulaData, error: aulaError } = await supabase
                .from('aulas')
                .select('id')
                .in('codigo_aula', ['008', '8'])
                .maybeSingle();

            if (aulaError || !aulaData) return false;

            const { data: progressoData, error: progressoError } = await supabase
                .from('progresso_aluno')
                .select('aula_assistida')
                .eq('aluno_id', userId)
                .eq('aula_id', aulaData.id)
                .maybeSingle();

            if (progressoError || !progressoData) return false;
            return progressoData.aula_assistida === true;
        },
        staleTime: 1000 * 60 * 5, // 5 minutos de cache
    });

    // Metadados SRS
    const { data: srsMeta } = useQuery({
        queryKey: ['srs-meta', userId],
        enabled: !!userId,
        queryFn: async () => {
            const { data } = await supabase
                .from('progresso_srs_meta')
                .select('*')
                .eq('aluno_id', userId)
                .maybeSingle();
            return data || null;
        },
        staleTime: 1000 * 60 * 5, // 5 minutos de cache
    });

    // Estados do Modal do Perfil
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [editNome, setEditNome] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [profileSaveStatus, setProfileSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [profileError, setProfileError] = useState<string | null>(null);

    const handleOpenProfileModal = () => {
        setEditNome(userName);
        setEditEmail(userEmail);
        setEditPassword('');
        setProfileSaveStatus('idle');
        setProfileError(null);
        setIsProfileModalOpen(true);
    };

    // Mutation para salvar perfil do aluno no Supabase
    const profileMutation = useMutation({
        mutationFn: async (updates: { editNome: string, editEmail: string, editPassword?: string }) => {
            const authUpdates: { email?: string; password?: string } = {};
            if (updates.editEmail !== userEmail) authUpdates.email = updates.editEmail;
            if (updates.editPassword) authUpdates.password = updates.editPassword;

            if (Object.keys(authUpdates).length > 0) {
                const { error: authError } = await supabase.auth.updateUser(authUpdates);
                if (authError) throw authError;
            }

            if (updates.editNome !== userName && userId) {
                const { error: dbError } = await supabase.from('alunos').update({ nome: updates.editNome }).eq('id', userId);
                if (dbError) throw dbError;
            }

            return updates;
        },
        onSuccess: (updates) => {
            posthog.capture('profile_updated_sidebar', { 
                changed_name: updates.editNome !== userName, 
                changed_email: updates.editEmail !== userEmail, 
                changed_password: !!updates.editPassword 
            });

            // Atualiza o cache da sessão localmente para refletir na UI instantaneamente
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            queryClient.setQueryData(['user-session'], (old: any) => ({
                ...old,
                user: { ...old?.user, email: updates.editEmail },
                profile: { ...old?.profile, nome: updates.editNome }
            }));

            setProfileSaveStatus('saved');
            setTimeout(() => {
                setProfileSaveStatus('idle');
                setIsProfileModalOpen(false);
                setEditPassword('');
            }, 2000);
        },
        onError: (err: Error) => {
            setProfileSaveStatus('error');
            setProfileError(err.message || 'Erro ao atualizar os dados.');
        }
    });

    const handleUpdateProfile = (e: React.FormEvent) => {
        e.preventDefault();
        setProfileSaveStatus('saving');
        setProfileError(null);
        profileMutation.mutate({ editNome, editEmail, editPassword });
    };

    // Logout
    const handleLogout = async () => {
        posthog.capture('user_logged_out_sidebar');
        posthog.reset();
        if (typeof window !== 'undefined') {
            try {
                window.localStorage.removeItem(DEMO_ACTIVE_USER_KEY);
            } catch {
                // Ignora
            }
        }
        queryClient.clear();
        await supabase.auth.signOut();
        router.push('/login');
        onClose();
    };

    // Fecha o menu com ESC
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isProfileModalOpen) onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
            if (!isProfileModalOpen) document.body.style.overflow = 'hidden'; // impede scroll do fundo
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, isProfileModalOpen, onClose]);

    // Animações Framer Motion
    const backdropVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
    };

    const drawerVariants = {
        hidden: { x: '-100%' },
        visible: { 
            x: 0,
            transition: { type: 'spring' as const, damping: 28, stiffness: 250 }
        },
    };

    const linkClasses = (href: string) => {
        const isActive = pathname === href;
        return `flex items-center justify-between px-4 py-3 rounded-tcm-md text-sm font-semibold transition-tcm group duration-200 ${
            isActive 
                ? 'bg-tcm-red/10 text-tcm-red border-l-4 border-tcm-yellow font-bold pl-3 shadow-tcm-inner'
                : 'text-slate-600 hover:bg-tcm-red/5 hover:text-tcm-red'
        }`;
    };

    // Render de cada Link
    const renderLink = (href: string, label: string, icon: React.ReactNode, isExternal = false) => {
        if (isExternal) {
            return (
                <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                        posthog.capture('sidebar_external_link_clicked', { url: href, label });
                        onClose();
                    }}
                    className="flex items-center justify-between px-4 py-3 rounded-tcm-md text-sm font-semibold text-slate-600 hover:bg-tcm-red/5 hover:text-tcm-red transition-tcm group duration-200"
                >
                    <div className="flex items-center gap-3">
                        <span className="text-slate-400 group-hover:text-tcm-red transition-colors">{icon}</span>
                        <span>{label}</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-tcm-red/50 transition-colors shrink-0" />
                </a>
            );
        }

        return (
            <Link
                href={href}
                onClick={onClose}
                className={linkClasses(href)}
            >
                <div className="flex items-center gap-3">
                    <span className={`transition-colors duration-200 ${
                        pathname === href ? 'text-tcm-red' : 'text-slate-400 group-hover:text-tcm-red'
                    }`}>{icon}</span>
                    <span>{label}</span>
                </div>
            </Link>
        );
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            variants={backdropVariants}
                            transition={{ duration: 0.2 }}
                            onClick={onClose}
                            className="fixed inset-0 bg-[#1a0505]/50 backdrop-blur-sm z-100"
                        />

                        {/* Drawer */}
                        <motion.div
                            ref={sidebarRef}
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            variants={drawerVariants}
                            className="fixed top-0 left-0 h-dvh w-75 sm:w-[320px] max-w-full bg-[#fffcf8] shadow-tcm-lg z-101 flex flex-col border-r-4 border-tcm-yellow/40 rounded-r-tcm-xl overflow-hidden"
                        >
                            {/* Header */}
                            <div className="bg-tcm-red px-5 py-4 flex justify-between items-center border-b-4 border-tcm-yellow shadow-md shrink-0">
                                <div className="flex items-center gap-2.5">
                                    <div className="bg-tcm-yellow/20 p-1.5 rounded-full shadow-inner border border-tcm-yellow/30 flex items-center justify-center">
                                        <Image src="/favicon.webp" alt="Logo" width={24} height={24} className="w-6 h-6 object-contain rounded-full drop-shadow-md" />
                                    </div>
                                    <span className="font-bold text-white tracking-wide text-base drop-shadow-sm">Tao Ch&apos;an Mandarim</span>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer"
                                    aria-label="Fechar menu"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Corpo com Scroll */}
                            <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-5 space-y-6">
                                
                                {/* Card do Usuário com botão de Perfil Integrado */}
                                {sessionData?.profile && (
                                    <div className="bg-white/60 border border-slate-100 rounded-tcm-lg p-4 shadow-tcm-sm flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div className="bg-tcm-red/10 text-tcm-red font-bold w-10 h-10 rounded-tcm-md flex items-center justify-center shrink-0 border border-tcm-red/20 shadow-tcm-inner text-base">
                                                {sessionData.profile.nome ? sessionData.profile.nome[0].toUpperCase() : 'A'}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-bold text-slate-800 text-sm truncate">
                                                    {sessionData.profile.nome || 'Aluno'}
                                                </p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                                        hasAdminPrivilege && isAdmin
                                                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                                            : 'bg-red-50 text-tcm-red border border-tcm-red/10'
                                                    }`}>
                                                        {hasAdminPrivilege && isAdmin 
                                                            ? 'Lǎoshī (Admin)' 
                                                            : hasWatchedClass008 
                                                                ? '学生 Xuésheng' 
                                                                : 'Estudante'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleOpenProfileModal}
                                            className="p-2 text-slate-400 hover:text-tcm-red hover:bg-tcm-red/5 rounded-tcm-md transition-tcm cursor-pointer shrink-0"
                                            title="Configurações do Perfil"
                                        >
                                            <Settings className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}

                                {/* Alternar Rápido de Portal para Administradores */}
                                {hasAdminPrivilege && (
                                    <button
                                        onClick={() => {
                                            router.push(isAdmin ? '/dashboard' : '/admin');
                                            onClose();
                                        }}
                                        className="w-full bg-amber-50/50 hover:bg-amber-50 border-2 border-dashed border-amber-300/60 rounded-tcm-lg p-3 flex items-center justify-between text-amber-800 font-bold text-xs tracking-wider uppercase transition-tcm hover:border-amber-400 group shadow-tcm-sm hover:shadow-tcm-md"
                                    >
                                        <span className="flex items-center gap-2">
                                            <ShieldCheck className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
                                            {isAdmin ? 'Ir para Portal do Aluno' : 'Ir para Painel Admin'}
                                        </span>
                                        <ArrowRightLeft className="w-3.5 h-3.5 text-amber-500/60 group-hover:rotate-180 transition-transform duration-300" />
                                    </button>
                                )}

                                {/* Navegação Principal */}
                                <nav className="space-y-5">
                                    {isAdmin && hasAdminPrivilege ? (
                                        /* Seção Professor/Admin (Modo Lǎoshī) */
                                        <div className="space-y-1.5 bg-amber-50/20 border border-amber-200/20 rounded-tcm-lg p-2 text-slate-800">
                                            <h3 className="text-[10px] font-bold uppercase text-amber-600 tracking-widest px-2 mb-2 flex items-center gap-1.5">
                                                <ShieldCheck className="w-3.5 h-3.5" />
                                                Painel Lǎoshī
                                            </h3>
                                            {renderLink('/admin', 'Início Painel', <Home className="w-4 h-4" />)}
                                            {renderLink('/admin/alunos', 'Gerenciar Alunos', <Users className="w-4 h-4" />)}
                                            {renderLink('/admin/aulas', 'Gerenciar Aulas', <BookOpenCheck className="w-4 h-4" />)}
                                            {renderLink('/admin/atividades', 'Provas & Atividades', <FileText className="w-4 h-4" />)}
                                            {renderLink('/admin/dialogos', 'Simulador IA', <MessageSquare className="w-4 h-4" />)}
                                            {renderLink('/admin/dicionario', 'Dicionário Global', <Library className="w-4 h-4" />)}
                                            {renderLink('/admin/biblioteca', 'Biblioteca', <Library className="w-4 h-4" />)}
                                            {renderLink('/admin/progresso', 'Visão de Progresso', <TrendingUp className="w-4 h-4" />)}
                                        </div>
                                    ) : (
                                        /* Seção Portal do Aluno (Modo Aluno) */
                                        <div className="space-y-1.5">
                                            <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest px-4 mb-2">Portal do Aluno</h3>
                                            {renderLink('/dashboard', 'Página Inicial', <Home className="w-4 h-4" />)}
                                            {renderLink('/dashboard/dicionario', 'Dicionário Pessoal', <BookOpen className="w-4 h-4" />)}
                                            {srsMeta?.srs_habilitado && renderLink('/dashboard/dicionario/srs', 'Treino com Flashcards', <Brain className="w-4 h-4" />)}
                                            {renderLink('/dashboard/simulador', 'Simulador de Diálogos', <MessageSquare className="w-4 h-4" />)}
                                            {renderLink('/dashboard/atividades', 'Provas & Atividades', <FileText className="w-4 h-4" />)}
                                            {renderLink('/dashboard/biblioteca', 'Biblioteca', <Library className="w-4 h-4" />)}
                                            {renderLink('/demo/aula-ao-vivo', 'Aula Ao Vivo', <Video className="w-4 h-4" />)}
                                        </div>
                                    )}
                                </nav>
                            </div>

                            {/* Footer Fixo */}
                            <div className="border-t border-slate-100 p-4 bg-slate-50 shrink-0 flex items-center justify-between gap-3">
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-2 text-slate-500 hover:text-red-600 text-xs font-bold uppercase tracking-wider py-2 px-3 rounded-tcm-sm hover:bg-red-50 transition-colors cursor-pointer"
                                >
                                    <LogOut className="w-4 h-4 shrink-0" />
                                    Sair da Conta
                                </button>
                                <span className="text-[10px] font-semibold text-slate-400 tracking-widest uppercase">Tao Ch&apos;an</span>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* MODAL GLOBAL DE CONFIGURAÇÕES DE PERFIL */}
            <AnimatePresence>
                {isProfileModalOpen && (
                    <div 
                        className="fixed inset-0 z-120 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" 
                        onClick={() => setIsProfileModalOpen(false)}
                    >
                        <div 
                            className="bg-white rounded-tcm-xl w-full max-w-md shadow-tcm-lg overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200" 
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <div className="flex items-center gap-3">
                                    <div className="bg-tcm-red text-white p-2 rounded-tcm-md">
                                        <Settings className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-800">Seu Perfil</h2>
                                </div>
                                <button 
                                    onClick={() => setIsProfileModalOpen(false)} 
                                    className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <form onSubmit={handleUpdateProfile} className="p-6 space-y-5">
                                {profileError && (
                                    <div className="p-3 bg-red-50 text-red-600 rounded-tcm-md text-sm flex items-center gap-2 border border-red-100">
                                        <AlertCircle className="w-4 h-4" /> {profileError}
                                    </div>
                                )}
                                <div>
                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-1.5">
                                        <User className="w-4 h-4 text-slate-400" /> Nome Completo
                                    </label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={editNome} 
                                        onChange={e => setEditNome(e.target.value)} 
                                        className="w-full p-3 rounded-tcm-md border border-slate-200 focus:ring-2 focus:ring-tcm-red outline-none transition-tcm text-slate-800" 
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-1.5">
                                        <Mail className="w-4 h-4 text-slate-400" /> E-mail
                                    </label>
                                    <input 
                                        type="email" 
                                        required 
                                        value={editEmail} 
                                        onChange={e => setEditEmail(e.target.value)} 
                                        className="w-full p-3 rounded-tcm-md border border-slate-200 focus:ring-2 focus:ring-tcm-red outline-none transition-tcm text-slate-800" 
                                    />
                                </div>
                                <div className="pt-2 border-t border-slate-100">
                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-1.5">
                                        <Lock className="w-4 h-4 text-slate-400" /> Nova Senha (Opcional)
                                    </label>
                                    <input 
                                        type="password" 
                                        placeholder="Deixe em branco para manter a atual" 
                                        value={editPassword} 
                                        onChange={e => setEditPassword(e.target.value)} 
                                        className="w-full p-3 rounded-tcm-md border border-slate-200 focus:ring-2 focus:ring-tcm-red outline-none transition-tcm text-slate-800" 
                                    />
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={profileSaveStatus === 'saving'} 
                                    className="w-full bg-tcm-red hover:bg-tcm-dark-red text-white font-semibold py-3 rounded-tcm-md transition-tcm flex items-center justify-center gap-2 mt-4 disabled:opacity-70 cursor-pointer shadow-tcm-sm hover:shadow-tcm-md"
                                >
                                    {profileSaveStatus === 'saving' ? <Loader2 className="w-5 h-5 animate-spin" /> : profileSaveStatus === 'saved' ? <CheckCircle2 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                                    {profileSaveStatus === 'saving' ? 'Salvando...' : profileSaveStatus === 'saved' ? 'Salvo!' : 'Salvar Alterações'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}

// Pequeno auxiliar para renderizar Check de sucesso no botão do modal
function CheckCircle2(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5"
        >
            <circle cx="12" cy="12" r="10" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    );
}

export default React.memo(Sidebar);
