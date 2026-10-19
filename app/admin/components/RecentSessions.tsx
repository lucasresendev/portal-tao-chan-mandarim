'use client';

import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Users, Loader2, Clock, ChevronDown, AlertTriangle } from 'lucide-react';

type SessionEntry = {
    id: string;
    studentName: string | null;
    isKnown: boolean;
    time: string;
    durationMinutes: number;
};

function SessionCard({ session }: { session: SessionEntry }) {
    return (
        <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-start gap-3">
            <div className={`p-2 rounded-lg shrink-0 ${session.isKnown ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-500'}`}>
                <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
                <h3 className="font-bold text-slate-800 text-sm truncate" title={session.studentName ?? ''}>
                    {session.studentName || <span className="italic text-slate-400">Sem identificação</span>}
                </h3>
                {/* Se só tem email (não tem nome real), mostra como identificador */}
                {session.studentName?.includes('@') && (
                    <p className="text-xs text-amber-500 font-medium">Sem nome cadastrado</p>
                )}
                <div className="text-xs text-slate-500 mt-1 flex flex-col gap-0.5">
                    <span>Entrou: {session.time}</span>
                    <span className={`font-semibold ${session.durationMinutes < 2 ? 'text-slate-400' : 'text-slate-700'}`}>
                        {session.durationMinutes < 1 ? 'Menos de 1 min' : `${session.durationMinutes} min`}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default function RecentSessions() {
    const [limit, setLimit] = useState(12);

    const { data: sessions = [], isLoading, isFetching, isError } = useQuery({
        queryKey: ['admin-recent-sessions', limit],
        placeholderData: keepPreviousData,
        queryFn: async () => {
            const res = await fetch(`/api/admin/activity-log?type=sessions&limit=${limit}`);
            if (!res.ok) throw new Error('Falha ao buscar sessões da API.');
            return res.json() as Promise<SessionEntry[]>;
        }
    });

    const knownSessions   = sessions.filter(s => s.isKnown);
    const unknownSessions = sessions.filter(s => !s.isKnown);

    if (isLoading) {
        return (
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-center min-h-[150px] mb-6">
                <Loader2 className="w-8 h-8 animate-spin text-tcm-red" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm mb-6 text-sm text-slate-500 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                Não foi possível carregar as sessões recentes. Verifique a chave do PostHog.
            </div>
        );
    }

    if (sessions.length === 0) {
        return (
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm mb-6 text-sm text-slate-400 text-center">
                Nenhuma sessão encontrada nos últimos 14 dias.
            </div>
        );
    }

    return (
        <section className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Users className="w-6 h-6 text-tcm-red" />
                Sessões Recentes
            </h2>

            {/* Alunos Identificados */}
            {knownSessions.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {knownSessions.map(s => <SessionCard key={s.id} session={s} />)}
                </div>
            )}

            {/* Acessos Anônimos / Sem Identificação */}
            {unknownSessions.length > 0 && (
                <div className="mt-6">
                    <h3 className="text-xs font-bold text-amber-600 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Acessos não identificados ({unknownSessions.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {unknownSessions.map(s => <SessionCard key={s.id} session={s} />)}
                    </div>
                </div>
            )}

            {sessions.length >= limit && (
                <div className="pt-4 flex justify-center border-t border-slate-100 mt-6">
                    <button
                        onClick={() => setLimit(prev => prev + 12)}
                        disabled={isFetching}
                        className="bg-white border border-slate-200 hover:border-tcm-red text-slate-600 hover:text-tcm-red px-5 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {isFetching
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />}
                        Ver mais sessões
                    </button>
                </div>
            )}
        </section>
    );
}
