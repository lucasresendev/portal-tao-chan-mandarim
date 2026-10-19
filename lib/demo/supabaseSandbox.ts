import seedDataRaw from './seedData.json';

export interface DemoUserRecord {
  id: string;
  email: string;
  password?: string;
  nome: string;
  is_admin: boolean;
  status_matricula: string;
  created_at: string;
  updated_at: string;
}

type RowRecord = Record<string, unknown>;
type TableMap = Record<string, RowRecord[]>;

interface SeedBundle {
  users: DemoUserRecord[];
  tables: TableMap;
}

const seedBundle = seedDataRaw as unknown as SeedBundle;

export const DEMO_SUPABASE_URL = 'https://portfolio-demo.supabase.co';
export const DEMO_STORAGE_KEY = 'tcm_portfolio_sandbox_db_v7';
export const DEMO_ACTIVE_USER_KEY = 'tcm_portfolio_active_user_v5';

export const DEMO_ACCOUNTS = {
  student: {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'maria.demo@taochan.dev',
    password: 'DemoPortfolio2026!',
    nome: 'Maria Fernanda',
    roleLabel: 'Estudante (HSK 1-2)',
  },
  admin: {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'admin.demo@taochan.dev',
    password: 'DemoPortfolio2026!',
    nome: 'Prof. Lucas (Demo)',
    roleLabel: 'Professor / Admin',
  },
} as const;

// Clona profundamente o seed inicial para isolamento seguro
function cloneSeedTables(): TableMap {
  return JSON.parse(JSON.stringify(seedBundle.tables)) as TableMap;
}

function cloneSeedUsers(): DemoUserRecord[] {
  return JSON.parse(JSON.stringify(seedBundle.users)) as DemoUserRecord[];
}

// Estado em memória (usado no SSR e sincronizado com localStorage no navegador)
let memoryTables: TableMap | null = null;
let memoryUsers: DemoUserRecord[] | null = null;
const uploadedBlobUrls = new Map<string, string>();

function getStore(): { tables: TableMap; users: DemoUserRecord[] } {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem('tcm_portfolio_sandbox_db_v1');
      window.localStorage.removeItem('tcm_portfolio_sandbox_db_v2');
      window.localStorage.removeItem('tcm_portfolio_sandbox_db_v3');
      window.localStorage.removeItem('tcm_portfolio_sandbox_db_v4');
      const raw = window.localStorage.getItem(DEMO_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { tables: TableMap; users: DemoUserRecord[] };
        if (parsed && parsed.tables && parsed.users) {
          memoryTables = parsed.tables;
          memoryUsers = parsed.users;
          return parsed;
        }
      }
    } catch {
      // Fallback para memória caso localStorage esteja indisponível
    }
  }

  if (!memoryTables || !memoryUsers) {
    memoryTables = cloneSeedTables();
    memoryUsers = cloneSeedUsers();
  }

  return { tables: memoryTables, users: memoryUsers };
}

export function getDemoTableRows<T = RowRecord>(tableName: string): T[] {
  const { tables } = getStore();
  return ((tables[tableName] || []) as unknown) as T[];
}

function saveStore(tables: TableMap, users: DemoUserRecord[]): void {
  memoryTables = tables;
  memoryUsers = users;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ tables, users }));
    } catch {
      // Ignora erro de quota
    }
  }
}

export interface DemoServerPayload {
  table: string;
  row: RowRecord;
  conflictKeys: string[];
}

