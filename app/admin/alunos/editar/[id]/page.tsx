'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter, useParams } from 'next/navigation';
import { Save, Loader2, AlertCircle, Users, KeyRound, Mail, Eye, EyeOff, CheckCircle, Flame, Brain, Calendar } from 'lucide-react';
import { updateStudentCredentialsAction } from '@/app/actions/admin-actions';
import { adminCorrectSrsStreakAction, adminAddCosmeticHeatmapDayAction } from '@/app/actions/srs-actions';
import { applyDemoServerPayloads } from '@/lib/demo/supabaseSandbox';
import SetNavbar from '@/app/components/SetNavbar';

export default function EditarAluno() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const params = useParams();

  const alunoId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingCreds, setIsSubmittingCreds] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [credsError, setCredsError] = useState<string | null>(null);
  const [credsSuccess, setCredsSuccess] = useState<string | null>(null);

  // Dados do perfil
  const [nome, setNome] = useState('');
  const [statusMatricula, setStatusMatricula] = useState<'Ativa' | 'Pausada' | 'Cancelada'>('Ativa');
  const [isAdmin, setIsAdmin] = useState(false);

  // Credenciais de acesso
  const [novoEmail, setNovoEmail] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);

  // Dados do SRS
  const [srsMetaLoaded, setSrsMetaLoaded] = useState(false);
  const [srsHabilitado, setSrsHabilitado] = useState(false);
  const [streakAtual, setStreakAtual] = useState(0);
  const [streakMaxima, setStreakMaxima] = useState(0);
  const [viradaHora, setViradaHora] = useState(1);
  const [isSubmittingSrs, setIsSubmittingSrs] = useState(false);
  const [srsError, setSrsError] = useState<string | null>(null);
  const [srsSuccess, setSrsSuccess] = useState<string | null>(null);

  // Ajuste do Heatmap
  const [heatmapDate, setHeatmapDate] = useState('');
  const [isAddingHeatmap, setIsAddingHeatmap] = useState(false);

  useEffect(() => {
    fetchAluno();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alunoId]);

  const fetchAluno = async () => {
    try {
      setIsLoading(true);

      const { data: alunoData, error: alunoError } = await supabase
        .from('alunos')
        .select('*')
        .eq('id', alunoId)
        .single();

      if (alunoError) throw alunoError;
      if (!alunoData) throw new Error('Aluno não encontrado.');

      setNome(alunoData.nome || '');
      setStatusMatricula(alunoData.status_matricula || 'Ativa');
      setIsAdmin(alunoData.is_admin || false);
      setNovoEmail(alunoData.email || '');

      // Busca dados do SRS se existirem
      const { data: srsData } = await supabase
        .from('progresso_srs_meta')
        .select('*')
        .eq('aluno_id', alunoId)
        .single();

      if (srsData) {
        setSrsHabilitado(srsData.srs_habilitado);
        setStreakAtual(srsData.streak_atual);
        setStreakMaxima(srsData.streak_maxima);
        setViradaHora(srsData.virada_hora);
        setSrsMetaLoaded(true);
      }

    } catch (err: unknown) {
      console.error(err);
      setError('Erro ao carregar os dados do aluno.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateAluno = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const { error: updateError } = await supabase
        .from('alunos')
        .update({ nome, status_matricula: statusMatricula, is_admin: isAdmin })
        .eq('id', alunoId);

      if (updateError) throw updateError;

      setSuccessMsg('Perfil do aluno atualizado com sucesso!');
      setTimeout(() => setSuccessMsg(null), 3000);

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar aluno.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredsError(null);
    setCredsSuccess(null);

    const emailTrimmed = novoEmail.trim();
    const senhaValida = novaSenha.length > 0;

    if (!emailTrimmed && !senhaValida) {
      setCredsError('Preencha o e-mail ou a nova senha para continuar.');
      return;
    }

    if (senhaValida && novaSenha !== confirmarSenha) {
      setCredsError('As senhas não coincidem.');
      return;
    }

    if (senhaValida && novaSenha.length < 6) {
      setCredsError('A senha deve ter ao menos 6 caracteres.');
      return;
    }

    setIsSubmittingCreds(true);

    const result = await updateStudentCredentialsAction({
      userId: alunoId,
      email: emailTrimmed || undefined,
      password: senhaValida ? novaSenha : undefined,
    });

    if (result.error) {
      setCredsError(result.error);
    } else {
      if (result.demoPayloads) applyDemoServerPayloads(result.demoPayloads);
      setCredsSuccess('Credenciais atualizadas com sucesso!');
      setNovaSenha('');
      setConfirmarSenha('');
      setTimeout(() => setCredsSuccess(null), 3000);
    }

    setIsSubmittingCreds(false);
  };

  const handleUpdateSrs = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingSrs(true);
    setSrsError(null);
    setSrsSuccess(null);

    try {
      const result = await adminCorrectSrsStreakAction({
        alunoId,
        streakAtual,
        streakMaxima,
        viradaHora,
      });

      if (result.error) {
        setSrsError(result.error);
      } else {
        if (result.demoPayloads) applyDemoServerPayloads(result.demoPayloads);
        setSrsSuccess('Metadados SRS atualizados com sucesso!');
        setTimeout(() => setSrsSuccess(null), 3000);
      }
    } catch (err: unknown) {
      setSrsError(err instanceof Error ? err.message : 'Erro ao atualizar metadados SRS.');
    } finally {
      setIsSubmittingSrs(false);
    }
  };

  const handleAddHeatmapDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!heatmapDate) return;
    setIsAddingHeatmap(true);
    setSrsError(null);
    setSrsSuccess(null);

    try {
      const result = await adminAddCosmeticHeatmapDayAction({
        alunoId,
        data: heatmapDate
      });

      if (result.error) {
        setSrsError(result.error);
      } else {
        if (result.demoPayloads) applyDemoServerPayloads(result.demoPayloads);
        setSrsSuccess(`Revisão cosmética registrada para ${heatmapDate}!`);
        setHeatmapDate('');
        setTimeout(() => setSrsSuccess(null), 3000);
      }
    } catch (err: unknown) {
      setSrsError(err instanceof Error ? err.message : 'Erro ao adicionar dia no heatmap.');
    } finally {
      setIsAddingHeatmap(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-tcm-red" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-20 px-4 sm:px-8 font-sans">
      <SetNavbar title="Editar Aluno" backLink="/admin/alunos" />
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/60">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="bg-tcm-red/10 p-2 rounded-xl text-tcm-red">
                <Users className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-slate-800">Editar Aluno</h1>
              {srsMetaLoaded && (
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  srsHabilitado ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                }`}>
                  SRS {srsHabilitado ? 'Ativado' : 'Inativo'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1.5">Atualize os dados e o status da matrícula</p>
          </div>
        </div>

      {/* ── SEÇÃO 1: Dados do Perfil ── */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-base font-semibold text-slate-700 mb-4">Dados do Perfil</h2>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center gap-2 text-sm border border-red-200 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg flex items-center gap-2 text-sm border border-emerald-200 mb-4">
            <CheckCircle className="w-4 h-4 shrink-0" />
            {successMsg}
          </div>
        )}

        <form onSubmit={handleUpdateAluno} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo *</label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status da Matrícula</label>
            <select
              value={statusMatricula}
              onChange={(e) => setStatusMatricula(e.target.value as 'Ativa' | 'Pausada' | 'Cancelada')}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white cursor-pointer"
            >
              <option value="Ativa">Ativa</option>
              <option value="Pausada">Pausada</option>
              <option value="Cancelada">Cancelada</option>
            </select>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isAdmin}
                onChange={(e) => setIsAdmin(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              <span className="text-sm font-medium text-slate-700">
                Tornar este usuário Administrador (Acesso ao Painel do Professor)
              </span>
            </label>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-70"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Perfil
            </button>
            <button
              type="button"
              onClick={() => router.push('/admin/alunos')}
              className="px-6 py-2 rounded-lg font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>

      {/* ── SEÇÃO 2: Credenciais de Acesso ── */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-base font-semibold text-slate-700 mb-1 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-amber-500" />
          Credenciais de Acesso
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Altere o e-mail e/ou a senha de login do aluno. Deixe a senha em branco para não alterá-la.
        </p>

        {credsError && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center gap-2 text-sm border border-red-200 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {credsError}
          </div>
        )}
        {credsSuccess && (
          <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg flex items-center gap-2 text-sm border border-emerald-200 mb-4">
            <CheckCircle className="w-4 h-4 shrink-0" />
            {credsSuccess}
          </div>
        )}

        <form onSubmit={handleUpdateCredentials} className="space-y-4">
          {/* E-mail */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" /> E-mail
            </label>
            <input
              type="email"
              value={novoEmail}
              onChange={(e) => setNovoEmail(e.target.value)}
              placeholder="novo@email.com"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none"
            />
          </div>

          {/* Nova senha */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nova Senha</label>
            <div className="relative">
              <input
                type={showSenha ? 'text' : 'password'}
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Deixe em branco para não alterar"
                className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowSenha((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirmar senha — só exibe se uma senha foi digitada */}
          {novaSenha.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar Nova Senha</label>
              <input
                type={showSenha ? 'text' : 'password'}
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="Repita a senha"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none"
              />
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmittingCreds}
              className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-70"
            >
              {isSubmittingCreds ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              Atualizar Credenciais
            </button>
          </div>
        </form>
      </div>

      {/* ── SEÇÃO 3: Configurações e Ajustes de Flashcards (SRS) ── */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-semibold text-slate-700 flex items-center gap-2">
            <Brain className="w-5 h-5 text-tcm-red" />
            Configurações e Ofensivas de Flashcards (SRS)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Gerencie o progresso do aluno no SRS, corrija streaks ou insira logs cosméticos de estudo.
          </p>
        </div>

        {srsError && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center gap-2 text-sm border border-red-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {srsError}
          </div>
        )}
        {srsSuccess && (
          <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg flex items-center gap-2 text-sm border border-emerald-200">
            <CheckCircle className="w-4 h-4 shrink-0" />
            {srsSuccess}
          </div>
        )}

        {/* Ajuste de Streak e Rollover */}
        <form onSubmit={handleUpdateSrs} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                <Flame className="w-4 h-4 text-orange-500 fill-current" /> Streak Atual
              </label>
              <input
                type="number"
                value={streakAtual}
                onChange={(e) => setStreakAtual(Number(e.target.value))}
                min={0}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Streak Máxima</label>
              <input
                type="number"
                value={streakMaxima}
                onChange={(e) => setStreakMaxima(Number(e.target.value))}
                min={0}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Hora da Virada do Dia</label>
              <select
                value={viradaHora}
                onChange={(e) => setViradaHora(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white cursor-pointer"
              >
                <option value={0}>Meia-noite (00:00)</option>
                <option value={1}>01:00 AM</option>
                <option value={2}>02:00 AM</option>
                <option value={3}>03:00 AM</option>
                <option value={4}>04:00 AM</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmittingSrs}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-70"
            >
              {isSubmittingSrs ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Ajustes do SRS
            </button>
          </div>
        </form>

        {/* Ajuste Cosmético do Heatmap */}
        <div className="pt-6 border-t border-slate-100 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              Preencher Falha no Heatmap (Cosmético)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Insira 1 revisão falsa em uma data específica para recuperar a sequência visual no heatmap do aluno. Isso não interfere no algoritmo do FSRS.
            </p>
          </div>

          <form onSubmit={handleAddHeatmapDay} className="flex flex-col sm:flex-row items-end gap-3">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-slate-700 mb-1">Data Ajustada (Virada_hora inclusa)</label>
              <input
                type="date"
                required
                value={heatmapDate}
                onChange={(e) => setHeatmapDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isAddingHeatmap || !heatmapDate}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 shrink-0 w-full sm:w-auto justify-center"
            >
              {isAddingHeatmap ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
              Registrar Dia Cosmético
            </button>
          </form>
        </div>
      </div>
      </div>
    </div>
  );
}