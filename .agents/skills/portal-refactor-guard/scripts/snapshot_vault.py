#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""
snapshot_vault.py - Deterministic Pre-Mutation Snapshot Engine.

Takes an atomic snapshot of target files before refactoring into:
.agents/_scratch/backups/snapshot_<timestamp>/
Generates an automatic restore.py script for instant 1-command rollback.
Maintains workspace hygiene by pruning snapshots beyond the retention limit.
"""

from __future__ import annotations

import argparse
import datetime
import json
import os
import shutil
import sys
from pathlib import Path
from typing import List

MAX_RETAINED_SNAPSHOTS = 5


def create_snapshot(root_path: Path, files_to_backup: List[str], label: str = "refactor") -> Path:
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_base = root_path / ".agents" / "_scratch" / "backups"
    snapshot_dir = backup_base / f"snapshot_{timestamp}_{label}"
    files_dir = snapshot_dir / "files"
    files_dir.mkdir(parents=True, exist_ok=True)

    manifest = []

    for rel_path in files_to_backup:
        source_path = root_path / rel_path
        if not source_path.exists() or source_path.is_dir():
            continue

        target_path = files_dir / rel_path
        target_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source_path, target_path)

        manifest.append({
            "rel_path": rel_path,
            "size_bytes": source_path.stat().st_size,
        })

    # Save manifest.json
    manifest_path = snapshot_dir / "manifest.json"
    manifest_path.write_text(json.dumps({
        "timestamp": timestamp,
        "label": label,
        "file_count": len(manifest),
        "files": manifest
    }, indent=2), encoding="utf-8")

    # Generate standalone restore.py
    restore_py_content = f'''#!/usr/bin/env python3
"""
Restore script for snapshot {snapshot_dir.name}
Run this to immediately rollback all files to their pre-mutation state.
"""
import shutil
from pathlib import Path

SNAPSHOT_DIR = Path(__file__).resolve().parent
FILES_DIR = SNAPSHOT_DIR / "files"
WORKSPACE_ROOT = SNAPSHOT_DIR.parents[3]

def main():
    print(f"Rolling back from {{SNAPSHOT_DIR.name}}...")
    count = 0
    for file_path in FILES_DIR.rglob("*"):
        if file_path.is_file():
            rel = file_path.relative_to(FILES_DIR)
            dest = WORKSPACE_ROOT / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(file_path, dest)
            print(f"  Restored: {{rel}}")
            count += 1
    print(f"Rollback complete: {{count}} files restored.")

if __name__ == "__main__":
    main()
'''
    restore_script = snapshot_dir / "restore.py"
    restore_script.write_text(restore_py_content, encoding="utf-8")
    restore_script.chmod(0o755)

    # Prune old snapshots for clean workspace hygiene
    prune_old_snapshots(backup_base)

    return snapshot_dir


def prune_old_snapshots(backup_base: Path):
    if not backup_base.exists():
        return
    snapshots = sorted(
        [d for d in backup_base.iterdir() if d.is_dir() and d.name.startswith("snapshot_")],
        key=lambda d: d.stat().st_mtime,
        reverse=True
    )
    for old_snap in snapshots[MAX_RETAINED_SNAPSHOTS:]:
        shutil.rmtree(old_snap, ignore_errors=True)


def main() -> int:
    parser = argparse.ArgumentParser(description="Take atomic pre-mutation snapshot of target files.")
    parser.add_argument("files", nargs="*", help="File paths to backup (relative to workspace root)")
    parser.add_argument("--from-json", help="Path to JSON output from blast_radius_scanner.py")
    parser.add_argument("--label", default="refactor", help="Short descriptor label for snapshot directory")
    parser.add_argument("--root", default=".", help="Root directory (default: current workspace)")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    target_files = list(args.files)

    if args.from_json:
        json_path = Path(args.from_json)
        if json_path.exists():
            data = json.loads(json_path.read_text(encoding="utf-8"))
            target_files.extend(data.get("files_list", []))

    if not target_files:
        print("[ERROR] No target files specified. Pass file paths or use --from-json.", file=sys.stderr)
        return 1

    snapshot = create_snapshot(root, sorted(list(set(target_files))), args.label)
    print(f"✅ Pre-mutation snapshot created successfully:")
    print(f"   Directory: {snapshot}")
    print(f"   Files:     {snapshot / 'files'}")
    print(f"   Rollback:  python3 {snapshot / 'restore.py'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
