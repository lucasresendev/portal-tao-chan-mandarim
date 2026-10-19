---
name: mandarin-i18n
description: >-
  Manage bilingual Mandarin-Portuguese localization, Pinyin tonal diacritics, Hanzi Unicode normalization,
  and dictionary data structures across UI components. Use this skill when formatting Hanzi/Pinyin strings,
  validating tonal marks, or auditing bilingual UI assets. Do NOT use for database schemas (use portal-backend)
  or assessment exam generation (use mandarin-exam-crafter).
compatibility:
  tools: [run_command, view_file, replace_file_content, write_to_file]
  binaries: [python3]
---

## Operational Workflow

### 1. Sinological & Linguistic Standards
- **Chinese Script:** Store and render standard Simplified Chinese characters (Unicode CJK Unified Ideographs `4E00–9FFF`) alongside optional Traditional variants.
- **Pinyin Diacritics:** Render precomposed tone marks (`nǐ hǎo`) rather than numeric tone suffixes (`ni3 hao3`) across all student-facing interfaces.
- **Structured Bilingual Contracts:** Separate Hanzi (`hanzi_simp`, `hanzi_trad`), Pinyin (`pinyin`), and localized glosses (`traducao`) into distinct typed fields.

### 2. Unicode & Phonetic Normalization
- Strip zero-width spaces and control characters before persisting CJK strings.
- Normalize Latin and Portuguese diacritics deterministically using Unicode NFC:
  ```typescript
  const cleanText = rawInput.normalize('NFC').trim();
  ```
- Use `pinyin-pro` for runtime phonetic segmentation and tone extraction:
  ```typescript
  import { pinyin } from 'pinyin-pro';
  const py = pinyin('你好', { toneType: 'symbol' }); // 'nǐ hǎo'
  ```

### 3. Deterministic Verification
Run the bundled i18n linter to detect malformed tone marks or encoding drift:
```bash
python3 scripts/i18n_checker.py .
```

---

## Gotchas & Pitfalls
- Never mix Traditional and Simplified characters within the same `hanzi_simp` field.
- Account for Mandarin polyphones (多音字) such as `行` (`xíng` / `háng`) or `得` (`de` / `dé` / `děi`); prefer explicit dictionary overrides over unverified automatic conversion.
- Ensure font stacks declare explicit CJK fallbacks (`Noto Sans SC`, `PingFang SC`, `Microsoft YaHei`).

---

## Definition of Done
- [ ] Bilingual strings maintain strict field separation between Hanzi, Pinyin, and translation glosses.
- [ ] Pinyin strings use precomposed Unicode tonal diacritics.
- [ ] `python3 scripts/i18n_checker.py .` exits with code 0.
