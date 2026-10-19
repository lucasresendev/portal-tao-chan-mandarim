// Accessibility helper for UX audit script: <label placeholder aria-label
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Tag, Calendar, Library } from 'lucide-react';
import SetNavbar from '../../components/SetNavbar';
import BibliotecaCard from '../../components/biblioteca/BibliotecaCard';
import type { PublicacaoBiblioteca } from '../../../types/biblioteca';
import { getDemoTableRows, isPortfolioDemoMode } from '@/lib/demo/supabaseSandbox';
import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

const supabaseStatic = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const getCachedBibliotecaPosts = unstable_cache(
    async () => {
        const { data, error } = await supabaseStatic
            .from('publicacoes_blog')
            .select('*')
            .eq('status', 'publicado')
            .order('ordem_exibicao', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Erro ao carregar materiais da biblioteca:", error);
            return [];
        }
        return data ?? [];
    },
    ['biblioteca-posts-list'],
    { revalidate: 60, tags: ['biblioteca-posts', 'blog-posts'] }
);

function formatDate(d: string) {
    return new Date(d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default async function BibliotecaPage({ searchParams }: { searchParams: Promise<{ categoria?: string }> }) {
    const { categoria: filtroCategoria } = await searchParams;

    const allPosts = isPortfolioDemoMode()
        ? getDemoTableRows<PublicacaoBiblioteca>('publicacoes_blog')
              .filter((p) => p.status === 'publicado')
              .sort((a, b) => {
                  const ordA = a.ordem_exibicao ?? 9999;
                  const ordB = b.ordem_exibicao ?? 9999;
                  if (ordA !== ordB) return ordA - ordB;
                  return String(b.created_at || '').localeCompare(String(a.created_at || ''));
              })
        : ((await getCachedBibliotecaPosts()) as PublicacaoBiblioteca[]);

    // Categorias únicas
    const categorias = Array.from(new Set(allPosts.map(p => p.categoria))).sort();

    // Artigo em destaque (definido pelo admin ou o primeiro da lista como fallback)
    const destaque = allPosts.find(p => p.e_destaque) || allPosts[0];

    // Filtro por categoria
    const postsParaExibir = filtroCategoria
        ? allPosts.filter(p => p.categoria === filtroCategoria)
        : allPosts;

    // Grid de posts secundários (não inclui o post em destaque na página principal para evitar duplicação)
    const postsGrid = filtroCategoria 
        ? postsParaExibir 
        : allPosts.filter(p => p.id !== destaque?.id);

    // Agrupar por categoria quando sem filtro
    const byCategoria = postsGrid.reduce<Record<string, PublicacaoBiblioteca[]>>((acc, p) => {
        if (!acc[p.categoria]) acc[p.categoria] = [];
        acc[p.categoria].push(p);
        return acc;
    }, {});

    return (
        <div className="min-h-screen pb-24 pt-16 bg-slate-50 font-sans">
            <SetNavbar title="Biblioteca" backLink="/dashboard" />

            <main className="max-w-5xl mx-auto px-4 mt-8 space-y-10">
                {/* Header descritivo */}
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                            <Library className="w-5 h-5" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Biblioteca de Conteúdos</h1>
                    </div>
                    <p className="text-sm text-slate-500">
                        Artigos, dicas, materiais culturais e conteúdos extras para enriquecer seus estudos.
                    </p>
                </div>

                {/* Filtros por categoria */}
                {categorias.length > 1 && (
                    <div className="flex flex-wrap gap-2">
                        <Link
                            href="/dashboard/biblioteca"
                            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all border-2 ${
                                !filtroCategoria
                                    ? 'bg-tcm-red text-white border-tcm-red'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-tcm-red hover:text-tcm-red'
                            }`}
                        >
                            Todos
                        </Link>
                        {categorias.map(cat => (
                            <Link
                                key={cat}
                                href={`/dashboard/biblioteca?categoria=${encodeURIComponent(cat)}`}
                                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all border-2 ${
                                    filtroCategoria === cat
                                        ? 'bg-tcm-red text-white border-tcm-red'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-tcm-red hover:text-tcm-red'
                                }`}
                            >
                                {cat}
                            </Link>
                        ))}
                    </div>
                )}

                {allPosts.length === 0 ? (
                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-tcm-lg p-16 text-center">
                        <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">Nenhum material disponível ainda na biblioteca.</p>
                        <p className="text-sm text-slate-400 mt-1">Novas publicações serão disponibilizadas em breve!</p>
                    </div>
                ) : (
                    <>
                        {/* Post em destaque (apenas sem filtro de categoria) */}
                        {!filtroCategoria && destaque && (
                            <section>
                                <Link
                                    href={`/dashboard/biblioteca/${destaque.slug}`}
                                    className="group block bg-white border-2 border-slate-200 hover:border-tcm-red rounded-tcm-lg overflow-hidden shadow-tcm-sm hover:shadow-tcm-md transition-tcm duration-300"
                                >
                                    <div className="grid md:grid-cols-2 gap-0">
                                        <div className="relative aspect-video md:aspect-auto min-h-48 bg-slate-100 overflow-hidden">
                                            {destaque.capa_url ? (
                                                <Image
                                                    src={destaque.capa_url}
                                                    alt={destaque.titulo}
                                                    fill
                                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                                    sizes="(max-width: 768px) 100vw, 50vw"
                                                    priority
                                                />
                                            ) : (
                                                <div className="absolute inset-0 bg-chinese-pattern" />
                                            )}
                                        </div>
                                        <div className="p-6 md:p-8 flex flex-col justify-center">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="bg-tcm-red text-white text-xs font-bold px-2.5 py-1 rounded-full">
                                                    {destaque.categoria}
                                                </span>
                                                <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Destaque</span>
                                            </div>
                                            <h2 className="text-2xl font-bold text-slate-900 group-hover:text-tcm-red transition-colors leading-snug mb-3">
                                                {destaque.titulo}
                                            </h2>
                                            <div className="flex items-center gap-4 text-xs text-slate-400 mt-auto pt-4 border-t border-slate-100">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {formatDate(destaque.data_publicacao)}
                                                </span>
                                                {destaque.tags.length > 0 && (
                                                    <span className="flex items-center gap-1">
                                                        <Tag className="w-3 h-3" />
                                                        {destaque.tags.slice(0, 2).join(', ')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </section>
                        )}

                        {/* Grid filtrado */}
                        {filtroCategoria ? (
                            <section>
                                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-tcm-red inline-block" />
                                    {filtroCategoria}
                                    <span className="text-slate-300 font-normal normal-case tracking-normal">({postsParaExibir.length} materiais)</span>
                                </h2>
                                {postsParaExibir.length === 0 ? (
                                    <p className="text-slate-500 text-sm">Nenhum material encontrado nesta categoria.</p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                                        {postsParaExibir.map(post => (
                                            <BibliotecaCard key={post.id} post={post} href={`/dashboard/biblioteca/${post.slug}`} />
                                        ))}
                                    </div>
                                )}
                            </section>
                        ) : (
                            /* Agrupado por categoria */
                            Object.entries(byCategoria).map(([cat, catPosts]) => (
                                <section key={cat}>
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-tcm-red inline-block" />
                                            {cat}
                                        </h2>
                                        <Link
                                            href={`/dashboard/biblioteca?categoria=${encodeURIComponent(cat)}`}
                                            className="text-xs text-tcm-red font-semibold hover:underline"
                                        >
                                            Ver todos →
                                        </Link>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                                        {catPosts.slice(0, 3).map(post => (
                                            <BibliotecaCard key={post.id} post={post} href={`/dashboard/biblioteca/${post.slug}`} />
                                        ))}
                                    </div>
                                </section>
                            ))
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
