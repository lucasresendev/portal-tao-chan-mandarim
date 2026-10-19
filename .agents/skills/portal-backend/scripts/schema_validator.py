#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""
Schema Validator - Supabase Database & Codebase Contract Validator
Validates database schema alignment, table/column references in TypeScript/JavaScript,
and RPC calls against types/database.types.ts.

Usage:
    python3 schema_validator.py <project_path>

Checks:
    - Schema Types: Existence and validity of types/database.types.ts
    - Tables: Validates .from('table') against known Database['public']['Tables']
      (Ignores Array.from and supabase.storage.from)
    - Columns: Validates flat .select('col1, col2') against table columns
    - RPCs: Validates .rpc('function_name') against Database['public']['Functions']
    - Suppression: Honors '// @schema-validator-ignore: <reason>'
    - Metrics: Reports VALID, INVALID, UNRESOLVED, and SUPPRESSED counts with coverage
"""

from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class ValidationStats:
    valid: int = 0
    invalid: int = 0
    unresolved: int = 0
    suppressed: int = 0
    details: list[str] = field(default_factory=list)


def parse_database_types(types_path: Path) -> tuple[dict[str, list[str]], list[str]]:
    """Extract tables, their columns, and RPC functions from database.types.ts."""
    if not types_path.is_file():
        raise FileNotFoundError(f"Tipos do Supabase não encontrados em: {types_path}")

    content = types_path.read_text(encoding="utf-8")

    # Extrai bloco de tabelas
    tables_block = re.search(r"Tables:\s*\{([^}]+(?:\n\s*\{[^}]*\})*.*?)\n\s*Views:", content, re.DOTALL)
    tables: dict[str, list[str]] = {}

    if tables_block:
        table_matches = re.finditer(r"(\w+):\s*\{\s*Row:\s*\{([^}]+)\}", tables_block.group(1))
        for tm in table_matches:
            tname = tm.group(1)
            rblock = tm.group(2)
            cols: list[str] = []
            for line in rblock.split("\n"):
                line = line.strip()
                if ":" in line and not line.startswith("//"):
                    col_name = line.split(":")[0].strip().strip('"').strip("'")
                    if col_name and not col_name.startswith("/*"):
                        cols.append(col_name)
            tables[tname] = cols

    # Extrai funções (RPCs)
    funcs_block = re.search(r"Functions:\s*\{([^}]+)\}", content)
    funcs: list[str] = []
    if funcs_block:
        funcs = re.findall(r"(\w+):\s*\{\s*Args:", funcs_block.group(1))

    return tables, funcs


def clean_column_token(token: str) -> str | None:
    """Normalize a column token, stripping aliases and ignoring joins/aggregations."""
    token = token.strip()
    if not token or token == "*":
        return None

    # Ignora joins relacionais / subconsultas: ex: aulas(...) ou aulas!inner(...)
    if "(" in token or ")" in token:
        return None

    # Se tiver alias (alias:coluna_real), pega a coluna real
    if ":" in token:
        parts = token.split(":")
        if len(parts) == 2:
            token = parts[1].strip()

    # Ignora modificadores de cast Postgres ex: col::text
    if "::" in token:
        token = token.split("::")[0].strip()

    # Se contiver modificadores especiais ou espaços residuais, ignora
    if "!" in token or " " in token:
        return None

    return token


def extract_select_columns(line: str) -> list[str]:
    """Extrai estritamente as colunas do primeiro argumento string de um .select(...)."""
    # Ex: .select('id, nome', { count: 'exact' }) -> 'id, nome'
    m = re.search(r"\.select\(\s*([`'\"])(.*?)\1", line)
    if not m:
        return []
    first_arg = m.group(2)
    # Divide por vírgulas que não estejam dentro de parênteses (ex: fn(a, b))
    tokens = re.split(r",(?![^(]*\))", first_arg)
    cols: list[str] = []
    for t in tokens:
        col = clean_column_token(t)
        if col:
            cols.append(col)
    return cols


def validate_file(
    file_path: Path,
    project_path: Path,
    known_tables: dict[str, list[str]],
    known_funcs: list[str],
    table_stats: ValidationStats,
    col_stats: ValidationStats,
    rpc_stats: ValidationStats,
) -> int:
    """Inspects a single source file for Supabase queries and validates them."""
    rel_path = str(file_path.relative_to(project_path))
    content = file_path.read_text(encoding="utf-8", errors="ignore")
    lines = content.splitlines()
    calls_found = 0

    for idx, line in enumerate(lines):
        line_num = idx + 1
        stripped = line.strip()

        # Checa escape hatch com motivo obrigatório
        has_ignore = "@schema-validator-ignore" in line
        if not has_ignore and idx > 0 and "@schema-validator-ignore" in lines[idx - 1]:
            has_ignore = True
            ignore_line = lines[idx - 1]
        else:
            ignore_line = line

        if has_ignore:
            m_reason = re.search(r"@schema-validator-ignore:\s*(\S.*)", ignore_line)
            if not m_reason or not m_reason.group(1).strip():
                table_stats.invalid += 1
                table_stats.details.append(
                    f"{rel_path}:{line_num} - Ignorado sem justificativa válida. Formato exigido: // @schema-validator-ignore: <motivo>"
                )
                continue
            else:
                reason = m_reason.group(1).strip()
                table_stats.suppressed += 1
                table_stats.details.append(f"{rel_path}:{line_num} - [SUPPRESSED] {reason}")
                continue

        # Ignora chamadas nativas de JavaScript como Array.from(...) e Supabase Storage (storage.from(...))
        clean_line = line
        if "Array.from(" in clean_line or "storage.from(" in clean_line:
            # Substitui temporariamente para não confundir com db.from
            clean_line = re.sub(r"Array\.from\(", "__ignored_array_from(", clean_line)
            clean_line = re.sub(r"storage\.from\(", "__ignored_storage_from(", clean_line)

        # Checa se .from(...) nesta linha é continuação de chamada multiline (ex: supabase.storage\n  .from(...))
        if ".from(" in clean_line:
            back_idx = idx - 1
            while back_idx >= 0 and back_idx >= idx - 5:
                prev_line = lines[back_idx].strip()
                if not prev_line or prev_line.startswith("//") or prev_line.startswith("/*") or prev_line.startswith("*"):
                    back_idx -= 1
                    continue
                if ".storage" in prev_line or prev_line.endswith("storage"):
                    clean_line = re.sub(r"\.from\(", "__ignored_storage_from(", clean_line)
                    break
                if "Array" in prev_line:
                    clean_line = re.sub(r"\.from\(", "__ignored_array_from(", clean_line)
                    break
                if prev_line.endswith(";") or prev_line.endswith("}") or prev_line.endswith("{"):
                    break
                back_idx -= 1

        # 1. Validação de .from('...') para banco de dados
        from_matches = list(re.finditer(r"\.from\(\s*([`'\"])(\w+)\1\s*\)", clean_line))
        matched_any_from = False
        current_table: str | None = None

        for fm in from_matches:
            matched_any_from = True
            calls_found += 1
            tname = fm.group(2)
            current_table = tname
            if tname in known_tables:
                table_stats.valid += 1
            else:
                table_stats.invalid += 1
                table_stats.details.append(
                    f"{rel_path}:{line_num} - Tabela '{tname}' não existe no schema do Supabase"
                )

        # Se houver .from(var) dinâmico sem aspas (e não for Array.from / storage.from / comentário)
        if not matched_any_from and ".from(" in clean_line:
            if not stripped.startswith("//") and not stripped.startswith("*"):
                calls_found += 1
                table_stats.unresolved += 1
                table_stats.details.append(
                    f"{rel_path}:{line_num} - Referência dinâmica de tabela em .from(...) não pôde ser resolvida estaticamente"
                )

        # 2. Validação de .rpc('...')
        rpc_matches = re.finditer(r"\.rpc\(\s*([`'\"])(\w+)\1", clean_line)
        for rm in rpc_matches:
            calls_found += 1
            fname = rm.group(2)
            if fname in known_funcs:
                rpc_stats.valid += 1
            else:
                rpc_stats.invalid += 1
                rpc_stats.details.append(
                    f"{rel_path}:{line_num} - Função RPC '{fname}' não existe no schema do Supabase"
                )

        # 3. Validação de .select('col1, col2') quando a tabela está na mesma linha
        if current_table and current_table in known_tables:
            select_cols = extract_select_columns(clean_line)
            table_cols = set(known_tables[current_table])

            for col in select_cols:
                calls_found += 1
                if col in table_cols:
                    col_stats.valid += 1
                else:
                    col_stats.invalid += 1
                    col_stats.details.append(
                        f"{rel_path}:{line_num} - Coluna '{col}' não existe na tabela '{current_table}'"
                    )

    return calls_found


def main() -> None:
    project_path = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    types_path = project_path / "types" / "database.types.ts"

    print("=" * 65)
    print("      SUPABASE SCHEMA & CODEBASE CONTRACT VALIDATOR")
    print("=" * 65)
    print(f"Projeto: {project_path}")
    print(f"Tipos:   {types_path.relative_to(project_path) if types_path.is_file() else 'NÃO ENCONTRADO'}")
    print("-" * 65)

    if not types_path.is_file():
        print(f"[ERRO CRÍTICO] Arquivo de tipos {types_path} inexistente.")
        print("Execute o gerador de tipos via Supabase MCP antes de validar.")
        sys.exit(1)

    try:
        known_tables, known_funcs = parse_database_types(types_path)
    except Exception as e:
        print(f"[ERRO] Falha ao analisar types/database.types.ts: {e}")
        sys.exit(1)

    print(f"Catálogo carregado: {len(known_tables)} tabelas públicas, {len(known_funcs)} funções RPC.")

    # Escanear código em app/, lib/ e scripts/
    scan_dirs = [project_path / "app", project_path / "lib", project_path / "scripts"]
    files_to_scan: list[Path] = []

    for d in scan_dirs:
        if d.is_dir():
            for ext in ("*.ts", "*.tsx", "*.js", "*.jsx"):
                files_to_scan.extend([f for f in d.rglob(ext) if "node_modules" not in f.parts and ".next" not in f.parts])

    files_to_scan = sorted(list(set(files_to_scan)))

    table_stats = ValidationStats()
    col_stats = ValidationStats()
    rpc_stats = ValidationStats()
    total_calls = 0

    for fpath in files_to_scan:
        total_calls += validate_file(fpath, project_path, known_tables, known_funcs, table_stats, col_stats, rpc_stats)

    total_valid = table_stats.valid + col_stats.valid + rpc_stats.valid
    total_invalid = table_stats.invalid + col_stats.invalid + rpc_stats.invalid
    total_unresolved = table_stats.unresolved + col_stats.unresolved + rpc_stats.unresolved
    total_suppressed = table_stats.suppressed + col_stats.suppressed + rpc_stats.suppressed

    print("\n" + "=" * 65)
    print(f"Arquivos analisados:     {len(files_to_scan)}")
    print(f"Chamadas ao Supabase:    {total_calls}")
    print("-" * 65)
    print(f"Tabelas:  VALID: {table_stats.valid:3d} | INVALID: {table_stats.invalid:2d} | UNRESOLVED: {table_stats.unresolved:2d} | SUPPRESSED: {table_stats.suppressed:2d}")
    print(f"Colunas:  VALID: {col_stats.valid:3d} | INVALID: {col_stats.invalid:2d} | UNRESOLVED: {col_stats.unresolved:2d} | SUPPRESSED: {col_stats.suppressed:2d}")
    print(f"RPCs:     VALID: {rpc_stats.valid:3d} | INVALID: {rpc_stats.invalid:2d} | UNRESOLVED: {rpc_stats.unresolved:2d} | SUPPRESSED: {rpc_stats.suppressed:2d}")
    print("=" * 65)

    all_details = table_stats.details + col_stats.details + rpc_stats.details
    if all_details:
        print("\nDetalhes / Ocorrências:")
        for item in all_details[:30]:
            print(f"  • {item}")
        if len(all_details) > 30:
            print(f"  ... e mais {len(all_details) - 30} ocorrências.")

    # Critério de Aprovação do Gate 4:
    # 0 INVALID, 0 UNRESOLVED e total_calls > 0
    if total_invalid == 0 and total_unresolved == 0 and total_calls > 0:
        print("\n\033[92m[PASS] CONTRATO SUPABASE 100% VÁLIDO (Zero violações, zero unresolved)\033[0m\n")
        sys.exit(0)
    else:
        print(f"\n\033[91m[FAIL] Validação encontrou problemas (INVALID: {total_invalid}, UNRESOLVED: {total_unresolved}, Chamadas: {total_calls})\033[0m\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
