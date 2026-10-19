'use client';
import { useState } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  Loader2, Search, TrendingUp, CheckCircle2, 
  Circle, AlertCircle, X, ChevronRight, Cloud, Clock,
  Flame, Library, MessageSquare
} from 'lucide-react';
import SetNavbar from '../../components/SetNavbar';

// ==========================================
// TIPAGENS
// ==========================================
type Aluno = {
  id: string;
  nome: string;
  nivel: string;
  status_matricula: 'Ativa' | 'Pausada' | 'Cancelada';
};

type Aula = {
  id: string;
  codigo_aula: string;
  titulo_descritivo: string;
  is_excecao: boolean;
};

type Progresso = {
  id?: string;
  aluno_id: string;
  aula_id: string;
  status: 'Pendente' | 'Em Andamento' | 'Concluída';
  aula_assistida: boolean;
  tarefa_exercicios_concluida: boolean;
  tarefa_hanzi_concluida: boolean;
  tarefa_excecao_concluida: boolean;
  created_at?: string;
  updated_at?: string;
};

type AlunoEstatisticas = Aluno & {
  totalAulas: number;
  aulasAssistidas: number;
  aulasConcluidas: number;
  porcentagemAssistidas: number;
  porcentagemConcluidas: number;
  progressoDetalhado: (Aula & { progresso: Progresso | null })[];
};

type LogEntry = {
  id: string;
  studentName: string;
  actionType: string;
  description: string;
  time: string;
  timestamp: number;
  count: number;
};

