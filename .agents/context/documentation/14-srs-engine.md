# 🧠 14. O Motor de Repetição Espaçada (SRS) com FSRS

O portal implementa um motor completo de **Repetição Espaçada (Spaced Repetition System - SRS)** baseado no algoritmo matemático de última geração **FSRS (Free Spaced Repetition Scheduler)** via biblioteca `ts-fsrs`. Ele é integrado com o dicionário pessoal do aluno.

---

### 14.1 O Algoritmo FSRS e Retenção Customizável

O agendamento de revisões é calculado no cliente via `ts-fsrs` utilizando dois modos de retenção:
1. **Modo Padrão (90% de Retenção):** O FSRS opera com `request_retention: 0.90`, buscando um balanço ótimo de fixação de memória.
2. **Modo de Carga Reduzida (80% de Retenção):** Se o aluno marcar a opção *"Diminuir quantidade de cartões futuros"*, o parâmetro é alterado para `0.80`. Isso expande os intervalos entre revisões e reduz a quantidade de tarefas diárias ao custo de uma leve redução de memorização de longo prazo.

Adicionalmente, o motor possui o fator **Jitter (Fuzz)** habilitado (`enable_fuzz: true`). Isso introduz uma leve variação aleatória nos intervalos maiores que 1 dia, prevenindo que blocos de cartas revisados juntos reapareçam exatamente no mesmo dia no futuro.

#### Lógica de FSRS no Cliente (`useSrsSession.ts`):
```typescript
import { FSRS, Card as FsrsCard, Rating, createEmptyCard } from 'ts-fsrs';

const fsrsInstance = new FSRS({
    request_retention: retencaoReduzida ? 0.80 : 0.90,
    enable_fuzz: true,
});

// Executa repetição / classificação
const schedulingCards = fsrsInstance.repeat(baseCard, new Date());
const updatedCard = schedulingCards[rating].card; // Retorna o cartão atualizado com due, stability, difficulty, reps, state, etc.
```

Os botões de classificação ("Errei", "Difícil", "Bom", "Fácil") exibem os intervalos de agendamento preventivos correspondentes (ex: `1m`, `10m`, `4d`, `15d`) gerados a partir do `fsrsInstance.repeat` e formatados pela função helper `formatSrsInterval` no cliente.

#### Lógica de Fila de Cartões de Aprendizagem e Revisão:
Para alinhar o comportamento com os padrões do Anki, o carregamento de cartões no dashboard e o início da sessão aplicam regras estritas de agendamento baseadas no tipo de cartão:
1. **Regra para Revisão de Longo Prazo (Review - estado `2`)**: Cartões graduados em revisão não utilizam comparação de hora exata. Eles ficam disponíveis a partir do início do dia letivo de vencimento. O vencimento é atingido quando o dia local ajustado do cartão é menor ou igual ao dia atual ajustado (`getAdjustedLocalDayStr(new Date(due)) <= todayStr`), que leva em conta a hora configurada para a virada do dia (`virada_hora`). Isso garante que os cartões de revisão fiquem disponíveis logo cedo pela manhã.
2. **Janela de Fila de Aprendizagem (Learning/Relearning - estados `1` ou `3`)**: Cartas em aprendizado de curto prazo mantêm a comparação baseada em timestamps precisos de minutos, tornando-se devidas quando o vencimento em época satisfaz `dueMs <= Date.now() + 10 minutos`.
3. **Ordenação Cronológica**: Os cartões em aprendizado são ordenados de forma crescente por data de vencimento (`due` menor primeiro) para priorizar repetições de curto prazo pendentes.

#### Lógica de Custom Study (Estudo Extra):
Se o estudante estiver em dia com a meta diária e houver palavras novas disponíveis no deck, ele pode iniciar uma sessão extra sob demanda focada em aprender **+10 novas palavras** adicionais, ignorando temporariamente o limite de novas cartas diárias configurado.

---

### 14.2 Métricas de Tempo Separadas (Recall vs Absorção)

A medição de tempo de estudo do aluno é segmentada em duas fases para prover métricas pedagógicas limpas e detalhadas:
1. **Tempo de Recall (`tempo_revelacao_segundos`):** O tempo acumulado gasto pelo aluno tentando lembrar o ideograma ou frase *antes* de clicar em *"Revelar Resposta"*.
2. **Tempo de Absorção (`tempo_estudo_segundos`):** O tempo acumulado gasto pelo aluno lendo as notas gramaticais, curiosidades, frases de exemplo e ouvindo a pronúncia *depois* de revelar a resposta e antes de escolher a nota (1-4).

