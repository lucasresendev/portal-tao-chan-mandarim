import { NextResponse } from 'next/server';

const POSTHOG_HOST = 'https://us.posthog.com';

// Dicionário de tradução de eventos customizados
const EVENT_TRANSLATIONS: Record<string, { description: string; actionType: string }> = {
    user_logged_in:               { description: 'Entrou no sistema',                  actionType: 'login' },
    user_logged_out:              { description: 'Saiu do sistema',                    actionType: 'logout' },
    user_logged_out_sidebar:      { description: 'Saiu do sistema (barra lateral)',    actionType: 'logout' },
    'login failed':               { description: 'Falha ao entrar no sistema',         actionType: 'alerta' },
    login_failed:                 { description: 'Falha ao entrar no sistema',         actionType: 'alerta' },
    simulator_clicked:            { description: 'Abriu o Simulador',                  actionType: 'dialogo_play' },
    dictionary_clicked:           { description: 'Abriu o Dicionário',                 actionType: 'dicionario' },
    'dictionary modal opened':    { description: 'Abriu modal no Dicionário',          actionType: 'dicionario' },
    dictionary_modal_opened:      { description: 'Abriu modal no Dicionário',          actionType: 'dicionario' },
    dictionary_examples_opened:   { description: 'Expandiu exemplos no Dicionário',    actionType: 'dicionario' },
    admin_dictionary_saved:       { description: 'Salvou termo no Dicionário',         actionType: 'dicionario' },
    lesson_completed:             { description: 'Concluiu uma lição',                 actionType: 'aula_update' },
    lesson_watched:               { description: 'Assistiu uma aula',                  actionType: 'aula_update' },
    lesson_watched_toggled:       { description: 'Marcou aula como assistida',         actionType: 'aula_update' },
    'lesson watched toggled':     { description: 'Marcou aula como assistida',         actionType: 'aula_update' },
    lesson_task_toggled:          { description: 'Marcou tarefa da aula',              actionType: 'aula_update' },
    'lesson task toggled':        { description: 'Marcou tarefa da aula',              actionType: 'aula_update' },
    lesson_opened:                { description: 'Abriu uma aula',                     actionType: 'aula_update' },
    'lesson opened':              { description: 'Abriu uma aula',                     actionType: 'aula_update' },
    admin_lesson_created:         { description: 'Criou uma nova aula',                actionType: 'aula_update' },
    admin_lesson_updated:         { description: 'Atualizou uma aula',                 actionType: 'aula_update' },
    live_class_clicked:           { description: 'Clicou em Aula ao Vivo',             actionType: 'aula_update' },
    'live class clicked':         { description: 'Clicou em Aula ao Vivo',             actionType: 'aula_update' },
    study_center_clicked:         { description: 'Acessou o Centro de Estudos',        actionType: 'aula_update' },
    'study center clicked':       { description: 'Acessou o Centro de Estudos',        actionType: 'aula_update' },
    'biblioteca clicked':         { description: 'Acessou a Biblioteca',               actionType: 'custom' },
    biblioteca_clicked:           { description: 'Acessou a Biblioteca',               actionType: 'custom' },
    'blog clicked':               { description: 'Acessou a Biblioteca',               actionType: 'custom' },
    blog_clicked:                 { description: 'Acessou a Biblioteca',               actionType: 'custom' },
    'srs clicked':                { description: 'Acessou o SRS',                      actionType: 'srs' },
    srs_clicked:                  { description: 'Acessou o SRS',                      actionType: 'srs' },
    srs_widget_clicked:           { description: 'Abriu o widget do SRS',              actionType: 'srs' },
    srs_session_start_clicked:    { description: 'Iniciou sessão no SRS',              actionType: 'srs' },
    srs_card_revealed:            { description: 'Revelou cartão no SRS',              actionType: 'srs' },
    srs_card_rated:               { description: 'Avaliou cartão no SRS',              actionType: 'srs' },
    'srs optin completed':        { description: 'Completou cadastro no SRS',          actionType: 'srs' },
    srs_optin_completed:          { description: 'Completou cadastro no SRS',          actionType: 'srs' },
    'srs optin attempted':        { description: 'Tentou se cadastrar no SRS',          actionType: 'srs' },
    srs_optin_attempted:          { description: 'Tentou se cadastrar no SRS',          actionType: 'srs' },
    sidebar_external_link_clicked:{ description: 'Acessou link externo no menu',      actionType: 'custom' },
    'profile updated':            { description: 'Atualizou o perfil',                 actionType: 'custom' },
    profile_updated:              { description: 'Atualizou o perfil',                 actionType: 'custom' },
    admin_student_enrolled:       { description: 'Matriculado(a) na plataforma',       actionType: 'aluno_novo' },
    admin_dialog_created:         { description: 'Criou um novo diálogo',              actionType: 'custom' },
};

