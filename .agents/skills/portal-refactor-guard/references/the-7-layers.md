# 🌐 The 7 Architectural Layers of Meu Portal Mandarim

Every full-stack module or domain entity in this repository connects across seven distinct layers. When refactoring or renaming, inspect and update all seven to prevent runtime divergence.

---

### Layer 1: Database & Storage
- **PostgreSQL Tables (`public.*`):** Stable table definitions, primary keys, foreign keys, triggers (e.g., `generate_*_slug`, `update_*_modtime`).
- **Supabase RLS Policies:** Granular policies distinguishing between `anon` (public access to published records) and `authenticated` (user profile restrictions or `is_admin()` write guards).
- **Storage Buckets (`storage.buckets`):** Public or authenticated buckets containing user media.
  > **CRITICAL GOTCHA:** Any bucket storing rich text assets (such as Tiptap editor uploads) stores absolute public URLs directly inside the database `jsonb` column (e.g., `/storage/v1/object/public/blog-assets/...`). Renaming physical buckets permanently breaks existing media links.

### Layer 2: Server Actions & Cache Tags
- **Server Actions (`app/actions/*`):** Mutation handlers running on Next.js server runtime.
- **Cache Revalidation (`revalidateTag`, `revalidatePath`):**
  - Quasi-static listings (60s TTL): `revalidateTag('<entity>-posts')`.
  - Individual items (300s TTL): `revalidateTag('<entity>-post-${slug}')`.
- **Static Clients:** Using `createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)` inside `unstable_cache` to allow shared CDN caching across users.

### Layer 3: TypeScript Types & Contracts
- **Core Types (`types/*`):** Domain entities (`PublicacaoBiblioteca`, `BibliotecaStatus`).
- **Form Data & Mutation Types:** `Omit<Entity, 'id' | 'created_at'>`.
- **Backward-Compatible Aliases:** Exporting previous type names (`export type PublicacaoBlog = PublicacaoBiblioteca;`) to ensure legacy imports continue functioning without breakages.
- **Database PostgREST Types (`types/database.types.ts`):** Generated contract source of truth.

### Layer 4: UI Components & Node Views
- **Base Components (`app/components/<module>/`):** Cards, lists, viewers.
- **Tiptap Custom Extensions:**
  - `AudioNode.tsx`: Interactive player in edit mode via `ReactNodeViewRenderer`, standard `<audio>` in reader mode.
  - `EditorToolbar.tsx`: Formatting actions, media upload handlers.
  - `TiptapRenderer.tsx`: Client component running `generateHTML()`.
  - Floating menus: `BubbleMenu` imported strictly from `@tiptap/react/menus`.

### Layer 5: App Router & UX
- **Student Pages (`app/dashboard/<module>/`):**
  - Grid listing: `page.tsx`
  - Reader view: `[slug]/page.tsx`
- **Admin Pages (`app/admin/<module>/`):**
  - Overview / management: `page.tsx`
  - Create new item: `nova/page.tsx`
  - Edit existing item: `[id]/page.tsx`
- **Legacy Redirects:** Retaining old routes (e.g., `app/dashboard/blog/page.tsx`) with `redirect('/dashboard/biblioteca')` to preserve external bookmarks and user links.
- **Navigation Components:** Updating `Sidebar.tsx` and dashboard action cards with appropriate Lucide icons and hover animations.

### Layer 6: CSS & Design Tokens
- **Prose & Editor Overrides (`app/globals.css`):**
  - Editor prose: `.<module>-editor-content`
  - Reader prose: `.<module>-reader-content`
  - Media wrapper: `.<module>-cover-wrapper`
  - Table wrapper: `.<module>-table-wrapper`
- **Class Selectors:** Always keep twin selectors during transitions (`.blog-reader-content, .biblioteca-reader-content`) so legacy published content renders identically.

### Layer 7: Documentation & Telemetry
- **Architecture Chapters (`.agents/context/documentation/{chapter}.md`):** Keep numbered chapters accurate (e.g., `11-biblioteca.md`).
- **Workspace Navigation:** Update links in `.agents/context/system-map.md` and `DOCUMENTATION.md`.
- **Database ERD Documentation:** Update table descriptions in `03-database.md`.
- **Activity Log & Telemetry:** Map custom telemetry events in `app/api/admin/activity-log/route.ts` and PostHog ingestion pipelines.
