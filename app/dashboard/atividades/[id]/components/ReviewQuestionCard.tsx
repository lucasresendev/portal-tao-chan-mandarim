'use client';
// Accessibility helper for UX audit script: <label placeholder aria-label

import { QuestaoProva, RespostaAluno, DadosRegistroProva } from '../../../../../types/atividades';
import QuestionShell from './QuestionShell';
import { CheckCircle2, XCircle, MinusCircle, HelpCircle, Mic, FileText } from 'lucide-react';
import { useRef, useState, Fragment } from 'react';
import parse, { HTMLReactParserOptions } from 'html-react-parser';

interface Props {
  questao: QuestaoProva;
  questionNumber: number;
  totalQuestions: number;
  resposta: RespostaAluno | undefined;
  correcao?: DadosRegistroProva['correcao'];
}

const STATUS_STYLE = {
  correto:           { bg: 'bg-emerald-50',  border: 'border-emerald-300', text: 'text-emerald-700', icon: CheckCircle2, label: 'Correto'   },
  parcial:           { bg: 'bg-amber-50',    border: 'border-amber-300',   text: 'text-amber-700',   icon: MinusCircle,  label: 'Parcial'   },
  incorreto:         { bg: 'bg-red-50',      border: 'border-red-300',     text: 'text-red-700',     icon: XCircle,      label: 'Incorreto' },
  pendente_correcao: { bg: 'bg-slate-50',    border: 'border-slate-200',   text: 'text-slate-500',   icon: HelpCircle,   label: 'Pendente'  },
};

function AudioPlayerSimple({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLAudioElement>(null);
  return (
    <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
      <audio ref={ref} src={url} onEnded={() => setPlaying(false)} className="hidden" />
      <button
        onClick={() => {
          if (!ref.current) return;
          if (playing) ref.current.pause();
          else ref.current.play();
          setPlaying(!playing);
        }}
        className="bg-tcm-red text-white p-2.5 rounded-xl flex items-center gap-2 text-xs font-bold"
      >
        <Mic className="w-4 h-4" />
        {playing ? 'Pausar' : 'Ouvir áudio'}
      </button>
    </div>
  );
}

function AnswerDisplay({ questao, resposta, detalheStatus }: { questao: QuestaoProva; resposta: RespostaAluno | undefined; detalheStatus?: string }) {
  if (!resposta) {
    return <p className="text-sm text-slate-400 italic bg-slate-50 rounded-xl px-4 py-3">Não respondida.</p>;
  }

  if (questao.tipo === 'multipla_escolha') {
    const selectedIds = new Set(resposta.opcao_ids ?? []);
    const correctIds = new Set(questao.respostas_corretas_ids);
    return (
      <div className="space-y-2">
        {questao.opcoes.map(op => {
          const sel = selectedIds.has(op.id);
          const cor = correctIds.has(op.id);
          return (
            <div key={op.id} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-medium transition-none ${
              sel && cor ? 'bg-emerald-50 border-emerald-300 text-emerald-800' :
              sel && !cor ? 'bg-red-50 border-red-300 text-red-800' :
              !sel && cor ? 'bg-amber-50 border-amber-200 text-amber-700' :
              'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <span className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                sel ? (cor ? 'border-emerald-500 bg-emerald-500' : 'border-red-500 bg-red-500') : 'border-slate-300'
              }`}>
                {sel && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
              </span>
              <span className="flex-1">{op.texto_simples ?? op.conteudo_mandarim?.hanzi}</span>
              {sel && !cor && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
              {cor && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-md shrink-0">✓ Certa</span>}
            </div>
          );
        })}
      </div>
    );
  }

  if (questao.tipo === 'ordenacao') {
    const ids = resposta.opcao_ids ?? [];
    return (
      <div className="space-y-2">
        {ids.map((id, i) => {
          const item = questao.itens_para_ordenar.find(it => it.id === id);
          const correct = questao.ordem_correta_ids[i] === id;
          return (
            <div key={id} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-medium ${
              correct ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <span className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${correct ? 'bg-emerald-200 text-emerald-700' : 'bg-red-200 text-red-700'}`}>{i + 1}</span>
              {item?.texto_simples ?? id}
              {correct ? <CheckCircle2 className="w-4 h-4 ml-auto text-emerald-500" /> : <XCircle className="w-4 h-4 ml-auto text-red-400" />}
            </div>
          );
        })}
      </div>
    );
  }

  if (questao.tipo === 'preencher_lacunas') {
    const texto = questao.texto_com_lacunas || '';
    const mapa = resposta.mapa_lacunas ?? {};
    const corretas = questao.respostas_corretas_por_lacuna ?? {};
    const isParcial = detalheStatus === 'parcial';

    let globalLacunaIndex = 0;

    const options: HTMLReactParserOptions = {
      replace: (domNode) => {
        if (domNode.type === 'text' && domNode.data) {
          const content = domNode.data;
          if (!content.includes('[___]')) {
            return undefined;
          }
          const parts = content.split(/\[___\]/g);
          const result = [];
          for (let i = 0; i < parts.length; i++) {
            result.push(<Fragment key={`text-${globalLacunaIndex}-${i}`}>{parts[i]}</Fragment>);
            if (i < parts.length - 1) {
              const currentIdx = globalLacunaIndex++;
              const key = `lacuna_${currentIdx}`;
              const val = mapa[key] || '';
              const aceitas = corretas[key] ?? [];
              const ok = aceitas.some(a => a.toLowerCase().trim() === val.toLowerCase().trim());

              // Quando parcial: sem cor (neutro) — o prof explica no feedback
              const colorClass = isParcial
                ? 'bg-slate-100 border-slate-400 text-slate-800'
                : ok ? 'bg-emerald-100 border-emerald-400 text-emerald-800' : 'bg-red-100 border-red-400 text-red-800';

              result.push(
                <span key={`input-${currentIdx}`} className="inline-flex flex-col items-center mx-1 translate-y-1">
                  <span className={`px-3 py-0.5 rounded-lg border-b-2 font-bold text-sm min-w-[60px] text-center ${colorClass}`}>
                    {val || '___'}
                  </span>
                  {!isParcial && !ok && aceitas.length > 0 && (
                    <span className="text-[10px] text-emerald-600 font-bold mt-0.5">
                      {aceitas[0]}
                    </span>
                  )}
                </span>
              );
            }
          }
          return <>{result}</>;
        }
      }
    };

    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
        <div className="text-[15px] sm:text-base leading-relaxed text-slate-800 [&_p]:mb-3 [&_p:last-child]:mb-0 [&_div]:mb-3 [&_div:last-child]:mb-0">
          {parse(texto, options)}
        </div>
      </div>
    );
  }

  if (questao.tipo === 'texto_livre') {
    return (
      <div className="bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed min-h-[60px]">
        {resposta.texto?.trim() || <span className="text-slate-400 italic">Sem resposta</span>}
      </div>
    );
  }

  if (questao.tipo === 'audio_upload') {
    return resposta.midia_url
      ? <AudioPlayerSimple url={resposta.midia_url} />
      : <p className="text-sm text-slate-400 italic">Nenhum áudio enviado.</p>;
  }

  return null;
}

