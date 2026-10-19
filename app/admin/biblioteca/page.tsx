import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { Eye, EyeOff, FileText, Library, PlusCircle } from 'lucide-react';
import SetNavbar from '../../components/SetNavbar';
import BibliotecaList from './components/BibliotecaList';
import type { PublicacaoBiblioteca } from '../../../types/biblioteca';

export default async function AdminBibliotecaPage() {
    const cookieStore = await cookies();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerComponentClient({ cookies: () => cookieStore as any });

    const { data: posts } = await supabase
        .from('publicacoes_blog')
        .select('*')
        .order('ordem_exibicao', { ascending: true })
        .order('created_at', { ascending: false });

    const allPosts = (posts ?? []) as PublicacaoBiblioteca[];
    const publicados = allPosts.filter(p => p.status === 'publicado').length;
    const rascunhos = allPosts.filter(p => p.status === 'rascunho').length;

    return (
        <div className="min-h-screen pb-20 pt-20 bg-slate-50 font-sans px-4 sm:px-8">
            <SetNavbar
                title="Biblioteca"
                backLink="/admin"
            />

            <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
                {/* Cabeçalho Externo Unificado */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/60">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <div className="bg-tcm-red/10 p-2 rounded-xl text-tcm-red">
                                <Library className="w-5 h-5" />
                            </div>
                            <h1 className="text-xl font-bold text-slate-800">Biblioteca</h1>
                        </div>
                        <p className="text-xs text-slate-400 mt-1.5">Gerencie os conteúdos, artigos e materiais da biblioteca.</p>
                    </div>
                    <Link
                        href="/admin/biblioteca/nova"
                        className="flex items-center justify-center gap-2 bg-tcm-red hover:bg-tcm-dark-red text-white px-4 py-2.5 rounded-xl transition-all font-bold text-xs uppercase tracking-wider cursor-pointer shadow-sm active:scale-95 w-full sm:w-auto shrink-0 text-center animate-in fade-in"
                    >
                        <PlusCircle className="w-4 h-4 text-tcm-yellow" />
                        <span>Nova Publicação</span>
                    </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    {[
                        { label: 'Total', value: allPosts.length, icon: FileText, color: 'text-slate-600 bg-slate-100' },
                        { label: 'Publicados', value: publicados, icon: Eye, color: 'text-emerald-600 bg-emerald-50' },
                        { label: 'Rascunhos', value: rascunhos, icon: EyeOff, color: 'text-amber-600 bg-amber-50' },
                    ].map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
                            <div className={`p-2.5 rounded-xl ${color}`}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
                                <p className="text-xs text-slate-500 font-semibold mt-1">{label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Listagem Interativa */}
                <BibliotecaList initialPosts={allPosts} />
            </div>
        </div>
    );
}
