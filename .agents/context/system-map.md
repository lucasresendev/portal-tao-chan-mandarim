# System Map & Architecture Guide

> Portal de Mandarim - Mapa de Arquitetura e Convenções Técnicas. Fonte Única da Verdade (Single Source of Truth).

## 1. Technology Stack
```yaml
Runtime/Framework:  Node.js (Next.js 16 App Router, React 19, Strict TypeScript)
Database & BaaS:   Supabase (PostgreSQL 15+, Row Level Security, Storage Buckets)
Styling:           Tailwind CSS v4 CSS-First (@import "tailwindcss"; @theme em globals.css)
State & Caching:   TanStack React Query v5 (Optimistic UI updates) + Next.js unstable_cache
Animations:        Framer Motion v12 (spring physics, layout animations)
Audio Capture:     MediaRecorder API (WebM buffer, hardware microphone cleanup)
Spaced Repetition: ts-fsrs (Free Spaced Repetition Scheduler v4)
DnD Engine:        @dnd-kit/core + @dnd-kit/sortable + DragOverlay
Telemetry:         PostHog (Edge proxy reverso under next.config.ts)
```

## 2. Directory Layout
```
/meu-portal-mandarim/
├── app/                        # Pages & Routes (Next.js App Router)
│   ├── actions/                # Server Actions (auth, admin, user progress)
│   ├── admin/                  # Dashboard do professor (protegido)
│   ├── api/                    # Route handlers (PostHog HogQL logs, webhooks)
│   ├── components/             # Componentes UI reutilizáveis
│   ├── dashboard/              # Dashboard do aluno (atividades, simulador WhatsApp, dicionário)
│   ├── globals.css             # Tailwind v4 @theme design tokens
│   └── providers.tsx           # QueryClient, PostHog, UI Providers
├── lib/                        # Utilitários de infraestrutura (supabase, storagePath, fsrs)
├── types/                      # Declarações TypeScript rigorosas (sem 'any')
├── supabase/                   # Migrações versionadas SQL e esquemas
├── .provas/                    # Provas por unidade (.provas/u{N}/questoes_u{N}.json)
└── .agents/                    # Inteligência e governança do repositório
    ├── context/                # Documentação técnica e fonte única da verdade
    ├── rules/                  # Regras estritas do repositório (GEMINI.md)
    ├── skills/                 # 4 skills de alto valor (exam-crafter, i18n, frontend, backend)
    └── scripts/                # Scripts utilitários de checklist e validação
```

## 3. Storage Buckets (Supabase Storage)
- **`atvdd_laoshi`** (Materiais do professor):
  - Path: `{prefix}/{sanitized_filename}_{timestamp}_{random}.{ext}` (Ex: `q03/audio_123.mp3`)
- **`atvdd_alunos`** (Respostas em áudio dos alunos):
  - Path: `{atividade_slug}/{aluno_slug}/{prefix}_{timestamp}_{random}.{ext}` (Ex: `aula_1/joao/q04_123.webm`)
  - Geração determinística, preservando o prefixo da questão original.

## 4. Hardware Lifecycle & Audio (MediaRecorder)
- **Fechamento Obrigatório de Streams de Áudio:** O uso de `getUserMedia()` ativa o microfone no SO. É **mandatório** encerrar todas as faixas (`tracks`) no término da gravação ou no desmonte (`unmount`) do componente:
  ```typescript
  const stopRecording = (stream: MediaStream | null) => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);
  ```

## 5. Mandarin Exam Pinyin Grading Rules
- **Representação Tonal Aceita:**
  - Acentos diacríticos padrão: `nǐhǎo`, `jǐ`, `shéi`, `sān`, `duōshao`, `liù`.
  - Tons numéricos: `ni3hao3`, `ji3`, `shei2`, `san1`, `liu4` (tom neutro: `0`, `5` ou omitido, ex: `duo1shao`).
  - Aproximações comuns de teclado: `´`, `` ` ``, `^` (ex: `nîhâo`, `jî`, `sán`, `tí`, `liú`).
- **Rejeição Estrita de Pinyin Sem Tom:** NUNCA aceitar pinyin completamente sem tons (ex: `ji`, `shei`, `sanshiba`, `ti`) a menos que a sílaba seja comprovadamente neutra.

## 6. Exam Ordering Questions (@dnd-kit Engine)
- Utiliza `@dnd-kit/core` e `@dnd-kit/sortable` com `DragOverlay`.
- **Desktop (Mouse):** `MouseSensor` com distância de ativação de 4px para início imediato e fluido do arraste.
- **Mobile (Touch):** `TouchSensor` com delay de 220ms e tolerância de 6px, preservando o scroll vertical nativo enquanto viabiliza o arraste intencional por toque longo.
- **Estabilidade de Render:** `onAnswer` disparado apenas no evento `onDragEnd` para prevenir re-renderizações intermediárias desnecessárias.

## 7. Caching & Performance Conventions
- **Client Cache (TanStack Query):**
  - Recursos quase estáticos (`aulas`, `dicionario`, `dialogos`): `staleTime: 1000 * 60 * 15` (15 min) ou `staleTime: Infinity` com invalidação reativa após mutações.
  - Recursos transacionais (`comentarios`, `logs`, `progresso`): `staleTime: 1000 * 30` ou inferior.
  - UI Otimista: Aplicar `onMutate` com rollback em caso de erro para feedback imediato nas questões.
- **Server Cache:** Utilizar `unstable_cache` do Next.js com tags de revalidação para queries compartilhadas entre usuários.

## 8. Sanitização de Storage & Inputs
- Nomes de arquivos para upload devem passar por sanitização determinística:
  - Normalização NFD + remoção de acentos/diacríticos.
  - Conversão para minúsculas, substituição de espaços e caracteres especiais por `_`.
  - Limite máximo de 60 caracteres.

## 9. Índice de Documentação Detalhada (`.agents/context/documentation/`)
Para arquitetura e esquemas aprofundados de cada subsistema, consulte diretamente os 15 capítulos técnicos:
- `01-architecture.md`: Visão geral e topologia de deploy.
- `02-directories.md`: Estrutura de diretórios e padrões de código.
- `03-database.md`: Esquema relacional PostgreSQL, tabelas e RLS.
- `04-storage.md`: Políticas de buckets e uploads.
- `05-exams-engine.md`: Motor de execução e correção de provas.
- `06-whatsapp-simulator.md`: Simulador de diálogos estilo chat.
- `07-dictionary.md`: Dicionário inteligente, pinyin regex e virtualização.
- `08-auth-middleware.md`: Autenticação Supabase, cookies e session healing.
- `09-telemetry.md`: Telemetria PostHog e queries HogQL.
- `10-maintenance-practices.md`: Práticas de manutenção contínua.
- `11-biblioteca.md`: Motor da Biblioteca e CMS de conteúdo.
- `12-admin-lessons.md`: Painel do professor e gerenciamento de aulas.
- `13-sidebar.md`: Navegação e layout responsivo.
- `14-srs-engine.md`: Algoritmo FSRS e curvas de retenção de memória.
- `15-student-lessons-dashboard.md`: Dashboard de lições do estudante.
