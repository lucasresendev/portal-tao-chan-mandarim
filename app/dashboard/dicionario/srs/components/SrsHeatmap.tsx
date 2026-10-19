'use client';

import { useMemo, useState, useRef, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type DiarioRecord = {
    data: string; // YYYY-MM-DD
    quantidade: number;
    tempo_revelacao_segundos: number;
    tempo_estudo_segundos: number;
    is_ajuste_adm: boolean;
};

type SrsHeatmapProps = {
    diarioData: DiarioRecord[];
    streakMaxima?: number;
    streakAtual?: number;
    isFrozen?: boolean;
};

// Determina a classe de cor baseada no volume de estudos (função pura fora do componente)
function getHeatmapColorClass(count: number, isAdm: boolean) {
    if (count === 0) return 'bg-slate-100 hover:bg-slate-200 border border-slate-200/20';
    if (isAdm) return 'bg-amber-300 hover:bg-amber-400 border border-amber-400/20';
    if (count <= 5) return 'bg-red-100 hover:bg-red-200';
    if (count <= 15) return 'bg-red-300 hover:bg-red-400';
    if (count <= 30) return 'bg-red-500 hover:bg-red-600';
    return 'bg-red-700 hover:bg-red-800';
}

function formatDateReadable(dateStr: string) {
    const parts = dateStr.split('-');
    const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function SrsHeatmap({ diarioData, streakMaxima = 0, streakAtual = 0, isFrozen = false }: SrsHeatmapProps) {
    const outermostRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());

    const [hoveredDay, setHoveredDay] = useState<{
        dateStr: string;
        count: number;
        recallSec: number;
        studySec: number;
        isAdm: boolean;
        x: number;
        y: number;
    } | null>(null);

    // Filtra dados para o ano selecionado
    const filteredDiarioData = useMemo(() => {
        return diarioData.filter(d => d.data.startsWith(`${selectedYear}-`));
    }, [diarioData, selectedYear]);

    // Mapeamento rápido dos dados para O(1) lookup
    const dataMap = useMemo(() => {
        const map = new Map<string, DiarioRecord>();
        filteredDiarioData.forEach(d => map.set(d.data, d));
        return map;
    }, [filteredDiarioData]);



    // 1. Gera os dias do ano calendário selecionado
    const gridDays = useMemo(() => {
        const days = [];
        
        // Começa em 1 de Janeiro do ano selecionado
        const startDay = new Date(selectedYear, 0, 1);
        // Ajusta para o domingo daquela semana inicial
        const startDayOfWeek = startDay.getDay();
        startDay.setDate(startDay.getDate() - startDayOfWeek);
        
        // Termina em 31 de Dezembro do ano selecionado
        const endDay = new Date(selectedYear, 11, 31);
        // Ajusta para o sábado daquela semana final
        const endDayOfWeek = endDay.getDay();
        endDay.setDate(endDay.getDate() + (6 - endDayOfWeek));

        const currentIter = new Date(startDay);

        while (currentIter <= endDay) {
            const yyyy = currentIter.getFullYear();
            const mm = String(currentIter.getMonth() + 1).padStart(2, '0');
            const dd = String(currentIter.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}-${mm}-${dd}`;

            days.push({
                date: new Date(currentIter),
                dateStr,
                dayOfWeek: currentIter.getDay(),
                month: currentIter.getMonth(),
            });

            currentIter.setDate(currentIter.getDate() + 1);
        }
        return days;
    }, [selectedYear]);

    // 2. Agrupa os dias em 53 colunas (semanas)
    const weeks = useMemo(() => {
        const weekCols: typeof gridDays[] = [];
        let currentWeek: typeof gridDays = [];

        gridDays.forEach(day => {
            currentWeek.push(day);
            if (day.dayOfWeek === 6 || currentWeek.length === 7) {
                weekCols.push(currentWeek);
                currentWeek = [];
            }
        });

        if (currentWeek.length > 0) {
            weekCols.push(currentWeek);
        }

        return weekCols;
    }, [gridDays]);

    // 3. Rótulos de meses alinhados nas colunas (evitando meses fora do ano selecionado)
    const monthLabels = useMemo(() => {
        const labels: { text: string; colIndex: number }[] = [];
        let lastMonth = -1;

        weeks.forEach((week, index) => {
            const firstDay = week[0];
            if (firstDay && firstDay.date.getFullYear() === selectedYear && firstDay.month !== lastMonth) {
                const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                labels.push({
                    text: meses[firstDay.month],
                    colIndex: index
                });
                lastMonth = firstDay.month;
            }
        });

        // Se tiver rótulos muito próximos (ex: index 0 e index 1), remove o segundo para não sobrepor
        return labels.filter((lbl, i, arr) => {
            if (i === 0) return true;
            return lbl.colIndex - arr[i - 1].colIndex > 2;
        });
    }, [weeks, selectedYear]);

    // Auto-scroll to today's week on mobile
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const today = new Date();
        const yyyy = today.getFullYear();
        if (selectedYear !== yyyy) {
            // Scroll to the end for past years
            container.scrollLeft = container.scrollWidth;
            return;
        }

        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;

        // Find week index containing today's date
        const weekIndex = weeks.findIndex(week => 
            week.some(day => day.dateStr === todayStr)
        );

        if (weekIndex !== -1) {
            // Width per column is 11px + 2.5px gap = 13.5px
            // Add offset (e.g. 32px padding for labels)
            const weekOffsetLeft = weekIndex * 13.5 + 32;
            const containerWidth = container.clientWidth;
            
            // Center today's column inside the visible scrollable area
            container.scrollLeft = weekOffsetLeft - containerWidth / 2;
        } else {
            container.scrollLeft = container.scrollWidth;
        }
    }, [weeks, selectedYear]);

    const handleMouseEnterDay = useCallback((
        rect: DOMRect,
        dateStr: string,
        count: number,
        isAdm: boolean,
        recallSec: number,
        studySec: number
    ) => {
        if (!outermostRef.current) return;
        const outermostRect = outermostRef.current.getBoundingClientRect();
        setHoveredDay({
            dateStr,
            count,
            recallSec,
            studySec,
            isAdm,
            x: rect.left - outermostRect.left + 5.5,
            y: rect.top - outermostRect.top - 100,
        });
    }, []);

    const handleMouseLeaveDay = useCallback(() => {
        setHoveredDay(null);
    }, []);

    // Grid com 364 células memoizado — NÃO recalcula nem re-renderiza quando hoveredDay muda
    const renderedGrid = useMemo(() => {
        return (
            <div className="flex gap-[2.5px] flex-1">
                {weeks.map((week, colIdx) => (
                    <div key={colIdx} className="flex flex-col gap-[2.5px]">
                        {week.map((day, rowIdx) => {
                            const record = dataMap.get(day.dateStr);
                            const count = record?.quantidade ?? 0;
                            const isAdm = record?.is_ajuste_adm ?? false;
                            const colorClass = getHeatmapColorClass(count, isAdm);

                            return (
                                <div
                                    key={rowIdx}
                                    className={`w-2.75 h-2.75 rounded-xs cursor-pointer transition-all duration-150 ${colorClass}`}
                                    onMouseEnter={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        handleMouseEnterDay(
                                            rect,
                                            day.dateStr,
                                            count,
                                            isAdm,
                                            record?.tempo_revelacao_segundos ?? 0,
                                            record?.tempo_estudo_segundos ?? 0
                                        );
                                    }}
                                    onMouseLeave={handleMouseLeaveDay}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>
        );
    }, [weeks, dataMap, handleMouseEnterDay, handleMouseLeaveDay]);

    return (
        <div ref={outermostRef} aria-label="Frequência de Estudos" className="bg-[#fffcf8]/70 backdrop-blur-md rounded-tcm-lg p-5 sm:p-6 border border-slate-200/80 shadow-tcm-sm relative">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Frequência de Estudos</h3>
                    
                    <div className="flex items-center gap-2">
                        {/* Navegação entre Anos */}
                        <div className="flex items-center gap-1 bg-slate-100 border border-slate-200/60 rounded-xl p-0.5 shadow-tcm-inner">
                            <button 
                                onClick={() => setSelectedYear(prev => prev - 1)}
                                className="p-1 hover:bg-white rounded-lg transition-colors text-slate-500 hover:text-slate-800 cursor-pointer"
                                title="Ano Anterior"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs font-extrabold text-slate-700 px-2 min-w-10 text-center select-none">
                                {selectedYear}
                            </span>
                            <button 
                                onClick={() => setSelectedYear(prev => prev + 1)}
                                disabled={selectedYear >= new Date().getFullYear()}
                                className="p-1 hover:bg-white rounded-lg transition-colors text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                                title="Próximo Ano"
                            >
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Ofensiva (Streak) */}
                        {streakAtual > 0 && (
                            <div 
                                className={`flex items-center gap-1 font-bold text-xs border px-2 py-0.5 rounded-lg shadow-sm shrink-0 ${
                                    isFrozen 
                                        ? 'text-blue-600 bg-blue-50 border-blue-200/40' 
                                        : 'text-orange-600 bg-orange-50 border-orange-200/40'
                                }`}
                                title={`Recorde pessoal: ${streakMaxima} ${streakMaxima === 1 ? 'dia' : 'dias'}`}
                            >
                                <span>{isFrozen ? '❄️' : '🔥'}</span>
                                <span className="text-[11px]">
                                    {streakAtual} {streakAtual === 1 ? 'dia' : 'dias'} {isFrozen && '(Congelada)'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    <span>Menos</span>
                    <div className="w-2.5 h-2.5 bg-slate-100 rounded-xs" />
                    <div className="w-2.5 h-2.5 bg-red-100 rounded-xs" />
                    <div className="w-2.5 h-2.5 bg-red-300 rounded-xs" />
                    <div className="w-2.5 h-2.5 bg-red-500 rounded-xs" />
                    <div className="w-2.5 h-2.5 bg-red-700 rounded-xs" />
                    <div className="w-2.5 h-2.5 bg-amber-300 rounded-xs ml-1" title="Ajuste administrativo" />
                    <span>Mais</span>
                </div>
            </div>



            {/* Container com Scroll no Mobile */}
            <div ref={scrollContainerRef} className="relative overflow-x-auto no-scrollbar scroll-smooth w-full pt-4 pb-2">
                <div className="flex flex-col min-w-162.5 relative select-none">
                    
                    {/* Linha dos Meses */}
                    <div className="h-5 flex mb-1 text-[10px] text-slate-400 font-medium pl-8 relative">
                        {monthLabels.map((lbl, idx) => (
                            <span 
                                key={idx} 
                                className="absolute" 
                                style={{ left: `${lbl.colIndex * 13.5 + 32}px` }}
                            >
                                {lbl.text}
                            </span>
                        ))}
                    </div>

                    {/* Corpo do Heatmap */}
                    <div className="flex">
                        {/* Rótulos dos Dias da Semana */}
                        <div className="w-8 flex flex-col justify-between text-[9px] text-slate-400 font-bold pr-2 py-0.5 leading-none h-23.25">
                            <span>Dom</span>
                            <span className="opacity-0">Seg</span>
                            <span>Ter</span>
                            <span className="opacity-0">Qua</span>
                            <span>Qui</span>
                            <span className="opacity-0">Sex</span>
                            <span>Sáb</span>
                        </div>

                        {/* Grid das Semanas (Memoizado) */}
                        {renderedGrid}
                    </div>

                </div>
            </div>

            {/* Tooltip Dinâmico - Renderizado fora do container scrollable para evitar overflow clipping */}
            <AnimatePresence>
                {hoveredDay && (
                    <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.12 }}
                        className="absolute bg-slate-800 text-white p-3 rounded-xl shadow-tcm-xl text-xs font-sans pointer-events-none z-50 flex flex-col gap-1 w-56 -translate-x-1/2 border border-slate-700/50"
                        style={{ left: hoveredDay.x, top: hoveredDay.y }}
                    >
                        <span className="font-bold text-slate-300 border-b border-slate-700 pb-1 text-[10px] uppercase tracking-wider block">
                            {formatDateReadable(hoveredDay.dateStr)}
                        </span>
                        {hoveredDay.count > 0 ? (
                            <>
                                <div className="flex justify-between items-center mt-1">
                                    <span className="text-slate-400 font-medium">Revisões:</span>
                                    <span className="font-extrabold text-tcm-yellow text-sm">
                                        {hoveredDay.count}
                                    </span>
                                </div>
                                {hoveredDay.isAdm ? (
                                    <span className="text-[10px] text-amber-300 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-center mt-1">
                                        Ajuste Administrativo
                                    </span>
                                ) : (
                                    <div className="text-[10px] text-slate-400 space-y-0.5 mt-1 border-t border-slate-700/40 pt-1.5">
                                        <div className="flex justify-between">
                                            <span>Média Recall (Lembrar):</span>
                                            <span className="font-semibold text-white">
                                                {Math.round(hoveredDay.recallSec / hoveredDay.count)}s/card
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Média Absorção (Estudo):</span>
                                            <span className="font-semibold text-white">
                                                {Math.round(hoveredDay.studySec / hoveredDay.count)}s/card
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <span className="text-slate-400 font-medium py-1">Nenhuma revisão realizada.</span>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default memo(SrsHeatmap);
