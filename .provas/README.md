# 📝 Banco de Provas e Materiais Acadêmicos (`.provas/`)

Diretório dedicado ao armazenamento dos materiais de apoio, listas de vocabulário e arquivos de questões geradas em formato JSON para importação direta no portal.

---

## 📁 Estrutura de Pastas

```plaintext
.provas/
├── u1/
│   └── questoes_u1.json             # Gabarito e questões da Unidade 1 (referência)
├── u2/
│   ├── palavras_u2.txt              # Vocabulário ensinado na Unidade 2
│   ├── frases_u2.txt                # Estruturas frasais da Unidade 2
│   ├── ideias_questoes_u2.txt       # Rascunhos e notas pedagógicas
│   └── questoes_u2.json             # Prova gerada pronta para importação no portal
└── u3/                              # Próximas unidades...
    ├── palavras_u3.txt
    └── frases_u3.txt
```

---

## 🚀 Como Criar Provas para Novas Unidades

1. Crie uma pasta para a unidade (ex: `.provas/u3/`).
2. Adicione os arquivos da unidade:
   - `palavras_u3.txt`: Lista de palavras e ideogramas ensinados.
   - `frases_u3.txt`: Lista de frases e padrões gramaticais ensinados.
   - (Opcional) `ideias_questoes_u3.txt`: Observações pedagógicas ou preferências específicas de questões.
3. Peça para a IA:
   > *"Crie a prova da Unidade 3 baseada nos arquivos de .provas/u3/."*
4. A IA utilizará o vocabulário da U3 + vocabulários das unidades anteriores (`u1`, `u2`) como suporte, validará o JSON com `validate_exam.py` e gerará `questoes_u3.json` dentro da pasta `.provas/u3/`.
