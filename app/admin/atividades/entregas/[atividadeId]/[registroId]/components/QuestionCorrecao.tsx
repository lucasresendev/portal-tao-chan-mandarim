'use client';

import { QuestaoProva, RespostaAluno, FragmentoMandarim } from '../../../../../../../types/atividades';
import { DetalheCorrecao } from './GradingPanel';
import GradingPanel from './GradingPanel';
import AlunoAnswerView from './AlunoAnswerView';
import { Zap } from 'lucide-react';
import { Fragment } from 'react';
import parse, { HTMLReactParserOptions } from 'html-react-parser';
import MandarinFragment from '../../../../../../dashboard/atividades/[id]/components/MandarinFragment';

interface Props {
  questao: QuestaoProva;
  index: number;
  resposta: RespostaAluno | undefined;
  detalhe: DetalheCorrecao;
  onChange: (id: string, detalhe: DetalheCorrecao) => void;
}

/** Auto-grade objective questions */
export function autoGrade(questao: QuestaoProva, resposta: RespostaAluno | undefined): DetalheCorrecao {
  if (!resposta) return { pontos_obtidos: 0, status: 'incorreto' };

  if (questao.tipo === 'multipla_escolha') {
    const sel = new Set(resposta.opcao_ids ?? []);
    const cor = new Set(questao.respostas_corretas_ids);
    const allCorrect = [...cor].every(id => sel.has(id)) && [...sel].every(id => cor.has(id));
    return allCorrect
      ? { pontos_obtidos: questao.pontuacao_maxima, status: 'correto' }
      : { pontos_obtidos: 0, status: 'incorreto' };
  }

  if (questao.tipo === 'ordenacao') {
    const sel = resposta.opcao_ids ?? [];
    const correct = questao.ordem_correta_ids;
    const allOk = sel.every((id, i) => correct[i] === id);
    return allOk
      ? { pontos_obtidos: questao.pontuacao_maxima, status: 'correto' }
      : { pontos_obtidos: 0, status: 'incorreto' };
  }

  if (questao.tipo === 'preencher_lacunas') {
    const mapa = resposta.mapa_lacunas ?? {};
    const corretas = questao.respostas_corretas_por_lacuna ?? {};
    const total = Object.keys(corretas).length;
    if (total === 0) return { pontos_obtidos: 0, status: 'pendente_correcao' };
    const acertos = Object.entries(mapa).filter(([key, val]) => {
      const aceitas = corretas[key] ?? [];
      return aceitas.some(a => a.toLowerCase().trim() === val.toLowerCase().trim());
    }).length;
    const ratio = acertos / total;
    const pts = Math.round((ratio * questao.pontuacao_maxima) * 2) / 2;
    return {
      pontos_obtidos: pts,
      status: ratio === 1 ? 'correto' : ratio > 0 ? 'parcial' : 'incorreto',
    };
  }

  // texto_livre e audio_upload → manual
  return { pontos_obtidos: 0, status: 'pendente_correcao' };
}

const TYPE_LABELS: Record<string, string> = {
  multipla_escolha: 'Múltipla Escolha',
  ordenacao: 'Ordenação',
  texto_livre: 'Texto Livre',
  audio_upload: 'Áudio',
  preencher_lacunas: 'Lacunas',
};

function renderEnunciado(enunciado: string, fragmentos?: Record<string, FragmentoMandarim>) {
  if (!fragmentos || !enunciado.includes('[X]')) {
    return <div className="text-sm sm:text-[15px] text-slate-800 leading-relaxed font-medium [&_p]:mb-3 [&_p:last-child]:mb-0 [&_div]:mb-3 [&_div:last-child]:mb-0" dangerouslySetInnerHTML={{ __html: enunciado }} />;
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
    <div className="text-sm sm:text-[15px] text-slate-800 leading-relaxed font-medium [&_p]:mb-3 [&_p:last-child]:mb-0 [&_div]:mb-3 [&_div:last-child]:mb-0">
      {parse(enunciado, options)}
    </div>
  );
}

export default function QuestionCorrecao({ questao, index, resposta, detalhe, onChange }: Props) {
  const isAutoGradeable = questao.tipo !== 'texto_livre' && questao.tipo !== 'audio_upload';

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
      detalhe.status === 'correto' ? 'border-emerald-200' :
      detalhe.status === 'incorreto' ? 'border-red-200' :
      detalhe.status === 'parcial' ? 'border-amber-200' :
      'border-slate-200'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold">
            {index + 1}
          </span>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {TYPE_LABELS[questao.tipo]} · {questao.pontuacao_maxima} pts
          </span>
        </div>
        {isAutoGradeable && (
          <button
            onClick={() => onChange(questao.id, autoGrade(questao, resposta))}
            className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors"
            title="Corrigir automaticamente"
          >
            <Zap className="w-3.5 h-3.5" /> Auto
          </button>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Enunciado */}
        {renderEnunciado(questao.enunciado, questao.fragmentos_mandarim)}

        {/* Expected answer for subjective */}
        {questao.resposta_esperada && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm text-amber-800">
            <span className="font-bold">Gabarito:</span> {questao.resposta_esperada}
          </div>
        )}

        {/* Student answer */}
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Resposta do Aluno</p>
          <AlunoAnswerView questao={questao} resposta={resposta} detalheStatus={detalhe.status} />
        </div>

        {/* Grading */}
        <GradingPanel
          questaoId={questao.id}
          pontuacaoMaxima={questao.pontuacao_maxima}
          detalhe={detalhe}
          onChange={onChange}
        />
      </div>
    </div>
  );
}
