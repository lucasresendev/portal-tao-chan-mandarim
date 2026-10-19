-- ============================================================================
-- MIGRAÇÃO BASE: ESQUEMA COMPLETO TAO CH'AN MANDARIM (PORTFÓLIO & PRODUÇÃO)
-- Data: 2026-09-01
-- Inclui Extensões, Enums, 16 Tabelas, Funções, Triggers, Índices, Buckets e RLS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- 1. TIPOS ENUMERADOS (ENUMS)
DO $$ BEGIN
  CREATE TYPE public.status_matricula_enum AS ENUM ('Ativa', 'Pausada', 'Cancelada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.status_progresso AS ENUM ('Pendente', 'Em Andamento', 'Concluída');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.status_registro_enum AS ENUM ('Rascunho', 'Pendente', 'Corrigido', 'Concluido', 'Arquivado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. TABELAS PÚBLICAS (16 TABELAS)

CREATE TABLE IF NOT EXISTS public.alunos (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  status_matricula public.status_matricula_enum DEFAULT 'Ativa'::public.status_matricula_enum,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.aulas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_aula text NOT NULL UNIQUE,
  codigo_licao text,
  titulo_descritivo text NOT NULL,
  data_aula date,
  videos jsonb DEFAULT '[]'::jsonb,
  link_material text,
  link_tarefa text,
  links_adicionais jsonb DEFAULT '[]'::jsonb,
  comentarios text,
  is_excecao boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.progresso_aluno (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  aula_id uuid NOT NULL REFERENCES public.aulas(id) ON DELETE CASCADE,
  aula_assistida boolean DEFAULT false,
  tarefa_exercicios_concluida boolean DEFAULT false,
  tarefa_hanzi_concluida boolean DEFAULT false,
  tarefa_excecao_concluida boolean DEFAULT false,
  status public.status_progresso DEFAULT 'Pendente'::public.status_progresso,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (aluno_id, aula_id)
);

CREATE TABLE IF NOT EXISTS public.dialogos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aula_id uuid REFERENCES public.aulas(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  cenario text NOT NULL,
  ordem_exibicao integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dialogo_linhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dialogo_id uuid NOT NULL REFERENCES public.dialogos(id) ON DELETE CASCADE,
  ordem integer NOT NULL DEFAULT 0,
  fala_pc_hanzi text NOT NULL,
  fala_pc_pinyin text NOT NULL,
  fala_pc_pt text NOT NULL,
  resposta_certa_hanzi text NOT NULL,
  resposta_certa_pinyin text NOT NULL,
  resposta_certa_pt text NOT NULL,
  opcao2_hanzi text NOT NULL,
  opcao2_pinyin text NOT NULL,
  opcao2_pt text NOT NULL,
  opcao2_correcao text NOT NULL,
  opcao3_hanzi text NOT NULL,
  opcao3_pinyin text NOT NULL,
  opcao3_pt text NOT NULL,
  opcao3_correcao text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.progresso_dialogo (
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  dialogo_id uuid NOT NULL REFERENCES public.dialogos(id) ON DELETE CASCADE,
  jogadas integer DEFAULT 0,
  melhor_taxa_acerto integer DEFAULT 0,
  total_erros_historico integer DEFAULT 0,
  ultimo_acesso timestamptz DEFAULT now(),
  PRIMARY KEY (aluno_id, dialogo_id)
);

CREATE TABLE IF NOT EXISTS public.dicionario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aula_id uuid REFERENCES public.aulas(id) ON DELETE SET NULL,
  licao_oficial_id uuid REFERENCES public.aulas(id) ON DELETE SET NULL,
  tipo text NOT NULL DEFAULT 'Palavra',
  tipo_nota text,
  deck text,
  hanzi_simp text NOT NULL,
  hanzi_trad text,
  pinyin text NOT NULL,
  traducao text NOT NULL,
  explicacao text,
  curiosidade text,
  exemplos text,
  som text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.categorias_atividades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.atividades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  categoria_id uuid REFERENCES public.categorias_atividades(id) ON DELETE SET NULL,
  aula_id uuid REFERENCES public.aulas(id) ON DELETE SET NULL,
  estrutura jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_ativo boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.registros_dinamicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atividade_id uuid NOT NULL REFERENCES public.atividades(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  status public.status_registro_enum DEFAULT 'Rascunho'::public.status_registro_enum,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (atividade_id, aluno_id)
);

CREATE TABLE IF NOT EXISTS public.registros_dinamicos_lixeira (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_id uuid,
  atividade_id uuid,
  aluno_id uuid,
  status text,
  dados jsonb,
  motivo text,
  apagado_por_id uuid,
  criado_em timestamptz,
  atualizado_em timestamptz,
  apagado_em timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.comentarios_aula (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aula_id uuid NOT NULL REFERENCES public.aulas(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  texto text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.publicacoes_blog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  titulo text NOT NULL,
  categoria text NOT NULL,
  conteudo jsonb NOT NULL DEFAULT '{}'::jsonb,
  capa_url text,
  autor_id uuid REFERENCES public.alunos(id) ON DELETE SET NULL,
  status text DEFAULT 'rascunho',
  data_publicacao timestamptz DEFAULT now(),
  e_destaque boolean DEFAULT false,
  tags text[] DEFAULT '{}'::text[],
  ordem_exibicao integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.progresso_srs_meta (
  aluno_id uuid PRIMARY KEY REFERENCES public.alunos(id) ON DELETE CASCADE,
  srs_habilitado boolean DEFAULT false,
  streak_atual integer DEFAULT 0,
  streak_maxima integer DEFAULT 0,
  ultima_revisao timestamptz,
  virada_hora integer DEFAULT 1,
  limite_novas integer DEFAULT 10,
  retencao_reduzida boolean DEFAULT false,
  filtro_padrao text DEFAULT 'Ambos',
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.progresso_srs_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  dicionario_id uuid NOT NULL REFERENCES public.dicionario(id) ON DELETE CASCADE,
  due timestamptz NOT NULL DEFAULT now(),
  stability double precision NOT NULL DEFAULT 0,
  difficulty double precision NOT NULL DEFAULT 0,
  elapsed_days integer NOT NULL DEFAULT 0,
  scheduled_days integer NOT NULL DEFAULT 0,
  reps integer NOT NULL DEFAULT 0,
  lapses integer DEFAULT 0,
  learning_steps integer DEFAULT 0,
  state integer NOT NULL DEFAULT 0,
  last_review timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (aluno_id, dicionario_id)
);

CREATE TABLE IF NOT EXISTS public.progresso_srs_diario (
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  data date NOT NULL,
  quantidade integer NOT NULL DEFAULT 0,
  tempo_revelacao_segundos integer NOT NULL DEFAULT 0,
  tempo_estudo_segundos integer NOT NULL DEFAULT 0,
  is_ajuste_adm boolean DEFAULT false,
  PRIMARY KEY (aluno_id, data)
);

-- 3. FUNÇÕES ARMAZENADAS E TRIGGERS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _is_admin boolean;
BEGIN
  SELECT is_admin INTO _is_admin FROM public.alunos WHERE id = (SELECT auth.uid());
  RETURN COALESCE(_is_admin, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  INSERT INTO public.alunos (id, nome, status_matricula)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)), 'Ativa')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_modtime()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_blog_slug(title text)
RETURNS text
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter int := 0;
BEGIN
  base_slug := lower(
    regexp_replace(
      regexp_replace(unaccent(title), '[^a-zA-Z0-9\s-]', '', 'g'),
      '[\s-]+', '-', 'g'
    )
  );
  base_slug := trim(both '-' from base_slug);
  base_slug := substring(base_slug from 1 for 80);
  final_slug := base_slug;
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.publicacoes_blog WHERE slug = final_slug) THEN
      RETURN final_slug;
    END IF;
    counter := counter + 1;
    final_slug := base_slug || '-' || counter::text;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_blog_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS trg_atividades_updated_at ON public.atividades;
CREATE TRIGGER trg_atividades_updated_at
  BEFORE UPDATE ON public.atividades
  FOR EACH ROW EXECUTE FUNCTION public.update_modtime();

DROP TRIGGER IF EXISTS trg_registros_updated_at ON public.registros_dinamicos;
CREATE TRIGGER trg_registros_updated_at
  BEFORE UPDATE ON public.registros_dinamicos
  FOR EACH ROW EXECUTE FUNCTION public.update_modtime();

DROP TRIGGER IF EXISTS trigger_blog_updated_at ON public.publicacoes_blog;
CREATE TRIGGER trigger_blog_updated_at
  BEFORE UPDATE ON public.publicacoes_blog
  FOR EACH ROW EXECUTE FUNCTION public.update_blog_updated_at();

-- 4. HABILITAÇÃO DE RLS EM TODAS AS 16 TABELAS
ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progresso_aluno ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dialogos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dialogo_linhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progresso_dialogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dicionario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_dinamicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_dinamicos_lixeira ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comentarios_aula ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publicacoes_blog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progresso_srs_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progresso_srs_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progresso_srs_diario ENABLE ROW LEVEL SECURITY;

-- Políticas de leitura e gerenciamento complementares (as políticas base de alunos/progresso/srs/blog estão em 20260923_optimize_indexes_and_rls.sql)
DROP POLICY IF EXISTS "Alunos podem ver as aulas" ON public.aulas;
CREATE POLICY "Alunos podem ver as aulas" ON public.aulas FOR SELECT TO public USING (((SELECT auth.role()) = 'authenticated'::text));

DROP POLICY IF EXISTS "Admins gerenciam aulas (Insert)" ON public.aulas;
CREATE POLICY "Admins gerenciam aulas (Insert)" ON public.aulas FOR INSERT TO public WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins gerenciam aulas (Update)" ON public.aulas;
CREATE POLICY "Admins gerenciam aulas (Update)" ON public.aulas FOR UPDATE TO public USING (is_admin());

DROP POLICY IF EXISTS "Admins gerenciam aulas (Delete)" ON public.aulas;
CREATE POLICY "Admins gerenciam aulas (Delete)" ON public.aulas FOR DELETE TO public USING (is_admin());

DROP POLICY IF EXISTS "Leitura do dicionario" ON public.dicionario;
CREATE POLICY "Leitura do dicionario" ON public.dicionario FOR SELECT TO public USING (((SELECT auth.role()) = 'authenticated'::text));

DROP POLICY IF EXISTS "Admins gerenciam dicionario" ON public.dicionario;
CREATE POLICY "Admins gerenciam dicionario" ON public.dicionario FOR ALL TO public USING (is_admin());

DROP POLICY IF EXISTS "Leitura de dialogos" ON public.dialogos;
CREATE POLICY "Leitura de dialogos" ON public.dialogos FOR SELECT TO public USING (((SELECT auth.role()) = 'authenticated'::text));

DROP POLICY IF EXISTS "Admins gerenciam dialogos" ON public.dialogos;
CREATE POLICY "Admins gerenciam dialogos" ON public.dialogos FOR ALL TO public USING (is_admin());

DROP POLICY IF EXISTS "Leitura de linhas" ON public.dialogo_linhas;
CREATE POLICY "Leitura de linhas" ON public.dialogo_linhas FOR SELECT TO public USING (((SELECT auth.role()) = 'authenticated'::text));

DROP POLICY IF EXISTS "Admins gerenciam linhas" ON public.dialogo_linhas;
CREATE POLICY "Admins gerenciam linhas" ON public.dialogo_linhas FOR ALL TO public USING (is_admin());

DROP POLICY IF EXISTS "Leitura categorias" ON public.categorias_atividades;
CREATE POLICY "Leitura categorias" ON public.categorias_atividades FOR SELECT TO public USING (((SELECT auth.role()) = 'authenticated'::text));

DROP POLICY IF EXISTS "Admin gerencia categorias" ON public.categorias_atividades;
CREATE POLICY "Admin gerencia categorias" ON public.categorias_atividades FOR ALL TO public USING (is_admin());

DROP POLICY IF EXISTS "Leitura atividades" ON public.atividades;
CREATE POLICY "Leitura atividades" ON public.atividades FOR SELECT TO public USING (((SELECT auth.role()) = 'authenticated'::text));

DROP POLICY IF EXISTS "Admin gerencia atividades" ON public.atividades;
CREATE POLICY "Admin gerencia atividades" ON public.atividades FOR ALL TO public USING (is_admin());

DROP POLICY IF EXISTS "Permitir leitura de comentarios para todos os alunos autenticad" ON public.comentarios_aula;
CREATE POLICY "Permitir leitura de comentarios para todos os alunos autenticad" ON public.comentarios_aula FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admins can manage lixeira" ON public.registros_dinamicos_lixeira;
CREATE POLICY "admins can manage lixeira" ON public.registros_dinamicos_lixeira FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- 5. STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('dicionario', 'dicionario', true, 10485760, ARRAY['audio/mpeg','audio/mp3','audio/ogg','audio/wav','audio/webm']),
  ('atvdd_laoshi', 'atvdd_laoshi', true, null, null),
  ('atvdd_alunos', 'atvdd_alunos', true, 31457280, null),
  ('blog-assets', 'blog-assets', true, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/gif','audio/mpeg','audio/mp3','audio/ogg','audio/wav','audio/webm'])
ON CONFLICT (id) DO NOTHING;
