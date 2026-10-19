# 7. O Motor de Dicionário Inteligente e Colorido

O dicionário unificado é projetado com foco no desempenho de renderização móvel e no suporte a múltiplos tons de pronúncia do idioma mandarim.

### 7.1 O Algoritmo de Coloração de Tons do Pinyin (`renderPinyinComCores`)

A fonética Pinyin utiliza marcas diacríticas para representar os quatro tons tradicionais do mandarim. A aplicação processa dinamicamente a string de Pinyin, separa as sílabas e aplica regras estéticas baseadas em expressões regulares para pintar as palavras de acordo com a entonação correta:

```typescript
const renderPinyinComCores = (pinyinStr: string) => {
  const palavras = pinyinStr.split(' ');
  return palavras.map((palavra, index) => {
    let colorClass = 'text-slate-500'; // Tom Neutro (5º Tom)
    
    if (/[āēīōūǖĀĒĪŌŪǕ]/.test(palavra)) colorClass = 'text-red-500';      // 1º Tom (Plano)
    else if (/[áéíóúǘÁÉÍÓÚǗ]/.test(palavra)) colorClass = 'text-amber-500';  // 2º Tom (Subindo)
    else if (/[ǎěǐǒǔǚǍĚǏǑǓǙ]/.test(palavra)) colorClass = 'text-emerald-500';// 3º Tom (Caindo e Subindo)
    else if (/[àèìòùǜÀÈÌÒÙǛ]/.test(palavra)) colorClass = 'text-blue-500';     // 4º Tom (Descendo Forte)

    return <span key={index} className={`${colorClass} font-medium mr-1`}>{palavra}</span>;
  });
};
```

Esta funcionalidade ajuda na memorização da pronúncia das palavras e frases.

---

### 7.2 Lógica de Normalização e Busca Fuzzy

Para permitir uma busca rápida e fluida, o input de texto do estudante passa por filtros de equivalência fonética local:
1.  **Sanitização HTML:** Limpa qualquer marcação HTML interna presente nos dados usando `stripHtml()`.
2.  **Strip de Tons Unicode:** Remove acentuações tonais da busca digitada por meio do método `removeTones()`:
    ```typescript
    const removeTones = (str: string) => {
      return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };
    ```
3.  **Junção e Colapso Silábico:** Remove espaços e hifens do termo buscado e do pinyin indexado no banco (ex: transformando `"nǐ hǎo"` em `"nihao"`). Isso permite que o estudante encontre resultados perfeitamente seja digitando com acentuações (`nǐ hǎo`), letras planas com espaçamento (`ni hao`) ou apenas os caracteres colados sem separação silábica (`nihao`).

---

### 7.3 Parse de ANKI HTML & Modal "Tap to Translate"

Os exemplos práticos das palavras e frases armazenados na tabela do banco de dados utilizam marcações HTML originárias de exportações do ANKI:
1.  **Processamento Sintático:** O método `parseAnkiExamples()` segmenta a string em blocos divididos por `<br><br>` para identificar a sequência de **Hanzi**, **Pinyin** e **Tradução**.
2.  **Ocultamento Padrão de Tradução (Self-Testing):** Ao renderizar o modal de frases de exemplos, apenas os caracteres chineses originais (Hanzi) são revelados de imediato para o estudante.
3.  **Revelação Dinâmica:** As linhas de Pinyin e tradução em português ficam inicialmente ocultas sob uma borda pontilhada. Quando o aluno toca sobre o card da frase, o sistema dispara o método `toggleExampleReveal(index)`, executando uma micro-animação fluida que revela o Pinyin colorido e o significado da frase. Isso cria um ambiente interativo de auto-avaliação (Flashcard).

---

### 7.4 Progresso Adaptativo & Infinite Scroll (`IntersectionObserver`)

*   **Liberacão Gradual:** Para evitar a sobrecarga cognitiva do estudante com centenas de termos complexos que ele ainda não aprendeu, a tabela `dicionario` vincula as palavras ao ID da aula oficial (`licao_oficial_id`) ou da aula complementar (`aula_id`).
*   **Cruzamento de Queries:** A query TanStack Query `['dicionario', userId]` busca os IDs das aulas completadas pelo aluno em `progresso_aluno` e filtra na tabela de dicionário apenas as palavras apresentadas nas aulas que o estudante já assistiu. O dicionário se expande de forma dinâmica e adaptativa à medida que o aluno avança no curso.
*   **Infinite Scroll de Alta Performance:** Para lidar com milhares de termos carregados sem gargalos de memória e lag no navegador em dispositivos móveis antigos, a renderização utiliza um observador de intersecção (`IntersectionObserver`) atrelado a um loader no final da lista. A listagem carrega inicialmente apenas `20` cards (`visibleCount`). À medida que o aluno rola e intersecta o rodapé da página, blocos sequenciais de 20 termos são concatenados sob demanda, garantindo alto desempenho.
