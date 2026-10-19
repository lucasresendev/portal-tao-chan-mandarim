'use client';

import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Loader2, Save, Plus, Trash2, AlertCircle, Copy, Edit3, X, Search, Filter, Download, Upload, ZoomIn, ZoomOut, Library } from 'lucide-react';
import posthog from 'posthog-js';
import SetNavbar from '../../components/SetNavbar';

// ==========================================
// CONFIGURAÇÃO DO GRID
// ==========================================
const COLUNAS = [
    { key: 'aula_id', label: 'Aula Vinculada *', widthPx: 192, type: 'select_aula' },
    { key: 'tipo', label: 'Tipo', widthPx: 112, type: 'select_tipo' },
    { key: 'licao_oficial_id', label: 'Oficial na Lição', widthPx: 192, type: 'select_aula' },
    { key: 'tipo_nota', label: 'Tipo de Nota', widthPx: 128, type: 'text' },
    { key: 'deck', label: 'Deck', widthPx: 256, type: 'text' },
    { key: 'hanzi_simp', label: 'Hanzi Simp.', widthPx: 160, type: 'text' },
    { key: 'hanzi_trad', label: 'Hanzi Trad.', widthPx: 160, type: 'text' },
    { key: 'pinyin', label: 'Pinyin', widthPx: 160, type: 'text' },
    { key: 'traducao', label: 'Tradução', widthPx: 192, type: 'text' },
    { key: 'som', label: 'Som', widthPx: 128, type: 'text' },
    { key: 'explicacao', label: 'Explicação HTML', widthPx: 384, type: 'text' },
    { key: 'curiosidade', label: 'Curiosidade HTML', widthPx: 384, type: 'text' },
    { key: 'exemplos', label: 'Exemplos HTML', widthPx: 384, type: 'text' }
] as const;

type NomeColuna = typeof COLUNAS[number]['key'];

type LinhaDicionario = {
    _ui_id: string;
    id?: string;
    aula_id: string;
    tipo: 'Palavra' | 'Frase';
    licao_oficial_id: string;
    tipo_nota: string;
    deck: string;
    hanzi_simp: string;
    hanzi_trad: string;
    pinyin: string;
    traducao: string;
    som: string;
    explicacao: string;
    curiosidade: string;
    exemplos: string;
};

type Aula = { id: string; codigo_aula: string; codigo_licao: string | null; titulo_descritivo: string; };

const gerarUiId = () => Math.random().toString(36).substring(2, 11);

const linhaVazia = (): LinhaDicionario => ({
    _ui_id: gerarUiId(),
    aula_id: '', tipo: 'Palavra', licao_oficial_id: '', tipo_nota: '', deck: '',
    hanzi_simp: '', hanzi_trad: '', pinyin: '', traducao: '', som: '',
    explicacao: '', curiosidade: '', exemplos: ''
});

// ==========================================
// UTILITÁRIOS & PARSERS
// ==========================================
const getAulaDisplay = (aulaId: string, aulasLista: Aula[]) => {
    const aula = aulasLista.find(a => a.id === aulaId);
    return aula ? `L.${aula.codigo_aula} - ${aula.titulo_descritivo}` : aulaId;
};

const resolveAulaId = (text: string, aulasLista: Aula[]) => {
    if (!text) return '';
    if (aulasLista.some(a => a.id === text)) return text;
    const match = text.match(/L\.?\s*(\d+)/i);
    if (match) {
        const cod = match[1];
        const aula = aulasLista.find(a => String(a.codigo_aula) === cod);
        if (aula) return aula.id;
    }
    const aulaTexto = aulasLista.find(a => a.titulo_descritivo.toLowerCase() === text.trim().toLowerCase());
    if (aulaTexto) return aulaTexto.id;
    return text;
};

const parseGoogleSheetsData = (text: string): string[][] => {
    if (text.includes('Chinês Novo\t')) {
        const rawRows = text.split(/\r?\n(?=Chinês Novo\t)/);
        return rawRows.map(rowText => {
            const cells: string[] = [];
            let currentCell = '', inQuotes = false;
            for (let i = 0; i < rowText.length; i++) {
                const char = rowText[i];
                if (char === '"') {
                    if (inQuotes && rowText[i + 1] === '"') { currentCell += '"'; i++; }
                    else { inQuotes = !inQuotes; }
                } else if (char === '\t' && !inQuotes) {
                    cells.push(currentCell); currentCell = '';
                } else { currentCell += char; }
            }
            cells.push(currentCell);
            return cells.map(c => c.trim());
        });
    }

    const rows: string[][] = [];
    let currentRow: string[] = [], currentCell = '', inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
            if (inQuotes && text[i + 1] === '"') { currentCell += '"'; i++; }
            else { inQuotes = !inQuotes; }
        } else if (char === '\t' && !inQuotes) {
            currentRow.push(currentCell); currentCell = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && text[i + 1] === '\n') i++;
            currentRow.push(currentCell); rows.push(currentRow);
            currentRow = []; currentCell = '';
        } else { currentCell += char; }
    }
    if (currentCell !== '' || currentRow.length > 0) {
        currentRow.push(currentCell);
        if (currentRow.length > 1 || currentRow[0].trim() !== '') rows.push(currentRow);
    }
    return rows;
};

