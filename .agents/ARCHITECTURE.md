# Workspace Architecture

## Overview
Arquitetura enxuta, modular e de alta densidade customizada para a plataforma de aprendizado de Mandarim (`meu-portal-mandarim`).

```plaintext
.agents/
├── ARCHITECTURE.md          # Mapa de arquitetura do sistema e catálogo
├── context/                 # FONTE ÚNICA DA VERDADE (Substitui memory/)
│   ├── system-map.md        # Mapa arquitetural: stack, audio lifecycle, DnD, caching
│   ├── glossary.md          # Glossário do domínio Mandarim, HSK e convenções
│   └── documentation/       # 15 capítulos detalhados (DB, Auth, SRS, Exames, etc.)
├── rules/
│   └── GEMINI.md            # Regras P0 do repositório (sem redundâncias com globais)
├── skills/                  # 4 Skills Essenciais de Alto Valor
│   ├── mandarin-exam-crafter/ # Motor pedagógico e validação de provas JSON
│   ├── mandarin-i18n/         # Pinyin tonal, Hanzi e normalização linguística
│   ├── portal-frontend/       # Next.js 16, React 19, Tailwind v4, Framer Motion, a11y
│   └── portal-backend/        # Supabase PostgreSQL, RLS, Server Actions, Storage, QA
├── scripts/                 # Checklist de validação e testes
└── templates/               # Templates úteis de tarefas e handoff
```

---

## Skills do Projeto (4)

| Skill | Domínio / Escopo | Scripts Bundled |
|---|---|---|
| `mandarin-exam-crafter` | Geração e validação estrita de provas JSON, balanceamento 100 pts, whitelist HSK cumulativa | `validate_exam.py` |
| `mandarin-i18n` | Pinyin com acentos diacríticos, Hanzi simplificado, normalização UTF-8 e glossários | `i18n_checker.py` |
| `portal-frontend` | Next.js 16 App Router, React 19 boundaries, Tailwind v4 `@theme`, micro-animações, WCAG AA | `accessibility_checker.py`, `ux_audit.py`, `seo_checker.py`, `react_performance_checker.py` |
| `portal-backend` | Supabase PostgreSQL, RLS policies, Server Actions com Zod, sanitização de storage, QA | `schema_validator.py`, `api_validator.py`, `security_scan.py`, `dependency_analyzer.py`, `test_runner.py`, `lint_runner.py`, `type_coverage.py` |

---

## Fonte da Verdade: `.agents/context/`

Toda a inteligência do sistema reside em `.agents/context/`:
1. `system-map.md`: Guia de arquitetura, ciclo do microfone, calibração do `@dnd-kit`, convenções de cache TanStack Query.
2. `glossary.md`: Padrões do idioma chinês e terminologias de aprendizado.
3. `documentation/`: 15 capítulos técnicos cobrindo detalhadamente cada subsistema.
