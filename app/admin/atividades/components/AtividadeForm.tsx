'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Save, Plus, Download, Upload, Printer } from 'lucide-react';
import { generatePrintablePdf } from '../utils/printPdf';
import QuestaoEditor from './QuestaoEditor';
import { EstruturaAtividadeProva, QuestaoProva, QuestaoMultiplaEscolha, QuestaoOrdenacao } from '../../../../types/atividades';

interface Categoria {
  id: string;
  nome: string;
}

interface Aula {
  id: string;
  titulo_descritivo: string;
  codigo_aula: string | number;
}

interface AtividadeFormProps {
  initialData?: {
    titulo: string;
    descricao: string;
    categoriaId: string;
    aulaId: string;
    isAtivo: boolean;
    estrutura: EstruturaAtividadeProva;
  };
  onSave: (data: {
    titulo: string;
    descricao: string;
    categoriaId: string;
    aulaId: string;
    isAtivo: boolean;
    estrutura: EstruturaAtividadeProva;
  }) => Promise<void>;
  loading: boolean;
  saveButtonText: string;
  onCancel: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export default function AtividadeForm({
  initialData,
  onSave,
  loading,
  saveButtonText,
  onCancel
}: AtividadeFormProps) {
  const supabase = createClientComponentClient();

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);

  // Campos básicos
  const [titulo, setTitulo] = useState(initialData?.titulo || '');
  const [descricao, setDescricao] = useState(initialData?.descricao || '');
  const [categoriaId, setCategoriaId] = useState(initialData?.categoriaId || '');
  const [aulaId, setAulaId] = useState(initialData?.aulaId || '');
  const [isAtivo, setIsAtivo] = useState(initialData?.isAtivo ?? true);
  
  const [pontuacaoTotalTarget, setPontuacaoTotalTarget] = useState<string>('10');

  // Estrutura
  const [estrutura, setEstrutura] = useState<EstruturaAtividadeProva>(initialData?.estrutura || {
    configuracoes: {
      nota_aprovacao: 7,
      embaralhar_questoes: false,
      mostrar_gabarito_ao_finalizar: true,
      modo_exibicao_mandarim: 'god_mode'
    },
    questoes: []
  });

  useEffect(() => {
    async function loadMetadata() {
      const { data: cats } = await supabase.from('categorias_atividades').select('*').order('nome');
      if (cats) setCategorias(cats);

      const { data: aulasList } = await supabase.from('aulas').select('id, titulo_descritivo, codigo_aula').order('codigo_aula');
      if (aulasList) setAulas(aulasList);
    }
    loadMetadata();
  }, [supabase]);

  // If initialData changes (like when async loaded in edit mode), update state
  useEffect(() => {
    let mounted = true;
    if (initialData) {
      setTimeout(() => {
        if (!mounted) return;
        setTitulo(initialData.titulo);
        setDescricao(initialData.descricao);
        setCategoriaId(initialData.categoriaId);
        setAulaId(initialData.aulaId);
        setIsAtivo(initialData.isAtivo);
        setEstrutura(initialData.estrutura);
      }, 0);
    }
    return () => { mounted = false; };
  }, [initialData]);

  const handleNovaCategoria = async () => {
    const nome = prompt('Digite o nome da nova categoria (ex: HSK 1, Provas Finais, Gramática):');
    if (!nome) return;
    
    const { data, error } = await supabase
      .from('categorias_atividades')
      .insert({ nome })
      .select()
      .single();
      
    if (error) {
      alert('Erro ao criar categoria: ' + error.message);
    } else if (data) {
      setCategorias([...categorias, data]);
      setCategoriaId(data.id);
    }
  };

  const addQuestao = () => {
    const novaQuestao: QuestaoProva = {
      id: generateId(),
      tipo: 'multipla_escolha',
      enunciado: '',
      pontuacao_maxima: 1,
      permite_multiplas_respostas: false,
      opcoes: [
        { id: generateId(), texto_simples: 'Opção 1' },
        { id: generateId(), texto_simples: 'Opção 2' }
      ],
      respostas_corretas_ids: []
    } as QuestaoProva;

    setEstrutura((prev: EstruturaAtividadeProva) => ({
      ...prev,
      questoes: [...prev.questoes, novaQuestao]
    }));
  };

