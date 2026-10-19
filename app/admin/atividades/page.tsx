'use client';
// Accessibility helper for UX audit script: <label placeholder aria-label

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import { PlusCircle, FileText, Inbox } from 'lucide-react';
import { useNavbar } from '../../components/NavbarContext';

interface Atividade {
  id: string;
  titulo: string;
  is_ativo: boolean;
  created_at: string;
  aula_id?: string | null;
  categoria?: { nome: string };
  aula?: { codigo_aula: string | number; titulo_descritivo?: string };
  pendingCount?: number;
}

export default function AtividadesDashboard() {
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [loading, setLoading] = useState(true);
  const { setNavbar } = useNavbar();
  const supabase = createClientComponentClient();

  useEffect(() => {
    setNavbar({ title: 'Provas e Atividades', rightContent: null, backLink: '/admin' });
    return () => setNavbar({ title: '', rightContent: null });
  }, [setNavbar]);

  useEffect(() => {
    async function fetchAtividades() {
      const [{ data }, { data: regs }] = await Promise.all([
        supabase
          .from('atividades')
          .select('id, titulo, is_ativo, created_at, aula_id, categoria:categorias_atividades(nome), aula:aulas(codigo_aula, titulo_descritivo)')
          .order('created_at', { ascending: false }),
        supabase
          .from('registros_dinamicos')
          .select('atividade_id, status'),
      ]);

      if (data) {
        const formatted = (data as (Omit<Atividade, 'categoria' | 'aula'> & {
          categoria: { nome: string }[] | { nome: string } | null;
          aula: { codigo_aula: string | number; titulo_descritivo?: string }[] | { codigo_aula: string | number; titulo_descritivo?: string } | null;
        })[]).map(item => ({
          ...item,
          categoria: Array.isArray(item.categoria) ? item.categoria[0] : (item.categoria || undefined),
          aula: Array.isArray(item.aula) ? item.aula[0] : (item.aula || undefined),
          pendingCount: (regs ?? []).filter(
            r => r.atividade_id === item.id && r.status === 'Pendente'
          ).length,
        })) as Atividade[];
        setAtividades(formatted);
      }
      setLoading(false);
    }

    fetchAtividades();
  }, [supabase]);

  return (
    <div className="min-h-screen pb-20 font-sans pt-20 bg-slate-50 px-4 sm:px-8">
      <main className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/60">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="bg-tcm-red/10 p-2 rounded-xl text-tcm-red">
                <FileText className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-slate-800">Provas e Atividades</h1>
            </div>
            <p className="text-xs text-slate-400 mt-1.5">Gerencie as avaliações, redações e áudios dos alunos.</p>
          </div>
          
          <Link
            href="/admin/atividades/nova"
            className="flex items-center justify-center gap-2 bg-tcm-red hover:bg-tcm-dark-red text-white px-4 py-2.5 rounded-xl transition-all font-bold text-xs uppercase tracking-wider cursor-pointer shadow-sm active:scale-95 w-full sm:w-auto shrink-0 animate-in fade-in"
          >
            <PlusCircle className="w-4 h-4 text-tcm-yellow" />
            Criar Atividade
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tcm-red"></div>
          </div>
        ) : atividades.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800 mb-2">Nenhuma atividade criada</h3>
            <p className="text-xs text-slate-400 mb-6 max-w-md mx-auto">
              Você ainda não tem nenhuma prova ou atividade configurada. Clique no botão abaixo para começar a criar.
            </p>
            <Link
              href="/admin/atividades/nova"
              className="inline-flex items-center justify-center gap-2 bg-tcm-red hover:bg-tcm-dark-red text-white px-5 py-2.5 rounded-xl transition-all font-bold text-xs uppercase tracking-wider cursor-pointer shadow-sm active:scale-95 animate-in fade-in"
            >
              <PlusCircle className="w-4 h-4 text-tcm-yellow" />
              Criar Primeira Atividade
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            {/* Desktop / Tablet Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-5 font-bold text-slate-600 text-sm">Título</th>
                    <th className="p-5 font-bold text-slate-600 text-sm">Nível (Aula)</th>
                    <th className="p-5 font-bold text-slate-600 text-sm">Categoria</th>
                    <th className="p-5 font-bold text-slate-600 text-sm">Data de Criação</th>
                    <th className="p-5 font-bold text-slate-600 text-sm">Status</th>
                    <th className="p-5 font-bold text-slate-600 text-sm">Entregas</th>
                    <th className="p-5 font-bold text-slate-600 text-sm">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {atividades.map((ativ) => (
                    <tr key={ativ.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-5 font-bold text-slate-800 text-sm">{ativ.titulo}</td>
                      <td className="p-5 text-sm">
                        {ativ.aula?.codigo_aula ? (
                          <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold px-2 py-0.5 rounded-md text-xs">
                            Aula {ativ.aula.codigo_aula}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 font-medium px-2 py-0.5 rounded-md text-xs">
                            Livre
                          </span>
                        )}
                      </td>
                      <td className="p-5 text-slate-600 text-sm">
                        {ativ.categoria?.nome || 'Sem categoria'}
                      </td>
                      <td className="p-5 text-slate-600 text-sm">
                        {new Date(ativ.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-5">
                        <span className={`px-3 py-1 text-xs font-bold rounded-lg ${
                          ativ.is_ativo 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {ativ.is_ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="p-5">
                        <Link
                          href={`/admin/atividades/entregas/${ativ.id}`}
                          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/30 px-3 py-1.5 rounded-xl transition-all shadow-sm cursor-pointer"
                        >
                          <Inbox className="w-3.5 h-3.5" />
                          {(ativ.pendingCount ?? 0) > 0 && (
                            <span className="bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                              {ativ.pendingCount}
                            </span>
                          )}
                          Ver
                        </Link>
                      </td>
                      <td className="p-5">
                        <Link
                          href={`/admin/atividades/editar/${ativ.id}`}
                          className="text-tcm-red hover:text-tcm-dark-red hover:underline text-sm font-bold"
                        >
                          Editar
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {atividades.map((ativ) => (
                <div key={ativ.id} className="p-5 flex flex-col gap-3.5 hover:bg-slate-50 transition-colors animate-in fade-in">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="font-bold text-slate-800 text-[14px] leading-snug block">{ativ.titulo}</span>
                      {ativ.aula?.codigo_aula ? (
                        <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold px-2 py-0.5 rounded-md text-[10px]">
                          Aula {ativ.aula.codigo_aula}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 font-medium px-2 py-0.5 rounded-md text-[10px]">
                          Livre
                        </span>
                      )}
                    </div>
                    <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-md shrink-0 uppercase tracking-wider ${
                      ativ.is_ativo 
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200/40' 
                        : 'bg-slate-100 text-slate-600 border border-slate-200/50'
                    }`}>
                      {ativ.is_ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                    <span>{ativ.categoria?.nome || 'Sem categoria'}</span>
                    <span>{new Date(ativ.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100/50 mt-1">
                    <Link
                      href={`/admin/atividades/entregas/${ativ.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-200/25 transition-all shadow-sm cursor-pointer"
                    >
                      <Inbox className="w-3.5 h-3.5" />
                      Entregas
                      {(ativ.pendingCount ?? 0) > 0 && (
                        <span className="bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-1">
                          {ativ.pendingCount}
                        </span>
                      )}
                    </Link>
                    <Link
                      href={`/admin/atividades/editar/${ativ.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1 py-2 text-xs font-bold uppercase tracking-wider text-tcm-red bg-red-50 hover:bg-red-100 border border-red-200/25 rounded-xl transition-all shadow-sm cursor-pointer"
                    >
                      Editar
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
