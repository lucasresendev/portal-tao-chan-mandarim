# 📚 11. Sistema da Biblioteca (CMS de Conteúdo)

A **Biblioteca** é um módulo de publicação e consumo de conteúdo rico integrado ao portal, acessível pelo admin para criar/gerenciar publicações e pelos alunos para leitura e consulta cultural/didática. Usa o editor open-source **Tiptap** (MIT License, `@tiptap/*`).

---

### 11.1 Banco de Dados

#### Tabela `publicacoes_blog`
*(Mantida com o identificador estável `publicacoes_blog` no PostgreSQL para integridade e preservação de referências físicas sem quebra de dados).*

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `uuid` PK | Gerado com `gen_random_uuid()` |
| `titulo` | `text NOT NULL` | Título da publicação |
| `slug` | `text UNIQUE NOT NULL` | URL amigável derivada do título |
| `capa_url` | `text` | URL pública da imagem de capa (bucket `blog-assets`) |
| `conteudo` | `jsonb NOT NULL` | Documento Tiptap em JSON (`JSONContent`) |
| `status` | `text` CHECK `'rascunho' \| 'publicado'` | Estado de publicação |
| `autor_id` | `uuid` FK → `alunos.id` | Admin/Lǎoshī que criou |
| `categoria` | `text NOT NULL` default `'Geral'` | Agrupamento temático |
| `tags` | `text[]` | Array de tags livres |
| `ordem_exibicao` | `integer` | Ordem manual definida pelo admin |
| `e_destaque` | `boolean NOT NULL default false` | Define se o post é o destaque geral unificado da biblioteca |
| `data_publicacao` | `timestamptz NOT NULL` | Data exibida ao aluno — **editável** pelo admin (default `now()`) |
| `created_at` | `timestamptz` | Data de criação técnica (imutável) |
| `updated_at` | `timestamptz` | Atualizado por trigger automático |

**Índices:** `status`, `categoria`, `ordem_exibicao`, `slug`, `data_publicacao`, `idx_publicacoes_blog_autor_id`

**Políticas RLS:**
- `SELECT ("Publico ve publicados")`: alunos e público anônimo veem registros com `status = 'publicado'`
- `SELECT ("Admin ve todos")`: administradores autenticados veem todos os materiais (incluindo rascunhos)
- `INSERT / UPDATE / DELETE`: restritos a administradores autenticados (`is_admin()`)

#### Função de Slug

```sql
generate_blog_slug(title text) RETURNS text
```
Gera slugs únicos, sanitizados (sem acentos, só `a-z0-9-`), com sufixo numérico incremental em caso de colisão.

---

### 11.2 Storage: Bucket `blog-assets`

| Propriedade | Valor |
|---|---|
| Nome | `blog-assets` |
| Acesso público | `true` (URLs públicas) |
| Limite por arquivo | 10 MB |
| MIME types permitidos | `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `audio/mpeg`, `audio/mp3`, `audio/ogg`, `audio/wav`, `audio/webm` |

> [!NOTE]
> O nome físico do bucket `blog-assets` é preservado pois todos os 11 artigos já publicados possuem URLs absolutas apontando para `/storage/v1/object/public/blog-assets/...` armazenadas nos documentos Tiptap JSON. Renomear o bucket corromperia as mídias dos artigos existentes.

**Estrutura de paths:**
```
blog-assets/
  images/{slug}/{nome_sanitizado}_{timestamp}_{token}.{ext}
  audio/{slug}/{nome_sanitizado}_{timestamp}_{token}.{ext}
