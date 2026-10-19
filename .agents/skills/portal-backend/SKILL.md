---
name: portal-backend
description: >-
  Architect and audit Supabase PostgreSQL schemas, Row-Level Security (RLS) policies, Next.js Server Actions,
  storage path sanitization, and API route handlers. Use this skill when modifying database migrations,
  authoring Server Actions, or validating backend data contracts. Do NOT use for frontend UI styling
  (use portal-frontend) or exam content generation (use mandarin-exam-crafter).
compatibility:
  tools: [run_command, view_file, replace_file_content, write_to_file]
  binaries: [python3, npx]
---

## Operational Workflow

### 1. PostgreSQL Schema & Row-Level Security (RLS)
- **Naming & Keys:** Use `snake_case` for tables and columns. Primary keys default to `uuid default gen_random_uuid()`. Foreign keys require explicit covering indexes and cascading rules (`ON DELETE CASCADE` or `ON DELETE SET NULL`).
- **Mandatory RLS:** Enable Row-Level Security on every table in the `public` schema.
- **InitPlan Optimization:** Wrap `auth.uid()` and `auth.role()` in scalar subqueries to evaluate once per query rather than per row:
  ```sql
  ALTER TABLE public.progresso_aluno ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Students read own progress"
  ON public.progresso_aluno FOR SELECT
  USING ((select auth.uid()) = aluno_id);

  CREATE POLICY "Students update own progress"
  ON public.progresso_aluno FOR UPDATE
  USING ((select auth.uid()) = aluno_id)
  WITH CHECK ((select auth.uid()) = aluno_id);
  ```
- **Function Hardening:** Define `SET search_path = public, extensions;` on all PostgreSQL functions. Restrict trigger and administrative functions by revoking public execution privileges:
  ```sql
  REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
  ```
- **Typed Supabase Clients:** Import clients strictly from `@/lib/supabase/`:
  - `lib/supabase/client.ts`: Browser client singleton.
  - `lib/supabase/server.ts`: Server Component / Route Handler client binding `await cookies()`. Verify identity via `getUser()`.
  - `lib/supabase/admin.ts`: Service-role client for privileged Server Actions. Never import in client bundles.

### 2. Server Actions & Boundary Validation
- **Schema Validation:** Validate all incoming payloads at the boundary before executing database mutations:
  ```typescript
  'use server';
  import { z } from 'zod';

  const SubmitAnswerSchema = z.object({
    examId: z.string().uuid(),
    questionId: z.string().min(1),
    selectedAnswer: z.string().min(1),
  });
  ```
- **Structured Responses:** Return deterministic result envelopes (`{ success?: boolean; error?: string }`) rather than throwing unhandled exceptions across the serialization boundary.
- **Session Recovery:** Handle `TOKEN_REFRESH_FAILED` in proxy/middleware by clearing stale auth cookies and redirecting cleanly to `/login`.

### 3. Deterministic Storage Sanitization
Sanitize all user-supplied filenames and path segments before uploading to object storage:
```typescript
export function sanitizeStorageFileName(rawName: string): string {
  return rawName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '_')
    .slice(0, 60);
}
```

### 4. Verification & Contract Auditing
Run the bundled verification suite after backend modifications:
```bash
python3 scripts/schema_validator.py .
python3 scripts/api_validator.py .
npx tsc --noEmit
```

---

## Gotchas & Pitfalls
- Never execute unparameterized SQL strings; always use typed query builders or parameterized RPC calls.
- Public `anon` RLS policies must never invoke helper functions restricted to the `authenticated` role.
- When updating database tables or policies, synchronize `.agents/context/documentation/03-database.md` and `types/database.types.ts`.

---

## Definition of Done
- [ ] Schema changes accompanied by versioned SQL migration and subquery-wrapped RLS policies (`(select auth.uid())`).
- [ ] Foreign keys backed by covering indexes.
- [ ] Server Actions validate inputs and enforce authorization checks.
- [ ] `python3 scripts/schema_validator.py .` and `npx tsc --noEmit` pass with exit code 0.
