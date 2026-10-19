'use server';

import '@/lib/demo/supabaseSandbox';
import type { DemoServerPayload } from '@/lib/demo/supabaseSandbox';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

// ==========================================
// HELPERS TEMPORAIS (Fuso America/Sao_Paulo)
// ==========================================
async function getAdjustedLocalDate(date: Date, rolloverHour: number = 1): Promise<string> {
    const tz = 'America/Sao_Paulo';
    
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
    });
    
    const parts = formatter.formatToParts(date);
    const partMap: Record<string, string> = {};
    for (const part of parts) {
        partMap[part.type] = part.value;
    }
    
    const year = parseInt(partMap.year, 10);
    const month = parseInt(partMap.month, 10) - 1;
    const day = parseInt(partMap.day, 10);
    const hour = parseInt(partMap.hour, 10);
    const minute = parseInt(partMap.minute, 10);
    const second = parseInt(partMap.second, 10);
    
    // Cria uma data local independente do timezone do sistema para ajuste de horas seguro
    const localDate = new Date(year, month, day, hour, minute, second);
    localDate.setHours(localDate.getHours() - rolloverHour);
    
    const yyyy = localDate.getFullYear();
    const mm = String(localDate.getMonth() + 1).padStart(2, '0');
    const dd = String(localDate.getDate()).padStart(2, '0');
    
    return `${yyyy}-${mm}-${dd}`;
}

