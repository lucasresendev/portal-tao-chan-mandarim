'use client';

import { useQuery } from '@tanstack/react-query';
import { Users, Clock, Timer, Flame, BookOpen } from 'lucide-react';

type TodayStats = {
    studentsToday: number;
    avgMinutes: number;
    totalMinutes: number;
    srsCardsToday?: number;
    lessonsToday?: number;
};

function formatMinutes(minutes: number): string {
    if (minutes < 60) return `${minutes}min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export default function TodayStats() {
    const { data, isLoading } = useQuery<TodayStats>({
        queryKey: ['admin-today-stats'],
        staleTime: 5 * 60_000, // 5 min
        queryFn: async () => {
            const res = await fetch('/api/admin/activity-log?type=today');
            if (!res.ok) throw new Error('Falha ao buscar stats do dia.');
            return res.json();
        }
    });

    const stats = [
        {
            label: 'Alunos Hoje',
            value: isLoading ? '—' : String(data?.studentsToday ?? 0),
            icon: Users,
            color: 'text-emerald-300',
        },
        {
            label: 'Média Online',
            value: isLoading ? '—' : formatMinutes(data?.avgMinutes ?? 0),
            icon: Clock,
            color: 'text-sky-300',
        },
        {
            label: 'Total Online',
            value: isLoading ? '—' : formatMinutes(data?.totalMinutes ?? 0),
            icon: Timer,
            color: 'text-indigo-300',
        },
        {
            label: 'SRS Hoje',
            value: isLoading ? '—' : `${data?.srsCardsToday ?? 0} ${Number(data?.srsCardsToday) === 1 ? 'card' : 'cards'}`,
            icon: Flame,
            color: 'text-amber-300',
        },
        {
            label: 'Aulas Hoje',
            value: isLoading ? '—' : `${data?.lessonsToday ?? 0} ${Number(data?.lessonsToday) === 1 ? 'ação' : 'ações'}`,
            icon: BookOpen,
            color: 'text-rose-300',
        },
    ];

    return (
        <>
            {stats.map(stat => (
                <div key={stat.label} className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-4 flex items-center gap-3 snap-start shrink-0 min-w-35 sm:min-w-0">
                    <div className="shrink-0">
                        <stat.icon className={`w-7 h-7 ${stat.color}`} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-white/60 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                        <p className="text-2xl font-bold text-white leading-none">{stat.value}</p>
                    </div>
                </div>
            ))}
        </>
    );
}
