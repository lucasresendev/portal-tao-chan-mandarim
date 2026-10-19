'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
    Clock, 
    Loader2, 
    BookOpen, 
    MessageSquare, 
    ChevronDown, 
    Library, 
    User, 
    Settings, 
    MousePointerClick, 
    Flame,
    Search,
    Calendar,
    Users,
    ChevronRight,
    Filter,
    X,
    AlertTriangle
} from 'lucide-react';

type LogEntry = {
    id: string;
    studentName: string;
    actionType: string;
    description: string;
    time: string;
    timestamp: number;
    count: number;
};

interface GroupedStudent {
    studentName: string;
    logs: LogEntry[];
    lastActivityTimestamp: number;
    lastActivityTime: string;
    focusBadge?: { label: string; color: string } | null;
    hasAlert?: boolean;
}

const ICON_MAP: Record<string, { bg: string; Icon: React.ElementType }> = {
    aula_update:  { bg: 'bg-indigo-50 text-indigo-600 border-indigo-150', Icon: BookOpen },
    dialogo_play: { bg: 'bg-sky-50 text-sky-600 border-sky-150',  Icon: MessageSquare },
    aluno_novo:   { bg: 'bg-emerald-50 text-emerald-600 border-emerald-150', Icon: User },
    dicionario:   { bg: 'bg-rose-50 text-rose-600 border-rose-150',       Icon: Library },
    login:        { bg: 'bg-blue-50 text-blue-600 border-blue-150',       Icon: User },
    logout:       { bg: 'bg-slate-100 text-slate-500 border-slate-200',     Icon: User },
    custom:       { bg: 'bg-amber-50 text-amber-600 border-amber-150',     Icon: Settings },
    srs:          { bg: 'bg-orange-50 text-orange-600 border-orange-150',   Icon: Flame },
    alerta:       { bg: 'bg-red-50 text-red-600 border-red-200',          Icon: AlertTriangle },
};

const ACTION_PILLS = [
    { type: 'all', label: 'Todos', Icon: Filter },
    { type: 'srs', label: 'SRS', Icon: Flame },
    { type: 'aula_update', label: 'Aulas', Icon: BookOpen },
    { type: 'dialogo_play', label: 'Diálogos', Icon: MessageSquare },
    { type: 'dicionario', label: 'Dicionário', Icon: Library },
    { type: 'login', label: 'Acessos', Icon: User },
    { type: 'alerta', label: 'Alertas', Icon: AlertTriangle },
    { type: 'other', label: 'Outros', Icon: Settings },
];

