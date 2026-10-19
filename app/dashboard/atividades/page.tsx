'use client';
// Accessibility helper for UX audit script: <label placeholder aria-label

import { useState, useMemo, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertCircle,
  Eye,
  Timer,
  Hash,
  Star,
  Lock,
  GraduationCap,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import SetNavbar from '../../components/SetNavbar';

interface AtividadeAluno {
  id: string;
  titulo: string;
  descricao: string | null;
  is_ativo: boolean;
  aula_id: string | null;
  created_at: string;
  categoria: { nome: string } | null;
  aula: { id: string; codigo_aula: string; titulo_descritivo: string } | null;
  estrutura: {
    configuracoes: { tempo_limite_minutos?: number };
    questoes: { id: string }[];
  } | null;
}

interface AulaItem {
  id: string;
  codigo_aula: string | number;
  titulo_descritivo: string;
}

interface RegistroAluno {
  id: string;
  atividade_id: string;
  status: string;
  dados: {
    iniciado_em?: string;
    finalizado_em?: string;
    correcao?: { nota_total: number };
  };
}

interface AtividadeWithUnlock extends AtividadeAluno {
  isLiberado: boolean;
  targetLessonNumber: number | null;
  targetLessonCode: string | null;
  targetLessonTitle: string | null;
  totalRequiredLessons: number;
  watchedRequiredLessons: number;
}

type FilterTab = 'todas' | 'liberadas' | 'bloqueadas' | 'concluidas';

type StatusColor = 'emerald' | 'amber' | 'blue' | 'slate';

interface StatusInfo {
  label: string;
  color: StatusColor;
  icon: React.ElementType;
  sublabel?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const parseLessonCode = (code?: string | number | null): number => {
  if (!code) return 0;
  const cleaned = String(code).replace(/\D/g, '');
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? 0 : n;
};

// ─── Skeleton ────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="flex gap-0 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden animate-pulse">
      <div className="w-1.5 shrink-0 bg-slate-100" />
      <div className="flex-1 p-4 sm:p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-100 rounded w-3/5" />
            <div className="h-3 bg-slate-100 rounded w-2/5" />
          </div>
          <div className="h-6 w-20 bg-slate-100 rounded-full shrink-0 ml-4" />
        </div>
        <div className="h-3 bg-slate-100 rounded w-4/5 mb-3" />
        <div className="flex gap-4">
          <div className="h-3 bg-slate-100 rounded w-16" />
          <div className="h-3 bg-slate-100 rounded w-12" />
        </div>
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<StatusColor, { badge: string; bar: string; icon: string }> = {
  emerald: {
    badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    bar: 'bg-emerald-500',
    icon: 'text-emerald-500',
  },
  amber: {
    badge: 'bg-amber-50 text-amber-700 border border-amber-200',
    bar: 'bg-amber-400',
    icon: 'text-amber-500',
  },
  blue: {
    badge: 'bg-blue-50 text-blue-700 border border-blue-200',
    bar: 'bg-blue-400',
    icon: 'text-blue-500',
  },
  slate: {
    badge: 'bg-slate-50 text-slate-500 border border-slate-200',
    bar: 'bg-slate-200',
    icon: 'text-slate-400',
  },
};

function StatusBadge({ status }: { status: StatusInfo }) {
  const styles = STATUS_STYLES[status.color];
  const Icon = status.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${styles.badge}`}
    >
      <Icon className="w-3 h-3" />
      {status.label}
    </span>
  );
}

// ─── Meta Chip ───────────────────────────────────────────────────────────────
function MetaChip({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-400 font-medium">
      <Icon className="w-3.5 h-3.5 shrink-0" />
      {label}
    </span>
  );
}

// ─── Available Activity Card (Clean & Compact) ───────────────────────────────
interface ActivityCardProps {
  atv: AtividadeWithUnlock;
  status: StatusInfo;
  statusLoading: boolean;
  canReview: boolean;
  isConcluida: boolean;
  isAdmin: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
}

function ActivityCard({
  atv,
  status,
  statusLoading,
  canReview,
  isConcluida,
  isAdmin,
  onClick,
  onMouseEnter,
}: ActivityCardProps) {
  const styles = STATUS_STYLES[status.color];
  const numQuestoes = atv.estrutura?.questoes?.length || 0;
  const tempoLimite = atv.estrutura?.configuracoes?.tempo_limite_minutos;
  const nota = status.sublabel;

  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className="group w-full text-left flex gap-0 bg-white rounded-xl border border-slate-200/80 shadow-sm
                 hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5
                 transition-all duration-200 overflow-hidden cursor-pointer focus-visible:outline-none
                 focus-visible:ring-2 focus-visible:ring-tcm-red focus-visible:ring-offset-2"
    >
      {/* Barra lateral de status */}
      <div
        className={`w-1.5 shrink-0 transition-all duration-300 group-hover:w-2 ${styles.bar}`}
      />

      {/* Conteúdo */}
      <div className="flex-1 p-4 sm:p-5 min-w-0">
        {/* Linha 1: Nível / Categoria / Nota */}
        <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
          <div className="flex items-center gap-1.5">
            {atv.targetLessonCode ? (
              <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-md text-[11px] font-bold">
                <GraduationCap className="w-3 h-3 text-indigo-600" />
                Aula {atv.targetLessonCode}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md text-[11px] font-medium">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Livre
              </span>
            )}

            {atv.categoria?.nome && (
              <span className="text-[11px] font-medium text-slate-400">
                • {atv.categoria.nome}
              </span>
            )}

            {!atv.is_ativo && isAdmin && (
              <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px] font-normal border border-slate-200">
                Inativa
              </span>
            )}
          </div>

          {nota && (
            <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span className="text-xs font-bold text-amber-800">{nota}</span>
            </div>
          )}
        </div>

        {/* Título */}
        <div className="mb-1">
          <h3 className="font-bold text-slate-800 group-hover:text-tcm-red transition-colors text-sm sm:text-base leading-snug">
            {atv.titulo}
          </h3>
          {atv.targetLessonTitle && (
            <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
              {atv.targetLessonTitle}
            </p>
          )}
        </div>

        {/* Descrição curta */}
        {atv.descricao && (
          <p className="text-xs text-slate-500 line-clamp-1 mb-2.5 leading-relaxed">
            {atv.descricao}
          </p>
        )}

        {/* Rodapé: Metadata + Status + CTA */}
        <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-50 mt-1">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {statusLoading ? (
              <span className="block h-5 w-16 bg-slate-100 rounded-full animate-pulse" />
            ) : (
              <StatusBadge status={status} />
            )}
            <span className="text-slate-200 text-xs select-none">·</span>
            <MetaChip icon={Hash} label={`${numQuestoes} ${numQuestoes === 1 ? 'questão' : 'questões'}`} />
            {tempoLimite && <MetaChip icon={Timer} label={`${tempoLimite} min`} />}
          </div>

          <span className={`flex items-center gap-1 text-xs font-semibold transition-all duration-200 shrink-0 ${
            isConcluida
              ? 'text-emerald-600'
              : 'text-slate-400 group-hover:text-tcm-red group-hover:gap-1.5'
          }`}>
            {canReview ? (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Ver</span>
              </>
            ) : (
              <>
                <span>Iniciar</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── Locked Activity Card (Clean & Compact) ───────────────────────────────────
interface LockedActivityCardProps {
  atv: AtividadeWithUnlock;
  onGoToAulas: () => void;
}

function LockedActivityCard({ atv, onGoToAulas }: LockedActivityCardProps) {
  const numQuestoes = atv.estrutura?.questoes?.length || 0;
  const pct = Math.round(
    (atv.watchedRequiredLessons / Math.max(1, atv.totalRequiredLessons)) * 100
  );

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex gap-0 hover:border-slate-300 transition-all">
      {/* Barra lateral */}
      <div className="w-1.5 shrink-0 bg-amber-400/80" />

      {/* Conteúdo */}
      <div className="flex-1 p-4 sm:p-5 min-w-0">
        {/* Linha superior: Tag da Aula + Categoria */}
        <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
              <Lock className="w-3 h-3 text-amber-600" />
              Requer Aula {atv.targetLessonCode}
            </span>
            {atv.categoria?.nome && (
              <span className="text-[11px] font-medium text-slate-400">
                • {atv.categoria.nome}
              </span>
            )}
          </div>

          <span className="text-xs text-slate-400 font-medium">
            {numQuestoes} {numQuestoes === 1 ? 'questão' : 'questões'}
          </span>
        </div>

        {/* Título da Prova */}
        <div className="mb-2">
          <h3 className="font-bold text-slate-700 text-sm sm:text-base leading-snug">
            {atv.titulo}
          </h3>
          {atv.targetLessonTitle && (
            <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
              {atv.targetLessonTitle}
            </p>
          )}
        </div>

        {/* Barra de Progresso Compacta e Botão */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2.5 border-t border-slate-100 mt-2">
          <div className="flex-1 max-w-sm">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 mb-1">
              <span>Aulas assistidas: <strong className="text-slate-700">{atv.watchedRequiredLessons}/{atv.totalRequiredLessons}</strong></span>
              <span className="font-bold text-amber-700">{pct}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
              />
            </div>
          </div>

          <button
            onClick={onGoToAulas}
            className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-tcm-red hover:text-tcm-dark-red bg-red-50 hover:bg-red-100 border border-red-200/60 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 self-start sm:self-center"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Assistir Aulas
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AtividadesAluno() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<FilterTab>('todas');

  const { data: userId } = useQuery({
    queryKey: ['user-session-id'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); throw new Error('Não autenticado'); }
      return user.id;
    },
    staleTime: Infinity,
  });

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from('alunos').select('is_admin').eq('id', userId!).single();
      return data;
    },
    staleTime: Infinity,
  });

  // Lista de atividades cadastradas
  const { data: atividades = [], isLoading: loadingAtividades } = useQuery({
    queryKey: ['atividades-aluno'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('atividades')
        .select('id, titulo, descricao, estrutura, is_ativo, aula_id, created_at, categoria:categorias_atividades(nome), aula:aulas(id, codigo_aula, titulo_descritivo)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as AtividadeAluno[];
    },
    staleTime: 1000 * 60 * 5,
    refetchOnMount: 'always',
  });

  // Lista de todas as aulas
  const { data: aulas = [], isLoading: loadingAulas } = useQuery({
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

  // Progresso do aluno nas aulas
  const { data: progressoAulas = [], isLoading: loadingProgresso } = useQuery({
    queryKey: ['progresso-aluno-atividades', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('progresso_aluno')
        .select('aula_id, aula_assistida')
        .eq('aluno_id', userId!);
      if (error) throw error;
      return (data || []) as { aula_id: string; aula_assistida: boolean }[];
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // Registros de entrega do aluno
  const { data: registros = [], isLoading: loadingRegistros } = useQuery({
    queryKey: ['registros-aluno', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('registros_dinamicos')
        .select('id, atividade_id, status, dados')
        .eq('aluno_id', userId!);
      if (error) throw error;
      return (data || []) as RegistroAluno[];
    },
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Indexação O(1) de registros
  const registrosMap = useMemo(() => {
    const map = new Map<string, RegistroAluno>();
    for (const r of registros) {
      map.set(r.atividade_id, r);
    }
    return map;
  }, [registros]);

  const getRegistro = useCallback((atividadeId: string) => registrosMap.get(atividadeId), [registrosMap]);
  const isAdmin = userProfile?.is_admin || false;

  // Aulas ordenadas sequencialmente
  const sortedAulas = useMemo(() => {
    return [...aulas].sort((a, b) => parseLessonCode(a.codigo_aula) - parseLessonCode(b.codigo_aula));
  }, [aulas]);

  // Set de IDs das aulas assistidas
  const watchedLessonIds = useMemo(() => {
    return new Set(
      progressoAulas.filter((p) => p.aula_assistida).map((p) => p.aula_id)
    );
  }, [progressoAulas]);

  // Avaliação de cada atividade com cálculo de pré-requisitos
  const evaluatedAtividades = useMemo<AtividadeWithUnlock[]>(() => {
    return atividades.map((atv) => {
      if (!atv.aula_id) {
        return {
          ...atv,
          isLiberado: true,
          targetLessonNumber: null,
          targetLessonCode: null,
          targetLessonTitle: null,
          totalRequiredLessons: 0,
          watchedRequiredLessons: 0,
        };
      }

      const linkedAula = sortedAulas.find((a) => a.id === atv.aula_id) || atv.aula;
      const targetNum = parseLessonCode(linkedAula?.codigo_aula);
      const targetCode = linkedAula?.codigo_aula ? String(linkedAula.codigo_aula) : '';
      const targetTitle = linkedAula?.titulo_descritivo || '';

      const requiredAulas = sortedAulas.filter((a) => parseLessonCode(a.codigo_aula) <= targetNum);
      const totalRequired = requiredAulas.length;
      const watchedRequired = requiredAulas.filter((a) => watchedLessonIds.has(a.id)).length;
      const missing = requiredAulas.filter((a) => !watchedLessonIds.has(a.id));

      const isLiberado = missing.length === 0;

      return {
        ...atv,
        isLiberado,
        targetLessonNumber: targetNum,
        targetLessonCode: targetCode,
        targetLessonTitle: targetTitle,
        totalRequiredLessons: totalRequired,
        watchedRequiredLessons: watchedRequired,
      };
    });
  }, [atividades, sortedAulas, watchedLessonIds]);

  // Filtragem inicial: ativas, com entrega ou admin
  const atividadesVisiveis = useMemo(() => {
    return evaluatedAtividades.filter(
      (atv) => atv.is_ativo || registrosMap.has(atv.id) || isAdmin
    );
  }, [evaluatedAtividades, registrosMap, isAdmin]);

  // Separação em Disponíveis e Bloqueadas
  const { disponiveis, bloqueadas, concluidas } = useMemo(() => {
    const disp: AtividadeWithUnlock[] = [];
    const bloq: AtividadeWithUnlock[] = [];
    const conc: AtividadeWithUnlock[] = [];

    for (const atv of atividadesVisiveis) {
      const reg = registrosMap.get(atv.id);
      const isFinished = reg && (reg.status === 'Corrigido' || reg.status === 'Concluido');

      if (isFinished) {
        conc.push(atv);
      }

      if (isAdmin || isFinished || atv.isLiberado) {
        disp.push(atv);
      } else {
        bloq.push(atv);
      }
    }

    // Ordenação de Disponíveis: Sem nível primeiro, depois nível crescente
    disp.sort((a, b) => {
      if (a.targetLessonNumber !== null && b.targetLessonNumber !== null) {
        if (a.targetLessonNumber !== b.targetLessonNumber) {
          return a.targetLessonNumber - b.targetLessonNumber;
        }
        return a.titulo.localeCompare(b.titulo);
      }
      if (a.targetLessonNumber === null && b.targetLessonNumber !== null) return -1;
      if (a.targetLessonNumber !== null && b.targetLessonNumber === null) return 1;
      return a.titulo.localeCompare(b.titulo);
    });

    // Ordenação de Bloqueadas: estritamente por nível crescente
    bloq.sort((a, b) => {
      const numA = a.targetLessonNumber ?? 9999;
      const numB = b.targetLessonNumber ?? 9999;
      if (numA !== numB) return numA - numB;
      return a.titulo.localeCompare(b.titulo);
    });

    return { disponiveis: disp, bloqueadas: bloq, concluidas: conc };
  }, [atividadesVisiveis, isAdmin, registrosMap]);

  // Status helper
  const getStatusInfo = (atividadeId: string): StatusInfo => {
    const reg = registrosMap.get(atividadeId);
    if (!reg) return { label: 'Não iniciada', color: 'slate', icon: ClipboardList };

    if (reg.status === 'Corrigido' || reg.status === 'Concluido') {
      const nota = reg.dados?.correcao?.nota_total;
      return {
        label: 'Concluída',
        color: 'emerald',
        icon: CheckCircle2,
        sublabel: nota !== undefined ? `Nota: ${parseFloat(nota.toFixed(2)).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : undefined,
      };
    }
    if (reg.status === 'Pendente') return { label: 'Aguardando correção', color: 'amber', icon: Clock };
    if (reg.status === 'Rascunho') return { label: 'Em andamento', color: 'blue', icon: Clock };
    return { label: reg.status, color: 'slate', icon: AlertCircle };
  };

  const isInitialLoad = loadingAtividades || loadingAulas || loadingProgresso;

  // Lista a renderizar de acordo com a aba ativa
  const itemsToRender = useMemo(() => {
    if (activeTab === 'liberadas') return { disp: disponiveis, bloq: [] };
    if (activeTab === 'bloqueadas') return { disp: [], bloq: bloqueadas };
    if (activeTab === 'concluidas') return { disp: concluidas, bloq: [] };
    // Tab 'todas'
    return { disp: disponiveis, bloq: bloqueadas };
  }, [activeTab, disponiveis, bloqueadas, concluidas]);

  return (
    <div className="min-h-screen pb-24 font-sans pt-16 bg-slate-50">
      <SetNavbar title="Atividades" backLink="/dashboard" />

      <main className="max-w-3xl mx-auto px-4 mt-6 sm:mt-8 space-y-6">

        {/* ── Header Compacto e Elegante ── */}
        <div className="bg-chinese-pattern rounded-2xl p-5 sm:p-7 text-white shadow-lg relative overflow-hidden border border-tcm-darker-red">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-1">
                Provas & Atividades
              </h1>
              <p className="text-white/80 text-xs sm:text-sm">
                Avaliações práticas vinculadas às suas vídeo-aulas.
              </p>
            </div>

            {/* Quick Stats Pills */}
            {!isInitialLoad && atividadesVisiveis.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {disponiveis.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-lg px-2.5 py-1 text-xs font-semibold text-white">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                    {disponiveis.length} liberada{disponiveis.length > 1 ? 's' : ''}
                  </span>
                )}
                {bloqueadas.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-lg px-2.5 py-1 text-xs font-semibold text-amber-200">
                    <Lock className="w-3.5 h-3.5 text-amber-300" />
                    {bloqueadas.length} bloqueada{bloqueadas.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Filtro em Abas (Segmented Control) ── */}
        {!isInitialLoad && atividadesVisiveis.length > 0 && (
          <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('todas')}
              className={`flex-1 min-w-[75px] py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer text-center whitespace-nowrap ${
                activeTab === 'todas'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todas ({atividadesVisiveis.length})
            </button>
            <button
              onClick={() => setActiveTab('liberadas')}
              className={`flex-1 min-w-[85px] py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer text-center whitespace-nowrap ${
                activeTab === 'liberadas'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Liberadas ({disponiveis.length})
            </button>
            {bloqueadas.length > 0 && (
              <button
                onClick={() => setActiveTab('bloqueadas')}
                className={`flex-1 min-w-[95px] py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer text-center whitespace-nowrap ${
                  activeTab === 'bloqueadas'
                    ? 'bg-white text-amber-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bloqueadas ({bloqueadas.length})
              </button>
            )}
            {concluidas.length > 0 && (
              <button
                onClick={() => setActiveTab('concluidas')}
                className={`flex-1 min-w-[90px] py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer text-center whitespace-nowrap ${
                  activeTab === 'concluidas'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Concluídas ({concluidas.length})
              </button>
            )}
          </div>
        )}

        {/* ── Conteúdo ── */}
        {isInitialLoad ? (
          <div className="space-y-3">
            {[1, 2, 3].map(n => (
              <SkeletonCard key={n} />
            ))}
          </div>
        ) : atividadesVisiveis.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-bold text-base">Nenhuma atividade cadastrada.</p>
            <p className="text-slate-400 text-xs mt-0.5">As avaliações aparecerão aqui quando publicadas.</p>
          </div>
        ) : (
          <div className="space-y-6">

            {/* Lista de Atividades Liberadas / Concluídas */}
            {itemsToRender.disp.length > 0 && (
              <div className="space-y-3">
                {itemsToRender.disp.map(atv => {
                  const status = getStatusInfo(atv.id);
                  const reg = getRegistro(atv.id);
                  const isConcluida = reg?.status === 'Corrigido' || reg?.status === 'Concluido';
                  const isPendente = reg?.status === 'Pendente';
                  const canReview = isConcluida || isPendente;
                  const statusLoading = loadingRegistros && !registros.length;

                  return (
                    <ActivityCard
                      key={atv.id}
                      atv={atv}
                      status={status}
                      statusLoading={statusLoading}
                      canReview={canReview}
                      isConcluida={isConcluida}
                      isAdmin={isAdmin}
                      onClick={() => router.push(`/dashboard/atividades/${atv.id}`)}
                      onMouseEnter={() => router.prefetch(`/dashboard/atividades/${atv.id}`)}
                    />
                  );
                })}
              </div>
            )}

            {/* Aviso limpo se todas estiverem bloqueadas na aba 'liberadas' */}
            {activeTab === 'liberadas' && itemsToRender.disp.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
                <Lock className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <h3 className="font-bold text-slate-800 text-sm">Nenhuma atividade liberada ainda</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Assista às vídeo-aulas da sua trilha para desbloquear as avaliações.
                </p>
                <button
                  onClick={() => setActiveTab('bloqueadas')}
                  className="mt-3 text-xs font-bold text-tcm-red hover:underline cursor-pointer"
                >
                  Ver atividades bloqueadas →
                </button>
              </div>
            )}

            {/* Lista de Atividades Bloqueadas */}
            {itemsToRender.bloq.length > 0 && (
              <div className="space-y-3">
                {/* Cabeçalho sutil se estiver na visão 'todas' e tiver liberadas */}
                {activeTab === 'todas' && itemsToRender.disp.length > 0 && (
                  <div className="flex items-center gap-2 pt-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Próximas na Trilha (Bloqueadas)
                    </span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>
                )}

                {itemsToRender.bloq.map(atv => (
                  <LockedActivityCard
                    key={atv.id}
                    atv={atv}
                    onGoToAulas={() => router.push('/dashboard')}
                  />
                ))}
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
}
