---
name: portal-frontend
description: >-
  Develop and audit Next.js 16 App Router views, React 19 Server/Client boundaries, Tailwind CSS v4 tokens,
  Framer Motion v12 transitions, and WCAG AA accessibility. Use when building UI components, study widgets,
  or client state caches. Do NOT use for database schemas or Server Actions (use portal-backend) or exams (use mandarin-exam-crafter).
compatibility:
  tools: [run_command, view_file, replace_file_content, write_to_file]
  binaries: [python3, npx]
---

## Operational Workflow

### 1. Next.js 16 & React 19 Component Boundaries
- **Server Components by Default:** Execute initial data fetches on the server to keep credentials and heavy dependencies out of client bundles.
- **Leaf Client Components (`'use client'`):** Restrict client directives to interactive leaves requiring state, browser APIs (`MediaRecorder`, `AudioContext`), or event listeners.
- **Parallel Fetching & Streaming:**
  - Parallelize independent server queries with `Promise.all()`.
  - Wrap asynchronous subtrees in `<Suspense>` boundaries with skeleton fallbacks.
- **Async Route Params:** Always `await params` and `await searchParams` in Next.js 16 asynchronous page and layout components.

### 2. Tailwind CSS v4 Token Architecture
- Consume semantic design tokens declared in `app/globals.css` (`@theme` block) rather than arbitrary hex values.
- Use container queries (`@container`) and responsive grid primitives for modular dashboard cards and study interfaces.
- Compose conditional class names cleanly without excessive `@apply` rules.

### 3. Interaction Design, Hardware Lifecycle & Accessibility
- **Typography:** Pair geometric sans-serif UI text with high-legibility CJK fonts (`Noto Sans SC`, `PingFang SC`) for Hanzi rendering.
- **Motion Physics:** Use spring transitions in Framer Motion v12 (`transition={{ type: 'spring', stiffness: 400, damping: 30 }}`) for modals, drawers, and layout shifts.
- **WCAG AA Compliance:**
  - Provide explicit `aria-label` or associated `<label>` elements for all form controls and icon buttons.
  - Maintain visible keyboard focus indicators (`focus-visible:ring-2`).
- **Media Stream Cleanup:** Always stop active microphone tracks when recording finishes or components unmount:
  ```typescript
  stream.getTracks().forEach((track) => track.stop());
  ```

### 4. TanStack Query v5 Caching Strategy
- **Quasi-static resources (`aulas`, `dicionario`, `dialogos`):** Configure `staleTime: 1000 * 60 * 15` (15 minutes) with targeted invalidation on admin mutations.
- **Dynamic telemetry & progress (`progresso`, `srs`):** Configure `staleTime: 1000 * 30` or lower with optimistic UI updates (`onMutate` + rollback on error).

### 5. Deterministic Auditing
Run the bundled frontend verification scripts before completing UI tasks:
```bash
python3 scripts/accessibility_checker.py .
python3 scripts/ux_audit.py .
npx tsc --noEmit
```

---

## Gotchas & Pitfalls
- Never query `alunos.email` directly on the client; user email addresses live in `auth.users` or privileged server actions.
- Reuse the browser client singleton (`@/lib/supabase/client`) to avoid concurrent `Navigator LockManager` contention.
- Guard auth redirect listeners against triggering `window.location.href = '/login'` when already on `/login`.

---

## Definition of Done
- [ ] Server and Client Component boundaries cleanly separated.
- [ ] Media streams and event listeners deterministically cleaned up on unmount.
- [ ] Tailwind v4 theme tokens applied consistently across mobile and desktop breakpoints.
- [ ] `python3 scripts/accessibility_checker.py .` and `npx tsc --noEmit` pass with exit code 0.