Para prevenir dados poluídos por inatividade (por exemplo, se o aluno deixar a aba aberta e se ausentar), o tempo de recall e absorção são **limitados (cappados) a no máximo 60 segundos por cartão**, tanto no frontend (cronômetro do hook) quanto com validação de segurança no servidor (Server Action).
Adicionalmente, os cronômetros do frontend pausam automaticamente caso o aluno mude de aba no navegador (ouvindo o evento `visibilitychange`).

---

### 14.3 Sincronização Incremental Resiliente (Delta Sync + LocalStorage)

Para prevenir qualquer perda de progresso decorrente de fechamento acidental da aba, quedas de rede ou encerramento abrupto, o portal implementa uma estratégia de sincronização de duas camadas otimizada para o Supabase Free Tier:

- **Cache de Contingência Local (`localStorage`):** Cada avaliação de cartão salva imediatamente o estado completo do deck (`activeDeck`), o índice atual (`currentIndex`), os tempos acumulados e o vetor de deltas modificados no `localStorage` sob a chave `srs_backup_session`. Caso o usuário feche a aba, a sessão é restaurada no exato cartão em que parou no próximo login.
- **Sincronização Delta em Lotes (Batch Sync):** O progresso não é enviado a cada cartão avaliado para poupar requisições de gravação. Em vez disso, o frontend acumula os deltas e executa a Server Action `syncSrsSessionAction` em lotes a cada **5 avaliações**, na minimização da página (`visibilitychange`), no fechamento da aba (`beforeunload`) e ao concluir explicitamente a sessão.
- **Sincronização Imediata ao Restaurar**: Sempre que o portal inicializa e restaura uma sessão incompleta do `localStorage`, caso haja deltas ou contagens pendentes, o frontend dispara uma sincronização em background assíncrona imediata para persistir esses registros no banco de dados.
- **Sincronização ao Sair (Exit Sync):** Se o estudante interromper os estudos clicando em "Sair" ou fechando pela barra lateral, a aplicação orquestra `handleExitSession` que bloqueia e aguarda a sincronização dos deltas pendentes no banco antes de retornar, evitando perdas de progresso em sessões incompletas.
- **Sincronização entre Telas e Invalidação de Cache:** Para garantir atualização imediata entre o dashboard do aluno, o dicionário e a área de flashcards, as consultas do TanStack Query (`srs-deck`, `srs-meta`, `srs-diario`) operam com `staleTime` de 10 segundos. Adicionalmente, tanto a conclusão da sessão (`onFinished`) quanto o encerramento manual (`onClose`) disparam a invalidação imediata do cache do cliente para recarregar as estatísticas e as metas do dia.
- **Deduplicação e Limitação de Tempo no Heatmap**: A sincronização envia apenas os acumulados desde a última sincronização bem-sucedida. O servidor valida e limita os tempos recebidos a no máximo `sessionCount * 60` segundos, mantendo a integridade do Heatmap contra inatividade do usuário ou anomalias.
- **Histórico no PostHog:** O histórico individual detalhado das transições do FSRS e tempos é enviado ao barramento do PostHog via evento `srs_card_rated`, economizando milhões de linhas de log no Supabase.

---

### 14.4 Arquitetura Modular do Componente de Sessão

O motor visual da sessão de estudos foi dividido de um arquivo único de 1062 linhas para uma estrutura limpa e sustentável localizada em `/app/dashboard/dicionario/srs/components/session/`:

1. **`srsHelpers.tsx`**: Contém tipagens compartilhadas e funções de manipulação de string e pinyin colorido (`stripHtml`, `renderPinyinComCores`, `parseAnkiExamples`, `cleanHtmlText`, `dictLinks`).
2. **`useSrsSession.ts`**: Hook customizado que gerencia a máquina de estados do FSRS, os acumuladores de tempo de recall e absorção, players de áudio e as rotinas de sincronização local e remota.
3. **`SrsCardViewer.tsx`**: Renders visuais do cartão de estudo (frente/verso, ideograma, pinyin colorido e frases de exemplo Anki).
4. **`SrsSidebar.tsx`**: Drawer lateral com preferências de exibição de Hanzi e links rápidos para dicionários externos.
5. **`SrsInfoModal.tsx`**: Modal explicativo com notas gramaticais e curiosidades sobre o caractere estudado.
6. **`SrsFooterButtons.tsx`**: Teclado virtual/físico de notas (1 a 4) e instrução de controle.
7. **`SrsFinishedScreen.tsx`**: Painel final de estatísticas de estudo da sessão.
8. **`SrsSession.tsx`**: Orquestrador central que consome o hook e acopla a árvore visual de componentes de forma declarativa.

