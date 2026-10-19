'use client';

import { QuestaoProva, RespostaAluno } from '../../../../../../../types/atividades';
import { Play, Pause, FileAudio, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { useState, useRef, Fragment } from 'react';
import parse, { HTMLReactParserOptions } from 'html-react-parser';

interface Props {
  questao: QuestaoProva;
  resposta: RespostaAluno | undefined;
  /** Status da correção desta questão, se já corrigida */
  detalheStatus?: string;
}

function AudioPlayer({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLAudioElement>(null);
  return (
    <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
      <audio ref={ref} src={url} onEnded={() => setPlaying(false)} className="hidden" />
      <button
        onClick={() => {
          if (!ref.current) return;
          if (playing) ref.current.pause(); else ref.current.play();
          setPlaying(!playing);
        }}
        className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-lg transition-colors"
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </button>
      <div>
        <p className="text-sm font-medium text-slate-700">Áudio do aluno</p>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 hover:underline">
          Abrir em nova aba
        </a>
      </div>
      <FileAudio className="w-5 h-5 text-slate-300 ml-auto" />
    </div>
  );
}

// ─── Visual tag ────────────────────────────────────────────
function Tag({ correct, selected, label }: { correct: boolean; selected: boolean; label: string }) {
  if (selected && correct) return (
    <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border bg-emerald-50 border-emerald-300 text-emerald-800">
      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
      <span className="text-sm font-medium leading-snug">{label}</span>
      <span className="ml-auto shrink-0 text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-md self-center">Correto ✓</span>
    </div>
  );
  if (selected && !correct) return (
    <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border bg-red-50 border-red-300 text-red-800">
      <XCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
      <span className="text-sm font-medium leading-snug">{label}</span>
      <span className="ml-auto shrink-0 text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-md self-center">Aluno marcou ✗</span>
    </div>
  );
  if (!selected && correct) return (
    <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border bg-amber-50 border-amber-200 text-amber-700 opacity-75">
      <MinusCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
      <span className="text-sm font-medium leading-snug">{label}</span>
      <span className="ml-auto shrink-0 text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-md self-center">Gabarito</span>
    </div>
  );
  return (
    <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border bg-slate-50 border-slate-200 text-slate-400 opacity-60">
      <span className="w-4 h-4 mt-0.5 shrink-0 rounded-full border border-slate-300" />
      <span className="text-sm leading-snug">{label}</span>
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────
export default function AlunoAnswerView({ questao, resposta, detalheStatus }: Props) {
  if (!resposta) {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-sm text-slate-400 italic">
        Aluno não respondeu esta questão.
      </div>
    );
  }

  if (questao.tipo === 'multipla_escolha') {
    const selectedIds = new Set(resposta.opcao_ids ?? []);
    const correctIds = new Set(questao.respostas_corretas_ids);
    // Show all options, highlight student's selection and correct answers
    return (
      <div className="space-y-2">
        {questao.opcoes.map(op => (
          <Tag
            key={op.id}
            correct={correctIds.has(op.id)}
            selected={selectedIds.has(op.id)}
            label={op.texto_simples ?? op.conteudo_mandarim?.hanzi ?? op.id}
          />
        ))}
      </div>
    );
  }

  if (questao.tipo === 'ordenacao') {
    const ids = resposta.opcao_ids ?? [];
    const correctIds = questao.ordem_correta_ids;
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-3">
          {/* Student order */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Resposta do Aluno</p>
            <div className="space-y-1.5">
              {ids.map((id, i) => {
                const item = questao.itens_para_ordenar.find(it => it.id === id);
                const isCorrectPos = correctIds[i] === id;
                return (
                  <div key={id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${isCorrectPos ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                    <span className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center shrink-0 ${isCorrectPos ? 'bg-emerald-200 text-emerald-700' : 'bg-red-200 text-red-700'}`}>{i + 1}</span>
                    <span className="truncate font-medium">{item?.texto_simples ?? id}</span>
                    {isCorrectPos ? <CheckCircle2 className="w-3.5 h-3.5 ml-auto shrink-0 text-emerald-500" /> : <XCircle className="w-3.5 h-3.5 ml-auto shrink-0 text-red-400" />}
                  </div>
                );
              })}
            </div>
          </div>
          {/* Correct order */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Ordem Correta</p>
            <div className="space-y-1.5">
              {correctIds.map((id, i) => {
                const item = questao.itens_para_ordenar.find(it => it.id === id);
                return (
                  <div key={id} className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-slate-50 border-slate-200 text-slate-700 text-sm">
                    <span className="w-5 h-5 rounded bg-slate-200 text-[10px] font-bold flex items-center justify-center shrink-0 text-slate-600">{i + 1}</span>
                    <span className="truncate font-medium">{item?.texto_simples ?? id}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
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
                ? val ? 'bg-slate-100 border-slate-400 text-slate-800' : 'bg-slate-100 border-slate-300 text-slate-400'
                : ok ? 'bg-emerald-100 border-emerald-400 text-emerald-800' : val ? 'bg-red-100 border-red-400 text-red-800' : 'bg-slate-100 border-slate-300 text-slate-400';

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
      <div className="space-y-2">
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed min-h-[60px]">
          {resposta.texto?.trim()
            ? resposta.texto
            : <span className="text-slate-400 italic">Aluno não escreveu nada.</span>
          }
        </div>
        {questao.resposta_esperada && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Gabarito do Professor</p>
            <p className="text-sm text-amber-900">{questao.resposta_esperada}</p>
          </div>
        )}
      </div>
    );
  }

  if (questao.tipo === 'audio_upload') {
    return (
      <div className="space-y-2">
        {resposta.midia_url
          ? <AudioPlayer url={resposta.midia_url} />
          : <p className="text-sm text-slate-400 italic">Aluno não enviou áudio.</p>
        }
        {questao.resposta_esperada && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Orientação</p>
            <p className="text-sm text-amber-900">{questao.resposta_esperada}</p>
          </div>
        )}
      </div>
    );
  }

  return null;
}
