<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Workspace Router - Portal Tao Ch'an Mandarim

## 1. Single Source of Truth
Load technical context directly from `.agents/context/`:
- **`system-map.md`**: Tech stack, MediaRecorder audio lifecycle, pinyin grading rules, @dnd-kit sensors, and caching strategy.
- **`glossary.md`**: Mandarin domain terminology, HSK levels, and tonal standards.
- **`documentation/{chapter}.md`**: 15 in-depth technical chapters covering database ERD, exams engine, auth middleware, SRS FSRS algorithm, simulator, etc.

## 2. Workspace Rules
- Load **`.agents/rules/GEMINI.md`** for repository-specific directives (Socratic gate, no exploratory SQL, mandatory documentation sync).

## 3. High-Value Portal Skills
- **`mandarin-exam-crafter`**: Creation and strict schema validation of exams (`.provas/u{N}/questoes_u{N}.json`), HSK whitelists, and 100-pt scoring.
- **`mandarin-i18n`**: Pinyin tonal diacritics, Hanzi normalization, and bilingual dictionary structures.
- **`portal-frontend`**: Next.js 16 App Router, React 19 boundaries, Tailwind v4 (`@theme`), Framer Motion v12, and WCAG AA accessibility.
- **`portal-backend`**: Supabase PostgreSQL schemas, RLS policies, Server Actions, storage sanitization, and automated quality assurance.
- **`portal-refactor-guard`**: Systemic domain renames, 7-layer blast-radius scanning, pre-mutation snapshots, import integrity, and documentation sync.

## 4. Code & Logic Search
- **Semble MCP (`search`):** For business logic, multi-word concepts, or unfamiliar flows (`content: "code"` | `"docs"`). Mix EN/PT terms (e.g., `pinyin grading`, `mediarecorder audio`).
- **Grep (`grep_search`):** For literal symbols, imports, routes, and refactoring.

## 5. Verification
Run validation suite before concluding tasks:
```bash
python3 .agents/scripts/checklist.py .
```
