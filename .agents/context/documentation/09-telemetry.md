# 📈 9. O Barramento de Telemetria (PostHog & HogQL APIs)

La telemetria integrada permite coletar dados comportamentais sem invadir a privacidade do estudante ou causar lentidão na interface.

### 9.1 Proxy Reverso Antibloqueio (`next.config.ts`)

Muitos navegadores com foco em privacidade ou extensões de AdBlocker bloqueiam requisições diretas feitas para serviços externos de telemetria como o domínio `posthog.com`. Para solucionar isso de forma definitiva, o portal Next.js implementa regras de proxy reverso nos **Rewrites** de servidor:

*   Chamadas destinadas à ingestão de dados `/ingest/*` são redirecionadas internamente para `https://us.i.posthog.com/*`.
*   Requisições de mídias de suporte `/ingest/static/*` são direcionadas em backend para `https://us-assets.i.posthog.com/static/*`.

Os eventos coletados na interface do estudante são enviados de volta para a própria URL de domínio do portal, mascarando a coleta de AdBlockers e garantindo uma ingestão consistente de dados comportamentais.

---

### 9.2 API Route Handler de Telemetria Pedagógica (`app/api/admin/activity-log/route.ts`)

O painel de monitoramento do professor exibe estatísticas em tempo real coletadas do PostHog de forma automatizada por meio de requisições de backend que consultam dados analíticos via consultas **HogQL (Hog Query Language)**:

#### 1. Estatísticas Rápidas do Dia (`GET /api/admin/activity-log?type=today`)
Executa uma query HogQL escalar que consolida o engajamento diário de usuários ativos únicos, desconsiderando as credenciais administrativas do professor, incluindo cartões de SRS revisados e aulas/tarefas estudadas hoje:
```sql
SELECT 
    (SELECT count(distinct person_id) FROM events WHERE toDate(toTimeZone(timestamp, 'America/Sao_Paulo')) = toDate(toTimeZone(now(), 'America/Sao_Paulo')) AND person.properties.role != 'admin' AND properties.$session_id IS NOT NULL AND (person.properties.nome IS NOT NULL OR person.properties.name IS NOT NULL)) as students_today,
    (SELECT avg(session_duration) FROM (SELECT dateDiff('minute', min(timestamp), max(timestamp)) as session_duration FROM events WHERE toDate(toTimeZone(timestamp, 'America/Sao_Paulo')) = toDate(toTimeZone(now(), 'America/Sao_Paulo')) AND person.properties.role != 'admin' AND properties.$session_id IS NOT NULL GROUP BY person_id, properties.$session_id)) as avg_duration,
    (SELECT sum(session_duration) FROM (SELECT dateDiff('minute', min(timestamp), max(timestamp)) as session_duration FROM events WHERE toDate(toTimeZone(timestamp, 'America/Sao_Paulo')) = toDate(toTimeZone(now(), 'America/Sao_Paulo')) AND person.properties.role != 'admin' AND properties.$session_id IS NOT NULL GROUP BY person_id, properties.$session_id)) as total_duration,
    (SELECT count() FROM events WHERE toDate(toTimeZone(timestamp, 'America/Sao_Paulo')) = toDate(toTimeZone(now(), 'America/Sao_Paulo')) AND person.properties.role != 'admin' AND event = 'srs_card_rated') as srs_cards_today,
    (SELECT count() FROM events WHERE toDate(toTimeZone(timestamp, 'America/Sao_Paulo')) = toDate(toTimeZone(now(), 'America/Sao_Paulo')) AND person.properties.role != 'admin' AND event IN ('lesson_completed', 'lesson_watched_toggled')) as lessons_today
```

#### 2. Rastreamento de Sessões de Estudo (`GET /api/admin/activity-log?type=sessions`)
Retorna as últimas sessões identificadas de alunos cadastrados e calcula sua duração exata em minutos com base na diferença entre o primeiro e o último evento da sessão (`dateDiff`).

#### 3. Algoritmo de Compactação Contígua de Logs (`GET /api/admin/activity-log?type=events`)
Para contornar limitações da API REST padrão de eventos do PostHog (que retorna perfis de pessoas vazios/nulls por padrão), os logs de atividade são consultados diretamente via **HogQL** integrando os dados de pessoas (`person.properties.nome`, `person.properties.email`, etc.) no ClickHouse.

O backend então implementa um **Algoritmo de Colapso Contíguo** linear e **Agrupamento de SRS**:
1.  **Agrupamento de SRS:** Todos os eventos consecutivos de SRS (`srs_card_revealed`, `srs_card_rated`, `srs_session_ended`, etc.) de um mesmo usuário em um intervalo de 15 minutos são colapsados em uma única ação: `"Revisou X cartões no SRS"` (ou `"Estudou no SRS"` caso não haja avaliação registrada).
2.  **Iteração Sequencial:** Varre o vetor de logs de eventos do PostHog.
3.  **Agrupamento por Igualdade:** Compara a ação atual com a imediatamente anterior. Se o mesmo estudante realizar a mesma ação sequencialmente, o log não é impresso de forma duplicada; em vez disso, incrementa-se um contador local (`count`).
4.  **Injeção de Sufixo Dinâmico:** Os registros idênticos repetidos consecutivamente são colapsados em um único item e recebem uma identificação visual multiplicadora (Ex: `"Acessou o Dicionário (5×)"`), mantendo a linha do tempo do professor limpa e compreensível.

#### 4. Filtragem e Agrupamento no Client-side (`app/admin/components/ActivityLog.tsx`)
Para garantir máximo desempenho e evitar requisições frequentes que pudessem sofrer com lentidão de rede ou limite de cota da API do PostHog, a interface do professor executa filtros instantâneos localmente no navegador:
*   **Busca em Tempo Real:** Permite pesquisar pelo nome ou email do estudante.
*   **Filtros por Período:** Segmenta as ações em Hoje, Ontem, Últimos 7 dias, Últimos 30 dias ou Todo o período (limite de 400 registros).
*   **Pílulas de Ação (Action Pills):** Filtra os eventos por categoria (SRS, Aulas, Diálogos, Dicionário, Acessos).
*   **Modo Agrupado por Aluno:** Consolida as ações de cada aluno em cards dedicados. Cada card calcula automaticamente um selo de **Foco de Comportamento** do estudante com base em suas atividades frequentes no período (Ex: `"SRS Focado"`, `"Pesquisador"`, `"Estudioso"`). A linha do tempo individual de cada aluno pode ser expandida de forma interativa.
