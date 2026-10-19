'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { 
    Brain, Settings, Play, 
    ChevronDown, AlertTriangle, Loader2, Calendar, X, Snowflake
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import posthog from 'posthog-js';

import SetNavbar from '../../../components/SetNavbar';
import RecursoBloqueado from '../../../components/RecursoBloqueado';
import SrsOnboarding from './components/SrsOnboarding';
import SrsHeatmap from './components/SrsHeatmap';
import SrsSession from './components/SrsSession';
import SrsStatsContent from './components/SrsStatsContent';
import { updateSrsPreferencesAction, toggleSrsOptInAction } from '../../../actions/srs-actions';
import { applyDemoServerPayloads } from '@/lib/demo/supabaseSandbox';

// ==========================================
// TIPAGENS
// ==========================================
type DicionarioItem = {
    id: string;
    aula_id: string;
    tipo: 'Palavra' | 'Frase';
    licao_oficial_id: string | null;
    hanzi_simp: string;
    hanzi_trad: string | null;
    pinyin: string;
    traducao: string;
    explicacao: string | null;
    curiosidade: string | null;
    exemplos: string | null;
    som: string | null;
};

type SrsCard = {
    id: string;
    aluno_id: string;
    dicionario_id: string;
    due: string;
    stability: number;
    difficulty: number;
    elapsed_days: number;
    scheduled_days: number;
    reps: number;
    lapses: number;
    learning_steps: number;
    state: number;
    last_review: string | null;
    created_at?: string;
};

type StudyItem = DicionarioItem & {
    srsCard?: SrsCard;
    aula_codigo?: string;
};

function getDaysSinceEpoch(dayStr: string): number {
    if (!dayStr) return 0;
    const parts = dayStr.split('-');
    if (parts.length !== 3) return 0;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return Math.floor(Date.UTC(y, m, d) / (1000 * 60 * 60 * 24));
}

const SAO_PAULO_FORMATTER = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
});

