
'use client';

import { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    BookOpen, ExternalLink, CheckCircle2, Circle,
    PencilLine, Loader2, PlayCircle, X, Cloud, AlertCircle, Library, Video, Award, ChevronDown, ChevronRight, Trash2, Send,
    Flame, Brain, Snowflake, MessageCircle
} from 'lucide-react';

import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import posthog from 'posthog-js';
import SetNavbar from '../components/SetNavbar';
import YouTubePlayer, { getYouTubeId } from '../components/YouTubePlayer';



// ==========================================
// TIPAGENS
// ==========================================
type VideoAula = {
    titulo?: string;
    url: string;
};

type ComentarioAula = {
    id: string;
    texto: string;
    created_at: string;
    aluno_id: string;
    alunos: { nome: string };
};

type LinkAdicional = {
    titulo?: string;
    url: string;
};

type Aula = {
    id: string;
    codigo_aula: string;
    titulo_descritivo: string;
    codigo_licao: string | null;
    videos: VideoAula[] | null;
    link_material: string | null;
    link_tarefa: string | null;
    links_adicionais: LinkAdicional[] | null;
    comentarios: string | null;
    is_excecao: boolean;
};

type Progresso = {
    id?: string;
    aluno_id: string;
    aula_id: string;
    status: 'Pendente' | 'Em Andamento' | 'Concluída';
    aula_assistida: boolean;
    tarefa_exercicios_concluida: boolean;
    tarefa_hanzi_concluida: boolean;
    tarefa_excecao_concluida: boolean;
};

type AulaComProgresso = Aula & { progresso: Progresso | null };

// ==========================================
// HELPERS FORA DO COMPONENTE PRINCIPAL
// ==========================================
const getEstatisticas = (aula: AulaComProgresso) => {
    const p = aula.progresso;
    const total = aula.is_excecao ? 2 : 3;
    let feitas = 0;
    if (p?.aula_assistida) feitas++;
    if (aula.is_excecao && p?.tarefa_excecao_concluida) feitas++;
    if (!aula.is_excecao && p?.tarefa_exercicios_concluida) feitas++;
    if (!aula.is_excecao && p?.tarefa_hanzi_concluida) feitas++;
    return { feitas, total, isCompleta: feitas === total };
};

const MiniCard = memo(({ aula, onOpenModal }: { aula: AulaComProgresso, onOpenModal: (aula: AulaComProgresso) => void }) => {
    const stats = getEstatisticas(aula);
    const porcentagem = Math.round((stats.feitas / stats.total) * 100);

    return (
        <div
            onClick={() => onOpenModal(aula)}
            className="bg-white border border-slate-200 rounded-tcm-md p-4 cursor-pointer hover:shadow-tcm-md hover:border-tcm-red transition-tcm group relative overflow-hidden flex flex-col justify-start h-full min-h-25 sm:min-h-27.5 pb-6 animate-in fade-in slide-in-from-bottom-4 duration-300 tcm-lazy-render"
        >
            <div className="absolute bottom-0 left-0 h-1.5 bg-slate-100 w-full">
                <div className="h-full bg-tcm-red transition-tcm duration-500" style={{ width: `${porcentagem}%` }} />
            </div>

            <div className="flex justify-between items-start mb-1.5 shrink-0">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider group-hover:text-tcm-red transition-colors">
                    Aula {aula.codigo_aula}
                </span>
                {stats.isCompleta && (
                    <CheckCircle2 className="w-5 h-5 text-tcm-red shrink-0" />
                )}
            </div>
            <h3 className="text-slate-800 font-semibold leading-snug group-hover:text-tcm-red transition-colors line-clamp-2 flex-1">
                {aula.titulo_descritivo}
            </h3>
        </div>
    );
});
MiniCard.displayName = 'MiniCard';

const CardPilha = memo(({ aula, totalRestantes, onClick }: { aula: AulaComProgresso, totalRestantes: number, onClick: () => void }) => {
    return (
        <motion.div
            onClick={onClick}
            whileHover="hover"
            className="relative cursor-pointer h-full min-h-25 sm:min-h-27.5 select-none group"
        >
            {/* Card de Fundo 2 */}
            <motion.div 
                className="absolute inset-0 bg-white border border-slate-200 rounded-tcm-md shadow-sm pointer-events-none"
                variants={{
                    idle: { rotate: 2, x: 4, y: 2, scale: 0.97 },
                    hover: { rotate: 5, x: 8, y: 4, scale: 0.96 }
                }}
                initial="idle"
                transition={{ type: 'spring', stiffness: 350, damping: 22 }}
            />
            {/* Card de Fundo 1 */}
            <motion.div 
                className="absolute inset-0 bg-white border border-slate-200 rounded-tcm-md shadow-sm pointer-events-none"
                variants={{
                    idle: { rotate: -2, x: -4, y: 1, scale: 0.99 },
                    hover: { rotate: -5, x: -8, y: 2, scale: 0.98 }
                }}
                initial="idle"
                transition={{ type: 'spring', stiffness: 350, damping: 22 }}
            />

            {/* Card Principal da Frente */}
            <div className="relative bg-white border border-slate-200 group-hover:border-tcm-red rounded-tcm-md p-4 shadow-tcm-sm group-hover:shadow-tcm-md transition-tcm flex flex-col justify-start h-full z-10 overflow-hidden pb-8">
                <div className="flex justify-between items-start mb-1.5 shrink-0">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider group-hover:text-tcm-red transition-colors">
                        Aula {aula.codigo_aula}
                    </span>
                    <span className="text-[10px] font-bold text-tcm-red bg-red-50 px-2 py-0.5 rounded-tcm-xs border border-red-100 uppercase tracking-wide shrink-0">
                        +{totalRestantes} {totalRestantes === 1 ? 'Aula' : 'Aulas'}
                    </span>
                </div>
                <h3 className="text-slate-800 font-semibold leading-snug group-hover:text-tcm-red transition-colors line-clamp-1 sm:line-clamp-2 flex-1">
                    {aula.titulo_descritivo}
                </h3>
                <p className="absolute bottom-3 left-4 text-[10px] text-slate-400 font-medium group-hover:text-tcm-red transition-colors flex items-center gap-1 shrink-0">
                    Clique para expandir a pilha
                </p>
            </div>
        </motion.div>
    );
});
CardPilha.displayName = 'CardPilha';

