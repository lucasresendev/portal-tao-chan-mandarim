'use client';

import { Check, FileText, Send, ChevronLeft, ChevronRight, CheckCircle2, MinusCircle, XCircle, HelpCircle } from 'lucide-react';
import { RespostaAluno } from '../../../../../types/atividades';

type StatusCorrecao = 'correto' | 'parcial' | 'incorreto' | 'pendente_correcao';

interface DetalheCorrecao {
  pontos_obtidos: number;
  status: StatusCorrecao;
}

interface Props {
  totalQuestions: number;
  currentStep: number; // 0 = instrução, 1..N = questões, N+1 = envio
  onNavigate: (step: number) => void;
  respostas: Record<string, RespostaAluno>;
  questaoIds: string[];
  /** In review mode: hides instruction and submit pills, clamps navigation to question range */
  reviewMode?: boolean;
  /** Correction details per question id — drives pill color in review mode */
  correcaoDetalhes?: Record<string, DetalheCorrecao>;
}

function isAnswered(r?: RespostaAluno): boolean {
  if (!r) return false;
  if (r.opcao_ids && r.opcao_ids.length > 0) return true;
  if (r.texto && r.texto.trim().length > 0) return true;
  if (r.midia_url) return true;
  if (r.mapa_lacunas && Object.values(r.mapa_lacunas).some(v => v.trim().length > 0)) return true;
  return false;
}

export default function QuestionNavigator({
  totalQuestions,
  currentStep,
  onNavigate,
  respostas,
  questaoIds,
  reviewMode = false,
  correcaoDetalhes,
}: Props) {
  const isFirst = reviewMode ? currentStep <= 1 : currentStep === 0;
  const isLast  = reviewMode ? currentStep >= totalQuestions : currentStep === totalQuestions + 1;

  // Correction status → pill style
  const STATUS_PILL: Record<StatusCorrecao, { bg: string; text: string; border: string; Icon: React.ElementType }> = {
    correto:           { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', Icon: CheckCircle2 },
    parcial:           { bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-200',   Icon: MinusCircle  },
    incorreto:         { bg: 'bg-red-100',     text: 'text-red-700',     border: 'border-red-200',     Icon: XCircle      },
    pendente_correcao: { bg: 'bg-slate-100',   text: 'text-slate-500',   border: 'border-slate-200',   Icon: HelpCircle   },
  };

  return (
    <div className="space-y-3">
      {/* Step pills - scrollable */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 px-1">
        {/* Instruction pill — hidden in review mode */}
        {!reviewMode && (
          <button
            onClick={() => onNavigate(0)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              currentStep === 0
                ? 'bg-tcm-red text-white shadow-md'
                : 'bg-white text-slate-500 border border-slate-200 hover:border-tcm-red hover:text-tcm-red'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Instruções</span>
            <span className="sm:hidden">Início</span>
          </button>
        )}

        {/* Question pills */}
        {Array.from({ length: totalQuestions }).map((_, i) => {
          const step = i + 1;
          const isCurrent = currentStep === step;
          const answered = isAnswered(respostas[questaoIds[i]]);
          const detalhe = correcaoDetalhes?.[questaoIds[i]];

          // When correction exists, use correction status for styling
          if (!isCurrent && detalhe) {
            const s = STATUS_PILL[detalhe.status] ?? STATUS_PILL.pendente_correcao;
            const Icon = s.Icon;
            return (
              <button
                key={i}
                onClick={() => onNavigate(step)}
                className={`shrink-0 w-10 h-10 rounded-xl text-xs font-bold transition-all flex items-center justify-center border ${s.bg} ${s.text} ${s.border} hover:brightness-95`}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          }

          return (
            <button
              key={i}
              onClick={() => onNavigate(step)}
              className={`shrink-0 w-10 h-10 rounded-xl text-xs font-bold transition-all flex items-center justify-center relative ${
                isCurrent
                  ? 'bg-tcm-red text-white shadow-md scale-110'
                  : answered
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200'
                  : 'bg-white text-slate-500 border border-slate-200 hover:border-tcm-red hover:text-tcm-red'
              }`}
            >
              {answered && !isCurrent ? <Check className="w-4 h-4" /> : step}
            </button>
          );
        })}

        {/* Submit pill — hidden in review mode */}
        {!reviewMode && (
          <button
            onClick={() => onNavigate(totalQuestions + 1)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              currentStep === totalQuestions + 1
                ? 'bg-tcm-red text-white shadow-md'
                : 'bg-white text-slate-500 border border-slate-200 hover:border-tcm-red hover:text-tcm-red'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Enviar</span>
          </button>
        )}
      </div>

      {/* Previous / Next navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => onNavigate(currentStep - 1)}
          disabled={isFirst}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-white border border-slate-200 text-slate-600 hover:border-tcm-red hover:text-tcm-red"
        >
          <ChevronLeft className="w-4 h-4" />
          Anterior
        </button>

        <span className="text-xs text-slate-400 font-medium">
          {reviewMode
            ? `${currentStep} / ${totalQuestions}`
            : currentStep === 0
            ? 'Instruções'
            : currentStep <= totalQuestions
            ? `${currentStep}/${totalQuestions}`
            : 'Revisão'}
        </span>

        <button
          onClick={() => onNavigate(currentStep + 1)}
          disabled={isLast}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
            !reviewMode && currentStep === totalQuestions
              ? 'bg-tcm-red text-white hover:bg-tcm-dark-red shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:border-tcm-red hover:text-tcm-red'
          }`}
        >
          {!reviewMode && currentStep === totalQuestions ? 'Revisar' : 'Próxima'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
