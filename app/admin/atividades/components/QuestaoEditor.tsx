import { ArrowUp, ArrowDown, Trash2, Plus, Upload, Loader2, Copy, Image as ImageIcon } from 'lucide-react';
import { QuestaoProva, FragmentoMandarim, HabilidadePedagogica } from '../../../../types/atividades';
import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
// @ts-expect-error - lamejsfix doesn't have strict type definitions
import lamejs from 'lamejsfix';
import { RichTextEditor } from '../../../components/ui/RichTextEditor';
import { buildLaoshiMediaPath } from '../../../../lib/storageUtils';

interface QuestaoEditorProps {
  questao: QuestaoProva;
  index: number;
  totalQuestoes: number;
  onChange: (id: string, updates: Partial<QuestaoProva>) => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
  onRemove: (id: string) => void;
  onDuplicate?: (index: number) => void;
}

const HABILIDADES_OPCOES: { value: HabilidadePedagogica, label: string }[] = [
  { value: 'leitura', label: 'Leitura' },
  { value: 'escrita', label: 'Escrita' },
  { value: 'escuta', label: 'Escuta' },
  { value: 'fala', label: 'Fala' },
  { value: 'gramatica', label: 'Gramática' },
  { value: 'vocabulario', label: 'Vocabulário' },
];

const generateId = () => Math.random().toString(36).substring(2, 9);

