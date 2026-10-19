'use client';

import { ReactNode, Fragment } from 'react';
import { QuestaoProva, FragmentoMandarim } from '../../../../../types/atividades';
import MandarinFragment from './MandarinFragment';
import MediaDisplay from './MediaDisplay';
import { Lightbulb } from 'lucide-react';
import parse, { HTMLReactParserOptions } from 'html-react-parser';

interface QuestionShellProps {
  questao: QuestaoProva;
  questionNumber: number;
  totalQuestions: number;
  children: ReactNode;
}

/** Renders the enunciado text, replacing [X] markers with Mandarin fragment components and rendering HTML formatting */
function renderEnunciado(enunciado: string, fragmentos?: Record<string, FragmentoMandarim>) {
  if (!fragmentos || !enunciado.includes('[X]')) {
    return <div className="text-slate-800 text-[15px] sm:text-base leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0 [&_div]:mb-3 [&_div:last-child]:mb-0" dangerouslySetInnerHTML={{ __html: enunciado }} />;
  }

  let globalXIndex = 0;

  const options: HTMLReactParserOptions = {
    replace: (domNode) => {
      if (domNode.type === 'text' && domNode.data) {
        const content = domNode.data;
        if (!content.includes('[X]')) {
          return undefined; // keep as is
        }
        const parts = content.split(/\[X\]/g);
        const result = [];
        for (let i = 0; i < parts.length; i++) {
          result.push(<Fragment key={`text-${globalXIndex}-${i}`}>{parts[i]}</Fragment>);
          if (i < parts.length - 1) {
            const currentIdx = globalXIndex++;
            const frag = fragmentos[`frag_${currentIdx}`];
            if (frag) {
              result.push(<span key={`frag-${currentIdx}`} className="inline-block mx-1 translate-y-1"><MandarinFragment fragment={frag} size="md" /></span>);
            } else {
              result.push(<span key={`placeholder-${currentIdx}`} className="inline-block w-12 h-6 bg-slate-200 rounded mx-1 align-middle" />);
            }
          }
        }
        return <>{result}</>;
      }
    }
  };

  return (
    <div className="text-slate-800 text-[15px] sm:text-base leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0 [&_div]:mb-3 [&_div:last-child]:mb-0">
      {parse(enunciado, options)}
    </div>
  );
}

export default function QuestionShell({ questao, questionNumber, totalQuestions, children }: QuestionShellProps) {
  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Question header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-tcm-red text-white w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm">
            {questionNumber}
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">
              Questão {questionNumber} de {totalQuestions}
            </p>
            <p className="text-xs text-slate-500 font-bold capitalize">
              {questao.pontuacao_maxima} {questao.pontuacao_maxima === 1 ? 'ponto' : 'pontos'}
            </p>
          </div>
        </div>
      </div>

      {/* Enunciado */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        {renderEnunciado(questao.enunciado, questao.fragmentos_mandarim)}

        {/* Media attached to question */}
        {questao.midia_anexa && questao.midia_anexa.url && (
          <div className="mt-4">
            <MediaDisplay tipo={questao.midia_anexa.tipo} url={questao.midia_anexa.url} id={questao.id} />
          </div>
        )}

        {/* Hint */}
        {questao.dica && (
          <div className="mt-3 flex items-start gap-2.5 bg-amber-50 border border-amber-200 p-3.5 rounded-xl">
            <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">{questao.dica}</p>
          </div>
        )}
      </div>

      {/* Question-specific answer area */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
}
