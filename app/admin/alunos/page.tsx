'use client';
import { useState } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { createStudentAction } from '@/app/actions/admin-actions';
import { applyDemoServerPayloads } from '@/lib/demo/supabaseSandbox';
import { Users, PlusCircle, Pencil, Loader2, AlertCircle, CheckCircle2, PauseCircle, XCircle, X } from 'lucide-react';
import posthog from 'posthog-js';
import { motion, AnimatePresence } from 'framer-motion';
import SetNavbar from '../../components/SetNavbar';

type Aluno = {
  id: string;
  nome: string;
  status_matricula: 'Ativa' | 'Pausada' | 'Cancelada';
  is_admin: boolean;
};

export default function GerenciarAlunos() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estados do Formulário
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [statusMatricula, setStatusMatricula] = useState<'Ativa' | 'Pausada' | 'Cancelada'>('Ativa'); 

  // ==========================================
  // TANSTACK QUERY: FETCH DE ALUNOS
  // ==========================================
  const { data: alunos = [], isLoading } = useQuery({
    queryKey: ['admin-alunos'],
    queryFn: async () => {
      const { data: alunosData, error: alunosError } = await supabase
        .from('alunos')
        .select('*')
        .order('nome', { ascending: true });

      if (alunosError) throw alunosError;
      return alunosData as Aluno[];
    }
  });

  // ==========================================
  // TANSTACK MUTATION: ADICIONAR ALUNO
  // ==========================================
  const addAlunoMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await createStudentAction(formData);
      if (result.error) throw new Error(result.error);
      if (result.demoPayloads) applyDemoServerPayloads(result.demoPayloads);
      return result;
    },
    onSuccess: (_, formData) => {
      posthog.capture('admin_student_enrolled', {
        student_name: formData.get('nome'),
        status_matricula: formData.get('statusMatricula'),
      });
      setSuccessMsg('Aluno adicionado com sucesso!');

      // Invalida o cache
      queryClient.invalidateQueries({ queryKey: ['admin-alunos'] });

      // Limpa os campos
      setEmail('');
      setSenha('');
      setNome('');
      setStatusMatricula('Ativa');
      setIsModalOpen(false);
      
      setTimeout(() => setSuccessMsg(null), 3000);
    },
    onError: (err: Error) => {
      setError(err.message || 'Erro ao adicionar aluno.');
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  const handleAddAluno = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append('email', email);
    formData.append('senha', senha);
    formData.append('nome', nome);
    formData.append('statusMatricula', statusMatricula);

    addAlunoMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-tcm-red" />
      </div>
    );
  }

  // Filtros para as listas (exclui contas de professor/admin)
  const alunosAtivos = alunos.filter(a => !a.is_admin && a.status_matricula === 'Ativa');
  const alunosPausados = alunos.filter(a => !a.is_admin && a.status_matricula === 'Pausada');
  const alunosCancelados = alunos.filter(a => !a.is_admin && a.status_matricula === 'Cancelada');
  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-20 px-4 sm:px-8 font-sans">
      <SetNavbar title="Gerenciamento de Alunos" backLink="/admin" />

      {/* MODAL DE CADASTRO COM FRAMER MOTION */}
      <AnimatePresence>
          {isModalOpen && (
              <>
                  {/* Backdrop desfoque */}
                  <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-50 bg-[#1a0505]/80 backdrop-blur"
                      onClick={() => setIsModalOpen(false)}
                  />

                  {/* Conteúdo do Modal */}
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                      <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 15 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 15 }}
                          transition={{ type: 'spring', duration: 0.35 }}
                          className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] pointer-events-auto"
                      >
                          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                              <div className="flex items-center gap-3">
                                  <div className="bg-tcm-red/10 p-2 rounded-xl text-tcm-red">
                                      <PlusCircle className="w-5 h-5" />
                                  </div>
                                  <h2 className="text-xl font-bold text-slate-800">Adicionar Novo Aluno</h2>
                              </div>
                              <button
                                  onClick={() => setIsModalOpen(false)}
                                  className="p-2 text-slate-400 hover:text-slate-650 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
                              >
                                  <X className="w-5 h-5" />
                              </button>
                          </div>

                          <form onSubmit={handleAddAluno} className="flex flex-col flex-1 overflow-hidden">
                              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                                  <div>
                                      <label className="block text-xs font-semibold text-slate-600 mb-1">Nome Completo *</label>
                                      <input
                                          type="text"
                                          required
                                          value={nome}
                                          onChange={(e) => setNome(e.target.value)}
                                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-tcm-red/50 outline-none transition-shadow text-slate-800 text-sm bg-white"
                                          placeholder="Ex: João da Silva"
                                      />
                                  </div>

                                  <div>
                                      <label className="block text-xs font-semibold text-slate-600 mb-1">E-mail *</label>
                                      <input
                                          type="email"
                                          required
                                          value={email}
                                          onChange={(e) => setEmail(e.target.value)}
                                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-tcm-red/50 outline-none transition-shadow text-slate-800 text-sm bg-white"
                                          placeholder="aluno@email.com"
                                      />
                                  </div>
                                  
                                  <div>
                                      <label className="block text-xs font-semibold text-slate-600 mb-1">Senha Inicial *</label>
                                      <input
                                          type="text"
                                          required
                                          value={senha}
                                          onChange={(e) => setSenha(e.target.value)}
                                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-tcm-red/50 outline-none transition-shadow text-slate-850 text-sm bg-white"
                                          placeholder="Senha inicial"
                                      />
                                  </div>

                                  <div>
                                      <label className="block text-xs font-semibold text-slate-600 mb-1">Status da Matrícula</label>
                                      <select
                                          value={statusMatricula}
                                          onChange={(e) => setStatusMatricula(e.target.value as 'Ativa' | 'Pausada' | 'Cancelada')}
                                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-tcm-red/50 outline-none bg-white transition-shadow text-slate-800 text-sm"
                                      >
                                          <option value="Ativa">Ativa</option>
                                          <option value="Pausada">Pausada</option>
                                          <option value="Cancelada">Cancelada</option>
                                      </select>
                                  </div>
                              </div>

                              {/* Footer do Modal */}
                              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                                  <button
                                      type="button"
                                      onClick={() => setIsModalOpen(false)}
                                      className="px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                                  >
                                      Cancelar
                                  </button>
                                  <button
                                      type="submit"
                                      disabled={isSubmitting}
                                      className="bg-tcm-red hover:bg-tcm-dark-red text-white px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-70 shadow-sm cursor-pointer animate-in fade-in"
                                  >
                                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                                      Cadastrar Aluno
                                  </button>
                              </div>
                          </form>
                      </motion.div>
                  </div>
              </>
          )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto space-y-6">

        {/* Alertas */}
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-2 text-sm border border-red-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 text-emerald-700 p-4 rounded-lg flex items-center gap-2 text-sm border border-emerald-200">
            <Users className="w-4 h-4 shrink-0" />
            {successMsg}
          </div>
        )}

        {/* Cabeçalho Externo Unificado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/60">
            <div>
                <div className="flex items-center gap-2.5">
                    <div className="bg-tcm-red/10 p-2 rounded-xl text-tcm-red">
                        <Users className="w-5 h-5" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-800">Gerenciamento de Alunos</h1>
                </div>
                <p className="text-xs text-slate-400 mt-1.5">Gerencie os alunos ativos, pausados e cancelados do curso.</p>
            </div>
            <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center justify-center gap-2 bg-tcm-red hover:bg-tcm-dark-red text-white px-4 py-2.5 rounded-xl transition-all font-bold text-xs uppercase tracking-wider cursor-pointer shadow-sm active:scale-95 w-full sm:w-auto shrink-0 animate-in fade-in"
            >
                <PlusCircle className="w-4 h-4 text-tcm-yellow" />
                <span>Novo Aluno</span>
            </button>
        </div>


        {/* CONTAINER BRANCO PREMIUM UNIFICADO */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          {alunos.length === 0 ? (
             <div className="text-center py-12 text-slate-500 font-medium text-sm bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
               Nenhum aluno cadastrado ainda.
             </div>
          ) : (
             <div className="divide-y divide-slate-100 space-y-6">
               
               {/* 1. MATRÍCULAS ATIVAS */}
               {alunosAtivos.length > 0 && (
                 <div className="pt-2 first:pt-0">
                   <h2 className="font-bold text-sm text-emerald-800 bg-emerald-50/70 border border-emerald-100/50 px-3.5 py-2 rounded-xl flex items-center gap-2 mb-4">
                     <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                     Matrículas Ativas ({alunosAtivos.length})
                   </h2>
                   <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/30">
                     {alunosAtivos.map((aluno) => (
                       <div key={aluno.id} className="p-4 flex flex-row items-center justify-between hover:bg-slate-100/50 transition-colors gap-3">
                         <div className="font-medium text-slate-800 flex items-center gap-2 min-w-0">
                           <span className="truncate text-sm sm:text-base" title={aluno.nome}>{aluno.nome}</span>
                           {aluno.is_admin && (
                             <span className="bg-tcm-yellow/20 text-tcm-red border border-tcm-red/20 text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0">Admin</span>
                           )}
                         </div>
                         <button
                           onClick={() => router.push(`/admin/alunos/editar/${aluno.id}`)}
                           className="flex items-center gap-1.5 text-xs sm:text-sm bg-tcm-red text-white hover:bg-tcm-dark-red px-3 py-1.5 rounded-xl transition-all shadow-sm active:scale-95 font-semibold cursor-pointer shrink-0"
                         >
                           <Pencil className="w-3.5 h-3.5 text-tcm-yellow" /> Editar
                         </button>
                       </div>
                     ))}
                   </div>
                 </div>
               )}

               {/* 2. MATRÍCULAS PAUSADAS */}
               {alunosPausados.length > 0 && (
                 <div className="pt-6">
                   <h2 className="font-bold text-sm text-amber-800 bg-amber-50/70 border border-amber-100/50 px-3.5 py-2 rounded-xl flex items-center gap-2 mb-4">
                     <PauseCircle className="w-4 h-4 text-amber-600" />
                     Matrículas Pausadas ({alunosPausados.length})
                   </h2>
                   <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/30">
                     {alunosPausados.map((aluno) => (
                       <div key={aluno.id} className="p-4 flex flex-row items-center justify-between hover:bg-slate-100/50 transition-colors gap-3">
                         <div className="font-medium text-slate-700 flex items-center gap-2 opacity-80 min-w-0">
                           <span className="truncate text-sm sm:text-base" title={aluno.nome}>{aluno.nome}</span>
                           {aluno.is_admin && (
                             <span className="bg-tcm-yellow/20 text-tcm-red border border-tcm-red/20 text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0">Admin</span>
                           )}
                         </div>
                         <button
                           onClick={() => router.push(`/admin/alunos/editar/${aluno.id}`)}
                           className="flex items-center gap-1.5 text-xs sm:text-sm bg-tcm-red text-white hover:bg-tcm-dark-red px-3 py-1.5 rounded-xl transition-all shadow-sm active:scale-95 font-semibold cursor-pointer shrink-0"
                         >
                           <Pencil className="w-3.5 h-3.5 text-tcm-yellow" /> Editar
                         </button>
                       </div>
                     ))}
                   </div>
                 </div>
               )}

               {/* 3. MATRÍCULAS CANCELADAS */}
               {alunosCancelados.length > 0 && (
                 <div className="pt-6">
                   <h2 className="font-bold text-sm text-red-800 bg-red-50/70 border border-red-100/50 px-3.5 py-2 rounded-xl flex items-center gap-2 mb-4">
                     <XCircle className="w-4 h-4 text-red-500" />
                     Matrículas Canceladas ({alunosCancelados.length})
                   </h2>
                   <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/30">
                     {alunosCancelados.map((aluno) => (
                       <div key={aluno.id} className="p-4 flex flex-row items-center justify-between hover:bg-slate-100/50 transition-colors gap-3">
                         <div className="font-medium text-slate-500 flex items-center gap-2 line-through min-w-0">
                           <span className="truncate text-sm sm:text-base" title={aluno.nome}>{aluno.nome}</span>
                           {aluno.is_admin && (
                             <span className="bg-tcm-yellow/20 text-tcm-red border border-tcm-red/20 text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0">Admin</span>
                           )}
                         </div>
                         <button
                           onClick={() => router.push(`/admin/alunos/editar/${aluno.id}`)}
                           className="flex items-center gap-1.5 text-xs sm:text-sm bg-tcm-red text-white hover:bg-tcm-dark-red px-3 py-1.5 rounded-xl transition-all shadow-sm active:scale-95 font-semibold cursor-pointer shrink-0"
                         >
                           <Pencil className="w-3.5 h-3.5 text-tcm-yellow" /> Editar
                         </button>
                       </div>
                     ))}
                   </div>
                 </div>
               )}
               
             </div>
          )}
        </div>
        
      </div>
    </div>
  );
}