function getDaysDiff(dateStr1: string, dateStr2: string): number {
    const d1 = new Date(dateStr1 + 'T00:00:00Z');
    const d2 = new Date(dateStr2 + 'T00:00:00Z');
    const diffTime = d1.getTime() - d2.getTime(); // Sem Math.abs para robustez contra relógios futuros
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

// ==========================================
// TIPAGENS DO SRS
// ==========================================
export type CardUpdatePayload = {
    dicionario_id: string;
    due: string; // ISO String
    stability: number;
    difficulty: number;
    elapsed_days: number;
    scheduled_days: number;
    reps: number;
    lapses: number;
    learning_steps: number;
    state: number;
    last_review: string | null; // ISO String
};

// ==========================================
// SERVER ACTIONS
// ==========================================

/**
 * Sincroniza em lote todos os cartões revisados durante uma sessão de estudo,
 * atualizando também os streaks (ofensivas) e os tempos acumulados do Heatmap.
 */
export async function syncSrsSessionAction({
    cardsToUpsert,
    sessionCount,
    totalRecallSeconds,
    totalStudySeconds
}: {
    cardsToUpsert: CardUpdatePayload[];
    sessionCount: number;
    totalRecallSeconds: number;
    totalStudySeconds: number;
}) {
    try {
        const cookieStore = await cookies();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = createServerComponentClient({ cookies: () => cookieStore as any });

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return { error: 'Usuário não autenticado.' };
        }

        const userId = user.id;
        const demoPayloads: DemoServerPayload[] = [];

        // 1. Persistência dos cards em Batch
        if (cardsToUpsert.length > 0) {
            const cardsPayload = cardsToUpsert.map(card => ({
                aluno_id: userId,
                dicionario_id: card.dicionario_id,
                due: card.due,
                stability: card.stability,
                difficulty: card.difficulty,
                elapsed_days: card.elapsed_days,
                scheduled_days: card.scheduled_days,
                reps: card.reps,
                lapses: card.lapses,
                learning_steps: card.learning_steps,
                state: card.state,
                last_review: card.last_review
                // Omitido created_at para reter a data de introdução original
            }));

            const { error: upsertError } = await supabase
                .from('progresso_srs_cards')
                .upsert(cardsPayload, { onConflict: 'aluno_id, dicionario_id' });

            if (upsertError) {
                console.error('Erro ao salvar cards SRS:', upsertError);
                return { error: 'Falha ao salvar o progresso dos cartões.' };
            }

            for (const row of cardsPayload) {
                demoPayloads.push({
                    table: 'progresso_srs_cards',
                    row,
                    conflictKeys: ['aluno_id', 'dicionario_id'],
                });
            }
        }

        // 2. Busca os metadados SRS para cálculo de Streaks
        const { data: meta, error: metaError } = await supabase
            .from('progresso_srs_meta')
            .select('*')
            .eq('aluno_id', userId)
            .single();

        if (metaError && metaError.code !== 'PGRST116') {
            console.error('Erro ao buscar metadados SRS:', metaError);
        }

        const now = new Date();
        const viradaHora = meta?.virada_hora ?? 1;
        const todayAdjusted = await getAdjustedLocalDate(now, viradaHora);

        let streakAtual = meta?.streak_atual ?? 0;
        let streakMaxima = meta?.streak_maxima ?? 0;
        const ultimaRevisao = meta?.ultima_revisao;

        if (sessionCount > 0) {
            if (!ultimaRevisao) {
                // Primeira revisão da vida do estudante
                streakAtual = 1;
                streakMaxima = Math.max(streakMaxima, 1);
            } else {
                const lastAdjusted = await getAdjustedLocalDate(new Date(ultimaRevisao), viradaHora);
                const diffDays = getDaysDiff(todayAdjusted, lastAdjusted);

                if (diffDays === 1) {
                    // Estudou no dia seguinte perfeito!
                    streakAtual += 1;
                    streakMaxima = Math.max(streakMaxima, streakAtual);
                } else if (diffDays === 2) {
                    // Estudou pulando exatamente 1 dia -> Congela a ofensiva.
                    // O valor de streakAtual é preservado (não aumenta nem reseta).
                } else if (diffDays > 2) {
                    // Quebrou a streak de vez (2 ou mais dias sem estudar)
                    streakAtual = 1;
                }
                // Se diffDays <= 0, já estudou hoje ou em horário futuro. Mantém a streak como está.
            }

            const metaRow = {
                aluno_id: userId,
                srs_habilitado: meta?.srs_habilitado ?? true,
                streak_atual: streakAtual,
                streak_maxima: streakMaxima,
                ultima_revisao: now.toISOString(),
                updated_at: now.toISOString()
            };

            // 3. Atualiza os metadados do aluno apenas se houve revisões
            const { error: metaUpsertError } = await supabase
                .from('progresso_srs_meta')
                .upsert(metaRow, { onConflict: 'aluno_id' });

            if (metaUpsertError) {
                console.error('Erro ao atualizar metadados SRS:', metaUpsertError);
                return { error: 'Falha ao atualizar a ofensiva de estudos.' };
            }

            demoPayloads.push({
                table: 'progresso_srs_meta',
                row: metaRow,
                conflictKeys: ['aluno_id'],
            });

            // Sanity check de tempo no servidor (capping de 60 segundos por card avaliado)
            const maxAllowedTime = sessionCount * 60;
            const sanitizedRecall = Math.min(totalRecallSeconds, maxAllowedTime);
            const sanitizedStudy = Math.min(totalStudySeconds, maxAllowedTime);

            // 4. Agrega a quantidade e os tempos no Heatmap diário
            // Verifica se já existe registro para hoje
            const { data: diarioExistente } = await supabase
                .from('progresso_srs_diario')
                .select('*')
                .eq('aluno_id', userId)
                .eq('data', todayAdjusted)
                .single();

            const qtdFinal = (diarioExistente?.quantidade ?? 0) + sessionCount;
            const recallFinal = (diarioExistente?.tempo_revelacao_segundos ?? 0) + sanitizedRecall;
            const estudoFinal = (diarioExistente?.tempo_estudo_segundos ?? 0) + sanitizedStudy;

            const diarioRow = {
                aluno_id: userId,
                data: todayAdjusted,
                quantidade: qtdFinal,
                tempo_revelacao_segundos: recallFinal,
                tempo_estudo_segundos: estudoFinal,
                is_ajuste_adm: diarioExistente?.is_ajuste_adm ?? false
            };

            const { error: diarioError } = await supabase
                .from('progresso_srs_diario')
                .upsert(diarioRow, { onConflict: 'aluno_id, data' });

            if (diarioError) {
                console.error('Erro ao salvar no diário do Heatmap:', diarioError);
                return { error: 'Falha ao registrar dados no Heatmap.' };
            }

            demoPayloads.push({
                table: 'progresso_srs_diario',
                row: diarioRow,
                conflictKeys: ['aluno_id', 'data'],
            });
        }

        // Revalida a rota do dashboard do aluno para refletir os novos dados
        revalidatePath('/dashboard');
        revalidatePath('/dashboard/dicionario/srs');

        return { success: true, streakAtual, streakMaxima, demoPayloads };
    } catch (err: unknown) {
        const error = err as Error;
        console.error('Erro síncrono no syncSrsSessionAction:', error);
        return { error: error.message || 'Erro desconhecido.' };
    }
}

/**
 * Ativa ou desativa a funcionalidade do SRS (Opt-In/Opt-Out).
 */
export async function toggleSrsOptInAction(enable: boolean) {
    try {
        const cookieStore = await cookies();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = createServerComponentClient({ cookies: () => cookieStore as any });

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return { error: 'Usuário não autenticado.' };
        }

        const userId = user.id;
        const metaRow = {
            aluno_id: userId,
            srs_habilitado: enable,
            updated_at: new Date().toISOString()
        };

        // Se habilitando, garante a existência do registro com valores padrão
        const { error } = await supabase
            .from('progresso_srs_meta')
            .upsert(metaRow, { onConflict: 'aluno_id' });

        if (error) throw error;

        revalidatePath('/dashboard');
        return {
            success: true,
            demoPayloads: [
                {
                    table: 'progresso_srs_meta',
                    row: metaRow,
                    conflictKeys: ['aluno_id'],
                },
            ] as DemoServerPayload[],
        };
    } catch (err: unknown) {
        const error = err as Error;
        return { error: error.message || 'Erro ao alternar ativação do SRS.' };
    }
}

