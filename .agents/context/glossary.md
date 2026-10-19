# Domain Glossary

## Core Business Entities

| Entity | Description | Database Table / Key Features |
|---|---|---|
| **Alunos** | Students registered in the platform, profile bound to `auth.users`. | `alunos` |
| **Aulas** | Video-lessons, exercises, and PDF material packages. | `aulas` |
| **Dicionário** | Intelligent Chinese vocabulary search. Uses Unicode normalizations and tone strips for fuzzy lookups. Renders `pinyin` with colored accents for tone learning. | `dicionario` (`hanzi_simp`, `hanzi_trad`, `pinyin`, `traducao`, `exemplos`) |
| **Diálogos** | WhatsApp-style messaging simulator. Turn-based machine of states, double blue ticks delay, cultural local time categories. Uses a meta-cognitive button `"Já pensei na resposta"` to force active reading before revealing choices. Distractors show direct grammar feedback on failure. | `dialogos`, `dialogo_linhas`, `progresso_dialogo` |
| **Atividades** | Polymorphic assessment exams. Types: `multipla_escolha`, `ordenacao` (drag-and-drop), `texto_livre`, `audio_upload` (microphone), and `preencher_lacunas` (regex inline parser with mobile stack redundancy). | `atividades` (`estrutura` JSONB) |
| **Registros Dinâmicos** | Student response sheets and grading cards from teachers. Powered by an hybrid dual-layer Auto-Save (Sync Debounce + LocalStorage). | `registros_dinamicos` (`dados` JSONB) |

## Chinese Language Terms
- **Hanzi:** Simplified (`hanzi_simp`) and Traditional (`hanzi_trad`) Chinese characters.
- **Pinyin:** Phonetic representation of Hanzi syllables with tone marks.
- **Tones (1st to 5th):** Flat (Red), Rising (Amber), Dip & Rise (Emerald), Strong Falling (Blue), Neutral (Slate).
