'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter, useParams } from 'next/navigation';
import { Save, Trash2, Loader2, AlertCircle, PlusCircle, Check } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import posthog from 'posthog-js';
import SetNavbar from '../../../../components/SetNavbar';
import { RichTextEditor } from '../../../../components/ui/RichTextEditor';

type VideoAula = {
    titulo?: string;
    url: string;
};

type LinkAdicional = {
    titulo?: string;
    url: string;
};

export default function EditarAula() {
    const supabase = createClientComponentClient();
    const router = useRouter();
    const params = useParams();
    const aulaId = params.id as string;
    const queryClient = useQueryClient();

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    // Estados do Formulário
    const [codigoAula, setCodigoAula] = useState('');
    const [tituloDescritivo, setTituloDescritivo] = useState('');
    const [codigoLicao, setCodigoLicao] = useState('');
    const [dataAula, setDataAula] = useState('');
    const [videos, setVideos] = useState<VideoAula[]>([]);

    const handleAddVideo = () => {
        setVideos([...videos, { titulo: '', url: '' }]);
    };

    const handleRemoveVideo = (index: number) => {
        setVideos(videos.filter((_, i) => i !== index));
    };

    const handleVideoChange = (index: number, field: 'titulo'|'url', value: string) => {
        const newVideos = [...videos];
        newVideos[index][field] = value;
        setVideos(newVideos);
    };

    // Links adicionais dinâmicos (elemento coringa)
    const [linksAdicionais, setLinksAdicionais] = useState<LinkAdicional[]>([]);

    const handleAddLinkAdicional = () => {
        setLinksAdicionais([...linksAdicionais, { titulo: '', url: '' }]);
    };

    const handleRemoveLinkAdicional = (index: number) => {
        setLinksAdicionais(linksAdicionais.filter((_, i) => i !== index));
    };

    const handleLinkAdicionalChange = (index: number, field: 'titulo'|'url', value: string) => {
        const newLinks = [...linksAdicionais];
        newLinks[index][field] = value;
        setLinksAdicionais(newLinks);
    };

    const [linkMaterial, setLinkMaterial] = useState('');
    const [linkTarefa, setLinkTarefa] = useState('');
    const [comentarios, setComentarios] = useState('');
    const [isExcecao, setIsExcecao] = useState(false);

    useEffect(() => {
        const fetchAula = async () => {
            try {
                setIsLoading(true);

                // Busca os dados da aula específica
                const { data: aulaData, error: aulaError } = await supabase
                    .from('aulas')
                    .select('*')
                    .eq('id', aulaId)
                    .single();

                if (aulaError) throw aulaError;
                if (!aulaData) throw new Error('Aula não encontrada.');

                // Preenche os campos do formulário com os dados do banco
                setCodigoAula(aulaData.codigo_aula || '');
                setTituloDescritivo(aulaData.titulo_descritivo || '');
                setCodigoLicao(aulaData.codigo_licao || '');
                setDataAula(aulaData.data_aula || '');
                
                if (aulaData.videos && aulaData.videos.length > 0) {
                    setVideos(aulaData.videos);
                } else {
                    setVideos([]);
                }

                if (aulaData.links_adicionais && aulaData.links_adicionais.length > 0) {
                    setLinksAdicionais(aulaData.links_adicionais);
                } else {
                    setLinksAdicionais([]);
                }

                setLinkMaterial(aulaData.link_material || '');
                setLinkTarefa(aulaData.link_tarefa || '');
                setComentarios(aulaData.comentarios || '');
                setIsExcecao(aulaData.is_excecao || false);

            } catch (err) {
                console.error(err);
                setError('Erro ao carregar os dados da aula.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchAula();
    }, [aulaId, supabase]);

    const handleUpdateAula = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMsg(null);

        // Validação customizada
        const newErrors: Record<string, string> = {};
        if (!codigoAula.trim()) newErrors.codigoAula = 'O código da aula é obrigatório.';
        if (!tituloDescritivo.trim()) newErrors.tituloDescritivo = 'O título descritivo é obrigatório.';

        if (linkMaterial.trim()) {
            try {
                new URL(linkMaterial);
            } catch {
                newErrors.linkMaterial = 'Insira uma URL válida para o material.';
            }
        }

        if (linkTarefa.trim()) {
            try {
                new URL(linkTarefa);
            } catch {
                newErrors.linkTarefa = 'Insira uma URL válida para a tarefa.';
            }
        }

        videos.forEach((v, idx) => {
            if (!v.url.trim()) {
                newErrors[`video_url_${idx}`] = 'A URL do vídeo é obrigatória.';
            } else {
                try {
                    new URL(v.url);
                } catch {
                    newErrors[`video_url_${idx}`] = 'Insira uma URL válida.';
                }
            }
        });

        linksAdicionais.forEach((l, idx) => {
            if (!l.titulo?.trim()) {
                newErrors[`link_titulo_${idx}`] = 'O título do link é obrigatório.';
            }
            if (!l.url.trim()) {
                newErrors[`link_url_${idx}`] = 'A URL é obrigatória.';
            } else {
                try {
                    new URL(l.url);
                } catch {
                    newErrors[`link_url_${idx}`] = 'Insira uma URL válida.';
                }
            }
        });

        if (Object.keys(newErrors).length > 0) {
            setFormErrors(newErrors);
            setError('Por favor, corrija os erros nos campos destacados.');
            return;
        }

        setFormErrors({});
        setIsSubmitting(true);

        try {
            const aulaAtualizada = {
                codigo_aula: codigoAula,
                titulo_descritivo: tituloDescritivo,
                codigo_licao: codigoLicao || null,
                data_aula: dataAula || null,
                videos: videos.filter(v => v.url.trim() !== '') || null,
                link_material: linkMaterial || null,
                link_tarefa: linkTarefa || null,
                links_adicionais: linksAdicionais.filter(l => l.url.trim() !== '') || null,
                comentarios: comentarios || null,
                is_excecao: isExcecao,
            };

            const { error: updateError } = await supabase
                .from('aulas')
                .update(aulaAtualizada)
                .eq('id', aulaId);

            if (updateError) {
                if (updateError.code === '23505') {
                    throw new Error('Já existe outra aula com este código.');
                }
                throw updateError;
            }

            posthog.capture('admin_lesson_updated', {
                lesson_id: aulaId,
                lesson_code: codigoAula,
                lesson_title: tituloDescritivo,
            });

            // Invalida o cache da listagem no TanStack Query para atualização em tempo real
            queryClient.invalidateQueries({ queryKey: ['admin-aulas'] });

            setSuccessMsg('Aula atualizada com sucesso!');
            setTimeout(() => {
                router.push('/admin/aulas');
            }, 1200);

        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Erro ao atualizar aula.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteAula = async () => {
        if (!window.confirm('Tem certeza que deseja excluir esta aula? Esta ação não pode ser desfeita e removerá o progresso dos alunos nesta aula.')) {
            return;
        }

        setIsDeleting(true);
        setError(null);

        try {
            const { error: deleteError } = await supabase
                .from('aulas')
                .delete()
                .eq('id', aulaId);

            if (deleteError) throw deleteError;

            posthog.capture('admin_lesson_deleted', {
                lesson_id: aulaId,
                lesson_code: codigoAula,
                lesson_title: tituloDescritivo,
            });
            router.push('/admin/aulas'); 
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Erro ao deletar aula.');
            }
            setIsDeleting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-tcm-red" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pt-20 pb-20 px-4 sm:px-8 font-sans">
            <SetNavbar title="Editar Aula" backLink="/admin/aulas" />
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">

                {/* Alertas */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 shadow-sm animate-in slide-in-from-top-2">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Formulário de Edição */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <form onSubmit={handleUpdateAula} noValidate className="space-y-6">
                        
                        {/* SEÇÃO 1: Informações Principais */}
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Informações Principais</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-650 mb-1">Código da Aula *</label>
                                    <input
                                        type="text"
                                        value={codigoAula}
                                        onChange={(e) => {
                                            setCodigoAula(e.target.value);
                                            if (formErrors.codigoAula) {
                                                setFormErrors(prev => {
                                                    const copy = { ...prev };
                                                    delete copy.codigoAula;
                                                    return copy;
                                                });
                                            }
                                        }}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none bg-white transition-shadow text-sm text-slate-800 ${
                                            formErrors.codigoAula
                                                ? 'border-red-300 focus:ring-red-500/50'
                                                : 'border-slate-200 focus:ring-tcm-red/50'
                                        }`}
                                    />
                                    {formErrors.codigoAula && (
                                        <span className="text-[10px] text-red-500 font-bold mt-1 block">
                                            {formErrors.codigoAula}
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-650 mb-1">Código da Lição</label>
                                    <input
                                        type="text"
                                        value={codigoLicao}
                                        onChange={(e) => setCodigoLicao(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-tcm-red/50 outline-none bg-white transition-shadow text-sm text-slate-800"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-650 mb-1">Data da Aula</label>
                                    <input
                                        type="date"
                                        value={dataAula}
                                        onChange={(e) => setDataAula(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-tcm-red/50 outline-none bg-white transition-shadow text-sm text-slate-800"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-650 mb-1">Título Descritivo *</label>
                                <input
                                    type="text"
                                    value={tituloDescritivo}
                                    onChange={(e) => {
                                        setTituloDescritivo(e.target.value);
                                        if (formErrors.tituloDescritivo) {
                                            setFormErrors(prev => {
                                                const copy = { ...prev };
                                                delete copy.tituloDescritivo;
                                                return copy;
                                            });
                                        }
                                    }}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none bg-white transition-shadow text-sm text-slate-800 ${
                                        formErrors.tituloDescritivo
                                            ? 'border-red-300 focus:ring-red-500/50'
                                            : 'border-slate-200 focus:ring-tcm-red/50'
                                    }`}
                                />
                                {formErrors.tituloDescritivo && (
                                    <span className="text-[10px] text-red-500 font-bold mt-1 block">
                                        {formErrors.tituloDescritivo}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* SEÇÃO 2: Links */}
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-5">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Links dos Materiais</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-650 mb-1">Link do Material (Drive)</label>
                                    <input
                                        type="url"
                                        value={linkMaterial}
                                        onChange={(e) => {
                                            setLinkMaterial(e.target.value);
                                            if (formErrors.linkMaterial) {
                                                setFormErrors(prev => {
                                                    const copy = { ...prev };
                                                    delete copy.linkMaterial;
                                                    return copy;
                                                });
                                            }
                                        }}
                                        placeholder="https://drive.google.com/..."
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none bg-white transition-shadow text-sm text-slate-800 ${
                                            formErrors.linkMaterial
                                                ? 'border-red-300 focus:ring-red-500/50'
                                                : 'border-slate-200 focus:ring-tcm-red/50'
                                        }`}
                                    />
                                    {formErrors.linkMaterial && (
                                        <span className="text-[10px] text-red-500 font-bold mt-1 block">
                                            {formErrors.linkMaterial}
                                        </span>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-650 mb-1">Link da Tarefa (Drive)</label>
                                    <input
                                        type="url"
                                        value={linkTarefa}
                                        onChange={(e) => {
                                            setLinkTarefa(e.target.value);
                                            if (formErrors.linkTarefa) {
                                                setFormErrors(prev => {
                                                    const copy = { ...prev };
                                                    delete copy.linkTarefa;
                                                    return copy;
                                                });
                                            }
                                        }}
                                        placeholder="https://drive.google.com/..."
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none bg-white transition-shadow text-sm text-slate-800 ${
                                            formErrors.linkTarefa
                                                ? 'border-red-300 focus:ring-red-500/50'
                                                : 'border-slate-200 focus:ring-tcm-red/50'
                                        }`}
                                    />
                                    {formErrors.linkTarefa && (
                                        <span className="text-[10px] text-red-500 font-bold mt-1 block">
                                            {formErrors.linkTarefa}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-slate-200/60">
                                {/* Vídeos da Aula */}
                                <div>
                                    <div className="flex items-center justify-between mb-2.5">
                                        <label className="block text-xs font-semibold text-slate-600">Vídeos da Aula</label>
                                        <button
                                            type="button"
                                            onClick={handleAddVideo}
                                            className="text-xs text-tcm-red hover:text-tcm-dark-red font-bold flex items-center gap-1 cursor-pointer"
                                        >
                                            <PlusCircle className="w-3.5 h-3.5" /> Adicionar Parte
                                        </button>
                                    </div>
                                    <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                                        {videos.length === 0 ? (
                                            <p className="text-xs text-slate-400 italic py-2">Nenhum vídeo vinculado ainda.</p>
                                        ) : (
                                            videos.map((video, idx) => (
                                                <div key={idx} className="p-2.5 bg-white border border-slate-200 rounded-lg">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider bg-red-50 text-tcm-red border border-red-100 px-2 py-1 rounded-md shrink-0">
                                                            Parte {idx + 1}
                                                        </span>
                                                        <input
                                                            type="url"
                                                            value={video.url}
                                                            onChange={(e) => {
                                                                handleVideoChange(idx, 'url', e.target.value);
                                                                if (formErrors[`video_url_${idx}`]) {
                                                                    setFormErrors(prev => {
                                                                        const copy = { ...prev };
                                                                        delete copy[`video_url_${idx}`];
                                                                        return copy;
                                                                    });
                                                                }
                                                            }}
                                                            className={`flex-1 min-w-0 px-2.5 py-1.5 text-xs border rounded-md focus:ring-2 outline-none bg-white transition-shadow text-slate-800 ${
                                                                formErrors[`video_url_${idx}`]
                                                                    ? 'border-red-300 focus:ring-red-500/50'
                                                                    : 'border-slate-200 focus:ring-tcm-red/50'
                                                            }`}
                                                            placeholder="Link do YouTube *"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveVideo(idx)}
                                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors cursor-pointer shrink-0"
                                                            title="Remover parte"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    {formErrors[`video_url_${idx}`] && (
                                                        <span className="text-[10px] text-red-500 font-bold mt-1 block">
                                                            {formErrors[`video_url_${idx}`]}
                                                        </span>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Links Adicionais (Coringa) */}
                                <div>
                                    <div className="flex items-center justify-between mb-2.5">
                                        <label className="block text-xs font-semibold text-slate-600">Links Adicionais (Coringa)</label>
                                        <button
                                            type="button"
                                            onClick={handleAddLinkAdicional}
                                            className="text-xs text-tcm-red hover:text-tcm-dark-red font-bold flex items-center gap-1 cursor-pointer"
                                        >
                                            <PlusCircle className="w-3.5 h-3.5" /> Adicionar
                                        </button>
                                    </div>
                                    <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                                        {linksAdicionais.length === 0 ? (
                                            <p className="text-xs text-slate-400 italic py-2">Nenhum link adicional criado.</p>
                                        ) : (
                                            linksAdicionais.map((link, idx) => (
                                                <div key={idx} className="flex flex-col gap-2 p-2.5 bg-white border border-slate-200 rounded-lg">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-1 rounded-md shrink-0">
                                                            Link {idx + 1}
                                                        </span>
                                                        <input
                                                            type="text"
                                                            value={link.titulo || ''}
                                                            onChange={(e) => {
                                                                handleLinkAdicionalChange(idx, 'titulo', e.target.value);
                                                                if (formErrors[`link_titulo_${idx}`]) {
                                                                    setFormErrors(prev => {
                                                                        const copy = { ...prev };
                                                                        delete copy[`link_titulo_${idx}`];
                                                                        return copy;
                                                                    });
                                                                }
                                                            }}
                                                            className={`flex-1 min-w-0 px-2.5 py-1.5 text-xs border rounded-md focus:ring-2 outline-none bg-white transition-shadow text-slate-800 ${
                                                                formErrors[`link_titulo_${idx}`]
                                                                    ? 'border-red-300 focus:ring-red-500/50'
                                                                    : 'border-slate-200 focus:ring-tcm-red/50'
                                                            }`}
                                                            placeholder="Título (ex: Notion de Apoio)"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveLinkAdicional(idx)}
                                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors cursor-pointer shrink-0"
                                                            title="Remover link"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    {formErrors[`link_titulo_${idx}`] && (
                                                        <span className="text-[10px] text-red-500 font-bold block">
                                                            {formErrors[`link_titulo_${idx}`]}
                                                        </span>
                                                    )}
                                                    <input
                                                        type="url"
                                                        value={link.url}
                                                        onChange={(e) => {
                                                            handleLinkAdicionalChange(idx, 'url', e.target.value);
                                                            if (formErrors[`link_url_${idx}`]) {
                                                                setFormErrors(prev => {
                                                                    const copy = { ...prev };
                                                                    delete copy[`link_url_${idx}`];
                                                                    return copy;
                                                                });
                                                            }
                                                        }}
                                                        className={`w-full px-2.5 py-1.5 text-xs border rounded-md focus:ring-2 outline-none bg-white transition-shadow text-slate-800 ${
                                                            formErrors[`link_url_${idx}`]
                                                                ? 'border-red-300 focus:ring-red-500/50'
                                                                : 'border-slate-200 focus:ring-tcm-red/50'
                                                        }`}
                                                        placeholder="URL do Link *"
                                                    />
                                                    {formErrors[`link_url_${idx}`] && (
                                                        <span className="text-[10px] text-red-500 font-bold block">
                                                            {formErrors[`link_url_${idx}`]}
                                                        </span>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SEÇÃO 3: Detalhes Adicionais */}
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Comentários da Aula</h3>
                            <div>
                                <RichTextEditor
                                    value={comentarios}
                                    onChange={setComentarios}
                                    placeholder="Escreva algum comentário ou anotação sobre esta aula..."
                                />
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="isExcecao"
                                    checked={isExcecao}
                                    onChange={(e) => setIsExcecao(e.target.checked)}
                                    className="w-4 h-4 text-tcm-red rounded border-slate-350 focus:ring-tcm-red cursor-pointer"
                                />
                                <label htmlFor="isExcecao" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                                    Esta aula é uma Exceção? (Não possui hanzi/exercícios padrão)
                                </label>
                            </div>
                        </div>

                        {/* Botões de Ação */}
                        <div className="pt-4 flex flex-col sm:flex-row gap-3">
                            <button
                                type="submit"
                                disabled={isSubmitting || !!successMsg}
                                className={`${
                                    successMsg
                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                        : 'bg-tcm-red hover:bg-tcm-dark-red text-white'
                                } px-8 py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-70 flex-1 sm:flex-none cursor-pointer shadow-sm`}
                            >
                                {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
                                {!isSubmitting && successMsg && <Check className="w-5 h-5 animate-bounce text-emerald-100" />}
                                {!isSubmitting && !successMsg && <Save className="w-5 h-5" />}
                                {isSubmitting ? 'Salvando...' : successMsg ? 'Alterações Salvas!' : 'Salvar Alterações'}
                            </button>

                            <button
                                type="button"
                                onClick={() => router.push('/admin/aulas')}
                                className="px-8 py-3.5 rounded-xl font-semibold text-slate-700 hover:bg-slate-200 bg-slate-100 transition-colors flex-1 sm:flex-none text-center cursor-pointer"
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>

                {/* Zona de Perigo */}
                <div className="bg-white border border-red-200 rounded-3xl p-6 shadow-sm space-y-4">
                    <div>
                        <h3 className="text-sm font-bold text-red-600">Zona de Perigo</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Ações destrutivas que não podem ser desfeitas.</p>
                    </div>
                    <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <p className="text-xs font-bold text-slate-700">Excluir esta Aula</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">A exclusão removerá permanentemente esta aula e todo o progresso dos alunos associados.</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleDeleteAula}
                            disabled={isDeleting}
                            className="flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-650 px-4 py-2.5 rounded-xl border border-red-200 hover:border-red-300 text-xs font-bold uppercase transition-all tracking-wider disabled:opacity-50 cursor-pointer shadow-sm active:scale-95 text-center shrink-0"
                        >
                            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            <span>Excluir Aula</span>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}