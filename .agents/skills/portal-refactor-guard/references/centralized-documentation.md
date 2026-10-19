# 📚 Centralized Documentation & Workspace Hygiene

Refactoring must never leave scattered documentation notes or orphaned scratch files.

---

### Centralized Single Source of Truth

All technical documentation belongs in `.agents/context/`:
- **`system-map.md`**: Tech stack, high-level map, index of the 15 chapters.
- **`glossary.md`**: Chinese terminology, HSK definitions, pinyin conventions.
- **`documentation/{chapter}.md`**: 15 in-depth technical chapters.
  - Chapter 03: `03-database.md` (PostgreSQL ERD, tables, policies, triggers).
  - Chapter 11: `11-biblioteca.md` (Library CMS, Tiptap, storage).
  - Chapter 14: `14-srs-engine.md` (SRS algorithm, FSRS parameters).
- **`DOCUMENTATION.md`**: Master entry point linking to the 15 chapters.

### Mandatory Documentation Sync Protocol

Whenever a domain entity or module is modified:
1. Identify the primary chapter covering that domain (e.g. Chapter 11 for Biblioteca).
2. Update the chapter directly, keeping headings, tables, routes, and data flows in sync.
3. Update `system-map.md` and `DOCUMENTATION.md` if routes, chapter titles, or major mechanics shifted.
4. If database tables or policies changed, update `03-database.md`.
5. **NEVER create arbitrary `.md` files at the project root** (e.g., `ALTERACOES_BLOG.md`, `NOTAS.md`). All knowledge stays unified.

---

### Workspace Hygiene Protocol

- **Scratch Scripts:** All temporary Python or shell scripts must be saved in `.agents/_scratch/`. Never place scratch scripts in `app/`, `lib/`, or project root.
- **Backups:** Managed deterministically by `snapshot_vault.py` under `.agents/_scratch/backups/snapshot_<timestamp>/`. The vault automatically retains only the 5 most recent snapshots to prevent disk bloat.
