'use client';

import { QuestaoLacunas, RespostaAluno } from '../../../../../types/atividades';
import parse, { HTMLReactParserOptions } from 'html-react-parser';
import { Fragment } from 'react';

interface Props {
  questao: QuestaoLacunas;
  resposta: RespostaAluno;
  onAnswer: (r: RespostaAluno) => void;
}

export default function FillBlanksQuestion({ questao, resposta, onAnswer }: Props) {
  const texto = questao.texto_com_lacunas || '';
  const numLacunas = (texto.match(/\[___\]/g) || []).length;
  const mapa = resposta.mapa_lacunas || {};

  const handleChange = (lacunaKey: string, value: string) => {
    const newMapa = { ...mapa, [lacunaKey]: value };
    onAnswer({ ...resposta, mapa_lacunas: newMapa });
  };

  let globalLacunaIndex = 0;

  const options: HTMLReactParserOptions = {
    replace: (domNode) => {
      if (domNode.type === 'text' && domNode.data) {
        const content = domNode.data;
        if (!content.includes('[___]')) {
          return undefined; // keep as is
        }
        const parts = content.split(/\[___\]/g);
        const result = [];
        for (let i = 0; i < parts.length; i++) {
          result.push(<Fragment key={`text-${globalLacunaIndex}-${i}`}>{parts[i]}</Fragment>);
          if (i < parts.length - 1) {
            const currentIdx = globalLacunaIndex++;
            result.push(
              <input
                key={`input-${currentIdx}`}
                type="text"
                value={mapa[`lacuna_${currentIdx}`] || ''}
                onChange={e => handleChange(`lacuna_${currentIdx}`, e.target.value)}
                placeholder={`Lacuna ${currentIdx + 1}`}
                className="inline-block mx-1 px-3 py-1 w-32 sm:w-40 text-center border-b-2 border-tcm-red bg-tcm-red/5 rounded-lg text-tcm-dark-red font-medium text-sm outline-none focus:bg-tcm-red/10 focus:border-tcm-dark-red transition-all placeholder:text-slate-300"
                autoComplete="off"
              />
            );
          }
        }
        return <>{result}</>;
      }
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
        Preencha as lacunas
      </p>

      {/* Rendered text with inline inputs */}
      <div className="text-[15px] sm:text-base leading-loose text-slate-800 [&_p]:mb-3 [&_p:last-child]:mb-0 [&_div]:mb-3 [&_div:last-child]:mb-0">
        {parse(texto, options)}
      </div>

      {/* Separate input list for mobile */}
      {numLacunas > 2 && (
        <div className="sm:hidden mt-4 space-y-3 bg-slate-50 rounded-xl p-4 border border-slate-200">
          <p className="text-xs font-bold text-slate-500 mb-2">Respostas por lacuna:</p>
          {Array.from({ length: numLacunas }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs font-mono bg-tcm-red/10 text-tcm-red px-2 py-1 rounded shrink-0">
                #{i + 1}
              </span>
              <input
                type="text"
                value={mapa[`lacuna_${i}`] || ''}
                onChange={e => handleChange(`lacuna_${i}`, e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-tcm-red"
                placeholder="Sua resposta..."
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
