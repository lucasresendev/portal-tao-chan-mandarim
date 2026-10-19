# 🏗️ 1. Arquitetura Geral do Sistema

O portal **Tao Ch'an Mandarim** é um ecossistema de aprendizado de idiomas web-first. Ele utiliza o paradigma **Next.js (App Router)** unificado com o **Supabase** como Backend-as-a-Service (BaaS). A interface é altamente dinâmica, utilizando **TanStack React Query v5** para gerenciamento de cache de dados e sincronizações assíncronas, e **Framer Motion v12** para micro-animações interativas de alta qualidade.

### 🛠️ Stack Tecnológica Detalhada

| Camada | Tecnologia | Detalhes & Configurações de Engenharia |
| :--- | :--- | :--- |
| **Core Framework** | `Next.js 16.2.3` | App Router, Server Actions, Dynamic Middleware, API Route Handlers |
| **Biblioteca de UI** | `React 19.2.4` | Server & Client Components, Hooks (`useMemo`, `useCallback`, `useRef`, `useEffect`) |
| **Estilização** | `Tailwind CSS v4` | Configuração CSS-First, CSS Variables nativas, design system responsivo e harmonioso |
| **BaaS / Backend** | `Supabase` | PostgreSQL, Supabase Auth Helpers (`@supabase/auth-helpers-nextjs`), Row Level Security (RLS) |
| **Sincronização & Cache** | `@tanstack/react-query v5` | Gerenciamento de cache global, Mutações, Invalidação e Atualizações Otimistas (Optimistic UI) |
| **Processamento de Pinyin**| `pinyin-pro` | Utilitários de processamento automático de Hanzi e fonética Pinyin |
| **Telemetria / Analytics**| `PostHog-js v1.369.0` | Ingestão de telemetria comportamental, Funis, e consultas analíticas avançadas em tempo real com HogQL |
| **Reprodutor de Vídeo** | `react-youtube` | Execução controlada e assíncrona de vídeo-aulas diretamente da API do YouTube |
| **Portfolio Sandbox** | `lib/demo/supabaseSandbox.ts` | Interceptador PostgREST, GoTrue Auth e Storage para demonstração interativa isolada por visitante (`localStorage`) |

### 🎭 Arquitetura Dual-Mode (Produção vs. Portfólio Sandbox)

Quando `NEXT_PUBLIC_DEMO_MODE=true`, o módulo `lib/demo/supabaseSandbox.ts` intercepta chamadas `fetch` destinadas ao host de demonstração (`https://portfolio-demo.supabase.co`), resolvendo consultas PostgREST (`/rest/v1/*`), sessões JWT (`/auth/v1/*`) e uploads de mídia (`/storage/v1/*`) localmente a partir do seed pedagógico (`lib/demo/seedData.json`) combinado com o `localStorage` do navegador do visitante.

