'use client';

import { QuestaoMultiplaEscolha, RespostaAluno, FragmentoMandarim } from '../../../../../types/atividades';
import MandarinFragment from './MandarinFragment';
import { Check } from 'lucide-react';

interface MultipleChoiceQuestionProps {
  questao: QuestaoMultiplaEscolha;
  resposta: RespostaAluno;
  onAnswer: (resposta: RespostaAluno) => void;
}

export default function MultipleChoiceQuestion({ questao, resposta, onAnswer }: MultipleChoiceQuestionProps) {
  const selectedIds = resposta.opcao_ids || [];

  const handleSelect = (opcaoId: string) => {
    let newIds: string[];

    if (questao.permite_multiplas_respostas) {
      newIds = selectedIds.includes(opcaoId)
        ? selectedIds.filter(id => id !== opcaoId)
        : [...selectedIds, opcaoId];
    } else {
      newIds = [opcaoId];
    }

    onAnswer({ ...resposta, opcao_ids: newIds });
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
        {questao.permite_multiplas_respostas
          ? 'Selecione todas as corretas'
          : 'Selecione a resposta correta'}
      </p>

      {questao.opcoes.map((opcao, idx) => {
        const isSelected = selectedIds.includes(opcao.id);
        const letter = String.fromCharCode(65 + idx); // A, B, C, D...

        return (
          <button
            key={opcao.id}
            onClick={() => handleSelect(opcao.id)}
            className={`w-full text-left flex items-center gap-4 p-4 rounded-xl border-2 transition-all group ${
              isSelected
                ? 'border-tcm-red bg-red-50/60 shadow-sm'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            {/* Letter badge or checkmark */}
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 transition-all ${
                isSelected
                  ? 'bg-tcm-red text-white shadow-md'
                  : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
              }`}
            >
              {isSelected ? <Check className="w-5 h-5" /> : letter}
            </div>

            {/* Option content */}
            <div className="flex-1 min-w-0">
              {opcao.conteudo_mandarim ? (
                <MandarinFragment fragment={opcao.conteudo_mandarim as FragmentoMandarim} size="sm" />
              ) : (
                <span className={`text-sm sm:text-[15px] font-medium ${isSelected ? 'text-tcm-dark-red' : 'text-slate-700'}`}>
                  {opcao.texto_simples}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