export default function ProgressoAlunos() {
  const supabase = createClientComponentClient();
  const queryClient = useQueryClient();

  const [busca, setBusca] = useState('');

  // Busca os logs do PostHog de uso dos alunos (SRS, Dicionário, Simulador)
  const { data: activityLogs = [] } = useQuery<LogEntry[]>({
    queryKey: ['admin-activity-log-full'],
    staleTime: 60_000,
    queryFn: async () => {
      const res = await fetch('/api/admin/activity-log');
      if (!res.ok) throw new Error('Falha ao buscar logs.');
      return res.json();
    }
  });
  
  const [alunoSelecionado, setAlunoSelecionado] = useState<AlunoEstatisticas | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const { data: alunosStats = [], isLoading } = useQuery({
    queryKey: ['admin-progresso'],
    queryFn: async () => {
      const [alunosRes, aulasRes, progressoRes] = await Promise.all([
        supabase.from('alunos').select('*').eq('status_matricula', 'Ativa').eq('is_admin', false).order('nome'),
        supabase.from('aulas').select('*').order('codigo_aula', { ascending: true }),
        supabase.from('progresso_aluno').select('*')
      ]);

      if (alunosRes.error) throw alunosRes.error;
      if (aulasRes.error) throw aulasRes.error;
      if (progressoRes.error) throw progressoRes.error;

      const alunos = alunosRes.data as Aluno[];
      const aulas = aulasRes.data as Aula[];
      const progressos = progressoRes.data as Progresso[];

      const totalAulas = aulas.length;

      const estatisticasMapeadas: AlunoEstatisticas[] = alunos.map((aluno) => {
        const progressosDoAluno = progressos.filter(p => p.aluno_id === aluno.id);
        
        let aulasAssistidas = 0;
        let aulasConcluidas = 0;

        const progressoDetalhado = aulas.map(aula => {
          const p = progressosDoAluno.find(prog => prog.aula_id === aula.id) || null;
          if (p) {
            if (p.aula_assistida) aulasAssistidas++;
            if (p.status === 'Concluída') aulasConcluidas++;
          }
          return { ...aula, progresso: p };
        });

        const porcentagemAssistidas = totalAulas > 0 ? Math.round((aulasAssistidas / totalAulas) * 100) : 0;
        const porcentagemConcluidas = totalAulas > 0 ? Math.round((aulasConcluidas / totalAulas) * 100) : 0;

        return { 
          ...aluno, 
          totalAulas, 
          aulasAssistidas, 
          aulasConcluidas, 
          porcentagemAssistidas, 
          porcentagemConcluidas, 
          progressoDetalhado 
        };
      });

      estatisticasMapeadas.sort((a, b) => b.aulasAssistidas - a.aulasAssistidas);
      return estatisticasMapeadas;
    }
  });

  const handleUpdateProgresso = async (aulaId: string, campo: keyof Progresso, valor: unknown) => {
    if (!alunoSelecionado) return;

    const aulaAtual = alunoSelecionado.progressoDetalhado.find(a => a.id === aulaId);
    if (!aulaAtual) return;

    const progressoAtual = aulaAtual.progresso || {
      aluno_id: alunoSelecionado.id,
      aula_id: aulaId,
      status: 'Pendente',
      aula_assistida: false,
      tarefa_exercicios_concluida: false,
      tarefa_hanzi_concluida: false,
      tarefa_excecao_concluida: false
    };

    const novoProgresso = { ...progressoAtual, [campo]: valor };

    const totalTarefas = aulaAtual.is_excecao ? 2 : 3;
    let concluidas = 0;
    
    if (novoProgresso.aula_assistida) concluidas++;
    if (aulaAtual.is_excecao) {
      if (novoProgresso.tarefa_excecao_concluida) concluidas++;
    } else {
      if (novoProgresso.tarefa_exercicios_concluida) concluidas++;
      if (novoProgresso.tarefa_hanzi_concluida) concluidas++;
    }

    novoProgresso.status = concluidas === totalTarefas ? 'Concluída' : (concluidas > 0 ? 'Em Andamento' : 'Pendente');

    const novasAulas = alunoSelecionado.progressoDetalhado.map(a => 
      a.id === aulaId ? { ...a, progresso: novoProgresso as Progresso } : a
    );

    let novasAssistidas = 0;
    let novasConcluidas = 0;
    novasAulas.forEach(a => {
      if (a.progresso?.aula_assistida) novasAssistidas++;
      if (a.progresso?.status === 'Concluída') novasConcluidas++;
    });
    
    const novaPorcentagemAssistidas = alunoSelecionado.totalAulas > 0 
      ? Math.round((novasAssistidas / alunoSelecionado.totalAulas) * 100) 
      : 0;

    const novaPorcentagemConcluidas = alunoSelecionado.totalAulas > 0 
      ? Math.round((novasConcluidas / alunoSelecionado.totalAulas) * 100) 
      : 0;

    const alunoAtualizado = {
      ...alunoSelecionado,
      progressoDetalhado: novasAulas,
      aulasAssistidas: novasAssistidas,
      aulasConcluidas: novasConcluidas,
      porcentagemAssistidas: novaPorcentagemAssistidas,
      porcentagemConcluidas: novaPorcentagemConcluidas
    };

    setAlunoSelecionado(alunoAtualizado);
    queryClient.setQueryData(['admin-progresso'], (oldData: AlunoEstatisticas[] | undefined) => {
      if (!oldData) return [];
      return oldData.map(aluno => aluno.id === alunoSelecionado.id ? alunoAtualizado : aluno);
    });

    setSaveStatus('saving');

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, created_at, updated_at, ...progressoParaSalvar } = novoProgresso;
      
      const { error } = await supabase.from('progresso_aluno').upsert({
        ...progressoParaSalvar,
        updated_at: new Date().toISOString()
      }, { onConflict: 'aluno_id, aula_id' });

      if (error) throw error;
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);

    } catch (error) {
      console.error("Erro ao atualizar progresso:", error);
      setSaveStatus('error');
    }
  };

  const abrirModal = (aluno: AlunoEstatisticas) => {
    setAlunoSelecionado(aluno);
    setSaveStatus('idle'); 
    document.body.style.overflow = 'hidden';
  };

  const fecharModal = () => {
    setAlunoSelecionado(null);
    document.body.style.overflow = 'unset';
  };

  const alunosFiltrados = alunosStats.filter(a => 
    a.nome.toLowerCase().includes(busca.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-tcm-red" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-20 px-4 sm:px-8 font-sans">
      <SetNavbar title="Progresso dos Alunos" backLink="/admin" />
      <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
        
        {/* Cabeçalho Unificado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/60">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="bg-tcm-red/10 p-2 rounded-xl text-tcm-red">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-slate-800">Visão Geral de Progresso</h1>
            </div>
            <p className="text-xs text-slate-400 mt-1.5">Acompanhe e edite o rendimento dos alunos ativos.</p>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar aluno..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tcm-red/20 focus:border-tcm-red outline-none shadow-sm text-sm bg-white placeholder:text-slate-400 text-slate-800 transition-all"
            />
          </div>
        </div>

        {/* CARDS DE PROGRESSO DOS ALUNOS */}
        {alunosFiltrados.length === 0 ? (
          <div className="text-center py-12 text-slate-500 font-medium text-sm bg-white border border-slate-200 rounded-3xl shadow-sm">
            Nenhum aluno encontrado.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {alunosFiltrados.map((aluno) => {
              // Calcular engajamento recente a partir dos logs de atividade
              let srsCards = 0;
              let dictClicks = 0;
              let simulatorClicks = 0;

              const studentLogs = activityLogs.filter(log => 
                log.studentName.trim().toLowerCase() === aluno.nome.trim().toLowerCase()
              );

              for (const log of studentLogs) {
                if (log.actionType === 'srs') {
                  const matchSrs = log.description.match(/Revisou (\d+) cartões/);
                  if (matchSrs) {
                    const count = parseInt(matchSrs[1], 10);
                    srsCards += count * (log.count || 1);
                  } else {
                    srsCards += log.count || 1;
                  }
                } else if (log.actionType === 'dicionario') {
                  dictClicks += log.count || 1;
                } else if (log.actionType === 'dialogo_play') {
                  simulatorClicks += log.count || 1;
                }
              }

              return (
                <div 
                  key={aluno.id}
                  onClick={() => abrirModal(aluno)}
                  className="bg-white border-2 border-slate-200 hover:border-slate-350 rounded-3xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group cursor-pointer flex flex-col justify-between gap-4"
                >
                  {/* Cabeçalho do Card (Sem Nível) */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-tcm-yellow/20 flex items-center justify-center text-tcm-red font-bold border border-tcm-red/10 text-base shrink-0 group-hover:bg-tcm-red group-hover:text-white transition-colors">
                        {aluno.nome.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-800 text-sm sm:text-base truncate" title={aluno.nome}>
                          {aluno.nome}
                        </h3>
                      </div>
                    </div>
                    <div className="p-1 rounded-lg border border-slate-200 bg-white text-slate-400 group-hover:text-tcm-red group-hover:border-tcm-red/30 transition-all shrink-0">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Barras de Progresso com Números Absolutos Fundidos */}
                  <div className="space-y-3 pt-1">
                    {/* Barra Aulas Assistidas */}
                    <div>
                      <div className="flex justify-between text-[10px] font-bold mb-1">
                        <span className="text-slate-500">Aulas Assistidas: {aluno.aulasAssistidas}/{aluno.totalAulas}</span>
                        <span className="text-tcm-red font-extrabold">{aluno.porcentagemAssistidas}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-full">
                        <div 
                          className="h-full bg-tcm-red rounded-full transition-all duration-1000"
                          style={{ width: `${aluno.porcentagemAssistidas}%` }}
                        />
                      </div>
                    </div>

                    {/* Barra Tarefas */}
                    <div>
                      <div className="flex justify-between text-[10px] font-bold mb-1">
                        <span className="text-slate-500">Tarefas Feitas: {aluno.aulasConcluidas}/{aluno.totalAulas}</span>
                        <span className="text-emerald-600 font-extrabold">{aluno.porcentagemConcluidas}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-full">
                        <div 
                          className="h-full bg-emerald-400 rounded-full transition-all duration-1000"
                          style={{ width: `${aluno.porcentagemConcluidas}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Engajamento de Uso do Sistema (PostHog Logs) */}
                  {(srsCards > 0 || dictClicks > 0 || simulatorClicks > 0) ? (
                    <div className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-3 flex flex-col gap-2 mt-1">
                      <span className="text-[9px] font-extrabold text-slate-450 uppercase tracking-widest block leading-none">Uso do Sistema</span>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600 font-bold leading-normal">
                        {srsCards > 0 && (
                          <span className="flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5 text-orange-500 shrink-0 animate-pulse" />
                            {srsCards} SRS
                          </span>
                        )}
                        {dictClicks > 0 && (
                          <span className="flex items-center gap-1">
                            <Library className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            {dictClicks} Dicionário
                          </span>
                        )}
                        {simulatorClicks > 0 && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                            {simulatorClicks} Simulador
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400 font-semibold italic mt-1 pl-1">Sem uso registrado recente.</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DE DETALHES DO ALUNO */}
      {alunoSelecionado && (
        <div 
          className="fixed inset-0 bg-[#1a0505]/80 backdrop-blur z-60 flex items-center justify-center p-4 sm:p-6"
          onClick={fecharModal}
        >
          <div 
            className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Modal */}
            <div className="p-6 border-b border-slate-100 bg-white/95 backdrop-blur-sm sticky top-0 z-20 flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-tcm-red flex items-center justify-center text-white font-bold text-lg">
                  {alunoSelecionado.nome.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 leading-tight">{alunoSelecionado.nome}</h2>
                  <p className="text-sm text-slate-500">
                    Assistiu {alunoSelecionado.aulasAssistidas} de {alunoSelecionado.totalAulas} aulas
                  </p>
                </div>
              </div>

              {/* CONTROLES DA DIREITA (Status Global + Fechar) */}
              <div className="flex items-center gap-4 pl-2">
                <div className="text-xs font-medium flex items-center gap-1.5 whitespace-nowrap">
                  {saveStatus === 'saving' && (
                    <span className="text-tcm-red flex items-center gap-1 animate-pulse"><Loader2 className="w-3.5 h-3.5 animate-spin" /> <span className="hidden sm:inline">Salvando...</span></span>
                  )}
                  {saveStatus === 'saved' && (
                    <span className="text-emerald-500 flex items-center gap-1"><Cloud className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Salvo</span></span>
                  )}
                  {saveStatus === 'error' && (
                    <span className="text-red-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Erro</span></span>
                  )}
                </div>

                <button 
                  onClick={fecharModal}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Corpo do Modal (Lista de Aulas) */}
            <div className="p-6 overflow-y-auto space-y-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
              
              {alunoSelecionado.progressoDetalhado.length === 0 ? (
                <p className="text-center text-slate-500 py-4">Nenhuma aula cadastrada no sistema.</p>
              ) : (
                alunoSelecionado.progressoDetalhado.map((aula) => {
                  const status = aula.progresso?.status || 'Pendente';

                  return (
                    <div key={aula.id} className={`p-4 rounded-xl border transition-colors ${status === 'Concluída' ? 'bg-emerald-50 border-emerald-100' : status === 'Em Andamento' ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-200'}`}>
                      
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                            Aula {aula.codigo_aula}
                          </span>
                          <h4 className="font-semibold text-slate-800 line-clamp-1">
                            {aula.titulo_descritivo}
                          </h4>
                          {aula.progresso?.updated_at && (
                            <span className="text-[10px] font-medium text-slate-400 mt-0.5 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Última ação: {new Date(aula.progresso.updated_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                            </span>
                          )}
                        </div>
                        
                        {/* Status Badge */}
                        <div className="shrink-0">
                          {status === 'Concluída' && <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md"><CheckCircle2 className="w-3.5 h-3.5"/> Concluída</span>}
                          {status === 'Em Andamento' && <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-md"><Clock className="w-3.5 h-3.5"/> Em Andamento</span>}
                          {status === 'Pendente' && <span className="flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-200 px-2.5 py-1 rounded-md"><Circle className="w-3.5 h-3.5"/> Pendente</span>}
                        </div>
                      </div>

                      {/* Tarefas Checklists - Editáveis pelo Admin */}
                      <div className="mt-4 flex flex-wrap gap-4 text-xs font-medium">
                        
                        <button 
                          onClick={() => handleUpdateProgresso(aula.id, 'aula_assistida', !aula.progresso?.aula_assistida)}
                          className={`flex items-center gap-1.5 transition-all hover:scale-105 ${aula.progresso?.aula_assistida ? 'text-tcm-red' : 'text-slate-400 hover:text-tcm-red/70'}`}
                        >
                          {aula.progresso?.aula_assistida ? <CheckCircle2 className="w-4 h-4"/> : <Circle className="w-4 h-4"/>} 
                          Assistida
                        </button>
                        
                        {aula.is_excecao ? (
                          <button 
                            onClick={() => handleUpdateProgresso(aula.id, 'tarefa_excecao_concluida', !aula.progresso?.tarefa_excecao_concluida)}
                            className={`flex items-center gap-1.5 transition-all hover:scale-105 ${aula.progresso?.tarefa_excecao_concluida ? 'text-tcm-red' : 'text-slate-400 hover:text-tcm-red/70'}`}
                          >
                            {aula.progresso?.tarefa_excecao_concluida ? <CheckCircle2 className="w-4 h-4"/> : <Circle className="w-4 h-4"/>} 
                            Tarefa Personalizada
                          </button>
                        ) : (
                          <>
                            <button 
                              onClick={() => handleUpdateProgresso(aula.id, 'tarefa_exercicios_concluida', !aula.progresso?.tarefa_exercicios_concluida)}
                              className={`flex items-center gap-1.5 transition-all hover:scale-105 ${aula.progresso?.tarefa_exercicios_concluida ? 'text-tcm-red' : 'text-slate-400 hover:text-tcm-red/70'}`}
                            >
                              {aula.progresso?.tarefa_exercicios_concluida ? <CheckCircle2 className="w-4 h-4"/> : <Circle className="w-4 h-4"/>} 
                              Exercícios
                            </button>
                            <button 
                              onClick={() => handleUpdateProgresso(aula.id, 'tarefa_hanzi_concluida', !aula.progresso?.tarefa_hanzi_concluida)}
                              className={`flex items-center gap-1.5 transition-all hover:scale-105 ${aula.progresso?.tarefa_hanzi_concluida ? 'text-tcm-red' : 'text-slate-400 hover:text-tcm-red/70'}`}
                            >
                              {aula.progresso?.tarefa_hanzi_concluida ? <CheckCircle2 className="w-4 h-4"/> : <Circle className="w-4 h-4"/>} 
                              Hanzi
                            </button>
                          </>
                        )}
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}