-- ============================================================================
-- MIGRAÇÃO: OTIMIZAÇÃO DE ÍNDICES, SEARCH PATH, RPCS E RLS
-- Data: 2026-09-23
-- Idempotente, não-destrutiva e com preservação semântica estrita de RLS.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SUB-ETAPA 2A: DDL NÃO DESTRUTIVO (ÍNDICES DE COBERTURA E SEARCH_PATH)
-- ----------------------------------------------------------------------------

-- 1. Índices de cobertura em chaves estrangeiras não indexadas
CREATE INDEX IF NOT EXISTS idx_comentarios_aula_aluno_id ON public.comentarios_aula(aluno_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_aula_aula_id ON public.comentarios_aula(aula_id);
CREATE INDEX IF NOT EXISTS idx_dicionario_licao_oficial_id ON public.dicionario(licao_oficial_id);
CREATE INDEX IF NOT EXISTS idx_progresso_dialogo_dialogo_id ON public.progresso_dialogo(dialogo_id);
CREATE INDEX IF NOT EXISTS idx_progresso_srs_cards_dicionario_id ON public.progresso_srs_cards(dicionario_id);
CREATE INDEX IF NOT EXISTS idx_publicacoes_blog_autor_id ON public.publicacoes_blog(autor_id);

-- 2. search_path seguro nas funções públicas incluindo 'public' e 'extensions'
ALTER FUNCTION public.update_modtime() SET search_path = public, extensions;
ALTER FUNCTION public.generate_blog_slug(text) SET search_path = public, extensions;
ALTER FUNCTION public.update_blog_updated_at() SET search_path = public, extensions;
ALTER FUNCTION public.handle_new_user() SET search_path = public, extensions;

-- ----------------------------------------------------------------------------
-- SUB-ETAPA 2B: SEGURANÇA E RLS COM PRESERVAÇÃO SEMÂNTICA ESTRITA
-- ----------------------------------------------------------------------------

-- 3. Blindagem de RPCs contra chamadas externas indevidas
-- handle_new_user() é chamado exclusivamente pelo trigger do auth.users
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

-- is_admin() fechado para anônimos
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;

-- 4. Otimização de RLS: auth.uid() -> (select auth.uid()) preservando cmd/roles/USING/WITH CHECK

-- public.alunos
DROP POLICY IF EXISTS "Atualização de perfil" ON public.alunos;
CREATE POLICY "Atualização de perfil" ON public.alunos
  FOR UPDATE TO public
  USING ((((select auth.uid()) = id) OR is_admin()));

DROP POLICY IF EXISTS "Leitura de perfil" ON public.alunos;
CREATE POLICY "Leitura de perfil" ON public.alunos
  FOR SELECT TO public
  USING ((((select auth.uid()) = id) OR is_admin()));

-- public.progresso_aluno
DROP POLICY IF EXISTS "Atualização de progresso" ON public.progresso_aluno;
CREATE POLICY "Atualização de progresso" ON public.progresso_aluno
  FOR UPDATE TO public
  USING ((((select auth.uid()) = aluno_id) OR is_admin()));

DROP POLICY IF EXISTS "Inserção de progresso" ON public.progresso_aluno;
CREATE POLICY "Inserção de progresso" ON public.progresso_aluno
  FOR INSERT TO public
  WITH CHECK ((((select auth.uid()) = aluno_id) OR is_admin()));

DROP POLICY IF EXISTS "Leitura do progresso" ON public.progresso_aluno;
CREATE POLICY "Leitura do progresso" ON public.progresso_aluno
  FOR SELECT TO public
  USING ((((select auth.uid()) = aluno_id) OR is_admin()));

-- public.progresso_dialogo
DROP POLICY IF EXISTS "Insercao progresso jogo" ON public.progresso_dialogo;
CREATE POLICY "Insercao progresso jogo" ON public.progresso_dialogo
  FOR INSERT TO public
  WITH CHECK ((((select auth.uid()) = aluno_id) OR is_admin()));

DROP POLICY IF EXISTS "Leitura progresso jogo" ON public.progresso_dialogo;
CREATE POLICY "Leitura progresso jogo" ON public.progresso_dialogo
  FOR SELECT TO public
  USING ((((select auth.uid()) = aluno_id) OR is_admin()));

DROP POLICY IF EXISTS "Update progresso jogo" ON public.progresso_dialogo;
CREATE POLICY "Update progresso jogo" ON public.progresso_dialogo
  FOR UPDATE TO public
  USING ((((select auth.uid()) = aluno_id) OR is_admin()));

-- public.comentarios_aula
DROP POLICY IF EXISTS "Permitir criacao de comentario pelo proprio aluno" ON public.comentarios_aula;
CREATE POLICY "Permitir criacao de comentario pelo proprio aluno" ON public.comentarios_aula
  FOR INSERT TO authenticated
  WITH CHECK (((select auth.uid()) = aluno_id));

DROP POLICY IF EXISTS "Permitir exclusao de comentario pelo proprio aluno" ON public.comentarios_aula;
CREATE POLICY "Permitir exclusao de comentario pelo proprio aluno" ON public.comentarios_aula
  FOR DELETE TO authenticated
  USING (((select auth.uid()) = aluno_id));

-- public.progresso_srs_cards
DROP POLICY IF EXISTS "srs_cards_admin" ON public.progresso_srs_cards;
CREATE POLICY "srs_cards_admin" ON public.progresso_srs_cards
  FOR ALL TO public
  USING ((EXISTS ( SELECT 1 FROM alunos WHERE ((alunos.id = (select auth.uid())) AND (alunos.is_admin = true)))));

DROP POLICY IF EXISTS "srs_cards_all_aluno" ON public.progresso_srs_cards;
CREATE POLICY "srs_cards_all_aluno" ON public.progresso_srs_cards
  FOR ALL TO public
  USING (((select auth.uid()) = aluno_id))
  WITH CHECK (((select auth.uid()) = aluno_id));

-- public.progresso_srs_diario
DROP POLICY IF EXISTS "srs_diario_admin" ON public.progresso_srs_diario;
CREATE POLICY "srs_diario_admin" ON public.progresso_srs_diario
  FOR ALL TO public
  USING ((EXISTS ( SELECT 1 FROM alunos WHERE ((alunos.id = (select auth.uid())) AND (alunos.is_admin = true)))));

DROP POLICY IF EXISTS "srs_diario_all_aluno" ON public.progresso_srs_diario;
CREATE POLICY "srs_diario_all_aluno" ON public.progresso_srs_diario
  FOR ALL TO public
  USING (((select auth.uid()) = aluno_id))
  WITH CHECK (((select auth.uid()) = aluno_id));

-- public.progresso_srs_meta
DROP POLICY IF EXISTS "srs_meta_admin" ON public.progresso_srs_meta;
CREATE POLICY "srs_meta_admin" ON public.progresso_srs_meta
  FOR ALL TO public
  USING ((EXISTS ( SELECT 1 FROM alunos WHERE ((alunos.id = (select auth.uid())) AND (alunos.is_admin = true)))));

DROP POLICY IF EXISTS "srs_meta_all_aluno" ON public.progresso_srs_meta;
CREATE POLICY "srs_meta_all_aluno" ON public.progresso_srs_meta
  FOR ALL TO public
  USING (((select auth.uid()) = aluno_id))
  WITH CHECK (((select auth.uid()) = aluno_id));

-- public.publicacoes_blog
DROP POLICY IF EXISTS "Alunos veem apenas publicados" ON public.publicacoes_blog;
DROP POLICY IF EXISTS "Publico ve publicados" ON public.publicacoes_blog;
CREATE POLICY "Publico ve publicados" ON public.publicacoes_blog
  FOR SELECT TO anon, authenticated
  USING (status = 'publicado'::text);

DROP POLICY IF EXISTS "Admin ve todos" ON public.publicacoes_blog;
CREATE POLICY "Admin ve todos" ON public.publicacoes_blog
  FOR SELECT TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Apenas admin pode atualizar" ON public.publicacoes_blog;
CREATE POLICY "Apenas admin pode atualizar" ON public.publicacoes_blog
  FOR UPDATE TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Apenas admin pode deletar" ON public.publicacoes_blog;
CREATE POLICY "Apenas admin pode deletar" ON public.publicacoes_blog
  FOR DELETE TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Apenas admin pode inserir" ON public.publicacoes_blog;
CREATE POLICY "Apenas admin pode inserir" ON public.publicacoes_blog
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- public.registros_dinamicos
DROP POLICY IF EXISTS "Delecao respostas" ON public.registros_dinamicos;
CREATE POLICY "Delecao respostas" ON public.registros_dinamicos
  FOR DELETE TO public
  USING ((((select auth.uid()) = aluno_id) OR is_admin()));

DROP POLICY IF EXISTS "Edicao respostas" ON public.registros_dinamicos;
CREATE POLICY "Edicao respostas" ON public.registros_dinamicos
  FOR UPDATE TO public
  USING ((((select auth.uid()) = aluno_id) OR is_admin()));

DROP POLICY IF EXISTS "Insercao respostas" ON public.registros_dinamicos;
CREATE POLICY "Insercao respostas" ON public.registros_dinamicos
  FOR INSERT TO public
  WITH CHECK ((((select auth.uid()) = aluno_id) OR is_admin()));

DROP POLICY IF EXISTS "Leitura respostas" ON public.registros_dinamicos;
CREATE POLICY "Leitura respostas" ON public.registros_dinamicos
  FOR SELECT TO public
  USING ((((select auth.uid()) = aluno_id) OR is_admin()));
