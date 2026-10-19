# 🏫 12. Aperfeiçoamentos no Painel do Administrador (Aulas)

O painel de gerenciamento de aulas para o professor (`app/admin/aulas`) foi reestruturado de forma a aprimorar drasticamente a experiência do usuário (UX) administrativa e a performance do portal.

### 12.1 Estratégia de Caching no Cliente

O componente `GerenciarAulas` agora integra a biblioteca de sincronização TanStack Query v5 de maneira inteligente:
- **`staleTime: 5 min`**: Os dados de aulas recuperados do Supabase são persistidos em cache local de memória por até 5 minutos. Isto elimina a necessidade de puxar dados do banco de dados do Supabase a cada renderização da página ou mudança de aba pelo professor.
- **Invalidação Proativa**: A mutação de adição (`addAulaMutation`) invalida especificamente a chave de cache `['admin-aulas']` apenas após uma criação bem-sucedida, forçando uma atualização de dados sincronizada sem desperdício de requisições de leitura adicionais.

### 12.2 Criação Otimizada em Popup Modal

Para economizar espaço vertical e horizontal precioso na tela do professor, o formulário de cadastro de aulas foi encapsulado em um componente overlay/modal flutuante moderno:
- **Tecnologia**: Implementado com `framer-motion` e `AnimatePresence`.
- **Física de Mola**: Entrada e saída com efeito elástico sutil (Spring Physics), garantindo um visual premium.
- **Interação Resiliente**: O modal pode ser fechado clicando no ícone `X`, clicando no backdrop transparente com desfoque de tela (`backdrop-blur-sm`), ou cancelando o envio. Limpa automaticamente todos os campos de formulário e fecha após a persistência bem-sucedida da nova aula.

### 12.3 Lista de Aulas em Grid de Cards Compactos

La listagem sequencial estática foi substituída por um design de grid responsivo (`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4`) que unifica a experiência estética com os cards do dashboard dos estudantes (`MiniCard`):
- **Identidade Visual**: Cards brancos minimalistas com cantos arredondados (`rounded-2xl`), bordas finas e realce reativo em hover com linha vermelha em glow superior.
- **Scannability Rápido (Metadados)**: Cada card exibe visualmente indicadores de suporte como o número de vídeos vinculados, pílulas de anexo padrão (Material e Tarefa), além de um indicador de **Links Adicionais** representando o número de links coringa criados, e tags de exceção pedagógica, permitindo auditoria visual rápida em poucos segundos.

### 12.4 Ordenação e Paginação Inteligente no Cliente

Para suportar grandes catálogos de aulas sem sobrecarga cognitiva ou degradação de performance:
- **Sorting Dinâmico**: Permite alternar dinamicamente a ordenação entre Ordem Crescente e Ordem Decrescente via JavaScript puro com o utilitário `localeCompare({ numeric: true })`, garantindo sincronia imediata e ordenação numérica natural (Ex: 1, 2, 12). O estado inicial padrão do painel é configurado como **Decrescente** (exibindo as aulas mais recentes do curso no topo).
- **Infinite Pagination**: Limita a exibição inicial a **12 cards** (conforme nova especificação). Se houver mais registros, o botão estilizado "Ver mais aulas" surge no rodapé e carrega as próximas **12 aulas** acumulativamente.

### 12.5 Resolução de Conflitos, Elementos Coringa (Links Adicionais) e TopNavbar

O formulário de edição de aulas (`app/admin/aulas/editar/[id]/page.tsx`) foi completamente adaptado às convenções modernas do App Router:
- **SetNavbar Integration**: O cabeçalho estático e redundante foi substituído por uma injeção limpa via `<SetNavbar title="Editar Aula" backLink="/admin/aulas" />`, integrando os botões de voltar e título de página à barra de navegação global persistente do sistema.
- **Links Adicionais (Coringa)**: O antigo campo estático e obsoleto `link_notion` foi inteiramente removido e substituído por uma seção dinâmica **Links Adicionais (Coringa)**. Essa funcionalidade permite que o professor insira múltiplos links adicionais, nomeando-os livremente (ex: "Notion de Apoio", "Pasta Drive", "Link Externo"). Caso a pessoa não forneça um nome personalizado, o link herda automaticamente o título padrão `"Link adicional"`. O armazenamento é feito sob um campo estruturado JSONB de alta flexibilidade (`links_adicionais`) na tabela `aulas`.
- **Ações na Navbar**: A ação perigosa de "Excluir Aula" foi migrada como uma ação secundária diretamente para o lado direito da `TopNavbar`, limpando o espaço de trabalho do formulário.
- **Unificação de Tema Visual**: Toda a paleta de cores auxiliar baseada em tons `indigo` legados foi convertida para as cores oficiais da marca (`tcm-red` e `tcm-dark-red`), harmonizando o visual com o resto do sistema.

### 12.6 Diretrizes de Responsividade e UI Padrão (Painel ADM)

Para manter o visual premium e evitar quebras de limites no celular, adote sempre os seguintes padrões unificados:
1. **Unificação de Cadastro (Modal Overlay)**: Formulários de criação complexos (como cadastro de Aulas e Alunos) devem ser encapsulados em popups overlay modernos, animados com física de mola (`AnimatePresence` + `motion.div`), liberando o espaço de trabalho principal e limpando a rolagem vertical. O modal deve fechar automaticamente em `onSuccess`.
2. **Navbar Superior Persistente Limpa**: Evite injetar botões de ações complexas ou pesadas (como "Salvar Roteiro" no Simulador de Diálogos) na `TopNavbar` global. A navbar deve permanecer limpa, contendo apenas o botão de voltar. Mova essas ações proativamente para o painel superior de controle/ferramentas local na própria página, integrando a mensagem de feedback (`statusMsg`) inline no mesmo bloco.
3. **Listas e Nomes Longos**: Sempre envolva o bloco de identificação textual com `min-w-0 flex-1 truncate` e aplique `shrink-0` nas pílulas, badges e botões de ação adjacentes. Isso impede que nomes de alunos ou itens colidam com controles na horizontal.
4. **Stacking de Botões de Controle**: Em telas pequenas, botões secundários colocados lado a lado devem sofrer empilhamento vertical com largura total (`w-full sm:w-auto shrink-0 justify-center`) para garantir toque preciso com o polegar e prevenir estouros horizontais na caixa do grid (ex: botões de Ordenação e Nova Aula).
5. **Substituição de Tabelas Complexas**: Tabelas de listagem com 3 ou mais colunas devem ser ocultadas no mobile com `hidden sm:block` e substituídas por uma lista vertical de cards estilizados com `block sm:hidden` (ex: painel de Provas e Atividades).
6. **Backdrop Vermelho Escuro de Modais (Design Token)**: Todos os modais flutuantes/overlay de formulário do sistema devem utilizar a classe utilitária padrão `.tcm-backdrop-premium` no backdrop de fundo. Essa classe substitui os fundos genéricos (`bg-slate-900/60`), aplicando um fundo vermelho-escuro chinês translúcido (`rgba(26, 5, 5, 0.8)` ou `#1a0505`) e efeito de desfoque de fundo (`backdrop-filter: blur(8px)`), garantindo total consistência com o visual de aulas do dashboard dos estudantes.
