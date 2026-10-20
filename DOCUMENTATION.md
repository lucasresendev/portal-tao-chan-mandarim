# 🇨🇳 Portal Tao Ch'an Mandarim - Documentação Técnica do Sistema

> **Finalidade:** Índice central da documentação de altíssima fidelidade do portal acadêmico Tao Ch'an Mandarim.
> **Sistema de Documentação Modular Sob Demanda:** Para otimização de tokens (90% de economia) e prevenção de saturação de contexto, a documentação técnica foi segmentada em capítulos independentes.

---

## 🛑 PROTOCOLO PARA AGENTES DE IA (LEITURA E ATUALIZAÇÃO)

### 1. Leitura Sob Demanda (Modular)
- **NÃO** leia todos os arquivos de documentação.
- Identifique a área do código que você está alterando no sumário abaixo.
- Use a ferramenta `view_file` para carregar **APENAS** o capítulo específico relevante à sua tarefa.

### 2. Sincronização Obrigatória de Atualizações
- Sempre que efetuar uma mudança estrutural, de banco de dados, API, Server Action, UI premium, animação ou regras de negócio:
  1. Identifique qual capítulo abaixo rege essa funcionalidade.
  2. Abra e edite o arquivo modular correspondente `.agents/context/documentation/{capitulo}.md` utilizando o editor de arquivos.
  3. Adicione especificações técnicas exatas, assinaturas, schemas ou rotas (sem placeholders).
  4. Mantenha os diagramas Mermaid atualizados.

---

## 🗺️ Sumário de Capítulos Modulares

Clique nos links abaixo para carregar os capítulos técnicos específicos:

1. **[Arquitetura Geral do Sistema](./.agents/context/documentation/01-architecture.md)**
   - Stack tecnológica completa, Dual-Mode Portfolio Sandbox Engine (`lib/demo/supabaseSandbox.ts`), bibliotecas de sincronização, telemetria e interfaces.
2. **[Estrutura de Diretórios (Módulos)](./.agents/context/documentation/02-directories.md)**
   - Mapeamento completo da árvore de arquivos de páginas, Server Actions, tipos e utilitários.
3. **[Banco de Dados Supabase (Modelagem)](./.agents/context/documentation/03-database.md)**
   - Diagrama de Relacionamento de Entidades (ERD), catálogo das 16 tabelas PostgreSQL, contrato de tipos TypeScript, índices de FK e padrões RLS/segurança.
4. **[Supabase Storage (Mídias)](./.agents/context/documentation/04-storage.md)**
   - Algoritmo de sanitização de strings `sanitizePath` e caminhos dinâmicos dos buckets acadêmicos.
5. **[O Motor de Provas Dinâmico & MediaRecorder](./.agents/context/documentation/05-exams-engine.md)**
   - Tipos de questões polimórficas, ciclo de vida seguro de gravação de voz WebM e Auto-salvar (Supabase + LocalStorage).
6. **[O Simulador de Diálogos WhatsApp-Style](./.agents/context/documentation/06-whatsapp-simulator.md)**
   - Máquina de estados de turnos, ticks de double checks, horas culturais chinesas, e tratador de recordes.
7. **[O Motor de Dicionário Inteligente](./.agents/context/documentation/07-dictionary.md)**
   - Regex de coloração tonal de Pinyin, normalizações de busca fuzzy e carregador em infinite scroll.
8. **[Autenticação, Middleware & Server Actions](./.agents/context/documentation/08-auth-middleware.md)**
   - Escudo de proteção de rotas Edge, Session Healing (Token Expired), Server Actions administrativas e sincronização com o Sandbox (`demoPayloads`).
9. **[O Barramento de Telemetria (PostHog & HogQL)](./.agents/context/documentation/09-telemetry.md)**
   - Proxy reverso antibloqueio, queries analíticas HogQL, e algoritmo linear de compressão de logs.
10. **[Guia de Manutenção e Boas Práticas](./.agents/context/documentation/10-maintenance-practices.md)**
    - Diretrizes de tipagem, controle de hardware (microfone), cache, e eventos.
11. **[Biblioteca de Conteúdos](./.agents/context/documentation/11-biblioteca.md)**
    - Tabela de artigos/publicações, RLS segregado público/admin, buckets de ativos, Tiptap custom suite (Audio/Image node views), card direto no dashboard, revalidação e cache.
12. **[Painel Administrativo de Aulas](./.agents/context/documentation/12-admin-lessons.md)**
    - Cache cliente React Query, popups modal spring, grid MiniCard, paginação dinâmica e links adicionais coringa.
13. **[Menu Lateral (Sidebar) & Modais](./.agents/context/documentation/13-sidebar.md)**
    - Sidebar flutuante drawer, locks de scroll, permissões condicionais de abas, e modal de edição de perfil.
14. **[O Motor de Repetição Espaçada (SRS) com FSRS](./.agents/context/documentation/14-srs-engine.md)**
    - Configurações FSRS (retentiva), métricas de Recall/Absorção separadas, batch sync e correções administrativas de streak e heatmap.
15. **[Dashboard de Aulas do Aluno (UI Premium & Interações)](./.agents/context/documentation/15-student-lessons-dashboard.md)**
    - Pilha animada 3D da seção "Para Assistir" e histórico compacto unificado de "Aulas Assistidas & Concluídas" com filtros e ordenação natural.
