import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { FSRS, Card as FsrsCard, Rating, Grade, createEmptyCard } from 'ts-fsrs';
import { syncSrsSessionAction, CardUpdatePayload } from '../../../../../actions/srs-actions';
import { applyDemoServerPayloads } from '@/lib/demo/supabaseSandbox';
import posthog from 'posthog-js';
import { playCachedAudio } from '../../../../../../lib/audioCache';
import { ExibicaoPrefs, StudyItem, formatSrsInterval } from './srsHelpers';

type UseSrsSessionProps = {
    deck: StudyItem[];
    retencaoReduzida: boolean;
    onClose: () => void;
    onFinished: () => void;
};

// Carrega de forma síncrona o estado inicial (incluindo eventual backup do dia)
// para que o primeiro flashcard nasça estável no 1º frame, sem re-render/flicker.
function getInitialSessionData(deck: StudyItem[]) {
    if (typeof window === 'undefined') {
        return {
            deck,
            currentIndex: 0,
            countReviews: 0,
            recallSeconds: 0,
            studySeconds: 0,
            isFinished: false,
            sessionRestored: false,
            unsyncedCards: new Map<string, CardUpdatePayload>(),
            unsyncedCount: 0,
            unsyncedRecallSec: 0,
            unsyncedStudySec: 0,
        };
    }

    try {
        const saved = localStorage.getItem('srs_backup_session');
        if (saved) {
            const parsed = JSON.parse(saved);
            const isRecent = Date.now() - parsed.updatedAt < 1000 * 60 * 60 * 16; // 16 horas limite
            if (isRecent && parsed.activeDeck && parsed.activeDeck.length > 0) {
                if (parsed.isFinished || parsed.currentIndex >= parsed.activeDeck.length) {
                    localStorage.removeItem('srs_backup_session');
                } else {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const isBackupValid = parsed.activeDeck.every((item: any) => {
                        if (!item || typeof item !== 'object') return false;
                        if (!item.id || typeof item.hanzi_simp !== 'string') return false;
                        if (item.srsCard) {
                            const card = item.srsCard;
                            return (
                                card &&
                                typeof card === 'object' &&
                                typeof card.due === 'string' &&
                                typeof card.stability === 'number' &&
                                typeof card.difficulty === 'number' &&
                                typeof card.state === 'number'
                            );
                        }
                        return true;
                    });

                    if (isBackupValid) {
                        return {
                            deck: parsed.activeDeck as StudyItem[],
                            currentIndex: parsed.currentIndex || 0,
                            countReviews: parsed.countReviews || 0,
                            recallSeconds: parsed.recallSeconds || 0,
                            studySeconds: parsed.studySeconds || 0,
                            isFinished: !!parsed.isFinished,
                            sessionRestored: true,
                            unsyncedCards: parsed.unsyncedCards ? new Map<string, CardUpdatePayload>(parsed.unsyncedCards) : new Map<string, CardUpdatePayload>(),
                            unsyncedCount: parsed.unsyncedCount || 0,
                            unsyncedRecallSec: parsed.unsyncedRecallSec || 0,
                            unsyncedStudySec: parsed.unsyncedStudySec || 0,
                        };
                    } else {
                        localStorage.removeItem('srs_backup_session');
                    }
                }
            } else {
                localStorage.removeItem('srs_backup_session');
            }
        }
    } catch (e) {
        console.warn('Erro ao restaurar backup inicial do SRS:', e);
    }

    return {
        deck,
        currentIndex: 0,
        countReviews: 0,
        recallSeconds: 0,
        studySeconds: 0,
        isFinished: false,
        sessionRestored: false,
        unsyncedCards: new Map<string, CardUpdatePayload>(),
        unsyncedCount: 0,
        unsyncedRecallSec: 0,
        unsyncedStudySec: 0,
    };
}