export default function QuestaoEditor({ questao, index, totalQuestoes, onChange, onMove, onRemove, onDuplicate }: QuestaoEditorProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [showMediaInput, setShowMediaInput] = useState(!!questao.midia_anexa?.tipo);
  const supabase = createClientComponentClient();
  
  // Handlers genéricos
  const handleChange = (field: string, value: unknown) => {
    onChange(questao.id, { [field]: value } as unknown as Partial<QuestaoProva>);
  };

  // Upload inteligente
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !questao.midia_anexa) return;

    try {
      setIsUploading(true);
      let fileToUpload: File | Blob = file;
      let ext = file.name.split('.').pop() || 'file';

      const shouldCompress = window.confirm("Deseja comprimir/otimizar o arquivo antes do upload? (Isso converterá para JPG/MP3 de alta performance)");

      if (shouldCompress) {
        // Compressão Inteligente de Imagem (JPEG 85%)
        if (questao.midia_anexa.tipo === 'imagem' && file.type.startsWith('image/')) {
          const compressedBlob = await new Promise<Blob>((resolve, reject) => {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              if (!ctx) return reject('No canvas context');
              ctx.drawImage(img, 0, 0);
              canvas.toBlob(blob => blob ? resolve(blob) : reject('Failed to compress'), 'image/jpeg', 0.85);
            };
            img.onerror = reject;
          });
          fileToUpload = compressedBlob;
          ext = 'jpg';
        }
        
        // Conversão Inteligente de Áudio (48000Hz MP3)
        if (questao.midia_anexa.tipo === 'audio' && file.type.startsWith('audio/')) {
          const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({ sampleRate: 48000 });
          const arrayBuffer = await file.arrayBuffer();
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          
          const channels = audioBuffer.numberOfChannels;
          const sampleRate = audioBuffer.sampleRate;
          const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, 128);
          const mp3Data: Int8Array[] = [];

          const left = audioBuffer.getChannelData(0);
          const right = channels > 1 ? audioBuffer.getChannelData(1) : undefined;
          const sampleBlockSize = 1152;

          const floatToInt16 = (f32Arr: Float32Array) => {
            const i16Arr = new Int16Array(f32Arr.length);
            for (let i = 0; i < f32Arr.length; i++) {
              const s = Math.max(-1, Math.min(1, f32Arr[i]));
              i16Arr[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
            return i16Arr;
          };

          const left16 = floatToInt16(left);
          const right16 = right ? floatToInt16(right) : undefined;

          for (let i = 0; i < left16.length; i += sampleBlockSize) {
            const leftChunk = left16.subarray(i, i + sampleBlockSize);
            const rightChunk = right16 ? right16.subarray(i, i + sampleBlockSize) : undefined;
            
            const mp3buf = rightChunk 
              ? mp3encoder.encodeBuffer(leftChunk, rightChunk) 
              : mp3encoder.encodeBuffer(leftChunk);
              
            if (mp3buf.length > 0) {
              mp3Data.push(mp3buf);
            }
          }
          const finalBuf = mp3encoder.flush();
          if (finalBuf.length > 0) {
            mp3Data.push(finalBuf);
          }
          
          fileToUpload = new Blob(mp3Data as unknown as BlobPart[], { type: 'audio/mp3' });
          ext = 'mp3';
        }
      }

      // Build an organised storage path: q{nn}/{safeName}_{timestamp}_{rand}.{ext}
      const fileName = buildLaoshiMediaPath({ questionIndex: index, originalName: file.name, ext });
      
      const { error } = await supabase.storage
        .from('atvdd_laoshi')
        .upload(fileName, fileToUpload);
        
      if (error) throw error;
      
      const { data: publicUrlData } = supabase.storage
        .from('atvdd_laoshi')
        .getPublicUrl(fileName);
        
      const resolvedUrl = publicUrlData.publicUrl.replace(
        /^https:\/\/portfolio-demo\.supabase\.co\/storage\/v1\/object\/public\//,
        '/demo-storage/'
      );
      handleChange('midia_anexa', { ...questao.midia_anexa, url: resolvedUrl });
      
    } catch (err: unknown) {
      console.error('Erro no upload', err);
      const errorMessage = err instanceof Error ? err.message : JSON.stringify(err) || 'Erro desconhecido.';
      alert(`Falha ao fazer upload da mídia. Detalhes: ${errorMessage}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Lógica de Fragmentos Mandarim [X]
  const matchCount = (questao.enunciado.match(/\[X\]/g) || []).length;
  const updateFragmento = (fragIndex: number, field: keyof FragmentoMandarim, value: string) => {
    const key = `frag_${fragIndex}`;
    const fragmentos = { ...(questao.fragmentos_mandarim || {}) };
    fragmentos[key] = { ...(fragmentos[key] || {}), [field]: value };
    handleChange('fragmentos_mandarim', fragmentos);
  };

  // Renderizadores Específicos por Tipo
  const renderMultiplaEscolha = () => {
    if (questao.tipo !== 'multipla_escolha') return null;
    return (
      <div className="space-y-3 mt-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-sm font-bold text-slate-700">Opções de Resposta</h4>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input 
              type="checkbox" 
              checked={questao.permite_multiplas_respostas}
              onChange={(e) => handleChange('permite_multiplas_respostas', e.target.checked)}
              className="rounded text-indigo-600"
            />
            Permitir múltiplas respostas corretas
          </label>
        </div>
        
        {questao.opcoes.map((opcao, oIdx) => {
          const isCorrect = questao.respostas_corretas_ids.includes(opcao.id);
          return (
            <div key={opcao.id} className={`flex items-start gap-3 p-3 rounded-xl border ${isCorrect ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
              <div className="pt-2">
                <input 
                  type={questao.permite_multiplas_respostas ? "checkbox" : "radio"}
                  name={`correct_${questao.id}`}
                  checked={isCorrect}
                  onChange={(e) => {
                    let newCorrects = [...questao.respostas_corretas_ids];
                    if (questao.permite_multiplas_respostas) {
                      if (e.target.checked) newCorrects.push(opcao.id);
                      else newCorrects = newCorrects.filter(id => id !== opcao.id);
                    } else {
                      newCorrects = [opcao.id];
                    }
                    handleChange('respostas_corretas_ids', newCorrects);
                  }}
                  className="w-4 h-4 text-emerald-600"
                />
              </div>
              <div className="flex-1 space-y-2">
                <input 
                  type="text"
                  value={opcao.texto_simples || ''}
                  onChange={e => {
                    const newOpcoes = [...questao.opcoes];
                    newOpcoes[oIdx] = { ...opcao, texto_simples: e.target.value };
                    handleChange('opcoes', newOpcoes);
                  }}
                  className="w-full bg-transparent border-none focus:ring-0 text-sm font-medium outline-none p-0"
                  placeholder="Digite o texto da opção..."
                />
              </div>
              <button 
                onClick={() => {
                  const newOpcoes = questao.opcoes.filter(o => o.id !== opcao.id);
                  const newCorrects = questao.respostas_corretas_ids.filter(id => id !== opcao.id);
                  onChange(questao.id, { opcoes: newOpcoes, respostas_corretas_ids: newCorrects } as unknown as Partial<QuestaoProva>);
                }}
                className="text-slate-400 hover:text-red-500 p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
        <button 
          onClick={() => {
            const newOpcoes = [...questao.opcoes, { id: generateId(), texto_simples: `Opção ${questao.opcoes.length + 1}` }];
            handleChange('opcoes', newOpcoes);
          }}
          className="flex items-center gap-1 text-sm text-indigo-600 font-bold hover:text-indigo-800"
        >
          <Plus className="w-4 h-4" /> Adicionar Opção
        </button>
      </div>
    );
  };

  const renderOrdenacao = () => {
    if (questao.tipo !== 'ordenacao') return null;
    const itens = questao.itens_para_ordenar || [];
    return (
      <div className="space-y-3 mt-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
        <p className="text-sm text-slate-500 mb-4">Adicione os itens na <strong>ordem correta</strong>. O sistema embaralhará automaticamente para o aluno.</p>
        
        {itens.map((item, iIdx) => (
          <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-col gap-1 text-slate-400">
              <button onClick={() => {
                if (iIdx === 0) return;
                const newItens = [...itens];
                const temp = newItens[iIdx];
                newItens[iIdx] = newItens[iIdx - 1];
                newItens[iIdx - 1] = temp;
                onChange(questao.id, { 
                  itens_para_ordenar: newItens,
                  ordem_correta_ids: newItens.map(i => i.id)
                } as unknown as Partial<QuestaoProva>);
              }} disabled={iIdx === 0} className="hover:text-indigo-600 disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
              <button onClick={() => {
                if (iIdx === itens.length - 1) return;
                const newItens = [...itens];
                const temp = newItens[iIdx];
                newItens[iIdx] = newItens[iIdx + 1];
                newItens[iIdx + 1] = temp;
                onChange(questao.id, { 
                  itens_para_ordenar: newItens,
                  ordem_correta_ids: newItens.map(i => i.id)
                } as unknown as Partial<QuestaoProva>);
              }} disabled={iIdx === itens.length - 1} className="hover:text-indigo-600 disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
            </div>
            <div className="flex-1">
              <input 
                type="text"
                value={item.texto_simples || ''}
                onChange={e => {
                  const newItens = [...itens];
                  newItens[iIdx] = { ...item, texto_simples: e.target.value };
                  onChange(questao.id, { itens_para_ordenar: newItens } as unknown as Partial<QuestaoProva>);
                }}
                className="w-full border-none focus:ring-0 text-sm font-medium outline-none p-0"
                placeholder="Texto do item..."
              />
            </div>
            <button 
              onClick={() => {
                const newItens = itens.filter(o => o.id !== item.id);
                onChange(questao.id, { 
                  itens_para_ordenar: newItens,
                  ordem_correta_ids: newItens.map(i => i.id)
                } as unknown as Partial<QuestaoProva>);
              }}
              className="text-slate-400 hover:text-red-500 p-1"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button 
          onClick={() => {
            const newItem = { id: generateId(), texto_simples: '' };
            const newItens = [...itens, newItem];
            onChange(questao.id, { 
              itens_para_ordenar: newItens,
              ordem_correta_ids: newItens.map(i => i.id)
            } as unknown as Partial<QuestaoProva>);
          }}
          className="flex items-center gap-1 text-sm text-indigo-600 font-bold hover:text-indigo-800"
        >
          <Plus className="w-4 h-4" /> Adicionar Item
        </button>
      </div>
    );
  };

  const renderLacunas = () => {
    if (questao.tipo !== 'preencher_lacunas') return null;
    
    const textoComLacunas = questao.texto_com_lacunas || '';
    const matchLacunas = (textoComLacunas.match(/\[___\]/g) || []).length;

    return (
      <div className="space-y-4 mt-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Texto com as lacunas</label>
          <p className="text-xs text-slate-500 mb-2">Use <code className="bg-slate-200 px-1 py-0.5 rounded text-indigo-600">[___]</code> para marcar onde o aluno deve preencher.</p>
          <div className="bg-white rounded-xl border border-slate-300 overflow-hidden">
            <RichTextEditor 
              value={textoComLacunas}
              onChange={val => handleChange('texto_com_lacunas', val)}
              placeholder="Ex: Wǒ [___] xuésheng."
            />
          </div>
        </div>
        
        {matchLacunas > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-700">Respostas Aceitas (por lacuna)</h4>
            {Array.from({ length: matchLacunas }).map((_, i) => {
              const lacunaKey = `lacuna_${i}`;
              const respostas = questao.respostas_corretas_por_lacuna?.[lacunaKey] || [];
              
              return (
                <div key={i} className="flex gap-3 items-center">
                  <div className="font-mono text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">Lacuna {i + 1}</div>
                  <LacunaRespostaInput
                    key={`${questao.id}-${lacunaKey}`}
                    defaultValue={respostas}
                    onChange={arr => {
                      const novoMapa = { ...(questao.respostas_corretas_por_lacuna || {}) };
                      novoMapa[lacunaKey] = arr;
                      handleChange('respostas_corretas_por_lacuna', novoMapa);
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderTextoLivre = () => {
    if (questao.tipo !== 'texto_livre') return null;
    return (
      <div className="mt-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
        <label className="block text-sm font-bold text-slate-700 mb-1.5">Limite de Caracteres</label>
        <input 
          type="number"
          value={questao.limite_caracteres || ''}
          onChange={e => handleChange('limite_caracteres', Number(e.target.value))}
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 max-w-xs"
          placeholder="Ex: 500 (Opcional)"
        />
      </div>
    );
  };

  const renderAudioUpload = () => {
    if (questao.tipo !== 'audio_upload') return null;
    return (
      <div className="mt-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
        <label className="block text-sm font-bold text-slate-700 mb-1.5">Tempo Máximo de Gravação (Segundos)</label>
        <input 
          type="number"
          value={questao.tempo_maximo_segundos || ''}
          onChange={e => handleChange('tempo_maximo_segundos', Number(e.target.value))}
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 max-w-xs"
          placeholder="Ex: 60"
        />
      </div>
    );
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 relative group transition-all hover:shadow-md">
      <div className="space-y-4">
        {/* Cabeçalho Compacto: Número, Tipo, Pontuação e Ações */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-100 rounded-xl p-2">
          
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="bg-indigo-600 text-white w-8 h-8 shrink-0 rounded-lg flex items-center justify-center font-black text-sm shadow-sm">
              {index + 1}
            </div>
            
            <div className="flex items-center gap-2">
              <select 
                value={questao.tipo}
                onChange={e => {
                  const tipo = e.target.value as QuestaoProva['tipo'];
                  const resetData: Record<string, unknown> = { tipo };
                  if (tipo === 'multipla_escolha') {
                    resetData.opcoes = [{ id: generateId(), texto_simples: 'Opção 1' }, { id: generateId(), texto_simples: 'Opção 2' }];
                    resetData.respostas_corretas_ids = [];
                    resetData.permite_multiplas_respostas = false;
                  }
                  if (tipo === 'ordenacao') {
                    resetData.itens_para_ordenar = [{ id: generateId(), texto_simples: 'Item 1' }];
                    resetData.ordem_correta_ids = [];
                  }
                  onChange(questao.id, resetData as unknown as Partial<QuestaoProva>);
                }}
                className="w-36 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700 outline-none hover:border-indigo-300 focus:border-indigo-500 shadow-sm transition-all cursor-pointer"
              >
                <option value="multipla_escolha">Múltipla Escolha</option>
                <option value="ordenacao">Ordenação</option>
                <option value="texto_livre">Texto Livre</option>
                <option value="audio_upload">Áudio</option>
                <option value="preencher_lacunas">Lacunas</option>
              </select>
            </div>

            <div className="w-px h-6 bg-slate-200 hidden sm:block"></div>

            <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pts</span>
              <input 
                type="number"
                value={questao.pontuacao_maxima}
                onChange={e => handleChange('pontuacao_maxima', Number(e.target.value))}
                className="w-14 text-sm font-black text-indigo-700 outline-none bg-transparent text-center"
                min="0"
              />
            </div>
          </div>

          {/* Ações da Questão Inline */}
          <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity shrink-0 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm">
            <button onClick={() => onMove(index, 'up')} disabled={index === 0} className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30" title="Subir">
              <ArrowUp className="w-4 h-4" />
            </button>
            <button onClick={() => onMove(index, 'down')} disabled={index === totalQuestoes - 1} className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30" title="Descer">
              <ArrowDown className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setShowMediaInput(!showMediaInput)} 
              className={`p-1 rounded transition-colors ${showMediaInput || questao.midia_anexa?.tipo ? 'text-indigo-600 bg-indigo-50 opacity-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`} 
              title="Anexar Mídia"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
            {onDuplicate && (
              <button onClick={() => onDuplicate(index)} className="px-1.5 py-1 flex items-center gap-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 font-bold text-[10px] uppercase transition-colors" title="Duplicar">
                <Copy className="w-3.5 h-3.5" />
                Duplicar
              </button>
            )}
            <div className="w-px h-4 bg-slate-200 mx-1"></div>
            <button onClick={() => onRemove(questao.id)} className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50" title="Remover">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Habilidades Inline Compactas */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Habilidades:</span>
          {HABILIDADES_OPCOES.map(hab => {
            const selected = questao.habilidades_testadas?.includes(hab.value) || false;
            return (
              <button
                key={hab.value}
                onClick={() => {
                  const atual = questao.habilidades_testadas || [];
                  const novo = selected ? atual.filter(h => h !== hab.value) : [...atual, hab.value];
                  handleChange('habilidades_testadas', novo);
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                  selected 
                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-sm' 
                    : 'bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600 border border-slate-200'
                }`}
              >
                {hab.label}
              </button>
            )
          })}
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">
            Enunciado 
            <span className="text-xs font-normal text-slate-500 ml-2">(Use `[X]` para gerar blocos de mandarim avançados)</span>
          </label>
          <RichTextEditor
            value={questao.enunciado}
            onChange={(v) => handleChange('enunciado', v)}
            placeholder="Escreva a pergunta aqui... (Selecione o texto para formatar)"
          />
        </div>

        {/* Formulários dinâmicos para Fragmentos Mandarim baseados em [X] no enunciado */}
        {matchCount > 0 && (
          <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 space-y-3">
            <h4 className="text-sm font-bold text-indigo-800 flex items-center gap-2">
              Blocos de Mandarim <span className="bg-indigo-200 text-indigo-800 px-2 rounded-full text-xs">{matchCount} detectados</span>
            </h4>
            <div className="grid grid-cols-1 gap-3">
              {Array.from({ length: matchCount }).map((_, i) => {
                const f = questao.fragmentos_mandarim?.[`frag_${i}`] || {};
                return (
                  <div key={i} className="flex flex-wrap gap-2 items-center bg-white p-2 rounded-lg border border-indigo-100">
                    <span className="text-xs font-bold text-slate-400 w-8">#{i+1}</span>
                    <input type="text" placeholder="Hanzi" value={f.hanzi || ''} onChange={e => updateFragmento(i, 'hanzi', e.target.value)} className="flex-1 min-w-20 text-sm px-2 py-1 border border-slate-200 rounded outline-none focus:border-indigo-400" />
                    <input type="text" placeholder="Pinyin" value={f.pinyin || ''} onChange={e => updateFragmento(i, 'pinyin', e.target.value)} className="flex-1 min-w-20 text-sm px-2 py-1 border border-slate-200 rounded outline-none focus:border-indigo-400" />
                    <input type="text" placeholder="Tradução" value={f.traducao || ''} onChange={e => updateFragmento(i, 'traducao', e.target.value)} className="flex-1 min-w-20 text-sm px-2 py-1 border border-slate-200 rounded outline-none focus:border-indigo-400" />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Mídia Anexa Compacta */}
        {(showMediaInput || questao.midia_anexa?.tipo) && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl p-2 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-2 min-w-45">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Mídia</span>
            <select 
              value={questao.midia_anexa?.tipo || ''}
              onChange={e => {
                if (!e.target.value) handleChange('midia_anexa', undefined);
                else handleChange('midia_anexa', { tipo: e.target.value, url: questao.midia_anexa?.url || '' });
              }}
              className="flex-1 text-sm border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-indigo-500 bg-white shadow-sm cursor-pointer font-medium text-slate-700"
            >
              <option value="">Nenhuma</option>
              <option value="imagem">Imagem</option>
              <option value="audio">Áudio</option>
              <option value="video">Vídeo</option>
            </select>
          </div>
          
          {questao.midia_anexa && (
            <>
              <div className="hidden sm:block w-px h-6 bg-slate-200"></div>
              <div className="flex-1 flex gap-2 items-center">
                <input 
                  type="text" 
                  value={questao.midia_anexa.url}
                  onChange={e => handleChange('midia_anexa', { ...questao.midia_anexa, url: e.target.value })}
                  placeholder="URL (YouTube ou Direta)..."
                  className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1 outline-none focus:border-indigo-500 shadow-sm"
                />
                <label className="flex items-center gap-1.5 cursor-pointer bg-white border border-indigo-200 hover:border-indigo-600 hover:bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-xs font-bold transition-colors shadow-sm whitespace-nowrap">
                  {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  <span>Upload</span>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept={questao.midia_anexa.tipo === 'imagem' ? 'image/*' : questao.midia_anexa.tipo === 'audio' ? 'audio/*' : 'video/*'}
                    onChange={handleUpload}
                    disabled={isUploading}
                  />
                </label>
              </div>
            </>
          )}
        </div>
        )}

        {/* Resposta Esperada (Apenas para Texto Livre, já que os outros são automatizados) */}
        {questao.tipo === 'texto_livre' && (
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              Resposta Esperada / Dica 
              <span className="text-xs font-normal text-slate-500 ml-2">(Referência para o corretor manual)</span>
            </label>
            <textarea 
              value={questao.resposta_esperada || ''}
              onChange={e => handleChange('resposta_esperada', e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 min-h-15 resize-y"
              placeholder="O que se espera que o aluno responda ou saiba..."
            />
          </div>
        )}

        {/* Editores Específicos de acordo com o Tipo */}
        {renderMultiplaEscolha()}
        {renderOrdenacao()}
        {renderLacunas()}
        {renderTextoLivre()}
        {renderAudioUpload()}

      </div>
    </div>
  );
}

function LacunaRespostaInput({
  defaultValue,
  onChange,
}: {
  defaultValue: string[];
  onChange: (arr: string[]) => void;
}) {
  const [val, setVal] = useState(() => defaultValue.join(', '));

  return (
    <input
      type="text"
      value={val}
      onChange={e => {
        const raw = e.target.value;
        setVal(raw);
        const arr = raw
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
        onChange(arr);
      }}
      placeholder="Respostas separadas por vírgula (Ex: shì, shi)"
      className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all bg-white"
    />
  );
}

