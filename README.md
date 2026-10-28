<div align="center">

  🇧🇷 **[Versão em Português](README.pt-BR.md)** · 🇨🇳 **[中文说明](README.zh-CN.md)**
  <br>

  # 🏮 Portal Tao Ch'an Mandarim

  ### **An interactive learning platform designed for Brazilian Mandarin students, combining video lessons, FSRS v4.5 spaced repetition flashcards, a tonal dictionary, turn-based audio dialogue simulation, and multi-format interactive exams.**

  [![Live Demo](https://img.shields.io/badge/Live_Demo-mandarim.lucasresende.com-8a1818?style=for-the-badge&logo=cloudflare&logoColor=white)](https://mandarim.lucasresende.com)
  [![Next.js](https://img.shields.io/badge/Next.js-16.4-000000?style=for-the-badge&logo=next.js&logoColor=white)](#)
  [![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](#)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](#)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](#)
  [![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_%2B_RLS-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](#)

  [🔗 **Live Demo (`mandarim.lucasresende.com`)**](https://mandarim.lucasresende.com) · [📖 **Technical Documentation (15 Chapters)**](DOCUMENTATION.md) · [🤖 **Agentic Architecture**](AGENTS.md)

</div>

---

## 📌 Overview & The Story Behind the Project

Teaching and learning Mandarin Chinese as a Portuguese speaker involves pedagogical challenges that generic course platforms rarely solve. Volunteering as a Mandarin teacher at the **Tao Ch'an Temple** (*Templo Tao Ch'an*), while transitioning from a background in **Marketing** and starting my degree in **Systems Analysis and Development (Fatec)**, I experienced these friction points firsthand every week alongside the students:

### ⚠️ Key Pedagogical & Operational Challenges
* **Fragmented Study Workflow:** Students had to juggle YouTube links for recorded classes, Google Drive folders for PDF handouts, WhatsApp groups for pronunciation audio, and external flashcard apps with steep configuration curves.
* **The Tonal & Character Barrier:** Without visual reinforcement of Mandarin's 4 tones (plus the neutral tone) and daily active recall, students quickly forgot *Hanzi* characters and confused tonal contours (*mā, má, mǎ, mà*).
* **Speaking Anxiety:** Beginning students often felt shy practicing pronunciation out loud or lacked structured turn-based conversational practice between weekly live classes.
* **Manual Assessment Overhead:** Creating, grading, and giving individualized audio and written feedback on unit exams across dozens of students consumed hours of volunteer teachers' time.

### 💡 The Solution
**Portal Tao Ch'an Mandarim** was built to unify the entire learning lifecycle into a single, mobile-first web platform tailored specifically for Mandarin pedagogy. Students watch lessons, consult a lesson-unlocked tonal dictionary, review flashcards powered by the **FSRS v4.5 algorithm**, practice simulated dialogues by recording their own voice in the browser, and take interactive unit exams, while teachers manage curriculum, track analytics, and grade oral and written submissions from a dedicated **Laoshi (Teacher) Panel**.

---

## 🖼️ Platform Walkthrough & Screenshots

### 1. Instant Dual-Role Sandbox Login (`/login`)
Minimalist authentication screen featuring one-click **Aluno** (Student) and **Professor** (Teacher) access inside a unified portfolio demo card, along with a direct link to this repository.

<div align="center">
  <img src="public/docs/screenshots/01-login-demo.png" alt="Login Screen with Aluno and Professor Buttons" width="100%" />
</div>

### 2. Student Dashboard (`/dashboard`)
Displays overall course progress, an active **FSRS study streak banner**, quick access to all 5 core learning modules, and a smart collapsible stack of upcoming and completed video lessons.

<div align="center">
  <img src="public/docs/screenshots/02-student-dashboard.png" alt="Student Dashboard" width="100%" />
</div>

### 3. Smart Tonal Dictionary (`/dashboard/dicionario`)
Vocabulary is progressively unlocked as the student completes lessons. Every entry displays Simplified and Traditional *Hanzi*, syllable-by-syllable **tonal color-coded Pinyin**, native audio playback, contextual example sentences, and cultural notes.

<div align="center">
  <img src="public/docs/screenshots/03-smart-dictionary.png" alt="Smart Tonal Dictionary" width="100%" />
</div>

### 4. FSRS v4.5 Spaced Repetition Flashcards (`/dashboard/dicionario/srs`)
Built-in spaced repetition engine using `ts-fsrs` (Free Spaced Repetition Scheduler v4.5), complete with daily queue distribution (*New*, *Learning*, *Review*), a GitHub-style study frequency heatmap, and bi-directional cards (*Hanzi → Meaning* and *Prompt → Production*).

<div align="center">
  <img src="public/docs/screenshots/04-srs-flashcards.png" alt="FSRS Spaced Repetition Dashboard and Heatmap" width="100%" />
</div>

### 5. Turn-Based Dialogue Simulator (`/dashboard/simulador`)
A chat-inspired conversational simulator where students read and listen to a prompt from the interlocutor, formulate their response, record their own voice via the browser's `MediaStream` API, and select the appropriate Mandarin reply.

<div align="center">
  <img src="public/docs/screenshots/05-dialogue-simulator.png" alt="Interactive Dialogue Simulator" width="100%" />
</div>

### 6. Interactive Multi-Format Exam Engine (`/dashboard/atividades/[id]`)
Supports 9 distinct question formats, including multiple choice, tonal Pinyin input, sentence drag-and-drop (`@dnd-kit`), character ordering, listening comprehension, and **oral pronunciation recording**, with real-time cloud auto-save.

<div align="center">
  <img src="public/docs/screenshots/06-exam-engine.png" alt="Interactive Multi-Format Exam Engine" width="100%" />
</div>

### 7. Teacher / Laoshi Control Panel (`/admin`)
Provides real-time engagement telemetry (PostHog integration), platform-wide KPIs, recent student sessions, an audit log, and a symmetrical 7-module management grid.

<div align="center">
  <img src="public/docs/screenshots/07-admin-dashboard.png" alt="Teacher Control Panel" width="100%" />
</div>

### 8. Hybrid Automatic & Manual Exam Grading (`/admin/atividades/entregas/...`)
Objective questions are graded automatically upon submission, while open-ended and audio pronunciation questions are queued for the teacher to listen, adjust partial or full points, and leave per-question pedagogical feedback.

<div align="center">
  <img src="public/docs/screenshots/08-admin-exam-grading.png" alt="Teacher Exam Grading Interface" width="100%" />
</div>

---

## 🧠 Agentic Software Engineering & Methodology

I believe in being transparent about my journey: coming from a **Marketing** background and being right at the **beginning of my Systems Analysis and Development (ADS) degree**, I did not yet have the years of traditional coding experience required to write a 16-table full-stack React 19, PostgREST, and FSRS application line by line from scratch. However, my students at the Tao Ch'an Temple had a real, immediate need.

To bridge that gap responsibly, I approached the project through **Agentic Software Engineering & Context Architecture**, acting as Product Owner, Requirements Analyst, Context Architect, and QA Engineer, while orchestrating AI coding agents under strict architectural guardrails and deterministic validation scripts.

Rather than relying on unstructured *"vibe coding"* (which quickly breaks down in complex applications), I engineered a **3-Tier Agentic System** inside the repository:

### 1. Living Architectural Context (`.agents/context/` & `DOCUMENTATION.md`)
Before generating or refactoring code, agents load a structured knowledge base ([`AGENTS.md`](AGENTS.md), [`.agents/context/system-map.md`](.agents/context/system-map.md), and 15 deep-dive technical chapters in [`.agents/context/documentation/`](.agents/context/documentation/)). This guarantees single-source-of-truth alignment on database schemas, Row-Level Security (RLS) policies, React Query caching tiers, and audio stream cleanup lifecycles.

### 2. Modular Domain Skills (`.agents/skills/`)
Using the **3-Tier Progressive Disclosure** pattern (`SKILL.md` → `references/` → `scripts/`), I structured 5 specialized skills that equip the AI agent with domain rules on demand:
* **[`mandarin-exam-crafter`](.agents/skills/mandarin-exam-crafter/SKILL.md):** Enforces cumulative HSK vocabulary whitelists (preventing exams from using words not yet taught in the student's unit), tonal distractors, and strict 100-point scoring parity.
* **[`mandarin-i18n`](.agents/skills/mandarin-i18n/SKILL.md):** Governs Unicode NFC normalization, syllable-level tonal Pinyin parsing, and bilingual PT-BR/Mandarin dictionary payloads.
* **[`portal-frontend`](.agents/skills/portal-frontend/SKILL.md):** Enforces Next.js 16 App Router Server/Client boundaries, Tailwind CSS v4 tokens, `MediaRecorder` hardware track cleanup, and WCAG AA contrast.
* **[`portal-backend`](.agents/skills/portal-backend/SKILL.md):** Governs Supabase PostgreSQL migrations, RLS policies (`is_admin()`), Server Actions, and deterministic storage filename sanitization.
* **[`portal-refactor-guard`](.agents/skills/portal-refactor-guard/SKILL.md):** Coordinates cross-layer domain refactorings across all 7 application layers (Database, Actions, Types, Components, Routes, Styles, Docs).

### 3. Deterministic Python QA Gates (`scripts/`)
Because LLMs are probabilistic, **validation must be deterministic**. Every skill bundles standalone Python CLI scripts that inspect the codebase and block invalid changes:
* `validate_exam.py`: Audits exam JSONs for exact 100-point totals, question schemas, and out-of-vocabulary *Hanzi*.
* `pinyin_auditor.py`: Scans source files and JSON datasets for malformed Pinyin diacritics and unnormalized Unicode sequences.
* `schema_validator.py`: Audits SQL migrations for unindexed foreign keys, missing `ENABLE ROW LEVEL SECURITY`, and unsafe storage paths.
* `blast_radius_scanner.py`: Maps symbol dependencies across all 7 architectural layers before any rename or refactor.
* `checklist.py`: Master verification runner executed before commits.

---

## 🧪 Zero-Backend Portfolio Sandbox Architecture

To protect the privacy of real students in production while allowing anyone to test the complete application (including database mutations, audio recording, FSRS flashcard scheduling, and teacher grading) **without spinning up an external Supabase project**, this portfolio edition includes a custom **In-Browser PostgREST & Auth Sandbox** ([`lib/demo/supabaseSandbox.ts`](lib/demo/supabaseSandbox.ts)):

* **Transparent `fetch` Interception:** Intercepts requests to `*.supabase.co` across `/auth/v1`, `/rest/v1`, and `/storage/v1` in both Next.js Server Components and Client Components.
* **PostgREST Query Engine in TypeScript:** Supports filtering (`eq`, `neq`, `in`, `not`, `or`, `ilike`), relational joins (`select=*,aulas(titulo)`), `Prefer: count=exact` (`Content-Range` headers), upserts (`on_conflict`), and RPC calls (`rpc/is_admin`).
* **Persistent Browser State & Instant Role Switching:** Seeds realistic anonymized course data from [`lib/demo/seedData.json`](lib/demo/seedData.json) into `localStorage`, and includes a floating **Portfolio Demo Bar** to switch between **Student Mode (Maria Fernanda)** and **Teacher Mode (Prof. Lucas)** or reset the database with a single click.

---

## 🛠️ Technology Stack

| Layer | Technologies & Libraries |
| :--- | :--- |
| **Framework & UI** | [Next.js 16.4 (App Router)](https://nextjs.org/), [React 19.2](https://react.dev/), [TypeScript 5](https://www.typescriptlang.org/), [Tailwind CSS v4](https://tailwindcss.com/) |
| **State & Data Fetching** | [TanStack React Query v5](https://tanstack.com/query/latest) (Optimistic UI updates & tiered `staleTime` caching) |
| **Backend & Auth** | [Supabase](https://supabase.com/) (PostgreSQL, Row-Level Security, Auth Helpers, Storage) + Custom Zero-Backend Sandbox |
| **Spaced Repetition & Drag-and-Drop** | [`ts-fsrs` v5 (FSRS v4.5)](https://github.com/open-spaced-repetition/ts-fsrs), [`@dnd-kit`](https://dndkit.com/) (Accessible tactile sorting) |
| **Rich Text & Media** | [Tiptap Editor](https://tiptap.dev/), Browser `MediaRecorder` / `MediaStream` API, [Framer Motion v12](https://motion.dev/) |
| **Observability & Quality** | [PostHog](https://posthog.com/) (Product Analytics), Python 3.12 Deterministic QA Scripts |

---

## 📂 Project Structure

```text
.
├── .agents/
│   ├── context/               # System map, Mandarin glossary, and 15 architecture chapters
│   ├── rules/                 # Always-on workspace engineering rules (GEMINI.md)
│   ├── scripts/               # Master verification suite (checklist.py)
│   └── skills/                # 5 modular Agent Skills + deterministic Python validators
├── app/
│   ├── admin/                 # Teacher (Laoshi) Panel: lessons, students, exams, grading, blog
│   ├── api/                   # Route handlers (PostHog analytics proxy, SRS endpoints)
│   ├── components/            # Shared UI components, Navbar, Sidebar, PortfolioDemoBar
│   ├── dashboard/             # Student Portal: lessons, dictionary, FSRS flashcards, simulator, exams
│   ├── demo/                  # Simulated handout/material viewer for portfolio mode
│   └── login/                 # Dual-mode authentication (Supabase Auth + 1-click Demo Sandbox)
├── lib/
│   ├── demo/                  # Zero-backend Supabase/PostgREST emulator & anonymized seedData.json
│   ├── supabase/              # Typed Client, Server Component, and Service Role Supabase clients
│   ├── pinyinUtils.ts         # Tonal Pinyin parser, syllable splitter, and color mapper
│   └── storageUtils.ts        # Deterministic storage key sanitizer
├── public/
│   ├── demo-storage/          # Static audio & image assets for the offline-capable demo
│   └── docs/screenshots/      # High-resolution platform screenshots
├── supabase/
│   └── migrations/            # Complete PostgreSQL schema, triggers, and RLS policies
├── types/                     # Strict TypeScript interfaces for DB tables, exams, and FSRS
├── AGENTS.md                  # Agentic router and workspace instructions
├── DOCUMENTATION.md           # Consolidated 15-chapter technical documentation
├── README.md                  # English documentation (primary)
└── README.pt-BR.md            # Portuguese documentation
```

---

## 🚀 How to Run Locally

Thanks to the **Zero-Backend Portfolio Sandbox**, you can clone and run the entire platform immediately **without configuring any external Supabase database or API keys**:

1. **Clone the repository and install dependencies:**
   ```bash
   git clone https://github.com/lucasresendev/portal-tao-chan-mandarim.git
   cd portal-tao-chan-mandarim
   npm install
   ```

2. **Start the development server (Demo Mode is enabled by default via `.env.example`):**
   ```bash
   cp .env.example .env.local
   npm run dev
   ```

3. **Explore the platform at `http://localhost:3000`:**
   * Click **Aluno** to test lessons, FSRS flashcards, the dialogue simulator, and unit exams as *Maria Fernanda*.
   * Click **Professor** (or use the bottom-right **ModoPortfólio** bar) to inspect the teacher dashboard, student progress, and exam grading as *Prof. Lucas*.

4. **(Optional) Run the Agentic QA Verification Suite:**
   ```bash
   python3 .agents/scripts/checklist.py .
   ```

---

## 📄 License & Attribution

This project is licensed under the **[PolyForm Noncommercial License 1.0.0](LICENSE)**.

* **Permitted Uses:** Personal study, academic research, noncommercial educational purposes, and portfolio evaluation.
* **Commercial Exclusions:** Any commercial use, reselling, or commercial SaaS deployment is strictly prohibited without prior written permission.
* **Creator & Architect:** [Lucas Resende](https://github.com/lucasresendev)
* **Attribution Guidelines:** See [ATTRIBUTION.md](ATTRIBUTION.md) for citation and attribution details.

---

## 👤 Author

<div align="center">

  ### **Lucas Resende** (`@lucasresendev`)
  *Software Developer & Systems Analysis and Development Student (Fatec Taubaté)*

  [![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com/in/lucasresendev)
  [![Web Portfolio & Blog](https://img.shields.io/badge/Web_Portfolio-0f4c80?style=for-the-badge&logo=astro&logoColor=white)](https://lucasresende.com)
  [![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/lucasresendev)

</div>