export function useSrsSession({ deck, retencaoReduzida, onClose, onFinished }: UseSrsSessionProps) {
    const initialSessionRef = useRef<ReturnType<typeof getInitialSessionData> | null>(null);
    if (!initialSessionRef.current) {
        initialSessionRef.current = getInitialSessionData(deck);
    }
    const initial = initialSessionRef.current;

    const [currentIndex, setCurrentIndex] = useState(initial.currentIndex);
    const [isRevealed, setIsRevealed] = useState(false);
    const [isFinished, setIsFinished] = useState(initial.isFinished);
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sessionRestored, setSessionRestored] = useState(initial.sessionRestored);

    // Preferências de exibição dinâmicas
    const [exibicao, setExibicao] = useState<ExibicaoPrefs>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('srs_exibicao_prefs');
            if (saved) {
                try { return JSON.parse(saved); } catch (e) { console.error(e); }
            }
        }
        return {
            simplificado: true,
            tradicional: false,
            pinyin: true,
            traducao: true,
            frases: true,
        };
    });

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const [revealedPhrases, setRevealedPhrases] = useState<Set<number>>(new Set());
    
    const [isPerformanceMode, setIsPerformanceMode] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('srs_performance_mode');
            return saved === 'true';
        }
        return false;
    });

    // Rastreamento de modificações acumuladas (Deltas para evitar double counts no Heatmap)
    const unsyncedCardsRef = useRef<Map<string, CardUpdatePayload>>(initial.unsyncedCards);
    const unsyncedCountRef = useRef<number>(initial.unsyncedCount);
    const unsyncedRecallSecRef = useRef<number>(initial.unsyncedRecallSec);
    const unsyncedStudySecRef = useRef<number>(initial.unsyncedStudySec);

    const [countReviews, setCountReviews] = useState(initial.countReviews);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    
    // Timers
    const startTimeRef = useRef<number>(0);
    const pauseTimeRef = useRef<number>(0);
    const [recallSeconds, setRecallSeconds] = useState(initial.recallSeconds);
    const [studySeconds, setStudySeconds] = useState(initial.studySeconds);
    const [currentCardRecallSec, setCurrentCardRecallSec] = useState(0);

    // Deck dinâmico já sincronizado com backup inicial
    const [activeDeck, setActiveDeck] = useState<StudyItem[]>(initial.deck);

    const fsrsInstance = useMemo(() => {
        return new FSRS({
            request_retention: retencaoReduzida ? 0.80 : 0.90,
            enable_fuzz: true,
        });
    }, [retencaoReduzida]);

    const activeItem = activeDeck[currentIndex];

    const nextIntervals = useMemo(() => {
        if (!activeItem || isFinished) return null;

        const baseCard: FsrsCard = activeItem.srsCard ? {
            due: new Date(activeItem.srsCard.due),
            stability: activeItem.srsCard.stability,
            difficulty: activeItem.srsCard.difficulty,
            elapsed_days: activeItem.srsCard.elapsed_days,
            scheduled_days: activeItem.srsCard.scheduled_days,
            reps: activeItem.srsCard.reps,
            lapses: activeItem.srsCard.lapses ?? 0,
            state: activeItem.srsCard.state,
            last_review: activeItem.srsCard.last_review ? new Date(activeItem.srsCard.last_review) : undefined,
            learning_steps: activeItem.srsCard.learning_steps ?? 0,
        } : createEmptyCard(new Date());

        const schedulingCards = fsrsInstance.repeat(baseCard, new Date());
        const now = new Date();

        return {
            [Rating.Again]: formatSrsInterval(schedulingCards[Rating.Again].card.due, now, schedulingCards[Rating.Again].card.scheduled_days),
            [Rating.Hard]: formatSrsInterval(schedulingCards[Rating.Hard].card.due, now, schedulingCards[Rating.Hard].card.scheduled_days),
            [Rating.Good]: formatSrsInterval(schedulingCards[Rating.Good].card.due, now, schedulingCards[Rating.Good].card.scheduled_days),
            [Rating.Easy]: formatSrsInterval(schedulingCards[Rating.Easy].card.due, now, schedulingCards[Rating.Easy].card.scheduled_days),
        };
    }, [activeItem, isFinished, fsrsInstance]);

    // Contadores Anki (incluem o card atual a partir de currentIndex)
    const remainingNew = useMemo(() =>
        activeDeck.slice(currentIndex).filter(item => !item.srsCard || item.srsCard.state === 0).length,
        [activeDeck, currentIndex]
    );
    const remainingLearning = useMemo(() =>
        activeDeck.slice(currentIndex).filter(item => item.srsCard && (item.srsCard.state === 1 || item.srsCard.state === 3)).length,
        [activeDeck, currentIndex]
    );
    const remainingDue = useMemo(() =>
        activeDeck.slice(currentIndex).filter(item => item.srsCard && item.srsCard.state === 2).length,
        [activeDeck, currentIndex]
    );

    // Invalida e limpa backup local
    const clearBackupLocal = useCallback(() => {
        localStorage.removeItem('srs_backup_session');
    }, []);

    // Referências estáveis para evitar stale closures em callbacks assíncronos e loops de dependências
    const activeDeckRef = useRef(activeDeck);
    activeDeckRef.current = activeDeck;
    const currentIndexRef = useRef(currentIndex);
    currentIndexRef.current = currentIndex;
    const countReviewsRef = useRef(countReviews);
    countReviewsRef.current = countReviews;
    const recallSecondsRef = useRef(recallSeconds);
    const studySecondsRef = useRef(studySeconds);
    recallSecondsRef.current = recallSeconds;
    studySecondsRef.current = studySeconds;
    const isFinishedRef = useRef(isFinished);
    isFinishedRef.current = isFinished;
    const isRevealedRef = useRef(isRevealed);
    isRevealedRef.current = isRevealed;

    // Atualiza backup no localStorage - Estável, sem dependências
    const updateLocalStorageBackup = useCallback((
        nextDeck = activeDeckRef.current,
        nextIndex = currentIndexRef.current,
        nextCount = countReviewsRef.current,
        nextRecall = recallSecondsRef.current,
        nextStudy = studySecondsRef.current,
        nextFinished = isFinishedRef.current
    ) => {
        const data = {
            activeDeck: nextDeck,
            currentIndex: nextIndex,
            unsyncedCards: Array.from(unsyncedCardsRef.current.entries()),
            unsyncedCount: unsyncedCountRef.current,
            unsyncedRecallSec: unsyncedRecallSecRef.current,
            unsyncedStudySec: unsyncedStudySecRef.current,
            recallSeconds: nextRecall,
            studySeconds: nextStudy,
            countReviews: nextCount,
            isFinished: nextFinished,
            updatedAt: Date.now()
        };
        localStorage.setItem('srs_backup_session', JSON.stringify(data));
    }, []);

    // Sincroniza o delta acumulado para o Supabase - Estável, pois updateLocalStorageBackup é estável
    const syncDeltaToSupabase = useCallback(async () => {
        const cardsToSync = Array.from(unsyncedCardsRef.current.values());
        if (cardsToSync.length === 0 && unsyncedCountRef.current === 0) return { success: true };

        const countSnapshot = unsyncedCountRef.current;
        const recallSnapshot = unsyncedRecallSecRef.current;
        const studySnapshot = unsyncedStudySecRef.current;
        const cardsSnapshot = [...cardsToSync];

        try {
            const result = await syncSrsSessionAction({
                cardsToUpsert: cardsSnapshot,
                sessionCount: countSnapshot,
                totalRecallSeconds: recallSnapshot,
                totalStudySeconds: studySnapshot
            });

            if (result.error) {
                return { error: result.error };
            }

            if (result.demoPayloads) {
                applyDemoServerPayloads(result.demoPayloads);
            }

            // Dedução dos snapshots enviados com sucesso
            unsyncedCountRef.current = Math.max(0, unsyncedCountRef.current - countSnapshot);
            unsyncedRecallSecRef.current = Math.max(0, unsyncedRecallSecRef.current - recallSnapshot);
            unsyncedStudySecRef.current = Math.max(0, unsyncedStudySecRef.current - studySnapshot);

            for (const card of cardsSnapshot) {
                const currentUnsynced = unsyncedCardsRef.current.get(card.dicionario_id);
                if (currentUnsynced && currentUnsynced.due === card.due) {
                    unsyncedCardsRef.current.delete(card.dicionario_id);
                }
            }

            updateLocalStorageBackup();
            return { success: true };
        } catch (e) {
            console.error('Falha ao sincronizar delta:', e);
            return { error: 'Falha na conexão de rede.' };
        }
    }, [updateLocalStorageBackup]);

    // Mantém syncDeltaRef.current sempre atualizado sem precisar de useEffect
    const syncDeltaRef = useRef(syncDeltaToSupabase);
    syncDeltaRef.current = syncDeltaToSupabase;

    // Inicialização na montagem: inicia timer e dispara sync em background se restaurou itens pendentes
    useEffect(() => {
        startTimeRef.current = Date.now();

        // Se uma sessão anterior foi restaurada com deltas pendentes, sincroniza em background
        if (initial.sessionRestored && (unsyncedCountRef.current > 0 || unsyncedCardsRef.current.size > 0)) {
            syncDeltaRef.current();
        }
    }, [initial.sessionRestored]);

    // Pré-aquecimento do áudio do card ativo (para tocar sem delay ao revelar)
    const currentItem = activeDeck[currentIndex];
    useEffect(() => {
        if (currentItem?.som) {
            const match = currentItem.som.match(/\[sound:(.+?)\]/);
            if (match && match[1]) {
                const audioUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/dicionario/sons/${match[1]}`;
                playCachedAudio(audioUrl).catch(() => {});
            }
        }
    }, [currentItem]);

    // Rastreamento automático de visibilidade para sincronização em segundo plano
    useEffect(() => {
        const handleVisibility = () => {
            if (document.hidden) {
                // Minimizado -> pausa o cronômetro de estudo e força sincronização
                pauseTimeRef.current = Date.now();
                syncDeltaRef.current();
            } else if (pauseTimeRef.current > 0) {
                const pausedMs = Date.now() - pauseTimeRef.current;
                startTimeRef.current += pausedMs;
                pauseTimeRef.current = 0;
            }
        };

        const handleBeforeUnload = () => {
            syncDeltaRef.current();
        };

        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('beforeunload', handleBeforeUnload);
        
        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            if (audioRef.current) audioRef.current.pause();
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        };
    }, []);

    const togglePerformanceMode = () => {
        setIsPerformanceMode(prev => {
            const next = !prev;
            localStorage.setItem('srs_performance_mode', String(next));
            return next;
        });
    };

    const toggleExibicao = (key: keyof ExibicaoPrefs) => {
        setExibicao(prev => {
            if (key === 'simplificado' && prev.simplificado && !prev.tradicional) return prev;
            if (key === 'tradicional' && prev.tradicional && !prev.simplificado) return prev;

            const next = { ...prev, [key]: !prev[key] };
            localStorage.setItem('srs_exibicao_prefs', JSON.stringify(next));
            return next;
        });
    };

    const handlePlayAudio = useCallback((e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!activeItem || !activeItem.hanzi_simp) return;

        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }

        const fallbackTts = () => {
            if ('speechSynthesis' in window && activeItem?.hanzi_simp) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(activeItem.hanzi_simp);
                utterance.lang = 'zh-CN';
                utterance.rate = 0.85;
                window.speechSynthesis.speak(utterance);
            }
        };

        if (activeItem.som) {
            const match = activeItem.som.match(/\[sound:(.+?)\]/);
            if (match && match[1]) {
                const filename = match[1];
                const audioUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/dicionario/sons/${filename}`;
                playCachedAudio(audioUrl).then(audio => {
                    audioRef.current = audio;
                    audio.play().catch(err => {
                        if (err.name !== 'AbortError') {
                            console.error("Audio playback error:", err);
                            fallbackTts();
                        }
                    });
                }).catch(() => fallbackTts());
                return;
            }
        }
        fallbackTts();
    }, [activeItem]);

    const handleReveal = useCallback(() => {
        if (isRevealedRef.current) return;
        isRevealedRef.current = true;
        setIsRevealed(true);
        const now = Date.now();
        const diffSeconds = Math.min(60, Math.max(1, Math.round((now - startTimeRef.current) / 1000)));
        
        const newRecall = recallSeconds + diffSeconds;
        unsyncedRecallSecRef.current += diffSeconds;

        setCurrentCardRecallSec(diffSeconds);
        setRecallSeconds(newRecall);
        startTimeRef.current = now;

        posthog.capture('srs_card_revealed', { card_id: activeItem.id, recall_time_sec: diffSeconds });
        handlePlayAudio();
        updateLocalStorageBackup(activeDeck, currentIndex, countReviews, newRecall, studySeconds);
    }, [activeItem, handlePlayAudio, recallSeconds, studySeconds, activeDeck, currentIndex, countReviews, updateLocalStorageBackup]);

    const handleRate = useCallback((rating: Grade) => {
        if (!activeItem || !isRevealedRef.current) return;

        // Desativa revelação síncrona imediatamente para bloquear cliques repetidos
        isRevealedRef.current = false;
        setIsRevealed(false);

        const now = Date.now();
        const diffSeconds = Math.min(60, Math.max(1, Math.round((now - startTimeRef.current) / 1000)));
        const newStudy = studySeconds + diffSeconds;
        
        unsyncedStudySecRef.current += diffSeconds;
        unsyncedCountRef.current += 1;
        setStudySeconds(newStudy);

        // Instancia card FSRS
        const baseCard: FsrsCard = activeItem.srsCard ? {
            due: new Date(activeItem.srsCard.due),
            stability: activeItem.srsCard.stability,
            difficulty: activeItem.srsCard.difficulty,
            elapsed_days: activeItem.srsCard.elapsed_days,
            scheduled_days: activeItem.srsCard.scheduled_days,
            reps: activeItem.srsCard.reps,
            lapses: activeItem.srsCard.lapses ?? 0,
            state: activeItem.srsCard.state,
            last_review: activeItem.srsCard.last_review ? new Date(activeItem.srsCard.last_review) : undefined,
            learning_steps: activeItem.srsCard.learning_steps ?? 0,
        } : createEmptyCard(new Date());

        // Calcula com FSRS
        const schedulingCards = fsrsInstance.repeat(baseCard, new Date());
        const updatedCard = schedulingCards[rating].card;

        // Atualiza delta acumulado
        unsyncedCardsRef.current.set(activeItem.id, {
            dicionario_id: activeItem.id,
            due: updatedCard.due.toISOString(),
            stability: updatedCard.stability,
            difficulty: updatedCard.difficulty,
            elapsed_days: updatedCard.elapsed_days,
            scheduled_days: updatedCard.scheduled_days,
            reps: updatedCard.reps,
            lapses: updatedCard.lapses,
            learning_steps: updatedCard.learning_steps,
            state: updatedCard.state,
            last_review: updatedCard.last_review ? updatedCard.last_review.toISOString() : null,
        });

        const cardNeedsRequeue = updatedCard.state === 1 || updatedCard.state === 3;
        const newReviewsCount = countReviews + 1;
        setCountReviews(newReviewsCount);

        posthog.capture('srs_card_rated', {
            card_id: activeItem.id,
            rating,
            recall_time_ms: currentCardRecallSec * 1000,
            study_time_ms: diffSeconds * 1000,
            reps: updatedCard.reps,
            state: updatedCard.state,
            difficulty: updatedCard.difficulty,
            stability: updatedCard.stability,
            scheduled_days: updatedCard.scheduled_days
        });

        let nextDeck = activeDeck;
        let nextIndex = currentIndex;
        let nextFinished = isFinished;

        if (cardNeedsRequeue) {
            const reQueuedItem: StudyItem = {
                ...activeItem,
                srsCard: {
                    id: activeItem.srsCard?.id ?? '',
                    aluno_id: activeItem.srsCard?.aluno_id ?? '',
                    dicionario_id: activeItem.id,
                    due: updatedCard.due.toISOString(),
                    stability: updatedCard.stability,
                    difficulty: updatedCard.difficulty,
                    elapsed_days: updatedCard.elapsed_days,
                    scheduled_days: updatedCard.scheduled_days,
                    reps: updatedCard.reps,
                    lapses: updatedCard.lapses,
                    learning_steps: updatedCard.learning_steps,
                    state: updatedCard.state,
                    last_review: updatedCard.last_review ? updatedCard.last_review.toISOString() : null,
                },
            };

            // Inserção inteligente: 4 posições à frente do index atual
            const insertPosition = Math.min(activeDeck.length, currentIndex + 4);
            const updatedDeck = [...activeDeck];
            updatedDeck.splice(insertPosition, 0, reQueuedItem);

            nextDeck = updatedDeck;
            nextIndex = currentIndex + 1;
            
            setActiveDeck(nextDeck);
            setCurrentIndex(nextIndex);
            setRevealedPhrases(new Set());
            startTimeRef.current = Date.now();
        } else {
            if (currentIndex < activeDeck.length - 1) {
                nextIndex = currentIndex + 1;
                setCurrentIndex(nextIndex);
                setRevealedPhrases(new Set());
                startTimeRef.current = Date.now();
            } else {
                nextFinished = true;
                setIsFinished(true);
                posthog.capture('srs_session_ended', {
                    deck_size: activeDeck.length,
                    reviews_count: newReviewsCount,
                    total_recall_sec: recallSeconds,
                    total_study_sec: newStudy,
                });
            }
        }

        // Atualiza localStorage imediatamente
        updateLocalStorageBackup(nextDeck, nextIndex, newReviewsCount, recallSeconds, newStudy, nextFinished);

        // Salvamento automático incremental: a cada 5 cards, envia delta para o banco de dados
        if (unsyncedCountRef.current >= 5) {
            syncDeltaToSupabase();
        }
    }, [activeItem, fsrsInstance, currentIndex, countReviews, recallSeconds, studySeconds, currentCardRecallSec, activeDeck, isFinished, updateLocalStorageBackup, syncDeltaToSupabase]);

    // Salvamento final explícito ao concluir
    const handleSaveSession = async () => {
        setIsSyncing(true);
        setError(null);

        const syncResult = await syncDeltaToSupabase();
        if (syncResult.error) {
            setError(syncResult.error);
            setIsSyncing(false);
        } else {
            clearBackupLocal();
            onFinished();
        }
    };

    // Sincronização e encerramento ao clicar em Sair
    const handleExitSession = async () => {
        // Se nada foi revisado ou pendente de envio, fecha imediatamente (0 ms de espera)
        if (unsyncedCardsRef.current.size === 0 && unsyncedCountRef.current === 0) {
            onClose();
            return;
        }

        setIsSyncing(true);
        setError(null);
        try {
            await syncDeltaToSupabase();
        } catch (e) {
            console.error('Erro ao sincronizar ao fechar sessão:', e);
        } finally {
            setIsSyncing(false);
            onClose();
        }
    };

    return {
        activeDeck,
        currentIndex,
        activeItem,
        isRevealed,
        isFinished,
        isSyncing,
        error,
        sessionRestored,
        setSessionRestored,
        exibicao,
        toggleExibicao,
        isSidebarOpen,
        setIsSidebarOpen,
        isInfoModalOpen,
        setIsInfoModalOpen,
        revealedPhrases,
        setRevealedPhrases,
        isPerformanceMode,
        togglePerformanceMode,
        remainingNew,
        remainingLearning,
        remainingDue,
        countReviews,
        recallSeconds,
        studySeconds,
        handleReveal,
        handleRate,
        handlePlayAudio,
        handleSaveSession,
        handleExitSession,
        syncDeltaToSupabase,
        nextIntervals
    };
}
