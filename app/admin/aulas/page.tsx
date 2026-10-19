'use client';
import { useState } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { PlusCircle, Pencil, Loader2, AlertCircle, BookOpen, ExternalLink, ChevronDown, ChevronUp, X } from 'lucide-react';
import posthog from 'posthog-js';
import { motion, AnimatePresence } from 'framer-motion';
import SetNavbar from '../../components/SetNavbar';

type Video = {
    url: string;
    titulo?: string;
};

type LinkAdicional = {
    url: string;
    titulo: string;
};

type Aula = {
    id: string;
    codigo_aula: string;
    codigo_licao?: string;
    titulo_descritivo: string;
    link_material?: string;
    link_tarefa?: string;
    comentarios?: string;
    is_excecao: boolean;
    videos?: Video[];
    links_adicionais?: LinkAdicional[];
};

export default function GerenciarAulas() {
    const supabase = createClientComponentClient();
    const router = useRouter();
    const queryClient = useQueryClient();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Estados do Formulário
    const [codigoAula, setCodigoAula] = useState('');
    const [codigoLicao, setCodigoLicao] = useState('');
    const [tituloDescritivo, setTituloDescritivo] = useState('');
    const [linkMaterial, setLinkMaterial] = useState('');
    const [linkTarefa, setLinkTarefa] = useState('');
    const [comentarios, setComentarios] = useState('');
    const [isExcecao, setIsExcecao] = useState(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    
    // Lista dinâmica de vídeos e links adicionais
    const [videosForms, setVideosForms] = useState<Video[]>([]);
    const [linksForms, setLinksForms] = useState<LinkAdicional[]>([]);

    // Estados de Listagem
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [limit, setLimit] = useState(12); // Padrão 12 itens

    // ==========================================
    // TANSTACK QUERY: FETCH DE AULAS
    // ==========================================
    const { data: aulas = [], isLoading } = useQuery({
        queryKey: ['admin-aulas'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('aulas')
                .select('*');

            if (error) throw error;
            return data as Aula[];
        },
        staleTime: 1000 * 60 * 5, // 5 minutos de cache em memória
    });

    // ==========================================
    // TANSTACK MUTATION: ADICIONAR AULA
    // ==========================================
    const addAulaMutation = useMutation({
        mutationFn: async (novaAula: Omit<Aula, 'id'>) => {
            const { error } = await supabase.from('aulas').insert([novaAula]);
            if (error) throw error;
        },
        onSuccess: () => {
            posthog.capture('admin_lesson_created', {
                codigo_aula: codigoAula,
                titulo: tituloDescritivo,
                is_excecao: isExcecao,
            });
            setSuccessMsg('Aula criada com sucesso!');

            // Invalida cache e recarrega
            queryClient.invalidateQueries({ queryKey: ['admin-aulas'] });

            // Limpa formulário e fecha modal
            setCodigoAula('');
            setCodigoLicao('');
            setTituloDescritivo('');
            setLinkMaterial('');
            setLinkTarefa('');
            setComentarios('');
            setIsExcecao(false);
            setVideosForms([]);
            setLinksForms([]);
            setFormErrors({});
            setIsModalOpen(false);

            setTimeout(() => setSuccessMsg(null), 3000);
        },
        onError: (err: Error) => {
            setError(err.message || 'Erro ao criar aula.');
        },
        onSettled: () => {
            setIsSubmitting(false);
        }
    });

    const handleAddAula = (e: React.FormEvent) => {
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

        videosForms.forEach((v, idx) => {
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

        linksForms.forEach((l, idx) => {
            if (!l.titulo.trim()) {
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

        // Filtra vídeos e links adicionais válidos
        const videosValidos = videosForms.filter(v => v.url.trim() !== '');
        const linksValidos = linksForms.filter(l => l.url.trim() !== '' && l.titulo.trim() !== '');

        addAulaMutation.mutate({
            codigo_aula: codigoAula,
            codigo_licao: codigoLicao || undefined,
            titulo_descritivo: tituloDescritivo,
            link_material: linkMaterial || undefined,
            link_tarefa: linkTarefa || undefined,
            comentarios: comentarios || undefined,
            is_excecao: isExcecao,
            videos: videosValidos,
            links_adicionais: linksValidos
        });
    };

    // ==========================================
    // FUNÇÕES AUXILIARES DE FORMULÁRIO DINÂMICO
    // ==========================================
    const adicionarVideoForm = () => setVideosForms([...videosForms, { url: '', titulo: '' }]);
    const removerVideoForm = (index: number) => setVideosForms(videosForms.filter((_, i) => i !== index));
    const alterarVideoForm = (index: number, campo: keyof Video, valor: string) => {
        setVideosForms(videosForms.map((vf, i) => i === index ? { ...vf, [campo]: valor } : vf));
    };

    const adicionarLinkForm = () => setLinksForms([...linksForms, { url: '', titulo: '' }]);
    const removerLinkForm = (index: number) => setLinksForms(linksForms.filter((_, i) => i !== index));
    const alterarLinkForm = (index: number, campo: keyof LinkAdicional, valor: string) => {
        setLinksForms(linksForms.map((lf, i) => i === index ? { ...lf, [campo]: valor } : lf));
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-tcm-red" />
            </div>
        );
    }

    // ==========================================
    // ORDENAÇÃO E PAGINAÇÃO EM MEMÓRIA
    // ==========================================
    const sortedAulas = [...aulas].sort((a, b) => {
        const compare = a.codigo_aula.localeCompare(b.codigo_aula, undefined, { numeric: true, sensitivity: 'base' });
        return order === 'asc' ? compare : -compare;
    });

    const paginatedAulas = sortedAulas.slice(0, limit);

    return (
        <div className="min-h-screen bg-slate-50 pt-20 pb-20 px-4 sm:px-8 font-sans">
            <SetNavbar title="Gerenciamento de Aulas" backLink="/admin" />

            {/* MODAL DE CADASTRO COM FRAMER MOTION (FORA DE CONTÊINER LIMITANTE E ANIMADO) */}
            <AnimatePresence>
                {isModalOpen && (
                    <>
                        {/* Backdrop desfoque */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 bg-[#1a0505]/80 backdrop-blur"
                            onClick={() => setIsModalOpen(false)}
                        />

                        {/* Conteúdo do Modal */}
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                                transition={{ type: 'spring', duration: 0.35 }}
                                className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] pointer-events-auto"
                            >
                                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-tcm-red/10 p-2 rounded-xl text-tcm-red">
                                            <PlusCircle className="w-5 h-5" />
                                        </div>
                                        <h2 className="text-xl font-bold text-slate-800">Adicionar Nova Aula</h2>
                                    </div>
                                    <button
                                        onClick={() => setIsModalOpen(false)}
                                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <form onSubmit={handleAddAula} noValidate className="flex flex-col flex-1 overflow-hidden">
                                    <div className="p-6 overflow-y-auto space-y-6 flex-1 max-h-[65vh]">
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
                                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none bg-white transition-shadow text-slate-800 text-sm ${
                                                            formErrors.codigoAula
                                                                ? 'border-red-300 focus:ring-red-500/50'
                                                                : 'border-slate-200 focus:ring-tcm-red/50'
                                                        }`}
                                                        placeholder="Ex: 004"
                                                    />
                                                    {formErrors.codigoAula && (
                                                        <span className="text-[10px] text-red-500 font-bold mt-1 block">
                                                            {formErrors.codigoAula}
                                                        </span>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-650 mb-1">Lição Correspondente</label>
                                                    <input
                                                        type="text"
                                                        value={codigoLicao}
                                                        onChange={(e) => setCodigoLicao(e.target.value)}
                                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-tcm-red/50 outline-none bg-white transition-shadow text-slate-800 text-sm"
                                                        placeholder="Ex: 1"
                                                    />
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
                                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none bg-white transition-shadow text-slate-800 text-sm ${
                                                            formErrors.tituloDescritivo
                                                                ? 'border-red-300 focus:ring-red-500/50'
                                                                : 'border-slate-200 focus:ring-tcm-red/50'
                                                        }`}
                                                        placeholder="Ex: Olá e Cumprimentos"
                                                    />
                                                    {formErrors.tituloDescritivo && (
                                                        <span className="text-[10px] text-red-500 font-bold mt-1 block">
                                                            {formErrors.tituloDescritivo}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 pt-2">
                                                <input
                                                    type="checkbox"
                                                    id="isExcecao"
                                                    checked={isExcecao}
                                                    onChange={(e) => setIsExcecao(e.target.checked)}
                                                    className="w-4 h-4 text-tcm-red border-slate-300 rounded focus:ring-tcm-red/50 cursor-pointer"
                                                />
                                                <label htmlFor="isExcecao" className="text-xs font-semibold text-slate-700 cursor-pointer">Definir como Aula de Exceção (esconde tarefas padrão)</label>
                                            </div>
                                        </div>

                                        {/* SEÇÃO 2: Vídeos das Aulas */}
                                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-4">
                                            <div className="flex justify-between items-center mb-2">
                                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vídeos Vinculados</h3>
                                                <button
                                                    type="button"
                                                    onClick={adicionarVideoForm}
                                                    className="text-xs bg-white hover:bg-slate-150 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-colors font-semibold"
                                                >
                                                    + Adicionar Parte
                                                </button>
                                            </div>

                                            {videosForms.length === 0 ? (
                                                <p className="text-xs text-slate-400 italic">Nenhum vídeo vinculado ainda.</p>
                                            ) : (
                                                <div className="space-y-3">
                                                    {videosForms.map((vf, idx) => (
                                                        <div key={idx} className="p-3 bg-white border border-slate-100 rounded-xl space-y-3 relative shadow-xs">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-xs font-bold text-tcm-red">Parte {idx + 1}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removerVideoForm(idx)}
                                                                    className="text-xs text-red-500 hover:text-red-700 font-semibold"
                                                                >
                                                                    Remover
                                                                </button>
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-slate-500 mb-1">URL do YouTube *</label>
                                                                    <input
                                                                        type="url"
                                                                        value={vf.url}
                                                                        onChange={(e) => {
                                                                            alterarVideoForm(idx, 'url', e.target.value);
                                                                            if (formErrors[`video_url_${idx}`]) {
                                                                                setFormErrors(prev => {
                                                                                    const copy = { ...prev };
                                                                                    delete copy[`video_url_${idx}`];
                                                                                    return copy;
                                                                                });
                                                                            }
                                                                        }}
                                                                        className={`w-full px-2.5 py-1.5 border rounded-lg text-xs outline-none focus:ring-2 ${
                                                                            formErrors[`video_url_${idx}`]
                                                                                ? 'border-red-300 focus:ring-red-500/50'
                                                                                : 'border-slate-200 focus:ring-tcm-red/50'
                                                                        }`}
                                                                        placeholder="https://www.youtube.com/watch?v=..."
                                                                    />
                                                                    {formErrors[`video_url_${idx}`] && (
                                                                        <span className="text-[10px] text-red-500 font-bold mt-1 block">
                                                                            {formErrors[`video_url_${idx}`]}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Título da Parte</label>
                                                                    <input
                                                                        type="text"
                                                                        value={vf.titulo}
                                                                        onChange={(e) => alterarVideoForm(idx, 'titulo', e.target.value)}
                                                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                                                                        placeholder="Ex: Parte Prática"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* SEÇÃO 3: Materiais e Tarefas */}
                                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-4">
                                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Links de Materiais</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-650 mb-1">Material de Apoio (URL PDF)</label>
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
                                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none bg-white text-slate-800 text-sm ${
                                                            formErrors.linkMaterial
                                                                ? 'border-red-300 focus:ring-red-500/50'
                                                                : 'border-slate-200 focus:ring-tcm-red/50'
                                                        }`}
                                                        placeholder="https://..."
                                                    />
                                                    {formErrors.linkMaterial && (
                                                        <span className="text-[10px] text-red-500 font-bold mt-1 block">
                                                            {formErrors.linkMaterial}
                                                        </span>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-650 mb-1">Tarefa/Exercício (URL PDF)</label>
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
                                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none bg-white text-slate-800 text-sm ${
                                                            formErrors.linkTarefa
                                                                ? 'border-red-300 focus:ring-red-500/50'
                                                                : 'border-slate-200 focus:ring-tcm-red/50'
                                                        }`}
                                                        placeholder="https://..."
                                                    />
                                                    {formErrors.linkTarefa && (
                                                        <span className="text-[10px] text-red-500 font-bold mt-1 block">
                                                            {formErrors.linkTarefa}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* SEÇÃO 4: Links Adicionais Coringa */}
                                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-4">
                                            <div className="flex justify-between items-center mb-2">
                                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Links Adicionais (Coringa)</h3>
                                                <button
                                                    type="button"
                                                    onClick={adicionarLinkForm}
                                                    className="text-xs bg-white hover:bg-slate-150 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-colors font-semibold"
                                                >
                                                    + Adicionar Link
                                                </button>
                                            </div>

                                            {linksForms.length === 0 ? (
                                                <p className="text-xs text-slate-400 italic">Nenhum link adicional criado.</p>
                                            ) : (
                                                <div className="space-y-3">
                                                    {linksForms.map((lf, idx) => (
                                                        <div key={idx} className="p-3 bg-white border border-slate-100 rounded-xl space-y-3 relative shadow-xs">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-xs font-bold text-slate-500">Link #{idx + 1}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removerLinkForm(idx)}
                                                                    className="text-xs text-red-500 hover:text-red-700 font-semibold"
                                                                >
                                                                    Remover
                                                                </button>
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Título do Link *</label>
                                                                    <input
                                                                        type="text"
                                                                        value={lf.titulo}
                                                                        onChange={(e) => {
                                                                            alterarLinkForm(idx, 'titulo', e.target.value);
                                                                            if (formErrors[`link_titulo_${idx}`]) {
                                                                                setFormErrors(prev => {
                                                                                    const copy = { ...prev };
                                                                                    delete copy[`link_titulo_${idx}`];
                                                                                    return copy;
                                                                                });
                                                                            }
                                                                        }}
                                                                        className={`w-full px-2.5 py-1.5 border rounded-lg text-xs outline-none focus:ring-2 ${
                                                                            formErrors[`link_titulo_${idx}`]
                                                                                ? 'border-red-300 focus:ring-red-500/50'
                                                                                : 'border-slate-200 focus:ring-tcm-red/50'
                                                                        }`}
                                                                        placeholder="Ex: Notion de Apoio"
                                                                    />
                                                                    {formErrors[`link_titulo_${idx}`] && (
                                                                        <span className="text-[10px] text-red-500 font-bold mt-1 block">
                                                                            {formErrors[`link_titulo_${idx}`]}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-slate-500 mb-1">URL Completa *</label>
                                                                    <input
                                                                        type="url"
                                                                        value={lf.url}
                                                                        onChange={(e) => {
                                                                            alterarLinkForm(idx, 'url', e.target.value);
                                                                            if (formErrors[`link_url_${idx}`]) {
                                                                                setFormErrors(prev => {
                                                                                    const copy = { ...prev };
                                                                                    delete copy[`link_url_${idx}`];
                                                                                    return copy;
                                                                                });
                                                                            }
                                                                        }}
                                                                        className={`w-full px-2.5 py-1.5 border rounded-lg text-xs outline-none focus:ring-2 ${
                                                                            formErrors[`link_url_${idx}`]
                                                                                ? 'border-red-300 focus:ring-red-500/50'
                                                                                : 'border-slate-200 focus:ring-tcm-red/50'
                                                                        }`}
                                                                        placeholder="https://..."
                                                                    />
                                                                    {formErrors[`link_url_${idx}`] && (
                                                                        <span className="text-[10px] text-red-500 font-bold mt-1 block">
                                                                            {formErrors[`link_url_${idx}`]}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* SEÇÃO 5: Comentários do Professor */}
                                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Comentários e Dicas (HTML suportado)</h3>
                                            <textarea
                                                value={comentarios}
                                                onChange={(e) => setComentarios(e.target.value)}
                                                rows={4}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-tcm-red/50 outline-none bg-white text-slate-800 text-sm font-mono"
                                                placeholder="Ex: <p>Nesta aula veremos...</p>"
                                            />
                                        </div>
                                    </div>

                                    {/* Footer do Modal */}
                                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setIsModalOpen(false)}
                                            className="px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="bg-tcm-red hover:bg-tcm-dark-red text-white px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-70 shadow-sm cursor-pointer"
                                        >
                                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                                            Criar Aula
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>

            <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">

                {/* Avisos */}
                {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 shadow-sm"><AlertCircle className="w-5 h-5" /><span>{error}</span></div>}
                {successMsg && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg shadow-sm">{successMsg}</div>}

                {/* Cabeçalho Externo Unificado */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/60">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <div className="bg-tcm-red/10 p-2 rounded-xl text-tcm-red">
                                <BookOpen className="w-5 h-5" />
                            </div>
                            <h1 className="text-xl font-bold text-slate-800">Gerenciamento de Aulas</h1>
                        </div>
                        <p className="text-xs text-slate-400 mt-1.5">Gerencie os conteúdos, links e exceções do curso.</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center justify-center gap-2 bg-tcm-red hover:bg-tcm-dark-red text-white px-4 py-2.5 rounded-xl transition-all font-bold text-xs uppercase tracking-wider cursor-pointer shadow-sm active:scale-95 w-full sm:w-auto shrink-0 animate-in fade-in"
                    >
                        <PlusCircle className="w-4 h-4 text-tcm-yellow" />
                        <span>Nova Aula</span>
                    </button>
                </div>

                {/* Bloco de Listagem e Grid de Aulas */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                    {/* Header da Listagem com Controles de Sorting */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-5">
                        <div>
                            <h2 className="text-base font-bold text-slate-700">Aulas Cadastradas ({aulas.length})</h2>
                            <p className="text-xs text-slate-400 mt-0.5">Clique em editar para gerenciar os detalhes de cada aula.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setOrder(order === 'asc' ? 'desc' : 'asc')}
                                className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-4 py-2 text-xs font-semibold text-slate-650 transition-all select-none shadow-xs active:scale-95"
                            >
                                {order === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-tcm-red" /> : <ChevronDown className="w-3.5 h-3.5 text-tcm-red" />}
                                Ordenar: {order === 'asc' ? 'Crescente' : 'Decrescente'}
                            </button>
                        </div>
                    </div>

                    {paginatedAulas.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 font-medium text-sm bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                            Nenhuma aula cadastrada ainda.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {paginatedAulas.map((aula) => {
                                const totalVideos = aula.videos?.length || 0;
                                const hasMaterial = !!aula.link_material;
                                const hasTarefa = !!aula.link_tarefa;
                                const totalLinks = aula.links_adicionais?.length || 0;

                                return (
                                    <div
                                        key={aula.id}
                                        className="relative bg-white border border-slate-200 hover:border-tcm-red/35 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col group overflow-hidden animate-in fade-in"
                                    >
                                        {/* Barra sutil de Destaque Superior */}
                                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-100 group-hover:bg-tcm-red/60 transition-colors" />

                                        {/* Cabeçalho do Card */}
                                        <div className="flex justify-between items-start mb-3 pt-1">
                                            <div>
                                                <span className="bg-tcm-red/8 text-tcm-red border border-tcm-red/12 text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-md">
                                                    Aula {aula.codigo_aula}
                                                </span>
                                                {aula.codigo_licao && (
                                                    <span className="ml-1.5 bg-slate-100 text-slate-600 text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded-md">
                                                        Lição {aula.codigo_licao}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Título */}
                                        <h3 className="font-bold text-slate-800 text-base line-clamp-1 mb-4 flex-1 group-hover:text-tcm-red transition-colors" title={aula.titulo_descritivo}>
                                            {aula.titulo_descritivo}
                                        </h3>

                                        {/* Metadados Auxiliares */}
                                        <div className="space-y-2 mb-5 border-t border-slate-100 pt-3">
                                            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                                                <span className="flex items-center gap-1.5">
                                                    <BookOpen className="w-3.5 h-3.5 text-slate-400 group-hover:text-tcm-red transition-colors" /> Vídeos Vinculados:
                                                </span>
                                                <span className={`font-bold ${totalVideos > 0 ? 'text-tcm-red' : 'text-slate-400'}`}>{totalVideos}</span>
                                            </div>

                                            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                                                <span className="flex items-center gap-1.5">
                                                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-tcm-red transition-colors" /> Materiais Extras:
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    {hasMaterial && <span className="bg-emerald-50 text-emerald-700 text-[9px] px-1.5 py-0.5 rounded-md font-bold border border-emerald-100">Apoio</span>}
                                                    {hasTarefa && <span className="bg-blue-50 text-blue-700 text-[9px] px-1.5 py-0.5 rounded-md font-bold border border-blue-100">Tarefa</span>}
                                                    {totalLinks > 0 && <span className="bg-sky-50 text-sky-700 text-[9px] px-1.5 py-0.5 rounded-md font-bold border border-sky-100">+{totalLinks} Links</span>}
                                                    {!hasMaterial && !hasTarefa && totalLinks === 0 && <span className="text-slate-400 font-semibold">-</span>}
                                                </div>
                                            </div>

                                            {aula.is_excecao && (
                                                <div className="flex items-center justify-between text-xs text-slate-500 font-medium pt-1">
                                                    <span className="bg-amber-50 text-amber-800 text-[9px] px-2 py-0.5 rounded-md font-bold border border-amber-100">
                                                        Aula de Exceção (Sem Tarefas)
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Ação do Card */}
                                        <button
                                            onClick={() => router.push(`/admin/aulas/editar/${aula.id}`)}
                                            className="w-full bg-slate-50 hover:bg-tcm-red hover:text-white border border-slate-200 hover:border-tcm-red px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 group-hover:shadow-sm active:scale-95 text-slate-700 shrink-0"
                                        >
                                            <Pencil className="w-3.5 h-3.5 text-tcm-yellow" /> Editar Detalhes
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Botão de Paginação "Ver Mais" */}
                    {sortedAulas.length > limit && (
                        <div className="mt-8 flex justify-center">
                            <button
                                onClick={() => setLimit(prev => prev + 12)}
                                className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-tcm-red text-slate-600 hover:text-tcm-red px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-xs hover:shadow-md flex items-center gap-2 active:scale-95"
                            >
                                Ver mais aulas
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}