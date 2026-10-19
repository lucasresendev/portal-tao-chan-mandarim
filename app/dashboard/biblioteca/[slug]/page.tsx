import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Calendar, Tag, Folder } from 'lucide-react';
import SetNavbar from '../../../components/SetNavbar';
import TiptapRenderer from '../../../components/biblioteca/TiptapRenderer';
import type { PublicacaoBiblioteca } from '../../../../types/biblioteca';
import { getDemoTableRows, isPortfolioDemoMode } from '@/lib/demo/supabaseSandbox';
import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

const supabaseStatic = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const getCachedBibliotecaPost = (slug: string) => unstable_cache(
    async () => {
        const { data, error } = await supabaseStatic
            .from('publicacoes_blog')
            .select('*')
            .eq('slug', slug)
            .eq('status', 'publicado')
            .single();

        if (error) {
            console.error(`Erro ao buscar artigo ${slug} da biblioteca cacheado:`, error);
            return null;
        }
        return data;
    },
    ['biblioteca-post', slug],
    { revalidate: 300, tags: [`biblioteca-post-${slug}`, 'biblioteca-posts', 'blog-posts'] }
)();

function formatDate(d: string) {
    return new Date(d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default async function BibliotecaPostPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;

    const post = isPortfolioDemoMode()
        ? getDemoTableRows<PublicacaoBiblioteca>('publicacoes_blog').find(
              (p) => p.slug === slug && p.status === 'publicado'
          ) ?? null
        : await getCachedBibliotecaPost(slug);

    if (!post) notFound();

    const typedPost = post as PublicacaoBiblioteca;

    return (
        <div className="min-h-screen pb-24 pt-16 bg-slate-50 font-sans">
            <SetNavbar title={typedPost.titulo} backLink="/dashboard/biblioteca" />

            <main className="max-w-3xl mx-auto px-4 mt-8">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-xs text-slate-400 mb-6">
                    <Link href="/dashboard/biblioteca" className="hover:text-tcm-red transition-colors flex items-center gap-1">
                        <ArrowLeft className="w-3 h-3" /> Biblioteca
                    </Link>
                    <span>/</span>
                    <Link
                        href={`/dashboard/biblioteca?categoria=${encodeURIComponent(typedPost.categoria)}`}
                        className="hover:text-tcm-red transition-colors"
                    >
                        {typedPost.categoria}
                    </Link>
                </nav>

                {/* Header do post */}
                <article>
                    <header className="mb-8">
                        {/* Badge categoria */}
                        <span className="inline-block bg-tcm-red text-white text-xs font-bold px-3 py-1 rounded-full mb-4">
                            {typedPost.categoria}
                        </span>

                        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight mb-4">
                            {typedPost.titulo}
                        </h1>

                        {/* Meta */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                            <span className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                {formatDate(typedPost.data_publicacao)}
                            </span>
                            {typedPost.tags.length > 0 && (
                                <span className="flex items-center gap-1.5">
                                    <Tag className="w-4 h-4" />
                                    {typedPost.tags.join(', ')}
                                </span>
                            )}
                            <span className="flex items-center gap-1.5">
                                <Folder className="w-4 h-4" />
                                <Link
                                    href={`/dashboard/biblioteca?categoria=${encodeURIComponent(typedPost.categoria)}`}
                                    className="hover:text-tcm-red transition-colors"
                                >
                                    {typedPost.categoria}
                                </Link>
                            </span>
                        </div>

                        {/* Divisor */}
                        <div className="h-px bg-slate-200 mt-6" />
                    </header>

                    {/* Imagem de capa */}
                    {typedPost.capa_url && (
                        <div className="biblioteca-cover-wrapper blog-cover-wrapper">
                            <Image
                                src={typedPost.capa_url}
                                alt={typedPost.titulo}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, 768px"
                                priority
                            />
                        </div>
                    )}

                    {/* Conteúdo renderizado */}
                    <TiptapRenderer content={typedPost.conteudo} />

                    {/* Rodapé do post */}
                    <footer className="mt-12 pt-8 border-t border-slate-200">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex flex-wrap gap-2">
                                {typedPost.tags.map(tag => (
                                    <span key={tag} className="bg-slate-100 text-slate-600 text-xs font-semibold px-3 py-1 rounded-full">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                            <Link
                                href="/dashboard/biblioteca"
                                className="flex items-center gap-2 text-sm text-tcm-red font-semibold hover:underline"
                            >
                                <ArrowLeft className="w-4 h-4" /> Voltar à Biblioteca
                            </Link>
                        </div>
                    </footer>
                </article>
            </main>
        </div>
    );
}
