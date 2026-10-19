'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useNavbar } from '../../../../components/NavbarContext';
import {
  Loader2, Users, CheckCircle2, Clock, AlertCircle,
  ChevronRight, FileText, Award, RefreshCw, Trash2, RotateCcw,
  X, TriangleAlert,
} from 'lucide-react';
import { DadosRegistroProva } from '../../../../../types/atividades';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Registro {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  dados: DadosRegistroProva;
  aluno: { id: string; nome: string } | null;
}

interface AtividadeInfo {
  id: string;
  titulo: string;
}

type ActionType = 'delete' | 'revert' | null;

interface PendingAction {
  type: ActionType;
  registro: Registro;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  Rascunho:  { label: 'Rascunho',           color: 'bg-slate-100 text-slate-600',     icon: FileText      },
  Pendente:  { label: 'Aguardando Correção', color: 'bg-amber-100 text-amber-700',    icon: Clock         },
  Corrigido: { label: 'Corrigido',           color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  Concluido: { label: 'Concluído',           color: 'bg-blue-100 text-blue-700',      icon: Award         },
  Arquivado: { label: 'Arquivado',           color: 'bg-slate-100 text-slate-500',    icon: AlertCircle   },
};

const FILTROS = ['todos', 'Pendente', 'Corrigido', 'Rascunho'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTs(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function calcTempo(dados: DadosRegistroProva): { segundos: number; emAndamento: boolean } | null {
  // Prefer the precise field recorded at submit time
  if (typeof dados?.tempo_gasto_segundos === 'number') {
    return { segundos: dados.tempo_gasto_segundos, emAndamento: false };
  }
  if (dados?.finalizado_em && dados?.iniciado_em) {
    const s = Math.round(
      (new Date(dados.finalizado_em).getTime() - new Date(dados.iniciado_em).getTime()) / 1000,
    );
    return { segundos: s, emAndamento: false };
  }
  // Has started but not finished
  if (dados?.iniciado_em) {
    const s = Math.round((Date.now() - new Date(dados.iniciado_em).getTime()) / 1000);
    return { segundos: s, emAndamento: true };
  }
  return null;
}

function formatTempo(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`;
  if (m > 0) return `${m}min ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

// ─── Modal de Confirmação ─────────────────────────────────────────────────────

interface ConfirmModalProps {
  action: PendingAction;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

function ConfirmModal({ action, onConfirm, onCancel, loading }: ConfirmModalProps) {
  const isDelete = action.type === 'delete';
  const nomeAluno = action.registro.aluno?.nome ?? 'Aluno desconhecido';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-5 animate-in zoom-in-95 duration-200">
        {/* Icon */}
        <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center ${
          isDelete ? 'bg-red-100' : 'bg-amber-100'
        }`}>
          {isDelete
            ? <Trash2 className="w-7 h-7 text-red-600" />
            : <RotateCcw className="w-7 h-7 text-amber-600" />
          }
        </div>

        {/* Title */}
        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold text-slate-900">
            {isDelete ? 'Apagar entrega?' : 'Reverter para Rascunho?'}
          </h2>
          <p className="text-sm text-slate-500">
            {isDelete
              ? <>A entrega de <strong className="text-slate-700">{nomeAluno}</strong> será removida. Um backup automático é salvo na lixeira.</>
              : <>O status de <strong className="text-slate-700">{nomeAluno}</strong> voltará para Rascunho — o aluno poderá editar as respostas novamente.</>
            }
          </p>
        </div>

        {/* Warning (delete only) */}
        {isDelete && (
          <div className="flex items-start gap-2.5 bg-red-50 rounded-2xl p-3.5">
            <TriangleAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-600 leading-relaxed">
              Essa ação <strong>não pode ser desfeita</strong> na interface. Os dados ficam na lixeira do banco, mas só um desenvolvedor pode restaurá-los.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2 ${
              isDelete
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-amber-500 hover:bg-amber-600'
            }`}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isDelete ? 'Sim, apagar' : 'Sim, reverter'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Row de Registro ──────────────────────────────────────────────────────────

interface RegistroRowProps {
  reg: Registro;
  isLast: boolean;
  onNavigate: () => void;
  onDelete: () => void;
  onRevert: () => void;
}

function RegistroRow({ reg, isLast, onNavigate, onDelete, onRevert }: RegistroRowProps) {
  const cfg = STATUS_CONFIG[reg.status] ?? STATUS_CONFIG['Rascunho'];
  const Icon = cfg.icon;
  const nota = reg.dados?.correcao?.nota_total;
  const numRespostas = Object.keys(reg.dados?.respostas ?? {}).length;
  const tempo = calcTempo(reg.dados);
  const podeReverter = reg.status === 'Pendente' || reg.status === 'Corrigido' || reg.status === 'Concluido';

  return (
    <div className={`flex items-center gap-1 group ${!isLast ? 'border-b border-slate-100' : ''}`}>
      {/* Clickable area → navigate */}
      <button
        onClick={onNavigate}
        className="flex-1 flex items-center gap-4 p-5 text-left hover:bg-slate-50 transition-colors min-w-0"
      >
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-sm shrink-0">
          {reg.aluno?.nome?.charAt(0).toUpperCase() ?? '?'}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 truncate">
            {reg.aluno?.nome ?? 'Aluno desconhecido'}
          </p>
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
            <span>{numRespostas} resposta{numRespostas !== 1 ? 's' : ''}</span>
            {tempo !== null && (
              <span className={`flex items-center gap-1 ${tempo.emAndamento ? 'text-amber-500 font-semibold' : ''}`}>
                • {tempo.emAndamento ? '⏱ ' : ''}{formatTempo(tempo.segundos)}{tempo.emAndamento ? ' (em andamento)' : ''}
              </span>
            )}
            <span>• {formatTs(reg.updated_at)}</span>
          </p>
        </div>

        {/* Nota */}
        {nota !== undefined && (
          <div className="text-right shrink-0">
            <p className="text-lg font-bold text-emerald-700">{parseFloat(nota.toFixed(2)).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
            <p className="text-[10px] text-slate-400 uppercase">pts</p>
          </div>
        )}

        {/* Status badge */}
        <span className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${cfg.color}`}>
          <Icon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{cfg.label}</span>
        </span>

        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0" />
      </button>

      {/* Action buttons — visible on hover or always on mobile */}
      <div className="flex items-center gap-1 pr-3 shrink-0">
        {podeReverter && (
          <button
            onClick={(e) => { e.stopPropagation(); onRevert(); }}
            title="Reverter para Rascunho"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Apagar entrega"
          className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EntregasAtividadePage() {
  const { atividadeId } = useParams() as { atividadeId: string };
  const router = useRouter();
  const supabase = createClientComponentClient();
  const { setNavbar } = useNavbar();

  const [atividade, setAtividade] = useState<AtividadeInfo | null>(null);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Navbar ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    setNavbar({ title: 'Entregas', rightContent: null, backLink: '/admin/atividades' });
    return () => setNavbar({ title: '', rightContent: null });
  }, [setNavbar]);

  // ── Data fetching ────────────────────────────────────────────────────────────

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    const [{ data: atv }, { data: regs }] = await Promise.all([
      supabase.from('atividades').select('id, titulo').eq('id', atividadeId).single(),
      supabase
        .from('registros_dinamicos')
        .select('id, status, created_at, updated_at, dados, aluno:alunos(id, nome)')
        .eq('atividade_id', atividadeId)
        .order('updated_at', { ascending: false }),
    ]);

    if (atv) setAtividade(atv as AtividadeInfo);
    if (regs) {
      const parsed = (regs as unknown as Array<
        Omit<Registro, 'aluno'> & { aluno: { id: string; nome: string }[] | { id: string; nome: string } | null }
      >).map(r => ({
        ...r,
        aluno: Array.isArray(r.aluno) ? (r.aluno[0] ?? null) : r.aluno,
      })) as Registro[];
      setRegistros(parsed);
    }

    setLastUpdate(new Date());
    setLoading(false);
    setRefreshing(false);
  }, [atividadeId, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Toast ────────────────────────────────────────────────────────────────────

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Delete with backup ───────────────────────────────────────────────────────

  const handleDelete = useCallback(async (reg: Registro) => {
    setActionLoading(true);
    try {
      // 1. Backup na lixeira antes de deletar
      const { error: backupErr } = await supabase
        .from('registros_dinamicos_lixeira')
        .insert({
          registro_id:   reg.id,
          atividade_id:  atividadeId,
          aluno_id:      reg.aluno?.id ?? null,
          status:        reg.status,
          dados:         reg.dados,
          criado_em:     reg.created_at,
          atualizado_em: reg.updated_at,
          motivo:        'Apagado manualmente pelo admin',
        });

      if (backupErr) throw new Error(`Backup falhou: ${backupErr.message}`);

      // 2. Deletar o registro original
      const { error: deleteErr } = await supabase
        .from('registros_dinamicos')
        .delete()
        .eq('id', reg.id);

      if (deleteErr) throw new Error(`Delete falhou: ${deleteErr.message}`);

      setRegistros(prev => prev.filter(r => r.id !== reg.id));
      showToast('Entrega apagada (backup salvo na lixeira).');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao apagar.', 'error');
    } finally {
      setActionLoading(false);
      setPendingAction(null);
    }
  }, [atividadeId, supabase, showToast]);

  // ── Revert to draft ──────────────────────────────────────────────────────────

  const handleRevert = useCallback(async (reg: Registro) => {
    setActionLoading(true);
    try {
      // Remove finalizado_em e correcao para que o aluno possa re-editar livremente
      const dadosAtualizados = {
        ...reg.dados,
        finalizado_em: undefined,
        correcao: undefined,
      };

      const { error } = await supabase
        .from('registros_dinamicos')
        .update({
          status: 'Rascunho',
          dados: dadosAtualizados,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reg.id);

      if (error) throw new Error(error.message);

      setRegistros(prev =>
        prev.map(r =>
          r.id === reg.id
            ? { ...r, status: 'Rascunho', dados: dadosAtualizados as DadosRegistroProva, updated_at: new Date().toISOString() }
            : r,
        ),
      );
      showToast(`${reg.aluno?.nome ?? 'Aluno'} pode editar as respostas novamente.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao reverter.', 'error');
    } finally {
      setActionLoading(false);
      setPendingAction(null);
    }
  }, [supabase, showToast]);

  // ── Confirm action ───────────────────────────────────────────────────────────

  const handleConfirm = useCallback(() => {
    if (!pendingAction) return;
    if (pendingAction.type === 'delete') handleDelete(pendingAction.registro);
    else if (pendingAction.type === 'revert') handleRevert(pendingAction.registro);
  }, [pendingAction, handleDelete, handleRevert]);

  // ── Derived data ─────────────────────────────────────────────────────────────

  const filtrados = registros.filter(r =>
    filtroStatus === 'todos' ? true : r.status === filtroStatus,
  );

  const contagem = {
    total:     registros.length,
    pendente:  registros.filter(r => r.status === 'Pendente').length,
    corrigido: registros.filter(r => r.status === 'Corrigido' || r.status === 'Concluido').length,
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen pb-20 font-sans pt-16 bg-slate-50">
        <main className="max-w-4xl mx-auto px-4 mt-8 space-y-6">

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-slate-900">Entregas</h1>
              <p className="text-slate-500 text-sm">{atividade?.titulo}</p>
              {lastUpdate && (
                <p className="text-[11px] text-slate-400">
                  Atualizado às {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
              )}
            </div>

            {/* Reload button */}
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              title="Recarregar entregas"
              className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Recarregar</span>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center shadow-sm">
              <Users className="w-5 h-5 text-slate-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-slate-800">{contagem.total}</p>
              <p className="text-xs text-slate-500">Entregas</p>
            </div>
            <div className="bg-white rounded-2xl border border-amber-200 p-4 text-center shadow-sm">
              <Clock className="w-5 h-5 text-amber-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-amber-700">{contagem.pendente}</p>
              <p className="text-xs text-amber-600">Para Corrigir</p>
            </div>
            <div className="bg-white rounded-2xl border border-emerald-200 p-4 text-center shadow-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-emerald-700">{contagem.corrigido}</p>
              <p className="text-xs text-emerald-600">Corrigidas</p>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {FILTROS.map(f => (
              <button
                key={f}
                onClick={() => setFiltroStatus(f)}
                className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  filtroStatus === f
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-slate-500 border border-slate-200 hover:border-indigo-300'
                }`}
              >
                {f === 'todos' ? 'Todas' : STATUS_CONFIG[f]?.label ?? f}
                {f !== 'todos' && (
                  <span className="ml-1.5 text-[10px] opacity-70">
                    ({registros.filter(r => r.status === f).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* List */}
          {filtrados.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-16 text-center">
              <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Nenhuma entrega encontrada.</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              {filtrados.map((reg, i) => (
                <RegistroRow
                  key={reg.id}
                  reg={reg}
                  isLast={i === filtrados.length - 1}
                  onNavigate={() => router.push(`/admin/atividades/entregas/${atividadeId}/${reg.id}`)}
                  onDelete={() => setPendingAction({ type: 'delete', registro: reg })}
                  onRevert={() => setPendingAction({ type: 'revert', registro: reg })}
                />
              ))}
            </div>
          )}

          {/* Legend */}
          <p className="text-[11px] text-slate-400 text-center">
            Passe o mouse sobre uma entrega para ver opções de apagar ou reverter.
          </p>
        </main>
      </div>

      {/* Confirm modal */}
      {pendingAction && (
        <ConfirmModal
          action={pendingAction}
          onConfirm={handleConfirm}
          onCancel={() => setPendingAction(null)}
          loading={actionLoading}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold animate-in slide-in-from-bottom-4 duration-300 ${
          toast.type === 'success'
            ? 'bg-slate-900 text-white'
            : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0" />}
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-1 opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}
