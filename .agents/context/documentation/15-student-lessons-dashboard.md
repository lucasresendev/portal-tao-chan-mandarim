# 🏫 15. Dashboard de Aulas do Aluno (UI Premium & Interações)

O dashboard de acompanhamento de aulas do estudante (`app/dashboard/page.tsx`) foi completamente reformulado para proporcionar uma interface premium baseada nos princípios de design moderno (Wow factor, interações de micro-animações, layout ultra-compacto e alta responsividade).

## 15.1 Seção "Para Assistir" (Pilha Animada 3D)

Para reduzir a carga cognitiva inicial e economizar espaço em tela, a seção de aulas não assistidas adota um layout dinâmico:
- **Limite de 3 Itens**: Se houver mais de 3 aulas com status pendente (não assistidas), o layout exibe apenas os 2 primeiros cards normais (`MiniCard`) e empilha os demais no 3º slot.
- **Remoção de Metadados de Pendências**: No `MiniCard` da seção "Para Assistir", o badge numérico de pendências foi removido para focar a atenção do aluno puramente no ato de assistir à aula.
- **Componente `CardPilha`**: Representa visualmente o empilhamento das aulas restantes. Ele usa **Framer Motion** para criar 2 camadas adicionais de "cards de fundo" rotacionados sutilmente em formato leque.
- **Contador Corrigido e Pluralização**: O contador da pilha exibe `aulasNaoAssistidas.length - 3`, correspondendo à quantidade exata de aulas pendentes além das 3 representadas visualmente. O texto se adapta gramaticalmente (ex: `+1 Aula` vs `+2 Aulas`).
- **Alinhamento do Conteúdo (Título no Topo)**: O layout interno do `MiniCard` e do `CardPilha` usa `flex-col justify-start` e `flex-1` no título `h3`, forçando o código da aula e o título a se alinharem juntos no topo do card. A indicação de expandir na pilha fica fixada absolutamente na base.
- **Alturas Dinâmicas e Flexíveis**: 
  - **Desktop**: Os cards usam `h-full min-h-[100px] sm:min-h-[110px]`. Os cards de uma mesma linha do grid esticam-se para manter a mesma altura de forma uniforme e harmônica.
  - **Mobile**: Como o grid do celular adota uma única coluna por linha, as alturas de cada card são ajustadas individualmente com base no seu próprio texto, sem deixar espaço em branco desproporcional.
- **Micro-animações baseadas em Variants**:
  - Em estado ocioso (`idle`), os cards de fundo têm rotações de `2deg` e `-2deg` com deslocamentos leves.
  - Ao passar o mouse (`hover`) ou toque (mobile), as rotações se expandem para `5deg` e `-5deg` e o deslocamento horizontal aumenta, fornecendo feedback visual de profundidade.
  - A física de mola (`spring`) garante elasticidade premium no movimento.
- **Expansão e Recolhimento**: O clique na pilha desfaz o empilhamento abrindo o grid completo. Um botão "Recolher pilha" no cabeçalho permite voltar ao modo compacto de forma imediata.

## 15.2 Seção Unificada "Aulas Assistidas ou Concluídas" (Histórico Compacto)

As antigas seções estáticas de "Aulas Assistidas" e "Aulas Concluídas" foram combinadas em um único painel de histórico:
- **Nomenclatura do Painel**: O título foi alterado para **"Aulas Assistidas ou Concluídas"** para refletir com exatidão a natureza inclusiva da seção.
- **Componente `CompactCard`**: Substitui o card de bloco vertical tradicional por um design de linha (layout horizontal).
  - Reduz em mais de **50%** o espaço vertical ocupado no dashboard.
  - **Métrica Exclusiva de Tarefas Acadêmicas**: O progresso é calculado descontando a visualização de vídeo. Aulas normais exibem a quantidade concluída de `2` tarefas (Exercícios e Hanzi) e aulas de exceção exibem sobre `1` tarefa. O ato de assistir à aula não conta como tarefa acadêmica no indicador do card.
  - **Pluralização Condicional**: O indicador de tarefas adapta-se ao plural (ex: `0/1 Tarefa` vs `1/2 Tarefas`).
  - **Remoção de Barra, Porcentagem e Ícones Redundantes**: A barra de progresso horizontal, o texto percentual e o ícone de seta (`ChevronRight`) lateral direita foram inteiramente removidos. O card agora foca estritamente na identificação e nos metadados à esquerda.
  - **Títulos Completos com Quebra de Linha**: O título `h4` usa as classes `whitespace-normal break-words` em vez de truncamento, permitindo que títulos longos quebrem de linha livremente em qualquer tela. Em celulares, a altura de cada card é adaptada individualmente à quantidade de linhas do seu título.
  - Ícone de status dinâmico: Exibe `CheckCircle2` verde para tarefas 100% finalizadas e `PencilLine` âmbar com indicação de tarefas pendentes.
- **Filtros Interativos (Pills)**: Permite filtrar instantaneamente entre:
  - **Todas**: Lista completa de aulas assistidas e concluídas.
  - **Assistidas**: Apenas as aulas que o aluno já assistiu, mas que ainda possuem tarefas em andamento.
  - **Concluídas**: Apenas as aulas com 100% das obrigações escolares enviadas e concluídas.
- **Responsividade e Alinhamento no Mobile**: No celular, a barra de controles de histórico expande para a largura total do container (`w-full`), permitindo que os filtros dividam o espaço de forma igual (`flex-1`) e o botão de ordenação fique posicionado lateralmente de forma limpa (`shrink-0`).
- **Ocultação de Seção Vazia**: Se o aluno for novo e não tiver nenhuma aula assistida/concluída, toda a seção de histórico é ocultada no dashboard, focando sua atenção na trilha inicial.
- **Ordenação Natural**: Um botão interativo alterna entre **Novas** (decrescente — padrão) e **Antigas** (crescente) baseado no `codigo_aula` com `localeCompare(..., { numeric: true })`.
- **Infinite Pagination**: Inicialmente limita a exibição a **6 cards compactos**. Caso existam mais itens, o botão "Ver mais aulas" estende o limite acumulativamente.

## 15.3 Barreira de Acesso para Recursos Avançados (Dicionário & SRS)

Para otimizar a experiência pedagógica e evitar que alunos iniciantes acessem painéis vazios de vocabulário e revisões antes de possuírem conteúdo base:
- **Componente `RecursoBloqueado`**: Uma tela de bloqueio estilizada com cadeado flutuante (animado via Framer Motion), mensagem explicativa amigável e progresso visual demonstrando quantas aulas o aluno precisa assistir para liberar o recurso.
- **Lógica de Bloqueio**: Nas rotas `/dashboard/dicionario` e `/dashboard/dicionario/srs`, a aplicação consulta a tabela `progresso_aluno` e calcula a quantidade de aulas assistidas (`aula_assistida = true`). Se a contagem for inferior a **3**, a renderização principal é interceptada e a tela de bloqueio é exibida.
- **Segurança de Navegação**: A validação na própria página de destino assegura que o bloqueio funcione mesmo se o aluno tentar navegar digitando a URL diretamente ou clicando em links do menu lateral/página inicial.
