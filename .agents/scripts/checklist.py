#!/usr/bin/env python3
"""Fast checklist runner tailored for Meu Portal Mandarim.

Executes quality, security, and schema checks across the 4 core skills.
Zero external framework dependencies. Pure standard library.
"""
from __future__ import annotations

import argparse
import os
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path


class Console:
    def __init__(self) -> None:
        enabled = sys.stdout.isatty() and "NO_COLOR" not in os.environ
        self.bold = "\033[1m" if enabled else ""
        self.cyan = "\033[96m" if enabled else ""
        self.green = "\033[92m" if enabled else ""
        self.yellow = "\033[93m" if enabled else ""
        self.red = "\033[91m" if enabled else ""
        self.dim = "\033[2m" if enabled else ""
        self.end = "\033[0m" if enabled else ""

    def header(self, text: str) -> None:
        line = "=" * 65
        print(f"\n{self.bold}{self.cyan}{line}\n{text.center(65)}\n{line}{self.end}\n")

    def passed(self, name: str, duration: float) -> None:
        print(f"{self.green}[PASS]{self.end} {name} {self.dim}({duration:.1f}s){self.end}")

    def skipped(self, name: str, reason: str) -> None:
        print(f"{self.yellow}[SKIP]{self.end} {name} - {reason}")

    def failed(self, name: str, duration: float, exit_code: int) -> None:
        print(f"{self.red}[FAIL]{self.end} {name} {self.dim}({duration:.1f}s, exit {exit_code}){self.end}")


CONSOLE = Console()


@dataclass(frozen=True)
class CheckSpec:
    name: str
    script: str
    category: str
    required: bool = False
    args: tuple[str, ...] = ()
    target: str = "project"


CHECKS = (
    CheckSpec(
        "Security Scan",
        "skills/portal-backend/scripts/security_scan.py",
        "P0 Security",
        required=True,
        args=("--output", "summary", "--fail-on", "high"),
    ),
    CheckSpec("Schema Validation", "skills/portal-backend/scripts/schema_validator.py", "P1 Data Layer"),
    CheckSpec("API Validation", "skills/portal-backend/scripts/api_validator.py", "P1 Data Layer"),
    CheckSpec("Lint Check", "skills/portal-backend/scripts/lint_runner.py", "P2 Code Quality", required=True),
    CheckSpec("Type Coverage", "skills/portal-backend/scripts/type_coverage.py", "P2 Code Quality"),
    CheckSpec("Test Runner", "skills/portal-backend/scripts/test_runner.py", "P3 Testing"),
    CheckSpec("UX Audit", "skills/portal-frontend/scripts/ux_audit.py", "P4 UX & A11y"),
    CheckSpec("Accessibility Check", "skills/portal-frontend/scripts/accessibility_checker.py", "P4 UX & A11y"),
    CheckSpec("SEO Check", "skills/portal-frontend/scripts/seo_checker.py", "P5 SEO"),
    CheckSpec("i18n Check", "skills/mandarin-i18n/scripts/i18n_checker.py", "P6 Domain Quality"),
    CheckSpec(
        "Playwright E2E",
        "skills/portal-backend/scripts/playwright_runner.py",
        "P7 Runtime",
        target="url",
    ),
)


def locate_toolkit_root(project: Path) -> Path:
    candidate = project / ".agents"
    if candidate.is_dir() and (candidate / "skills").is_dir():
        return candidate
    caller = Path(__file__).resolve().parents[1]
    if (caller / "skills").is_dir():
        return caller
    raise FileNotFoundError("Toolkit root not found. Expected <project>/.agents/skills")


def run_check(spec: CheckSpec, toolkit_root: Path, project: Path, url: str | None) -> tuple[bool, str]:
    script_path = toolkit_root / spec.script
    if not script_path.is_file():
        CONSOLE.skipped(spec.name, f"Script not found ({spec.script})")
        return (not spec.required, "missing_script")

    if spec.target == "url":
        if not url:
            CONSOLE.skipped(spec.name, "URL not provided")
            return (True, "no_url")
        cmd = [sys.executable, str(script_path), url]
    else:
        cmd = [sys.executable, str(script_path), str(project)]

    cmd.extend(spec.args)

    start = time.time()
    proc = subprocess.run(cmd, cwd=project, capture_output=True, text=True)
    duration = time.time() - start

    if proc.returncode == 0:
        CONSOLE.passed(spec.name, duration)
        return (True, "ok")
    else:
        CONSOLE.failed(spec.name, duration, proc.returncode)
        if proc.stdout.strip():
            # Show last few lines of failure output if available
            lines = [l for l in proc.stdout.strip().splitlines() if l.strip()]
            for line in lines[-5:]:
                print(f"    {CONSOLE.dim}{line}{CONSOLE.end}")
        return (False, "exit_error")


def main() -> int:
    parser = argparse.ArgumentParser(description="Checklist rápido de validação do Portal Mandarim")
    parser.add_argument("project", nargs="?", default=".", help="Caminho do projeto (default: .)")
    parser.add_argument("--url", help="URL da aplicação em execução para testes E2E")
    parser.add_argument("--skip-runtime", action="store_true", help="Pular testes dependentes de URL")
    parser.add_argument("--stop-on-fail", action="store_true", help="Interromper na primeira falha")
    args = parser.parse_args()

    project = Path(args.project).resolve()
    if not project.is_dir():
        print(f"Erro: Diretório do projeto não existe: {project}", file=sys.stderr)
        return 2

    try:
        toolkit_root = locate_toolkit_root(project)
    except FileNotFoundError as exc:
        print(f"Erro: {exc}", file=sys.stderr)
        return 2

    CONSOLE.header("PORTAL MANDARIM - FAST CHECKLIST")
    print(f"Projeto: {project}\nToolkit: {toolkit_root}")
    if args.url:
        print(f"URL:     {args.url}")

    start_total = time.time()
    passed_count = 0
    failed_count = 0
    skipped_count = 0

    print(f"\n{CONSOLE.bold}Executando Verificações:{CONSOLE.end}")

    for spec in CHECKS:
        if args.skip_runtime and spec.target == "url":
            continue

        ok, reason = run_check(spec, toolkit_root, project, args.url)
        if reason in ("missing_script", "no_url"):
            skipped_count += 1
        elif ok:
            passed_count += 1
        else:
            failed_count += 1
            if args.stop_on_fail:
                break

    duration_total = time.time() - start_total

    print(f"\n{CONSOLE.bold}{'=' * 65}{CONSOLE.end}")
    print(
        f"Resultado: {passed_count} passaram, {failed_count} falharam, "
        f"{skipped_count} ignorados em {duration_total:.1f}s"
    )

    if failed_count > 0:
        print(f"{CONSOLE.red}{CONSOLE.bold}[ALERTA] Verificação encontrou falhas a serem revisadas.{CONSOLE.end}")
        return 1

    print(f"{CONSOLE.green}{CONSOLE.bold}[OK] Todas as verificações passaram com sucesso.{CONSOLE.end}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
