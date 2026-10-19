'use client';

import { useState, useCallback, type ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { type JSONContent } from '@tiptap/react';
import { Globe, FileEdit, Trash2, Loader2, X, Image as ImageIcon, Star, ChevronLeft } from 'lucide-react';
import dynamic from 'next/dynamic';
import type { PublicacaoBiblioteca, PublicacaoBibliotecaFormData } from '../../../../types/biblioteca';
import { uploadBibliotecaImage, generateSlug } from '../../../../lib/bibliotecaStorage';
import Image from 'next/image';
import { revalidateBibliotecaCacheAction } from '../../../actions/biblioteca-actions';
import Link from 'next/link';

type EditorProps = { content: JSONContent; onChange: (content: JSONContent) => void; slug: string };
const TiptapEditor = dynamic<EditorProps>(
    () => import('../../../components/biblioteca/TiptapEditor') as Promise<{ default: ComponentType<EditorProps> }>,
    { ssr: false }
);

const CATEGORIAS = ['Geral', 'Vocabulário', 'Gramática', 'Cultura', 'Dicas', 'Notícias', 'Recursos'];
const EMPTY_CONTENT: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] };

type BibliotecaEditorPageProps = {
    post?: PublicacaoBiblioteca;
    autorId: string;
};

export default function BibliotecaEditorPage({ post, autorId }: BibliotecaEditorPageProps) {
    const router = useRouter();
    const supabase = createClientComponentClient();
    const isEditing = !!post;

    const [titulo, setTitulo] = useState(post?.titulo ?? '');
    const [categoria, setCategoria] = useState(post?.categoria ?? 'Geral');
    const [tags, setTags] = useState(post?.tags?.join(', ') ?? '');
    const [ordemExibicao, setOrdemExibicao] = useState(post?.ordem_exibicao ?? 0);
    const [eDestaque, setEDestaque] = useState<boolean>(post?.e_destaque ?? false);
    const [capaUrl, setCapaUrl] = useState<string | null>(post?.capa_url ?? null);
    const [conteudo, setConteudo] = useState<JSONContent>(post?.conteudo ?? EMPTY_CONTENT);
    const [dataPublicacao, setDataPublicacao] = useState<string>(
        post?.data_publicacao
            ? new Date(post.data_publicacao).toISOString().slice(0, 16)
            : new Date().toISOString().slice(0, 16)
    );
    const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [uploadingCapa, setUploadingCapa] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(false);

    const currentSlug = post?.slug ?? (generateSlug(titulo) || 'rascunho');

    const handleContentChange = useCallback((newContent: JSONContent) => {
        setConteudo(newContent);
    }, []);

    const buildPayload = (status: 'rascunho' | 'publicado'): PublicacaoBibliotecaFormData & { autor_id?: string } => ({
        titulo: titulo.trim(),
        capa_url: capaUrl,
        conteudo,
        status,
        categoria,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        ordem_exibicao: Number(ordemExibicao) || 0,
        e_destaque: eDestaque,
        data_publicacao: new Date(dataPublicacao).toISOString(),
        ...(autorId ? { autor_id: autorId } : {}),
    });

    const handleSave = async (status: 'rascunho' | 'publicado') => {
        if (!titulo.trim()) {
            alert('Por favor, informe um título para o artigo.');
            return;
        }

        setSaving('saving');
        try {
            const payload = buildPayload(status);
            const slug = post?.slug ?? generateSlug(titulo);

            if (eDestaque) {
                // Remove destaque anterior para garantir unicidade
                await supabase.from('publicacoes_blog').update({ e_destaque: false }).eq('e_destaque', true);
            }

            if (isEditing) {
                const { error } = await supabase.from('publicacoes_blog').update(payload).eq('id', post.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('publicacoes_blog').insert(payload);
                if (error) throw error;
            }

            // Invalida o cache para que o aluno veja a publicação atualizada
            await revalidateBibliotecaCacheAction(slug);

            setSaving('saved');
            setTimeout(() => {
                setSaving('idle');
                router.push('/admin/biblioteca');
            }, 1200);
        } catch (err) {
            console.error(err);
            setSaving('error');
            setTimeout(() => setSaving('idle'), 3000);
        }
    };

    const handleCapaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingCapa(true);
        try {
            const url = await uploadBibliotecaImage(currentSlug, file);
            setCapaUrl(url);
        } catch (err) {
            alert('Erro ao fazer upload da capa.');
            console.error(err);
        } finally {
            setUploadingCapa(false);
            e.target.value = '';
        }
    };

    const handleDelete = async () => {
        if (!isEditing || !deleteConfirm) return;
        const { error } = await supabase.from('publicacoes_blog').delete().eq('id', post.id);
        if (error) { alert('Erro ao excluir.'); return; }
        
        // Invalida o cache
        await revalidateBibliotecaCacheAction(post.slug);
        
        router.push('/admin/biblioteca');
    };

    const saveStatusLabel = {
        idle: null,
        saving: <span className="text-amber-600 flex items-center gap-1 text-xs"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...</span>,
        saved: <span className="text-emerald-600 flex items-center gap-1 text-xs">✓ Salvo com sucesso!</span>,
        error: <span className="text-red-600 text-xs">Erro ao salvar</span>,
    }[saving];

    return (
        <div className="min-h-screen pb-24 pt-16 bg-slate-50 font-sans">
            {/* Cabeçalho Voltar rápido */}
            <div className="bg-white border-b border-slate-200 py-3 shadow-xs">
                <div className="max-w-5xl mx-auto px-4 flex items-center justify-between">
                    <Link href="/admin/biblioteca" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-tcm-red transition-colors">
                        <ChevronLeft className="w-4 h-4" /> Voltar à Biblioteca
                    </Link>
                    <div className="flex items-center gap-2">
                        {saveStatusLabel}
                    </div>
                </div>
            </div>

            <main className="max-w-5xl mx-auto px-4 mt-6">
                <div className="flex flex-col lg:flex-row gap-6 items-start">
                    
                    {/* COLUNA ESQUERDA: Editor Principal */}
                    <div className="flex-1 w-full space-y-6">
                        {/* Bloco de Título */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Título da Publicação</label>
                            <input
                                type="text"
                                value={titulo}
                                onChange={e => setTitulo(e.target.value)}
                                placeholder="Ex: Regras Essenciais do Pinyin"
                                className="w-full text-2xl font-bold text-slate-900 border-none outline-none focus:ring-0 p-0 placeholder:text-slate-300"
                            />
                        </div>

                        {/* Editor Tiptap */}
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-h-125">
                            <TiptapEditor
                                content={conteudo}
                                onChange={handleContentChange}
                                slug={currentSlug}
                            />
                        </div>
                    </div>

                    {/* COLUNA DIREITA: Barra Lateral de Configurações */}
                    <aside className="w-full lg:w-80 space-y-6 lg:sticky lg:top-24">
                        
                        {/* Ações Principais */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pb-3 border-b border-slate-100">
                                Publicação
                            </h3>
                            
                            <button
                                type="button"
                                onClick={() => handleSave('publicado')}
                                disabled={saving === 'saving'}
                                className="w-full flex items-center justify-center gap-2 bg-tcm-red hover:bg-tcm-dark-red text-white py-3 px-4 rounded-xl font-bold text-sm shadow-sm transition-all cursor-pointer disabled:opacity-50"
                            >
                                <Globe className="w-4 h-4" />
                                {post?.status === 'publicado' ? 'Atualizar Artigo' : 'Publicar Agora'}
                            </button>

                            <button
                                type="button"
                                onClick={() => handleSave('rascunho')}
                                disabled={saving === 'saving'}
                                className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 px-4 rounded-xl font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
                            >
                                <FileEdit className="w-3.5 h-3.5" />
                                Salvar como Rascunho
                            </button>
                        </div>

                        {/* Imagem de Capa */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pb-3 border-b border-slate-100">
                                Imagem de Capa
                            </h3>

                            {capaUrl ? (
                                <div className="space-y-3">
                                    <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200">
                                        <Image src={capaUrl} alt="Capa" fill className="object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => setCapaUrl(null)}
                                            className="absolute top-2 right-2 p-1 bg-black/60 hover:bg-black text-white rounded-full transition-colors cursor-pointer"
                                            title="Remover capa"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-6 hover:border-tcm-red hover:bg-red-50/20 transition-all cursor-pointer">
                                        <ImageIcon className="w-8 h-8 text-slate-300 mb-2" />
                                        <span className="text-xs font-bold text-slate-600">Fazer upload de imagem</span>
                                        <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, WebP até 5MB</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleCapaUpload}
                                            disabled={uploadingCapa}
                                            className="hidden"
                                        />
                                    </label>
                                    {uploadingCapa && (
                                        <div className="flex items-center justify-center gap-1.5 text-xs text-amber-600 mt-2">
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Enviando imagem...
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Destaque Geral */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pb-3 border-b border-slate-100">
                                Destaque
                            </h3>

                            <div>
                                <button
                                    type="button"
                                    onClick={() => setEDestaque(!eDestaque)}
                                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-xs font-bold cursor-pointer ${
                                        eDestaque 
                                            ? 'bg-amber-50/50 text-amber-800 border-amber-300' 
                                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    <span className="flex items-center gap-1.5">
                                        <Star className={`w-4 h-4 ${eDestaque ? 'fill-amber-500 stroke-amber-500' : ''}`} />
                                        Destaque Geral da Biblioteca
                                    </span>
                                    <span className={`w-8 h-4 rounded-full transition-all relative ${eDestaque ? 'bg-amber-500' : 'bg-slate-300'}`}>
                                        <span className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all shadow-sm ${eDestaque ? 'left-4' : 'left-0.5'}`} />
                                    </span>
                                </button>
                                <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed font-medium">
                                    Se ativado, esta publicação aparecerá no banner principal da página inicial da biblioteca. Apenas um artigo pode ser destaque ao mesmo tempo.
                                </p>
                            </div>
                        </div>

                        {/* Metadados */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pb-3 border-b border-slate-100">
                                Configurações Finais
                            </h3>

                            {/* Categoria */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Categoria</label>
                                <select
                                    value={categoria}
                                    onChange={e => setCategoria(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-tcm-red cursor-pointer"
                                >
                                    {CATEGORIAS.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Tags */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Tags (separadas por vírgula)</label>
                                <input
                                    type="text"
                                    value={tags}
                                    onChange={e => setTags(e.target.value)}
                                    placeholder="ex: hsk1, gramatica, iniciante"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:border-tcm-red"
                                />
                            </div>

                            {/* Ordem de Exibição */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Ordem de Exibição (Peso)</label>
                                <input
                                    type="number"
                                    value={ordemExibicao}
                                    onChange={e => setOrdemExibicao(Number(e.target.value))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-tcm-red"
                                />
                                <span className="text-[10px] text-slate-400 mt-1 block">Menor número = aparece primeiro na categoria</span>
                            </div>

                            {/* Data de Publicação manual */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Data de Publicação</label>
                                <input
                                    type="datetime-local"
                                    value={dataPublicacao}
                                    onChange={e => setDataPublicacao(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:border-tcm-red"
                                />
                            </div>
                        </div>

                        {/* Botão de Exclusão */}
                        {isEditing && (
                            <div className="pt-2">
                                <button
                                    type="button"
                                    onClick={() => setDeleteConfirm(true)}
                                    className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-red-100"
                                >
                                    <Trash2 className="w-3.5 h-3.5" /> Excluir Publicação
                                </button>
                            </div>
                        )}

                    </aside>
                </div>
            </main>

            {/* Modal de confirmação de exclusão */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setDeleteConfirm(false)}>
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="font-bold text-slate-900 text-lg mb-2">Excluir publicação?</h3>
                        <p className="text-sm text-slate-500 mb-6">Esta ação removerá permanentemente a publicação da biblioteca para todos os alunos. Não pode ser desfeita.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteConfirm(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
                                Cancelar
                            </button>
                            <button onClick={handleDelete} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors cursor-pointer">
                                Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