/**
 * Atualiza preferências de estudo do aluno (limites, retenção e filtros padrão).
 */
export async function updateSrsPreferencesAction({
    limiteNovas,
    retencaoReduzida,
    filtroPadrao,
    viradaHora
}: {
    limiteNovas: number;
    retencaoReduzida: boolean;
    filtroPadrao: 'Ambos' | 'Palavras' | 'Frases';
    viradaHora: number;
}) {
    try {
        const cookieStore = await cookies();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = createServerComponentClient({ cookies: () => cookieStore as any });

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return { error: 'Usuário não autenticado.' };
        }

        const metaRow = {
            aluno_id: user.id,
            limite_novas: limiteNovas,
            retencao_reduzida: retencaoReduzida,
            filtro_padrao: filtroPadrao,
            virada_hora: viradaHora,
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase
            .from('progresso_srs_meta')
            .update(metaRow)
            .eq('aluno_id', user.id);

        if (error) throw error;

        revalidatePath('/dashboard/dicionario/srs');
        return {
            success: true,
            demoPayloads: [
                {
                    table: 'progresso_srs_meta',
                    row: metaRow,
                    conflictKeys: ['aluno_id'],
                },
            ] as DemoServerPayload[],
        };
    } catch (err: unknown) {
        const error = err as Error;
        return { error: error.message || 'Erro ao salvar configurações.' };
    }
}

// ==========================================
// FUNÇÕES DE ADMINISTRAÇÃO
// ==========================================

/**
 * Correção manual de Streaks e Hora de Rollover pelo Professor Admin.
 */
export async function adminCorrectSrsStreakAction({
    alunoId,
    streakAtual,
    streakMaxima,
    viradaHora
}: {
    alunoId: string;
    streakAtual: number;
    streakMaxima: number;
    viradaHora: number;
}) {
    try {
        const cookieStore = await cookies();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = createServerComponentClient({ cookies: () => cookieStore as any });

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return { error: 'Não autenticado.' };

        // Verifica privilégio Admin
        const { data: profile } = await supabase.from('alunos').select('is_admin').eq('id', user.id).single();
        if (!profile?.is_admin) {
            return { error: 'Permissão negada. Apenas administradores podem fazer correções.' };
        }

        const metaRow = {
            aluno_id: alunoId,
            streak_atual: streakAtual,
            streak_maxima: streakMaxima,
            virada_hora: viradaHora,
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase
            .from('progresso_srs_meta')
            .upsert(metaRow, { onConflict: 'aluno_id' });

        if (error) throw error;

        return {
            success: true,
            demoPayloads: [
                {
                    table: 'progresso_srs_meta',
                    row: metaRow,
                    conflictKeys: ['aluno_id'],
                },
            ] as DemoServerPayload[],
        };
    } catch (err: unknown) {
        const error = err as Error;
        return { error: error.message || 'Erro ao atualizar streak do aluno.' };
    }
}

/**
 * Insere um registro cosmético de estudo no Heatmap diário para preencher "gaps".
 * Não afeta as notas nem o agendamento do FSRS.
 */
export async function adminAddCosmeticHeatmapDayAction({
    alunoId,
    data
}: {
    alunoId: string;
    data: string; // Formato YYYY-MM-DD
}) {
    try {
        const cookieStore = await cookies();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = createServerComponentClient({ cookies: () => cookieStore as any });

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return { error: 'Não autenticado.' };

        const { data: profile } = await supabase.from('alunos').select('is_admin').eq('id', user.id).single();
        if (!profile?.is_admin) {
            return { error: 'Permissão negada.' };
        }

        const diarioRow = {
            aluno_id: alunoId,
            data: data,
            quantidade: 1,
            tempo_revelacao_segundos: 5,
            tempo_estudo_segundos: 5,
            is_ajuste_adm: true
        };

        // Insere 1 card fake na data especificada com flag is_ajuste_adm
        const { error } = await supabase
            .from('progresso_srs_diario')
            .upsert(diarioRow, { onConflict: 'aluno_id, data' });

        if (error) throw error;

        return {
            success: true,
            demoPayloads: [
                {
                    table: 'progresso_srs_diario',
                    row: diarioRow,
                    conflictKeys: ['aluno_id', 'data'],
                },
            ] as DemoServerPayload[],
        };
    } catch (err: unknown) {
        const error = err as Error;
        return { error: error.message || 'Erro ao criar log de heatmap.' };
    }
}

