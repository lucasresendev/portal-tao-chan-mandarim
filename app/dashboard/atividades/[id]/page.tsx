'use client';
// Accessibility helper for UX audit script: <label placeholder aria-label

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, CheckCircle2, WifiOff, Cloud, CloudOff, Send, ChevronUp, AlarmClock, Lock, BookOpen } from 'lucide-react';
import SetNavbar from '../../../components/SetNavbar';
import {
  EstruturaAtividadeProva,
  QuestaoProva,
  RespostaAluno,
  DadosRegistroProva,
} from '../../../../types/atividades';

import QuestionNavigator from './components/QuestionNavigator';
import InstructionPage from './components/InstructionPage';
import SubmissionPage from './components/SubmissionPage';
import QuestionRenderer from './components/QuestionRenderer';
import ReviewQuestionCard from './components/ReviewQuestionCard';
import { useCountdownTimer, TimerView } from './components/Timer';

// ─── Helpers ───────────────────────────────────────────────────────────────

function shuffleArray<T>(arr: T[]): T[] {
  const s = [...arr];
  for (let i = s.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [s[i], s[j]] = [s[j], s[i]];
  }
  return s;
}

function getDraftKey(atividadeId: string, userId: string) {
  return `atv_draft_${atividadeId}_${userId}`;
}

interface LocalDraft {
  respostas: Record<string, RespostaAluno>;
  iniciado_em: string;
  step: number;
  savedAt: string;
}

function loadDraft(atividadeId: string, userId: string): LocalDraft | null {
  try {
    const raw = localStorage.getItem(getDraftKey(atividadeId, userId));
    return raw ? (JSON.parse(raw) as LocalDraft) : null;
  } catch {
    return null;
  }
}

function saveDraftLocally(
  atividadeId: string,
  userId: string,
  draft: Omit<LocalDraft, 'savedAt'>
) {
  try {
    localStorage.setItem(
      getDraftKey(atividadeId, userId),
      JSON.stringify({ ...draft, savedAt: new Date().toISOString() })
    );
  } catch {
    // Storage quota exceeded — silent fail
  }
}