export function applyDemoServerPayloads(payloads?: DemoServerPayload[]): void {
  if (!payloads || payloads.length === 0) return;
  const { tables, users } = getStore();
  for (const item of payloads) {
    if (!tables[item.table]) {
      tables[item.table] = [];
    }
    const list = tables[item.table];
    const existingIdx = list.findIndex((r) =>
      item.conflictKeys.every((k) => String(r[k]) === String(item.row[k]))
    );
    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], ...item.row };
    } else {
      const newRow: RowRecord = {
        id: (item.row.id as string) || crypto.randomUUID(),
        created_at: (item.row.created_at as string) || new Date().toISOString(),
        ...item.row,
      };
      list.push(newRow);
    }

    if (item.table === 'alunos' && item.row.id) {
      const userIdx = users.findIndex((u) => u.id === item.row.id);
      if (userIdx >= 0) {
        users[userIdx] = {
          ...users[userIdx],
          nome: (item.row.nome as string) ?? users[userIdx].nome,
          email: (item.row.email as string) ?? users[userIdx].email,
          status_matricula:
            (item.row.status_matricula as string) ?? users[userIdx].status_matricula,
        };
      } else if (item.row.email) {
        users.push({
          id: String(item.row.id),
          email: String(item.row.email),
          nome: String(item.row.nome || 'Novo Aluno'),
          is_admin: Boolean(item.row.is_admin),
          status_matricula: String(item.row.status_matricula || 'Ativa'),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }
  }
  saveStore(tables, users);
}

export function resetPortfolioDemoStore(): void {
  memoryTables = cloneSeedTables();
  memoryUsers = cloneSeedUsers();
  uploadedBlobUrls.clear();
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(DEMO_STORAGE_KEY);
      window.localStorage.removeItem('srs_session_backup');
      window.localStorage.removeItem('srs_backup_session');
    } catch {
      // Ignora
    }
  }
}

export function getUploadedBlobUrl(bucketAndPath: string): string | undefined {
  return uploadedBlobUrls.get(bucketAndPath);
}

export function normalizeDemoStorageUrl(rawUrl: string): string {
  if (!rawUrl) return rawUrl;
  const prefix = `${DEMO_SUPABASE_URL}/storage/v1/object/public/`;
  if (rawUrl.startsWith(prefix)) {
    const rel = rawUrl.slice(prefix.length);
    const blobOverride = uploadedBlobUrls.get(decodeURIComponent(rel)) || uploadedBlobUrls.get(rel);
    if (blobOverride) return blobOverride;
    return `/demo-storage/${rel}`;
  }
  if (rawUrl.startsWith('/storage/v1/object/public/')) {
    const rel = rawUrl.replace(/^\/storage\/v1\/object\/public\//, '');
    const blobOverride = uploadedBlobUrls.get(decodeURIComponent(rel)) || uploadedBlobUrls.get(rel);
    if (blobOverride) return blobOverride;
    return `/demo-storage/${rel}`;
  }
  return rawUrl;
}

// Codificador Base64URL compatível com Browser, Node e Edge Runtime
function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(b64url: string): string {
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) {
    b64 += '=';
  }
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function buildDemoJwt(user: DemoUserRecord): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const expSec = nowSec + 60 * 60 * 24 * 30; // 30 dias
  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = toBase64Url(
    JSON.stringify({
      aud: 'authenticated',
      exp: expSec,
      iat: nowSec,
      iss: `${DEMO_SUPABASE_URL}/auth/v1`,
      sub: user.id,
      email: user.email,
      phone: '',
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { nome: user.nome, is_admin: user.is_admin },
      role: 'authenticated',
      aal: 'aal1',
      amr: [{ method: 'password', timestamp: nowSec }],
      session_id: `sess-${user.id}`,
    })
  );
  const signature = toBase64Url(`demo-sig-${user.id}`);
  return `${header}.${payload}.${signature}`;
}

function toSupabaseAuthUser(user: DemoUserRecord) {
  return {
    id: user.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: user.email,
    email_confirmed_at: user.created_at,
    phone: '',
    confirmed_at: user.created_at,
    last_sign_in_at: new Date().toISOString(),
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { nome: user.nome, is_admin: user.is_admin },
    identities: [],
    created_at: user.created_at,
    updated_at: user.updated_at,
    is_anonymous: false,
  };
}

function buildSessionPayload(user: DemoUserRecord) {
  const nowSec = Math.floor(Date.now() / 1000);
  const expiresIn = 60 * 60 * 24 * 30;
  return {
    access_token: buildDemoJwt(user),
    token_type: 'bearer',
    expires_in: expiresIn,
    expires_at: nowSec + expiresIn,
    refresh_token: `demo-refresh-${user.id}`,
    user: toSupabaseAuthUser(user),
  };
}

let lastResolvedUserId: string | null = null;

