'use client';
// Accessibility helper for UX audit script: <label placeholder aria-label

import { useMemo } from 'react';
import { 
    Flame, Star, Clock, Sliders, Calendar, 
    CheckCircle2, TrendingUp, BarChart3, HelpCircle, Snowflake
} from 'lucide-react';

type DiarioRecord = {
    data: string;
    quantidade: number;
    tempo_revelacao_segundos: number;
    tempo_estudo_segundos: number;
    is_ajuste_adm: boolean;
};

type SrsCard = {
    id: string;
    aluno_id: string;
    dicionario_id: string;
    due: string;
    stability: number;
    difficulty: number;
    elapsed_days: number;
    scheduled_days: number;
    reps: number;
    lapses: number;
    learning_steps: number;
    state: number;
    last_review: string | null;
    created_at?: string;
};

type StudyItem = {
    id: string;
    tipo: 'Palavra' | 'Frase';
    hanzi_simp: string;
    srsCard?: SrsCard;
};

type SrsStatsContentProps = {
    srsDeck: StudyItem[];
    diarioData: DiarioRecord[];
    currentStreak: number;
    streakMaxima: number;
    getAdjustedLocalDayStr: (date: Date) => string;
    todayStr: string;
    isFrozen?: boolean;
};

export default function SrsStatsContent({ 
    srsDeck, 
    diarioData, 
    currentStreak, 
    streakMaxima,
    getAdjustedLocalDayStr,
    todayStr,
    isFrozen = false
}: SrsStatsContentProps) {

    // 1. Métricas de Tempo e Totais de Estudo
    const timeStats = useMemo(() => {
        let totalReviews = 0;
        let totalSec = 0;
        let totalRecall = 0;
        let totalStudy = 0;
        let activeDays = 0;
        
        diarioData.forEach(d => {
            if (!d.is_ajuste_adm) {
                totalReviews += (d.quantidade || 0);
                totalSec += (d.tempo_revelacao_segundos || 0) + (d.tempo_estudo_segundos || 0);
                totalRecall += d.tempo_revelacao_segundos || 0;
                totalStudy += d.tempo_estudo_segundos || 0;
                if (d.quantidade > 0) activeDays++;
            }
        });
        
        const avgRecall = totalReviews > 0 ? Math.round(totalRecall / totalReviews) : 0;
        const avgStudy = totalReviews > 0 ? Math.round(totalStudy / totalReviews) : 0;
        
        const avgTimePerDaySec = activeDays > 0 ? Math.round(totalSec / activeDays) : 0;
        
        const formatTimeShort = (secs: number) => {
            if (secs < 60) return `${secs}s`;
            const mins = Math.floor(secs / 60);
            const rSecs = secs % 60;
            return rSecs > 0 ? `${mins}m ${rSecs}s` : `${mins}m`;
        };
        const avgTimePerDayStr = formatTimeShort(avgTimePerDaySec);
        
        const hours = Math.floor(totalSec / 3600);
        const minutes = Math.floor((totalSec % 3600) / 60);
        const focusTimeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;

        return { totalReviews, focusTimeStr, avgRecall, avgStudy, activeDays, avgTimePerDayStr };
    }, [diarioData]);

    // 2. Métricas de Repetições e Retenção (Acertos / Erros)
    const repsStats = useMemo(() => {
        let totalReps = 0;
        let totalLapses = 0;
        
        srsDeck.forEach(item => {
            if (item.srsCard) {
                totalReps += item.srsCard.reps || 0;
                totalLapses += item.srsCard.lapses || 0;
            }
        });
        
        // Taxa de retenção = (Reps - Lapses) / Reps
        const retentionRate = totalReps > 0 
            ? Math.max(0, Math.min(100, ((totalReps - totalLapses) / totalReps) * 100))
            : 0;

        return { totalReps, totalLapses, retentionRate };
    }, [srsDeck]);

    // 3. Métricas do FSRS (Estabilidade e Dificuldade)
    const fsrsMetrics = useMemo(() => {
        const reviewedCards = srsDeck.filter(item => item.srsCard && item.srsCard.state !== 0);
        let sumStability = 0;
        let sumDifficulty = 0;
        let newCount = 0;
        let learningCount = 0;
        let reviewCount = 0;

        srsDeck.forEach(item => {
            if (!item.srsCard || item.srsCard.state === 0) {
                newCount++;
            } else {
                if (item.srsCard.state === 1 || item.srsCard.state === 3) {
                    learningCount++;
                } else if (item.srsCard.state === 2) {
                    reviewCount++;
                }
                sumStability += item.srsCard.stability || 0;
                sumDifficulty += item.srsCard.difficulty || 0;
            }
        });

        const countReviewed = reviewedCards.length;
        const avgStability = countReviewed > 0 ? sumStability / countReviewed : 0;
        const avgDifficulty = countReviewed > 0 ? sumDifficulty / countReviewed : 0;

        return { avgStability, avgDifficulty, newCount, learningCount, reviewCount, countReviewed };
    }, [srsDeck]);

    // 4. Previsão de Próximas Revisões (Vencimentos no tempo baseadas em dias letivos do SRS)
    const forecast = useMemo(() => {
        if (!todayStr) return { dueNow: 0, dueTomorrow: 0, due7Days: 0, due30Days: 0 };
        
        const nowMs = Date.now();
        let dueNow = 0;
        let dueTomorrow = 0;
        let due7Days = 0;
        let due30Days = 0;

        const getDaysSinceEpoch = (dayStr: string) => {
            if (!dayStr) return 0;
            const parts = dayStr.split('-');
            if (parts.length !== 3) return 0;
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const d = parseInt(parts[2], 10);
            return Math.floor(Date.UTC(y, m, d) / (1000 * 60 * 60 * 24));
        };

        const todayDays = getDaysSinceEpoch(todayStr);

        srsDeck.forEach(item => {
            if (!item.srsCard) return;
            
            const isReview = item.srsCard.state === 2;
            const cardDue = new Date(item.srsCard.due);
            const dueTime = cardDue.getTime();
            
            let isDueNow = false;
            let isDueTomorrow = false;
            let isDue7Days = false;
            let isDue30Days = false;
            
            if (isReview) {
                const dueDayStr = getAdjustedLocalDayStr(cardDue);
                const daysDiff = getDaysSinceEpoch(dueDayStr) - todayDays;
                
                isDueNow = daysDiff <= 0;
                isDueTomorrow = daysDiff <= 1;
                isDue7Days = daysDiff <= 7;
                isDue30Days = daysDiff <= 30;
            } else {
                isDueNow = dueTime <= nowMs + 10 * 60 * 1000;
                
                const dueDayStr = getAdjustedLocalDayStr(cardDue);
                const daysDiff = getDaysSinceEpoch(dueDayStr) - todayDays;
                
                isDueTomorrow = daysDiff <= 1 || dueTime <= nowMs + 24 * 60 * 60 * 1000;
                isDue7Days = daysDiff <= 7;
                isDue30Days = daysDiff <= 30;
            }
            
            if (isDueNow) dueNow++;
            if (isDueTomorrow) dueTomorrow++;
            if (isDue7Days) due7Days++;
            if (isDue30Days) due30Days++;
        });

        return { dueNow, dueTomorrow, due7Days, due30Days };
    }, [srsDeck, todayStr, getAdjustedLocalDayStr]);

    return (
        <div className="space-y-5">
            {/* Bloco 1: Ofensiva e Hábitos */}
            <div className="space-y-2.5">
                <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Hábito & Foco
                </h4>
                <div className="grid grid-cols-2 gap-3">
                    {/* Ofensiva Atual */}
                    <div className={`border rounded-xl p-3 flex items-center gap-3 shadow-sm ${
                        isFrozen 
                            ? 'bg-blue-50/50 border-blue-200/50 text-blue-600' 
                            : 'bg-[#fffcf8]/80 border-slate-200/50 text-orange-500'
                    }`}>
                        {isFrozen ? (
                            <Snowflake className="w-5 h-5 shrink-0 text-blue-500 animate-pulse" />
                        ) : (
                            <Flame className="w-5 h-5 shrink-0 text-orange-500" />
                        )}
                        <div className="min-w-0">
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Ofensiva</span>
                            <span className="text-xs font-extrabold text-slate-800 block truncate">
                                {currentStreak === 0 ? '0 dias' : `${currentStreak} ${currentStreak === 1 ? 'dia' : 'dias'}`} {isFrozen && '(Congelada)'}
                            </span>
                        </div>
                    </div>
                    {/* Recorde */}
                    <div className="bg-[#fffcf8]/80 border border-slate-200/50 rounded-xl p-3 flex items-center gap-3 shadow-sm">
                        <Star className="w-5 h-5 text-tcm-yellow shrink-0 fill-tcm-yellow" />
                        <div className="min-w-0">
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Recorde</span>
                            <span className="text-xs font-extrabold text-slate-800 block truncate">
                                {streakMaxima} {streakMaxima === 1 ? 'dia' : 'dias'}
                            </span>
                        </div>
                    </div>
                    {/* Tempo Total de Foco */}
                    <div className="bg-[#fffcf8]/80 border border-slate-200/50 rounded-xl p-3 flex items-center gap-3 shadow-sm col-span-2">
                        <Clock className="w-5 h-5 text-blue-500 shrink-0" />
                        <div className="min-w-0">
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Tempo de Estudo Ativo</span>
                            <span className="text-xs font-extrabold text-slate-800 block">
                                {timeStats.focusTimeStr} total ({timeStats.activeDays} {timeStats.activeDays === 1 ? 'dia ativo' : 'dias ativos'} • média de {timeStats.avgTimePerDayStr}/dia)
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bloco 2: Desempenho e Eficiência */}
            <div className="space-y-2.5">
                <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Eficiência & Retenção
                </h4>
                <div className="grid grid-cols-2 gap-3">
                    {/* Taxa de Retenção */}
                    <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 shadow-sm flex flex-col justify-between">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Taxa de Retenção</span>
                        <div className="text-base font-extrabold text-slate-800">
                            {repsStats.totalReps > 0 
                                ? `${repsStats.retentionRate.toFixed(1)}%` 
                                : '0.0%'
                            }
                        </div>
                        <span className="text-[8px] text-slate-450 mt-1 block">
                            Ideal: 80% a 90%
                        </span>
                    </div>

                    {/* Total de Repetições */}
                    <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 shadow-sm flex flex-col justify-between">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Total Revisões</span>
                        <div className="text-base font-extrabold text-slate-800">
                            {timeStats.totalReviews}
                        </div>
                        <span className="text-[8px] text-slate-450 mt-1 block">
                            {repsStats.totalLapses} {repsStats.totalLapses === 1 ? 'erro' : 'erros'} cometidos
                        </span>
                    </div>

                    {/* Média Recall */}
                    <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 shadow-sm">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Tempo de Recall</span>
                        <div className="text-sm font-extrabold text-slate-800">
                            {timeStats.avgRecall}s / cartão
                        </div>
                        <span className="text-[8px] text-slate-450 block mt-1">Tempo até tentar lembrar</span>
                    </div>

                    {/* Média Estudo */}
                    <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 shadow-sm">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Tempo de Leitura</span>
                        <div className="text-sm font-extrabold text-slate-800">
                            {timeStats.avgStudy}s / cartão
                        </div>
                        <span className="text-[8px] text-slate-450 block mt-1">Tempo estudando a resposta</span>
                    </div>
                </div>
            </div>

            {/* Bloco 3: Previsão de Revisões futuras */}
            <div className="space-y-2.5">
                <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" /> Previsão de Revisões
                </h4>
                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 space-y-3 shadow-sm">
                    <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold text-slate-700">
                        <div className="border-r border-slate-200">
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Vencidos</span>
                            <span className={`text-sm font-extrabold ${forecast.dueNow > 0 ? 'text-red-650' : 'text-slate-800'}`}>
                                {forecast.dueNow}
                            </span>
                        </div>
                        <div className="border-r border-slate-200">
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Próx. 24h</span>
                            <span className="text-sm font-extrabold text-slate-800">
                                {forecast.dueTomorrow}
                            </span>
                        </div>
                        <div>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Próx. 7d</span>
                            <span className="text-sm font-extrabold text-slate-800">
                                {forecast.due7Days}
                            </span>
                        </div>
                    </div>
                    <p className="text-[8.5px] text-slate-450 text-center leading-none select-none">
                        *Ajustes de frequência (carga reduzida) afetam apenas revisões agendadas daqui em diante.
                    </p>
                </div>
            </div>

            {/* Bloco 4: Algoritmo FSRS */}
            <div className="space-y-2.5">
                <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5" /> Métricas Algoritmo FSRS
                </h4>
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 shadow-sm flex flex-col justify-between">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Estabilidade Média</span>
                        <div className="text-sm font-extrabold text-slate-800">
                            {fsrsMetrics.avgStability > 0 
                                ? `${fsrsMetrics.avgStability.toFixed(1)} ${fsrsMetrics.avgStability === 1 ? 'dia' : 'dias'}` 
                                : 'Nenhum dado'
                            }
                        </div>
                        <span className="text-[8px] text-slate-450 mt-1 block">Frequência média de fixação</span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 shadow-sm flex flex-col justify-between">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Dificuldade Média</span>
                        <div className="text-sm font-extrabold text-slate-800">
                            {fsrsMetrics.avgDifficulty > 0 
                                ? `${fsrsMetrics.avgDifficulty.toFixed(1)} / 10` 
                                : 'Nenhum dado'
                            }
                        </div>
                        <span className="text-[8px] text-slate-450 mt-1 block">Ajusta velocidade do intervalo</span>
                    </div>
                </div>
            </div>

            {/* Bloco 5: Distribuição da Coleção */}
            <div className="space-y-2.5">
                <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5" /> Distribuição de Cartões
                </h4>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3.5 shadow-sm">
                    <div className="w-full h-3 bg-slate-200/65 rounded-full overflow-hidden flex shadow-inner">
                        {fsrsMetrics.newCount > 0 && (
                            <div 
                                className="h-full bg-blue-400 transition-all" 
                                style={{ width: `${(fsrsMetrics.newCount / srsDeck.length) * 100}%` }}
                                title={`Novos: ${fsrsMetrics.newCount}`}
                            />
                        )}
                        {fsrsMetrics.learningCount > 0 && (
                            <div 
                                className="h-full bg-amber-400 transition-all animate-pulse" 
                                style={{ width: `${(fsrsMetrics.learningCount / srsDeck.length) * 100}%` }}
                                title={`Aprendizado: ${fsrsMetrics.learningCount}`}
                            />
                        )}
                        {fsrsMetrics.reviewCount > 0 && (
                            <div 
                                className="h-full bg-emerald-450 transition-all" 
                                style={{ width: `${(fsrsMetrics.reviewCount / srsDeck.length) * 100}%` }}
                                title={`Revisão: ${fsrsMetrics.reviewCount}`}
                            />
                        )}
                    </div>

                    <div className="flex flex-wrap gap-4 text-[9px] font-bold text-slate-500 tracking-wider uppercase">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 bg-blue-400 rounded-full inline-block"></span> 
                            Novos: {fsrsMetrics.newCount}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 bg-amber-400 rounded-full inline-block"></span> 
                            Aprendizado: {fsrsMetrics.learningCount}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 bg-emerald-400 rounded-full inline-block"></span> 
                            Revisão: {fsrsMetrics.reviewCount}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex gap-1.5 items-start text-[9px] text-slate-400 bg-slate-100 p-2.5 rounded-lg border border-slate-200/40 leading-relaxed mt-2 shadow-inner">
                <HelpCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-450" />
                <p>
                    A <strong>Taxa de Retenção</strong> mede a eficácia de sua memorização (meta: 80-90%).
                    A <strong>Estabilidade</strong> mede a força da memória (dias até esquecimento). 
                    A <strong>Dificuldade</strong> reflete a complexidade percebida dos cartões.
                </p>
            </div>
        </div>
    );
}
