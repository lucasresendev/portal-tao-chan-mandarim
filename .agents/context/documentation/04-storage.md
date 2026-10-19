# 📂 4. Supabase Storage (Gerenciamento de Arquivos)

Os uploads de mídia e arquivos da aplicação são roteados por meio do arquivo centralizador de caminhos `lib/storageUtils.ts`. Esse helper padroniza a organização lógica do storage nos dois buckets oficiais da plataforma.

### Algoritmo de Sanitização (`sanitizePath`)
Todas as strings de nomes de arquivos, nomes de alunos e títulos de atividades que compõem caminhos no storage passam obrigatoriamente pela sanitização do helper `sanitizePath`:
1.  **Normalização Unicode NFD:** A string passa por `.normalize('NFD')` e substitui o grupo de caracteres Unicode combinantes `[\u0300-\u036f]` por string vazia, limpando acentuações (`á` -> `a`, `ç` -> `c`).
2.  **Conversão Lowercase:** Transforma toda a string para minúsculas.
3.  **Filtragem de Caracteres Especiais:** Remove qualquer caractere que não seja letra, número, hífen ou espaço.
4.  **Colapso de Espaços:** Converte todos os agrupamentos de espaços ou hifens em um único caractere sublinhado (`_`).
5.  **Corte por Comprimento:** Limita o comprimento do slug a 60 caracteres para evitar quebras em URLs.

### Definição de Caminhos Dinâmicos

#### 1. Bucket `atvdd_laoshi` (Envios de Mídias de Provas pelo Professor)
*   **Caminho:** `{question_prefix}/{sanitized_filename}_{timestamp}_{random_token}.{ext}`
*   **Exemplo:** `q03/audio_conversacao_1714149600_abc12.mp3`
*   *Regra de Geração:* O prefixo da questão é formatado deterministicamente via `questionPrefix(questionIndex + 1)` (Ex: `q01`, `q02`), evitando perdas de referências caso a ordem das questões seja dinamicamente modificada na UI.

#### 2. Bucket `atvdd_alunos` (Envios de Gravações de Pronúncia pelos Alunos)
*   **Caminho:** `{atividade_slug}/{aluno_slug}/{question_prefix}_{timestamp}_{random_token}.{ext}`
*   **Exemplo:** `exercicios_licao_1/joao_silva/q04_1714152000_xyz98.webm`
*   *Regra de Geração:* O slug da atividade e o do aluno são limpos via `sanitizePath()`. O número da questão (`q04`) é baseado estritamente na posição original e estática da questão dentro do vetor `estrutura.questoes` criado pelo professor, garantindo que mesmo se a prova estiver com **embaralhamento ativo** (`embaralhar_questoes = true`) no painel do aluno, o arquivo de áudio será gravado e lido na pasta correspondente à questão lógica original.

#### 3. Bucket `dicionario` (Áudios de Pronúncia do Dicionário)
*   **Caminho:** `sons/{filename}`
*   **Exemplo:** `sons/lan2qiu2.mp3`
*   *Regra de Geração/Acesso:* Os arquivos de áudio são sincronizados em lote via script utilitário (`scripts/upload-sounds.js`). O player do SRS (`SrsSession.tsx`) extrai o nome do arquivo a partir da coluna `som` (formato `[sound:nome.mp3]`) e monta a URL pública para carregamento do áudio direto do bucket do Supabase.