function extractUserFromAuthHeader(headers: Headers, users: DemoUserRecord[]): DemoUserRecord {
  const authHeader = headers.get('authorization') || headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (token && token.split('.').length === 3) {
    try {
      const payloadJson = JSON.parse(fromBase64Url(token.split('.')[1])) as { sub?: string; email?: string };
      if (payloadJson.sub) {
        const found = users.find((u) => u.id === payloadJson.sub);
        if (found) {
          lastResolvedUserId = found.id;
          return found;
        }
      }
      if (payloadJson.email) {
        const foundByEmail = users.find((u) => u.email.toLowerCase() === payloadJson.email?.toLowerCase());
        if (foundByEmail) {
          lastResolvedUserId = foundByEmail.id;
          return foundByEmail;
        }
      }
    } catch {
      // Prossegue para fallback
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const activeId = window.localStorage.getItem(DEMO_ACTIVE_USER_KEY);
      if (activeId) {
        const found = users.find((u) => u.id === activeId);
        if (found) {
          lastResolvedUserId = found.id;
          return found;
        }
      }
    } catch {
      // Ignora
    }
  }

  if (lastResolvedUserId) {
    const foundLast = users.find((u) => u.id === lastResolvedUserId);
    if (foundLast) return foundLast;
  }

  return users.find((u) => u.id === DEMO_ACCOUNTS.student.id) || users[0];
}

// ============================================================================
// MOTOR DE CONSULTAS POSTGREST EM MEMÓRIA / LOCALSTORAGE
// ============================================================================

function parseInValues(raw: string): string[] {
  const inner = raw.replace(/^\(/, '').replace(/\)$/, '');
  if (!inner.trim()) return [];
  return inner.split(',').map((s) => s.trim().replace(/^"|"$/g, ''));
}

function matchesCondition(row: RowRecord, col: string, expr: string): boolean {
  const val = row[col];

  if (expr.startsWith('eq.')) {
    const target = expr.slice(3);
    if (target === 'true') return val === true || String(val) === 'true';
    if (target === 'false') return val === false || String(val) === 'false';
    return String(val ?? '') === target;
  }

  if (expr.startsWith('neq.')) {
    const target = expr.slice(4);
    if (target === 'true') return val !== true;
    if (target === 'false') return val !== false;
    return String(val ?? '') !== target;
  }

  if (expr.startsWith('in.')) {
    const list = parseInValues(expr.slice(3));
    return list.includes(String(val ?? ''));
  }

  if (expr === 'is.null') {
    return val === null || val === undefined;
  }

  if (expr === 'not.is.null') {
    return val !== null && val !== undefined;
  }

  if (expr.startsWith('ilike.')) {
    const pattern = expr.slice(6).replace(/%/g, '').toLowerCase();
    return String(val ?? '').toLowerCase().includes(pattern);
  }

  return true;
}

function matchesOrExpression(row: RowRecord, orExpr: string): boolean {
  const cleaned = orExpr.replace(/^\(/, '').replace(/\)$/, '');
  // Divide em cláusulas de topo (respeitando parênteses de .in.(...))
  const clauses: string[] = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      clauses.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) clauses.push(current.trim());

  return clauses.some((clause) => {
    const dotIdx = clause.indexOf('.');
    if (dotIdx === -1) return false;
    const col = clause.slice(0, dotIdx);
    const cond = clause.slice(dotIdx + 1);
    return matchesCondition(row, col, cond);
  });
}