export default function ActivityLog() {
    const [displayLimit, setDisplayLimit] = useState(12);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAction, setSelectedAction] = useState('all');
    const [selectedPeriod, setSelectedPeriod] = useState('all'); // today, yesterday, 7d, 30d, all
    const [viewMode, setViewMode] = useState<'timeline' | 'grouped'>('timeline');
    const [expandedStudents, setExpandedStudents] = useState<Record<string, boolean>>({});

    // Uma única chamada, lote completo (limite aumentado para 2000 no backend), cacheado pelo TanStack
    const { data: allLogs = [], isLoading, isFetching } = useQuery<LogEntry[]>({
        queryKey: ['admin-activity-log-full'],
        staleTime: 60_000, // 1 min de cache
        queryFn: async () => {
            const res = await fetch('/api/admin/activity-log');
            if (!res.ok) throw new Error('Falha ao buscar logs da API.');
            return res.json();
        }
    });

    const toggleStudentExpand = (name: string) => {
        setExpandedStudents(prev => ({
            ...prev,
            [name]: !prev[name]
        }));
    };



    const matchesPeriod = (timestamp: number, period: string) => {
        const logDate = new Date(timestamp);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (period === 'today') {
            return logDate >= today;
        }
        if (period === 'yesterday') {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            return logDate >= yesterday;
        }
        if (period === '7d') {
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            return logDate >= sevenDaysAgo;
        }
        if (period === '30d') {
            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return logDate >= thirtyDaysAgo;
        }
        return true;
    };

    // Filtragem no Client-side: super rápida
    const filteredLogs = allLogs.filter(log => {
        const matchSearch = searchTerm.trim() === '' || 
            log.studentName.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchAction = selectedAction === 'all' || 
            (selectedAction === 'other' 
                ? !['srs', 'aula_update', 'dialogo_play', 'dicionario', 'login', 'alerta'].includes(log.actionType)
                : log.actionType === selectedAction);

        const matchTime = matchesPeriod(log.timestamp, selectedPeriod);

        return matchSearch && matchAction && matchTime;
    });

    function computeStudentFocus(studentLogs: LogEntry[]) {
        let srsCount = 0;
        let aulaCount = 0;
        let dicionarioCount = 0;
        let dialogoCount = 0;
        let hasAlert = false;

        for (const log of studentLogs) {
            if (log.actionType === 'srs') srsCount++;
            else if (log.actionType === 'aula_update') aulaCount++;
            else if (log.actionType === 'dicionario') dicionarioCount++;
            else if (log.actionType === 'dialogo_play') dialogoCount++;
            else if (log.actionType === 'alerta') hasAlert = true;
        }

        let focusBadge: { label: string; color: string } | null = null;
        if (srsCount >= 3 && srsCount >= aulaCount && srsCount >= dicionarioCount) {
            focusBadge = { label: 'SRS Focado', color: 'bg-orange-100 text-orange-700 border-orange-200' };
        } else if (aulaCount >= 3 && aulaCount >= srsCount) {
            focusBadge = { label: 'Estudioso', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' };
        } else if (dicionarioCount >= 3) {
            focusBadge = { label: 'Pesquisador', color: 'bg-rose-100 text-rose-700 border-rose-200' };
        } else if (dialogoCount >= 2) {
            focusBadge = { label: 'Conversador', color: 'bg-sky-100 text-sky-700 border-sky-200' };
        } else if (studentLogs.length >= 4) {
            focusBadge = { label: 'Ativo', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
        }

        return { focusBadge, hasAlert };
    }

    // Agrupamento por estudante
    const groupedStudents: GroupedStudent[] = [];
    if (viewMode === 'grouped') {
        const groupedMap = new Map<string, LogEntry[]>();
        for (const log of filteredLogs) {
            const list = groupedMap.get(log.studentName) || [];
            list.push(log);
            groupedMap.set(log.studentName, list);
        }

        const entries = Array.from(groupedMap.entries()).map(([name, studentLogs]) => {
            const mostRecent = studentLogs[0];
            const { focusBadge, hasAlert } = computeStudentFocus(studentLogs);
            return {
                studentName: name,
                logs: studentLogs,
                lastActivityTimestamp: mostRecent.timestamp,
                lastActivityTime: mostRecent.time,
                focusBadge,
                hasAlert,
            };
        });

        // Ordena por atividade mais recente
        entries.sort((a, b) => b.lastActivityTimestamp - a.lastActivityTimestamp);
        groupedStudents.push(...entries);
    }

    const visibleTimelineLogs = filteredLogs.slice(0, displayLimit);
    const visibleGroupedStudents = groupedStudents.slice(0, displayLimit);

    const hasMore = viewMode === 'timeline' 
        ? displayLimit < filteredLogs.length 
        : displayLimit < groupedStudents.length;

    return (
        <section className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col mt-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Clock className="w-6 h-6 text-tcm-red animate-pulse" />
                    Telemetria de Atividades
                    {filteredLogs.length > 0 && (
                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                            {filteredLogs.length} {filteredLogs.length === 1 ? 'evento' : 'eventos'}
                        </span>
                    )}
                </h2>

                {/* Seletor de Modo: Cronológico vs Agrupado */}
                <div className="flex bg-slate-100 p-1 rounded-xl self-start md:self-auto border border-slate-200">
                    <button
                        onClick={() => { setViewMode('timeline'); setDisplayLimit(12); }}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${viewMode === 'timeline' ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        <Clock className="w-3.5 h-3.5" />
                        Linha do Tempo
                    </button>
                    <button
                        onClick={() => { setViewMode('grouped'); setDisplayLimit(12); }}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${viewMode === 'grouped' ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        <Users className="w-3.5 h-3.5" />
                        Agrupar por Aluno
                    </button>
                </div>
            </div>

            {/* Painel de Filtros Avançados */}
            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 mb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Busca por Estudante */}
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <Search className="w-4 h-4" />
                        </span>
                        <input
                            type="text"
                            placeholder="Buscar aluno por nome..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white border border-slate-250 hover:border-slate-350 focus:border-tcm-red focus:ring-1 focus:ring-tcm-red/30 rounded-xl py-2 pl-10 pr-9 text-xs font-medium text-slate-800 placeholder-slate-400 transition-all outline-none"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Período */}
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <Calendar className="w-4 h-4" />
                        </span>
                        <select
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value)}
                            className="w-full bg-white border border-slate-250 hover:border-slate-350 focus:border-tcm-red rounded-xl py-2 pl-10 pr-8 text-xs font-bold text-slate-700 transition-all outline-none appearance-none cursor-pointer"
                        >
                            <option value="all">Período: Últimos 60 dias</option>
                            <option value="30d">Período: Últimos 30 dias</option>
                            <option value="7d">Período: Últimos 7 dias</option>
                            <option value="yesterday">Período: Ontem e Hoje</option>
                            <option value="today">Período: Hoje</option>
                        </select>
                        <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                            <ChevronDown className="w-4 h-4" />
                        </span>
                    </div>
                </div>

                {/* Filtro por Tipo de Ação (Pills) */}
                <div className="flex flex-wrap gap-1.5 border-t border-slate-200/60 pt-3">
                    {ACTION_PILLS.map(pill => {
                        const PillIcon = pill.Icon;
                        const isActive = selectedAction === pill.type;
                        return (
                            <button
                                key={pill.type}
                                onClick={() => setSelectedAction(pill.type)}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${isActive ? 'bg-tcm-red text-white border-tcm-red shadow-xs' : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-250 hover:border-slate-350'}`}
                            >
                                <PillIcon className="w-3.5 h-3.5" />
                                {pill.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Listagem */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-tcm-red" />
                </div>
            ) : filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-slate-500 py-12 text-sm text-center">
                    <Filter className="w-8 h-8 text-slate-300 mb-2" />
                    Nenhum log encontrado para os critérios de busca aplicados.
                </div>
            ) : viewMode === 'timeline' ? (
                /* MODO LINHA DO TEMPO (CRONOLÓGICO) */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {visibleTimelineLogs.map(log => {
                        const style = ICON_MAP[log.actionType] ?? { bg: 'bg-slate-50 text-slate-500 border-slate-150', Icon: MousePointerClick };
                        const { bg, Icon } = style;

                        return (
                            <div key={log.id} className="bg-slate-50/50 border border-slate-200/80 p-4 rounded-2xl flex gap-3 hover:shadow-xs hover:border-slate-350 hover:bg-white transition-all duration-200">
                                <div className={`p-2 rounded-xl h-fit shrink-0 border ${bg}`}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-between">
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-slate-800 text-xs truncate" title={log.studentName}>
                                            {log.studentName}
                                        </h4>
                                        <p className="text-xs text-slate-600 mt-1 font-medium leading-relaxed line-clamp-2" title={log.description}>
                                            {log.description}
                                        </p>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500 mt-3 block w-fit bg-slate-200/40 px-2 py-0.5 rounded border border-slate-200/50">
                                        {log.time}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* MODO AGRUPADO POR ALUNO (LISTA COMPACTA PREMIUM) */
                <div className="flex flex-col gap-3">
                    {visibleGroupedStudents.map(student => {
                        const isExpanded = !!expandedStudents[student.studentName];

                        return (
                            <div 
                                key={student.studentName} 
                                className={`border rounded-2xl p-4 flex flex-col transition-all duration-200 bg-slate-50/50 hover:bg-white ${isExpanded ? 'border-tcm-red bg-white ring-1 ring-tcm-red/10 shadow-xs' : 'border-slate-200/80 hover:border-slate-350'}`}
                            >
                                <div 
                                    onClick={() => toggleStudentExpand(student.studentName)}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none"
                                >
                                    {/* Esquerda: Info Aluno */}
                                    <div className="flex items-center gap-3">
                                        <div className="bg-slate-100 p-2 rounded-xl text-slate-500 border border-slate-200 shrink-0">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h4 className="font-extrabold text-slate-800 text-sm truncate">
                                                    {student.studentName}
                                                </h4>
                                                {student.focusBadge && (
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${student.focusBadge.color}`}>
                                                        {student.focusBadge.label}
                                                    </span>
                                                )}
                                                {student.hasAlert && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-red-100 text-red-700 border-red-200 flex items-center gap-1">
                                                        <AlertTriangle className="w-3 h-3" />
                                                        Falha Login
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] font-bold text-slate-500 bg-slate-150 px-2 py-0.5 rounded">
                                                    {student.logs.length} {student.logs.length === 1 ? 'atividade' : 'atividades'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Direita: Última atividade + Expand Chevron */}
                                    <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                                        <div className="text-left sm:text-right">
                                            <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">Última atividade</p>
                                            <p className="text-xs font-bold text-slate-600 mt-1">{student.lastActivityTime}</p>
                                        </div>
                                        <div className={`p-1.5 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-650 transition-transform ${isExpanded ? 'rotate-90 text-tcm-red border-tcm-red/30 bg-tcm-red/5' : ''}`}>
                                            <ChevronRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>

                                {/* Linha do Tempo Vertical Expansível */}
                                {isExpanded && (
                                    <div className="mt-4 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-4 pl-1">Linha do tempo no período</p>
                                        <div className="relative pl-6 border-l border-dashed border-slate-250 ml-4 space-y-4">
                                            {student.logs.map(log => {
                                                const style = ICON_MAP[log.actionType] ?? { bg: 'bg-slate-100 text-slate-500 border-slate-200', Icon: MousePointerClick };
                                                const { bg, Icon } = style;
                                                return (
                                                    <div key={log.id} className="relative flex items-start gap-3">
                                                        {/* Timeline Dot (Perfeitamente centralizado no border-l do container) */}
                                                        <div className={`absolute -left-8.5 top-0.5 w-5 h-5 rounded-full border bg-white ${bg} shadow-xs flex items-center justify-center`}>
                                                            <Icon className="w-3 h-3" />
                                                        </div>
                                                        {/* Log Details */}
                                                        <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                                            <span className="text-xs font-bold text-slate-700 leading-relaxed">
                                                                {log.description}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-slate-400 shrink-0">
                                                                {log.time}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Footer / Carregar mais */}
            <div className="pt-4 flex items-center justify-center border-t border-slate-100 mt-6 gap-3">
                {hasMore && (
                    <button
                        onClick={() => setDisplayLimit(prev => prev + 12)}
                        className="bg-white border border-slate-200 hover:border-tcm-red text-slate-600 hover:text-tcm-red px-5 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2 group cursor-pointer"
                    >
                        <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                        Carregar mais
                    </button>
                )}
                {isFetching && (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                )}
                {!hasMore && (viewMode === 'timeline' ? filteredLogs.length > 0 : groupedStudents.length > 0) && (
                    <span className="text-xs text-slate-400">
                        {viewMode === 'timeline' 
                            ? `Todos os ${filteredLogs.length} eventos carregados`
                            : `Todos os ${groupedStudents.length} estudantes carregados`}
                    </span>
                )}
            </div>
        </section>
    );
}
