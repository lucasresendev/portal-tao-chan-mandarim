#!/usr/bin/env python3
"""
Mandarin Exam JSON Validator - meu-portal-mandarim
=================================================
Validates generated exam JSON files against portal schema rules and vocabulary whitelist.

Usage:
    python validate_exam.py <path_to_exam.json> [--vocab <path_to_vocab.txt> ...] [--max-points <int>]
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

VALID_QUESTION_TYPES = {
    "multipla_escolha",
    "ordenacao",
    "preencher_lacunas",
    "texto_livre",
    "audio_upload",
}

VALID_SKILLS = {"leitura", "gramatica", "vocabulario", "escuta", "fala", "escrita"}


def load_vocab_whitelist(vocab_paths: list[Path]) -> set[str]:
    """Extract all individual Chinese characters and words from provided vocabulary files."""
    allowed_chars = set()
    for path in vocab_paths:
        if not path.is_file():
            continue
        content = path.read_text(encoding="utf-8")
        # Extract Hanzi characters (Unicode 4E00-9FFF)
        for char in content:
            if "\u4e00" <= char <= "\u9fff":
                allowed_chars.add(char)
    return allowed_chars


def check_hanzi_leakage(text: str, allowed_chars: set[str]) -> list[str]:
    """Find any Hanzi characters in text that are not in the allowed whitelist."""
    unauthorized = []
    for char in text:
        if "\u4e00" <= char <= "\u9fff":
            if char not in allowed_chars:
                unauthorized.append(char)
    return unauthorized


def validate_question(q: dict[str, Any], idx: int, seen_ids: set[str], allowed_chars: set[str] | None) -> list[str]:
    errors = []
    prefix = f"Question #{idx + 1}"

    # 1. ID check
    qid = q.get("id")
    if not qid or not isinstance(qid, str):
        errors.append(f"{prefix}: Missing or invalid 'id'")
    elif qid in seen_ids:
        errors.append(f"{prefix}: Duplicate ID '{qid}'")
    else:
        seen_ids.add(qid)

    # 2. Type check
    qtype = q.get("tipo")
    if qtype not in VALID_QUESTION_TYPES:
        errors.append(f"{prefix}: Invalid 'tipo' '{qtype}'. Must be one of {VALID_QUESTION_TYPES}")

    # 3. Enunciado check
    enunciado = q.get("enunciado", "")
    if not enunciado or not isinstance(enunciado, str):
        errors.append(f"{prefix}: Missing or empty 'enunciado'")

    # 4. Points check
    pts = q.get("pontuacao_maxima")
    if pts is None or not isinstance(pts, (int, float)) or pts <= 0:
        errors.append(f"{prefix}: Invalid 'pontuacao_maxima' ({pts})")

    # 5. Type-specific checks
    if qtype == "multipla_escolha":
        opcoes = q.get("opcoes", [])
        if not isinstance(opcoes, list) or len(opcoes) < 2:
            errors.append(f"{prefix}: 'multipla_escolha' must have at least 2 'opcoes'")
        else:
            opt_ids = set()
            for opt in opcoes:
                oid = opt.get("id")
                if not oid or oid in opt_ids:
                    errors.append(f"{prefix}: Invalid or duplicate option ID '{oid}'")
                opt_ids.add(oid)

            correct = q.get("respostas_corretas_ids", [])
            if not isinstance(correct, list) or len(correct) == 0:
                errors.append(f"{prefix}: 'respostas_corretas_ids' must be a non-empty array")
            else:
                for cid in correct:
                    if cid not in opt_ids:
                        errors.append(f"{prefix}: Correct ID '{cid}' not found in options")

    elif qtype == "ordenacao":
        itens = q.get("itens_para_ordenar", [])
        if not isinstance(itens, list) or len(itens) < 2:
            errors.append(f"{prefix}: 'ordenacao' must have at least 2 'itens_para_ordenar'")
        else:
            item_ids = {it.get("id") for it in itens if it.get("id")}
            ordem = q.get("ordem_correta_ids", [])
            if not isinstance(ordem, list) or len(ordem) != len(itens):
                errors.append(f"{prefix}: 'ordem_correta_ids' length must match 'itens_para_ordenar'")
            for oid in ordem:
                if oid not in item_ids:
                    errors.append(f"{prefix}: Item ID '{oid}' in 'ordem_correta_ids' not in itens")

    elif qtype == "preencher_lacunas":
        texto_lacunas = q.get("texto_com_lacunas", "")
        if "[___]" not in texto_lacunas:
            errors.append(f"{prefix}: 'preencher_lacunas' must contain '[___]' in 'texto_com_lacunas'")
        lacunas_count = texto_lacunas.count("[___]")
        respostas = q.get("respostas_corretas_por_lacuna", {})
        if not isinstance(respostas, dict) or len(respostas) != lacunas_count:
            errors.append(f"{prefix}: 'respostas_corretas_por_lacuna' count ({len(respostas)}) does not match '[___]' count ({lacunas_count})")

    elif qtype == "texto_livre":
        resposta_esperada = q.get("resposta_esperada")
        if not resposta_esperada:
            errors.append(f"{prefix}: 'texto_livre' should include 'resposta_esperada'")

    # 6. Vocab whitelist check (if whitelist provided)
    if allowed_chars:
        full_text = json.dumps(q, ensure_ascii=False)
        unauthorized = check_hanzi_leakage(full_text, allowed_chars)
        if unauthorized:
            unique_unauth = sorted(set(unauthorized))
            errors.append(f"{prefix}: Unauthorized Hanzi detected: {', '.join(unique_unauth)}")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate Mandarin Exam JSON")
    parser.add_argument("exam_json", type=Path, help="Path to exam JSON file")
    parser.add_argument("--vocab", type=Path, nargs="*", default=[], help="Vocabulary txt files for whitelist audit")
    parser.add_argument("--expected-points", type=int, default=None, help="Expected total points sum")
    args = parser.parse_args()

    if not args.exam_json.is_file():
        print(f"[FAIL] Exam file not found: {args.exam_json}", file=sys.stderr)
        return 1

    try:
        with open(args.exam_json, "r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as exc:
        print(f"[FAIL] Invalid JSON syntax: {exc}", file=sys.stderr)
        return 1

    if not isinstance(data, list) or len(data) == 0:
        print("[FAIL] Exam root must be a non-empty array of question objects.", file=sys.stderr)
        return 1

    allowed_chars = None
    if args.vocab:
        allowed_chars = load_vocab_whitelist(args.vocab)
        # Always allow common punctuation and structural formatting chars
        allowed_chars.update(set("，。！？、：；“”‘’（）《》"))
        print(f"[INFO] Loaded vocabulary whitelist ({len(allowed_chars)} unique characters).")

    all_errors = []
    seen_ids: set[str] = set()
    total_points = 0

    for idx, q in enumerate(data):
        if not isinstance(q, dict):
            all_errors.append(f"Question #{idx + 1} is not a valid JSON object")
            continue
        total_points += q.get("pontuacao_maxima", 0)
        errors = validate_question(q, idx, seen_ids, allowed_chars)
        all_errors.extend(errors)

    print("\n" + "=" * 60)
    print(f"Exam Validation Report: {args.exam_json.name}")
    print("=" * 60)
    print(f"Total Questions: {len(data)}")
    print(f"Total Points:    {total_points}")

    if args.expected_points and total_points != args.expected_points:
        all_errors.append(f"Total points sum ({total_points}) does not match expected ({args.expected_points})")

    if all_errors:
        print(f"\n[FAIL] Found {len(all_errors)} issues:")
        for err in all_errors:
            print(f"  - {err}")
        print("=" * 60 + "\n")
        return 1

    print("\n[PASS] Exam JSON is 100% valid and ready for portal import!")
    print("=" * 60 + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