```

**Helpers em `lib/bibliotecaStorage.ts`:**
- `uploadBibliotecaImage(slug, file)` → retorna URL pública
- `uploadBibliotecaAudio(slug, file)` → retorna URL pública
- `generateSlug(title)` → gera slug client-side para preview

---

### 11.3 Componentes e Editor Tiptap

Localizados prioritariamente em `app/components/biblioteca/`:

#### `app/components/biblioteca/TiptapEditor.tsx` (Client Component)
Editor interativo com suporte a BubbleMenu contextual para tabelas, imagens e áudios:

| Extensão | Funcionalidade |
|---|---|
| `StarterKit` | Parágrafos, headings H1-H3, listas, blockquote, code, HR |
| `Image` | Inserção de imagem por upload com alinhamento e seleção visual |
| `Link` | Links inline com `target="_blank"` |
| `TextAlign` | Alinhamento esq/centro/dir em parágrafos, headings e mídias |
| `Underline` | Sublinhado |
| `Highlight` | Destaque de texto |
| `Placeholder` | Texto de placeholder no editor vazio |
| `CharacterCount` | Contador de palavras/caracteres no rodapé |
| `AudioExtension` | Nó customizado para player de áudio |
| `Table`, `TableRow`, `TableHeader`, `TableCell` | Tabelas interativas com colunas redimensionáveis |

#### `app/components/biblioteca/AudioNode.tsx`
Extensão Tiptap customizada do tipo `block`, `atom`, `draggable`. Armazena `{ src: string, title: string }` no JSON. Na edição usa `ReactNodeViewRenderer` para exibir um player estilizado. Na renderização usa apenas HTML nativo `<audio controls>`.

#### `app/components/biblioteca/EditorToolbar.tsx`
Barra de ferramentas completa e responsiva: Desfazer/Refazer, Parágrafo, H1/H2/H3, Bold, Italic, Underline, Tachado, Destacar, Código inline, Tabelas 3x3, Alinhamento (3), Lista com marcadores, Lista numerada, Blockquote, Bloco de código, Separador horizontal, Link/Unlink, Upload de Imagem, Upload de Áudio.

#### `app/components/biblioteca/TiptapRenderer.tsx` (Client Component)
Renderizador read-only de alta performance. Usa `generateHTML` de `@tiptap/core` para converter `JSONContent` → HTML string. Aplica as classes `biblioteca-reader-content` e `biblioteca-table-wrapper` para estilo de leitura.

#### `app/components/biblioteca/BibliotecaCard.tsx`
Card elegante para a grade de publicações da biblioteca com suporte a capa, badges de categoria, data formatada e tags.

---

### 11.4 Tipos TypeScript

Arquivo principal: `types/biblioteca.ts` (com aliases retrocompatíveis em `types/blog.ts`):

```typescript
export type BibliotecaStatus = 'rascunho' | 'publicado';

export type PublicacaoBiblioteca = {
    id: string;
    titulo: string;
    slug: string;
    capa_url: string | null;
    conteudo: JSONContent;
    status: BibliotecaStatus;
    autor_id: string | null;
    categoria: string;
    tags: string[];
    ordem_exibicao: number;
    e_destaque: boolean;
    data_publicacao: string;
    created_at: string;
    updated_at: string;
};