export default function SrsDashboard() {
    const supabase = createClientComponentClient();
    const router = useRouter();
    const queryClient = useQueryClient();

    // Estados locais de UI
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'stats' | 'settings'>('stats');
    const [filtroSessao, setFiltroSessao] = useState<'Ambos' | 'Palavras' | 'Frases'>('Ambos');
    const [activeSessionDeck, setActiveSessionDeck] = useState<StudyItem[] | null>(null);
    const [sessionError, setSessionError] = useState<string | null>(null);
    const [isPausing, setIsPausing] = useState(false);

    const handlePauseSrs = async () => {
        if (confirm('Deseja realmente pausar o uso do SRS (FSRS)? Isso ocultará os flashcards do seu painel principal e do menu. Seu progresso não será perdido e você poderá reativar quando quiser.')) {
            setIsPausing(true);
            try {
                const result = await toggleSrsOptInAction(false);
                if (result.error) {
                    alert(result.error);
                } else {
                    if (result.demoPayloads) applyDemoServerPayloads(result.demoPayloads);
                    queryClient.invalidateQueries({ queryKey: ['srs-meta', userId] });
                    queryClient.invalidateQueries({ queryKey: ['srs-deck', userId] });
                    queryClient.invalidateQueries({ queryKey: ['srs-dashboard-summary', userId] });
                    router.push('/dashboard');
                }
            } catch (err) {
                console.error(err);
                alert('Erro ao pausar o SRS. Tente novamente.');
            } finally {
                setIsPausing(false);
            }
        }
    };

    // ==========================================
    // QUERIES DO TANSTACK
    // ==========================================
    const { data: sessionData, isLoading: isLoadingSession } = useQuery({
        queryKey: ['user-session'],
        queryFn: async () => {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error || !user) {
                router.push('/login');
                throw new Error('Não autenticado');
            }
            return { user };
        },
        staleTime: Infinity,
    });

    const userId = sessionData?.user?.id;

    // Metadados SRS
    const { data: srsMeta, isLoading: isLoadingMeta } = useQuery({
        queryKey: ['srs-meta', userId],
        enabled: !!userId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('progresso_srs_meta')
                .select('*')
                .eq('aluno_id', userId)
                .single();
            
            if (error && error.code !== 'PGRST116') throw error; // Ignora se não houver linha criada ainda
            return data || null;
        },
        staleTime: 1000 * 10, // 10 segundos
        placeholderData: (previousData) => previousData,
    });

    // Heatmap / Diário
    const { data: diarioData = [], isLoading: isLoadingDiario } = useQuery({
        queryKey: ['srs-diario', userId],
        enabled: !!userId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('progresso_srs_diario')
                .select('*')
                .eq('aluno_id', userId)
                .order('data', { ascending: true });
            
            if (error) throw error;
            return data || [];
        },
        staleTime: 1000 * 10, // 10 segundos
        placeholderData: (previousData) => previousData,
    });

    // Deck Completo (Dicionário Liberado + Cards SRS existentes)
    const { data: srsDeck = [], isLoading: isLoadingDeck } = useQuery({
        queryKey: ['srs-deck', userId],
        enabled: !!userId,
        queryFn: async () => {
            // 1. Reutiliza ou antecipa progresso de aulas assistidas sem disparar query duplicada
            const progressoData = await queryClient.ensureQueryData<{ aula_id: string }[]>({
                queryKey: ['aulas-assistidas-count', userId],
                queryFn: async () => {
                    const { data, error } = await supabase
                        .from('progresso_aluno')
                        .select('aula_id')
                        .eq('aluno_id', userId)
                        .eq('aula_assistida', true);
                    if (error) throw error;
                    return data || [];
                },
                staleTime: 1000 * 60 * 5,
            });

            const idsArray = progressoData?.map(p => p.aula_id) || [];
            if (idsArray.length === 0) return [];

            // 2. Busca termos do dicionário dessas aulas e o progresso SRS correspondente
            const orQuery = `aula_id.in.(${idsArray.join(',')}),licao_oficial_id.in.(${idsArray.join(',')})`;
            
            const [dictResult, srsCardsResult, aulasResult] = await Promise.all([
                supabase.from('dicionario').select('*').or(orQuery),
                supabase.from('progresso_srs_cards').select('*').eq('aluno_id', userId),
                supabase.from('aulas').select('id, codigo_aula')
            ]);

            if (dictResult.error) throw dictResult.error;
            if (srsCardsResult.error) throw srsCardsResult.error;
            if (aulasResult.error) throw aulasResult.error;

            const dictionary = dictResult.data || [];
            const srsCards = srsCardsResult.data || [];
            const aulasList = aulasResult.data || [];

            // Mapeamentos O(1) para evitar busca quadrática em decks grandes
            const srsCardsMap = new Map<string, SrsCard>();
            srsCards.forEach(c => {
                if (c.dicionario_id) srsCardsMap.set(c.dicionario_id, c);
            });

            const aulasMap = new Map<string, string>();
            aulasList.forEach(a => {
                if (a.id) aulasMap.set(a.id, a.codigo_aula || '999');
            });

            // Associa os estados SRS aos termos do dicionário e injeta o código da aula
            return dictionary.map(item => {
                const card = srsCardsMap.get(item.id);
                const aulaCodigo = (item.aula_id && aulasMap.get(item.aula_id)) || (item.licao_oficial_id && aulasMap.get(item.licao_oficial_id)) || '999';

                // Valida e sanitiza o card vindo do banco de dados (previne crashes com esquemas antigos de teste)
                let validatedCard = undefined;
                if (
                    card &&
                    typeof card === 'object' &&
                    card.due &&
                    !isNaN(Date.parse(card.due)) &&
                    typeof card.stability === 'number' &&
                    typeof card.difficulty === 'number' &&
                    typeof card.state === 'number' &&
                    typeof card.reps === 'number'
                ) {
                    validatedCard = card;
                }

                return {
                    ...item,
                    srsCard: validatedCard,
                    aula_codigo: aulaCodigo
                } as StudyItem;
            });
        },
        staleTime: 1000 * 10, // 10 segundos
        placeholderData: (previousData) => previousData,
    });

    // Consulta de progresso para controle de barreira de iniciantes
    const { data: progressoAulas = [], isLoading: isLoadingProgresso } = useQuery({
        queryKey: ['aulas-assistidas-count', userId],
        enabled: !!userId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('progresso_aluno')
                .select('aula_id')
                .eq('aluno_id', userId)
                .eq('aula_assistida', true);
            if (error) throw error;
            return data || [];
        },
        staleTime: 1000 * 60 * 5, // 5 minutos de cache
        placeholderData: (previousData) => previousData,
    });

    const isLoading = isLoadingSession || isLoadingMeta || isLoadingDiario || isLoadingDeck || isLoadingProgresso;

    // Mutação de Configurações
    const updatePrefsMutation = useMutation({
        mutationFn: updateSrsPreferencesAction,
        onSuccess: (result) => {
            if (result?.demoPayloads) applyDemoServerPayloads(result.demoPayloads);
            queryClient.invalidateQueries({ queryKey: ['srs-meta', userId] });
            setIsPanelOpen(false);
        }
    });




    // Fuso-horário e virada de hora do SRS centralizado
    const getAdjustedLocalDayStr = useCallback((date: Date) => {
        if (!srsMeta) return '';
        // Protege contra datas inválidas (Invalid Date)
        if (!date || isNaN(date.getTime())) {
            date = new Date();
        }
        const viradaHora = srsMeta.virada_hora ?? 1;
        const parts = SAO_PAULO_FORMATTER.formatToParts(date);
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
    }, [srsMeta]);

    const todayStr = useMemo(() => {
        if (!srsMeta) return '';
        return getAdjustedLocalDayStr(new Date());
    }, [srsMeta, getAdjustedLocalDayStr]);

    const currentStreak = useMemo(() => {
        if (!srsMeta || !srsMeta.ultima_revisao || !todayStr) return 0;
        
        const lastReviewStr = getAdjustedLocalDayStr(new Date(srsMeta.ultima_revisao));
        
        const d1 = new Date(todayStr + 'T00:00:00Z');
        const d2 = new Date(lastReviewStr + 'T00:00:00Z');
        const diffTime = d1.getTime() - d2.getTime(); // Sem Math.abs
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays > 2) { // Alterado para > 2 para permitir o congelamento temporário de 1 dia
            return 0;
        }
        return srsMeta.streak_atual;
    }, [srsMeta, todayStr, getAdjustedLocalDayStr]);

    const isFrozen = useMemo(() => {
        if (!srsMeta || !srsMeta.ultima_revisao || !todayStr || srsMeta.streak_atual === 0) return false;
        
        const lastReviewStr = getAdjustedLocalDayStr(new Date(srsMeta.ultima_revisao));
        
        const d1 = new Date(todayStr + 'T00:00:00Z');
        const d2 = new Date(lastReviewStr + 'T00:00:00Z');
        const diffTime = d1.getTime() - d2.getTime(); // Sem Math.abs
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays === 2;
    }, [srsMeta, todayStr, getAdjustedLocalDayStr]);



    const sessionDeckBreakdown = useMemo(() => {
        if (!srsDeck.length || !todayStr) return { news: 0, learnings: 0, reviews: 0, total: 0 };

        const nowMs = Date.now();
        const limiteNovas = srsMeta?.limite_novas ?? 10;

        const newCardsIntroducedTodayCount = srsDeck.filter(item => {
            if (!item.srsCard || !item.srsCard.created_at) return false;
            const createdDate = new Date(item.srsCard.created_at);
            const createdDayStr = getAdjustedLocalDayStr(createdDate);
            return createdDayStr === todayStr;
        }).length;

        const additionalNewCardsAllowedVal = Math.max(0, limiteNovas - newCardsIntroducedTodayCount);

        const filteredDeck = srsDeck.filter(item => {
            if (filtroSessao === 'Palavras' && item.tipo !== 'Palavra') return false;
            if (filtroSessao === 'Frases' && item.tipo !== 'Frase') return false;
            return true;
        });

        const learningCount = filteredDeck.filter(item => {
            if (!item.srsCard) return false;
            if (item.srsCard.state !== 1 && item.srsCard.state !== 3) return false;
            const dueMs = new Date(item.srsCard.due).getTime();
            return dueMs <= nowMs + 10 * 60 * 1000;
        }).length;

        const reviewCount = filteredDeck.filter(item => {
            if (!item.srsCard || item.srsCard.state !== 2) return false;
            const dueDayStr = getAdjustedLocalDayStr(new Date(item.srsCard.due));
            return dueDayStr <= todayStr;
        }).length;

        const newCountAvailable = filteredDeck.filter(item => !item.srsCard || item.srsCard.state === 0).length;
        const newCount = Math.min(newCountAvailable, additionalNewCardsAllowedVal);

        const total = learningCount + reviewCount + newCount;

        return { news: newCount, learnings: learningCount, reviews: reviewCount, total };
    }, [srsDeck, srsMeta, filtroSessao, todayStr, getAdjustedLocalDayStr]);

    // Disponibilidade de cartas por tipo
    const availability = useMemo(() => {
        if (!srsDeck.length || !todayStr) return { Palavras: 0, Frases: 0 };

        const nowMs = Date.now();
        const limiteNovas = srsMeta?.limite_novas ?? 10;

        const newCardsIntroducedTodayCount = srsDeck.filter(item => {
            if (!item.srsCard || !item.srsCard.created_at) return false;
            const createdDate = new Date(item.srsCard.created_at);
            const createdDayStr = getAdjustedLocalDayStr(createdDate);
            return createdDayStr === todayStr;
        }).length;

        const additionalNewCardsAllowedVal = Math.max(0, limiteNovas - newCardsIntroducedTodayCount);

        // Palavras
        const palavrasDeck = srsDeck.filter(item => item.tipo === 'Palavra');
        const palavrasLearning = palavrasDeck.filter(item => {
            if (!item.srsCard) return false;
            if (item.srsCard.state !== 1 && item.srsCard.state !== 3) return false;
            const dueMs = new Date(item.srsCard.due).getTime();
            return dueMs <= nowMs + 10 * 60 * 1000;
        }).length;
        const palavrasReview = palavrasDeck.filter(item => {
            if (!item.srsCard || item.srsCard.state !== 2) return false;
            const dueDayStr = getAdjustedLocalDayStr(new Date(item.srsCard.due));
            return dueDayStr <= todayStr;
        }).length;
        const palavrasNewAvailable = palavrasDeck.filter(item => !item.srsCard || item.srsCard.state === 0).length;
        const palavrasNew = Math.min(palavrasNewAvailable, additionalNewCardsAllowedVal);
        const totalPalavras = palavrasLearning + palavrasReview + palavrasNew;

        // Frases
        const frasesDeck = srsDeck.filter(item => item.tipo === 'Frase');
        const frasesLearning = frasesDeck.filter(item => {
            if (!item.srsCard) return false;
            if (item.srsCard.state !== 1 && item.srsCard.state !== 3) return false;
            const dueMs = new Date(item.srsCard.due).getTime();
            return dueMs <= nowMs + 10 * 60 * 1000;
        }).length;
        const frasesReview = frasesDeck.filter(item => {
            if (!item.srsCard || item.srsCard.state !== 2) return false;
            const dueDayStr = getAdjustedLocalDayStr(new Date(item.srsCard.due));
            return dueDayStr <= todayStr;
        }).length;
        const frasesNewAvailable = frasesDeck.filter(item => !item.srsCard || item.srsCard.state === 0).length;
        const frasesNew = Math.min(frasesNewAvailable, additionalNewCardsAllowedVal);
        const totalFrases = frasesLearning + frasesReview + frasesNew;

        return {
            Palavras: totalPalavras,
            Frases: totalFrases
        };
    }, [srsDeck, srsMeta, todayStr, getAdjustedLocalDayStr]);

    // Redireciona filtro de sessão caso a opção ativa fique indisponível
    useEffect(() => {
        if (filtroSessao === 'Frases' && availability.Frases === 0) {
            setFiltroSessao('Ambos');
        } else if (filtroSessao === 'Palavras' && availability.Palavras === 0) {
            setFiltroSessao('Ambos');
        }
    }, [filtroSessao, availability]);

    // Estatísticas de estudos de Hoje
    const todayStats = useMemo(() => {
        if (!todayStr || !diarioData.length) {
            return { reviews: 0, focusTimeStr: '0s', avgRecallStr: '0s/cartão' };
        }
        const todayRecord = diarioData.find(d => d.data === todayStr);
        if (!todayRecord) {
            return { reviews: 0, focusTimeStr: '0s', avgRecallStr: '0s/cartão' };
        }
        
        const reviews = todayRecord.quantidade || 0;
        const totalSec = (todayRecord.tempo_revelacao_segundos || 0) + (todayRecord.tempo_estudo_segundos || 0);
        
        const formatTime = (totalSec: number) => {
            if (totalSec < 60) return `${totalSec}s`;
            const mins = Math.floor(totalSec / 60);
            const secs = totalSec % 60;
            return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
        };
        
        const focusTimeStr = formatTime(totalSec);
        const avgRecallSec = reviews > 0 ? Math.round(totalSec / reviews) : 0;
        const avgRecallStr = `${avgRecallSec}s/cartão`;
        
        return { reviews, focusTimeStr, avgRecallStr };
    }, [diarioData, todayStr]);



    const nextDueTimeStr = useMemo(() => {
        const nowMs = Date.now();
        const futureCards = srsDeck
            .filter(item => {
                if (!item.srsCard) return false;
                if (item.srsCard.state === 2) {
                    const dueDayStr = getAdjustedLocalDayStr(new Date(item.srsCard.due));
                    return dueDayStr > todayStr;
                } else {
                    return new Date(item.srsCard.due).getTime() > nowMs;
                }
            })
            .sort((a, b) => new Date(a.srsCard!.due).getTime() - new Date(b.srsCard!.due).getTime());

        if (futureCards.length === 0) return null;

        const nextCard = futureCards[0].srsCard!;
        const nextDue = new Date(nextCard.due);

        if (nextCard.state === 2) {
            const dueDayStr = getAdjustedLocalDayStr(nextDue);
            const daysDiff = getDaysSinceEpoch(dueDayStr) - getDaysSinceEpoch(todayStr);
            if (daysDiff === 1) {
                return 'amanhã';
            }
            return `em ${daysDiff} ${daysDiff === 1 ? 'dia' : 'dias'} (${nextDue.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })})`;
        } else {
            const dueDayStr = getAdjustedLocalDayStr(nextDue);
            const daysDiff = getDaysSinceEpoch(dueDayStr) - getDaysSinceEpoch(todayStr);
            if (daysDiff >= 1) {
                if (daysDiff === 1) return 'amanhã';
                return `em ${daysDiff} ${daysDiff === 1 ? 'dia' : 'dias'} (${nextDue.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })})`;
            }

            const diffMs = nextDue.getTime() - nowMs;
            const diffMins = Math.round(diffMs / (1000 * 60));

            if (diffMins < 60) {
                return `em ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`;
            }
            const diffHours = Math.round(diffMins / 60);
            return `em ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
        }
    }, [srsDeck, todayStr, getAdjustedLocalDayStr]);

    // ==========================================
    // MONTAGEM DO DECK DA SESSÃO ATIVA
    // ==========================================
    const handleStartSession = async (forceNewCount?: number) => {
        posthog.capture('srs_session_start_clicked', { filter: filtroSessao, is_custom_study: !!forceNewCount });

        const limiteNovas = forceNewCount ?? (srsMeta?.limite_novas ?? 10);

        // 2. Conta quantos cartões NOVOS foram INTRODUZIDOS hoje (criados hoje)
        const newCardsIntroducedTodayCount = srsDeck.filter(item => {
            if (!item.srsCard || !item.srsCard.created_at) return false;
            const createdDate = new Date(item.srsCard.created_at);
            const createdDayStr = getAdjustedLocalDayStr(createdDate);
            return createdDayStr === todayStr;
        }).length;

        const additionalNewCardsAllowed = forceNewCount
            ? forceNewCount
            : Math.max(0, limiteNovas - newCardsIntroducedTodayCount);

        // 3. Filtra os itens com base no seletor de palavras/frases
        const filteredDeck = srsDeck.filter(item => {
            if (filtroSessao === 'Palavras' && item.tipo !== 'Palavra') return false;
            if (filtroSessao === 'Frases' && item.tipo !== 'Frase') return false;
            return true;
        });

        // 4. Separa por estado FSRS
        const nowMs = Date.now();

        // Learning/Relearning (state=1 ou 3): devidos agora ou nos próximos 10 minutos
        // Ordenados por due crescente para que os mais urgentes apareçam primeiro
        const learningCards = filteredDeck
            .filter(item => {
                if (!item.srsCard) return false;
                if (item.srsCard.state !== 1 && item.srsCard.state !== 3) return false;
                const dueMs = new Date(item.srsCard.due).getTime();
                return dueMs <= nowMs + 10 * 60 * 1000;
            })
            .sort((a, b) => {
                const dueA = new Date(a.srsCard!.due).getTime();
                const dueB = new Date(b.srsCard!.due).getTime();
                return dueA - dueB;
            });

        // Review (state=2): cartas graduadas com revisão de longo prazo devida
        const reviewCards = filteredDeck.filter(item => {
            if (!item.srsCard || item.srsCard.state !== 2) return false;
            const dueDayStr = getAdjustedLocalDayStr(new Date(item.srsCard.due));
            return dueDayStr <= todayStr;
        });

        // New (state=0 ou sem srsCard): nunca vistas
        const newCards = filteredDeck.filter(item => !item.srsCard || item.srsCard.state === 0);

        // Ordena as novas cartas de acordo com o código da aula (pedagogicamente)
        const newCardsSorted = [...newCards].sort((a, b) => {
            const codeA = a.aula_codigo || '999';
            const codeB = b.aula_codigo || '999';
            if (codeA !== codeB) {
                return codeA.localeCompare(codeB, undefined, { numeric: true });
            }
            return Math.random() - 0.5;
        });

        // Limita as novas cartas
        const limitedNewCards = newCardsSorted.slice(0, additionalNewCardsAllowed);

        // Une tudo: learning primeiro (prioridade), depois review, depois novos
        // Filtra para garantir que apenas itens com hanzi_simp válido componham a sessão
        const finalSessionDeck = [
            ...learningCards,
            ...reviewCards.sort(() => Math.random() - 0.5),
            ...limitedNewCards,
        ].filter(item => Boolean(item && typeof item.hanzi_simp === 'string' && item.hanzi_simp.trim().length > 0));

        if (finalSessionDeck.length === 0) {
            setSessionError('Sem cartões para revisar agora. Você está em dia!');
            setTimeout(() => setSessionError(null), 4000);
            return;
        }

        setActiveSessionDeck(finalSessionDeck);
    };

    if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-10 h-10 animate-spin text-tcm-red" /></div>;

    if (progressoAulas.length < 3) {
        return (
            <RecursoBloqueado 
                titulo="Treino com Flashcards Bloqueado" 
                recursoNome="Treino com Flashcards" 
                aulasNecessarias={3} 
                aulasAssistidas={progressoAulas.length} 
            />
        );
    }

    // Se o SRS não estiver ativado, joga para tela de onboarding
    if (!srsMeta || !srsMeta.srs_habilitado) {
        return (
            <div className="min-h-screen bg-slate-50 pt-16">
                <SetNavbar title="Flashcards SRS" backLink="/dashboard" />
                <SrsOnboarding onActivated={() => queryClient.invalidateQueries({ queryKey: ['srs-meta', userId] })} />
            </div>
        );
    }

    // Se a sessão estiver ativa, renderiza o motor de flashcards em tela cheia
    if (activeSessionDeck) {
        return (
            <SrsSession 
                deck={activeSessionDeck}
                retencaoReduzida={srsMeta.retencao_reduzida}
                onClose={() => {
                    setActiveSessionDeck(null);
                    queryClient.invalidateQueries({ queryKey: ['srs-deck', userId] });
                    queryClient.invalidateQueries({ queryKey: ['srs-dashboard-summary', userId] });
                    queryClient.invalidateQueries({ queryKey: ['srs-meta', userId] });
                    queryClient.invalidateQueries({ queryKey: ['srs-diario', userId] });
                }}
                onFinished={() => {
                    setActiveSessionDeck(null);
                    queryClient.invalidateQueries();
                }}
            />
        );
    }

    return (
        <div className="min-h-screen pb-20 font-sans pt-16 bg-slate-50">
            <SetNavbar 
                title="Área de Flashcards"
                backLink="/dashboard"
                rightContent={
                    <div className="flex items-center gap-1.5">
                        <button 
                            onClick={() => {
                                setActiveTab('stats');
                                setIsPanelOpen(true);
                            }} 
                            className={`p-2 rounded-lg transition-colors cursor-pointer text-white hover:text-tcm-yellow hover:bg-tcm-dark-red ${isPanelOpen ? 'bg-tcm-dark-red text-tcm-yellow' : ''}`}
                            title="Estatísticas e Ajustes do SRS"
                        >
                            <Settings className="w-6 h-6" />
                        </button>
                    </div>
                }
            />

            <main className="max-w-3xl mx-auto px-4 mt-6 space-y-6">

                {isFrozen && (
                    <div className="bg-linear-to-r from-blue-500/10 to-indigo-500/10 border border-blue-200/40 rounded-xl p-4 flex items-center gap-3.5 shadow-sm text-slate-800 animate-in fade-in slide-in-from-top-1">
                        <div className="w-10 h-10 rounded-full bg-linear-to-tr from-blue-500 to-indigo-500 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                            <Snowflake className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <h4 className="font-extrabold text-xs sm:text-sm text-slate-800 leading-tight">
                                Ofensiva Congelada! ❄️
                            </h4>
                            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 leading-normal">
                                Sua ofensiva de <strong>{currentStreak} {currentStreak === 1 ? 'dia' : 'dias'}</strong> está preservada por hoje. O congelamento automático dura apenas 1 dia. Pratique hoje para não perder sua sequência!
                            </p>
                        </div>
                    </div>
                )}

                {/* BARRA DE ESTUDO & SELETOR DE DECK / EMPTY STATE */}
                {srsDeck.length === 0 ? (
                    <section className="bg-chinese-pattern border border-tcm-darker-red bg-tcm-red rounded-tcm-xl p-6 text-white shadow-tcm-lg flex flex-col gap-4 relative overflow-hidden">
                        <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/4 p-10 opacity-5 pointer-events-none">
                            <Brain className="w-72 h-72 text-tcm-yellow" />
                        </div>
                        <div className="relative z-10 space-y-3 text-center sm:text-left">
                            <span className="text-[10px] font-bold text-tcm-yellow uppercase tracking-widest flex items-center justify-center sm:justify-start gap-1">
                                <Brain className="w-3.5 h-3.5" /> Memorização FSRS
                            </span>
                            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Liberar Novos Flashcards</h2>
                            <p className="text-white/85 text-xs sm:text-sm max-w-xl leading-relaxed">
                                Você ainda não possui palavras ou frases liberadas em seu dicionário para praticar.
                                Assista às vídeo-aulas do curso para liberar novos vocábulos automaticamente e começar seus treinos de memorização inteligente!
                            </p>
                            <div className="pt-2">
                                <button
                                    onClick={() => router.push('/dashboard')}
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-tcm-yellow hover:bg-tcm-yellow/90 text-tcm-darker-red font-extrabold px-6 py-3.5 rounded-xl transition-all shadow-tcm-md hover:shadow-tcm-lg active:scale-98 text-sm uppercase tracking-wider cursor-pointer"
                                >
                                    Ir para as Aulas
                                </button>
                            </div>
                        </div>
                    </section>
                ) : sessionDeckBreakdown.total === 0 ? (
                    /* ===== ESTADO: TUDO REVISADO (Clean Completion State) ===== */
                    <section className="bg-chinese-pattern border border-tcm-darker-red bg-tcm-red rounded-tcm-xl p-6 sm:p-8 text-white shadow-tcm-lg relative overflow-hidden">
                        <div className="relative z-10 flex flex-col items-center text-center gap-4">
                            <div className="text-5xl sm:text-6xl leading-none select-none" aria-hidden="true">🎋</div>
                            <div className="space-y-1.5">
                                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                                    很好! Tudo revisado por hoje
                                </h2>
                                <p className="text-white/70 text-xs sm:text-sm max-w-sm mx-auto leading-relaxed">
                                    Seu cérebro está processando o que aprendeu. Descanse e volte amanhã para reforçar a memória.
                                </p>
                            </div>

                            {/* Stats de hoje (se estudou) */}
                            {todayStats.reviews > 0 && (
                                <div className="flex items-center gap-3 sm:gap-5 bg-black/15 backdrop-blur-sm rounded-xl px-5 py-2.5 border border-white/5 text-[11px] sm:text-xs font-semibold text-white/80">
                                    <span>{todayStats.reviews} {todayStats.reviews === 1 ? 'cartão' : 'cartões'}</span>
                                    <span className="w-px h-3.5 bg-white/15" />
                                    <span>{todayStats.focusTimeStr}</span>
                                    <span className="w-px h-3.5 bg-white/15" />
                                    <span>{todayStats.avgRecallStr}</span>
                                </div>
                            )}

                            {/* Próximo vencimento */}
                            {nextDueTimeStr && (
                                <p className="text-[10px] text-white/50 font-semibold uppercase tracking-widest">
                                    Próxima revisão {nextDueTimeStr}
                                </p>
                            )}
                        </div>
                    </section>
                ) : (
                    /* ===== ESTADO: CARTÕES DISPONÍVEIS ===== */
                    <section className="bg-chinese-pattern border border-tcm-darker-red bg-tcm-red rounded-tcm-xl p-6 text-white shadow-tcm-lg flex flex-col gap-6 relative overflow-hidden">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10 w-full">
                            <div className="space-y-2 relative z-10 text-center sm:text-left flex-1">
                                <span className="text-[10px] font-bold text-tcm-yellow uppercase tracking-widest flex items-center justify-center sm:justify-start gap-1">
                                    <Calendar className="w-3.5 h-3.5" /> Sessão Diária
                                </span>
                                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Estude seus Flashcards</h2>
                                
                                <div className="space-y-1">
                                    <p className="text-white/80 text-xs sm:text-sm">
                                        Você tem <strong className="text-tcm-yellow font-bold">{sessionDeckBreakdown.total} {sessionDeckBreakdown.total === 1 ? 'cartão' : 'cartões'}</strong> faltando estudar.
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10 w-full sm:w-auto shrink-0">
                                {/* Seletor Discreto do Deck */}
                                <div className="relative w-full sm:w-auto">
                                    <select
                                        value={filtroSessao}
                                        onChange={(e) => setFiltroSessao(e.target.value as 'Ambos' | 'Palavras' | 'Frases')}
                                        className="w-full sm:w-auto appearance-none bg-black/15 border border-white/10 hover:bg-black/25 text-white/70 text-[10px] font-bold uppercase tracking-wider rounded-xl py-2 pl-3 pr-8 outline-none focus:border-white/30 transition-all cursor-pointer"
                                    >
                                        <option value="Ambos" className="bg-slate-900 text-white">Frases e palavras</option>
                                        <option 
                                            value="Palavras" 
                                            disabled={availability.Palavras === 0} 
                                            className="bg-slate-900 text-white disabled:text-white/30"
                                        >
                                            {availability.Palavras === 0 ? 'Apenas Palavras (vazio)' : 'Apenas Palavras'}
                                        </option>
                                        <option 
                                            value="Frases" 
                                            disabled={availability.Frases === 0} 
                                            className="bg-slate-900 text-white disabled:text-white/30"
                                        >
                                            {availability.Frases === 0 ? 'Apenas Frases (vazio)' : 'Apenas Frases'}
                                        </option>
                                    </select>
                                    <ChevronDown className="w-3.5 h-3.5 text-white/40 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>

                                {/* Botão Iniciar */}
                                <div className="flex flex-col items-center gap-1.5 w-full sm:w-auto shrink-0">
                                    <button
                                        onClick={() => handleStartSession()}
                                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-tcm-yellow hover:bg-tcm-yellow/90 text-tcm-darker-red font-extrabold px-6 py-3.5 rounded-xl transition-all shadow-tcm-md hover:shadow-tcm-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-98 text-sm uppercase tracking-wider cursor-pointer"
                                    >
                                        <Play className="w-4 h-4 fill-current" />
                                        Iniciar Sessão
                                    </button>
                                    {sessionError && (
                                        <span className="text-tcm-yellow text-xs font-semibold bg-black/30 px-3 py-1.5 rounded-lg animate-pulse">
                                            {sessionError}
                                        </span>
                                    )}
                                    {todayStats.reviews > 0 && (
                                        <span className="text-[10px] text-white/70 font-semibold text-center sm:text-right w-full sm:w-auto mt-0.5 block truncate leading-none">
                                            Hoje: {todayStats.reviews} {todayStats.reviews === 1 ? 'cartão' : 'cartões'} ({todayStats.focusTimeStr} • {todayStats.avgRecallStr})
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Barra de Distribuição do Deck (Anki-style) */}
                        <div className="border-t border-white/10 pt-4 mt-2 space-y-2.5 relative z-10 w-full animate-in fade-in slide-in-from-top-1">
                            <div className="flex justify-between items-center text-[10px] sm:text-xs text-white/80 font-bold uppercase tracking-wider">
                                <span>Distribuição de Hoje:</span>
                                <span className="text-tcm-yellow">{sessionDeckBreakdown.total} {sessionDeckBreakdown.total === 1 ? 'cartão' : 'cartões'}</span>
                            </div>
                            <div className="w-full h-2 bg-black/35 rounded-full overflow-hidden flex">
                                {sessionDeckBreakdown.news > 0 && (
                                    <div 
                                        className="h-full bg-blue-400 transition-all duration-300" 
                                        style={{ width: `${(sessionDeckBreakdown.news / sessionDeckBreakdown.total) * 100}%` }}
                                        title={`Novos: ${sessionDeckBreakdown.news}`}
                                    />
                                )}
                                {sessionDeckBreakdown.learnings > 0 && (
                                    <div 
                                        className="h-full bg-amber-400 transition-all duration-300" 
                                        style={{ width: `${(sessionDeckBreakdown.learnings / sessionDeckBreakdown.total) * 100}%` }}
                                        title={`Aprendizado: ${sessionDeckBreakdown.learnings}`}
                                    />
                                )}
                                {sessionDeckBreakdown.reviews > 0 && (
                                    <div 
                                        className="h-full bg-emerald-400 transition-all duration-300" 
                                        style={{ width: `${(sessionDeckBreakdown.reviews / sessionDeckBreakdown.total) * 100}%` }}
                                        title={`Revisões: ${sessionDeckBreakdown.reviews}`}
                                    />
                                )}
                            </div>
                            <div className="flex flex-wrap gap-4 text-[9px] font-bold text-white/85 tracking-wider uppercase">
                                {sessionDeckBreakdown.news > 0 && (
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 bg-blue-400 rounded-full inline-block"></span> 
                                        Novos: {sessionDeckBreakdown.news}
                                    </span>
                                )}
                                {sessionDeckBreakdown.learnings > 0 && (
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 bg-amber-400 rounded-full inline-block animate-pulse"></span> 
                                        Aprendizado: {sessionDeckBreakdown.learnings}
                                    </span>
                                )}
                                {sessionDeckBreakdown.reviews > 0 && (
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 bg-emerald-400 rounded-full inline-block"></span> 
                                        Revisões: {sessionDeckBreakdown.reviews}
                                    </span>
                                )}
                            </div>
                        </div>
                    </section>
                )}

                {/* HEATMAP */}
                <section>
                    <SrsHeatmap 
                        diarioData={diarioData} 
                        streakMaxima={srsMeta.streak_maxima}
                        streakAtual={currentStreak}
                        isFrozen={isFrozen}
                    />
                </section>

                {/* MODAL DE ESTATÍSTICAS E AJUSTES INTEGRADOS */}
                <AnimatePresence>
                    {isPanelOpen && (
                        <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
                            {/* Backdrop com desfoque suave */}
                            <motion.div
                                initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                                animate={{ opacity: 1, backdropFilter: 'blur(4px)' }}
                                exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                                transition={{ duration: 0.25 }}
                                className="absolute inset-0 bg-slate-900/40"
                                onClick={() => setIsPanelOpen(false)}
                            />

                            {/* Card centralizado */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                                onClick={(e) => e.stopPropagation()}
                                className="relative w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden flex flex-col p-6 space-y-5 z-10"
                            >
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setActiveTab('stats')}
                                            className={`text-sm font-extrabold uppercase tracking-wider pb-1.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                                                activeTab === 'stats'
                                                    ? 'border-tcm-red text-slate-800'
                                                    : 'border-transparent text-slate-400 hover:text-slate-600'
                                            }`}
                                        >
                                            <Brain className="w-4 h-4" /> Estatísticas
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('settings')}
                                            className={`text-sm font-extrabold uppercase tracking-wider pb-1.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                                                activeTab === 'settings'
                                                    ? 'border-tcm-red text-slate-800'
                                                    : 'border-transparent text-slate-400 hover:text-slate-600'
                                            }`}
                                        >
                                            <Settings className="w-4 h-4" /> Ajustes
                                        </button>
                                    </div>
                                    <button 
                                        onClick={() => setIsPanelOpen(false)}
                                        className="p-1 hover:bg-slate-100 rounded-full transition-colors cursor-pointer text-slate-400 hover:text-slate-600 self-start -mt-1"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Conteúdo com transição suave entre abas */}
                                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 no-scrollbar">
                                    <AnimatePresence mode="wait">
                                        {activeTab === 'stats' ? (
                                            <motion.div
                                                key="stats-tab"
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 10 }}
                                                transition={{ duration: 0.15 }}
                                            >
                                                <SrsStatsContent
                                                    srsDeck={srsDeck}
                                                    diarioData={diarioData}
                                                    currentStreak={currentStreak}
                                                    streakMaxima={srsMeta.streak_maxima}
                                                    getAdjustedLocalDayStr={getAdjustedLocalDayStr}
                                                    todayStr={todayStr}
                                                    isFrozen={isFrozen}
                                                />
                                            </motion.div>
                                        ) : (
                                            <motion.div
                                                key="settings-tab"
                                                initial={{ opacity: 0, x: 10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -10 }}
                                                transition={{ duration: 0.15 }}
                                                className="space-y-4"
                                            >
                                                <form onSubmit={(e) => {
                                                    e.preventDefault();
                                                    const fd = new FormData(e.currentTarget);
                                                    const limite = Number(fd.get('limiteNovas'));
                                                    const retencao = fd.get('retencaoReduzida') === 'on';
                                                    const virada = Number(fd.get('viradaHora'));
                                                    updatePrefsMutation.mutate({
                                                        limiteNovas: limite,
                                                        retencaoReduzida: retencao,
                                                        filtroPadrao: filtroSessao,
                                                        viradaHora: virada
                                                    });
                                                }} className="space-y-4">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Novas por Dia</label>
                                                            <input 
                                                                type="number" 
                                                                name="limiteNovas"
                                                                defaultValue={srsMeta.limite_novas}
                                                                min={1} 
                                                                max={100}
                                                                className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl block p-2.5 outline-none focus:ring-1 focus:ring-tcm-red"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Hora de Virada</label>
                                                            <select 
                                                                name="viradaHora"
                                                                defaultValue={srsMeta.virada_hora}
                                                                className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl block p-2.5 outline-none focus:ring-1 focus:ring-tcm-red cursor-pointer"
                                                            >
                                                                <option value={0}>Meia-noite (00:00)</option>
                                                                <option value={1}>01:00 AM</option>
                                                                <option value={2}>02:00 AM</option>
                                                                <option value={3}>03:00 AM</option>
                                                                <option value={4}>04:00 AM</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-3">
                                                        <label className="flex items-start gap-3 cursor-pointer select-none">
                                                            <input 
                                                                type="checkbox" 
                                                                name="retencaoReduzida"
                                                                defaultChecked={srsMeta.retencao_reduzida}
                                                                className="w-4 h-4 mt-0.5 rounded text-tcm-red focus:ring-tcm-red border-slate-300"
                                                            />
                                                            <div>
                                                                <span className="text-sm font-bold text-slate-800">Diminuir cartões futuros</span>
                                                                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                                                                    Estica os intervalos das revisões para reduzir a carga diária de cartões futuros (redução leve na taxa de retenção).
                                                                </p>
                                                            </div>
                                                        </label>
                                                        {srsMeta.retencao_reduzida && (
                                                            <div className="flex gap-2 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200/50 p-2.5 rounded-lg items-center animate-pulse">
                                                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                                                Carga Reduzida ativa.
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-col gap-3 pt-2 border-t border-slate-100">
                                                        <div className="flex gap-2 justify-end">
                                                            <button 
                                                                type="button" 
                                                                onClick={() => setIsPanelOpen(false)}
                                                                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50 cursor-pointer"
                                                            >
                                                                Cancelar
                                                            </button>
                                                            <button 
                                                                type="submit"
                                                                disabled={updatePrefsMutation.isPending}
                                                                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-850 flex items-center gap-1.5 cursor-pointer"
                                                            >
                                                                {updatePrefsMutation.isPending && <Loader2 className="w-3 animate-spin" />}
                                                                Salvar Ajustes
                                                            </button>
                                                        </div>

                                                        <div className="border-t border-slate-100 pt-3 flex justify-start">
                                                            <button
                                                                type="button"
                                                                onClick={handlePauseSrs}
                                                                disabled={isPausing}
                                                                className="w-full px-3 py-2 border border-red-200 text-red-650 hover:bg-red-50 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                                            >
                                                                {isPausing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                                                                Pausar uso do SRS
                                                            </button>
                                                        </div>
                                                    </div>
                                                </form>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
