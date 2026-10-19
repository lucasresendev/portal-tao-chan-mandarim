'use client';

import { QuestaoProva, RespostaAluno } from '../../../../../types/atividades';
import { Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface Props {
  questoes: QuestaoProva[];
  respostas: Record<string, RespostaAluno>;
  onNavigateToQuestion: (step: number) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

function isAnswered(r?: RespostaAluno): boolean {
  if (!r) return false;
  if (r.opcao_ids && r.opcao_ids.length > 0) return true;
  if (r.texto && r.texto.trim().length > 0) return true;
  if (r.midia_url) return true;
  if (r.mapa_lacunas && Object.values(r.mapa_lacunas).some(v => v.trim().length > 0)) return true;
  return false;
}

const tipoLabels: Record<string, string> = {
  multipla_escolha: 'Múltipla Escolha',
  ordenacao: 'Ordenação',
  texto_livre: 'Texto Livre',
  audio_upload: 'Áudio',
  preencher_lacunas: 'Lacunas',
};

export default function SubmissionPage({ questoes, respostas, onNavigateToQuestion, onSubmit, isSubmitting }: Props) {
  const answeredCount = questoes.filter(q => isAnswered(respostas[q.id])).length;
  const totalCount = questoes.length;
  const allAnswered = answeredCount === totalCount;
  const percent = Math.round((answeredCount / totalCount) * 100);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Summary header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm text-center space-y-4">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${allAnswered ? 'bg-emerald-100' : 'bg-amber-100'}`}>
          {allAnswered
            ? <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            : <AlertCircle className="w-8 h-8 text-amber-600" />
          }
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            {allAnswered ? 'Tudo pronto para enviar!' : 'Revise suas respostas'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {answeredCount} de {totalCount} questões respondidas ({percent}%)
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-xs mx-auto bg-slate-100 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${allAnswered ? 'bg-emerald-500' : 'bg-amber-500'}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Question list review */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
        {questoes.map((q, i) => {
          const answered = isAnswered(respostas[q.id]);
          return (
            <button
              key={q.id}
              onClick={() => onNavigateToQuestion(i + 1)}
              className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors text-left group"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                answered ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
              }`}>
                {answered ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {q.enunciado.replace(/<[^>]+>/g, '').slice(0, 80)}{q.enunciado.replace(/<[^>]+>/g, '').length > 80 ? '...' : ''}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {tipoLabels[q.tipo] || q.tipo} • {q.pontuacao_maxima} pts
                </p>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-md shrink-0 ${
                answered ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
              }`}>
                {answered ? 'Respondida' : 'Pendente'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Warning for unanswered */}
      {!allAnswered && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800">Questões não respondidas</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {`Você tem ${totalCount - answeredCount} ${totalCount - answeredCount === 1 ? 'questão' : 'questões'} sem resposta. Clique nela para responder ou envie mesmo assim.`}
            </p>
          </div>
        </div>
      )}

      {/* Submit button */}
      <button
        onClick={onSubmit}
        disabled={isSubmitting}
        className="w-full py-4 bg-tcm-red hover:bg-tcm-dark-red text-white font-bold text-base rounded-2xl transition-colors shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Enviando...</>
        ) : (
          <><Send className="w-5 h-5" /> Enviar Atividade</>
        )}
      </button>
    </div>
  );
}