  const removeQuestao = (id: string) => {
    setEstrutura((prev: EstruturaAtividadeProva) => ({
      ...prev,
      questoes: prev.questoes.filter(q => q.id !== id)
    }));
  };

  const moveQuestao = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === estrutura.questoes.length - 1) return;

    setEstrutura((prev: EstruturaAtividadeProva) => {
      const newQuestoes = [...prev.questoes];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      const temp = newQuestoes[index];
      newQuestoes[index] = newQuestoes[targetIndex];
      newQuestoes[targetIndex] = temp;
      return { ...prev, questoes: newQuestoes };
    });
  };

  const updateQuestao = (id: string, updates: Partial<QuestaoProva>) => {
    setEstrutura((prev: EstruturaAtividadeProva) => ({
      ...prev,
      questoes: prev.questoes.map(q => q.id === id ? { ...q, ...updates } as QuestaoProva : q)
    }));
  };

  const duplicateQuestao = (index: number) => {
    setEstrutura((prev: EstruturaAtividadeProva) => {
      const q = prev.questoes[index];
      const duplicated = JSON.parse(JSON.stringify(q)) as QuestaoProva;
      duplicated.id = generateId();
      
      // Regenerate IDs for multiple choice
      if (duplicated.tipo === 'multipla_escolha' && duplicated.opcoes) {
        const idMap = new Map();
        duplicated.opcoes = duplicated.opcoes.map(op => {
          const newId = generateId();
          idMap.set(op.id, newId);
          return { ...op, id: newId };
        });
        duplicated.respostas_corretas_ids = duplicated.respostas_corretas_ids.map(id => idMap.get(id) || id);
      }
      
      // Regenerate IDs for ordering
      if (duplicated.tipo === 'ordenacao' && duplicated.itens_para_ordenar) {
        const idMap = new Map();
        duplicated.itens_para_ordenar = duplicated.itens_para_ordenar.map(it => {
          const newId = generateId();
          idMap.set(it.id, newId);
          return { ...it, id: newId };
        });
        duplicated.ordem_correta_ids = duplicated.ordem_correta_ids.map(id => idMap.get(id) || id);
      }

      const newQuestoes = [...prev.questoes];
      newQuestoes.splice(index + 1, 0, duplicated);
      return { ...prev, questoes: newQuestoes };
    });
  };

  const exportToJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(estrutura.questoes, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `questoes_${titulo || 'export'}.json`);
    document.body.appendChild(downloadAnchorNode); 
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const importFromJson = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = event => {
        try {
          const importedQuestoes = JSON.parse(event.target?.result as string);
          if (Array.isArray(importedQuestoes)) {
            const sanitized = importedQuestoes.map(q => {
              const newQ = { ...q, id: generateId() };
              // Simple regeneration for arrays inside - to prevent UI issues if multiple imports happen
              if (newQ.tipo === 'multipla_escolha' && newQ.opcoes) {
                const idMap = new Map();
                const qMultipla = newQ as unknown as QuestaoMultiplaEscolha;
                qMultipla.opcoes = qMultipla.opcoes.map((op) => {
                  const newId = generateId();
                  idMap.set(op.id, newId);
                  return { ...op, id: newId };
                });
                qMultipla.respostas_corretas_ids = qMultipla.respostas_corretas_ids?.map((id) => idMap.get(id) || id) || [];
              }
              if (newQ.tipo === 'ordenacao' && newQ.itens_para_ordenar) {
                const idMap = new Map();
                const qOrdenacao = newQ as unknown as QuestaoOrdenacao;
                qOrdenacao.itens_para_ordenar = qOrdenacao.itens_para_ordenar.map((it) => {
                  const newId = generateId();
                  idMap.set(it.id, newId);
                  return { ...it, id: newId };
                });
                qOrdenacao.ordem_correta_ids = qOrdenacao.ordem_correta_ids?.map((id) => idMap.get(id) || id) || [];
              }
              return newQ;
            });
            setEstrutura((prev: EstruturaAtividadeProva) => ({
              ...prev,
              questoes: [...prev.questoes, ...sanitized]
            }));
            alert("Questões importadas com sucesso!");
          } else {
            alert("Formato inválido. O arquivo JSON deve conter um array de questões.");
          }
        } catch (err) {
          console.error(err);
          alert("Erro ao ler o arquivo JSON.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handlePrint = () => {
    generatePrintablePdf({
      titulo,
      descricao,
      estrutura
    });
  };

  const distributePoints = () => {
    if (estrutura.questoes.length === 0) return;
    const target = parseFloat(pontuacaoTotalTarget);
    if (isNaN(target) || target <= 0) {
      alert("Por favor, insira um valor válido para a pontuação total.");
      return;
    }
    const pointsPerQuestion = Number((target / estrutura.questoes.length).toFixed(2));
    
    setEstrutura((prev: EstruturaAtividadeProva) => {
      const novasQuestoes = prev.questoes.map(q => ({
        ...q,
        pontuacao_maxima: pointsPerQuestion
      }));
      return { ...prev, questoes: novasQuestoes };
    });
    alert(`A pontuação foi distribuída! ${pointsPerQuestion} pontos por questão.`);
  };

  const handleSaveClick = () => {
    if (!titulo || !categoriaId) {
      alert('Título e Categoria são obrigatórios!');
      return;
    }
    onSave({ titulo, descricao, categoriaId, aulaId, isAtivo, estrutura });
  };

  return (
    <main className="max-w-4xl mx-auto px-4 mt-8 space-y-8">
      
      {/* Cabecalho Info Basica */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
        <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2">Configurações da Atividade</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Linha 1 */}
          <div className="lg:col-span-4">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Título</label>
            <input 
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 outline-none shadow-sm transition-all" 
              placeholder="Ex: Prova HSK 1"
            />
          </div>
          
          <div className="lg:col-span-3">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Categoria</label>
            <div className="flex gap-1.5">
              <select 
                value={categoriaId}
                onChange={e => setCategoriaId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 outline-none shadow-sm transition-all bg-white"
              >
                <option value="">Selecione...</option>
                {categorias.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
              <button 
                onClick={handleNovaCategoria}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 rounded-lg transition-colors"
                title="Criar Nova Categoria"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="lg:col-span-3">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Aula Vinculada</label>
            <select 
              value={aulaId}
              onChange={e => setAulaId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 outline-none shadow-sm transition-all bg-white"
            >
              <option value="">Nenhuma</option>
              {aulas.map(a => (
                <option key={a.id} value={a.id}>Aula {a.codigo_aula}</option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2 flex items-end">
            <label className="w-full flex items-center justify-between cursor-pointer bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Ativa</span>
              <input 
                type="checkbox" 
                checked={isAtivo}
                onChange={e => setIsAtivo(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Linha 2 */}
          <div className="lg:col-span-5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Instruções</label>
            <input 
              type="text"
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 outline-none shadow-sm transition-all"
              placeholder="Instruções curtas para o aluno..."
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tempo (Min)</label>
            <input 
              type="number"
              value={estrutura.configuracoes.tempo_limite_minutos || ''}
              onChange={e => setEstrutura((prev: EstruturaAtividadeProva) => ({
                ...prev, 
                configuracoes: { ...prev.configuracoes, tempo_limite_minutos: e.target.value ? Number(e.target.value) : undefined }
              }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 outline-none shadow-sm transition-all text-center" 
              placeholder="Sem limite"
            />
          </div>

          <div className="lg:col-span-3">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Modo Mandarim</label>
            <select 
              value={estrutura.configuracoes.modo_exibicao_mandarim || 'god_mode'}
              onChange={e => setEstrutura((prev: EstruturaAtividadeProva) => ({
                ...prev, 
                configuracoes: { ...prev.configuracoes, modo_exibicao_mandarim: e.target.value as 'pinyin_hanzi' | 'so_hanzi' | 'god_mode' }
              }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 outline-none shadow-sm transition-all bg-white"
            >
              <option value="god_mode">God Mode</option>
              <option value="pinyin_hanzi">Estilizado</option>
              <option value="so_hanzi">Só Hanzi</option>
            </select>
          </div>

          <div className="lg:col-span-2 flex items-end">
            <label className="w-full flex items-center justify-between cursor-pointer bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Misturar</span>
              <input 
                type="checkbox" 
                checked={estrutura.configuracoes.embaralhar_questoes || false}
                onChange={e => setEstrutura((prev: EstruturaAtividadeProva) => ({
                  ...prev, 
                  configuracoes: { ...prev.configuracoes, embaralhar_questoes: e.target.checked }
                }))}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Questões */}
      <div className="space-y-6">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm gap-4 flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl font-bold text-slate-800">
              Questões <span className="bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full text-sm ml-2">{estrutura.questoes.length}</span>
            </h2>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <button 
                onClick={importFromJson}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl font-bold transition-colors text-sm flex-1 sm:flex-none justify-center"
                title="Importar questões de um arquivo JSON"
              >
                <Upload className="w-4 h-4" /> Importar
              </button>
              <button 
                onClick={exportToJson}
                disabled={estrutura.questoes.length === 0}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl font-bold transition-colors text-sm disabled:opacity-50 flex-1 sm:flex-none justify-center"
                title="Exportar questões para um arquivo JSON"
              >
                <Download className="w-4 h-4" /> Exportar
              </button>
              <button 
                onClick={handlePrint}
                disabled={estrutura.questoes.length === 0}
                className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-2 rounded-xl font-bold transition-colors text-sm disabled:opacity-50 flex-1 sm:flex-none justify-center border border-emerald-200"
                title="Gerar visualização de aluno para impressão em PDF (QR Codes automáticos)"
              >
                <Printer className="w-4 h-4" /> PDF
              </button>
              <button 
                onClick={addQuestao}
                className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl font-bold transition-colors text-sm w-full sm:w-auto justify-center mt-2 sm:mt-0"
              >
                <Plus className="w-5 h-5" /> Nova Questão
              </button>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-3 border-t border-slate-100">
            <span className="text-sm font-semibold text-slate-600">Distribuir pontos igualmente:</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                step="0.5"
                value={pontuacaoTotalTarget}
                onChange={e => setPontuacaoTotalTarget(e.target.value)}
                className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-center"
                placeholder="Ex: 10"
              />
              <button 
                onClick={distributePoints}
                disabled={estrutura.questoes.length === 0}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
              >
                Distribuir
              </button>
            </div>
            {estrutura.questoes.length > 0 && (
              <span className="text-xs text-slate-400 sm:ml-auto">
                Total atual: {estrutura.questoes.reduce((acc, q) => acc + (q.pontuacao_maxima || 0), 0).toFixed(2)} pts
              </span>
            )}
          </div>
        </div>

        {estrutura.questoes.map((q: QuestaoProva, index: number) => (
          <QuestaoEditor 
            key={q.id}
            questao={q}
            index={index}
            totalQuestoes={estrutura.questoes.length}
            onChange={updateQuestao}
            onMove={moveQuestao}
            onRemove={removeQuestao}
            onDuplicate={duplicateQuestao}
          />
        ))}

        {estrutura.questoes.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <p className="text-slate-500 font-medium">Sua prova está vazia. Adicione a primeira questão!</p>
          </div>
        ) : (
          <div className="flex justify-center mt-6">
            <button 
              onClick={addQuestao}
              className="flex items-center gap-2 bg-white border border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300 text-indigo-700 px-6 py-3 rounded-2xl font-bold transition-all shadow-sm"
            >
              <Plus className="w-5 h-5" /> Adicionar Outra Questão
            </button>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="sticky bottom-6 flex justify-end gap-3 bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-xl">
        <button 
          onClick={onCancel}
          className="px-6 py-2.5 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-colors"
        >
          Cancelar
        </button>
        <button 
          onClick={handleSaveClick}
          disabled={loading}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-xl font-bold shadow-md transition-all disabled:opacity-50"
        >
          {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white/50"></div> : <Save className="w-5 h-5" />}
          {saveButtonText}
        </button>
      </div>

    </main>
  );
}