const applySmartDeck = (linha: LinhaDicionario, newDeckValue: string, listaAulas: Aula[]): LinhaDicionario => {
    const updatedLinha = { ...linha, deck: newDeckValue };
    const licaoMatch = newDeckValue.match(/Lição\s*0*(\d+)/i);
    if (licaoMatch) {
        const numStr = licaoMatch[1];
        const aulaMatch = listaAulas.find(a => a.codigo_licao && parseInt(a.codigo_licao, 10) === parseInt(numStr, 10));
        if (aulaMatch) updatedLinha.aula_id = aulaMatch.id;
    }
    if (newDeckValue.toLowerCase().includes('frase')) updatedLinha.tipo = 'Frase';
    else if (newDeckValue.toLowerCase().includes('palavra')) updatedLinha.tipo = 'Palavra';
    return updatedLinha;
};

// ==========================================
// COMPONENTE DE CÉLULA
// ==========================================
interface CellProps {
    value: string;
    type: string;
    widthPx: number;
    isSelected: boolean;
    isEditingCell: boolean;
    isGridEditing: boolean;
    aulasLista: Aula[];
    uiId: string;
    colKey: NomeColuna;
    rowIdx: number;
    colIdx: number;
    onMouseDown: (rowIdx: number, colIdx: number) => void;
    onMouseEnter: (rowIdx: number, colIdx: number) => void;
    onDoubleClick: (rowIdx: number, colKey: NomeColuna) => void;
    onChange: (uiId: string, colKey: NomeColuna, val: string) => void;
    onBlur: () => void;
}

