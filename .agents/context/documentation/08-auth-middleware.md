# 🔒 8. Infraestrutura de Autenticação, Middleware & Server Actions

A segurança de acesso e a consistência das sessões de usuário são garantidas por uma estrutura de proteção em duas camadas: o Middleware de borda (Next.js Edge Proxy) e a autocorreção de estado no cliente (Session Healing).

### 8.1 Autocorreção de Estado no Cliente (Session Healing)

Quando um estudante passa muito tempo inativo, a sessão de autenticação do Supabase expira. O SDK clássico do Supabase entra em um loop infinito de tentativas consecutivas de renovação de refresh token na tentativa de recuperar o estado de login, o que gera centenas de requisições que podem bloquear a conexão e estourar os limites de requisições da plataforma.

Para mitigar essa falha, o provedor global da aplicação (`providers.tsx`) inicializa um listener que monitora a mudança de estados de login do Supabase e executa uma limpeza proativa de cookies de sessão órfãos quando há falha de autenticação:

```typescript
useEffect(() => {
  const supabase = createClient();
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
    if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') return;

    // Detecta falha de renovação de token (sessão expirada / stale)
    if ((event as string) === 'TOKEN_REFRESH_FAILED') {
      // 1. Limpa chaves do Supabase no localStorage para interromper loops de retry
      if (typeof window !== 'undefined') {
        const keys = Object.keys(localStorage).filter(k => k.startsWith('sb-') || k.includes('-auth-token'));
        keys.forEach(k => localStorage.removeItem(k));
      }
      // 2. Executa signout local
      await supabase.auth.signOut().catch(() => {});
      // 3. Apenas redireciona se estiver fora da página de login (evita reload loop)
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  });
  return () => subscription.unsubscribe();
}, []);
```

---

### 8.2 O Escudo Middleware de Proteção de Rotas (`proxy.ts`)

A proteção de rotas privadas é gerenciada na camada de Middleware Edge do Next.js. O arquivo `proxy.ts` atua como um escudo dinâmico para as rotas `/dashboard` e `/admin`:

1.  **Categorização de Rotas:** O sistema mapeia se a URL de requisição pertence a rotas de API do servidor (`/api/`), rotas protegidas acadêmicas (`/dashboard`, `/admin`) ou rotas de autenticação pública (`/login`, `/`).
2.  **Validação de Sessão Concorrente:** Tenta recuperar a sessão ativa no Supabase via `supabase.auth.getSession()`.
3.  **Tratamento de Expiramento e Cookies Órfãos:** Caso a validação de sessão falhe no middleware (por exemplo, cookie corrompido ou sessão excluída no painel do banco de dados), o middleware intercepta o erro, remove ativamente do cabeçalho da requisição todos os cookies que contenham o token de acesso (`-auth-token` ou `sb-`) para evitar loops infinitos de redirecionamento, e encaminha o estudante de volta à página `/login`.
4.  **Preservação Dinâmica de Redirecionamento (`returnTo`):** Se o aluno for redirecionado para a tela de login por inatividade no meio de um exame ou de uma aula, o Middleware anexa o caminho original de destino ao parâmetro URL de busca `returnTo` (Ex: `/login?returnTo=/dashboard/atividades/prova-final`). Ao completar a autenticação na tela de login, o fluxo redireciona o usuário diretamente de volta à rota de onde ele foi interrompido, salvando a experiência de navegação do aluno.
5.  **Controle Estrito de Nível de Acesso (Administrador):** Caso um estudante autenticado comum sem a flag `is_admin = true` tente forçar a URL do painel administrativo (`/admin`), o Middleware intercepta a requisição e o bloqueia, redirecionando o fluxo de forma segura de volta para o dashboard estudantil (`/dashboard`).

---

### 8.3 Assinaturas das Server Actions Administrativas (`admin-actions.ts`)

Para garantir privilégios administrativos nas criações de usuários no painel do professor, o sistema delega chamadas assíncronas para **Server Actions** rodando sob o cliente administrativo `supabaseAdmin` utilizando a chave de acesso privada `SUPABASE_SERVICE_ROLE_KEY`:

```typescript
// 1. Criação de Contas de Alunos com Auto-Confirmação
export async function createStudentAction(formData: FormData): Promise<{ success?: boolean; error?: string; demoPayloads?: DemoServerPayload[] }>

// 2. Modificação Segura de Credenciais de Acesso de Alunos
export async function updateStudentCredentialsAction(params: {
  userId: string;
  email?: string;
  password?: string;
}): Promise<{ success?: boolean; error?: string; demoPayloads?: DemoServerPayload[] }>
```

*   **Auto-Confirmação de Contas:** Ao criar a conta de um novo aluno, a action configura `email_confirm: true` no método `auth.admin.createUser()` do Supabase para contornar a necessidade de confirmação via e-mail e permitir que o professor libere o acesso imediato de novos estudantes em sala de aula.
*   **Sincronização com o Sandbox do Portfólio (`demoPayloads`):** Em modo de demonstração (`NEXT_PUBLIC_DEMO_MODE=true`), as Server Actions retornam `demoPayloads` para sincronizar imediatamente as mutações de servidor com o armazenamento isolado do navegador (`applyDemoServerPayloads`).

