'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useParams } from 'next/navigation';
import { Loader2, Save, Plus, Trash2, AlertCircle, Copy, Settings2, ZoomIn, ZoomOut, MessageSquare } from 'lucide-react';
import posthog from 'posthog-js';
import SetNavbar from '../../../../components/SetNavbar';

// As 14 colunas de dados que vamos editar
const COLUNAS = [
    'fala_pc_hanzi', 'fala_pc_pinyin', 'fala_pc_pt',
    'resposta_certa_hanzi', 'resposta_certa_pinyin', 'resposta_certa_pt',
    'opcao2_hanzi', 'opcao2_pinyin', 'opcao2_pt', 'opcao2_correcao',
    'opcao3_hanzi', 'opcao3_pinyin', 'opcao3_pt', 'opcao3_correcao'
] as const;

// Metadados visuais de cada coluna
const COLUNAS_META: Record<typeof COLUNAS[number], { label: string; group: 'pc' | 'certa' | 'op2' | 'op3'; width: number }> = {
    fala_pc_hanzi:          { label: 'PC: Hanzi',        group: 'pc',    width: 192 },
    fala_pc_pinyin:         { label: 'PC: Pinyin',       group: 'pc',    width: 192 },
    fala_pc_pt:             { label: 'PC: PT',           group: 'pc',    width: 192 },
    resposta_certa_hanzi:   { label: 'Certa: Hanzi',     group: 'certa', width: 192 },
    resposta_certa_pinyin:  { label: 'Certa: Pinyin',    group: 'certa', width: 192 },
    resposta_certa_pt:      { label: 'Certa: PT',        group: 'certa', width: 192 },
    opcao2_hanzi:           { label: 'Op.2: Hanzi',      group: 'op2',   width: 192 },
    opcao2_pinyin:          { label: 'Op.2: Pinyin',     group: 'op2',   width: 192 },
    opcao2_pt:              { label: 'Op.2: PT',         group: 'op2',   width: 192 },
    opcao2_correcao:        { label: 'Op.2: Correção',   group: 'op2',   width: 256 },
    opcao3_hanzi:           { label: 'Op.3: Hanzi',      group: 'op3',   width: 192 },
    opcao3_pinyin:          { label: 'Op.3: Pinyin',     group: 'op3',   width: 192 },
    opcao3_pt:              { label: 'Op.3: PT',         group: 'op3',   width: 192 },
    opcao3_correcao:        { label: 'Op.3: Correção',   group: 'op3',   width: 256 },
};

const GROUP_STYLES = {
    pc:    'bg-blue-50 text-blue-800 border-blue-200',
    certa: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    op2:   'bg-amber-50 text-amber-800 border-amber-200',
    op3:   'bg-rose-50 text-rose-800 border-rose-200',
} as const;

const GROUP_CELL_FOCUS = {
    pc:    'focus:bg-blue-50/50 focus:ring-1 focus:ring-blue-400',
    certa: 'focus:bg-emerald-50/50 focus:ring-1 focus:ring-emerald-400',
    op2:   'focus:bg-amber-50/50 focus:ring-1 focus:ring-amber-400',
    op3:   'focus:bg-rose-50/50 focus:ring-1 focus:ring-rose-400',
} as const;

type NomeColuna = typeof COLUNAS[number];
type LinhaGrid = Record<NomeColuna, string>;

type Aula = {
    id: string;
    codigo_aula: string;
    titulo_descritivo: string;
};

const linhaVazia = (): LinhaGrid => ({
    fala_pc_hanzi: '', fala_pc_pinyin: '', fala_pc_pt: '',
    resposta_certa_hanzi: '', resposta_certa_pinyin: '', resposta_certa_pt: '',
    opcao2_hanzi: '', opcao2_pinyin: '', opcao2_pt: '', opcao2_correcao: '',
    opcao3_hanzi: '', opcao3_pinyin: '', opcao3_pt: '', opcao3_correcao: ''
});

