'use client';

import { QuestaoTextoLivre, RespostaAluno } from '../../../../../types/atividades';
import { PenLine } from 'lucide-react';

interface FreeTextQuestionProps {
  questao: QuestaoTextoLivre;
  resposta: RespostaAluno;
  onAnswer: (resposta: RespostaAluno) => void;
}

export default function FreeTextQuestion({ questao, resposta, onAnswer }: FreeTextQuestionProps) {
  const texto = resposta.texto || '';
  const limite = questao.limite_caracteres;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <PenLine className="w-3.5 h-3.5" />
          Sua resposta
        </p>
        {limite && (
          <span className={`text-xs font-medium ${texto.length > limite ? 'text-red-500' : 'text-slate-400'}`}>
            {texto.length}/{limite}
          </span>
        )}
      </div>

      <textarea
        value={texto}
        onChange={e => {
          const val = limite ? e.target.value.slice(0, limite) : e.target.value;
          onAnswer({ ...resposta, texto: val });
        }}
        maxLength={limite || undefined}
        rows={6}
        placeholder="Digite sua resposta aqui..."
        className="w-full rounded-xl border-2 border-slate-200 px-4 py-3.5 text-sm sm:text-[15px] outline-none resize-y min-h-[140px] transition-colors focus:border-tcm-red focus:ring-1 focus:ring-tcm-red/20 placeholder:text-slate-300"
      />
    </div>
  );
}
