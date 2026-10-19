#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""
import_integrity_checker.py - Deterministic Import & Relative Path Auditor.

Audits TypeScript and TSX files for broken relative imports.
When an import fails to resolve, searches the workspace for the matching module
and suggests the exact corrected relative path.
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path
from typing import Dict, List, Tuple, Optional

IMPORT_REGEX = re.compile(
    r"""(?:import|export)\s+(?:(?:[\w*\s{},]*)\s+from\s+)?['"](\.[^'"]+)['"]""",
    re.MULTILINE
)

RESOLVE_EXTENSIONS = [
    "",
    ".ts",
    ".tsx",
    ".d.ts",
    ".js",
    ".jsx",
    "/index.ts",
    "/index.tsx",
    "/index.js",
]


def resolve_import(source_file: Path, import_path: str) -> Optional[Path]:
    base_dir = source_file.parent
    target_candidate = (base_dir / import_path).resolve()

    for ext in RESOLVE_EXTENSIONS:
        candidate_with_ext = Path(str(target_candidate) + ext)
        if candidate_with_ext.is_file():
            return candidate_with_ext
    return None


def find_matching_file_in_workspace(root_path: Path, module_basename: str) -> List[Path]:
    matches = []
    clean_base = re.sub(r"\.(tsx?|jsx?|d\.ts)$", "", module_basename)

    for root, dirs, files in os.walk(root_path):
        if any(ex in root for ex in [".git", "node_modules", ".next", ".gemini", ".agents/_scratch"]):
            continue
        for file in files:
            file_clean = re.sub(r"\.(tsx?|jsx?|d\.ts)$", "", file)
            if file_clean.lower() == clean_base.lower():
                matches.append(Path(root) / file)
    return matches


def compute_relative_import(source_file: Path, target_file: Path) -> str:
    source_dir = source_file.parent
    rel_path = os.path.relpath(target_file, source_dir).replace("\\", "/")
    # strip extensions
    rel_path = re.sub(r"\.(tsx?|jsx?|d\.ts)$", "", rel_path)
    if not rel_path.startswith("."):
        rel_path = "./" + rel_path
    return rel_path


def audit_files(root_path: Path, file_paths: List[Path]) -> List[Dict[str, Any]]:
    issues = []

    for file_path in file_paths:
        if not file_path.exists() or file_path.suffix not in {".ts", ".tsx"}:
            continue

        try:
            content = file_path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue

        lines = content.splitlines()

        for line_no, line in enumerate(lines, start=1):
            matches = IMPORT_REGEX.findall(line)
            for imp in matches:
                resolved = resolve_import(file_path, imp)
                if resolved is None:
                    # Broken relative import detected
                    module_name = Path(imp).name
                    candidates = find_matching_file_in_workspace(root_path, module_name)
                    suggestion = None
                    if candidates:
                        suggestion = compute_relative_import(file_path, candidates[0])

                    issues.append({
                        "file": file_path.relative_to(root_path).as_posix(),
                        "line": line_no,
                        "broken_import": imp,
                        "raw_line": line.strip(),
                        "suggested_import": suggestion,
                    })

    return issues


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit relative imports in TypeScript/TSX files.")
    parser.add_argument("paths", nargs="*", default=["app", "types", "lib"], help="Directories or files to check")
    parser.add_argument("--root", default=".", help="Workspace root")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    target_files: List[Path] = []

    for p in args.paths:
        target_path = root / p
        if target_path.is_file():
            target_files.append(target_path)
        elif target_path.is_dir():
            for f in target_path.rglob("*"):
                if f.is_file() and f.suffix in {".ts", ".tsx"}:
                    target_files.append(f)

    issues = audit_files(root, target_files)

    if not issues:
        print("✅ [PASS] All relative imports resolved successfully. Zero broken paths.")
        return 0

    print("=" * 70)
    print(f"❌ [FAIL] Found {len(issues)} broken relative import(s):")
    print("=" * 70)

    for issue in issues:
        print(f"\n📄 {issue['file']}:{issue['line']}")
        print(f"   Broken:    '{issue['broken_import']}'")
        print(f"   Code:      {issue['raw_line']}")
        if issue['suggested_import']:
            print(f"   💡 Fix:    Replace '{issue['broken_import']}' with '{issue['suggested_import']}'")
        else:
            print(f"   ⚠️ Fix:    Module not found in workspace.")

    print("\n" + "=" * 70)
    return 1


if __name__ == "__main__":
    sys.exit(main())