---

### 14.5 Lógica de Rollover de Horário da Ofensiva (Streak)

A fim de respeitar fusos horários e hábitos noturnos de estudo, o dia letivo é deslocado pelo parâmetro `virada_hora` (Default `1` para 01:00 AM) usando o fuso `America/Sao_Paulo`.

```typescript
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
    
    const localDate = new Date(year, month, day, hour, minute, second);
    localDate.setHours(localDate.getHours() - rolloverHour);
    
    const yyyy = localDate.getFullYear();
    const mm = String(localDate.getMonth() + 1).padStart(2, '0');
    const dd = String(localDate.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}
```

Isso garante que um aluno estudando às 00:30 do dia 15 tenha seu registro contabilizado para o dia 14 no Heatmap e na streak, prevenindo quebras injustas de sequência.

Adicionalmente, o frontend calcula o streak dinamicamente usando `srsMeta.ultima_revisao` e `virada_hora`. Se o fuso local ajustado indicar que o estudante não revisou no dia de ontem (ou hoje), o painel exibirá dinamicamente "Estude hoje!" ou `0` dias de streak, ao invés de exibir o número antigo persistido no banco até que ocorra uma nova revisão.

---

### 14.6 Recursos Administrativos

No painel administrativo `/admin/alunos/editar/[id]`, o professor pode gerenciar o SRS:
1. **Edição de Streak:** Correção manual de `streak_atual`, `streak_maxima` e `virada_hora` do aluno.
2. **Logs Cosméticos no Heatmap:** Injeção manual de 1 log falso com a flag `is_ajuste_adm = true` para preencher dias faltantes no heatmap do estudante sem adulterar os dados estatísticos ou os cálculos matemáticos do FSRS.

---

### 14.7 Reprodução de Áudio e Integração com Anki

A reprodução de áudio durante as sessões de flashcards é executada de forma nativa e integrada:
1. **Fluxo de Reprodução (`SrsSession.tsx`)**:
   - O player busca a coluna `som` do dicionário, extraindo o nome do arquivo a partir de padrões como `[sound:exemplo.mp3]`.
   - Constrói a URL pública no Supabase Storage: `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/dicionario/sons/{filename}`.
   - Executa a reprodução com a API `Audio` do HTML5.
   - Em caso de falha de download ou reprodução, aciona um fallback automático para a API de síntese de voz local (`speechSynthesis` com idioma `zh-CN` e velocidade ajustada).

2. **Compatibilidade com Decks Anki Desktop/Mobile**:
   - Os arquivos de áudio armazenados no bucket público `dicionario/sons` seguem a convenção `[sound:arquivo.mp3]`, permitindo interoperabilidade direta com templates HTML5 do Anki:
     ```html
     <audio id="srs-player" src="/storage/v1/object/public/dicionario/sons/{{som}}" autoplay></audio>
     ```

---

### 14.8 Interface Glassmorphism & Modo Performance (Modo Desempenho)

O Motor de Flashcards combina estética Glassmorphism com um **Modo Performance** otimizado para dispositivos móveis e hardware modesto:

1. **Design de Fundo & Cartões**:
   - **Plano de Fundo**: O container possui a classe `.card` com a textura (`/_Lotus-1.webp`) aplicada no pseudo-elemento `.card::before` com posição fixada e `will-change: transform`.
   - **Estilo Glassmorphism**: Utiliza variáveis CSS dedicadas (`--glass-bg: rgba(30, 30, 30, 0.4)`, `--glass-border: rgba(255, 255, 255, 0.08)`, `--glass-shadow: rgba(0, 0, 0, 0.4)` e `--card-radius: 20px`).
   - **Cartão do Caractere**: Usa `.cartaodecima1` (com animação de entrada `@keyframes fadeInScale` de 0.9 segundos) e `.cartaodecima2` (estático, usado caso o Tradicional e o Simplificado estejam visíveis simultaneamente). A tipografia chinesa utiliza a classe `.char-card` com fonte `"notoserifsc"`, tamanho `2.7em` e text-shadow de `0 4px 15px rgba(0, 0, 0, 0.3)`.
   - **Cartões de Resposta**: Os blocos de Pinyin, Tradução e Frases de Exemplo utilizam a classe `.cartaodebaixo` com a mesma animação e estilos translúcidos.