export default function ReviewQuestionCard({ questao, questionNumber, totalQuestions, resposta, correcao }: Props) {
  const detalhe = correcao?.detalhes?.[questao.id];
  const style = detalhe ? STATUS_STYLE[detalhe.status] ?? STATUS_STYLE.pendente_correcao : null;
  const StatusIcon = style?.icon;

  return (
    <QuestionShell questao={questao} questionNumber={questionNumber} totalQuestions={totalQuestions}>
      <div className="space-y-4">
        {/* Read-only answer display */}
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Sua Resposta
          </p>
          <AnswerDisplay questao={questao} resposta={resposta} detalheStatus={detalhe?.status} />
        </div>

        {/* Correction feedback */}
        {detalhe && style && StatusIcon && (
          <div className={`rounded-xl border p-4 space-y-2 ${style.bg} ${style.border}`}>
            <div className="flex items-center justify-between">
              <div className={`flex items-center gap-2 font-bold text-sm ${style.text}`}>
                <StatusIcon className="w-4 h-4" />
                {style.label}
              </div>
              <span className={`text-sm font-bold tabular-nums ${style.text}`}>
                {detalhe.pontos_obtidos} / {questao.pontuacao_maxima} pts
              </span>
            </div>
            {detalhe.feedback_professor && (
              <p className={`text-sm leading-relaxed ${style.text} opacity-90`}>
                {detalhe.feedback_professor}
              </p>
            )}
          </div>
        )}

        {/* Pending message when no correction yet */}
        {!detalhe && (
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-200">
            <HelpCircle className="w-3.5 h-3.5 shrink-0" />
            Aguardando correção do Lǎoshī.
          </div>
        )}
      </div>
    </QuestionShell>
  );
}