// Eventos que devem ser completamente ignorados (agora filtrados no HogQL)

// Função para buscar o ID do Projeto (cacheado por 1h no servidor)
async function getProjectId(apiKey: string) {
    const res = await fetch(`${POSTHOG_HOST}/api/projects/`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
        next: { revalidate: 3600 }
    });
    if (!res.ok) throw new Error(`Falha ao buscar projetos: ${res.statusText}`);
    const data = await res.json();
    if (!data.results?.length) throw new Error('Nenhum projeto encontrado no PostHog.');
    return data.results[0].id;
}

// Verifica se o distinct_id é um UUID anônimo (não identificado)
function isAnonymousId(id: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)
        && !id.includes('@');
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'events';
        // Para sessions, usamos o limit da query; para events, ignoramos e buscamos lote fixo
        const sessionLimit = parseInt(searchParams.get('limit') || '6', 10);

        const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
        const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false' || !apiKey;

        if (isDemo) {
            const nowMs = Date.now();
            const fmtTime = (msAgo: number) =>
                new Date(nowMs - msAgo).toLocaleString('pt-BR', {
                    timeZone: 'America/Sao_Paulo',
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                });

            if (type === 'today') {
                return NextResponse.json({
                    studentsToday: 5,
                    avgMinutes: 28,
                    totalMinutes: 140,
                    srsCardsToday: 92,
                    lessonsToday: 6,
                });
            }

            if (type === 'sessions') {
                const demoSessions = [
                    { id: 'session-0', studentName: 'Maria Fernanda', isKnown: true, time: fmtTime(12 * 60000), durationMinutes: 34 },
                    { id: 'session-1', studentName: 'Pedro Henrique', isKnown: true, time: fmtTime(45 * 60000), durationMinutes: 29 },
                    { id: 'session-2', studentName: 'Ana Beatriz', isKnown: true, time: fmtTime(95 * 60000), durationMinutes: 26 },
                    { id: 'session-3', studentName: 'Lucas Oliveira', isKnown: true, time: fmtTime(180 * 60000), durationMinutes: 22 },
                    { id: 'session-4', studentName: 'Camila Santos', isKnown: true, time: fmtTime(240 * 60000), durationMinutes: 31 },
                    { id: 'session-5', studentName: 'Maria Fernanda', isKnown: true, time: fmtTime(680 * 60000), durationMinutes: 25 },
                    { id: 'session-6', studentName: 'Ana Beatriz', isKnown: true, time: fmtTime(1320 * 60000), durationMinutes: 38 },
                    { id: 'session-7', studentName: 'Pedro Henrique', isKnown: true, time: fmtTime(1500 * 60000), durationMinutes: 21 },
                    { id: 'session-8', studentName: 'Camila Santos', isKnown: true, time: fmtTime(2100 * 60000), durationMinutes: 27 },
                    { id: 'session-9', studentName: 'Lucas Oliveira', isKnown: true, time: fmtTime(2800 * 60000), durationMinutes: 19 },
                    { id: 'session-10', studentName: 'Maria Fernanda', isKnown: true, time: fmtTime(3100 * 60000), durationMinutes: 41 },
                    { id: 'session-11', studentName: 'Ana Beatriz', isKnown: true, time: fmtTime(4200 * 60000), durationMinutes: 30 },
                    { id: 'session-12', studentName: 'Pedro Henrique', isKnown: true, time: fmtTime(4800 * 60000), durationMinutes: 24 },
                    { id: 'session-13', studentName: 'Camila Santos', isKnown: true, time: fmtTime(5400 * 60000), durationMinutes: 33 },
                    { id: 'session-14', studentName: 'Maria Fernanda', isKnown: true, time: fmtTime(6200 * 60000), durationMinutes: 28 },
                    { id: 'session-15', studentName: 'Rafael Mendes', isKnown: true, time: fmtTime(7800 * 60000), durationMinutes: 18 },
                ].slice(0, sessionLimit);
                return NextResponse.json(demoSessions);
            }

            const demoEvents = [
                { id: 'ev-1', studentName: 'Maria Fernanda', actionType: 'srs', description: 'Revisou 24 cartões no SRS', time: fmtTime(8 * 60000), timestamp: nowMs - 8 * 60000, count: 1 },
                { id: 'ev-2', studentName: 'Maria Fernanda', actionType: 'dialogo_play', description: 'Jogou "Apresentações e Nacionalidades" no Simulador', time: fmtTime(19 * 60000), timestamp: nowMs - 19 * 60000, count: 1 },
                { id: 'ev-3', studentName: 'Maria Fernanda', actionType: 'aula_update', description: 'Concluiu uma lição', time: fmtTime(28 * 60000), timestamp: nowMs - 28 * 60000, count: 1 },
                { id: 'ev-4', studentName: 'Pedro Henrique', actionType: 'custom', description: 'Entregou avaliação na aba Provas & Atividades', time: fmtTime(42 * 60000), timestamp: nowMs - 42 * 60000, count: 1 },
                { id: 'ev-5', studentName: 'Pedro Henrique', actionType: 'srs', description: 'Revisou 18 cartões no SRS', time: fmtTime(52 * 60000), timestamp: nowMs - 52 * 60000, count: 1 },
                { id: 'ev-6', studentName: 'Ana Beatriz', actionType: 'srs', description: 'Revisou 30 cartões no SRS', time: fmtTime(88 * 60000), timestamp: nowMs - 88 * 60000, count: 1 },
                { id: 'ev-7', studentName: 'Ana Beatriz', actionType: 'dicionario', description: 'Expandiu exemplos no Dicionário (4×)', time: fmtTime(98 * 60000), timestamp: nowMs - 98 * 60000, count: 4 },
                { id: 'ev-8', studentName: 'Lucas Oliveira', actionType: 'dialogo_play', description: 'Abriu o Simulador (2×)', time: fmtTime(175 * 60000), timestamp: nowMs - 175 * 60000, count: 2 },
                { id: 'ev-9', studentName: 'Lucas Oliveira', actionType: 'aula_update', description: 'Marcou aula como assistida', time: fmtTime(190 * 60000), timestamp: nowMs - 190 * 60000, count: 1 },
                { id: 'ev-10', studentName: 'Camila Santos', actionType: 'srs', description: 'Revisou 20 cartões no SRS', time: fmtTime(235 * 60000), timestamp: nowMs - 235 * 60000, count: 1 },
                { id: 'ev-11', studentName: 'Camila Santos', actionType: 'dicionario', description: 'Expandiu exemplos no Dicionário (3×)', time: fmtTime(248 * 60000), timestamp: nowMs - 248 * 60000, count: 3 },
                { id: 'ev-12', studentName: 'Ana Beatriz', actionType: 'custom', description: 'Entregou avaliação na aba Provas & Atividades', time: fmtTime(1310 * 60000), timestamp: nowMs - 1310 * 60000, count: 1 },
            ];
            return NextResponse.json(demoEvents);
        }

        const projectId = await getProjectId(apiKey);
        const excludedAdminEmail = process.env.ADMIN_EXCLUDED_EMAIL || 'admin@taochan.dev';

        // ============================================================
        // TIPO: SESSIONS (HogQL)
        // ============================================================
        if (type === 'today') {
            const queryPayload = {
                query: {
                    kind: 'HogQLQuery',
                    query: `SELECT 
                        (SELECT count(distinct person_id) FROM events WHERE toDate(toTimeZone(timestamp, 'America/Sao_Paulo')) = toDate(toTimeZone(now(), 'America/Sao_Paulo')) AND person.properties.email != '${excludedAdminEmail}' AND person.properties.role != 'admin' AND properties.$session_id IS NOT NULL AND (person.properties.nome IS NOT NULL OR person.properties.name IS NOT NULL)) as students_today,
                        (SELECT avg(session_duration) FROM (SELECT dateDiff('minute', min(timestamp), max(timestamp)) as session_duration FROM events WHERE toDate(toTimeZone(timestamp, 'America/Sao_Paulo')) = toDate(toTimeZone(now(), 'America/Sao_Paulo')) AND person.properties.email != '${excludedAdminEmail}' AND person.properties.role != 'admin' AND properties.$session_id IS NOT NULL GROUP BY person_id, properties.$session_id)) as avg_duration,
                        (SELECT sum(session_duration) FROM (SELECT dateDiff('minute', min(timestamp), max(timestamp)) as session_duration FROM events WHERE toDate(toTimeZone(timestamp, 'America/Sao_Paulo')) = toDate(toTimeZone(now(), 'America/Sao_Paulo')) AND person.properties.email != '${excludedAdminEmail}' AND person.properties.role != 'admin' AND properties.$session_id IS NOT NULL GROUP BY person_id, properties.$session_id)) as total_duration,
                        (SELECT count() FROM events WHERE toDate(toTimeZone(timestamp, 'America/Sao_Paulo')) = toDate(toTimeZone(now(), 'America/Sao_Paulo')) AND person.properties.email != '${excludedAdminEmail}' AND person.properties.role != 'admin' AND event = 'srs_card_rated') as srs_cards_today,
                        (SELECT count() FROM events WHERE toDate(toTimeZone(timestamp, 'America/Sao_Paulo')) = toDate(toTimeZone(now(), 'America/Sao_Paulo')) AND person.properties.email != '${excludedAdminEmail}' AND person.properties.role != 'admin' AND event IN ('lesson_completed', 'lesson_watched_toggled')) as lessons_today`
                }
            };

            const hogqlRes = await fetch(`${POSTHOG_HOST}/api/projects/${projectId}/query/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(queryPayload),
                cache: 'no-store'
            });

            if (!hogqlRes.ok) {
                const errText = await hogqlRes.text();
                throw new Error(`Falha ao buscar stats do dia: ${hogqlRes.statusText} - ${errText}`);
            }
            const data = await hogqlRes.json();
            const row = data.results?.[0] ?? [0, 0, 0, 0, 0];

            return NextResponse.json({
                studentsToday: row[0] ?? 0,
                avgMinutes: Math.round(row[1] ?? 0),
                totalMinutes: Math.round(row[2] ?? 0),
                srsCardsToday: row[3] ?? 0,
                lessonsToday: row[4] ?? 0,
            });
        }

        if (type === 'sessions') {
            const queryPayload = {
                query: {
                    kind: 'HogQLQuery',
                    query: `SELECT 
                        person.properties.nome, 
                        person.properties.name, 
                        person.properties.email, 
                        min(timestamp) as start_time, 
                        dateDiff('minute', min(timestamp), max(timestamp)) as duration_minutes
                    FROM events 
                    WHERE timestamp > now() - INTERVAL 14 DAY 
                      AND person.properties.email != '${excludedAdminEmail}' 
                      AND person.properties.role != 'admin' 
                      AND properties.$session_id IS NOT NULL
                    GROUP BY properties.$session_id, person.properties.nome, person.properties.name, person.properties.email 
                    ORDER BY max(timestamp) DESC 
                    LIMIT ${sessionLimit}`
                }
            };

            const hogqlRes = await fetch(`${POSTHOG_HOST}/api/projects/${projectId}/query/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(queryPayload),
                cache: 'no-store'
            });

            if (!hogqlRes.ok) {
                const errText = await hogqlRes.text();
                throw new Error(`Falha ao buscar sessões: ${hogqlRes.statusText} - ${errText}`);
            }
            const hogqlData = await hogqlRes.json();

            const sessions = (hogqlData.results || []).map((row: (string | number | null)[], index: number) => {
                const nome   = row[0] as string | null;  // person.properties.nome (nosso campo)
                const name   = row[1] as string | null;  // person.properties.name
                const email  = row[2] as string | null;  // person.properties.email
                const startTime = new Date(row[3] as string);
                const duration  = (row[4] as number) || 0;

                // Consideramos "identificado" quem tem nome real cadastrado
                const isKnown = !!(nome || name);
                const displayName = nome || name || email || null;

                return {
                    id: `session-${index}`,
                    studentName: displayName,
                    isKnown,
                    time: startTime.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
                    durationMinutes: duration
                };
            });

            return NextResponse.json(sessions);
        }

        // ============================================================
        // TIPO: EVENTS — busca via HogQL para fazer join de person e trazer detalhes
        // ============================================================
        const queryPayload = {
            query: {
                kind: 'HogQLQuery',
                query: `SELECT 
                    uuid,
                    event,
                    timestamp,
                    person.properties.nome,
                    person.properties.name,
                    person.properties.email,
                    properties['$current_url'],
                    properties['$pathname'],
                    properties.student_name,
                    distinct_id,
                    properties.titulo
                FROM events
                WHERE timestamp > now() - INTERVAL 60 DAY
                  AND person.properties.email != '${excludedAdminEmail}'
                  AND person.properties.role != 'admin'
                  AND event NOT IN ('$feature_flag_called', '$session_recording_snapshot', '$capture_metrics', '$groupidentify', '$set', '$web_vitals', '$exception', '$autocapture', '$identify', '$pageleave')
                ORDER BY timestamp DESC
                LIMIT 2000`
            }
        };

        const hogqlRes = await fetch(`${POSTHOG_HOST}/api/projects/${projectId}/query/`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(queryPayload),
            cache: 'no-store'
        });

        if (!hogqlRes.ok) {
            const errText = await hogqlRes.text();
            throw new Error(`Falha ao buscar eventos via HogQL: ${hogqlRes.statusText} - ${errText}`);
        }
        const hogqlData = await hogqlRes.json();

        interface ActivityLog {
            id: string;
            studentName: string;
            actionType: string;
            description: string;
            time: string;
            timestamp: number;
            count?: number;
        }

        interface SrsGroup {
            uuid: string;
            studentName: string;
            cardsRated: number;
            startTime: number;
            endTime: number;
            lastTimestamp: number;
        }

        const rawLogs: ActivityLog[] = [];
        const activeSrsGroups = new Map<string, SrsGroup>();

        const isSrsEvent = (event: string) => [
            'srs_widget_clicked', 
            'srs_session_start_clicked', 
            'srs_card_revealed', 
            'srs_card_rated', 
            'srs_session_ended'
        ].includes(event);

        function formatSrsGroup(group: SrsGroup): ActivityLog {
            const cardText = group.cardsRated === 1 ? 'cartão' : 'cartões';
            const desc = group.cardsRated > 0
                ? `Revisou ${group.cardsRated} ${cardText} no SRS`
                : 'Estudou no SRS';
            const dateRef = new Date(group.endTime);
            return {
                id: group.uuid,
                studentName: group.studentName,
                actionType: 'srs',
                description: desc,
                time: dateRef.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
                timestamp: group.endTime,
            };
        }

        // Primeiro passo: Mapear distinct_id/e-mail para o melhor nome de exibição disponível
        const bestNames = new Map<string, string>();
        for (const row of (hogqlData.results || []) as Array<Array<string | number | null>>) {
            const pNome = row[3] as string | null;
            const pName = row[4] as string | null;
            const pEmail = row[5] as string | null;
            const distinctId = row[9] as string;

            const userKey = pEmail || distinctId;
            const displayName = pNome || pName || pEmail || distinctId;

            // Se o displayName não for e-mail e não for ID anônimo, é um nome real
            const isRealName = displayName && !displayName.includes('@') && !isAnonymousId(displayName);

            if (isRealName) {
                bestNames.set(userKey, displayName);
            } else if (!bestNames.has(userKey)) {
                bestNames.set(userKey, displayName);
            }
        }

        for (const row of (hogqlData.results || []) as Array<Array<string | number | null>>) {
            const uuid = row[0] as string;
            const eventName = row[1] as string;
            const timestampStr = row[2] as string;
            const timestamp = new Date(timestampStr).getTime();
            const pNome = row[3] as string | null;
            const pName = row[4] as string | null;
            const pEmail = row[5] as string | null;
            const currentUrl = (row[6] as string) || '';
            const pathname = (row[7] as string) || '';
            const propStudentName = row[8] as string | null;
            const distinctId = row[9] as string;
            const propTitulo = row[10] as string | null;

            const userKey = pEmail || distinctId;
            const studentName = bestNames.get(userKey) || pNome || pName || pEmail || propStudentName || distinctId;

            // Filtro: sessões anônimas (visitantes não identificados)
            if (isAnonymousId(studentName)) continue;

            if (isSrsEvent(eventName)) {
                const isRated = eventName === 'srs_card_rated';
                const existingGroup = activeSrsGroups.get(studentName);
                if (existingGroup && Math.abs(existingGroup.lastTimestamp - timestamp) < 15 * 60 * 1000) {
                    if (isRated) {
                        existingGroup.cardsRated += 1;
                    }
                    existingGroup.lastTimestamp = timestamp; // atualiza timestamp de referência do cursor
                    if (timestamp > existingGroup.endTime) existingGroup.endTime = timestamp;
                    if (timestamp < existingGroup.startTime) existingGroup.startTime = timestamp;
                    continue;
                } else {
                    if (existingGroup) {
                        rawLogs.push(formatSrsGroup(existingGroup));
                    }
                    activeSrsGroups.set(studentName, {
                        uuid,
                        studentName,
                        cardsRated: isRated ? 1 : 0,
                        startTime: timestamp,
                        endTime: timestamp,
                        lastTimestamp: timestamp
                    });
                    continue;
                }
            }

            let actionType = 'other';
            let description = '';

            if (eventName === '$pageview') {
                if (currentUrl.includes('/admin')) continue; // ignora rotas admin
                if (currentUrl.includes('/login'))  continue; // ignora página de login anônima

                if (currentUrl.includes('/dicionario'))      { actionType = 'dicionario';   description = 'Acessou o Dicionário'; }
                else if (currentUrl.includes('/simulador'))  { actionType = 'dialogo_play'; description = 'Acessou o Simulador'; }
                else if (currentUrl.includes('/aulas'))      { actionType = 'aula_update';  description = 'Navegou pelas Aulas'; }
                else if (currentUrl.includes('/dashboard'))  { actionType = 'login';        description = 'Entrou no Portal'; }
                else { actionType = 'login'; description = `Acessou: ${pathname || 'Página'}`; }

            } else if (EVENT_TRANSLATIONS[eventName]) {
                // Evento customizado com tradução conhecida
                const t = EVENT_TRANSLATIONS[eventName];
                actionType = t.actionType;
                description = t.description;
                if (eventName === 'admin_dialog_created' && propTitulo) {
                    description += `: ${propTitulo}`;
                }

            } else if (!eventName.startsWith('$')) {
                // Evento customizado sem tradução — exibe nome legível
                actionType = 'custom';
                description = `Ação: ${eventName.replace(/_/g, ' ')}`;
            } else {
                continue;
            }

            const eventTime = new Date(timestampStr);
            rawLogs.push({
                id: uuid,
                studentName,
                actionType,
                description,
                time: eventTime.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
                timestamp: eventTime.getTime(),
            });
        }

        // Adiciona todos os grupos SRS que ainda estão no mapa
        for (const group of activeSrsGroups.values()) {
            rawLogs.push(formatSrsGroup(group));
        }

        // Ordena tudo decrescentemente por timestamp antes do agrupamento contíguo
        rawLogs.sort((a, b) => b.timestamp - a.timestamp);

        // Agrupamento contíguo (mesmo aluno + mesma ação seguida)
        const grouped: ActivityLog[] = [];
        for (const log of rawLogs) {
            if (grouped.length > 0) {
                const last = grouped[grouped.length - 1];
                if (last.studentName === log.studentName && last.description === log.description) {
                    last.count = (last.count || 1) + 1;
                    continue;
                }
            }
            grouped.push({ ...log, count: 1 });
        }

        // Aplica sufixo de contagem
        const finalLogs = grouped.map((log) => ({
            ...log,
            description: log.count && log.count > 1 ? `${log.description} (${log.count}×)` : log.description
        }));

        // Retorna TUDO — o cliente vai fazer o slice por display limit
        return NextResponse.json(finalLogs);

    } catch (error) {
        console.error('Erro na API PostHog:', error);
        return NextResponse.json({ error: 'Erro interno ao buscar logs.' }, { status: 500 });
    }
}
