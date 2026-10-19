'use client';
import { useState } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { PlusCircle, Loader2, AlertCircle, Table, Trash2, MessageSquare, X } from 'lucide-react';
import posthog from 'posthog-js';
import { motion, AnimatePresence } from 'framer-motion';
import SetNavbar from '../../components/SetNavbar';

type Aula = {
    id: string;
    codigo_aula: string;
    titulo_descritivo: string;
};

type Dialogo = {
    id: string;
    titulo: string;
    aula_id: string;
    ordem_exibicao: number;
    aulas?: { codigo_aula: string }; // Join com a tabela aulas
};

export default function GerenciarDialogos() {
    const supabase = createClientComponentClient();
    const router = useRouter();
    const queryClient = useQueryClient();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form
    const [novoTitulo, setNovoTitulo] = useState('');
    const [aulaIdSelecionada, setAulaIdSelecionada] = useState('');

    // ==========================================
    // TANSTACK QUERY: FETCH
    // ==========================================
    const { data, isLoading } = useQuery({
        queryKey: ['admin-dialogos'],
        queryFn: async () => {
            const [dialogosRes, aulasRes] = await Promise.all([
                supabase.from('dialogos').select('*, aulas(codigo_aula)').order('ordem_exibicao'),
                supabase.from('aulas').select('id, codigo_aula, titulo_descritivo').order('codigo_aula')
            ]);

            if (dialogosRes.error) throw dialogosRes.error;
            if (aulasRes.error) throw aulasRes.error;

            return {
                dialogos: dialogosRes.data as Dialogo[],
                aulasLista: aulasRes.data as Aula[]
            };
        }
    });

    const dialogos = data?.dialogos || [];
    const aulasLista = data?.aulasLista || [];

    // ==========================================
    // TANSTACK MUTATION: ADICIONAR
    // ==========================================
    const addDialogoMutation = useMutation({
        mutationFn: async () => {
            const { error: insertError } = await supabase.from('dialogos').insert([{
                titulo: novoTitulo,
                aula_id: aulaIdSelecionada,
                ordem_exibicao: dialogos.length + 1 // Coloca no fim da lista por padrão
            }]);
            if (insertError) throw insertError;
        },
        onSuccess: () => {
            posthog.capture('admin_dialog_created', { titulo: novoTitulo });
            setSuccessMsg('Diálogo criado! Agora você pode editar as falas.');
            
            queryClient.invalidateQueries({ queryKey: ['admin-dialogos'] });
            
            setNovoTitulo('');
            setAulaIdSelecionada('');
            setIsModalOpen(false);
            setTimeout(() => setSuccessMsg(null), 4000);
        },
        onError: (err: Error) => {
            setError(err.message || 'Erro ao criar diálogo.');
        },
        onSettled: () => {
            setIsSubmitting(false);
        }
    });

    const handleAddDialogo = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        setSuccessMsg(null);
        addDialogoMutation.mutate();
    };

    // ==========================================
    // TANSTACK MUTATION: DELETAR
    // ==========================================
    const deleteDialogoMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('dialogos').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-dialogos'] });
        },
        onError: (err) => {
            console.error(err);
            alert('Erro ao excluir diálogo.');
        }
    });

    const handleDelete = (id: string) => {
        if (!window.confirm('Tem certeza? Isso apagará este diálogo e TODO o progresso dos alunos nele!')) return;
        deleteDialogoMutation.mutate(id);
    };

    if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-tcm-red" /></div>;

    return (
        <div className="min-h-screen bg-slate-50 pt-20 pb-20 px-4 sm:px-8 font-sans">
            <SetNavbar title="Simulador de Diálogos" backLink="/admin" />

            {/* MODAL DE CADASTRO COM FRAMER MOTION (FORA DE CONTÊINER LIMITANTE) */}
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
                                className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] pointer-events-auto"
                            >
                                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-tcm-red/10 p-2 rounded-xl text-tcm-red">
                                            <PlusCircle className="w-5 h-5" />
                                        </div>
                                        <h2 className="text-xl font-bold text-slate-800">Criar Novo Diálogo</h2>
                                    </div>
                                    <button
                                        onClick={() => setIsModalOpen(false)}
                                        className="p-2 text-slate-400 hover:text-slate-650 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <form onSubmit={handleAddDialogo} className="flex flex-col flex-1 overflow-hidden">
                                    <div className="p-6 overflow-y-auto space-y-4 flex-1">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Vincular a qual Aula? *</label>
                                            <select
                                                required
                                                value={aulaIdSelecionada}
                                                onChange={(e) => setAulaIdSelecionada(e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-tcm-red/50 bg-white outline-none transition-shadow text-slate-850 text-sm"
                                            >
                                                <option value="" disabled>Selecione uma aula</option>
                                                {aulasLista.map(a => (
                                                    <option key={a.id} value={a.id}>Aula {a.codigo_aula} - {a.titulo_descritivo}</option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Título do Diálogo *</label>
                                            <input
                                                type="text"
                                                required
                                                value={novoTitulo}
                                                onChange={(e) => setNovoTitulo(e.target.value)}
                                                placeholder="Ex: Comprando passagens"
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-tcm-red/50 bg-white outline-none transition-shadow text-slate-850 text-sm"
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
                                            disabled={isSubmitting || !aulaIdSelecionada}
                                            className="bg-tcm-red hover:bg-tcm-dark-red text-white px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-70 shadow-sm cursor-pointer"
                                        >
                                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4 text-tcm-yellow" />}
                                            Criar Diálogo
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
                                <MessageSquare className="w-5 h-5" />
                            </div>
                            <h1 className="text-xl font-bold text-slate-800">Simulador de Diálogos</h1>
                        </div>
                        <p className="text-xs text-slate-400 mt-1.5">Crie e edite diálogos para o treino de conversação dos alunos.</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center justify-center gap-2 bg-tcm-red hover:bg-tcm-dark-red text-white px-4 py-2.5 rounded-xl transition-all font-bold text-xs uppercase tracking-wider cursor-pointer shadow-sm active:scale-95 w-full sm:w-auto shrink-0 animate-in fade-in"
                    >
                        <PlusCircle className="w-4 h-4 text-tcm-yellow" />
                        <span>Novo Diálogo</span>
                    </button>
                </div>

                {/* LISTA DE DIÁLOGOS CADASTRADOS */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-800 mb-4">Diálogos Cadastrados ({dialogos.length})</h2>
                    
                    {dialogos.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 font-medium text-sm bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                            Nenhum diálogo cadastrado ainda.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {dialogos.map((dialogo) => (
                                <div key={dialogo.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-slate-100 bg-slate-50/50 rounded-xl group hover:border-tcm-red/30 hover:shadow-sm transition-all gap-4 animate-in fade-in">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Aula {dialogo.aulas?.codigo_aula || '?'}</span>
                                        </div>
                                        <h3 className="font-bold text-slate-800 text-base sm:text-lg">{dialogo.titulo}</h3>
                                    </div>

                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        {/* Botão de Excluir */}
                                        <button onClick={() => handleDelete(dialogo.id)} className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors cursor-pointer" title="Excluir Diálogo">
                                            <Trash2 className="w-5 h-5" />
                                        </button>

                                        {/* Botão de Editar Planilha */}
                                        <button 
                                            onClick={() => router.push(`/admin/dialogos/${dialogo.id}/editar`)}
                                            className="flex-1 sm:flex-none bg-tcm-red hover:bg-tcm-dark-red text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-95"
                                        >
                                            <Table className="w-4 h-4 text-tcm-yellow" /> Editar Planilha
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}