# Architectural Safety & Pragmatism Matrix

When refactoring a production system, structural purism must never compromise data integrity, performance, or route availability.

---

### The Pragmatism Gate: Physical vs. Conceptual Changes

Before renaming or altering physical database structures or storage buckets, run this 3-question evaluation:

| Question | If YES | Engineering Action |
| :--- | :--- | :--- |
| **1. Are external URLs or file paths stored as absolute strings in JSON payloads?** | **High Risk** | **DO NOT rename physical storage bucket.** Keep bucket name intact. Alias the frontend helpers (`uploadBibliotecaImage` calling bucket `blog-assets`). |
| **2. Does the table have active PostgreSQL triggers, foreign keys, and generated TypeScript types?** | **Moderate Risk** | **DO NOT execute destructive table rename in production.** Create application-level abstraction (`export type PublicacaoBiblioteca = PublicacaoBlog;`) and map routes cleanly. |
| **3. Can the user or external links reach the old URLs?** | **User Friction** | **DO NOT delete old routes.** Implement 307/308 redirects (`redirect('/dashboard/biblioteca')`). |

---

### Key Gotchas Learned from Production

1. **Storage URL Immutability:**
   Rich text editors (Tiptap) serialize image `src` as absolute URLs at upload time. E.g.:
   `https://[project].supabase.co/storage/v1/object/public/blog-assets/images/slug/photo_123.jpg`
   Renaming the bucket to `biblioteca-assets` requires running a regex migration across all `jsonb` table rows. Unless strictly necessary, keeping the bucket name is the pragmatically sound choice.

2. **Relative Import Depths:**
   When creating new nested routes (`app/admin/biblioteca/[id]/page.tsx`), count the directory levels carefully:
   - `[id]` (1) -> `biblioteca` (2) -> `admin` (3) -> `app` (4)
   - To reach `app/components/SetNavbar.tsx`, use `../../../components/SetNavbar`, NOT `../../../../components/SetNavbar`.
   - Always run `python3 scripts/import_integrity_checker.py` before compiling.

3. **Submodule Export Paths:**
   Modern libraries split submodules into subpaths:
   - `@tiptap/react` exports `useEditor`, `EditorContent`.
   - `BubbleMenu` is located in `@tiptap/react/menus`.
   - Always check active usage across the codebase before guessing package exports.

4. **RLS Subquery Permissions:**
   Never call functions restricted to `authenticated` or `admin` inside an RLS policy evaluated by `anon`.
   Always split policies into explicit roles:
   - `TO anon, authenticated USING (status = 'publicado')`
   - `TO authenticated USING (is_admin())`
