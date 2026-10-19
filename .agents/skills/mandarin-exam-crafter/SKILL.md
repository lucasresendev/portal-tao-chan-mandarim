---
name: mandarin-exam-crafter
description: >-
  Generate, structure, and validate Mandarin Chinese assessment exams (.provas/u{N}/questoes_u{N}.json).
  Enforces cumulative HSK vocabulary whitelists, phonetic/tonal distractors, and 100-point scoring parity.
  Use when authoring or validating unit exams. Do NOT use for database schemas (use portal-backend) or UI (use portal-frontend).
compatibility:
  tools: [run_command, view_file, replace_file_content, write_to_file]
  binaries: [python3]
---

## Operational Workflow

```
[1. Scope & Whitelist] ──► [2. Author Exam JSON] ──► [3. Deterministic Lint] ──► [4. Portal Publication]
```

### 1. Identify Target Unit & Vocabulary Whitelist
1. Inspect the target unit directory `.provas/u{N}/`.
2. Load the active vocabulary and sentence whitelists:
   - Words: `.provas/u{N}/palavras_u{N}.txt`
   - Sentences: `.provas/u{N}/frases_u{N}.txt`
3. Include cumulative whitelists from all preceding units (`u1` through `u{N-1}`).
4. Output exam payload to `.provas/u{N}/questoes_u{N}.json`.

### 2. Question Architecture & Schema
Each question entry must conform to the portal assessment schema:
```json
{
  "id": "u{N}_q{index}",
  "tipo": "multipla_escolha",
  "habilidade": "leitura",
  "enunciado": "Prompt text with clear instructions",
  "contexto": "Hanzi text under evaluation",
  "pinyin": "Optional tonal Pinyin representation",
  "opcoes": [
    {"id": "a", "texto": "Option A"},
    {"id": "b", "texto": "Option B"},
    {"id": "c", "texto": "Option C"},
    {"id": "d", "texto": "Option D"}
  ],
  "resposta_correta": "a",
  "explicacao": "Pedagogical and grammatical justification",
  "pontos": 10
}
```

Supported question types (`tipo`):
- `multipla_escolha`: Single-choice comprehension with 4 options.
- `ordenacao`: Syntactic token rearrangement (`itens` array).
- `preencher_lacunas`: Contextual cloze completion.
- `texto_livre`: Open-ended written production.
- `audio_upload`: Oral pronunciation recording.

Supported skill tags (`habilidade`):
- `leitura`, `gramatica`, `vocabulario`, `escuta`, `fala`, `escrita`

### 3. Pedagogical & Psychometric Constraints
- **Strict Character Whitelist:** Every Chinese character (Hanzi) in prompts, contexts, and distractors must exist in the current or preceding unit whitelists.
- **High-Signal Distractors:** Construct distractors using plausible syntactic inversions, tonal minimal pairs, or measure-word substitutions drawn strictly from known vocabulary.
- **Scoring Parity:** Total question weights must sum to exactly 100 points.

### 4. Deterministic Validation & Publication
Validate the generated JSON against the vocabulary whitelist and point budget:
```bash
python3 scripts/validate_exam.py .provas/u{N}/questoes_u{N}.json --vocab .provas/u{N}/palavras_u{N}.txt .provas/u{N}/frases_u{N}.txt --expected-points 100
```

Preview and publish validated exams to the platform database:
```bash
# 1. Dry-run payload preview (no remote writes):
python3 scripts/publish_exam.py .provas/u{N}/questoes_u{N}.json --titulo "Prova - Unidade {N}" --categoria "Provas"

# 2. Commit publication:
python3 scripts/publish_exam.py .provas/u{N}/questoes_u{N}.json --titulo "Prova - Unidade {N}" --categoria "Provas" --confirm
```

---

## Gotchas & Pitfalls
- Never introduce out-of-scope HSK characters that have not been taught in the current or prior units.
- Audio comprehension items require valid storage path references in the question metadata.
- Sentence ordering items (`ordenacao`) require pre-tokenized arrays in `itens`.
- Always execute `scripts/publish_exam.py` in dry-run mode before passing `--confirm`.

---

## Definition of Done
- [ ] All questions conform to the polymorphic exam JSON schema.
- [ ] Question weights sum to exactly 100 points.
- [ ] `python3 scripts/validate_exam.py` passes with exit code 0.
- [ ] Dry-run publication verified before remote commit.
