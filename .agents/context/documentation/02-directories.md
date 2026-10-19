# 📁 2. Estrutura de Diretórios (Visão de Módulo)

```plaintext
meu-portal-mandarim/
├── app/                        # Roteamento e Páginas (Next.js App Router)
│   ├── actions/                # Server Actions
│   │   └── admin-actions.ts    # Ações administrativas com chaves Supabase Service Role
│   ├── admin/                  # Painel do Professor (Acesso protegido)
│   │   ├── alunos/             # CRUD de alunos e credenciamento administrativo
│   │   ├── atividades/         # Construtor de exames e correção manual de áudios/redações
│   │   ├── aulas/              # Cadastro de vídeo-aulas, materiais didáticos e tarefas
│   │   ├── dialogos/           # Cadastro de conversações moldadas para o Simulador
│   │   ├── dicionario/         # Gerenciamento de vocabulário e explicações gramaticais
│   │   └── progresso/          # Visão macro de progresso e engajamento estudantil
│   ├── api/                    # Endpoints e Integrações de Servidor
│   │   └── admin/
│   │       └── activity-log/   # API Router que consulta dados agregados do PostHog via HogQL
│   ├── components/             # Componentes reutilizáveis compartilhados
│   ├── dashboard/              # Painel do Aluno (Consumo e Atividades)
│   │   ├── atividades/         # Central de provas dinâmicas, temporizador e auto-save
│   │   │   └── [id]/components/# Componentes de questões polimórficas (Audio, Lacunas, Ordenação)
│   │   ├── dicionario/         # Dicionário do aluno com coloração de tons e filtro de progresso
│   │   └── simulador/          # Simulador interativo WhatsApp-Style
│   ├── globals.css             # Folha de estilos globais e variáveis de tema
│   ├── providers.tsx           # Provedores de contexto (React Query, PostHog Client, UI Contexts)
│   └── page.tsx                # Rota principal (redireciona para /dashboard)
├── lib/                        # Utilitários de infraestrutura
│   └── storageUtils.ts         # Sanitização de caminhos de arquivos e controle de buckets
├── types/                      # Declarações e Tipagens TypeScript
│   └── atividades.ts           # Modelagem estrita da estrutura de provas, questões e dados do aluno
├── proxy.ts                    # Middleware Next.js (proteção de rotas, cookies, e session healing)
├── next.config.ts              # Configurações do Next.js (Proxy reverso /ingest do PostHog)
├── package.json                # Gerenciador de dependências e scripts
└── tsconfig.json               # Configurações do compilador do TypeScript
```