export type PublicacaoBibliotecaFormData = {
    titulo: string;
    capa_url: string | null;
    conteudo: JSONContent;
    status: BibliotecaStatus;
    categoria: string;
    tags: string[];
    ordem_exibicao: number;
    e_destaque: boolean;
    data_publicacao: string;
};
```

---

### 11.5 Rotas

#### Admin (`/admin/biblioteca`)

| Rota | Arquivo | Função |
|---|---|---|
| `/admin/biblioteca` | `app/admin/biblioteca/page.tsx` | Painel de controle da biblioteca: métricas, busca, categorias, toggles de status, Destaque Geral (estrela) e reordenação |
| `/admin/biblioteca/nova` | `app/admin/biblioteca/nova/page.tsx` | Criação de novo material na biblioteca |
| `/admin/biblioteca/[id]` | `app/admin/biblioteca/[id]/page.tsx` | Edição de material existente (carrega por UUID) |
| `/admin/blog/*` | `app/admin/blog/*` | Redirects 307 para as rotas correspondentes em `/admin/biblioteca/*` |

#### Aluno (`/dashboard/biblioteca`)

| Rota | Arquivo | Função |
|---|---|---|
| `/dashboard/biblioteca` | `app/dashboard/biblioteca/page.tsx` | Página inicial da biblioteca: artigo em destaque (hero), filtro de categorias, grid de artigos agrupados por categoria |
| `/dashboard/biblioteca/[slug]` | `app/dashboard/biblioteca/[slug]/page.tsx` | Leitura do artigo: capa, breadcrumb, metadados, conteúdo renderizado com `TiptapRenderer`, tags no rodapé |
| `/dashboard/blog` | `app/dashboard/blog/page.tsx` | Redirect 307 para `/dashboard/biblioteca` |
| `/dashboard/blog/[slug]` | `app/dashboard/blog/[slug]/page.tsx` | Redirect 307 para `/dashboard/biblioteca/[slug]` |

**Filtragem por categoria:** query param `?categoria=X` ativa filtro. Botão "Ver todos →" por grupo leva ao filtro daquela categoria.

---

### 11.6 Navegação — Acesso Direto à Biblioteca

O acesso à **Biblioteca** no dashboard do aluno (`app/dashboard/page.tsx`) e na barra lateral (`Sidebar.tsx`) é direto e sem intermediários:

- **Destino Direto:** `/dashboard/biblioteca`.
- **Eliminação do Notion:** O link externo do Portal Notion foi completamente removido, pois todo o conteúdo foi unificado dentro da própria Biblioteca.
- **Navegação no Menu Lateral (`Sidebar.tsx`):** Exibe link direto para `Biblioteca` tanto no Portal do Aluno quanto no Painel Lǎoshī.

---

### 11.7 CSS (globals.css)

Classes unificadas para consistência estética perfeita:

- **`.biblioteca-cover-wrapper`** — proporção `16:9` em container premium, cantos arredondados generosos (`border-radius: 1.25rem`), sombra 3D sutil (`box-shadow: 0 10px 30px rgba(0,0,0,0.08)`) e borda suave.
- **`.biblioteca-reader-content img`** — imagens do corpo possuem sombra 3D sutil e borda unificada com a capa.
- **`.biblioteca-editor-content .tableWrapper` & `.biblioteca-reader-content .biblioteca-table-wrapper`** — contêineres de scroll horizontal com sombra 3D envolvente e bordas arredondadas (`0.875rem`).
- **Tabelas Unificadas (`table`)** — semântica `display: table` e `width: 100%`, `border-collapse: separate`, cantos arredondados perfeitos, efeito zebra no fundo (`#fafaf9`) e realce hover suave (`#fff8f8`).

---

### 11.8 Estratégia de Caching e Otimização

1. **`unstable_cache` (Next.js)**:
   - Envelopa as requisições de busca ao banco de dados no lado do servidor.
   - Utiliza um cliente estático do Supabase (`createClient`) criado a partir de variáveis de ambiente públicas, permitindo cache compartilhado globalmente entre todos os alunos.

2. **Estratégias de TTL**:
   - **Listagem de Publicações (`/dashboard/biblioteca`)**: Cache com revalidação automática a cada 60 segundos (`revalidate: 60`, tags `biblioteca-posts`, `blog-posts`).
   - **Visualização do Artigo (`/dashboard/biblioteca/[slug]`)**: Cache com revalidação automática a cada 5 minutos (`revalidate: 300`, tag `biblioteca-post-[slug]`).

3. **Invalidação Sob Demanda (On-Demand Revalidation)**:
   - Implementado no Server Action `revalidateBibliotecaCacheAction` (`app/actions/biblioteca-actions.ts`).
   - Chamado automaticamente ao criar, editar, alternar destaque ou excluir um post no editor administrativo.
   - Purga instantaneamente o cache da listagem e da página individual do post correspondente.
