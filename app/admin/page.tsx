
import { createServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Image from 'next/image';
import { Users, BookOpen, TrendingUp, MessageSquare, Library, FileText } from 'lucide-react';
import ActivityLog from './components/ActivityLog';
import RecentSessions from './components/RecentSessions';
import TodayStats from './components/TodayStats';
import SetNavbar from '../components/SetNavbar';

export default async function AdminHub() {
    const supabase = await createServerClient();

    const [
        { count: alunosAtivosCount },
        { count: aulasTotaisCount },
        { count: licoesCount },
        { count: dialogosCount },
        { count: palavrasCount },
        { count: tarefasConcluidasCount }
    ] = await Promise.all([
        supabase.from('alunos').select('*', { count: 'exact', head: true }).eq('status_matricula', 'Ativa').eq('is_admin', false),
        supabase.from('aulas').select('*', { count: 'exact', head: true }),
        supabase.from('aulas').select('*', { count: 'exact', head: true }).not('codigo_licao', 'is', null),
        supabase.from('dialogos').select('*', { count: 'exact', head: true }),
        supabase.from('dicionario').select('*', { count: 'exact', head: true }),
        supabase.from('progresso_aluno').select('*', { count: 'exact', head: true }).eq('status', 'Concluída')
    ]);

    return (
        <div className="min-h-screen pb-20 font-sans pt-16 bg-slate-50">
            <SetNavbar
                title="Painel do Professor"
            />

            <main className="max-w-5xl mx-auto px-4 mt-8 space-y-8">
                {/* Banner de Resumo */}
                <section className="bg-chinese-pattern rounded-3xl text-white shadow-xl relative overflow-hidden border border-tcm-darker-red bg-tcm-red">
                    <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/4 p-10 opacity-10 pointer-events-none">
                        <Image src="/favicon.webp" width={300} height={300} priority className="w-75 h-75 object-contain" alt="BG" />
                    </div>

                    <div className="relative z-10">
                        {/* Camada 1: Hoje em tempo real (PostHog) */}
                        <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-5">
                            <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
                                Hoje
                            </p>
                            {/* Mobile: scroll horizontal. Desktop: grid fixo 3 colunas */}
                            <div className="-mx-6 sm:mx-0 px-6 sm:px-0">
                                <div className="flex sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 overflow-x-auto pb-1 sm:pb-0 snap-x snap-mandatory scroll-smooth no-scrollbar">
                                    <TodayStats />
                                </div>
                            </div>
                        </div>

                        {/* Divisor */}
                        <div className="border-t border-white/10 mx-6 sm:mx-8" />

                        {/* Camada 2: Totais do sistema (Supabase — estáticos) */}
                        <div className="px-6 sm:px-8 py-5">
                            <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-4">Plataforma</p>
                            {/* Mobile: grid 3×2 compacto. Desktop: pílulas em linha */}
                            <div className="grid grid-cols-3 sm:hidden gap-2">
                                {[
                                    { label: 'Alunos', value: alunosAtivosCount ?? 0 },
                                    { label: 'Lições', value: licoesCount ?? 0 },
                                    { label: 'Aulas', value: aulasTotaisCount ?? 0 },
                                    { label: 'Tarefas', value: tarefasConcluidasCount ?? 0 },
                                    { label: 'Diálogos', value: dialogosCount ?? 0 },
                                    { label: 'Palavras', value: palavrasCount ?? 0 },
                                ].map(item => (
                                    <div key={item.label} className="bg-black/20 border border-white/10 rounded-xl p-2.5 flex flex-col items-center text-center">
                                        <span className="text-lg font-bold text-white leading-none">{item.value}</span>
                                        <span className="text-[10px] text-white/50 font-medium mt-0.5 leading-tight">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                            {/* Desktop: pílulas em linha */}
                            <div className="hidden sm:flex flex-wrap gap-3">
                                {[
                                    { label: 'Alunos ativos', value: alunosAtivosCount ?? 0 },
                                    { label: 'Lições oficiais', value: licoesCount ?? 0 },
                                    { label: 'Aulas totais', value: aulasTotaisCount ?? 0 },
                                    { label: 'Tarefas concluídas', value: tarefasConcluidasCount ?? 0 },
                                    { label: 'Diálogos', value: dialogosCount ?? 0 },
                                    { label: 'Palavras', value: palavrasCount ?? 0 },
                                ].map(item => (
                                    <div key={item.label} className="bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 flex items-center gap-3">
                                        <span className="text-xl font-bold text-white">{item.value}</span>
                                        <span className="text-xs text-white/60 font-medium leading-tight">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Grid Módulos simétrico 3 + 2 + 2 (sem botão viúvo) */}
                <section className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <Link href="/admin/aulas" className="md:col-span-2 flex items-center justify-between bg-white border-2 border-indigo-200 hover:border-indigo-400 rounded-2xl py-4 px-5 shadow-sm hover:shadow-md transition-all group cursor-pointer h-full">
                        <div className="flex items-center gap-4">
                            <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600 group-hover:scale-110 transition-transform"><BookOpen className="w-6 h-6" /></div>
                            <div>
                                <h2 className="text-base font-bold text-slate-800 leading-tight">Gerenciar Aulas</h2>
                                <p className="text-xs text-slate-500 mt-1">Crie e edite conteúdos.</p>
                            </div>
                        </div>
                    </Link>

                    <Link href="/admin/alunos" className="md:col-span-2 flex items-center justify-between bg-white border-2 border-emerald-200 hover:border-emerald-400 rounded-2xl py-4 px-5 shadow-sm hover:shadow-md transition-all group cursor-pointer h-full">
                        <div className="flex items-center gap-4">
                            <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600 group-hover:scale-110 transition-transform"><Users className="w-6 h-6" /></div>
                            <div>
                                <h2 className="text-base font-bold text-slate-800 leading-tight">Gerenciar Alunos</h2>
                                <p className="text-xs text-slate-500 mt-1">Níveis e permissões.</p>
                            </div>
                        </div>
                    </Link>

                    <Link href="/admin/progresso" className="md:col-span-2 flex items-center justify-between bg-white border-2 border-amber-200 hover:border-amber-400 rounded-2xl py-4 px-5 shadow-sm hover:shadow-md transition-all group cursor-pointer h-full">
                        <div className="flex items-center gap-4">
                            <div className="bg-amber-50 p-3 rounded-xl text-amber-600 group-hover:scale-110 transition-transform"><TrendingUp className="w-6 h-6" /></div>
                            <div>
                                <h2 className="text-base font-bold text-slate-800 leading-tight">Ver Progresso</h2>
                                <p className="text-xs text-slate-500 mt-1">Acompanhe métricas.</p>
                            </div>
                        </div>
                    </Link>

                    <Link href="/admin/dialogos" className="md:col-span-3 flex items-center justify-between bg-white border-2 border-sky-200 hover:border-sky-400 rounded-2xl py-4 px-5 shadow-sm hover:shadow-md transition-all group cursor-pointer h-full">
                        <div className="flex items-center gap-4">
                            <div className="bg-sky-50 p-3 rounded-xl text-sky-600 group-hover:scale-110 transition-transform"><MessageSquare className="w-6 h-6" /></div>
                            <div>
                                <h2 className="text-base font-bold text-slate-800 leading-tight">Simulador de Diálogos</h2>
                                <p className="text-xs text-slate-500 mt-1">Crie diálogos de treino.</p>
                            </div>
                        </div>
                    </Link>

                    <Link href="/admin/dicionario" className="md:col-span-3 flex items-center justify-between bg-white border-2 border-rose-200 hover:border-rose-400 rounded-2xl py-4 px-5 shadow-sm hover:shadow-md transition-all group cursor-pointer h-full">
                        <div className="flex items-center gap-4">
                            <div className="bg-rose-50 p-3 rounded-xl text-rose-600 group-hover:scale-110 transition-transform"><Library className="w-6 h-6" /></div>
                            <div>
                                <h2 className="text-base font-bold text-slate-800 leading-tight">Dicionário Global</h2>
                                <p className="text-xs text-slate-500 mt-1">Administre palavras.</p>
                            </div>
                        </div>
                    </Link>

                    <Link href="/admin/atividades" className="md:col-span-3 flex items-center justify-between bg-white border-2 border-teal-200 hover:border-teal-400 rounded-2xl py-4 px-5 shadow-sm hover:shadow-md transition-all group cursor-pointer h-full">
                        <div className="flex items-center gap-4">
                            <div className="bg-teal-50 p-3 rounded-xl text-teal-600 group-hover:scale-110 transition-transform"><FileText className="w-6 h-6" /></div>
                            <div>
                                <h2 className="text-base font-bold text-slate-800 leading-tight">Provas &amp; Atividades</h2>
                                <p className="text-xs text-slate-500 mt-1">Crie avaliações e redações.</p>
                            </div>
                        </div>
                    </Link>

                    <Link href="/admin/biblioteca" className="md:col-span-3 flex items-center justify-between bg-white border-2 border-orange-200 hover:border-orange-400 rounded-2xl py-4 px-5 shadow-sm hover:shadow-md transition-all group cursor-pointer h-full">
                        <div className="flex items-center gap-4">
                            <div className="bg-orange-50 p-3 rounded-xl text-orange-600 group-hover:scale-110 transition-transform"><Library className="w-6 h-6" /></div>
                            <div>
                                <h2 className="text-base font-bold text-slate-800 leading-tight">Biblioteca</h2>
                                <p className="text-xs text-slate-500 mt-1">Publique artigos, dicas e materiais.</p>
                            </div>
                        </div>
                    </Link>
                </section>

                {/* Sessões Recentes */}
                <RecentSessions />

                {/* Log de Atividades Recentes */}
                <ActivityLog />
            </main>
        </div>
    );
}