#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""
Tailwind v4 Token Normalizer
Converts arbitrary pixel brackets (e.g. w-[18px], min-h-[500px], -left-[34px], min-w-[130px])
into native Tailwind v4 tokens (e.g. w-4.5, min-h-125, -left-8.5, min-w-32.5).

Usage:
  python3 tailwind_v4_normalizer.py <target_path> [--fix]
"""

import argparse
import os
import re
import sys
from pathlib import Path
from typing import List, Tuple

PREFIXES = [
    r'min-w', r'max-w', r'min-h', r'max-h',
    r'-top', r'-bottom', r'-left', r'-right',
    r'top', r'bottom', r'left', r'right',
    r'-mx', r'-my', r'-mt', r'-mb', r'-ml', r'-mr', r'-m',
    r'px', r'py', r'pt', r'pb', r'pl', r'pr', r'p',
    r'mx', r'my', r'mt', r'mb', r'ml', r'mr', r'm',
    r'gap-x', r'gap-y', r'gap',
    r'w', r'h'
]

# Sort by length descending so longer compound prefixes match before sub-prefixes
PREFIXES_SORTED = sorted(PREFIXES, key=len, reverse=True)
PREFIX_REGEX = r'(?:' + '|'.join(re.escape(p) for p in PREFIXES_SORTED) + r')'
# Use negative lookbehind so we match class tokens cleanly even with leading hyphens
PATTERN = re.compile(r'(?<![\w-])(' + PREFIX_REGEX + r')-\[(\d+)px\]')

def calculate_tw4_token(prefix: str, px_val: int) -> str | None:
    """Calculates clean Tailwind v4 token if it cleanly maps to a multiple of 4 or half-step."""
    step = px_val / 4.0
    # Allow integers and clean .5 steps (e.g. 4.5 = 18px, 8.5 = 34px, 32.5 = 130px)
    if step.is_integer():
        return f"{prefix}-{int(step)}"
    elif (step * 2).is_integer():
        return f"{prefix}-{step:.1f}"
    return None

def scan_file(file_path: Path, fix: bool = False) -> List[Tuple[int, str, str]]:
    try:
        content = file_path.read_text(encoding='utf-8')
    except Exception:
        return []

    lines = content.splitlines(keepends=True)
    matches = []
    modified = False
    new_lines = []

    for idx, line in enumerate(lines, 1):
        def repl(m: re.Match) -> str:
            nonlocal modified
            full_match = m.group(0)
            prefix = m.group(1)
            px_val = int(m.group(2))
            token = calculate_tw4_token(prefix, px_val)
            if token:
                matches.append((idx, full_match, token))
                if fix:
                    modified = True
                    return token
            return full_match

        new_line = PATTERN.sub(repl, line)
        new_lines.append(new_line)

    if fix and modified:
        file_path.write_text(''.join(new_lines), encoding='utf-8')

    return matches

def main():
    parser = argparse.ArgumentParser(description="Tailwind v4 Token Normalizer")
    parser.add_argument("target_path", help="Path to file or directory to scan")
    parser.add_argument("--fix", action="store_true", help="Automatically convert arbitrary bracket classes")
    args = parser.parse_args()

    target_path = Path(args.target_path).resolve()
    fix_mode = args.fix

    if not target_path.exists():
        print(f"Path does not exist: {target_path}")
        sys.exit(1)

    files_to_scan = []
    if target_path.is_file():
        files_to_scan.append(target_path)
    else:
        for ext in ('.tsx', '.ts', '.jsx', '.js', '.css'):
            files_to_scan.extend(target_path.rglob(f"*{ext}"))

    total_findings = 0
    total_files = 0

    print(f"🎨 Scanning {len(files_to_scan)} files for arbitrary pixel brackets...")
    for f in sorted(files_to_scan):
        # Skip node_modules and build dirs
        if any(ignored in f.parts for ignored in ('.next', 'node_modules', '.agents')):
            continue

        findings = scan_file(f, fix=fix_mode)
        if findings:
            total_files += 1
            total_findings += len(findings)
            rel_path = f.relative_to(Path.cwd()) if f.is_relative_to(Path.cwd()) else f
            print(f"\n📄 {rel_path}:")
            for line_no, old_cls, new_cls in findings:
                action = "Fixed" if fix_mode else "Can be written as"
                print(f"  Line {line_no}: `{old_cls}` -> `{new_cls}` ({action})")

    if total_findings == 0:
        print("\n✅ All scanned classes use standard Tailwind tokens. Zero arbitrary pixel brackets found.")
    else:
        status = "Fixed" if fix_mode else "Found"
        print(f"\n🏁 {status} {total_findings} arbitrary pixel classes across {total_files} files.")
        if not fix_mode:
            print("💡 Run with `--fix` to automatically convert them to Tailwind v4 tokens.")

if __name__ == '__main__':
    main()