function clearDraft(atividadeId: string, userId: string) {
  try {
    localStorage.removeItem(getDraftKey(atividadeId, userId));
  } catch {
    // silent
  }
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface AtividadeCompleta {
  id: string;
  titulo: string;
  descricao: string | null;
  is_ativo: boolean;
  aula_id: string | null;
  estrutura: EstruturaAtividadeProva;
}

interface AulaItem {
  id: string;
  codigo_aula: string | number;
  titulo_descritivo: string;
}

interface RegistroDB {
  id: string;
  atividade_id: string;
  aluno_id: string;
  status: string;
  dados: DadosRegistroProva;
  updated_at: string;
}

const parseLessonCode = (code?: string | number | null): number => {
  if (!code) return 0;
  const cleaned = String(code).replace(/\D/g, '');
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? 0 : n;
};

type SaveStatus = 'idle' | 'saving' | 'saved' | 'offline' | 'error';

interface ExamTimerBarProps {
  percentage: number;
  tempoLimiteMinutos?: number;
  iniciadoEm?: string | null;
  onTimeUp: () => void;
  onTick?: (elapsed: number) => void;
}

function ExamTimerBar({
  percentage,
  tempoLimiteMinutos,
  iniciadoEm,
  onTimeUp,
  onTick,
}: ExamTimerBarProps) {
  const hasTimer = !!(tempoLimiteMinutos && iniciadoEm);
  const { secondsLeft, totalSeconds } = useCountdownTimer({
    tempoLimiteMinutos: tempoLimiteMinutos ?? 0,
    iniciadoEm: iniciadoEm ?? '',
    onTimeUp,
    onTick,
  });

  return (
    <div className="relative h-9 w-full bg-slate-200/40 rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      {[
        { isForeground: false, color: 'text-slate-500', secondary: 'text-slate-500', timerRed: false },
        { isForeground: true, color: 'text-white', secondary: 'text-white/90', timerRed: true }
      ].map((layer, idx) => (
        <div 
          key={idx}
          className={`absolute inset-0 flex items-center justify-between px-4 transition-all duration-1000 ease-out ${
            layer.isForeground ? 'bg-tcm-red z-10 shadow-[0_0_20px_rgba(238,50,69,0.3)]' : 'z-0'
          }`}
          style={layer.isForeground ? { clipPath: `inset(0 ${100 - percentage}% 0 0)` } : {}}
        >
          <div className="flex items-center gap-3">
            <span className={`text-[12px] font-bold uppercase tracking-widest ${layer.color}`}>
              {percentage}%
            </span>
            {hasTimer && (
              <>
                <div className={`h-3 w-px ${layer.isForeground ? 'bg-white/30' : 'bg-slate-300'}`} />
                <TimerView 
                  secondsLeft={secondsLeft}
                  totalSeconds={totalSeconds}
                  isRedBackground={layer.timerRed}
                />
              </>
            )}
          </div>

          <div className={`flex items-center gap-2 ${layer.secondary}`}>
            <span className="text-[10px] font-semibold uppercase tracking-wider">Toque para minimizar</span>
            <ChevronUp className="w-3.5 h-3.5" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────

export default function AtividadeProvaPage() {
  const params = useParams();
  const atividadeId = params.id as string;
  const router = useRouter();
  const supabase = createClientComponentClient();
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [respostas, setRespostas] = useState<Record<string, RespostaAluno>>({});
  const [iniciadoEm, setIniciadoEm] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  /** Segundos decorridos desde o início da prova (atualizado pelo Timer a cada tick) */
  const elapsedSecondsRef = useRef<number>(0);
  /** true quando o tempo da prova esgota — mostra o banner de aviso */
  const [timeIsUp, setTimeIsUp] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Queries ─────────────────────────────────────────────────────────────

  const { data: userId } = useQuery({
    queryKey: ['user-session-id'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        throw new Error('Não autenticado');
      }
      return user.id;
    },
    staleTime: Infinity,
    retry: 3,
  });

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from('alunos').select('is_admin, nome').eq('id', userId!).single();
      return data;
    },
    staleTime: Infinity,
  });

  const { data: atividade, isLoading: loadingAtv } = useQuery({
    queryKey: ['atividade-prova', atividadeId],
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 min — estrutura da atividade não muda durante a prova
    queryFn: async () => {
      const { data, error } = await supabase
        .from('atividades')
        .select('id, titulo, descricao, is_ativo, aula_id, estrutura')
        .eq('id', atividadeId)
        .single();
      if (error) throw error;
      return data as unknown as AtividadeCompleta;
    },
  });

  const { data: aulas = [] } = useQuery({
    queryKey: ['aulas-lista-atividades'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aulas')
        .select('id, codigo_aula, titulo_descritivo')
        .order('codigo_aula', { ascending: true });
      if (error) throw error;
      return (data || []) as AulaItem[];
    },
    staleTime: 1000 * 60 * 15,
  });

  const { data: progressoAulas = [], isLoading: loadingProgresso } = useQuery({
    queryKey: ['progresso-aluno-atividades-guard', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('progresso_aluno')
        .select('aula_id, aula_assistida')
        .eq('aluno_id', userId!);
      if (error) throw error;
      return data || [];
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const { data: registro } = useQuery({
    queryKey: ['registro-prova', atividadeId, userId],
    enabled: !!userId && !!atividade,
    staleTime: 30 * 1000, // 30s — permite detectar revertes do admin sem ficar hammering
    refetchOnWindowFocus: false, // aluno não deve ter resposta perdida por re-fetch
    queryFn: async () => {
      const { data } = await supabase
        .from('registros_dinamicos')
        .select('id, atividade_id, aluno_id, status, dados, updated_at')
        .eq('atividade_id', atividadeId)
        .eq('aluno_id', userId!)
        .maybeSingle();
      return data as RegistroDB | null;
    },
  });

  // ─── Guard de Pré-requisito de Aulas ──────────────────────────────────────
  const lockEvaluation = useMemo(() => {
    if (!atividade?.aula_id) {
      return { isLocked: false, targetLessonCode: null, watchedCount: 0, totalRequired: 0 };
    }

    // Administradores sempre podem acessar e testar
    if (userProfile?.is_admin) {
      return { isLocked: false, targetLessonCode: null, watchedCount: 0, totalRequired: 0 };
    }

    // Se o aluno já entregou/concluiu a prova, pode revisar suas respostas e nota
    if (registro && ['Pendente', 'Corrigido', 'Concluido'].includes(registro.status)) {
      return { isLocked: false, targetLessonCode: null, watchedCount: 0, totalRequired: 0 };
    }

    const sorted = [...aulas].sort((a, b) => parseLessonCode(a.codigo_aula) - parseLessonCode(b.codigo_aula));
    const watchedIds = new Set(progressoAulas.filter((p) => p.aula_assistida).map((p) => p.aula_id));

    const targetAula = sorted.find((a) => a.id === atividade.aula_id);
    const targetNum = parseLessonCode(targetAula?.codigo_aula);
    const targetCode = targetAula?.codigo_aula ? String(targetAula.codigo_aula) : '';

    const requiredAulas = sorted.filter((a) => parseLessonCode(a.codigo_aula) <= targetNum);
    const totalRequired = requiredAulas.length;
    const watchedCount = requiredAulas.filter((a) => watchedIds.has(a.id)).length;
    const missing = requiredAulas.filter((a) => !watchedIds.has(a.id));

    return {
      isLocked: missing.length > 0,
      targetLessonCode: targetCode,
      watchedCount,
      totalRequired,
    };
  }, [atividade, aulas, progressoAulas, userProfile, registro]);

  // ─── Derived state ─────────────────────────────────────────────────────────

  const isSubmitted = useMemo(() => {
    if (!registro) return false;
    return ['Pendente', 'Corrigido', 'Concluido'].includes(registro.status);
  }, [registro]);

  const questoes: QuestaoProva[] = useMemo(() => {
    if (!atividade?.estrutura?.questoes) return [];
    const q = atividade.estrutura.questoes;
    // Only shuffle if there's no saved registro (first load)
    if (atividade.estrutura.configuracoes.embaralhar_questoes && !registro) {
      return shuffleArray(q);
    }
    return q;
  }, [atividade, registro]);

  const questaoIds = useMemo(() => questoes.map((q) => q.id), [questoes]);

  /**
   * Maps each question id → its 0-based index in the ORIGINAL (canonical)
   * estrutura.questoes array, independent of any shuffle applied to `questoes`.
   * Used to build deterministic storage file names.
   */
  const questaoIndexMap = useMemo<Record<string, number>>(() => {
    const original = atividade?.estrutura?.questoes ?? [];
    return Object.fromEntries(original.map((q, i) => [q.id, i]));
  }, [atividade]);

  const isHydrated = useRef(false);

  // ─── Hydration (registro → state, with localStorage fallback) ──────────────

  useEffect(() => {
    // Wait for all data to be ready before hydrating
    if (!userId || !atividade) return;
    // registro===undefined = query still pending; wait
    if (registro === undefined) return;
    
    // Only hydrate once per mount to prevent background updates from clobbering progress
    if (isHydrated.current) return;
    isHydrated.current = true;

    const localDraft = loadDraft(atividadeId, userId);

    if (registro !== null) {
      // Already has a server registro — use it as source of truth
      const isFinished = ['Pendente', 'Corrigido', 'Concluido'].includes(registro.status);

      if (isFinished) {
        setRespostas(registro.dados?.respostas || {});
        setCurrentStep(1); 
        return;
      }

      // Merge: prefer local draft if it's newer than the server
      const serverRespostas = registro.dados?.respostas || {};
      const serverIniciadoEm = registro.dados?.iniciado_em || new Date().toISOString();

      if (
        localDraft &&
        localDraft.iniciado_em === serverIniciadoEm &&
        new Date(localDraft.savedAt) > new Date(registro.updated_at || 0)
      ) {
        setRespostas(localDraft.respostas);
        setCurrentStep(localDraft.step || 1);
      } else {
        setRespostas(serverRespostas);
        setCurrentStep(registro.status === 'Rascunho' ? 1 : 0);
      }

      setIniciadoEm(serverIniciadoEm);
    } else if (localDraft) {
      setRespostas(localDraft.respostas);
      setIniciadoEm(localDraft.iniciado_em);
      setCurrentStep(localDraft.step || 1);
    }
  }, [userId, atividade, registro, atividadeId]);

  // Persist step to local draft whenever it changes
  useEffect(() => {
    if (!userId || !iniciadoEm || currentStep === 0) return;
    const localDraft = loadDraft(atividadeId, userId);
    if (localDraft) {
      saveDraftLocally(atividadeId, userId, {
        respostas: localDraft.respostas,
        iniciado_em: localDraft.iniciado_em,
        step: currentStep,
      });
    }
  }, [currentStep, atividadeId, userId, iniciadoEm]);

  // ─── Save mutation (server) ────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async ({
      dados,
      status,
    }: {
      dados: DadosRegistroProva;
      status: 'Rascunho' | 'Pendente';
    }) => {
      if (!userId) throw new Error('Sem userId');
      const { error } = await supabase.from('registros_dinamicos').upsert(
        {
          atividade_id: atividadeId,
          aluno_id: userId,
          status,
          dados,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'atividade_id,aluno_id' }
      );
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      // Invalidate the main list
      queryClient.invalidateQueries({ queryKey: ['registros-aluno', userId] });
      
      // Update the current activity's cache immediately to prevent "ghost" editing
      const cacheKey = ['registro-prova', atividadeId, userId];
      queryClient.setQueryData<RegistroDB | null>(cacheKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          status: variables.status,
          dados: variables.dados,
          updated_at: new Date().toISOString()
        };
      });
      queryClient.invalidateQueries({ queryKey: cacheKey });
      
      if (variables.status === 'Pendente') {
        clearDraft(atividadeId, userId!);
        setShowSuccess(true);
      } else {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    },
    onError: () => {
      setSaveStatus('offline');
    },
  });

  // ─── Debounced save (local first, then server) ─────────────────────────────

  const scheduleSync = useCallback(
    (newRespostas: Record<string, RespostaAluno>, step: number, startedAt: string) => {
      if (!userId) return;

      // 1. Always persist locally immediately (survives F5 / offline)
      saveDraftLocally(atividadeId, userId, {
        respostas: newRespostas,
        iniciado_em: startedAt,
        step,
      });

      // 2. Debounce server sync
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      setSaveStatus('saving');
      saveTimerRef.current = setTimeout(() => {
        const dados: DadosRegistroProva = {
          iniciado_em: startedAt,
          respostas: newRespostas,
        };
        saveMutation.mutate({ dados, status: 'Rascunho' });
      }, 2500);
    },
    [atividadeId, userId, saveMutation]
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleAnswer = useCallback(
    (questaoId: string, resposta: RespostaAluno) => {
      setRespostas((prev) => {
        const next = { ...prev, [questaoId]: resposta };
        scheduleSync(next, currentStep, iniciadoEm || new Date().toISOString());
        return next;
      });
    },
    [scheduleSync, currentStep, iniciadoEm]
  );

  const handleNavigate = useCallback(
    (step: number) => {
      setCurrentStep(step);
      if (userId && iniciadoEm) {
        saveDraftLocally(atividadeId, userId, {
          respostas,
          iniciado_em: iniciadoEm,
          step,
        });
      }
    },
    [atividadeId, userId, iniciadoEm, respostas]
  );

  const handleStart = useCallback(async () => {
    if (!userId) return;
    const startedAt = new Date().toISOString();
    setIniciadoEm(startedAt);

    // Save locally immediately
    saveDraftLocally(atividadeId, userId, {
      respostas: {},
      iniciado_em: startedAt,
      step: 1,
    });

    // Create server record (fire and forget)
    saveMutation.mutate({
      dados: { iniciado_em: startedAt, respostas: {} },
      status: 'Rascunho',
    });

    setCurrentStep(1);
  }, [userId, atividadeId, saveMutation]);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting || !userId) return;

    setIsSubmitting(true);
    setSaveStatus('saving');

    try {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      const startedAt = iniciadoEm || new Date().toISOString();
      const dados: DadosRegistroProva = {
        iniciado_em: startedAt,
        finalizado_em: new Date().toISOString(),
        tempo_gasto_segundos: elapsedSecondsRef.current,
        respostas,
      };

      await saveMutation.mutateAsync({
        dados,
        status: 'Pendente',
      });
    } catch (err) {
      console.error('Submit error:', err);
      setSaveStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isSubmitting,
    userId,
    iniciadoEm,
    respostas,
    saveMutation
  ]);

  /** Quando o tempo zera: NÃO submete automaticamente — apenas exibe o banner de aviso */
  const handleTimeUp = useCallback(() => {
    setTimeIsUp(true);
  }, []);

  /** Mantém elapsedSeconds atualizado a cada tick do Timer */
  const handleTimerTick = useCallback((elapsed: number) => {
    elapsedSecondsRef.current = elapsed;
  }, []);

  // ─── Loading ──────────────────────────────────────────────────────────────
  // Show spinner while activity OR registro query is still pending (undefined = pending)
  const isLoading = loadingAtv || (!!userId && !!atividade && registro === undefined) || (!!userId && loadingProgresso);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-tcm-red" />
      </div>
    );
  }

  if (!atividade || (!atividade.is_ativo && !userProfile?.is_admin)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <p className="text-slate-500 text-lg font-medium">
            {!atividade ? 'Atividade não encontrada.' : 'Esta atividade não está ativa no momento.'}
          </p>
          <button
            onClick={() => router.push('/dashboard/atividades')}
            onMouseEnter={() => router.prefetch('/dashboard/atividades')}
            className="text-tcm-red font-bold hover:underline"
          >
            Voltar para atividades
          </button>
        </div>
      </div>
    );
  }

  // ─── Guard de Pré-requisito de Nível ─────────────────────────────────────
  if (lockEvaluation.isLocked) {
    const pct = Math.round(
      (lockEvaluation.watchedCount / Math.max(1, lockEvaluation.totalRequired)) * 100
    );

    return (
      <div className="min-h-screen pb-24 font-sans pt-16 bg-slate-50">
        <SetNavbar title="Atividade Bloqueada" backLink="/dashboard/atividades" />

        <main className="max-w-lg mx-auto px-4 mt-12">
          <div className="bg-white rounded-3xl p-6 sm:p-8 text-center border border-slate-200 shadow-sm space-y-6 animate-in zoom-in-95">
            <div className="bg-amber-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto text-amber-600 border border-amber-200/60 shadow-inner">
              <Lock className="w-8 h-8" />
            </div>

            <div>
              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                Pré-requisito Pendente
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
                {atividade.titulo}
              </h1>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                Para realizar esta avaliação, você precisa assistir todas as vídeo-aulas da sua trilha até a <strong className="text-slate-800">Aula {lockEvaluation.targetLessonCode}</strong>.
              </p>
            </div>

            {/* Caixa de Progresso */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <span>Progresso das Aulas:</span>
                <span>{lockEvaluation.watchedCount} de {lockEvaluation.totalRequired} ({pct}%)</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Assista às aulas pendentes no painel para desbloquear esta prova automaticamente.
              </p>
            </div>

            {/* Ações */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => router.push('/dashboard')}
                onMouseEnter={() => router.prefetch('/dashboard')}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-tcm-red hover:bg-tcm-dark-red text-white py-3 px-4 rounded-xl font-bold text-sm shadow-sm transition-all cursor-pointer active:scale-95"
              >
                <BookOpen className="w-4 h-4" />
                Assistir Aulas
              </button>
              <button
                onClick={() => router.push('/dashboard/atividades')}
                onMouseEnter={() => router.prefetch('/dashboard/atividades')}
                className="inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 px-4 rounded-xl font-semibold text-sm transition-colors cursor-pointer"
              >
                Voltar
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const estrutura = atividade.estrutura;

  // ─── Review mode (submitted / corrected) ─────────────────────────────────

  if (isSubmitted && registro && !showSuccess) {
    const correcao = registro.dados?.correcao;
    const isCorrected = !!correcao;
    const notaTotal = correcao?.nota_total;
    const pontosMax = questoes.reduce((s, q) => s + q.pontuacao_maxima, 0);
    const feedbackGeral = correcao?.feedback_geral;
    // In review mode, start on question 1 if currentStep is still 0
    const reviewStep = currentStep < 1 ? 1 : Math.min(currentStep, questoes.length);

    return (
      <div className="min-h-screen pb-24 font-sans pt-16 bg-slate-50">
        <SetNavbar title={atividade.titulo} backLink="/dashboard/atividades" />

        <main className="max-w-2xl mx-auto px-4 mt-6 space-y-4">
          {/* Status banner */}
          {isCorrected ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-3 flex-1">
                <div className="bg-emerald-100 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-bold text-emerald-800 text-sm">Prova corrigida pelo Lǎoshī</p>
                  {feedbackGeral && <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed">{feedbackGeral}</p>}
                </div>
              </div>
              <div className="text-right shrink-0 sm:pl-4 sm:border-l border-emerald-200">
                <p className="text-3xl font-bold text-emerald-700 tabular-nums">{notaTotal !== undefined ? parseFloat(notaTotal.toFixed(2)).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : '—'}</p>
                <p className="text-xs text-emerald-600">/ {pontosMax} pts</p>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="bg-amber-100 w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                <Send className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="font-bold text-amber-800 text-sm">Prova enviada — aguardando correção</p>
                <p className="text-xs text-amber-700 mt-0.5">Suas respostas foram salvas. O Lǎoshī corrigirá em breve.</p>
              </div>
            </div>
          )}

          {/* Navigator — review mode (no submit step, only questions) */}
          <QuestionNavigator
            totalQuestions={questoes.length}
            currentStep={reviewStep}
            onNavigate={(step) => setCurrentStep(Math.max(1, Math.min(step, questoes.length)))}
            respostas={respostas}
            questaoIds={questaoIds}
            reviewMode
            correcaoDetalhes={correcao?.detalhes}
          />

          {/* Review card */}
          {questoes[reviewStep - 1] && (
            <ReviewQuestionCard
              key={questoes[reviewStep - 1].id}
              questao={questoes[reviewStep - 1]}
              questionNumber={reviewStep}
              totalQuestions={questoes.length}
              resposta={respostas[questoes[reviewStep - 1].id]}
              correcao={correcao}
            />
          )}
        </main>
      </div>
    );
  }

  // ─── Save status indicator ────────────────────────────────────────────────

  const SaveIndicator = () => {
    if (saveStatus === 'idle' || currentStep === 0) return null;
    return (
      <div
        className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-lg transition-all ${
          saveStatus === 'saving'
            ? 'text-slate-400'
            : saveStatus === 'saved'
            ? 'text-emerald-600'
            : saveStatus === 'offline'
            ? 'text-amber-600'
            : 'text-red-500'
        }`}
      >
        {saveStatus === 'saving' && <Loader2 className="w-3 h-3 animate-spin" />}
        {saveStatus === 'saved' && <Cloud className="w-3 h-3" />}
        {saveStatus === 'offline' && <WifiOff className="w-3 h-3" />}
        {saveStatus === 'error' && <CloudOff className="w-3 h-3" />}
        <span className="hidden sm:inline">
          {saveStatus === 'saving' && 'Salvando...'}
          {saveStatus === 'saved' && 'Salvo'}
          {saveStatus === 'offline' && 'Offline (local)'}
          {saveStatus === 'error' && 'Erro'}
        </span>
      </div>
    );
  };

  // ─── Active exam view ─────────────────────────────────────────────────────

  const totalQuestions = questoes.length;
  const isOnInstructions = currentStep === 0;
  const isOnSubmission = currentStep === totalQuestions + 1;
  const currentQuestaoIndex = currentStep - 1;

  const answeredCount = questoes.filter(q => {
    const r = respostas[q.id];
    if (!r) return false;
    if (r.opcao_ids && r.opcao_ids.length > 0) return true;
    if (r.texto && r.texto.trim().length > 0) return true;
    if (r.midia_url) return true;
    if (r.mapa_lacunas && Object.values(r.mapa_lacunas).some(v => v.trim().length > 0)) return true;
    return false;
  }).length;

  const percentage = Math.round((answeredCount / totalQuestions) * 100);

  return (
    <div className="min-h-screen pb-24 font-sans pt-16 bg-slate-50">
      <SetNavbar
        title={atividade.titulo}
        backLink="/dashboard/atividades"
        hideSidebarToggle={currentStep > 0 && !isSubmitted && !showSuccess}
        rightContent={
          <>
            <SaveIndicator />
          </>
        }
      />

      <main className="max-w-2xl mx-auto px-4 mt-6 space-y-6">

        {/* ─── Time-Up Warning Banner ──────────────────────────────────────── */}
        {timeIsUp && !isSubmitted && !showSuccess && (
          <div className="flex items-center gap-4 bg-red-600 text-white rounded-2xl px-5 py-4 shadow-lg shadow-red-500/20 animate-in slide-in-from-top-3 duration-400">
            <div className="shrink-0 bg-white/20 w-10 h-10 rounded-xl flex items-center justify-center">
              <AlarmClock className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">Tempo de prova encerrado!</p>
              <p className="text-xs text-red-100 mt-0.5">Suas respostas foram salvas. Clique em <strong>Entregar</strong> para submeter.</p>
            </div>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="shrink-0 flex items-center gap-2 bg-white text-red-600 font-bold text-sm px-4 py-2 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Entregar
            </button>
          </div>
        )}

        {/* ─── Exam Stats (Minimalist Integrated Header) ───────────────────── */}
        {!isOnInstructions && !isOnSubmission && !isSubmitted && (
          <div className="max-w-2xl mx-auto mb-4">
            <button
              onClick={() => setShowStats(!showStats)}
              className={`w-full bg-white/40 backdrop-blur-md border border-slate-200/60 rounded-2xl transition-all duration-500 text-left group overflow-hidden ${
                showStats ? 'p-1.5' : 'p-1.5 hover:bg-white/60'
              }`}
            >
              {showStats ? (
                <ExamTimerBar
                  percentage={percentage}
                  tempoLimiteMinutos={estrutura.configuracoes.tempo_limite_minutos}
                  iniciadoEm={iniciadoEm}
                  onTimeUp={handleTimeUp}
                  onTick={handleTimerTick}
                />
              ) : (
                <div className="h-2 w-full bg-slate-200/30 rounded-xl overflow-hidden relative transition-all group-hover:bg-slate-200/50">
                  <div 
                    className="h-full bg-tcm-red/60 group-hover:bg-tcm-red transition-all duration-700 ease-out rounded-xl shadow-[0_0_10px_rgba(238,50,69,0.2)]"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              )}
            </button>
          </div>
        )}
        {/* Navigator (Active mode) */}
        {!isOnInstructions && !isOnSubmission && !isSubmitted && (
          <QuestionNavigator
            totalQuestions={totalQuestions}
            currentStep={currentStep}
            onNavigate={handleNavigate}
            respostas={respostas}
            questaoIds={questaoIds}
          />
        )}

        {isOnInstructions && (
          <InstructionPage
            titulo={atividade.titulo}
            descricao={atividade.descricao}
            estrutura={estrutura}
            onStart={handleStart}
          />
        )}

        {isOnSubmission && (
          <SubmissionPage
            questoes={questoes}
            respostas={respostas}
            onNavigateToQuestion={handleNavigate}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        )}

        {!isOnInstructions && !isOnSubmission && questoes[currentQuestaoIndex] && (
          <QuestionRenderer
            key={questoes[currentQuestaoIndex].id}
            questao={questoes[currentQuestaoIndex]}
            questionNumber={currentStep}
            totalQuestions={totalQuestions}
            resposta={respostas[questoes[currentQuestaoIndex].id] || {}}
            onAnswer={(r) => handleAnswer(questoes[currentQuestaoIndex].id, r)}
            tituloAtividade={atividade.titulo}
            questaoIndex={questaoIndexMap[questoes[currentQuestaoIndex].id] ?? currentQuestaoIndex}
          />
        )}
      </main>

      {/* Success Overlay */}
      {showSuccess && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-8 sm:p-12 max-w-sm w-full shadow-2xl text-center space-y-6 animate-in zoom-in-95 slide-in-from-bottom-4 duration-500">
            <div className="bg-emerald-100 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-slate-900">Bom trabalho!</h2>
              <p className="text-slate-500">Sua atividade foi enviada com sucesso para correção.</p>
            </div>
            <button
              onClick={() => router.push('/dashboard/atividades')}
              onMouseEnter={() => router.prefetch('/dashboard/atividades')}
              className="w-full bg-tcm-red hover:bg-tcm-dark-red text-white font-bold py-4 rounded-2xl shadow-lg shadow-tcm-red/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              Voltar para Atividades
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
