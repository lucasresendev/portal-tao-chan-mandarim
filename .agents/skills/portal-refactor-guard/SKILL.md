---
name: portal-refactor-guard
description: >-
  Execute cross-layer domain refactorings, entity renames, and module migrations across all 7 application layers
  (DB, Actions, Types, Components, Routes, CSS, Docs). Automates blast-radius scanning, atomic snapshots,
  and import auditing. Use when renaming domain entities or restructuring modules. Do NOT use for single-file fixes.
compatibility:
  tools: [run_command, view_file, replace_file_content, write_to_file]
  binaries: [python3, npx]
---

## Operational Workflow

```
[1. Blast-Radius Scan] ──► [2. Atomic Snapshot] ──► [3. Pragmatism Gate] ──► [4. Surgical Refactor & Import Audit] ──► [5. Validation & Doc Sync]
```

### Stage 1: Automated Blast-Radius Scan
Map all symbol, route, and table occurrences across the 7 architectural layers before editing files:
```bash
python3 scripts/blast_radius_scanner.py <entity_name> --json > .agents/_scratch/blast_radius.json
python3 scripts/blast_radius_scanner.py <entity_name>
```
Read [references/the-7-layers.md](./references/the-7-layers.md) when planning cross-layer migrations.

### Stage 2: Atomic Pre-Mutation Snapshot
Create a deterministic backup of all affected files prior to applying structural changes:
```bash
python3 scripts/snapshot_vault.py --from-json .agents/_scratch/blast_radius.json --label <entity_name>
```
- Snapshots are archived under `.agents/_scratch/backups/snapshot_<timestamp>_<label>/` with an auto-generated `restore.py` rollback script.

### Stage 3: Architectural Pragmatism Gate
Evaluate physical vs. logical blast radius before mutating persistent infrastructure:
1. **Object Storage Buckets:** If database `jsonb` payloads store absolute bucket paths (`/storage/v1/object/public/blog-assets/...`), preserve the physical bucket identifier and alias application-level storage helpers.
2. **Database Tables:** When active foreign keys, triggers, and RLS policies depend on an existing table name, prefer application-layer type aliases (`export type PublicacaoBiblioteca = PublicacaoBlog;`) and route migrations over destructive table renames.
3. **Route Continuity:** Preserve existing bookmarks by issuing 307/308 redirects from legacy paths to new canonical routes.
Read [references/safety-and-pragmatism.md](./references/safety-and-pragmatism.md) for the complete decision matrix.

### Stage 4: Surgical Refactoring & Import Integrity
Apply modifications across layers and verify import resolution:
1. **Types (`types/<entity>.ts`):** Define canonical interfaces and re-export deprecated aliases for backward compatibility.
2. **Components & Routes (`app/`):** Migrate route segments and re-export shared components where needed.
3. **Audit Relative Imports:** Run `python3 scripts/import_integrity_checker.py app types lib` to detect broken relative path depths.
4. **Normalize Tailwind v4 Utilities:** Run `python3 scripts/tailwind_v4_normalizer.py app --fix` to standardize utility tokens.

### Stage 5: Verification & Documentation Synchronization
1. **Static & Schema Verification:**
   ```bash
   npx tsc --noEmit && python3 ../portal-backend/scripts/schema_validator.py .
   ```
2. **Documentation Sync:**
   - Update the corresponding technical chapter in `.agents/context/documentation/{chapter}.md`, `.agents/context/system-map.md`, and `DOCUMENTATION.md`.
   - Read [references/centralized-documentation.md](./references/centralized-documentation.md) for documentation governance rules.

---

## Gotchas & Pitfalls
- **Cached Language Server Diagnostics:** After moving or deleting route files, always verify with `npx tsc --noEmit` as the authoritative compiler check.
- **Strict Server Cookie Typing:** Avoid `any` casts on Next.js cookie stores; use `@/lib/supabase/server`.
- **Relative Import Depth Drift:** Nesting routes deeper shifts relative import depth to shared components (`SetNavbar`). Always run `scripts/import_integrity_checker.py`.
- **Submodule Exports:** Verify submodule paths (such as `@tiptap/react/menus` for `BubbleMenu`) before modifying editor imports.

---

## Definition of Done
- [ ] Blast-radius scan executed across all 7 layers (`scripts/blast_radius_scanner.py`).
- [ ] Pre-mutation snapshot created (`scripts/snapshot_vault.py`).
- [ ] Relative imports validated with zero unresolved paths (`scripts/import_integrity_checker.py`).
- [ ] `npx tsc --noEmit` exits with code 0.
- [ ] Technical documentation synchronized in `.agents/context/documentation/` and `DOCUMENTATION.md`.