2. **Cores de Tons Dinâmicos (Pinyin)**:
   - A coloração tonal de cada sílaba é obtida via biblioteca `pinyin-pro` (`getNumOfTone`) e mapeada diretamente para as classes de estilo exatas do Anki:
     - Tom 1 (`.tone1`): Cor `#ff5252` e text-shadow `0 2px 10px rgba(255, 82, 82, 0.4)`
     - Tom 2 (`.tone2`): Cor `#ffd740` e text-shadow `0 2px 10px rgba(255, 215, 64, 0.4)`
     - Tom 3 (`.tone3`): Cor `#69f0ae` e text-shadow `0 2px 10px rgba(105, 240, 174, 0.4)`
     - Tom 4 (`.tone4`): Cor `#40c4ff` e text-shadow `0 2px 10px rgba(64, 196, 255, 0.4)`
     - Tom 0 (`.tone5`): Cor `#e0e0e0` e text-shadow `0 2px 10px rgba(224, 224, 224, 0.4)`

3. **Modo Performance Extremo (`.light-mode-active`)**:
   - Ativado pelo botão flutuante `#lightModeBtn` (canto superior direito com a classe `.floating-light-btn` e ícone do Lucide `Zap`/`ZapOff`), salvando o estado no `localStorage` como `srs_performance_mode`.
   - Adiciona a classe `.light-mode-active` ao container do SRS, desativando via CSS todos os filtros de desfoque (`backdrop-filter: none !important`), sombras (`box-shadow: none !important`, `text-shadow: none !important`), transições (`transition: none !important`) e animações (`animation: none !important`).
   - Substitui a imagem Lotus de fundo por um fundo preto sólido (`#000000`/`#1f1f1f`) e muda os cartões e botões para fundos pretos simples com bordas sólidas escuras (`#333333`).

4. **Sidebar & Switches Apple-Style**:
   - Controlada pelo botão `.floating-menu-btn` (canto superior esquerdo) com animação spring do `framer-motion` (fecha arrastando para a esquerda).
   - O controle de exibição de campos utiliza a classe de switch iOS nativa `.apple-switch`.
   - Organizada em blocos com as classes `.menu-label`, `.menu-block` e `.menu-item` com suporte a feedback de toque `.tappable` (active scale `0.96`).
   - Inclui a opção "Sair da Sessão" para fechar a tela com segurança.

5. **Bottom Sheet iOS-style (Explicações)**:
   - Utiliza as classes `.custom-modal` e `.custom-modal-content` com o header `.modal-header-apple`, handle de arraste `.modal-drag-handle`, botão de fechar `.close-btn` e corpo `.modal-scroll-body` (com scrollbar customizada e fina para não poluir visualmente).
   - Conteúdos exibidos dentro de blocos `.info-block` com títulos `h3` alinhados e textos `.info-text`, divididos por `.modal-separator`.
   - As frases de exemplo no padrão Anki utilizam a classe `.frases-text` para renderização fiel do texto.

---

### 14.9 Exibição de Métricas FSRS Integradas no Dicionário & Dashboard

Para motivar os estudos de forma transparente e científica, a aplicação integra os metadados do FSRS no frontend de forma condicional e não intrusiva:
1. **Integração no Dicionário Principal (`dicionario/page.tsx`)**:
   - Caso o SRS esteja ativado (`srs_habilitado = true`), cada vocábulo estudado exibe um pequeno badge contendo a **Estabilidade** de memória calculada pelo FSRS e o total de revisões realizadas.
   - O indicador visual varia de cor de acordo com o estado do FSRS (Azul para Novo/Unseen, Laranja para Aprendizado, Verde para Revisão de Longo Prazo, Vermelho para Reaprendizado).
   - Se o usuário desativar o SRS ou parar de utilizar, as estatísticas e o filtro extra são **totalmente ocultados**, preservando o uso do Dicionário clássico e limpo.
