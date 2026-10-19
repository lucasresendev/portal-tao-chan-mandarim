#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""
blast_radius_scanner.py - Deterministic 7-Layer Blast-Radius Scanner.

Scans the repository for all occurrences of a domain entity, concept, or keyword
and maps findings across the 7 architecture layers of Meu Portal Mandarim:
1. Database & Storage
2. Server Actions & Cache
3. Types & Contracts
4. UI Components & Node Views
5. App Router & UX
6. CSS & Design Tokens
7. Documentation & Telemetry
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Dict, List, Any

# Directories to exclude from scanning
EXCLUDE_DIRS = {
    ".git",
    "node_modules",
    ".next",
    ".gemini",
    ".agents/_scratch",
}

# 7 Architectural Layer Classifier
def classify_layer(rel_path: str) -> str:
    path_str = rel_path.replace("\\", "/")
    
    if path_str.startswith("supabase/") or "storage" in path_str.lower() or path_str.startswith("lib/") and "storage" in path_str.lower():
        return "1_database_storage"
    if path_str.startswith("app/actions/") or "revalidate" in path_str.lower():
        return "2_actions_cache"
    if path_str.startswith("types/") or path_str.endswith(".types.ts"):
        return "3_types_contracts"
    if path_str.startswith("app/components/"):
        return "4_ui_components"
    if path_str.startswith("app/dashboard/") or path_str.startswith("app/admin/") or path_str.startswith("app/api/"):
        return "5_app_router_ux"
    if path_str.endswith(".css") or "globals.css" in path_str:
        return "6_css_styling"
    if path_str.startswith(".agents/context/") or path_str.endswith(".md") or "activity-log" in path_str:
        return "7_docs_telemetry"
    return "other"


def scan_repository(root_path: Path, query: str, case_sensitive: bool = False) -> Dict[str, Any]:
    flags = 0 if case_sensitive else re.IGNORECASE
    pattern = re.compile(re.escape(query), flags)

    layers: Dict[str, List[Dict[str, Any]]] = {
        "1_database_storage": [],
        "2_actions_cache": [],
        "3_types_contracts": [],
        "4_ui_components": [],
        "5_app_router_ux": [],
        "6_css_styling": [],
        "7_docs_telemetry": [],
        "other": [],
    }

    files_matched = set()
    total_occurrences = 0

    for root, dirs, files in os.walk(root_path):
        # Prune excluded directories in-place
        dirs[:] = [d for d in dirs if not any(
            os.path.relpath(os.path.join(root, d), root_path).replace("\\", "/").startswith(ex)
            for ex in EXCLUDE_DIRS
        )]

        for file_name in files:
            file_path = Path(root) / file_name
            rel_path = file_path.relative_to(root_path).as_posix()

            # Skip binary and media files
            if file_path.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp", ".gif", ".mp3", ".wav", ".pdf", ".zip"}:
                continue

            try:
                content = file_path.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                continue

            lines = content.splitlines()
            file_matches = []

            for line_no, line in enumerate(lines, start=1):
                if pattern.search(line):
                    file_matches.append({
                        "line": line_no,
                        "content": line.strip()[:160]
                    })
                    total_occurrences += 1

            if file_matches:
                files_matched.add(rel_path)
                layer = classify_layer(rel_path)
                layers[layer].append({
                    "file": rel_path,
                    "count": len(file_matches),
                    "matches": file_matches[:10]  # sample first 10
                })

    # Risk analysis flags
    db_storage_count = len(layers["1_database_storage"])
    risk_assessment = {
        "storage_bucket_mutation_risk": "HIGH" if db_storage_count > 0 else "LOW",
        "storage_reason": "Renaming physical Supabase storage buckets may corrupt existing absolute asset URLs in Tiptap JSON content." if db_storage_count > 0 else "No direct storage bucket references found.",
        "breaking_schema_risk": "MEDIUM" if len(layers["1_database_storage"]) + len(layers["3_types_contracts"]) > 5 else "LOW",
    }

    return {
        "query": query,
        "total_files": len(files_matched),
        "total_occurrences": total_occurrences,
        "risk_assessment": risk_assessment,
        "files_list": sorted(list(files_matched)),
        "layers": layers,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Scan repository across the 7 architecture layers for refactoring.")
    parser.add_argument("query", help="Entity or term to scan (e.g. blog, srs, dicionario)")
    parser.add_argument("--root", default=".", help="Root directory (default: current workspace)")
    parser.add_argument("--case-sensitive", action="store_true", help="Perform case-sensitive scan")
    parser.add_argument("--json", action="store_true", help="Output raw JSON")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    report = scan_repository(root, args.query, args.case_sensitive)

    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
        return 0

    print("=" * 70)
    print(f"📊 PORTAL REFACTOR GUARD - BLAST RADIUS REPORT: '{args.query}'")
    print("=" * 70)
    print(f"Total Files Affected:      {report['total_files']}")
    print(f"Total Matched Lines:       {report['total_occurrences']}")
    print(f"Storage Mutation Risk:     {report['risk_assessment']['storage_bucket_mutation_risk']}")
    print(f"Risk Notice:               {report['risk_assessment']['storage_reason']}")
    print("-" * 70)

    layer_names = {
        "1_database_storage": "1. Database & Storage",
        "2_actions_cache": "2. Server Actions & Cache",
        "3_types_contracts": "3. TypeScript Types & Contracts",
        "4_ui_components": "4. UI Components & Node Views",
        "5_app_router_ux": "5. App Router & Navigation",
        "6_css_styling": "6. CSS Global & Tokens",
        "7_docs_telemetry": "7. Documentation & Telemetry",
        "other": "Other Workspace Files",
    }

    for key, label in layer_names.items():
        items = report["layers"].get(key, [])
        if not items:
            continue
        print(f"\n📂 [{label}] ({len(items)} files affected):")
        for item in items:
            print(f"   • {item['file']} ({item['count']} matches)")

    print("\n" + "=" * 70)
    print("💡 NEXT STEP: Run snapshot_vault.py to backup target files before modifying.")
    print("=" * 70)
    return 0


if __name__ == "__main__":
    sys.exit(main())