export default function EditarDialogoPlanilha() {
    const supabase = createClientComponentClient();
    const params = useParams();
    const dialogoId = params.id as string;

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Capa do Diálogo
    const [tituloDialogo, setTituloDialogo] = useState('');
    const [cenarioDialogo, setCenarioDialogo] = useState('');
    const [aulaIdSelecionada, setAulaIdSelecionada] = useState('');
    const [aulasLista, setAulasLista] = useState<Aula[]>([]);

    // Grid
    const [linhas, setLinhas] = useState<LinhaGrid[]>([]);
    const [statusMsg, setStatusMsg] = useState<{ text: string, type: 'error' | 'success' | 'info' } | null>(null);
    const [zoom, setZoom] = useState(1);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error || !user) return;

            const { data: aulasDb } = await supabase.from('aulas').select('id, codigo_aula, titulo_descritivo').order('codigo_aula');
            if (aulasDb) setAulasLista(aulasDb);

            const { data: dialogo } = await supabase.from('dialogos').select('titulo, cenario, aula_id').eq('id', dialogoId).single();
            if (dialogo) {
                setTituloDialogo(dialogo.titulo || '');
                setCenarioDialogo(dialogo.cenario || '');
                setAulaIdSelecionada(dialogo.aula_id || '');
            }

            const { data: linhasDb } = await supabase.from('dialogo_linhas').select('*').eq('dialogo_id', dialogoId).order('ordem');

            if (linhasDb && linhasDb.length > 0) {
                const linhasFormatadas = linhasDb.map(row => {
                    const l = linhaVazia();
                    COLUNAS.forEach(col => { l[col] = row[col] || ''; });
                    return l;
                });
                setLinhas(linhasFormatadas);
            } else {
                setLinhas([linhaVazia()]);
            }
        } catch (error) {
            console.error(error);
            setStatusMsg({ text: 'Erro ao carregar dados', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [dialogoId, supabase]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ==========================================
    // PINCH-TO-ZOOM (Ctrl+Wheel)
    // ==========================================
    useEffect(() => {
        const el = scrollContainerRef.current;
        if (!el) return;
        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                setZoom(prev => Math.max(0.3, Math.min(prev - e.deltaY * 0.005, 2.5)));
            }
        };
        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    }, []);

    // ==========================================
    // LÓGICA DE CÉLULAS E COLA EM MASSA
    // ==========================================
    const handleCellChange = (rowIndex: number, colName: NomeColuna, value: string) => {
        const novasLinhas = [...linhas];
        novasLinhas[rowIndex][colName] = value;
        setLinhas(novasLinhas);
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, startRowIndex: number, startColName: NomeColuna) => {
        const pasteData = e.clipboardData.getData('text');
        if (!pasteData.includes('\t') && !pasteData.includes('\n')) return;
        e.preventDefault();

        const pastedRows = pasteData.split(/\r?\n/).map(row => row.split('\t'));
        const startColIndex = COLUNAS.indexOf(startColName);
        const novasLinhas = [...linhas];

        pastedRows.forEach((pRowData, i) => {
            if (pRowData.length === 1 && pRowData[0] === '') return;
            const targetRowIdx = startRowIndex + i;
            if (!novasLinhas[targetRowIdx]) novasLinhas.push(linhaVazia());
            pRowData.forEach((cellValue, j) => {
                const targetColIdx = startColIndex + j;
                if (targetColIdx < COLUNAS.length) {
                    const colName = COLUNAS[targetColIdx];
                    novasLinhas[targetRowIdx][colName] = cellValue.trim();
                }
            });
        });

        setLinhas(novasLinhas);
        setStatusMsg({ text: `✓ ${pastedRows.filter(r => !(r.length === 1 && r[0] === '')).length} linha(s) colada(s)`, type: 'success' });
        setTimeout(() => setStatusMsg(null), 2500);
    };

    // ==========================================
    // CONTROLES DA TABELA
    // ==========================================
    const addLinha = () => setLinhas([...linhas, linhaVazia()]);

    const removeLinha = (idx: number) => {
        if (linhas.length === 1) return setLinhas([linhaVazia()]);
        setLinhas(linhas.filter((_, i) => i !== idx));
    };

    const handleSaveGrid = async () => {
        if (!aulaIdSelecionada) {
            setStatusMsg({ text: 'Selecione uma aula antes de salvar.', type: 'error' });
            return;
        }
        setIsSaving(true);
        setStatusMsg({ text: 'Salvando...', type: 'info' });

        try {
            const { error: errorDialogo } = await supabase.from('dialogos').update({
                titulo: tituloDialogo,
                cenario: cenarioDialogo || null,
                aula_id: aulaIdSelecionada
            }).eq('id', dialogoId);
            if (errorDialogo) throw errorDialogo;

            const linhasValidas = linhas.filter(l => COLUNAS.some(col => l[col].trim() !== ''));
            await supabase.from('dialogo_linhas').delete().eq('dialogo_id', dialogoId);

            if (linhasValidas.length > 0) {
                const payload = linhasValidas.map((l, idx) => ({
                    dialogo_id: dialogoId,
                    ordem: idx + 1,
                    ...l
                }));
                const { error } = await supabase.from('dialogo_linhas').insert(payload);
                if (error) throw error;
            }

            posthog.capture('admin_dialog_script_saved', { dialog_id: dialogoId, total_lines: linhasValidas.length });
            setStatusMsg({ text: '✓ Roteiro salvo com sucesso!', type: 'success' });
            setTimeout(() => setStatusMsg(null), 3000);
        } catch (error) {
            console.error(error);
            setStatusMsg({ text: 'Erro ao salvar. Tente novamente.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <Loader2 className="w-8 h-8 animate-spin text-tcm-red" />
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans overflow-hidden">
            <SetNavbar
                title={tituloDialogo || 'Planilha do Diálogo'}
                backLink="/admin/dialogos"
            />

            {/* PAINEL DE CONFIGURAÇÕES */}
            <div className="pt-16 shrink-0">
                <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <Settings2 className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Configurações do Diálogo</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Aula Vinculada *</label>
                            <select
                                id="select-aula-dialogo"
                                required
                                value={aulaIdSelecionada}
                                onChange={(e) => setAulaIdSelecionada(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tcm-red/30 focus:border-tcm-red/60 outline-none text-sm bg-slate-50 text-slate-800 transition-all cursor-pointer"
                            >
                                <option value="" disabled>Selecione uma aula</option>
                                {aulasLista.map(a => (
                                    <option key={a.id} value={a.id}>Aula {a.codigo_aula} - {a.titulo_descritivo}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Título do Diálogo *</label>
                            <input
                                id="input-titulo-dialogo"
                                type="text"
                                required
                                value={tituloDialogo}
                                onChange={(e) => setTituloDialogo(e.target.value)}
                                placeholder="Ex: Comprando um bilhete de trem"
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tcm-red/30 focus:border-tcm-red/60 outline-none text-sm bg-slate-50 text-slate-800 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Cenário / Contexto (Opcional)</label>
                            <input
                                id="input-cenario-dialogo"
                                type="text"
                                value={cenarioDialogo}
                                onChange={(e) => setCenarioDialogo(e.target.value)}
                                placeholder="Ex: Você está na estação..."
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tcm-red/30 focus:border-tcm-red/60 outline-none text-sm bg-slate-50 text-slate-800 transition-all"
                            />
                        </div>
                    </div>

                    {/* LEGENDA + CONTROLES */}
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                        {/* Legenda de Grupos */}
                        <div className="flex items-center gap-2 flex-wrap text-xs font-semibold">
                            <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">PC (Fala)</span>
                            <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">Resp. Certa</span>
                            <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">Opção 2</span>
                            <span className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">Opção 3</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end sm:ml-auto">
                            {statusMsg && (
                                <div className={`text-xs px-3 py-1.5 rounded-xl flex items-center gap-2 font-medium shrink-0 max-w-[200px] truncate animate-in fade-in duration-200 ${
                                    statusMsg.type === 'error'
                                        ? 'bg-red-50 border border-red-200 text-red-750'
                                        : statusMsg.type === 'success'
                                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-750'
                                        : 'bg-blue-50 border border-blue-200 text-blue-750'
                                }`}>
                                    {statusMsg.type === 'error' && <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                                    <span className="truncate">{statusMsg.text}</span>
                                </div>
                            )}

                            {/* ZOOM CONTROLS */}
                            <div className="flex items-center gap-1 bg-slate-100 rounded-xl px-1 py-1 border border-slate-200 shrink-0">
                                <button
                                    id="btn-zoom-out-dialogo"
                                    onClick={() => setZoom(prev => Math.max(0.3, +(prev - 0.1).toFixed(1)))}
                                    title="Diminuir zoom"
                                    className="p-1.5 text-slate-500 hover:text-tcm-red hover:bg-white rounded-lg transition-all"
                                >
                                    <ZoomOut className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    id="btn-zoom-reset-dialogo"
                                    onClick={() => setZoom(1)}
                                    title="Resetar zoom"
                                    className="px-2 py-1 text-xs font-bold text-slate-600 hover:text-tcm-red hover:bg-white rounded-lg transition-all min-w-[40px] text-center"
                                >
                                    {Math.round(zoom * 100)}%
                                </button>
                                <button
                                    id="btn-zoom-in-dialogo"
                                    onClick={() => setZoom(prev => Math.min(2.5, +(prev + 0.1).toFixed(1)))}
                                    title="Aumentar zoom"
                                    className="p-1.5 text-slate-500 hover:text-tcm-red hover:bg-white rounded-lg transition-all"
                                >
                                    <ZoomIn className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* NOVA LINHA */}
                            <button
                                id="btn-nova-linha-dialogo"
                                onClick={addLinha}
                                className="flex items-center gap-2 bg-white border border-slate-200 hover:border-tcm-red/50 hover:text-tcm-red text-slate-600 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all shadow-sm cursor-pointer shrink-0"
                            >
                                <Plus className="w-3.5 h-3.5" /> Nova Linha
                            </button>

                            {/* SALVAR ROTEIRO */}
                            <button
                                id="btn-salvar-dialogo"
                                onClick={handleSaveGrid}
                                disabled={isSaving}
                                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl transition-all font-bold text-xs uppercase tracking-wider cursor-pointer disabled:opacity-60 shadow-sm shrink-0"
                            >
                                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                Salvar Roteiro
                            </button>
                        </div>
                    </div>

                    {/* DICA */}
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                        <Copy className="w-3.5 h-3.5 shrink-0" />
                        <span>
                            Gere uma tabela estruturada e cole clicando na primeira célula ·{' '}
                            <strong className="text-slate-500">Ctrl+Scroll</strong> para zoom
                        </span>
                    </div>
                </div>
            </div>

            {/* CONTAINER DA PLANILHA */}
            <main
                ref={scrollContainerRef}
                className="flex-1 overflow-auto px-4 sm:px-6 py-4"
            >
                <div
                    className="w-max bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden transition-transform duration-75 origin-top-left"
                    style={{ transform: `scale(${zoom})` }}
                >
                    <table className="w-max text-left border-collapse text-[13px] font-sans table-fixed">
                        <thead className="sticky top-0 z-10">
                            <tr>
                                <th className="border border-slate-200 px-2 py-2.5 text-center w-10 text-slate-400 bg-slate-50 text-xs font-bold select-none">
                                    #
                                </th>
                                {COLUNAS.map(col => {
                                    const meta = COLUNAS_META[col];
                                    return (
                                        <th
                                            key={col}
                                            style={{ width: meta.width, minWidth: meta.width }}
                                            className={`border px-3 py-2.5 text-xs font-bold select-none uppercase tracking-wide ${GROUP_STYLES[meta.group]}`}
                                        >
                                            {meta.label}
                                        </th>
                                    );
                                })}
                                <th className="border border-slate-200 px-2 py-2.5 text-center w-10 text-slate-400 bg-slate-50 select-none">
                                    <Trash2 className="w-3.5 h-3.5 mx-auto" />
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {linhas.map((linha, indexRow) => (
                                <tr key={indexRow} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="border border-slate-200 text-center text-xs font-bold text-slate-400 bg-slate-50 select-none">
                                        {indexRow + 1}
                                    </td>

                                    {COLUNAS.map((colName) => {
                                        const meta = COLUNAS_META[colName];
                                        return (
                                            <td
                                                key={colName}
                                                className="border border-slate-200 p-0 relative bg-white"
                                                style={{ width: meta.width, minWidth: meta.width }}
                                            >
                                                <input
                                                    type="text"
                                                    value={linha[colName]}
                                                    onChange={(e) => handleCellChange(indexRow, colName, e.target.value)}
                                                    onPaste={(e) => handlePaste(e, indexRow, colName)}
                                                    className={`w-full h-full px-2 py-2 outline-none bg-transparent text-slate-700 text-[13px] transition-colors ${GROUP_CELL_FOCUS[meta.group]}`}
                                                    placeholder={indexRow === 0 ? '...' : ''}
                                                />
                                            </td>
                                        );
                                    })}

                                    <td className="border border-slate-200 p-0 text-center align-middle bg-slate-50">
                                        <button
                                            id={`btn-remover-linha-${indexRow}`}
                                            onClick={() => removeLinha(indexRow)}
                                            className="text-slate-300 hover:text-tcm-red p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            title="Remover linha"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {linhas.length === 0 && (
                                <tr>
                                    <td colSpan={COLUNAS.length + 2} className="p-12 text-center">
                                        <div className="flex flex-col items-center gap-3 text-slate-400">
                                            <MessageSquare className="w-8 h-8 text-slate-300" />
                                            <p className="text-sm font-medium">Nenhuma linha ainda. Adicione ou cole conteúdo acima.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}