2. **Estatísticas Consolidadas & Heatmap (`SrsHeatmap.tsx`)**:
   - O Heatmap exibe a frequência de revisões diárias e permite navegar interativamente entre anos calendário através de botões direcionais (`ChevronLeft`/`ChevronRight`).
   - O tooltip diário do Heatmap é calculado utilizando coordenadas do container externo, eliminando bugs de corte (`overflow clipping`) causados por scroll horizontal em telas menores.
   - O grid de estatísticas consolidadas que ficava no topo do Heatmap foi removido do componente para manter a visualização principal do SRS limpa e minimalista.
3. **Barra de Distribuição e Meta Diária no Dashboard**:
   - Exibe a composição exata do deck diário ativo através de uma barra de progresso empilhada colorida (Novos, Aprendizado, Revisões Devidas).
   - O contador de pendências no dashboard e na tela principal do SRS calcula de forma unificada o **total de cartões do dia** (Reviews + Aprendizados devidos + Novas cartas dentro do limite), apresentando "X cartões para hoje" em vez de apenas revisões de longo prazo pendentes.
   - Caso o deck diário esteja completamente concluído, o painel exibe uma mensagem comemorativa em mandarim (com instruções claras para o estudante aguardar o próximo dia ou assistir a mais vídeo-aulas para liberar novos termos) e calcula dinamicamente um cronômetro com o tempo em que a próxima revisão estará vencida.
   - O dropdown de filtros ('Frases e palavras') é inteligente: detecta a disponibilidade individual de termos por tipo (Palavras vs Frases) de forma dinâmica para desabilitar opções vazias (`(vazio)`), e redefine automaticamente o filtro para `Ambos` caso a seleção ativa fique vazia e seja desabilitada.
   - Adicionalmente, uma linha de resumo dinâmico e discreta (ex: "Hoje: X cartões estudados em Y tempo (Z s/cartão)") é exibida diretamente no banner de estudos diários assim que o aluno realiza suas revisões no dia.
4. **Pausar o Uso do FSRS (Opt-Out)**:
   - No painel de configurações da área de flashcards, o aluno pode clicar em *"Pausar uso do SRS"*, o que aciona a Server Action `toggleSrsOptInAction(false)`. Isso altera `srs_habilitado` para `false` no banco de dados e limpa a visualização, ocultando completamente o widget de streak e flashcards do `/dashboard` e redirecionando o estudante para a tela principal.
5. **Modal Popup de Estatísticas & Análise de Memória**:
   - A visualização principal do SRS foi simplificada removendo a seção estática "Estatísticas de Estudo". Todas as métricas detalhadas (Ofensiva Atual, Recorde de Ofensiva, Total Revisado, Tempo de Foco acumulado e Termos Aprendidos), juntamente com a análise científica FSRS (Estabilidade Média, Dificuldade Média e Distribuição de Cartões), estão unificadas em um único modal popup animado (`isMemoryAnalysisOpen`), acessível através de um botão elegante com ícone de Cérebro (`Brain`) integrado no cabeçalho da página (SetNavbar), reduzindo a carga cognitiva inicial.
6. **Estado Vazio (CTA de Aulas)**:
    - Se o estudante acessar a área de flashcards sem ter nenhuma palavra liberada no dicionário (`srsDeck.length === 0`), a tela de estudos tradicional ("Sessão Diária") é substituída por um card de incentivo especial contendo um botão que redireciona o aluno de volta à lista de vídeo-aulas no `/dashboard`.
7. **Resiliência e Proteção contra Concorrência**:
    - **Validação de Backup**: O backup restaurado do `localStorage` passa por validação de esquema estrita; caso os dados estejam em formatos antigos de testes ou corrompidos, a sessão é descartada e limpa automaticamente.
    - **Sanitização de Cards do Banco**: Termos vindos do banco de dados com dados de cartões incompletos ou corrompidos são higienizados e tratados como cartões novos, evitando quebras no motor de agendamento FSRS.
    - **Segregação de Chaves TanStack Query**: Para prevenir poluição de cache em navegação client-side, consultas agregadas (ex: contagem de pendências no `/dashboard` via `['srs-dashboard-summary', userId]`) utilizam queryKeys estritamente distintas do deck completo do SRS (`['srs-deck', userId]`).
    - **Proteção contra Falhas de Áudio/TTS e Dicionários**: Funções de síntese de voz (TTS) e geração de links de dicionários externos validam estritamente a presença do ideograma (`hanzi_simp`), impedindo que valores vazios executem reproduções incorretas ou gerem parâmetros `undefined`.
