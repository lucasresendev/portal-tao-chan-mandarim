'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import Image from 'next/image';
import { 
    Search, ArrowUp, ArrowDown, Star, 
    Pencil, Trash2, Loader2, BookOpen, Tag, Calendar, ExternalLink 
} from 'lucide-react';
import type { PublicacaoBiblioteca, BibliotecaStatus } from '../../../../types/biblioteca';
import { revalidateBibliotecaCacheAction } from '../../../actions/biblioteca-actions';

type BibliotecaListProps = {
    initialPosts: PublicacaoBiblioteca[];
};

function formatDate(d: string) {
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function BibliotecaList({ initialPosts }: BibliotecaListProps) {
    const supabase = createClientComponentClient();
    const [posts, setPosts] = useState<PublicacaoBiblioteca[]>(initialPosts);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Todas');
    const [selectedStatus, setSelectedStatus] = useState('Todos');
    const [deleteTarget, setDeleteTarget] = useState<PublicacaoBiblioteca | null>(null);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    // Categorias únicas com posts cadastrados
    const categories = ['Todas', ...Array.from(new Set(initialPosts.map(p => p.categoria))).sort()];

    // Filtros client-side em tempo real
    const filteredPosts = posts.filter(post => {
        const matchesSearch = 
            post.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            post.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesCategory = selectedCategory === 'Todas' || post.categoria === selectedCategory;
        const matchesStatus = selectedStatus === 'Todos' || post.status === selectedStatus;

        return matchesSearch && matchesCategory && matchesStatus;
    });

    // Agrupa posts filtrados por categoria para a exibição se nenhuma categoria específica estiver selecionada
    const byCategory = filteredPosts.reduce<Record<string, PublicacaoBiblioteca[]>>((acc, p) => {
        if (!acc[p.categoria]) acc[p.categoria] = [];
        acc[p.categoria].push(p);
        return acc;
    }, {});

    // Ordenar posts de uma categoria específica por ordem_exibicao
    const getSortedPostsOfCategory = (cat: string) => {
        return posts
            .filter(p => p.categoria === cat)
            .sort((a, b) => a.ordem_exibicao - b.ordem_exibicao || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    };

    // Função de mover post na ordem (Up / Down) dentro da mesma categoria
    const movePostOrder = async (post: PublicacaoBiblioteca, direction: 'up' | 'down') => {
        setUpdatingId(post.id);
        const catPosts = getSortedPostsOfCategory(post.categoria);
        const index = catPosts.findIndex(p => p.id === post.id);
        
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === catPosts.length - 1) return;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        const targetPost = catPosts[targetIndex];

        // Normaliza ordens para garantir sequencialidade limpa
        const updatedPosts = posts.map(p => {
            if (p.id === post.id) {
                return { ...p, ordem_exibicao: targetPost.ordem_exibicao };
            }
            if (p.id === targetPost.id) {
                return { ...p, ordem_exibicao: post.ordem_exibicao };
            }
            return p;
        });

        // Atualiza estado local imediatamente para UX ultra fluida
        setPosts(updatedPosts);

        try {
            // Salva as duas alterações de ordem no Supabase em paralelo
            await Promise.all([
                supabase.from('publicacoes_blog').update({ ordem_exibicao: targetPost.ordem_exibicao }).eq('id', post.id),
                supabase.from('publicacoes_blog').update({ ordem_exibicao: post.ordem_exibicao }).eq('id', targetPost.id)
            ]);

            // Revalida caches
            await revalidateBibliotecaCacheAction(post.slug);
            await revalidateBibliotecaCacheAction(targetPost.slug);
        } catch (err) {
            console.error('Erro ao reordenar posts:', err);
            // Reverte estado local se der erro
            setPosts(posts);
        } finally {
            setUpdatingId(null);
        }
    };

    // Altera ordem diretamente digitando
    const handleOrderBlur = async (post: PublicacaoBiblioteca, newOrder: number) => {
        if (post.ordem_exibicao === newOrder) return;
        setUpdatingId(post.id);

        const updated = posts.map(p => p.id === post.id ? { ...p, ordem_exibicao: newOrder } : p);
        setPosts(updated);

        try {
            await supabase.from('publicacoes_blog').update({ ordem_exibicao: newOrder }).eq('id', post.id);
            await revalidateBibliotecaCacheAction(post.slug);
        } catch (err) {
            console.error(err);
            setPosts(posts);
        } finally {
            setUpdatingId(null);
        }
    };

    // Toggle de Status rápido (Publicado / Rascunho) com 1 clique
    const toggleStatus = async (post: PublicacaoBiblioteca) => {
        setUpdatingId(post.id);
        const newStatus: BibliotecaStatus = post.status === 'publicado' ? 'rascunho' : 'publicado';

        const updated = posts.map(p => p.id === post.id ? { ...p, status: newStatus } : p);
        setPosts(updated);

        try {
            await supabase.from('publicacoes_blog').update({ status: newStatus }).eq('id', post.id);
            await revalidateBibliotecaCacheAction(post.slug);
        } catch (err) {
            console.error(err);
            setPosts(posts);
        } finally {
            setUpdatingId(null);
        }
    };

    // Define post como Destaque Geral único
    const toggleDestaque = async (post: PublicacaoBiblioteca) => {
        setUpdatingId(post.id);
        const isCurrentDestaque = post.e_destaque;
        const newDestaqueState = !isCurrentDestaque;

        // Atualiza estado local de todos
        const updated = posts.map(p => {
            if (p.id === post.id) return { ...p, e_destaque: newDestaqueState };
            // Se estamos ativando este como destaque, todos os outros deixam de ser
            if (newDestaqueState) return { ...p, e_destaque: false };
            return p;
        });
        setPosts(updated);

        try {
            if (newDestaqueState) {
                // Remove destaque de qualquer outro no banco de dados primeiro
                await supabase.from('publicacoes_blog').update({ e_destaque: false }).eq('e_destaque', true);
            }
            // Atualiza este post no banco
            await supabase.from('publicacoes_blog').update({ e_destaque: newDestaqueState }).eq('id', post.id);
            await revalidateBibliotecaCacheAction(post.slug);
        } catch (err) {
            console.error(err);
            setPosts(posts);
        } finally {
            setUpdatingId(null);
        }
    };

    // Exclusão rápida com revalidação
    const handleDelete = async () => {
        if (!deleteTarget) return;
        setUpdatingId(deleteTarget.id);
        
        try {
            await supabase.from('publicacoes_blog').delete().eq('id', deleteTarget.id);
            setPosts(posts.filter(p => p.id !== deleteTarget.id));
            await revalidateBibliotecaCacheAction(deleteTarget.slug);
            setDeleteTarget(null);
        } catch (err) {
            console.error(err);
            alert('Erro ao excluir publicação.');
        } finally {
            setUpdatingId(null);
        }
    };

    // Renderizar um post na listagem
    const renderPostRow = (post: PublicacaoBiblioteca, idx: number, totalInCat: number) => {
        const isUpdating = updatingId === post.id;
        
        return (
            <div 
                key={post.id} 
                className={`bg-white border ${post.e_destaque ? 'border-tcm-yellow/60 bg-amber-50/20' : 'border-slate-200'} rounded-xl px-4 py-3.5 flex flex-col md:flex-row md:items-center gap-4 shadow-sm hover:shadow-md transition-all group duration-200`}
            >
                {/* Imagem de Capa compacta */}
                <div className="relative w-20 h-12 bg-slate-100 rounded-lg overflow-hidden border border-slate-100 shrink-0 self-start md:self-center">
                    {post.capa_url ? (
                        <Image src={post.capa_url} alt={post.titulo} fill className="object-cover" />
                    ) : (
                        <div className="absolute inset-0 bg-chinese-pattern scale-75 opacity-70" />
                    )}
                </div>

                {/* Título + Meta info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Link 
                            href={`/admin/biblioteca/${post.id}`}
                            className="font-bold text-slate-900 truncate hover:text-tcm-red transition-colors text-base"
                        >
                            {post.titulo}
                        </Link>
                        {post.e_destaque && (
                            <span className="text-[9px] font-extrabold uppercase bg-tcm-yellow/20 text-amber-800 px-2 py-0.5 rounded-md border border-tcm-yellow/50 flex items-center gap-0.5">
                                <Star className="w-2.5 h-2.5 fill-amber-600 stroke-amber-600" /> Destaque Geral
                            </span>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1 font-medium">
                        <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">{post.categoria}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(post.data_publicacao)}</span>
                        {post.tags.length > 0 && <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {post.tags.slice(0, 3).join(', ')}</span>}
                    </div>
                </div>

                {/* Controles de Status e Destaque */}
                <div className="flex flex-wrap items-center gap-4 shrink-0 md:border-l md:border-slate-100 md:pl-4">
                    {/* Botão Estrela (Destaque Geral) */}
                    <button
                        type="button"
                        onClick={() => toggleDestaque(post)}
                        disabled={isUpdating}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            post.e_destaque 
                                ? 'bg-amber-100 text-amber-600 border-amber-300' 
                                : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-amber-500 hover:border-amber-300'
                        }`}
                        title={post.e_destaque ? "Remover destaque geral" : "Definir como Destaque Geral único da biblioteca"}
                    >
                        <Star className={`w-4 h-4 ${post.e_destaque ? 'fill-amber-500 stroke-amber-500' : ''}`} />
                    </button>

                    {/* Toggle de Status (Rascunho vs Publicado) */}
                    <button
                        type="button"
                        onClick={() => toggleStatus(post)}
                        disabled={isUpdating}
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                            post.status === 'publicado'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                        }`}
                    >
                        {post.status}
                    </button>

                    {/* Controles de Ordem (Setas + Input) */}
                    <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200">
                        {/* Mover Para Cima */}
                        <button
                            type="button"
                            onClick={() => movePostOrder(post, 'up')}
                            disabled={idx === 0 || isUpdating}
                            className="p-1 text-slate-500 hover:text-tcm-red hover:bg-slate-200 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                            title="Mover para cima"
                        >
                            <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        
                        {/* Input de Ordem manual */}
                        <input
                            type="number"
                            value={post.ordem_exibicao}
                            onChange={e => {
                                const val = Number(e.target.value);
                                setPosts(posts.map(p => p.id === post.id ? { ...p, ordem_exibicao: val } : p));
                            }}
                            onBlur={e => handleOrderBlur(post, Number(e.target.value))}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    handleOrderBlur(post, Number((e.target as HTMLInputElement).value));
                                    (e.target as HTMLInputElement).blur();
                                }
                            }}
                            disabled={isUpdating}
                            className="w-10 text-center text-xs font-bold bg-white border border-slate-200 rounded p-0.5 outline-none focus:border-tcm-red text-slate-800"
                            title="Editar peso da ordem diretamente"
                        />

                        {/* Mover Para Baixo */}
                        <button
                            type="button"
                            onClick={() => movePostOrder(post, 'down')}
                            disabled={idx === totalInCat - 1 || isUpdating}
                            className="p-1 text-slate-500 hover:text-tcm-red hover:bg-slate-200 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                            title="Mover para baixo"
                        >
                            <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Carregando indicator */}
                    {isUpdating && <Loader2 className="w-4 h-4 text-tcm-red animate-spin shrink-0" />}
                </div>

                {/* Ações principais */}
                <div className="flex items-center gap-2 shrink-0 md:ml-auto">
                    <Link
                        href={`/dashboard/biblioteca/${post.slug}`}
                        target="_blank"
                        className="p-2 text-slate-400 hover:text-tcm-red hover:bg-red-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-red-100"
                        title="Visualizar artigo na biblioteca"
                    >
                        <ExternalLink className="w-4 h-4" />
                    </Link>
                    <Link
                        href={`/admin/biblioteca/${post.id}`}
                        className="p-2 text-slate-400 hover:text-tcm-red hover:bg-red-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-red-100"
                        title="Editar artigo"
                    >
                        <Pencil className="w-4 h-4" />
                    </Link>
                    <button
                        type="button"
                        onClick={() => setDeleteTarget(post)}
                        disabled={isUpdating}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-red-100 disabled:opacity-30"
                        title="Excluir artigo"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <main className="max-w-5xl mx-auto px-4 mt-6 space-y-6">
            {/* Filtros e Barra de Pesquisa */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
                <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Pesquisar por título ou tags..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-tcm-red/20 focus:border-tcm-red outline-none transition-all placeholder:text-slate-400"
                    />
                </div>

                <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
                    {/* Filtro Status */}
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600">
                        {['Todos', 'publicado', 'rascunho'].map(st => (
                            <button
                                key={st}
                                onClick={() => setSelectedStatus(st)}
                                className={`px-2.5 py-1 rounded-md capitalize cursor-pointer ${
                                    selectedStatus === st 
                                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' 
                                        : 'hover:text-slate-900'
                                }`}
                            >
                                {st}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Categorias (Abas Horizontais) */}
            <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-px">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-2 text-sm font-semibold transition-all border-b-2 -mb-px cursor-pointer ${
                            selectedCategory === cat
                                ? 'border-tcm-red text-tcm-red font-bold'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        {cat}
                        {cat === 'Todas' ? (
                            <span className="text-[10px] text-slate-400 font-normal ml-1">({posts.length})</span>
                        ) : (
                            <span className="text-[10px] text-slate-400 font-normal ml-1">
                                ({posts.filter(p => p.categoria === cat).length})
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Listagem Geral */}
            {filteredPosts.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center shadow-sm">
                    <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium text-lg">Nenhum material encontrado na biblioteca.</p>
                    <p className="text-sm text-slate-400 mt-1">Experimente limpar os filtros ou realizar outra busca.</p>
                </div>
            ) : selectedCategory !== 'Todas' ? (
                // Se categoria individual estiver selecionada, exibe lista ordenada diretamente
                <div className="space-y-2.5">
                    {getSortedPostsOfCategory(selectedCategory)
                        .filter(p => filteredPosts.some(fp => fp.id === p.id))
                        .map((post, idx, arr) => renderPostRow(post, idx, arr.length))}
                </div>
            ) : (
                // Agrupado por categoria (com ordenação interna)
                <div className="space-y-8">
                    {Object.entries(byCategory).map(([categoria, catPosts]) => {
                        // Ordena posts da categoria
                        const sortedCatPosts = getSortedPostsOfCategory(categoria)
                            .filter(p => catPosts.some(cp => cp.id === p.id));

                        return (
                            <section key={categoria} className="space-y-3">
                                <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-2 h-2 bg-tcm-red rounded-full" />
                                    {categoria}
                                    <span className="text-slate-300 font-normal tracking-normal lowercase">({sortedCatPosts.length} artigos)</span>
                                </h2>
                                <div className="space-y-2.5">
                                    {sortedCatPosts.map((post, idx) => renderPostRow(post, idx, sortedCatPosts.length))}
                                </div>
                            </section>
                        );
                    })}
                </div>
            )}

            {/* Modal de exclusão */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setDeleteTarget(null)}>
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-100" onClick={e => e.stopPropagation()}>
                        <h3 className="font-bold text-slate-900 text-lg mb-2">Excluir publicação?</h3>
                        <p className="text-sm text-slate-500 mb-6">
                            Você está prestes a excluir <strong className="text-slate-800">{deleteTarget.titulo}</strong>.<br /> Esta ação é definitiva e removerá a publicação da biblioteca para todos os alunos.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
                                Cancelar
                            </button>
                            <button onClick={handleDelete} className="flex-1 py-2.5 bg-tcm-red hover:bg-tcm-dark-red text-white rounded-xl text-sm font-bold transition-colors cursor-pointer">
                                Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
