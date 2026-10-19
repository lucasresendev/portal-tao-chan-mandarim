'use client';

import { CheckCircle2, XCircle, MinusCircle, HelpCircle, Zap } from 'lucide-react';

export type StatusCorrecao = 'correto' | 'parcial' | 'incorreto' | 'pendente_correcao';

export interface DetalheCorrecao {
  pontos_obtidos: number;
  status: StatusCorrecao;
  feedback_professor?: string;
  /** true when this grade was set automatically and not yet edited by the admin */
  auto?: boolean;
}

interface Props {
  questaoId: string;
  pontuacaoMaxima: number;
  detalhe: DetalheCorrecao;
  onChange: (id: string, detalhe: DetalheCorrecao) => void;
}

const STATUSES: { value: StatusCorrecao; label: string; icon: React.ElementType; active: string; idle: string }[] = [
  { value: 'correto',           label: 'Correto',   icon: CheckCircle2, active: 'bg-emerald-500 text-white border-emerald-600', idle: 'bg-white text-slate-500 border-slate-200 hover:border-emerald-300' },
  { value: 'parcial',           label: 'Parcial',   icon: MinusCircle,  active: 'bg-amber-500 text-white border-amber-600',   idle: 'bg-white text-slate-500 border-slate-200 hover:border-amber-300'   },
  { value: 'incorreto',         label: 'Incorreto', icon: XCircle,      active: 'bg-red-500 text-white border-red-600',        idle: 'bg-white text-slate-500 border-slate-200 hover:border-red-300'    },
  { value: 'pendente_correcao', label: 'Pendente',  icon: HelpCircle,   active: 'bg-slate-400 text-white border-slate-500',   idle: 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'  },
];

export default function GradingPanel({ questaoId, pontuacaoMaxima, detalhe, onChange }: Props) {
  /** Every manual edit clears the 'auto' flag */
  const update = (patch: Partial<DetalheCorrecao>) =>
    onChange(questaoId, { ...detalhe, ...patch, auto: false });

  return (
    <div className="space-y-3 pt-4 border-t border-slate-100">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avaliação</p>
        {detalhe.auto && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
            <Zap className="w-3 h-3" /> Corrigido automaticamente
          </span>
        )}
      </div>

      {/* Status buttons */}
      <div className="flex flex-wrap gap-2">
        {STATUSES.map(s => {
          const Icon = s.icon;
          const isActive = detalhe.status === s.value;
          return (
            <button
              key={s.value}
              onClick={() => {
                const pts = s.value === 'correto' ? pontuacaoMaxima
                  : s.value === 'incorreto' ? 0
                  : detalhe.pontos_obtidos;
                update({ status: s.value, pontos_obtidos: pts });
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${isActive ? s.active : s.idle}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Points */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-bold text-slate-500 shrink-0">Pontos:</label>
        <input
          type="number"
          min={0}
          max={pontuacaoMaxima}
          step={0.5}
          value={detalhe.pontos_obtidos}
          onChange={e => update({ pontos_obtidos: Math.min(pontuacaoMaxima, Math.max(0, Number(e.target.value))) })}
          className="w-20 text-center border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-bold outline-none focus:border-indigo-400 transition-colors"
        />
        <span className="text-xs text-slate-400">/ {pontuacaoMaxima}</span>
      </div>

      {/* Feedback */}
      <textarea
        value={detalhe.feedback_professor ?? ''}
        onChange={e => update({ feedback_professor: e.target.value })}
        placeholder="Feedback para o aluno (opcional)..."
        rows={2}
        className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 resize-none outline-none focus:border-indigo-400 placeholder:text-slate-300 transition-colors"
      />
    </div>
  );
}