const Cell = memo(({ value, type, widthPx, isSelected, isEditingCell, isGridEditing, aulasLista, uiId, colKey, rowIdx, colIdx, onMouseDown, onMouseEnter, onDoubleClick, onChange, onBlur }: CellProps) => {
    let baseClass = "h-full min-h-[36px] px-2 py-2 text-slate-700 truncate cursor-cell border-transparent border select-none relative text-[13px] ";
    if (!isGridEditing) baseClass += "opacity-75 cursor-default ";
    else if (isEditingCell) baseClass += "bg-white shadow-[inset_0_0_0_2px_#ad1e1e] z-20 ";
    else if (isSelected) baseClass += "bg-rose-50 shadow-[inset_0_0_0_1.5px_#ad1e1e] z-10 ";
    else baseClass += "hover:bg-slate-50 ";

    let displayValue = value;
    if (type === 'select_aula' && value) {
        displayValue = getAulaDisplay(value, aulasLista);
        if (displayValue.length > 25) displayValue = displayValue.substring(0, 25) + '...';
    }

    return (
        <td
            className="border border-slate-200 p-0 relative bg-white"
            style={{ width: widthPx, minWidth: widthPx, maxWidth: widthPx }}
            onMouseDown={isGridEditing && !isEditingCell ? () => onMouseDown(rowIdx, colIdx) : undefined}
            onMouseEnter={isGridEditing ? () => onMouseEnter(rowIdx, colIdx) : undefined}
            onDoubleClick={isGridEditing ? () => onDoubleClick(rowIdx, colKey) : undefined}
        >
            <div className={baseClass} title={typeof value === 'string' ? value : ''}>
                {isEditingCell ? (
                    type === 'select_aula' ? (
                        <select
                            autoFocus
                            value={value}
                            onMouseDown={(e) => e.stopPropagation()}
                            onChange={e => { onChange(uiId, colKey, e.target.value); onBlur(); }}
                            onBlur={onBlur}
                            className="absolute inset-0 w-full h-full px-2 outline-none bg-white text-slate-800 text-[13px] cursor-pointer"
                        >
                            <option value="">Nenhuma / Em Branco</option>
                            {aulasLista.map(a => (
                                <option key={a.id} value={a.id}>L.{a.codigo_aula} - {a.titulo_descritivo}</option>
                            ))}
                        </select>
                    ) : type === 'select_tipo' ? (
                        <select
                            autoFocus
                            value={value}
                            onMouseDown={(e) => e.stopPropagation()}
                            onChange={e => { onChange(uiId, colKey, e.target.value); onBlur(); }}
                            onBlur={onBlur}
                            className="absolute inset-0 w-full h-full px-2 outline-none bg-white text-slate-800 text-[13px] cursor-pointer"
                        >
                            <option value="Palavra">Palavra</option>
                            <option value="Frase">Frase</option>
                        </select>
                    ) : (
                        <input
                            autoFocus
                            type="text"
                            value={value}
                            onMouseDown={(e) => e.stopPropagation()}
                            onChange={e => onChange(uiId, colKey, e.target.value)}
                            onBlur={onBlur}
                            onKeyDown={(e) => { if (e.key === 'Enter') onBlur(); }}
                            className="absolute inset-0 w-full h-full px-2 outline-none bg-white text-slate-800 text-[13px]"
                        />
                    )
                ) : (
                    <span className="block w-full overflow-hidden text-ellipsis whitespace-nowrap">
                        {displayValue || <span className="text-transparent selection:text-transparent">.</span>}
                    </span>
                )}
            </div>
        </td>
    );
});
Cell.displayName = 'Cell';

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
export default function AdminDicionarioSheet() {
    const supabase = createClientComponentClient();

    // Refs
    const gridRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const mousePosRef = useRef({ x: 0, y: 0 });

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isGridEditing, setIsGridEditing] = useState(false);
    const [statusMsg, setStatusMsg] = useState<{ text: string, type: 'error' | 'success' | 'info' } | null>(null);
    const [zoom, setZoom] = useState(1);

    const [aulasLista, setAulasLista] = useState<Aula[]>([]);
    const [linhas, setLinhas] = useState<LinhaDicionario[]>([]);
    const [linhasOriginais, setLinhasOriginais] = useState<LinhaDicionario[]>([]);
    const [idsDeletados, setIdsDeletados] = useState<string[]>([]);

    const [buscaText, setBuscaText] = useState('');
    const [filtroAula, setFiltroAula] = useState('');

    const [selection, setSelection] = useState<{ startRow: number, startCol: number, endRow: number, endCol: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [editingCell, setEditingCell] = useState<{ row: number, col: NomeColuna } | null>(null);

    // ==========================================
    // TRACKING MOUSE & AUTO-SCROLL NAS BORDAS
    // ==========================================
    useEffect(() => {
        const updateMouse = (e: MouseEvent) => { mousePosRef.current = { x: e.clientX, y: e.clientY }; };
        window.addEventListener('mousemove', updateMouse);
        return () => window.removeEventListener('mousemove', updateMouse);
    }, []);

    useEffect(() => {
        let rafId: number;
        const autoScroll = () => {
            if (isDragging && scrollContainerRef.current) {
                const { x, y } = mousePosRef.current;
                const rect = scrollContainerRef.current.getBoundingClientRect();
                const margin = 60;
                const speed = 15;
                let dx = 0; let dy = 0;
                if (x < rect.left + margin) dx = -speed;
                else if (x > rect.right - margin) dx = speed;
                if (y < rect.top + margin) dy = -speed;
                else if (y > rect.bottom - margin) dy = speed;
                if (dx !== 0 || dy !== 0) scrollContainerRef.current.scrollBy(dx, dy);
            }
            rafId = requestAnimationFrame(autoScroll);
        };
        rafId = requestAnimationFrame(autoScroll);
        return () => cancelAnimationFrame(rafId);
    }, [isDragging]);

    // ==========================================
    // PINCH TO ZOOM
    // ==========================================
    useEffect(() => {
        const gridEl = gridRef.current;
        if (!gridEl) return;
        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                setZoom(prev => Math.max(0.3, Math.min(prev - e.deltaY * 0.005, 2.5)));
            }
        };
        gridEl.addEventListener('wheel', handleWheel, { passive: false });
        return () => gridEl.removeEventListener('wheel', handleWheel);
    }, [isGridEditing]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error || !user) return;

            const { data: aulasDb } = await supabase.from('aulas').select('id, codigo_aula, codigo_licao, titulo_descritivo').order('codigo_aula');
            if (aulasDb) setAulasLista(aulasDb);

            const { data: dictDb } = await supabase.from('dicionario').select('*').order('created_at', { ascending: false });

            if (dictDb && dictDb.length > 0) {
                const linhasFormatadas: LinhaDicionario[] = dictDb.map(row => ({
                    _ui_id: gerarUiId(),
                    id: row.id,
                    aula_id: row.aula_id || '',
                    tipo: row.tipo === 'Frase' ? 'Frase' : 'Palavra',
                    licao_oficial_id: row.licao_oficial_id || '',
                    tipo_nota: row.tipo_nota || '',
                    deck: row.deck || '',
                    hanzi_simp: row.hanzi_simp || '',
                    hanzi_trad: row.hanzi_trad || '',
                    pinyin: row.pinyin || '',
                    traducao: row.traducao || '',
                    som: row.som || '',
                    explicacao: row.explicacao || '',
                    curiosidade: row.curiosidade || '',
                    exemplos: row.exemplos || ''
                }));
                setLinhas(linhasFormatadas);
                setLinhasOriginais(JSON.parse(JSON.stringify(linhasFormatadas)));
            } else {
                setLinhas([]);
            }
        } catch (error) {
            console.error(error);
            setStatusMsg({ text: 'Erro ao carregar dados', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (gridRef.current && !gridRef.current.contains(e.target as Node)) {
                setSelection(null);
                setEditingCell(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const visibleLines = linhas.filter(l => {
        const matchText = !buscaText ||
            l.hanzi_simp.toLowerCase().includes(buscaText.toLowerCase()) ||
            l.pinyin.toLowerCase().includes(buscaText.toLowerCase()) ||
            l.traducao.toLowerCase().includes(buscaText.toLowerCase());
        const matchAula = !filtroAula || l.aula_id === filtroAula;
        return matchText && matchAula;
    });

    const handleMouseDown = useCallback((rowIdx: number, colIdx: number) => {
        if (!isGridEditing) return;
        setEditingCell(null);
        setSelection({ startRow: rowIdx, startCol: colIdx, endRow: rowIdx, endCol: colIdx });
        setIsDragging(true);
    }, [isGridEditing]);

    const handleMouseEnter = useCallback((rowIdx: number, colIdx: number) => {
        if (!isDragging || !selection) return;
        setSelection(prev => prev ? { ...prev, endRow: rowIdx, endCol: colIdx } : null);
    }, [isDragging, selection]);

    const handleMouseUp = useCallback(() => setIsDragging(false), []);

    const handleDoubleClick = useCallback((rowIdx: number, colKey: NomeColuna) => {
        if (!isGridEditing) return;
        setEditingCell({ row: rowIdx, col: colKey });
    }, [isGridEditing]);

    const handleCellChange = useCallback((uiId: string, colName: NomeColuna, value: string) => {
        setLinhas(prev => prev.map(linha => {
            if (linha._ui_id !== uiId) return linha;
            let linhaAtual = { ...linha, [colName]: value };
            if (colName === 'deck') linhaAtual = applySmartDeck(linhaAtual, value, aulasLista);
            return linhaAtual as LinhaDicionario;
        }));
    }, [aulasLista]);

    const handleCellBlur = useCallback(() => setEditingCell(null), []);

    // ==========================================
    // COPY (Ctrl+C)
    // ==========================================
    const handleKeyDown = useCallback(async (e: React.KeyboardEvent) => {
        if (!isGridEditing || !selection || editingCell) return;

        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            const minR = Math.min(selection.startRow, selection.endRow);
            const maxR = Math.max(selection.startRow, selection.endRow);
            const minC = Math.min(selection.startCol, selection.endCol);
            const maxC = Math.max(selection.startCol, selection.endCol);

            let tsv = '';
            let html = '<table border="1">';

            for (let r = minR; r <= maxR; r++) {
                const row = [];
                html += '<tr>';
                for (let c = minC; c <= maxC; c++) {
                    const colInfo = COLUNAS[c];
                    const colName = colInfo.key;
                    let cellVal = String(visibleLines[r][colName] || '');
                    if (colInfo.type === 'select_aula') cellVal = getAulaDisplay(cellVal, aulasLista);
                    let tsvVal = cellVal;
                    if (tsvVal.includes('\n') || tsvVal.includes('\t') || tsvVal.includes('"')) {
                        tsvVal = `"${tsvVal.replace(/"/g, '""')}"`;
                    }
                    row.push(tsvVal);
                    html += `<td>${cellVal.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</td>`;
                }
                tsv += row.join('\t') + '\n';
                html += '</tr>';
            }
            html += '</table>';

            try {
                const blobTsv = new Blob([tsv.trimEnd()], { type: 'text/plain' });
                const blobHtml = new Blob([html], { type: 'text/html' });
                await navigator.clipboard.write([
                    new ClipboardItem({ 'text/plain': blobTsv, 'text/html': blobHtml })
                ]);
                setStatusMsg({ text: '✓ Copiado (compatível com Sheets / Anki)', type: 'success' });
            } catch {
                navigator.clipboard.writeText(tsv.trimEnd());
                setStatusMsg({ text: '✓ Copiado', type: 'success' });
            }
            setTimeout(() => setStatusMsg(null), 2000);
        }
    }, [isGridEditing, selection, editingCell, visibleLines, aulasLista]);

    // ==========================================
    // PASTE
    // ==========================================
    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        if (!isGridEditing || !selection || editingCell) return;
        const pasteData = e.clipboardData.getData('text');
        if (!pasteData) return;
        e.preventDefault();

        const pastedRows = parseGoogleSheetsData(pasteData);
        const startR = Math.min(selection.startRow, selection.endRow);
        const startC = Math.min(selection.startCol, selection.endCol);

        setLinhas(prev => {
            const novasLinhas = [...prev];
            pastedRows.forEach((pRowData, i) => {
                const targetVisibleRowIdx = startR + i;
                let targetUiId: string | null = null;
                if (targetVisibleRowIdx < visibleLines.length) {
                    targetUiId = visibleLines[targetVisibleRowIdx]._ui_id;
                } else {
                    const nova = linhaVazia();
                    novasLinhas.push(nova);
                    targetUiId = nova._ui_id;
                }
                const realIndex = novasLinhas.findIndex(l => l._ui_id === targetUiId);
                if (realIndex === -1) return;
                let linhaAtual = { ...novasLinhas[realIndex] };
                pRowData.forEach((cellValue, j) => {
                    const targetColIdx = startC + j;
                    if (targetColIdx < COLUNAS.length) {
                        const colInfo = COLUNAS[targetColIdx];
                        let cleanValue = cellValue.trim();
                        if (colInfo.type === 'select_aula') cleanValue = resolveAulaId(cleanValue, aulasLista);
                        linhaAtual[colInfo.key] = cleanValue as never;
                    }
                });
                if (linhaAtual.deck) linhaAtual = applySmartDeck(linhaAtual, linhaAtual.deck, aulasLista);
                novasLinhas[realIndex] = linhaAtual;
            });
            return novasLinhas;
        });

        setStatusMsg({ text: `✓ ${pastedRows.length} linha(s) colada(s)`, type: 'success' });
        setTimeout(() => setStatusMsg(null), 2500);
    }, [isGridEditing, selection, editingCell, visibleLines, aulasLista]);

    // ==========================================
    // IMPORT / EXPORT TSV
    // ==========================================
    const handleExportTSV = () => {
        let tsv = COLUNAS.map(c => c.label).join('\t') + '\n';
        visibleLines.forEach(l => {
            const row = COLUNAS.map(c => {
                let val = c.type === 'select_aula' ? getAulaDisplay(l[c.key], aulasLista) : String(l[c.key] || '');
                if (val.includes('\t') || val.includes('\n') || val.includes('"')) {
                    val = `"${val.replace(/"/g, '""')}"`;
                }
                return val;
            });
            tsv += row.join('\t') + '\n';
        });
        const blob = new Blob([tsv], { type: 'text/tab-separated-values' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'dicionario_export.tsv'; a.click();
    };

    const handleImportTSV = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target?.result as string;
            const rows = parseGoogleSheetsData(text);
            if (rows[0] && rows[0][0] === COLUNAS[0].label) rows.shift();
            const novas = rows.map(r => {
                const l = linhaVazia();
                COLUNAS.forEach((c, idx) => {
                    if (r[idx] !== undefined) {
                        let val = r[idx].trim();
                        if (c.type === 'select_aula') val = resolveAulaId(val, aulasLista);
                        l[c.key] = val as never;
                    }
                });
                return applySmartDeck(l, l.deck, aulasLista);
            });
            setLinhas(prev => [...prev, ...novas]);
            setStatusMsg({ text: `✓ TSV importado: ${novas.length} linha(s)`, type: 'success' });
            setTimeout(() => setStatusMsg(null), 3000);
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const addLinha = () => setLinhas(prev => [...prev, linhaVazia()]);

    const removeLinha = (uiId: string) => {
        setLinhas(prev => {
            const linhaRemovida = prev.find(l => l._ui_id === uiId);
            if (linhaRemovida?.id) setIdsDeletados(curr => [...curr, linhaRemovida.id!]);
            return prev.filter(l => l._ui_id !== uiId);
        });
        setSelection(null);
    };

    const handleCancel = () => {
        setLinhas(JSON.parse(JSON.stringify(linhasOriginais)));
        setIdsDeletados([]);
        setIsGridEditing(false);
        setSelection(null);
        setEditingCell(null);
        setZoom(1);
        setStatusMsg(null);
    };

    const handleSaveGrid = async () => {
        setIsSaving(true);
        setStatusMsg({ text: 'Salvando...', type: 'info' });
        try {
            const linhasValidas = linhas.filter(l => l.hanzi_simp.trim() !== '');
            const semAula = linhasValidas.find(l => !l.aula_id);
            if (semAula) {
                setStatusMsg({ text: 'Erro: Há itens com Hanzi mas sem Aula vinculada.', type: 'error' });
                setIsSaving(false); return;
            }

            if (idsDeletados.length > 0) {
                await supabase.from('dicionario').delete().in('id', idsDeletados);
            }

            if (linhasValidas.length > 0) {
                const toUpdate: Record<string, unknown>[] = [];
                const toInsert: Record<string, unknown>[] = [];
                linhasValidas.forEach(l => {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { _ui_id, id, ...resto } = l;
                    const cleanResto = { ...resto, licao_oficial_id: resto.licao_oficial_id || null };
                    if (id) toUpdate.push({ id, ...cleanResto });
                    else toInsert.push(cleanResto);
                });
                if (toUpdate.length > 0) {
                    const { error } = await supabase.from('dicionario').upsert(toUpdate);
                    if (error) throw error;
                }
                if (toInsert.length > 0) {
                    const { error } = await supabase.from('dicionario').insert(toInsert);
                    if (error) throw error;
                }
            }

            posthog.capture('admin_dictionary_saved', { total_lines: linhasValidas.length });
            await fetchData();
            setIdsDeletados([]);
            setIsGridEditing(false);
            setSelection(null);
            setZoom(1);
            setStatusMsg({ text: '✓ Dicionário salvo com sucesso!', type: 'success' });
            setTimeout(() => setStatusMsg(null), 3000);
        } catch (error) {
            console.error(error);
            setStatusMsg({ text: 'Erro ao salvar.', type: 'error' });
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
                title="Editor do Dicionário"
                backLink="/admin"
            />

            {/* PAINEL DE FERRAMENTAS */}
            <div className="pt-16 shrink-0">
                <div className="max-w-full px-4 sm:px-6 py-4 bg-white border-b border-slate-200 shadow-sm">
                    <div className="flex flex-wrap gap-3 items-center">

                        {/* BUSCA */}
                        <div className="relative flex-1 min-w-[200px] max-w-sm">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                                id="busca-dicionario"
                                type="text"
                                placeholder="Buscar hanzi, pinyin, tradução..."
                                value={buscaText}
                                onChange={e => setBuscaText(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-tcm-red/30 focus:border-tcm-red/60 transition-all bg-slate-50 text-slate-800 placeholder:text-slate-400"
                            />
                        </div>

                        {/* FILTRO DE AULA */}
                        <div className="relative min-w-[200px]">
                            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <select
                                id="filtro-aula-dicionario"
                                value={filtroAula}
                                onChange={e => setFiltroAula(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-tcm-red/30 focus:border-tcm-red/60 transition-all bg-slate-50 text-slate-800 appearance-none cursor-pointer"
                            >
                                <option value="">Todas as Aulas</option>
                                {aulasLista.map(a => (
                                    <option key={a.id} value={a.id}>L.{a.codigo_aula} - {a.titulo_descritivo}</option>
                                ))}
                            </select>
                        </div>

                        {/* CONTADOR */}
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 mr-auto">
                            <Library className="w-4 h-4 text-rose-400" />
                            <span>{visibleLines.length} itens</span>
                            {(buscaText || filtroAula) && (
                                <span className="text-xs text-slate-400 font-normal">de {linhas.length} total</span>
                            )}
                        </div>

                        {/* ZOOM CONTROLS */}
                        <div className="flex items-center gap-1 bg-slate-100 rounded-xl px-1 py-1 border border-slate-200">
                            <button
                                id="btn-zoom-out"
                                onClick={() => setZoom(prev => Math.max(0.3, +(prev - 0.1).toFixed(1)))}
                                title="Diminuir zoom"
                                className="p-1.5 text-slate-500 hover:text-tcm-red hover:bg-white rounded-lg transition-all"
                            >
                                <ZoomOut className="w-4 h-4" />
                            </button>
                            <button
                                id="btn-zoom-reset"
                                onClick={() => setZoom(1)}
                                title="Resetar zoom"
                                className="px-2 py-1 text-xs font-bold text-slate-600 hover:text-tcm-red hover:bg-white rounded-lg transition-all min-w-[42px] text-center"
                            >
                                {Math.round(zoom * 100)}%
                            </button>
                            <button
                                id="btn-zoom-in"
                                onClick={() => setZoom(prev => Math.min(2.5, +(prev + 0.1).toFixed(1)))}
                                title="Aumentar zoom"
                                className="p-1.5 text-slate-500 hover:text-tcm-red hover:bg-white rounded-lg transition-all"
                            >
                                <ZoomIn className="w-4 h-4" />
                            </button>
                        </div>

                        {/* AÇÕES DE EDIÇÃO E PLANILHA */}
                        {isGridEditing ? (
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    id="btn-nova-linha"
                                    onClick={addLinha}
                                    className="flex items-center gap-2 bg-white border border-slate-200 hover:border-tcm-red/50 hover:text-tcm-red text-slate-600 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer animate-in fade-in duration-200"
                                >
                                    <Plus className="w-4 h-4" /> Nova Linha
                                </button>

                                <label
                                    id="btn-importar-tsv"
                                    className="flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer"
                                >
                                    <Download className="w-4 h-4" /> Importar TSV
                                    <input type="file" accept=".tsv,.txt" onChange={handleImportTSV} className="hidden" />
                                </label>

                                <button
                                    id="btn-exportar-tsv"
                                    onClick={handleExportTSV}
                                    className="flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer"
                                >
                                    <Upload className="w-4 h-4" /> Exportar TSV
                                </button>

                                <div className="h-6 w-px bg-slate-200 mx-1" />

                                {statusMsg && (
                                    <div className={`text-xs px-3 py-1.5 rounded-xl flex items-center gap-2 font-medium shrink-0 max-w-[200px] truncate animate-in fade-in duration-200 ${
                                        statusMsg.type === 'error'
                                            ? 'bg-red-55 border border-red-200 text-red-700'
                                            : statusMsg.type === 'success'
                                            ? 'bg-emerald-55 border border-emerald-200 text-emerald-700'
                                            : 'bg-blue-55 border border-blue-200 text-blue-700'
                                    }`}>
                                        {statusMsg.type === 'error' && <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                                        <span className="truncate">{statusMsg.text}</span>
                                    </div>
                                )}

                                <button
                                    id="btn-cancelar-edicao"
                                    onClick={handleCancel}
                                    disabled={isSaving}
                                    className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl transition-all border border-slate-200 font-bold text-xs uppercase tracking-wider cursor-pointer disabled:opacity-60 shrink-0"
                                >
                                    <X className="w-4 h-4" /> Cancelar
                                </button>
                                <button
                                    id="btn-salvar-planilha"
                                    onClick={handleSaveGrid}
                                    disabled={isSaving}
                                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl transition-all font-bold text-xs uppercase tracking-wider cursor-pointer disabled:opacity-60 shadow-sm shrink-0"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Salvar Tudo
                                </button>
                            </div>
                        ) : (
                            statusMsg && (
                                <div className={`text-xs px-3 py-1.5 rounded-xl flex items-center gap-2 font-medium shrink-0 animate-in fade-in duration-200 ${
                                    statusMsg.type === 'error'
                                        ? 'bg-red-55 border border-red-200 text-red-750'
                                        : statusMsg.type === 'success'
                                        ? 'bg-emerald-55 border border-emerald-200 text-emerald-750'
                                        : 'bg-blue-55 border border-blue-200 text-blue-750'
                                }`}>
                                    {statusMsg.type === 'error' && <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                                    <span>{statusMsg.text}</span>
                                </div>
                            )
                        )}
                    </div>

                    {/* DICA DE MODO EDIÇÃO */}
                    {isGridEditing && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                            <Copy className="w-3.5 h-3.5 shrink-0" />
                            <span>
                                <strong className="text-slate-500">Ctrl+C</strong> copia células selecionadas (compatível com Google Sheets / Anki) ·{' '}
                                <strong className="text-slate-500">Duplo clique</strong> para editar · Arraste até as bordas para scroll rápido ·{' '}
                                <strong className="text-slate-500">Ctrl+Scroll</strong> para zoom
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* BANNER - MODO LEITURA */}
            {!isGridEditing && (
                <div className="shrink-0 px-4 sm:px-6 pt-4">
                    <div className="bg-white border border-dashed border-rose-200 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="bg-rose-50 p-2.5 rounded-xl">
                                <Library className="w-5 h-5 text-rose-500" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-700">Modo Visualização</p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Planilha somente leitura. Clique em <strong>&quot;Editar Planilha&quot;</strong> acima para habilitar edição, copiar/colar do Google Sheets ou importar TSV.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsGridEditing(true)}
                            className="shrink-0 flex items-center gap-2 bg-tcm-red hover:bg-tcm-dark-red text-white px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                        >
                            <Edit3 className="w-3.5 h-3.5" /> Editar
                        </button>
                    </div>
                </div>
            )}

            {/* CONTAINER DE SCROLL */}
            <main
                ref={scrollContainerRef}
                className="flex-1 overflow-auto px-4 sm:px-6 py-4 relative"
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <div
                    ref={gridRef}
                    className="w-max bg-white border border-slate-200 rounded-xl shadow-sm transition-transform duration-75 origin-top-left overflow-hidden"
                    style={{ transform: `scale(${zoom})` }}
                    tabIndex={0}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                >
                    <table className="w-max text-left border-collapse text-[13px] font-sans table-fixed">
                        <thead className="sticky top-0 z-30">
                            <tr>
                                <th
                                    style={{ width: 48, minWidth: 48, maxWidth: 48 }}
                                    className="border border-slate-200 px-2 py-2.5 text-center text-slate-400 bg-slate-50 text-xs font-bold select-none"
                                >
                                    #
                                </th>
                                {COLUNAS.map(c => (
                                    <th
                                        key={c.key}
                                        style={{ width: c.widthPx, minWidth: c.widthPx, maxWidth: c.widthPx }}
                                        className="border border-slate-200 px-3 py-2.5 text-slate-600 bg-slate-50 text-xs font-bold select-none uppercase tracking-wide"
                                    >
                                        {c.label}
                                    </th>
                                ))}
                                {isGridEditing && (
                                    <th
                                        style={{ width: 48, minWidth: 48, maxWidth: 48 }}
                                        className="border border-slate-200 px-2 py-2.5 text-center text-slate-400 bg-slate-50 select-none"
                                    >
                                        <Trash2 className="w-3.5 h-3.5 mx-auto" />
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {visibleLines.map((linha, rowIdx) => (
                                <tr key={linha._ui_id} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="border border-slate-200 text-center text-xs font-bold text-slate-400 bg-slate-50 select-none">
                                        {rowIdx + 1}
                                    </td>

                                    {COLUNAS.map((c, colIdx) => {
                                        const isSelected = !!selection &&
                                            rowIdx >= Math.min(selection.startRow, selection.endRow) &&
                                            rowIdx <= Math.max(selection.startRow, selection.endRow) &&
                                            colIdx >= Math.min(selection.startCol, selection.endCol) &&
                                            colIdx <= Math.max(selection.startCol, selection.endCol);

                                        const isEditingCell = editingCell?.row === rowIdx && editingCell?.col === c.key;

                                        return (
                                            <Cell
                                                key={c.key}
                                                value={linha[c.key]}
                                                type={c.type}
                                                widthPx={c.widthPx}
                                                isSelected={isSelected}
                                                isEditingCell={isEditingCell}
                                                isGridEditing={isGridEditing}
                                                aulasLista={aulasLista}
                                                uiId={linha._ui_id}
                                                colKey={c.key}
                                                rowIdx={rowIdx}
                                                colIdx={colIdx}
                                                onMouseDown={handleMouseDown}
                                                onMouseEnter={handleMouseEnter}
                                                onDoubleClick={handleDoubleClick}
                                                onChange={handleCellChange}
                                                onBlur={handleCellBlur}
                                            />
                                        );
                                    })}

                                    {isGridEditing && (
                                        <td className="border border-slate-200 p-0 text-center align-middle bg-slate-50">
                                            <button
                                                id={`btn-remover-linha-${rowIdx}`}
                                                onClick={() => removeLinha(linha._ui_id)}
                                                className="text-slate-300 hover:text-tcm-red p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                title="Remover linha"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {visibleLines.length === 0 && (
                                <tr>
                                    <td colSpan={COLUNAS.length + 2} className="p-12 text-center">
                                        <div className="flex flex-col items-center gap-3 text-slate-400">
                                            <Library className="w-8 h-8 text-slate-300" />
                                            <p className="text-sm font-medium">Nenhuma palavra encontrada para esse filtro.</p>
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