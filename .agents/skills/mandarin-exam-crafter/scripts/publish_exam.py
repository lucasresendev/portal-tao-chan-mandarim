#!/usr/bin/env python3
"""
Mandarin Exam Publisher - meu-portal-mandarim
=============================================
Safely publishes or updates validated exams into Supabase PostgreSQL ('atividades' table).

Features:
- Validates question schema and point sum (default 100) before any network call.
- Resolves category ('Provas' by default) and optional lesson ('codigo_aula').
- Dry-run by default: requires explicit '--confirm' flag to write to remote database.
- Uses service_role key to bypass RLS safely in automation.

Usage:
  # Dry-run validation & preview:
  python3 .agents/skills/mandarin-exam-crafter/scripts/publish_exam.py .provas/u1/questoes_u1.json --titulo "Prova Unidade 1"

  # Actual publication to Supabase:
  python3 .agents/skills/mandarin-exam-crafter/scripts/publish_exam.py .provas/u1/questoes_u1.json --titulo "Prova Unidade 1" --confirm
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

# Import validation from sibling script if available
script_dir = Path(__file__).resolve().parent
if str(script_dir) not in sys.path:
    sys.path.insert(0, str(script_dir))

try:
    from validate_exam import validate_question
except ImportError:
    validate_question = None


def load_env_file(env_path: Path) -> dict[str, str]:
    """Reads a .env file and returns a dictionary of key-values without printing secrets."""
    env_vars: dict[str, str] = {}
    if not env_path.is_file():
        return env_vars
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" in line:
            k, v = line.split("=", 1)
            k = k.strip()
            v = v.strip().strip("'\"")
            env_vars[k] = v
    return env_vars


def get_credentials(env_file_path: Path | None = None) -> tuple[str, str]:
    """Retrieves Supabase URL and Service Role Key from env or .env.local."""
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        paths_to_check = []
        if env_file_path:
            paths_to_check.append(env_file_path)
        paths_to_check.extend([
            Path(".env.local"),
            Path(__file__).resolve().parents[4] / ".env.local",
        ])

        for p in paths_to_check:
            if p.is_file():
                loaded = load_env_file(p)
                url = url or loaded.get("NEXT_PUBLIC_SUPABASE_URL")
                key = key or loaded.get("SUPABASE_SERVICE_ROLE_KEY")
                if url and key:
                    break

    if not url or not key:
        print("[ERROR] Credenciais do Supabase não encontradas.")
        print("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente ou em .env.local")
        sys.exit(1)

    return url.rstrip("/"), key


def api_request(
    base_url: str,
    api_key: str,
    path: str,
    method: str = "GET",
    body: dict[str, Any] | list[Any] | None = None,
    prefer: str | None = None,
) -> Any:
    """Executes a PostgREST API request using standard library urllib."""
    url = f"{base_url}/rest/v1/{path.lstrip('/')}"
    headers = {
        "apikey": api_key,
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer

    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8")
            if not content:
                return None
            return json.loads(content)
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        print(f"[HTTP ERROR {e.code}] em {method} {url}: {err_msg}", file=sys.stderr)
        raise
    except Exception as e:
        print(f"[NETWORK ERROR] em {method} {url}: {e}", file=sys.stderr)
        raise


def resolve_category_id(base_url: str, api_key: str, cat_input: str) -> str:
    """Resolves a category ID either from UUID or by querying category name."""
    # Check if already a UUID
    if len(cat_input) == 36 and cat_input.count("-") == 4:
        return cat_input

    # Query PostgREST
    query = urllib.parse.urlencode({"select": "id,nome", "nome": f"ilike.{cat_input}"})
    results = api_request(base_url, api_key, f"categorias_atividades?{query}")
    if results and len(results) > 0:
        return results[0]["id"]

    # Fallback to listing available
    all_cats = api_request(base_url, api_key, "categorias_atividades?select=id,nome")
    names = [c["nome"] for c in (all_cats or [])]
    print(f"[ERROR] Categoria '{cat_input}' não encontrada. Disponíveis: {names}", file=sys.stderr)
    sys.exit(1)


def resolve_aula_id(base_url: str, api_key: str, aula_input: str | None) -> str | None:
    """Resolves aula_id either from UUID or from codigo_aula."""
    if not aula_input:
        return None

    if len(aula_input) == 36 and aula_input.count("-") == 4:
        return aula_input

    query = urllib.parse.urlencode({"select": "id,codigo_aula,titulo_descritivo", "codigo_aula": f"eq.{aula_input}"})
    results = api_request(base_url, api_key, f"aulas?{query}")
    if results and len(results) > 0:
        return results[0]["id"]

    print(f"[WARN] Aula '{aula_input}' não encontrada na tabela 'aulas'. Campo aula_id ficará null.")
    return None


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Publica com segurança provas e atividades no Supabase do Portal de Mandarim."
    )
    parser.add_argument("exam_file", type=Path, help="Caminho para o JSON da prova (ex: .provas/u1/questoes_u1.json)")
    parser.add_argument("--titulo", required=True, help="Título da atividade no portal (ex: 'Prova - Unidade 1')")
    parser.add_argument("--descricao", default=None, help="Descrição textual da atividade")
    parser.add_argument("--categoria", default="Provas", help="Nome ou UUID da categoria (default: 'Provas')")
    parser.add_argument("--aula", default=None, help="Código da aula (ex: 'A01') ou UUID da aula vinculada")
    parser.add_argument("--tempo-limite", type=int, default=60, help="Tempo limite em minutos (default: 60)")
    parser.add_argument("--modo-exibicao", choices=["god_mode", "hanzi_pinyin", "pinyin_only", "hanzi_only"], default="god_mode")
    parser.add_argument("--embaralhar", action="store_true", help="Embaralhar ordem das questões para os alunos")
    parser.add_argument("--inativo", action="store_true", help="Marcar atividade como inativa (default é ativa)")
    parser.add_argument("--expected-points", type=float, default=100.0, help="Pontuação total esperada (default: 100.0)")
    parser.add_argument("--confirm", action="store_true", help="Executar gravação real no banco de dados remoto")
    parser.add_argument("--env-file", type=Path, default=None, help="Caminho customizado para arquivo .env.local")

    args = parser.parse_args()

    # 1. Carregar arquivo JSON
    if not args.exam_file.is_file():
        print(f"[ERROR] Arquivo de questões '{args.exam_file}' não encontrado.", file=sys.stderr)
        sys.exit(1)

    try:
        raw_content = json.loads(args.exam_file.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"[ERROR] Falha ao parsear JSON: {e}", file=sys.stderr)
        sys.exit(1)

    # Suporta tanto array direto de questoes quanto objeto com estrutura
    if isinstance(raw_content, list):
        questoes = raw_content
        configuracoes = {
            "tempo_limite_minutos": args.tempo_limite,
            "modo_exibicao_mandarim": args.modo_exibicao,
            "embaralhar_questoes": args.embaralhar,
        }
    elif isinstance(raw_content, dict):
        questoes = raw_content.get("questoes", [])
        configuracoes = raw_content.get("configuracoes", {
            "tempo_limite_minutos": args.tempo_limite,
            "modo_exibicao_mandarim": args.modo_exibicao,
            "embaralhar_questoes": args.embaralhar,
        })
    else:
        print("[ERROR] Formato de JSON inválido. Deve ser uma lista de questões ou objeto com chave 'questoes'.", file=sys.stderr)
        sys.exit(1)

    # 2. Validação das questões
    total_pontos = 0.0
    seen_ids: set[str] = set()
    validation_errors = []

    for idx, q in enumerate(questoes):
        pts = q.get("pontuacao_maxima", 0)
        total_pontos += pts
        if validate_question:
            q_errors = validate_question(q, idx, seen_ids, None)
            validation_errors.extend(q_errors)

    if validation_errors:
        print(f"[ERROR] Encontrados {len(validation_errors)} erros de validação no exame:", file=sys.stderr)
        for err in validation_errors[:10]:
            print(f"  • {err}", file=sys.stderr)
        if len(validation_errors) > 10:
            print(f"  ... e mais {len(validation_errors) - 10} erros.", file=sys.stderr)
        sys.exit(1)

    if abs(total_pontos - args.expected_points) > 0.01:
        print(f"[WARN] Pontuação total ({total_pontos:.2f}) difere da esperada ({args.expected_points:.2f}).")

    print("=================================================================")
    print("           MANDARIN EXAM PUBLISHER - VALIDAÇÃO LOCAL             ")
    print("=================================================================")
    print(f"Arquivo:      {args.exam_file}")
    print(f"Título:       {args.titulo}")
    print(f"Questões:     {len(questoes)}")
    print(f"Pontos Total: {total_pontos:.2f} pts")
    print(f"Config:       Tempo={configuracoes.get('tempo_limite_minutos')}min | Modo={configuracoes.get('modo_exibicao_mandarim')} | Embaralhar={configuracoes.get('embaralhar_questoes')}")
    print("-----------------------------------------------------------------")

    # 3. Credenciais e resolução de FKs
    base_url, api_key = get_credentials(args.env_file)
    categoria_id = resolve_category_id(base_url, api_key, args.categoria)
    aula_id = resolve_aula_id(base_url, api_key, args.aula)

    estrutura_completa = {
        "configuracoes": configuracoes,
        "questoes": questoes,
    }

    payload = {
        "titulo": args.titulo,
        "descricao": args.descricao,
        "categoria_id": categoria_id,
        "aula_id": aula_id,
        "is_ativo": not args.inativo,
        "estrutura": estrutura_completa,
    }

    # 4. Checagem de existência prévia pelo título
    encoded_title = urllib.parse.quote(args.titulo)
    existing = api_request(base_url, api_key, f"atividades?select=id,titulo,updated_at&titulo=eq.{encoded_title}")

    if existing and len(existing) > 0:
        existing_id = existing[0]["id"]
        print(f"[INFO] Atividade com título '{args.titulo}' já existe (ID: {existing_id}).")
        is_update = True
    else:
        is_update = False
        print(f"[INFO] Nova atividade será criada.")

    # 5. Gate de confirmação
    if not args.confirm:
        print("-----------------------------------------------------------------")
        print("[DRY-RUN CONCLUÍDO COM SUCESSO]")
        print("Nenhuma alteração foi realizada no banco remoto.")
        print("Para publicar definitivamente no Supabase, execute o comando com a flag:")
        print("  --confirm")
        print("=================================================================")
        return

    # 6. Gravação remota
    print("-----------------------------------------------------------------")
    print("[EXECUTANDO PUBLICAÇÃO REMOTA NO SUPABASE]...")

    if is_update:
        endpoint = f"atividades?id=eq.{existing[0]['id']}"
        res = api_request(base_url, api_key, endpoint, method="PATCH", body=payload, prefer="return=representation")
        print(f"[SUCCESS] Atividade atualizada com sucesso! ID: {existing[0]['id']}")
    else:
        endpoint = "atividades"
        res = api_request(base_url, api_key, endpoint, method="POST", body=payload, prefer="return=representation")
        new_id = res[0]["id"] if res and isinstance(res, list) and len(res) > 0 else "OK"
        print(f"[SUCCESS] Atividade criada com sucesso! ID: {new_id}")

    print("=================================================================")


if __name__ == "__main__":
    main()
