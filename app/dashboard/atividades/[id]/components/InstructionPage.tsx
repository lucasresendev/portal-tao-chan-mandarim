'use client';

import { EstruturaAtividadeProva } from '../../../../../types/atividades';
import { Clock, Shuffle, Eye, BookOpen, FileText } from 'lucide-react';

interface Props {
  titulo: string;
  descricao: string | null;
  estrutura: EstruturaAtividadeProva;
  onStart: () => void;
}

export default function InstructionPage({ titulo, descricao, estrutura, onStart }: Props) {
  const { configuracoes, questoes } = estrutura;
  const totalPontos = questoes.reduce((sum, q) => sum + q.pontuacao_maxima, 0);

  const tipoCount: Record<string, number> = {};
  questoes.forEach(q => {
    const label = {
      multipla_escolha: 'Múltipla Escolha',
      ordenacao: 'Ordenação',
      texto_livre: 'Texto Livre',
      audio_upload: 'Áudio',
      preencher_lacunas: 'Lacunas',
    }[q.tipo] || q.tipo;
    tipoCount[label] = (tipoCount[label] || 0) + 1;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm text-center space-y-3">
        <div className="bg-tcm-red/10 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-2">
          <BookOpen className="w-7 h-7 text-tcm-red" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{titulo}</h2>
        {descricao && (
          <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">{descricao}</p>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
          <FileText className="w-5 h-5 text-tcm-red mx-auto mb-1.5" />
          <p className="text-lg font-bold text-slate-800">{questoes.length}</p>
          <p className="text-xs text-slate-500">Questões</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
          <Clock className="w-5 h-5 text-amber-500 mx-auto mb-1.5" />
          <p className="text-lg font-bold text-slate-800">
            {configuracoes.tempo_limite_minutos ? `${configuracoes.tempo_limite_minutos} min` : 'Livre'}
          </p>
          <p className="text-xs text-slate-500">Tempo</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
          <Eye className="w-5 h-5 text-blue-500 mx-auto mb-1.5" />
          <p className="text-lg font-bold text-slate-800">{totalPontos}</p>
          <p className="text-xs text-slate-500">Pontos</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
          <Shuffle className="w-5 h-5 text-emerald-500 mx-auto mb-1.5" />
          <p className="text-lg font-bold text-slate-800">{configuracoes.embaralhar_questoes ? 'Sim' : 'Não'}</p>
          <p className="text-xs text-slate-500">Embaralhada</p>
        </div>
      </div>

      {/* Question types breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 mb-3">Tipos de Questões</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(tipoCount).map(([tipo, count]) => (
            <span key={tipo} className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold">
              {count}× {tipo}
            </span>
          ))}
        </div>
      </div>

      {/* Rules / guidelines */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-2">
        <h3 className="text-sm font-bold text-amber-800">Antes de começar:</h3>
        <ul className="text-sm text-amber-700 space-y-1.5 list-disc list-inside">
          {configuracoes.tempo_limite_minutos && (
            <li>Você terá <strong>{configuracoes.tempo_limite_minutos} minutos</strong> para completar a atividade.</li>
          )}
          <li>Suas respostas são salvas automaticamente.</li>
          <li>Você pode navegar entre as questões livremente.</li>
          <li>Ao finalizar, revise suas respostas antes de enviar.</li>
          {configuracoes.mostrar_gabarito_ao_finalizar && (
            <li>O gabarito será exibido após a entrega.</li>
          )}
        </ul>
      </div>

      {/* Start button */}
      <button
        onClick={onStart}
        className="w-full py-4 bg-tcm-red hover:bg-tcm-dark-red text-white font-bold text-base rounded-2xl transition-colors shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
      >
        Iniciar Atividade
      </button>
    </div>
  );
}