function applySelectAndJoins(row: RowRecord, selectParam: string | null, tables: TableMap): RowRecord {
  const copy: RowRecord = { ...row };
  if (!selectParam || selectParam.trim() === '*') {
    return copy;
  }

  // Detecta joins relacionais do PostgREST: ex. "alunos(nome)", "aluno:alunos(id, nome)", "aula:aulas(codigo_aula, titulo_descritivo)"
  const joinRegex = /(?:([a-zA-Z0-9_]+):)?([a-zA-Z0-9_]+)\(([^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = joinRegex.exec(selectParam)) !== null) {
    const alias = match[1] || match[2];
    const targetTable = match[2];
    const cols = match[3]
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    const targetRows = tables[targetTable] || [];
    let fkValue: unknown = null;
    if (targetTable === 'alunos') fkValue = row['aluno_id'] ?? row['autor_id'];
    else if (targetTable === 'aulas') fkValue = row['aula_id'] ?? row['licao_oficial_id'];
    else if (targetTable === 'categorias_atividades') fkValue = row['categoria_id'];
    else if (targetTable === 'dialogos') fkValue = row['dialogo_id'];
    else if (targetTable === 'atividades') fkValue = row['atividade_id'];
    else if (targetTable === 'dicionario') fkValue = row['dicionario_id'];

    const found = targetRows.find((r) => r['id'] === fkValue) || null;
    if (!found) {
      copy[alias] = null;
    } else if (cols.includes('*')) {
      copy[alias] = { ...found };
    } else {
      const projected: RowRecord = {};
      for (const c of cols) {
        projected[c] = found[c];
      }
      copy[alias] = projected;
    }
  }

  return copy;
}

function sortRows(rows: RowRecord[], orderParams: string[]): RowRecord[] {
  if (orderParams.length === 0) return rows;

  const specs: Array<{ col: string; asc: boolean }> = [];
  for (const param of orderParams) {
    for (const part of param.split(',')) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const pieces = trimmed.split('.');
      const col = pieces[0];
      const dir = pieces[1] || 'asc';
      specs.push({ col, asc: dir.toLowerCase() !== 'desc' });
    }
  }

  return [...rows].sort((a, b) => {
    for (const { col, asc } of specs) {
      const va = a[col];
      const vb = b[col];
      if (va === vb) continue;
      if (va === null || va === undefined) return asc ? 1 : -1;
      if (vb === null || vb === undefined) return asc ? -1 : 1;
      const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
      if (cmp !== 0) return asc ? cmp : -cmp;
    }
    return 0;
  });
}

function randomUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders,
    },
  });
}

async function handleAuthRequest(url: URL, method: string, headers: Headers, bodyText: string): Promise<Response> {
  const { tables, users } = getStore();
  const path = url.pathname.replace(/^\/auth\/v1/, '');

  // POST /token (signInWithPassword / refresh_token)
  if (path === '/token' && method === 'POST') {
    let payload: Record<string, unknown> = {};
    try {
      payload = bodyText ? (JSON.parse(bodyText) as Record<string, unknown>) : {};
    } catch {
      payload = {};
    }

    const grantType = url.searchParams.get('grant_type') || 'password';
    if (grantType === 'refresh_token') {
      const refreshToken = String(payload.refresh_token || '');
      const userId = refreshToken.replace(/^demo-refresh-/, '');
      const user = users.find((u) => u.id === userId) || extractUserFromAuthHeader(headers, users);
      return jsonResponse(buildSessionPayload(user));
    }

    const email = String(payload.email || '').trim().toLowerCase();
    const password = String(payload.password || '');
    const user = users.find((u) => u.email.toLowerCase() === email);

    if (!user || (user.password && user.password !== password && password !== DEMO_ACCOUNTS.student.password)) {
      return jsonResponse(
        { error: 'invalid_grant', error_description: 'Invalid login credentials', message: 'Invalid login credentials' },
        400
      );
    }

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(DEMO_ACTIVE_USER_KEY, user.id);
      } catch {
        // Ignora
      }
    }

    return jsonResponse(buildSessionPayload(user));
  }

  // GET / PUT /user
  if (path === '/user') {
    const currentUser = extractUserFromAuthHeader(headers, users);
    if (method === 'GET') {
      return jsonResponse(toSupabaseAuthUser(currentUser));
    }
    if (method === 'PUT') {
      const updates = bodyText ? (JSON.parse(bodyText) as { email?: string; password?: string }) : {};
      if (updates.email) currentUser.email = updates.email;
      if (updates.password) currentUser.password = updates.password;
      currentUser.updated_at = new Date().toISOString();
      saveStore(tables, users);
      return jsonResponse({ user: toSupabaseAuthUser(currentUser) });
    }
  }

  // POST /logout
  if (path === '/logout') {
    return new Response(null, { status: 204 });
  }

  // Rotas Admin: /admin/users e /admin/users/:id
  if (path.startsWith('/admin/users')) {
    const idMatch = path.match(/^\/admin\/users\/([^/]+)$/);
    if (!idMatch && method === 'GET') {
      return jsonResponse({ users: users.map(toSupabaseAuthUser), aud: 'authenticated' });
    }
    if (!idMatch && method === 'POST') {
      const body = bodyText ? (JSON.parse(bodyText) as { email?: string; password?: string }) : {};
      const newId = randomUuid();
      const nowIso = new Date().toISOString();
      const email = body.email || `aluno.${newId.slice(0, 5)}@taochan.dev`;
      const newUser: DemoUserRecord = {
        id: newId,
        email,
        password: body.password || 'DemoPortfolio2026!',
        nome: email.split('@')[0],
        is_admin: false,
        status_matricula: 'Ativa',
        created_at: nowIso,
        updated_at: nowIso,
      };
      users.push(newUser);
      tables['alunos'] = tables['alunos'] || [];
      tables['alunos'].push({
        id: newId,
        nome: newUser.nome,
        status_matricula: 'Ativa',
        is_admin: false,
        created_at: nowIso,
        updated_at: nowIso,
      });
      saveStore(tables, users);
      return jsonResponse({ user: toSupabaseAuthUser(newUser) });
    }
    if (idMatch) {
      const targetId = idMatch[1];
      const targetUser = users.find((u) => u.id === targetId);
      if (!targetUser) {
        return jsonResponse({ message: 'User not found' }, 404);
      }
      if (method === 'GET') {
        return jsonResponse({ user: toSupabaseAuthUser(targetUser) });
      }
      if (method === 'PUT') {
        const updates = bodyText ? (JSON.parse(bodyText) as { email?: string; password?: string }) : {};
        if (updates.email) targetUser.email = updates.email;
        if (updates.password) targetUser.password = updates.password;
        targetUser.updated_at = new Date().toISOString();
        saveStore(tables, users);
        return jsonResponse({ user: toSupabaseAuthUser(targetUser) });
      }
    }
  }

  return jsonResponse({});
}

