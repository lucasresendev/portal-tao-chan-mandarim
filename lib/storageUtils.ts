/**
 * storageUtils.ts
 *
 * Centralised helpers for building Supabase Storage object paths.
 * Both the admin (Lǎoshī) and student (aluno) upload flows import from here,
 * ensuring naming conventions stay consistent across the whole app.
 */

/**
 * Sanitizes an arbitrary string so it is safe to use as a Storage path segment:
 *  - NFD normalization strips combining-accent marks (ã → a, ç → c, etc.)
 *  - Non-alphanumeric characters are removed (dashes preserved)
 *  - Spaces collapse to underscores
 *  - Length is capped to avoid excessively long paths
 */
export function sanitizePath(text: string, maxLength = 60): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // strip accent combining marks
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')      // keep alphanumeric, spaces and dashes
    .trim()
    .replace(/[\s-]+/g, '_')           // spaces / dashes → underscores
    .replace(/_+/g, '_')               // collapse repeated underscores
    .slice(0, maxLength);
}

/** Pads a question number to 2 digits (e.g. 1 → "q01", 12 → "q12"). */
function questionPrefix(questionNumber: number): string {
  return `q${String(questionNumber).padStart(2, '0')}`;
}

/** A unique token to prevent name collisions when re-uploading. */
function uniqueToken(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Admin (Lǎoshī) — bucket: atvdd_laoshi ─────────────────────────────────

/**
 * Builds a storage path for a file attached to a question by the teacher.
 *
 * Pattern:
 *   {question_number}/{original_filename}.{ext}
 *
 * Example:
 *   q03/audio_48k_1714149600_abc12.mp3
 */
export function buildLaoshiMediaPath(params: {
  questionIndex: number;   // 0-based position in estrutura.questoes
  originalName: string;
  ext: string;
}): string {
  const { questionIndex, originalName, ext } = params;
  const qPrefix = questionPrefix(questionIndex + 1);
  const safeName = sanitizePath(originalName.replace(/\.[^.]+$/, ''), 40); // strip extension
  return `${qPrefix}/${safeName}_${uniqueToken()}.${ext}`;
}

// ─── Student (Aluno) — bucket: atvdd_alunos ────────────────────────────────

/**
 * Builds a storage path for audio recorded/uploaded by a student.
 *
 * Pattern:
 *   {atividade_slug}/{aluno_slug}/{question_number}_{timestamp}_{rand}.{ext}
 *
 * The question number used here is the OFFICIAL index in the original
 * `estrutura.questoes` array — never the shuffled display order.
 *
 * Example:
 *   kanji_nivel_1/joao_silva/q03_1714149600_abc12.webm
 */
export function buildAlunoAudioPath(params: {
  tituloAtividade: string;
  nomeAluno: string;
  /** Official 0-based index in estrutura.questoes (shuffle-independent). */
  questaoIndex: number;
  ext: string;
}): string {
  const { tituloAtividade, nomeAluno, questaoIndex, ext } = params;
  const atividadeSlug = sanitizePath(tituloAtividade) || 'atividade';
  const alunoSlug     = sanitizePath(nomeAluno)      || 'aluno';
  const qPrefix       = questionPrefix(questaoIndex + 1);
  return `${atividadeSlug}/${alunoSlug}/${qPrefix}_${uniqueToken()}.${ext}`;
}