const CompactCard = memo(({ aula, onOpenModal }: { aula: AulaComProgresso, onOpenModal: (aula: AulaComProgresso) => void }) => {
    const p = aula.progresso;
    const tarefasTotal = aula.is_excecao ? 1 : 2;
    let tarefasFeitas = 0;
    
    if (aula.is_excecao) {
        if (p?.tarefa_excecao_concluida) tarefasFeitas++;
    } else {
        if (p?.tarefa_exercicios_concluida) tarefasFeitas++;
        if (p?.tarefa_hanzi_concluida) tarefasFeitas++;
    }
    
    const tarefasCompletas = tarefasFeitas === tarefasTotal;

    return (
        <div
            onClick={() => onOpenModal(aula)}
            className="flex items-center justify-start bg-white border border-slate-200 hover:border-tcm-red rounded-tcm-md p-3 cursor-pointer hover:shadow-tcm-sm transition-tcm group relative overflow-hidden text-left"
        >
            <div className="flex items-center gap-3 min-w-0 flex-1">
                {tarefasCompletas ? (
                    <div className="bg-emerald-50 text-emerald-600 p-1.5 rounded-full shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                ) : (
                    <div className="bg-amber-50 text-amber-600 p-1.5 rounded-full shrink-0">
                        <PencilLine className="w-3.5 h-3.5" />
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Aula {aula.codigo_aula}
                        </span>
                        {tarefasCompletas ? (
                            <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-tcm-xs border border-emerald-100">
                                Concluída
                            </span>
                        ) : (
                            <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-tcm-xs border border-amber-100">
                                {tarefasFeitas}/{tarefasTotal} {tarefasTotal === 1 ? 'Tarefa' : 'Tarefas'}
                            </span>
                        )}
                    </div>
                    <h4 className="text-sm font-semibold text-slate-700 group-hover:text-tcm-red transition-colors mt-0.5 w-full whitespace-normal wrap-break-word">
                        {aula.titulo_descritivo}
                    </h4>
                </div>
            </div>
        </div>
    );
});
CompactCard.displayName = 'CompactCard';

// ==========================================
// PÁGINA PRINCIPAL
// ==========================================
export default function DashboardAluno() {
    const supabase = createClientComponentClient();
    const router = useRouter();
    const queryClient = useQueryClient();

    // ==========================================
    // QUERIES DO TANSTACK (Substitui useEffect e localStorage)
    // ==========================================
    const { data: sessionData, isLoading: isLoadingSession } = useQuery({
        queryKey: ['user-session'],
        queryFn: async () => {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error || !user) {
                router.push('/login');
                throw new Error('Não autenticado');
            }
            const { data: profile } = await supabase.from('alunos').select('nome, is_admin').eq('id', user.id).single();
            return { user, profile };
        },
        staleTime: Infinity, // A sessão não muda atoa, não precisa refetch constante
    });

    const userId = sessionData?.user?.id;
    const userName = sessionData?.profile?.nome || '';

    const { data: aulas = [], isLoading: isLoadingAulas } = useQuery({
        queryKey: ['aulas', userId],
        enabled: !!userId, // Só executa após termos o ID do usuário
        queryFn: async () => {
            const [aulasResult, progressoResult] = await Promise.all([
                supabase.from('aulas').select('*').order('codigo_aula', { ascending: true }),
                supabase.from('progresso_aluno').select('*').eq('aluno_id', userId)
            ]);

            if (aulasResult.error) throw aulasResult.error;

            const aulasOrdenadas = aulasResult.data || [];

            return aulasOrdenadas.map(aula => {
                const progresso = progressoResult.data?.find(p => p.aula_id === aula.id) || null;
                return { ...aula, progresso };
            }) as AulaComProgresso[];
        },
        staleTime: 1000 * 60 * 15, // 15 minutos de cache para lista de aulas
    });

    const isLoading = isLoadingSession || isLoadingAulas;

    // Tracker PostHog
    useEffect(() => {
        if (sessionData?.user) {
            posthog.identify(sessionData.user.id, { email: sessionData.user.email, name: sessionData.profile?.nome, role: 'student' });
        }
    }, [sessionData]);

    // Estados de Paginação e Filtros de Aulas
    const [limiteNaoAssistidas, setLimiteNaoAssistidas] = useState(6);
    const [paraAssistirExpandido, setParaAssistirExpandido] = useState(false);
    const [filtroHistorico, setFiltroHistorico] = useState<'todas' | 'assistidas' | 'concluidas'>('todas');
    const [ordenacaoHistorico, setOrdenacaoHistorico] = useState<'crescente' | 'decrescente'>('decrescente');
    const [limiteHistorico, setLimiteHistorico] = useState(6);

    // Metadados SRS
    const { data: srsMeta } = useQuery({
        queryKey: ['srs-meta', userId],
        enabled: !!userId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('progresso_srs_meta')
                .select('*')
                .eq('aluno_id', userId)
                .single();
            if (error && error.code !== 'PGRST116') throw error;
            return data || null;
        },
        staleTime: 1000 * 10,
    });

    const streakInfo = useMemo(() => {
        if (!srsMeta) return { streak: 0, status: 'none' as const };
        if (!srsMeta.ultima_revisao) return { streak: 0, status: 'none' as const };

        const viradaHora = srsMeta.virada_hora ?? 1;
        const tz = 'America/Sao_Paulo';
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            year: 'numeric', month: 'numeric', day: 'numeric',
            hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false
        });

        const getAdjustedLocalDayStr = (date: Date) => {
            const parts = formatter.formatToParts(date);
            const partMap: Record<string, string> = {};
            for (const part of parts) {
                partMap[part.type] = part.value;
            }
            const y = parseInt(partMap.year, 10);
            const m = parseInt(partMap.month, 10) - 1;
            const d = parseInt(partMap.day, 10);
            const h = parseInt(partMap.hour, 10);
            const min = parseInt(partMap.minute, 10);
            const s = parseInt(partMap.second, 10);
            
            const localDate = new Date(y, m, d, h, min, s);
            localDate.setHours(localDate.getHours() - viradaHora);
            
            const yyyy = localDate.getFullYear();
            const mm = String(localDate.getMonth() + 1).padStart(2, '0');
            const dd = String(localDate.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        };

        const todayStr = getAdjustedLocalDayStr(new Date());
        const lastReviewStr = getAdjustedLocalDayStr(new Date(srsMeta.ultima_revisao));

        const d1 = new Date(todayStr + 'T00:00:00Z');
        const d2 = new Date(lastReviewStr + 'T00:00:00Z');
        const diffTime = d1.getTime() - d2.getTime(); // Sem Math.abs
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 1) {
            return { streak: srsMeta.streak_atual, status: srsMeta.streak_atual > 0 ? ('active' as const) : ('none' as const) };
        } else if (diffDays === 2 && srsMeta.streak_atual > 0) {
            return { streak: srsMeta.streak_atual, status: 'frozen' as const };
        } else {
            return { streak: 0, status: 'broken' as const };
        }
    }, [srsMeta]);

    // Deck SRS para cálculo de pendências no dashboard (query segregada para não poluir o cache completo do SRS)
    const { data: srsDeck = [] } = useQuery({
        queryKey: ['srs-dashboard-summary', userId],
        enabled: !!userId && !!srsMeta?.srs_habilitado,
        queryFn: async () => {
            const { data: progressoData } = await supabase
                .from('progresso_aluno')
                .select('aula_id')
                .eq('aluno_id', userId)
                .eq('aula_assistida', true);

            const idsArray = progressoData?.map(p => p.aula_id) || [];
            if (idsArray.length === 0) return [];

            const [dictResult, srsCardsResult] = await Promise.all([
                supabase.from('dicionario').select('id, tipo'),
                supabase.from('progresso_srs_cards').select('dicionario_id, due, reps, state, created_at').eq('aluno_id', userId)
            ]);

            if (dictResult.error) throw dictResult.error;
            if (srsCardsResult.error) throw srsCardsResult.error;

            const dictionary = dictResult.data || [];
            const srsCards = srsCardsResult.data || [];

            return dictionary.map(item => {
                const card = srsCards.find(c => c.dicionario_id === item.id);
                return { ...item, srsCard: card || undefined };
            });
        },
        staleTime: 1000 * 10, // 10 segundos de cache para sincronização rápida
    });

    const pendingCount = useMemo(() => {
        if (!srsDeck.length || !srsMeta) return 0;
        
        const nowMs = Date.now();
        const viradaHora = srsMeta.virada_hora ?? 1;
        const limiteNovas = srsMeta.limite_novas ?? 10;
        
        const tz = 'America/Sao_Paulo';
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            year: 'numeric', month: 'numeric', day: 'numeric',
            hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false
        });
        
        const getAdjustedLocalDayStr = (date: Date) => {
            const parts = formatter.formatToParts(date);
            const partMap: Record<string, string> = {};
            for (const part of parts) {
                partMap[part.type] = part.value;
            }
            const y = parseInt(partMap.year, 10);
            const m = parseInt(partMap.month, 10) - 1;
            const d = parseInt(partMap.day, 10);
            const h = parseInt(partMap.hour, 10);
            const min = parseInt(partMap.minute, 10);
            const s = parseInt(partMap.second, 10);
            
            const localDate = new Date(y, m, d, h, min, s);
            localDate.setHours(localDate.getHours() - viradaHora);
            
            const yyyy = localDate.getFullYear();
            const mm = String(localDate.getMonth() + 1).padStart(2, '0');
            const dd = String(localDate.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        };

        const todayStr = getAdjustedLocalDayStr(new Date());

        // 1. Novos introduzidos hoje
        const newCardsIntroducedTodayCount = srsDeck.filter(item => {
            if (!item.srsCard || !item.srsCard.created_at) return false;
            const createdDate = new Date(item.srsCard.created_at);
            const createdDayStr = getAdjustedLocalDayStr(createdDate);
            return createdDayStr === todayStr;
        }).length;

        const additionalNewCardsAllowed = Math.max(0, limiteNovas - newCardsIntroducedTodayCount);

        // 2. Filtragem de cards por tipo (sem filtro no dashboard principal, ou seja, Ambos)
        const learningCount = srsDeck.filter(item => {
            if (!item.srsCard) return false;
            if (item.srsCard.state !== 1 && item.srsCard.state !== 3) return false;
            const dueMs = new Date(item.srsCard.due).getTime();
            return dueMs <= nowMs + 10 * 60 * 1000;
        }).length;

        const reviewCount = srsDeck.filter(item => {
            if (!item.srsCard || item.srsCard.state !== 2) return false;
            const dueMs = new Date(item.srsCard.due).getTime();
            return dueMs <= nowMs;
        }).length;

        const newCountAvailable = srsDeck.filter(item => !item.srsCard || item.srsCard.state === 0).length;
        const newCount = Math.min(newCountAvailable, additionalNewCardsAllowed);

        return learningCount + reviewCount + newCount;
    }, [srsDeck, srsMeta]);


    // Estados do Modal da Aula e Auto-Save
    const [aulaSelecionada, setAulaSelecionada] = useState<AulaComProgresso | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [isScrolled, setIsScrolled] = useState(false);
    const [activeVideoIndex, setActiveVideoIndex] = useState(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Estados e Queries de Comentários
    const [novoComentario, setNovoComentario] = useState('');
    const [mostrarTodosComentarios, setMostrarTodosComentarios] = useState(false);

    const { data: comentariosAula, isLoading: isLoadingComentarios } = useQuery({
        queryKey: ['comentarios', aulaSelecionada?.id],
        enabled: !!aulaSelecionada?.id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('comentarios_aula')
                .select('id, texto, created_at, aluno_id, alunos(nome)')
                .eq('aula_id', aulaSelecionada?.id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data as unknown as ComentarioAula[];
        },
        staleTime: 1000 * 30, // 30 segundos (evita spam na navegação, mas abre fresco)
    });

    const addComentarioMutation = useMutation({
        mutationFn: async (texto: string) => {
            if (!aulaSelecionada || !userId) throw new Error("Faltam dados");
            const { data, error } = await supabase.from('comentarios_aula').insert({
                aula_id: aulaSelecionada.id,
                aluno_id: userId,
                texto
            }).select('id, texto, created_at, aluno_id, alunos(nome)').single();
            if (error) throw error;
            return data as unknown as ComentarioAula;
        },
        onSuccess: (novoComentarioCriado) => {
            setNovoComentario('');
            // update cache
            queryClient.setQueryData<ComentarioAula[] | undefined>(['comentarios', aulaSelecionada?.id], (old) => [novoComentarioCriado, ...(old || [])]);
        }
    });

    const deleteComentarioMutation = useMutation({
        mutationFn: async (comentarioId: string) => {
            const { error } = await supabase.from('comentarios_aula').delete().eq('id', comentarioId);
            if (error) throw error;
            return comentarioId;
        },
        onSuccess: (comentarioId) => {
            queryClient.setQueryData<ComentarioAula[] | undefined>(['comentarios', aulaSelecionada?.id], (old) => old?.filter((c) => c.id !== comentarioId));
        }
    });



    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pendingChangesRef = useRef<Record<string, Progresso>>({});
    const estadoOriginalRef = useRef<Record<string, AulaComProgresso>>({});

    // Garante salvamento ao sair do componente
    useEffect(() => {
        // Fazemos uma cópia segura da referência atual para a função de limpeza
        const pendenciasAtuais = pendingChangesRef.current;

        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            Object.keys(pendenciasAtuais).forEach(id => {
                upsertProgressoMutation.mutate({ aulaId: id, progressoParaSalvar: pendenciasAtuais[id], isSilencioso: true });
            });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ==========================================
    // MUTATIONS (Substituem funções manuais de Try/Catch)
    // ==========================================

    const upsertProgressoMutation = useMutation({
        mutationFn: async ({ aulaId, progressoParaSalvar, isSilencioso }: { aulaId: string, progressoParaSalvar: Progresso, isSilencioso?: boolean }) => {
            const { error } = await supabase.from('progresso_aluno').upsert({
                ...progressoParaSalvar, updated_at: new Date().toISOString()
            }, { onConflict: 'aluno_id, aula_id' });

            if (error) throw error;
            return { aulaId, isSilencioso };
        },
        onSuccess: ({ aulaId, isSilencioso }) => {
            delete pendingChangesRef.current[aulaId];
            delete estadoOriginalRef.current[aulaId];

            if (!isSilencioso) {
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus('idle'), 2500);
            }

            // Invalidação inteligente do cache do Dicionário e Atividades
            queryClient.invalidateQueries({ queryKey: ['dicionario', userId] });
            queryClient.invalidateQueries({ queryKey: ['atividades-aluno'] });
            queryClient.invalidateQueries({ queryKey: ['progresso-aluno-atividades', userId] });
            queryClient.invalidateQueries({ queryKey: ['progresso-aluno-atividades-guard', userId] });
        },
        onError: (error, variables) => {
            console.error("Erro de conexão ao salvar:", error);
            setSaveStatus('error');

            const aulaOriginal = estadoOriginalRef.current[variables.aulaId];
            if (aulaOriginal) {
                // ROLLBACK MÁGICO: Restaura o cache do TanStack Query
                queryClient.setQueryData<AulaComProgresso[]>(['aulas', userId], prev =>
                    prev?.map(a => a.id === variables.aulaId ? aulaOriginal : a) || []
                );
                setAulaSelecionada(prev => prev?.id === variables.aulaId ? aulaOriginal : prev);

                delete estadoOriginalRef.current[variables.aulaId];
                delete pendingChangesRef.current[variables.aulaId];

                alert("Aviso: Falha de conexão! Suas marcações recentes não puderam ser salvas e a tela retornará ao estado anterior.");
            }
        }
    });

    const handleProgressoChange = (aulaId: string, atualizacao: Partial<Progresso>, isSilencioso = false, delayMs = 1000) => {
        if (!userId) return;

        const aula = aulas.find(a => a.id === aulaId);
        if (!aula) return;

        if (!estadoOriginalRef.current[aulaId]) {
            estadoOriginalRef.current[aulaId] = { ...aula, progresso: aula.progresso ? { ...aula.progresso } : null };
        }

        const progressoAtual = pendingChangesRef.current[aulaId] || aula.progresso || {
            aluno_id: userId, aula_id: aulaId, status: 'Pendente',
            aula_assistida: false, tarefa_exercicios_concluida: false,
            tarefa_hanzi_concluida: false, tarefa_excecao_concluida: false
        };

        const novoProgresso = { ...progressoAtual, ...atualizacao };

        const totalTarefas = aula.is_excecao ? 2 : 3;
        let concluidas = 0;
        if (novoProgresso.aula_assistida) concluidas++;

        if (aula.is_excecao) {
            if (novoProgresso.tarefa_excecao_concluida) concluidas++;
        } else {
            if (novoProgresso.tarefa_exercicios_concluida) concluidas++;
            if (novoProgresso.tarefa_hanzi_concluida) concluidas++;
        }

        const statusAnterior = progressoAtual.status;
        novoProgresso.status = concluidas === totalTarefas ? 'Concluída' : (concluidas > 0 ? 'Em Andamento' : 'Pendente');

        if (!isSilencioso) {
            if ('aula_assistida' in atualizacao) {
                posthog.capture('lesson_watched_toggled', { lesson_id: aulaId, lesson_code: aula.codigo_aula, lesson_title: aula.titulo_descritivo, watched: novoProgresso.aula_assistida });
            } else if ('tarefa_exercicios_concluida' in atualizacao || 'tarefa_hanzi_concluida' in atualizacao || 'tarefa_excecao_concluida' in atualizacao) {
                const taskKey = Object.keys(atualizacao)[0];
                posthog.capture('lesson_task_toggled', { lesson_id: aulaId, lesson_code: aula.codigo_aula, lesson_title: aula.titulo_descritivo, task: taskKey, completed: atualizacao[taskKey as keyof Progresso] });
            }
            if (statusAnterior !== 'Concluída' && novoProgresso.status === 'Concluída') {
                posthog.capture('lesson_completed', { lesson_id: aulaId, lesson_code: aula.codigo_aula, lesson_title: aula.titulo_descritivo });
            }
        }

        // UPDATE OTIMISTA IMEDIATO NO CACHE (Atualiza a tela na hora)
        queryClient.setQueryData<AulaComProgresso[]>(['aulas', userId], old =>
            old?.map(a => a.id === aulaId ? { ...a, progresso: novoProgresso as Progresso } : a) || []
        );

        if (aulaSelecionada?.id === aulaId) {
            setAulaSelecionada({ ...aulaSelecionada, progresso: novoProgresso as Progresso });
        }

        pendingChangesRef.current[aulaId] = novoProgresso as Progresso;
        if (!isSilencioso) setSaveStatus('saving');

        // Dispara a Mutation com Debounce
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            upsertProgressoMutation.mutate({ aulaId, progressoParaSalvar: pendingChangesRef.current[aulaId], isSilencioso });
        }, delayMs);
    };

    const abrirModal = useCallback((aula: AulaComProgresso) => {
        setAulaSelecionada(aula);
        setMostrarTodosComentarios(false);
        setNovoComentario('');
        setSaveStatus('idle');
        setIsScrolled(false);
        setActiveVideoIndex(0);
        document.body.style.overflow = 'hidden';

        posthog.capture('lesson_opened', {
            lesson_id: aula.id, lesson_code: aula.codigo_aula, lesson_title: aula.titulo_descritivo, current_status: aula.progresso?.status || 'Pendente',
        });
    }, []);

    const handleScroll = () => {
        const container = scrollContainerRef.current;
        if (container) {
            setIsScrolled(container.scrollTop > 10);
        }
    };



    const fecharModal = () => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        if (aulaSelecionada && pendingChangesRef.current[aulaSelecionada.id]) {
            upsertProgressoMutation.mutate({ aulaId: aulaSelecionada.id, progressoParaSalvar: pendingChangesRef.current[aulaSelecionada.id], isSilencioso: true });
        }

        setAulaSelecionada(null);
        document.body.style.overflow = 'unset';
    };

    // ==========================================
    // MEMORIZAÇÃO DOS CÁLCULOS PESADOS
    // ==========================================
    const {
        aulasConcluidas, aulasEmAndamento, aulasNaoAssistidas,
        progressoAssistidas, progressoConcluidas, primeiroNome, aula004Assistida
    } = useMemo(() => {

        const concluidas = aulas.filter(a => getEstatisticas(a).isCompleta);

        const emAndamento = aulas.filter(a => {
            if (getEstatisticas(a).isCompleta) return false;
            return !!a.progresso?.aula_assistida;
        });

        const naoAssistidas = aulas.filter(a => {
            if (getEstatisticas(a).isCompleta) return false;
            return !a.progresso?.aula_assistida;
        });

        const assistidasCount = aulas.filter(a => a.progresso?.aula_assistida).length;
        const calcProgAssistidas = aulas.length > 0 ? Math.round((assistidasCount / aulas.length) * 100) : 0;
        const calcProgConcluidas = aulas.length > 0 ? Math.round((concluidas.length / aulas.length) * 100) : 0;

        return {
            aulasConcluidas: concluidas,
            aulasEmAndamento: emAndamento,
            aulasNaoAssistidas: naoAssistidas,
            progressoAssistidas: calcProgAssistidas,
            progressoConcluidas: calcProgConcluidas,
            primeiroNome: userName ? userName.split(' ')[0] : 'Aluno',
            aula004Assistida: aulas.find(a => a.codigo_aula === '004' || a.codigo_aula === '4')?.progresso?.aula_assistida
        };
    }, [aulas, userName]);

    // Histórico de aulas concluídas e em andamento (assistidas) combinadas, filtradas e ordenadas
    const aulasHistoricoFiltradas = useMemo(() => {
        let lista = [...aulasConcluidas, ...aulasEmAndamento];

        // Aplicar Filtro
        if (filtroHistorico === 'assistidas') {
            lista = lista.filter(a => !getEstatisticas(a).isCompleta);
        } else if (filtroHistorico === 'concluidas') {
            lista = lista.filter(a => getEstatisticas(a).isCompleta);
        }

        // Aplicar Ordenação por codigo_aula de forma natural (ex: "001", "002")
        lista.sort((a, b) => {
            const codigoA = a.codigo_aula || '';
            const codigoB = b.codigo_aula || '';
            const comparison = codigoA.localeCompare(codigoB, undefined, { numeric: true });
            return ordenacaoHistorico === 'crescente' ? comparison : -comparison;
        });

        return lista;
    }, [aulasConcluidas, aulasEmAndamento, filtroHistorico, ordenacaoHistorico]);


    const renderVerMais = (totalArrayLength: number, currentLimit: number, setLimitFunc: React.Dispatch<React.SetStateAction<number>>) => {
        if (totalArrayLength <= currentLimit) return null;
        return (
            <div className="mt-6 flex justify-center">
                <button
                    onClick={() => setLimitFunc(prev => prev + 6)}
                    className="bg-white border border-slate-200 hover:border-tcm-red text-slate-600 hover:text-tcm-red px-6 py-2.5 rounded-tcm-md text-sm font-semibold transition-tcm shadow-tcm-sm hover:shadow-tcm-md flex items-center gap-2 group"
                >
                    Ver mais aulas <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                </button>
            </div>
        );
    };

    if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-10 h-10 animate-spin text-tcm-red" /></div>;

    return (
        <div className="min-h-screen pb-20 font-sans pt-16 bg-slate-50">
            <SetNavbar
                title="Portal do Aluno"
            />

            <main className="max-w-5xl mx-auto px-4 mt-8 space-y-8">
                {/* ÁREA DE PROGRESSO */}
                <section className="bg-chinese-pattern rounded-tcm-xl p-6 sm:p-8 text-white shadow-tcm-lg relative overflow-hidden border border-tcm-darker-red">
                    <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/4 p-10 opacity-5 pointer-events-none">
                        <Image src="/favicon.webp" width={300} height={300} className="w-75 h-75 object-contain blur-[1px]" alt="BG" priority />
                    </div>

                    <div className="relative z-10 w-full">
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6 text-white drop-shadow-md">
                            {aula004Assistida ? '你好, ' : 'Olá, '} {primeiroNome}
                        </h1>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16">
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <h2 className="text-sm font-bold text-tcm-yellow uppercase tracking-widest">Aulas Assistidas</h2>
                                    <span className="text-xl font-bold text-white drop-shadow-sm">{progressoAssistidas}%</span>
                                </div>
                                <div className="w-full bg-tcm-darker-red rounded-full h-3 mb-3 overflow-hidden shadow-tcm-inner border border-tcm-dark-red">
                                    <div className="bg-tcm-yellow h-3 rounded-full transition-tcm duration-1000 shadow-[0_0_15px_rgba(244,200,107,0.6)]" style={{ width: `${progressoAssistidas}%` }} />
                                </div>
                                <p className="text-white/80 text-xs font-medium">
                                    Você assistiu <strong className="text-tcm-yellow drop-shadow-sm">{aulas.filter(a => a.progresso?.aula_assistida).length}</strong> de {aulas.length} aulas.
                                </p>
                            </div>

                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <h2 className="text-sm font-bold text-white uppercase tracking-widest drop-shadow-sm">Tarefas Concluídas</h2>
                                    <span className="text-xl font-bold text-white drop-shadow-sm">{progressoConcluidas}%</span>
                                </div>
                                <div className="w-full bg-tcm-darker-red rounded-full h-3 mb-3 overflow-hidden shadow-tcm-inner border border-tcm-dark-red">
                                    <div className="bg-white h-3 rounded-full transition-tcm duration-1000 shadow-[0_0_15px_rgba(255,255,255,0.5)]" style={{ width: `${progressoConcluidas}%` }} />
                                </div>
                                <p className="text-white/80 text-xs font-medium">
                                    Você finalizou <strong className="text-white drop-shadow-sm">{aulasConcluidas.length}</strong> de {aulas.length} tarefas.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {srsMeta?.srs_habilitado && (
                    <>
                        {streakInfo.status === 'frozen' ? (
                            <section className="bg-linear-to-r from-blue-500/10 to-indigo-500/10 border border-blue-200/40 rounded-tcm-xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-tcm-sm">
                                <div className="flex items-center gap-3.5">
                                    <div className="w-12 h-12 rounded-full bg-linear-to-tr from-blue-500 to-indigo-500 text-white flex items-center justify-center shadow-tcm-md animate-pulse">
                                        <Snowflake className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-extrabold text-slate-800 text-sm sm:text-base leading-tight">
                                            Ofensiva Congelada: {streakInfo.streak} {streakInfo.streak === 1 ? 'dia' : 'dias'}! ❄️
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Você não estudou ontem. Pratique hoje para salvar sua sequência (o congelamento dura apenas 1 dia)!
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => { posthog.capture('srs_widget_clicked'); router.push('/dashboard/dicionario/srs'); }}
                                    onMouseEnter={() => router.prefetch('/dashboard/dicionario/srs')}
                                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-linear-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-extrabold px-5 py-3 rounded-xl text-xs uppercase tracking-wider transition-all shadow-tcm-sm hover:shadow-tcm-md active:scale-98 cursor-pointer shrink-0"
                                >
                                    <Brain className="w-4 h-4" /> Praticar Flashcards
                                </button>
                            </section>
                        ) : (
                            <section className="bg-linear-to-r from-orange-500/10 to-amber-500/10 border border-orange-200/40 rounded-tcm-xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-tcm-sm">
                                <div className="flex items-center gap-3.5">
                                    <div className="w-12 h-12 rounded-full bg-linear-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-tcm-md animate-pulse">
                                        <Flame className="w-6 h-6 fill-current" />
                                    </div>
                                    <div>
                                        <h3 className="font-extrabold text-slate-800 text-sm sm:text-base leading-tight">
                                            {streakInfo.streak === 0 ? (
                                                'Comece sua Ofensiva!'
                                            ) : (
                                                `Ofensiva de Estudos: ${streakInfo.streak} ${streakInfo.streak === 1 ? 'dia' : 'dias'}!`
                                            )}
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {streakInfo.streak === 0 ? (
                                                'Estude seus flashcards hoje para iniciar uma sequência de dias!'
                                            ) : pendingCount > 0 ? (
                                                <>Você tem <strong className="text-tcm-red font-bold">{pendingCount} {pendingCount === 1 ? 'cartão' : 'cartões'}</strong> para estudar hoje.</>
                                            ) : (
                                                <>Excelente! Seus estudos de hoje estão 100% em dia.</>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => { posthog.capture('srs_widget_clicked'); router.push('/dashboard/dicionario/srs'); }}
                                    onMouseEnter={() => router.prefetch('/dashboard/dicionario/srs')}
                                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-linear-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold px-5 py-3 rounded-xl text-xs uppercase tracking-wider transition-all shadow-tcm-sm hover:shadow-tcm-md active:scale-98 cursor-pointer shrink-0"
                                >
                                    <Brain className="w-4 h-4" /> Praticar Flashcards
                                </button>
                            </section>
                        )}
                    </>
                )}

                {/* BOTÕES DE ACESSO RÁPIDO */}
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
                    {/* Dicionário Pessoal */}
                    <div 
                        onClick={() => { posthog.capture('dictionary_clicked'); router.push('/dashboard/dicionario'); }}
                        onMouseEnter={() => router.prefetch('/dashboard/dicionario')}
                        className="lg:col-span-2 flex items-center justify-between bg-white border-2 border-emerald-200 hover:border-emerald-400 rounded-tcm-lg py-3 px-4 shadow-tcm-sm hover:shadow-tcm-md transition-tcm group cursor-pointer"
                    >
                        <div className="flex items-center gap-4 text-left">
                            <div className="bg-emerald-50 p-2.5 rounded-tcm-md text-emerald-600 group-hover:scale-110 transition-transform">
                                <BookOpen className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <h2 className="text-base font-bold text-slate-800 leading-tight">Dicionário Pessoal</h2>
                                <p className="text-xs text-slate-500 hidden sm:block mt-0.5">Consulte o vocabulário das aulas liberadas.</p>
                                <p className="text-xs text-slate-500 sm:hidden mt-0.5">Vocabulário liberado</p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors shrink-0 ml-2" />
                    </div>

                    {/* Simulador de Diálogos */}
                    <div
                        onClick={() => {
                            posthog.capture('simulator_clicked');
                            router.push('/dashboard/simulador');
                        }}
                        onMouseEnter={() => router.prefetch('/dashboard/simulador')}
                        className="lg:col-span-2 flex items-center justify-between bg-white border-2 border-purple-200 hover:border-purple-400 rounded-tcm-lg py-3 px-4 shadow-tcm-sm hover:shadow-tcm-md transition-tcm group cursor-pointer"
                    >
                        <div className="flex items-center gap-4 text-left">
                            <div className="bg-purple-50 p-2.5 rounded-tcm-md text-purple-600 group-hover:scale-110 transition-transform">
                                <MessageCircle className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <h2 className="text-base font-bold text-slate-800 leading-tight">Simulador de Diálogos</h2>
                                <p className="text-xs text-slate-500 hidden sm:block mt-0.5">Pratique conversação em situações reais.</p>
                                <p className="text-xs text-slate-500 sm:hidden mt-0.5">Prática de conversação</p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-purple-500 transition-colors shrink-0 ml-2" />
                    </div>

                    {/* Atividades e Provas */}
                    <div
                        onClick={() => {
                            posthog.capture('activities_clicked');
                            router.push('/dashboard/atividades');
                        }}
                        onMouseEnter={() => router.prefetch('/dashboard/atividades')}
                        className="lg:col-span-2 flex items-center justify-between bg-white border-2 border-rose-200 hover:border-rose-400 rounded-tcm-lg py-3 px-4 shadow-tcm-sm hover:shadow-tcm-md transition-tcm group cursor-pointer"
                    >
                        <div className="flex items-center gap-4 text-left">
                            <div className="bg-rose-50 p-2.5 rounded-tcm-md text-rose-600 group-hover:scale-110 transition-transform">
                                <PencilLine className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <h2 className="text-base font-bold text-slate-800 leading-tight">Atividades</h2>
                                <p className="text-xs text-slate-500 hidden sm:block mt-0.5">Exercícios práticos e avaliações do curso.</p>
                                <p className="text-xs text-slate-500 sm:hidden mt-0.5">Exercícios e avaliações</p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-rose-500 transition-colors shrink-0 ml-2" />
                    </div>

                    {/* Treino com Flashcards */}
                    {!srsMeta?.srs_habilitado && (
                        <div 
                            onClick={() => { posthog.capture('srs_clicked'); router.push('/dashboard/dicionario/srs'); }}
                            onMouseEnter={() => router.prefetch('/dashboard/dicionario/srs')}
                            className="lg:col-span-2 flex items-center justify-between bg-white border-2 border-orange-200 hover:border-orange-400 rounded-tcm-lg py-3 px-4 shadow-tcm-sm hover:shadow-tcm-md transition-tcm group cursor-pointer"
                        >
                            <div className="flex items-center gap-4 text-left">
                                <div className="bg-orange-50 p-2.5 rounded-tcm-md text-orange-600 group-hover:scale-110 transition-transform">
                                    <Brain className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <h2 className="text-base font-bold text-slate-800 leading-tight">Treino com Flashcards</h2>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Ative a memorização espaçada (SRS)
                                    </p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-orange-500 transition-colors shrink-0 ml-2" />
                        </div>
                    )}

                    {/* Botão direto para a Biblioteca */}
                    <div
                        onClick={() => {
                            posthog.capture('biblioteca_clicked');
                            router.push('/dashboard/biblioteca');
                        }}
                        onMouseEnter={() => router.prefetch('/dashboard/biblioteca')}
                        className={`lg:col-span-2 ${srsMeta?.srs_habilitado ? 'lg:col-start-2' : ''} flex items-center justify-between bg-white border-2 border-amber-200 hover:border-amber-400 rounded-tcm-lg py-3 px-4 shadow-tcm-sm hover:shadow-tcm-md transition-tcm group cursor-pointer`}
                    >
                        <div className="flex items-center gap-4 text-left">
                            <div className="bg-amber-50 p-2.5 rounded-tcm-md text-amber-600 group-hover:scale-110 transition-transform">
                                <Library className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <h2 className="text-base font-bold text-slate-800 leading-tight">Biblioteca</h2>
                                <p className="text-xs text-slate-500 hidden sm:block mt-0.5">Artigos, materiais, dicas e conteúdos extras.</p>
                                <p className="text-xs text-slate-500 sm:hidden mt-0.5">Materiais e artigos</p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-amber-500 transition-colors shrink-0 ml-2" />
                    </div>

                    <div
                        onClick={() => {
                            posthog.capture('live_class_clicked');
                            router.push('/demo/aula-ao-vivo');
                        }}
                        onMouseEnter={() => router.prefetch('/demo/aula-ao-vivo')}
                        className={`lg:col-span-2 ${srsMeta?.srs_habilitado ? 'sm:col-span-2 lg:col-span-2' : ''} flex items-center justify-between bg-white border-2 border-blue-200 hover:border-blue-400 rounded-tcm-lg py-3 px-4 shadow-tcm-sm hover:shadow-tcm-md transition-tcm group cursor-pointer`}
                    >
                        <div className="flex items-center gap-4 text-left">
                            <div className="bg-blue-50 p-2.5 rounded-tcm-md text-blue-600 group-hover:scale-110 transition-transform"><Video className="w-5 h-5" /></div>
                            <div className="text-left">
                                <h2 className="text-base font-bold text-slate-800 leading-tight">Aula Ao Vivo</h2>
                                <p className="text-xs text-slate-500 hidden sm:block mt-0.5">Acesso no horário divulgado no grupo.</p>
                                <p className="text-xs text-slate-500 sm:hidden mt-0.5">Acesso no horário divulgado</p>
                            </div>
                        </div>
                        <ExternalLink className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors shrink-0 ml-2" />
                    </div>
                </section>

                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-tcm-red flex items-center gap-2 tracking-tight">
                            <PlayCircle className="w-6 h-6 text-tcm-red" /> Para Assistir
                        </h2>
                        {paraAssistirExpandido && aulasNaoAssistidas.length > 3 && (
                            <button
                                onClick={() => setParaAssistirExpandido(false)}
                                className="text-xs font-semibold text-tcm-red hover:underline flex items-center gap-1 cursor-pointer"
                            >
                                Recolher pilha
                            </button>
                        )}
                    </div>
                    {aulasNaoAssistidas.length === 0 ? (
                        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center shadow-sm flex flex-col items-center justify-center gap-3">
                            <p className="text-slate-600 font-medium">Nenhuma aula nova por enquanto. Você está em dia!</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 pt-2">
                                {!paraAssistirExpandido && aulasNaoAssistidas.length > 3 ? (
                                    <>
                                        {aulasNaoAssistidas.slice(0, 2).map(aula => (
                                            <MiniCard key={aula.id} aula={aula} onOpenModal={abrirModal} />
                                        ))}
                                        <CardPilha 
                                            aula={aulasNaoAssistidas[2]} 
                                            totalRestantes={aulasNaoAssistidas.length - 3} 
                                            onClick={() => setParaAssistirExpandido(true)} 
                                        />
                                    </>
                                ) : (
                                    <>
                                        {aulasNaoAssistidas.slice(0, limiteNaoAssistidas).map(aula => (
                                            <MiniCard key={aula.id} aula={aula} onOpenModal={abrirModal} />
                                        ))}
                                    </>
                                )}
                            </div>
                            {/* Só exibe o Ver Mais se estiver expandido (ou se o total for <= 3) e houver mais itens */}
                            {(paraAssistirExpandido || aulasNaoAssistidas.length <= 3) && 
                                renderVerMais(aulasNaoAssistidas.length, limiteNaoAssistidas, setLimiteNaoAssistidas)}
                        </>
                    )}
                </section>

                {/* Só renderiza o histórico se houver aulas assistidas ou concluídas */}
                {(aulasConcluidas.length + aulasEmAndamento.length) > 0 && (
                    <section className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-3">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 tracking-tight">
                                <Award className="w-6 h-6 text-tcm-red" /> Aulas Assistidas ou Concluídas
                            </h2>
                            
                            {/* Controles de Filtro e Ordenação */}
                            <div className="flex items-center gap-2 w-full sm:w-auto text-xs font-semibold">
                                {/* Pills de Filtro */}
                                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-medium flex-1 sm:flex-initial justify-between sm:justify-start">
                                    <button
                                        onClick={() => setFiltroHistorico('todas')}
                                        className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-md transition-all cursor-pointer text-center ${filtroHistorico === 'todas' ? 'bg-white text-tcm-red shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                                    >
                                        Todas
                                    </button>
                                    <button
                                        onClick={() => setFiltroHistorico('assistidas')}
                                        className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-md transition-all cursor-pointer text-center ${filtroHistorico === 'assistidas' ? 'bg-white text-tcm-red shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                                    >
                                        Assistidas
                                    </button>
                                    <button
                                        onClick={() => setFiltroHistorico('concluidas')}
                                        className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-md transition-all cursor-pointer text-center ${filtroHistorico === 'concluidas' ? 'bg-white text-tcm-red shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                                    >
                                        Concluídas
                                    </button>
                                </div>
                                
                                {/* Botão de Ordenação */}
                                <button
                                    onClick={() => setOrdenacaoHistorico(prev => prev === 'crescente' ? 'decrescente' : 'crescente')}
                                    className="flex items-center justify-center gap-1 bg-white border border-slate-200 hover:border-tcm-red text-slate-600 hover:text-tcm-red px-2.5 py-2 rounded-lg transition-tcm shadow-tcm-sm cursor-pointer shrink-0"
                                >
                                    {ordenacaoHistorico === 'decrescente' ? (
                                        <>
                                            <span>Novas</span>
                                            <ChevronDown className="w-3.5 h-3.5" />
                                        </>
                                    ) : (
                                        <>
                                            <span>Antigas</span>
                                            <ChevronRight className="w-3.5 h-3.5 -rotate-90" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {aulasHistoricoFiltradas.length === 0 ? (
                            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm flex flex-col items-center justify-center gap-3">
                                <p className="text-slate-500 font-medium">Nenhuma aula encontrada para o filtro selecionado.</p>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {aulasHistoricoFiltradas.slice(0, limiteHistorico).map(aula => (
                                        <CompactCard key={aula.id} aula={aula} onOpenModal={abrirModal} />
                                    ))}
                                </div>
                                {renderVerMais(aulasHistoricoFiltradas.length, limiteHistorico, setLimiteHistorico)}
                            </>
                        )}
                    </section>
                )}
            </main>



            {/* MODAL MÁGICO DA AULA COM ANIMAÇÕES PREMIUM E DRAG-TO-CLOSE */}
            <AnimatePresence>
                {aulaSelecionada && (
                    <>
                        {/* Backdrop com desfoque e fade-in em Vermelho Imperial Profundo */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="fixed inset-0 z-60 bg-[#1a0505]/80 backdrop-blur"
                            onClick={fecharModal}
                        />

                        {/* Modal/Drawer com física de mola e suporte a arraste */}
                        <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center sm:p-4 pointer-events-none">
                            <motion.div
                                drag="y"
                                dragConstraints={{ top: 0, bottom: 0 }}
                                dragElastic={0.6}
                                dragMomentum={false}
                                dragTransition={{ bounceStiffness: 600, bounceDamping: 30 }}
                                onDragEnd={(_, info) => {
                                    // Se arrastar para baixo mais de 100px ou com velocidade alta, fecha
                                    if (info.offset.y > 100 || info.velocity.y > 400) {
                                        fecharModal();
                                    }
                                }}
                                initial={{ y: "100%" }}
                                animate={{ y: 0 }}
                                exit={{ y: "100%" }}
                                transition={{
                                    type: "spring",
                                    damping: 30,
                                    stiffness: 300,
                                    mass: 0.8
                                }}
                                className="bg-white rounded-t-[2.5rem] sm:rounded-tcm-xl w-full sm:max-w-lg shadow-tcm-lg overflow-hidden flex flex-col h-[85dvh] sm:h-auto sm:max-h-[90dvh] pointer-events-auto"

                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Barra de Interação (Handle) - Funciona como gatilho visual e de arraste */}
                                <div className="sm:hidden flex flex-col items-center py-3 shrink-0 cursor-grab active:cursor-grabbing">
                                    <div className="w-12 h-1.5 bg-slate-200 rounded-full mb-1" />
                                </div>

                                {/* Cabeçalho - Mantido Sticky para acesso fácil aos controles de fechar e status */}
                                <div className={`p-5 sm:p-6 border-b border-slate-100 flex justify-between items-center shrink-0 bg-white/95 backdrop-blur-sm sticky top-0 z-20 transition-all duration-300 ${isScrolled ? 'shadow-lg shadow-slate-200/50' : ''}`}>

                                    <div>
                                        <span className="text-tcm-red font-bold text-xs sm:text-sm tracking-widest uppercase flex items-center gap-2">
                                            Aula {aulaSelecionada.codigo_aula}
                                            {aulaSelecionada.codigo_licao && (<><span className="w-1 h-1 bg-tcm-red rounded-full"></span> Lição {aulaSelecionada.codigo_licao}</>)}
                                        </span>
                                        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 tracking-tight leading-tight line-clamp-1">{aulaSelecionada.titulo_descritivo}</h2>
                                    </div>
                                    <div className="flex items-center gap-4 pl-2">
                                        <div className="text-xs font-medium flex items-center gap-1.5 whitespace-nowrap">
                                            {saveStatus === 'saving' && (<span className="text-tcm-yellow flex items-center gap-1 animate-pulse"><Loader2 className="w-3.5 h-3.5 animate-spin" /> <span className="hidden sm:inline">Salvando...</span></span>)}
                                            {saveStatus === 'saved' && (<span className="text-emerald-500 flex items-center gap-1"><Cloud className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Salvo</span></span>)}
                                            {saveStatus === 'error' && (<span className="text-red-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Erro</span></span>)}
                                        </div>
                                        <button onClick={fecharModal} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"><X className="w-6 h-6" /></button>
                                    </div>
                                </div>

                                {/* Container Único para Scroll do Vídeo e do Conteúdo - Resolve o "Vídeo Fixo" e esconde scrollbar */}
                                <div
                                    ref={scrollContainerRef}
                                    onScroll={handleScroll}
                                    className="flex-1 overflow-y-auto no-scrollbar relative scroll-smooth"
                                >


                                    {aulaSelecionada.videos && aulaSelecionada.videos.length > 0 && (
                                        <div className="shrink-0 border-b border-slate-100/50">
                                            {(() => {
                                                const currentVideo = aulaSelecionada.videos[activeVideoIndex];
                                                if (!currentVideo || !currentVideo.url) return null;
                                                const videoId = getYouTubeId(currentVideo.url);
                                                return videoId ? (
                                                    <div className="flex flex-col">
                                                        <YouTubePlayer
                                                            videoId={videoId}
                                                            aulaId={aulaSelecionada.id}
                                                            videoUrl={currentVideo.url}
                                                        />
                                                        {aulaSelecionada.videos.length > 1 && (
                                                            <div className="p-4 bg-slate-50 border-t border-slate-100">
                                                                <div className="flex flex-wrap gap-2">
                                                                    {aulaSelecionada.videos.map((vid, idx) => (
                                                                        <button
                                                                            key={idx}
                                                                            onClick={() => setActiveVideoIndex(idx)}
                                                                            className={`px-3 py-1.5 rounded-tcm-sm text-sm font-medium transition-tcm ${activeVideoIndex === idx
                                                                                    ? 'bg-tcm-red text-white shadow-tcm-sm'
                                                                                    : 'bg-white text-slate-600 border border-slate-200 hover:border-tcm-red/50 hover:text-tcm-red'
                                                                                }`}
                                                                        >
                                                                            Parte {idx + 1}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : null;
                                            })()}
                                        </div>
                                    )}

                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-5 sm:p-6 space-y-6"
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 px-1">

                                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recursos</h4>
                                            </div>

                                            <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2 sm:gap-3">
                                                {aulaSelecionada.link_material && (
                                                    <a href={aulaSelecionada.link_material} target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between px-3 sm:px-4 py-3 bg-tcm-red hover:bg-tcm-dark-red text-white rounded-tcm-md transition-tcm shadow-tcm-sm hover:shadow-tcm-md border-l-4 border-tcm-yellow/40 hover:border-tcm-yellow">
                                                        <div className="flex items-center gap-2 sm:gap-3 transition-transform duration-300 group-hover:translate-x-1">
                                                            <div className="w-5 sm:w-6 flex justify-center"><BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-tcm-yellow drop-shadow-sm" /></div>
                                                            <span className="font-bold tracking-wide text-xs sm:text-[15px] whitespace-nowrap">Materiais</span>
                                                        </div>
                                                        <div className="bg-white/10 p-1.5 rounded-tcm-sm group-hover:bg-white/20 transition-colors">
                                                            <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-tcm-yellow" />
                                                        </div>
                                                    </a>
                                                )}
                                                {aulaSelecionada.link_tarefa && (
                                                    <a href={aulaSelecionada.link_tarefa} target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between px-3 sm:px-4 py-3 bg-tcm-red hover:bg-tcm-dark-red text-white rounded-tcm-md transition-tcm shadow-tcm-sm hover:shadow-tcm-md border-l-4 border-tcm-yellow/40 hover:border-tcm-yellow">
                                                        <div className="flex items-center gap-2 sm:gap-3 transition-transform duration-300 group-hover:translate-x-1">
                                                            <div className="w-5 sm:w-6 flex justify-center"><PencilLine className="w-5 h-5 sm:w-6 sm:h-6 text-tcm-yellow drop-shadow-sm" /></div>
                                                            <span className="font-bold tracking-wide text-xs sm:text-[15px] whitespace-nowrap">Tarefa</span>
                                                        </div>
                                                        <div className="bg-white/10 p-1.5 rounded-tcm-sm group-hover:bg-white/20 transition-colors">
                                                            <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-tcm-yellow" />
                                                        </div>
                                                    </a>
                                                )}
                                            </div>

                                            {/* LINKS ADICIONAIS SECUNDÁRIOS CORINGA (MENOS ALTOS E ABAIXO) */}
                                            {aulaSelecionada.links_adicionais && aulaSelecionada.links_adicionais.length > 0 && (
                                                <div className="pt-3 space-y-2">
                                                    <h5 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1">Links Adicionais</h5>
                                                    <div className="flex flex-wrap gap-2">
                                                        {aulaSelecionada.links_adicionais.map((link, idx) => (
                                                            <a
                                                                key={idx}
                                                                href={link.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-red-50 text-slate-750 hover:text-tcm-red border border-slate-200 hover:border-tcm-red/20 rounded-tcm-md text-xs font-semibold transition-tcm shadow-tcm-sm group cursor-pointer"
                                                            >
                                                                <Library className="w-3.5 h-3.5 text-slate-400 group-hover:text-tcm-red transition-colors shrink-0" />
                                                                <span>{link.titulo || 'Link adicional'}</span>
                                                                <ExternalLink className="w-3 h-3 text-slate-450 group-hover:text-tcm-red transition-colors shrink-0 ml-0.5" />
                                                            </a>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}


                                        </div>




                                        {/* SEÇÃO: COMENTÁRIOS */}
                                        {aulaSelecionada.comentarios && (
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 px-1">
                                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Comentários do Lǎoshī</h4>
                                                </div>

                                                <div className="bg-amber-50/50 border-l-4 border-amber-200 p-4 rounded-r-tcm-md text-amber-900 text-sm italic">
                                                    {/<[a-z][\s\S]*>/i.test(aulaSelecionada.comentarios) ? (
                                                        <div 
                                                            className="prose prose-slate max-w-none text-sm text-amber-950 leading-relaxed font-normal [&_a]:text-indigo-600 [&_a]:underline" 
                                                            dangerouslySetInnerHTML={{ __html: aulaSelecionada.comentarios }} 
                                                        />
                                                    ) : (
                                                        <p className="whitespace-pre-wrap">{aulaSelecionada.comentarios}</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* SEÇÃO: CHECKLIST */}
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-2 px-1">

                                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Checklist de Progresso</h4>
                                            </div>


                                            <div className="space-y-2">
                                                <button onClick={() => handleProgressoChange(aulaSelecionada.id, { aula_assistida: !aulaSelecionada.progresso?.aula_assistida })} className="w-full flex items-center gap-3 p-3 sm:p-4 rounded-tcm-md bg-white border border-slate-200 hover:border-tcm-yellow/50 shadow-tcm-sm transition-tcm text-left group">
                                                    {aulaSelecionada.progresso?.aula_assistida ? <CheckCircle2 className="w-6 h-6 text-tcm-red shrink-0" /> : <Circle className="w-6 h-6 text-slate-300 shrink-0 group-hover:text-tcm-yellow" />}
                                                    <span className={`font-medium text-sm sm:text-[15px] ${aulaSelecionada.progresso?.aula_assistida ? 'text-slate-900' : 'text-slate-500'}`}>Assisti a aula</span>
                                                </button>

                                                {aulaSelecionada.is_excecao ? (
                                                    <button onClick={() => handleProgressoChange(aulaSelecionada.id, { tarefa_excecao_concluida: !aulaSelecionada.progresso?.tarefa_excecao_concluida })} className="w-full flex items-center gap-3 p-3 sm:p-4 rounded-tcm-md bg-white border border-slate-200 hover:border-tcm-yellow/50 shadow-tcm-sm transition-tcm text-left group">
                                                        {aulaSelecionada.progresso?.tarefa_excecao_concluida ? <CheckCircle2 className="w-6 h-6 text-tcm-red shrink-0" /> : <Circle className="w-6 h-6 text-slate-300 shrink-0 group-hover:text-tcm-yellow" />}
                                                        <span className={`font-medium text-sm sm:text-[15px] ${aulaSelecionada.progresso?.tarefa_excecao_concluida ? 'text-slate-900' : 'text-slate-500'}`}>Fiz a tarefa</span>
                                                    </button>
                                                ) : (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        <button onClick={() => handleProgressoChange(aulaSelecionada.id, { tarefa_exercicios_concluida: !aulaSelecionada.progresso?.tarefa_exercicios_concluida })} className="w-full flex items-center gap-3 p-3 sm:p-4 rounded-tcm-md bg-white border border-slate-200 hover:border-tcm-yellow/50 shadow-tcm-sm transition-tcm text-left group">
                                                            {aulaSelecionada.progresso?.tarefa_exercicios_concluida ? <CheckCircle2 className="w-6 h-6 text-tcm-red shrink-0" /> : <Circle className="w-6 h-6 text-slate-300 shrink-0 group-hover:text-tcm-yellow" />}
                                                            <div className="flex flex-col min-w-0">
                                                                <span className={`font-medium text-sm sm:text-[15px] ${aulaSelecionada.progresso?.tarefa_exercicios_concluida ? 'text-slate-900' : 'text-slate-500'}`}>Fiz os Exercícios</span>
                                                                <span className="text-[11px] sm:text-xs text-slate-400 font-normal leading-tight">Disponíveis na tarefa</span>
                                                            </div>
                                                        </button>
                                                        <button onClick={() => handleProgressoChange(aulaSelecionada.id, { tarefa_hanzi_concluida: !aulaSelecionada.progresso?.tarefa_hanzi_concluida })} className="w-full flex items-center gap-3 p-3 sm:p-4 rounded-tcm-md bg-white border border-slate-200 hover:border-tcm-yellow/50 shadow-tcm-sm transition-tcm text-left group">
                                                            {aulaSelecionada.progresso?.tarefa_hanzi_concluida ? <CheckCircle2 className="w-6 h-6 text-tcm-red shrink-0" /> : <Circle className="w-6 h-6 text-slate-300 shrink-0 group-hover:text-tcm-yellow" />}
                                                            <div className="flex flex-col min-w-0">
                                                                <span className={`font-medium text-sm sm:text-[15px] ${aulaSelecionada.progresso?.tarefa_hanzi_concluida ? 'text-slate-900' : 'text-slate-500'}`}>Escrevi os Hanzi (10x)</span>
                                                                <span className="text-[11px] sm:text-xs text-slate-400 font-normal leading-tight">Oficiais da aula, na tarefa</span>
                                                            </div>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>




                                        {/* SEÇÃO: COMENTÁRIOS DOS ALUNOS */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 px-1">
                                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Comentários</h4>
                                            </div>

                                            {/* Input novo comentário */}
                                            <div className="relative flex flex-col gap-2">
                                                <textarea
                                                    value={novoComentario}
                                                    onChange={(e) => setNovoComentario(e.target.value)}
                                                    maxLength={500}
                                                    placeholder="Deixe um comentário sobre esta aula..."
                                                    className="w-full p-3 text-sm rounded-tcm-md border border-slate-200 bg-white focus:bg-white focus:ring-2 focus:ring-tcm-red/20 focus:border-tcm-red/30 outline-none min-h-20 resize-none transition-tcm shadow-tcm-sm"
                                                />
                                                <div className="flex justify-between items-center px-1">
                                                    <span className="text-[10px] font-bold text-slate-400">{novoComentario.length}/500</span>
                                                    <button
                                                        onClick={() => novoComentario.trim() && addComentarioMutation.mutate(novoComentario.trim())}
                                                        disabled={!novoComentario.trim() || addComentarioMutation.isPending}
                                                        className="flex items-center gap-1.5 bg-tcm-red hover:bg-tcm-dark-red text-white px-4 py-1.5 rounded-tcm-sm text-xs font-bold transition-tcm disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {addComentarioMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                                        Enviar
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Lista de Comentários */}
                                            {isLoadingComentarios ? (
                                                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
                                            ) : comentariosAula && comentariosAula.length > 0 ? (
                                                <div className="space-y-3 mt-4">
                                                    {comentariosAula.slice(0, mostrarTodosComentarios ? undefined : 3).map(comentario => (
                                                        <div key={comentario.id} className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col gap-1.5 group relative">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-xs font-bold text-slate-700">
                                                                    {comentario.alunos?.nome ? comentario.alunos.nome.split(' ')[0] : 'Aluno'}
                                                                </span>
                                                                {comentario.aluno_id === userId && (
                                                                    <button
                                                                        onClick={() => {
                                                                            if (window.confirm("Deseja realmente apagar este comentário?")) {
                                                                                deleteComentarioMutation.mutate(comentario.id);
                                                                            }
                                                                        }}
                                                                        disabled={deleteComentarioMutation.isPending}
                                                                        className="text-slate-300 hover:text-red-500 transition-colors opacity-0 sm:opacity-0 sm:group-hover:opacity-100 disabled:opacity-50"
                                                                        title="Apagar comentário"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-slate-600 whitespace-pre-wrap">{comentario.texto}</p>
                                                        </div>
                                                    ))}

                                                    {comentariosAula.length > 3 && !mostrarTodosComentarios && (
                                                        <button
                                                            onClick={() => setMostrarTodosComentarios(true)}
                                                            className="w-full text-xs font-semibold text-tcm-red hover:text-tcm-dark-red py-2 transition-colors cursor-pointer"
                                                        >
                                                            Ver mais {comentariosAula.length - 3} comentários
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-400 text-center py-2">Seja o primeiro a comentar nesta aula!</p>
                                            )}
                                        </div>


                                    </motion.div>
                                </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}