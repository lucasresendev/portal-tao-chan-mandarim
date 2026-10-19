---
trigger: always_on
---

# Workspace Rules - Portal Tao Ch'an Mandarim

## 1. Hierarchy & Source of Truth
- **P0:** User Global Rules & `rules/GEMINI.md`.
- **P1:** Workspace Context: `.agents/context/` (`system-map.md`, `glossary.md`, and 15 chapters in `documentation/`).
- **P2:** Skills: `.agents/skills/` (`mandarin-exam-crafter`, `mandarin-i18n`, `portal-frontend`, `portal-backend`, `portal-refactor-guard`).

## 2. Autonomous Natural Language & Socratic Gate
- User interacts strictly via natural language. Zero slash commands required.
- **Socratic Gate:** For architectural migrations, Supabase RLS policies, Auth middleware, or breaking database schema edits: STOP and ask 1-2 strategic discovery questions before modifying code.

## 3. Mandatory Hardware & Performance Lifecycle
- **Audio Stream Cleanup:** Always terminate all media tracks when recording stops or component unmounts:
  ```typescript
  stream.getTracks().forEach((track) => track.stop());
  ```
- **Supabase & Query Caching:**
  - Quasi-static (`aulas`, `dicionario`, `dialogos`): `staleTime: 1000 * 60 * 15` or `Infinity` with reactive invalidation on mutations.
  - Dynamic (`comentarios`, `logs`, `progresso`): `staleTime: 1000 * 30` or lower.
  - Implement optimistic UI updates (`onMutate` + rollback on error).

## 4. Database & Storage Rules
- **No Exploratory DB Requests:** Never run exploratory SQL queries solely to explore schemas. The single source of truth is `.agents/context/documentation/03-database.md`.
- **Storage Sanitization:** Sanitize file names deterministically (`sanitizeStorageFileName`) stripping diacritics and special characters.
- **Parameterized SQL:** Parameterized queries only; zero raw string concatenations.

## 5. Mandatory Documentation Sync
- On any modification to database schemas, RLS policies, Server Actions, API routes, or storage buckets:
- MUST update the corresponding chapter in `.agents/context/documentation/{chapter}.md` and `DOCUMENTATION.md` before concluding the turn.

## 6. Execution Verification
- Validate changes via actual execution: `python3 .agents/scripts/checklist.py .` or specific test runner.
