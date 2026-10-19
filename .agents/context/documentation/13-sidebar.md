# 🧭 13. O Menu Lateral (Sidebar) Unificado de Alta Performance

Para aprimorar drasticamente a experiência do usuário (UX), centralizar a navegação acadêmica e consolidar as ações em resoluções responsivas, o portal implementa um **Menu Lateral (Sidebar Drawer)** unificado e flutuante.

### 13.1 Arquitetura de Estados de Navegação

A Sidebar é montada no nível de layout e seu comportamento de renderização responde dinamicamente às preferências fornecidas por páginas individuais através do `NavbarContext` e do componente `<SetNavbar />`:

1. **Contexto de Estado do TopNavbar (`NavbarContext.tsx`):**
   A assinatura de estado da Navbar foi estendida para suportar a flag opcional `hideSidebarToggle?: boolean`.
2. **Propagação Otimista (`SetNavbar.tsx`):**
   As páginas podem setar `hideSidebarToggle: true` para desabilitar o botão de abertura do menu (hambúrguer) a fim de reter o foco em tarefas críticas de atenção.
3. **Mapeamento de Rotas no Cliente:**
   O componente detecta a rota atual através de `usePathname()` para aplicar estilos ativos refinados nos links selecionados (borda dourada `--tcm-yellow`, realce de fundo em fade vermelho e fonte em negrito) e identificar dinamicamente se o usuário está na visualização administrativa ou de estudante.

### 13.2 Ciclo de Abertura & Acessibilidade

O ciclo de controle da Sidebar Drawer é robusto, responsivo e projetado com foco em acessibilidade:

- **Controle de Escapes:** Pressionar a tecla `Escape` (ESC) de forma síncrona aciona a limpeza do estado de abertura e fecha a Sidebar.
- **Scroll Lock:** Durante o tempo de abertura, o componente bloqueia ativamente o scroll na tag `body` (`document.body.style.overflow = 'hidden'`) para evitar double scrolling incômodos no fundo do portal.
- **Backdrop Overlay com spring:** A sobreposição escura com desfoque translúcido (`backdrop-blur-sm`) recebe cliques e age como uma zona neutra de fechamento do menu.

### 13.3 Segurança & Privilégios (Admin vs Aluno)

A exibição de menus é estritamente condicional:
- **Segurança de Cache (`useQuery`):** A Sidebar consome a query TanStack Query `['user-session']` de forma instantânea para extrair o perfil do aluno no Supabase.
- **Visibilidade Inteligente:**
  - Se o usuário for administrador (`profile.is_admin = true`), o menu renderiza um **botão rápido de alternação** ("Ir para Portal do Aluno" ou "Ir para Painel Admin") e abre uma seção de atalhos administrativos estruturada e demarcada em cor de fundo reativa a ouro (`bg-amber-50/20` com bordas tracejadas douradas).
  - Se for um estudante convencional, a seção administrativa é 100% omitida do DOM físico, mitigando brechas visuais ou acessos acidentais.

### 13.4 Retenção de Foco em Provas Ativas (`AtividadeProvaPage`)

Para blindar o estudante contra desvios de atenção ou perdas de rascunhos de exames decorrentes de cliques acidentais em menus de navegação, a página de prova (/dashboard/atividades/[id]) intercepta o estado da navbar:
- **Regra:** Se o estudante estiver realizando ativamente a prova (`currentStep > 0` e a prova não tiver sido entregue ou corrigida ainda), o `<SetNavbar />` é instanciado com `hideSidebarToggle={true}`.
- **Efeito:** O botão de Hambúrguer de navegação desaparece silenciosa e instantaneamente da barra superior do navegador, e reaparece de forma reativa apenas após a entrega formal do caderno ou no desmonte da página.

### 13.5 Centralização da Edição de Perfil e Simplificação de Ações TopNavbar

Com o objetivo de purificar a interface visual e unificar os fluxos de experiência do usuário (UX), eliminando redundâncias de botões no cabeçalho superior (navbar), as seguintes reestruturações de engenharia foram consolidadas:

1. **Despoluição e Simplificação das Navbars:**
   - **Remoção de Redundâncias:** Os botões de encerramento de sessão (Logout), comutação de perfil (Admin/Student Switch), e configurações individuais foram eliminados das navbars no Painel do Aluno (`app/dashboard/page.tsx`) e no Painel Administrativo (`app/admin/page.tsx`), deixando o topo do portal moderno, focado e livre de ruídos cognitivos.
   - **Navegação de Retorno Unificada (`backLink`):** O cabeçalho da página do dicionário estudantil (`app/dashboard/dicionario/page.tsx`) agora utiliza o parâmetro semântico `backLink="/dashboard"` nativo do componente `<SetNavbar />`, permitindo a remoção do antigo botão de atalho `Home` e seu separador vertical. O topo da página agora exibe apenas a ação de filtros específicos do dicionário de forma limpa.
   - **Layout Tipográfico Responsivo & Otimização de Área:** O `TopNavbar.tsx` implementa um layout dinâmico que garante a identidade da marca "Tao Ch'an Mandarim" sempre em uma única linha no mobile (`whitespace-nowrap` + `text-[15px]`) e o logo dourado sempre visível. Para evitar que o logo sofra compressão ou encolhimento distorcido do flexbox do navegador, aplicou-se a regra de preservação estrita de tamanho `shrink-0` em seu contêiner. O título da página é renderizado elegantemente logo abaixo do nome do portal (`text-[10px] sm:text-xs font-bold text-tcm-yellow uppercase tracking-wider`), com quebra de palavra natural (`break-words`) para prevenir esmagamento. Os botões de ação e os paddings gerais do container também foram ligeiramente condensados no mobile para expandir o espaço útil central sem comprometer a identidade visual.

2. **Centralização Global da Edição de Perfil no Menu Lateral:**
   - **Migração do Modal de Perfil:** O modal completo de gerenciamento de dados de acesso (Nome, E-mail, Senha), seus estados locais de processamento, mutação assíncrona TanStack Query (`profileMutation`) e o respectivo trigger analítico da PostHog foram migrados em definitivo para o escopo isolado da Sidebar (`app/components/Sidebar.tsx`).
   - **Acionamento Livre de Efeitos:** A inicialização e preenchimento dos estados do formulário foram migrados do ciclo `useEffect` para um tratador controlado sob demanda (`handleOpenProfileModal`), acionado exclusivamente no evento de clique sobre o ícone de engrenagem no card de usuário. Isso soluciona problemas de renderização em cascata ("cascading renders") e garante total conformidade com as regras estritas de renderização eficiente do React 19.

### 13.6 Otimizações de Fluididade e Viewport Móvel
- **Ajuste de Altura Dinâmica (`h-dvh`):** O Drawer lateral foi atualizado de `bottom-0` fixo para `h-dvh` (Dynamic Viewport Height). Isso evita tremores e saltos verticais quando a barra de endereços do navegador mobile encolhe ou expande ao rolar a página.
- **Física de Transição Snappy:** As variantes do Framer Motion (`drawerVariants`) foram recalibradas com coeficientes de mola firme (`damping: 28`, `stiffness: 250`), entregando uma resposta visual tátil e instantânea de altíssimo padrão.