async function handleStorageRequest(
  url: URL,
  method: string,
  init?: RequestInit
): Promise<Response> {
  const path = url.pathname.replace(/^\/storage\/v1/, '');

  // Upload ou atualização de objeto: POST/PUT /object/:bucket/:wildcard
  const objMatch = path.match(/^\/object\/([^/]+)\/(.+)$/);
  if (objMatch && (method === 'POST' || method === 'PUT')) {
    const bucket = objMatch[1];
    const objectPath = decodeURIComponent(objMatch[2]);
    const fullKey = `${bucket}/${objectPath}`;

    if (typeof window !== 'undefined' && init?.body instanceof Blob) {
      const localUrl = URL.createObjectURL(init.body);
      uploadedBlobUrls.set(fullKey, localUrl);
    }

    return jsonResponse({ Key: fullKey, Id: randomUuid() });
  }

  // Deleção de objeto
  if (path.startsWith('/object/') && method === 'DELETE') {
    return jsonResponse({ message: 'Deleted' });
  }

  return jsonResponse([]);
}

async function handleRestRequest(url: URL, method: string, headers: Headers, bodyText: string): Promise<Response> {
  const { tables, users } = getStore();
  const tablePath = url.pathname.replace(/^\/rest\/v1\//, '');

  // Suporte a RPCs
  if (tablePath.startsWith('rpc/')) {
    const rpcName = tablePath.replace(/^rpc\//, '');
    if (rpcName === 'is_admin') {
      const currentUser = extractUserFromAuthHeader(headers, users);
      return jsonResponse(Boolean(currentUser?.is_admin));
    }
    return jsonResponse({ ok: true });
  }

  const tableName = tablePath.split('/')[0];
  if (!tables[tableName]) {
    tables[tableName] = [];
  }

  const acceptHeader = headers.get('accept') || headers.get('Accept') || '';
  const preferHeader = headers.get('prefer') || headers.get('Prefer') || '';
  const isSingleObject = acceptHeader.includes('application/vnd.pgrst.object+json');
  const selectParam = url.searchParams.get('select');
  const orderParams = url.searchParams.getAll('order');

  // Filtra linhas que atendem aos query params PostgREST
  const filterRow = (row: RowRecord): boolean => {
    for (const [key, val] of url.searchParams.entries()) {
      if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(key)) {
        continue;
      }
      if (key === 'or') {
        if (!matchesOrExpression(row, val)) return false;
        continue;
      }
      if (!matchesCondition(row, key, val)) {
        return false;
      }
    }
    return true;
  };

  if (method === 'GET' || method === 'HEAD') {
    let matched = tables[tableName].filter(filterRow);
    const totalCount = matched.length;
    matched = sortRows(matched, orderParams);

    const offsetParam = url.searchParams.get('offset');
    const limitParam = url.searchParams.get('limit');
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    if (offset > 0 || limit !== undefined) {
      matched = matched.slice(offset, limit !== undefined ? offset + limit : undefined);
    }

    const projected = matched.map((r) => applySelectAndJoins(r, selectParam, tables));
    const rangeEnd = Math.max(0, projected.length - 1);
    const contentRange = `${projected.length > 0 ? 0 : '*'}-${projected.length > 0 ? rangeEnd : '*'}/${totalCount}`;

    if (method === 'HEAD') {
      return new Response(null, {
        status: 200,
        headers: {
          'Content-Range': contentRange,
          'Content-Type': 'application/json; charset=utf-8',
        },
      });
    }

    if (isSingleObject) {
      if (projected.length === 0) {
        return jsonResponse(
          {
            code: 'PGRST116',
            details: 'The result contains 0 rows',
            hint: null,
            message: 'JSON object requested, multiple (or no) rows returned',
          },
          406
        );
      }
      return jsonResponse(projected[0], 200, { 'Content-Range': contentRange });
    }

    return jsonResponse(projected, 200, { 'Content-Range': contentRange });
  }

  if (method === 'POST') {
    const parsedBody = bodyText ? (JSON.parse(bodyText) as unknown) : {};
    const incomingRows: RowRecord[] = Array.isArray(parsedBody)
      ? (parsedBody as RowRecord[])
      : [parsedBody as RowRecord];

    const isUpsert = preferHeader.includes('resolution=merge-duplicates');
    const onConflictParam = url.searchParams.get('on_conflict');
    const conflictCols = onConflictParam
      ? onConflictParam
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean)
      : tableName === 'progresso_srs_meta'
        ? ['aluno_id']
        : tableName === 'progresso_srs_diario'
          ? ['aluno_id', 'data']
          : tableName === 'progresso_srs_cards'
            ? ['aluno_id', 'dicionario_id']
            : tableName === 'progresso_dialogo'
              ? ['aluno_id', 'dialogo_id']
              : tableName === 'progresso_aluno'
                ? ['aluno_id', 'aula_id']
                : tableName === 'registros_dinamicos'
                  ? ['atividade_id', 'aluno_id']
                  : ['id'];

    const resultingRows: RowRecord[] = [];
    const nowIso = new Date().toISOString();

    for (const item of incomingRows) {
      const cleanItem: RowRecord = { ...item };
      // Na tabela alunos, remove campo extra 'email' caso enviado por admin-actions
      if (tableName === 'alunos' && 'email' in cleanItem) {
        delete cleanItem['email'];
      }

      let existingIdx = -1;
      if (isUpsert || conflictCols.every((c) => cleanItem[c] !== undefined)) {
        existingIdx = tables[tableName].findIndex((existing) =>
          conflictCols.every((col) => existing[col] !== undefined && existing[col] === cleanItem[col])
        );
      }

      if (existingIdx >= 0 && isUpsert) {
        const merged: RowRecord = {
          ...tables[tableName][existingIdx],
          ...cleanItem,
          updated_at: nowIso,
        };
        tables[tableName][existingIdx] = merged;
        resultingRows.push(applySelectAndJoins(merged, selectParam, tables));
      } else {
        const newRow: RowRecord = {
          ...(conflictCols.includes('id') && !cleanItem['id'] ? { id: randomUuid() } : {}),
          created_at: cleanItem['created_at'] ?? nowIso,
          ...cleanItem,
        };
        tables[tableName].push(newRow);
        resultingRows.push(applySelectAndJoins(newRow, selectParam, tables));
      }
    }

    saveStore(tables, users);

    if (isSingleObject) {
      return jsonResponse(resultingRows[0] ?? null, 201);
    }
    return jsonResponse(resultingRows, 201);
  }

  if (method === 'PATCH') {
    const patchData = bodyText ? (JSON.parse(bodyText) as RowRecord) : {};
    if (tableName === 'alunos' && 'email' in patchData) {
      delete patchData['email'];
    }
    const updatedRows: RowRecord[] = [];
    const nowIso = new Date().toISOString();

    tables[tableName] = tables[tableName].map((row) => {
      if (!filterRow(row)) return row;
      const updated: RowRecord = { ...row, ...patchData, updated_at: patchData['updated_at'] ?? nowIso };
      updatedRows.push(applySelectAndJoins(updated, selectParam, tables));
      return updated;
    });

    saveStore(tables, users);

    if (isSingleObject) {
      return jsonResponse(updatedRows[0] ?? null, 200);
    }
    return jsonResponse(updatedRows, 200);
  }

  if (method === 'DELETE') {
    const removedRows: RowRecord[] = [];
    tables[tableName] = tables[tableName].filter((row) => {
      if (filterRow(row)) {
        removedRows.push(row);
        return false;
      }
      return true;
    });
    saveStore(tables, users);
    return jsonResponse(removedRows, 200);
  }

  return jsonResponse([]);
}

