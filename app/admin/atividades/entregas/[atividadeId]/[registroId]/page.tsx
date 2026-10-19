'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useNavbar } from '../../../../../components/NavbarContext';
import { Loader2, Save, CheckCircle2, ArrowLeft, Printer } from 'lucide-react';
import { generatePrintablePdf } from '../../../utils/printPdf';
import {
  EstruturaAtividadeProva,
  DadosRegistroProva,
} from '../../../../../../types/atividades';
import QuestionCorrecao, { autoGrade } from './components/QuestionCorrecao';
import { DetalheCorrecao } from './components/GradingPanel';

interface RegistroFull {
  id: string;
  status: string;
  dados: DadosRegistroProva;
  aluno: { nome: string } | null;
}

interface AtividadeFull {
  id: string;
  titulo: string;
  descricao?: string;
  estrutura: EstruturaAtividadeProva;
}

export default function CorrecaoPage() {
  const { atividadeId, registroId } = useParams() as { atividadeId: string; registroId: string };
  const router = useRouter();
  const supabase = createClientComponentClient();
  const { setNavbar } = useNavbar();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [atividade, setAtividade] = useState<AtividadeFull | null>(null);
  const [registro, setRegistro] = useState<RegistroFull | null>(null);
  const [detalhes, setDetalhes] = useState<Record<string, DetalheCorrecao>>({});
  const [feedbackGeral, setFeedbackGeral] = useState('');

  useEffect(() => {
    setNavbar({
      title: 'Corrigir Entrega',
      rightContent: null,
      backLink: `/admin/atividades/entregas/${atividadeId}`,
    });
    return () => setNavbar({ title: '', rightContent: null });
  }, [setNavbar, atividadeId]);

  useEffect(() => {
    async function load() {
      const [{ data: atv }, { data: reg }] = await Promise.all([
        supabase.from('atividades').select('id, titulo, estrutura').eq('id', atividadeId).single(),
        supabase
          .from('registros_dinamicos')
          .select('id, status, dados, aluno:alunos(nome)')
          .eq('id', registroId)
          .single(),
      ]);

      setAtividade(atv as unknown as AtividadeFull);

      if (reg) {
        const r = {
          ...reg,
          aluno: Array.isArray(reg.aluno) ? (reg.aluno[0] ?? null) : reg.aluno,
        } as RegistroFull;
        setRegistro(r);
        setFeedbackGeral(r.dados?.correcao?.feedback_geral ?? '');

        const estrutura = (atv as unknown as AtividadeFull)?.estrutura;
        const hasExistingCorrection = !!r.dados?.correcao;

        if (estrutura?.questoes) {
          const initial: Record<string, DetalheCorrecao> = {};
          estrutura.questoes.forEach(q => {
            const existing = r.dados?.correcao?.detalhes?.[q.id];
            if (existing) {
              // Preserve existing manual correction (no auto flag)
              initial[q.id] = { ...existing, auto: false };
            } else if (!hasExistingCorrection) {
              // First time opening: auto-grade everything, mark as auto
              initial[q.id] = { ...autoGrade(q, r.dados?.respostas?.[q.id]), auto: true };
            } else {
              // Has some corrections but not this question
              initial[q.id] = { pontos_obtidos: 0, status: 'pendente_correcao', auto: false };
            }
          });
          setDetalhes(initial);
        }
      }
      setLoading(false);
    }
    load();
  }, [atividadeId, registroId, supabase]);


  const notaTotal = Object.values(detalhes).reduce((sum, d) => sum + (d.pontos_obtidos ?? 0), 0);
  const pontosMax = atividade?.estrutura?.questoes?.reduce((s, q) => s + q.pontuacao_maxima, 0) ?? 0;

  /** Formata nota com até 2 casas decimais, sem zeros desnecessários */
  const fmtNota = (n: number) =>
    parseFloat(n.toFixed(2))
      .toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  const handlePrint = () => {
    if (!atividade || !registro) return;
    generatePrintablePdf({
      titulo: atividade.titulo,
      descricao: atividade.descricao,
      estrutura: atividade.estrutura,
      isFilled: true,
      alunoNome: registro.aluno?.nome,
      respostas: registro.dados?.respostas,
      correcao: detalhes,
      notaTotal,
      pontosMax,
      feedbackGeral
    });
  };

  const handleSave = async () => {
    if (!registro) return;
    setSaving(true);

    const correcao = {
      nota_total: notaTotal,
      feedback_geral: feedbackGeral || undefined,
      corrigido_por_id: (await supabase.auth.getUser()).data.user?.id,
      detalhes,
    };

    const novosDados: DadosRegistroProva = {
      ...registro.dados,
      correcao,
    };

    const { error } = await supabase
      .from('registros_dinamicos')
      .update({ dados: novosDados as unknown as Record<string, unknown>, status: 'Corrigido', updated_at: new Date().toISOString() })
      .eq('id', registroId);

    setSaving(false);
    if (error) { alert('Erro ao salvar: ' + error.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!atividade || !registro) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-2">
          <p className="text-slate-500">Registro não encontrado.</p>
          <button onClick={() => router.back()} className="text-indigo-600 font-bold hover:underline text-sm flex items-center gap-1 mx-auto">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
        </div>
      </div>
    );
  }

  const questoes = atividade.estrutura?.questoes ?? [];
  const alunoNome = registro.aluno?.nome ?? 'Aluno';

  return (
    <div className="min-h-screen pb-32 font-sans pt-16 bg-slate-50">
      <main className="max-w-3xl mx-auto px-4 mt-6 space-y-6">

        {/* Aluno + nota header */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700">
              {alunoNome.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-slate-800">{alunoNome}</p>
              <p className="text-xs text-slate-400">{questoes.length} questões · {registro.status}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors text-sm"
              title="Gerar PDF da Resposta"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
            <div className="text-center">
              <p className="text-3xl font-bold text-indigo-700 tabular-nums">{fmtNota(notaTotal)}</p>
              <p className="text-xs text-slate-400">/ {pontosMax} pts</p>
            </div>
          </div>
        </div>

        {/* Questions */}
        {questoes.map((q, i) => (
          <QuestionCorrecao
            key={q.id}
            questao={q}
            index={i}
            resposta={registro.dados?.respostas?.[q.id]}
            detalhe={detalhes[q.id] ?? { pontos_obtidos: 0, status: 'pendente_correcao' }}
            onChange={(id, d) => setDetalhes(prev => ({ ...prev, [id]: d }))}
          />
        ))}

        {/* Feedback geral */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-2">
          <label className="text-sm font-bold text-slate-700">Feedback Geral para o Aluno</label>
          <textarea
            value={feedbackGeral}
            onChange={e => setFeedbackGeral(e.target.value)}
            placeholder="Comentários gerais sobre a prova..."
            rows={3}
            className="w-full text-sm border border-slate-200 rounded-xl px-4 py-3 resize-none outline-none focus:border-indigo-400 placeholder:text-slate-300"
          />
        </div>
      </main>

      {/* Sticky save footer */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 flex items-center justify-between gap-4 shadow-xl">
        <div className="text-sm text-slate-500">
          Nota: <strong className="text-slate-800">{fmtNota(notaTotal)}</strong> / {pontosMax} pts
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 text-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-sm transition-colors disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saved ? 'Salvo!' : saving ? 'Salvando...' : 'Salvar Correção'}
          </button>
        </div>
      </div>
    </div>
  );
}