// ============================================================================
// INSTALADOR GLOBAL DO INTERCEPTADOR DE FETCH PARA O MODO PORTFÓLIO
// ============================================================================

export const DEMO_ENV_FALLBACKS = {
  NEXT_PUBLIC_SUPABASE_URL: DEMO_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvcnRmb2xpby1kZW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMDAwMDAsImV4cCI6MjA5MDAwMDAwMH0.demo',
  SUPABASE_SERVICE_ROLE_KEY:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvcnRmb2xpby1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDAwMDAwMCwiZXhwIjoyMDkwMDAwMDAwfQ.demo-service',
};

export function isPortfolioDemoEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'false') return false;
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  return !configuredUrl || configuredUrl.includes('portfolio-demo.supabase.co') || process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

export const isPortfolioDemoMode = isPortfolioDemoEnabled;

export function installSupabaseSandbox(): void {
  if (typeof process !== 'undefined' && process.env) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      process.env.NEXT_PUBLIC_SUPABASE_URL = DEMO_ENV_FALLBACKS.NEXT_PUBLIC_SUPABASE_URL;
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = DEMO_ENV_FALLBACKS.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      process.env.SUPABASE_SERVICE_ROLE_KEY = DEMO_ENV_FALLBACKS.SUPABASE_SERVICE_ROLE_KEY;
    }
  }

  if (!isPortfolioDemoEnabled()) return;

  const g = globalThis as unknown as {
    fetch: typeof fetch & { __isTcmSandbox?: boolean };
  };

  if (g.fetch?.__isTcmSandbox) return;
  const originalFetch = g.fetch.bind(globalThis);

  const wrappedFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const rawUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    // Intercepta chamadas destinadas ao domínio de demonstração do Supabase
    if (rawUrl.includes('portfolio-demo.supabase.co') || (isPortfolioDemoEnabled() && rawUrl.includes('.supabase.co'))) {
      const parsedUrl = new URL(rawUrl);
      const method = (
        init?.method ||
        (typeof input === 'object' && !(input instanceof URL) ? input.method : 'GET') ||
        'GET'
      ).toUpperCase();

      const mergedHeaders = new Headers(
        typeof input === 'object' && !(input instanceof URL) ? input.headers : undefined
      );
      if (init?.headers) {
        const extra = new Headers(init.headers);
        extra.forEach((v, k) => mergedHeaders.set(k, v));
      }

      // Redireciona downloads de mídia pública para a pasta estática local
      if (parsedUrl.pathname.startsWith('/storage/v1/object/public/')) {
        const relPath = parsedUrl.pathname.replace(/^\/storage\/v1\/object\/public\//, '');
        const blobOverride = getUploadedBlobUrl(relPath);
        if (blobOverride && typeof window !== 'undefined') {
          return originalFetch(blobOverride);
        }
        if (typeof window !== 'undefined') {
          return originalFetch(`/demo-storage/${relPath}`, init);
        }
      }

      let bodyText = '';
      if (typeof init?.body === 'string') {
        bodyText = init.body;
      } else if (init?.body instanceof URLSearchParams) {
        bodyText = init.body.toString();
      }

      if (parsedUrl.pathname.startsWith('/auth/v1')) {
        return handleAuthRequest(parsedUrl, method, mergedHeaders, bodyText);
      }
      if (parsedUrl.pathname.startsWith('/storage/v1')) {
        return handleStorageRequest(parsedUrl, method, init);
      }
      if (parsedUrl.pathname.startsWith('/rest/v1')) {
        return handleRestRequest(parsedUrl, method, mergedHeaders, bodyText);
      }
    }

    return originalFetch(input, init);
  };

  (wrappedFetch as typeof fetch & { __isTcmSandbox?: boolean }).__isTcmSandbox = true;
  g.fetch = wrappedFetch;
}

// Auto-instala no momento da importação
installSupabaseSandbox();
