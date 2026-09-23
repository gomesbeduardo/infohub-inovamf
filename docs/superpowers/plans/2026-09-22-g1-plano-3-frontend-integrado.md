# G1 · Plano 3 — Frontend integrado à API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o adaptador de dados do front (memória → API real) em TODAS as telas, remover o login rápido e o mock — parte front do **CP2** (23/09 ~22h).

**Architecture:** Hexagonal: `frontend/src/data/api/` é o novo adaptador — `erro.ts` (ApiError), `sessao.ts` (access em memória, refresh em localStorage, refresh single-flight), `http.ts` (fetch com Bearer + 1 retry após refresh), `tipos.ts` (DTOs da API), `consultas.ts` (hooks TanStack Query + mutações com invalidação). Componentes consomem **só** os hooks. Regras de negócio ficam no backend: o front exibe o que a API calcula (atrasadas, pendências, indicadores, CSV) e trata os erros (409 da RN-01 vira diálogo de "forçar com observação").

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript strict, Tailwind (tokens), `@tanstack/react-query` v5, Vitest + Testing Library (jsdom).

**Dependências:** Tasks 1–2 só precisam da API que já existe (auth). As tasks de tela usam endpoints dos Planos 1 e 2 — cada task lista os endpoints; se algum ainda não estiver em `staging`, a task espera (ou a branch é empilhada sobre a do backend).

## Global Constraints

- Todo PR mira **`staging`**, uma branch por issue, Conventional Commits, **um PR por vez com aprovação do usuário**. Comentar "Pegando." na issue.
- `npm test` **e** `npm run build` verdes em `frontend/` antes do PR.
- Front fala com o back **só** por `/api/v1/*` (mesma origem — rewrite do Next para o Express). Nada de URL absoluta.
- Sessão: **access token só em memória**; **refresh em `localStorage`** chave `infohub-refresh`; em 401, um único refresh compartilhado e uma nova tentativa.
- Tailwind com cores 100% tokenizadas (nada de hex em componente); reaproveitar `src/design-system/components/*`.
- Nenhuma regra de negócio nova no front (RN-01, atrasada, indicadores, CSV vêm do backend).
- Identificadores na UI: **slug** (equipes, usuários, tarefas, entregas); área e ciclo por **nome**; etapa por **número**; modelo de tarefa por **id numérico**.
- Mensagens de erro vêm de `ApiError.message` (backend já responde em pt-BR).
- Commits terminam com a linha de atribuição da sessão; PRs com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Enquanto o mock não for removido (Task 10), telas ainda não migradas podem quebrar em `staging`; o deploy (main) só acontece no CP2, com tudo migrado.

## Ordem

| Task | Branch | Depende de (API) |
|---|---|---|
| 1 Cliente HTTP + sessão + login real | `feat/front-sessao-api` | auth (já existe) |
| 2 Tipos + hooks de consulta | `feat/front-consultas` | contratos dos Planos 1–2 (só tipos) |
| 3 Cadastro + /convite | `feat/front-cadastro-convite` | P1 T3/T4 |
| 4 Funil/kanban + filtros + CSV + lista | `feat/front-funil` | P1 T2, P2 T1/T2/T6 |
| 5 Detalhe da equipe | `feat/front-detalhe-equipe` | P1 T2/T3, P2 T2/T3/T8 |
| 6 Tarefas (admin/mentor) | `feat/front-tarefas-admin` | P2 T4 |
| 7 Área do aluno | `feat/front-aluno` | P1, P2 T2/T8 |
| 8 Dashboard + painel do mentor | `feat/front-dashboard` | P2 T5 |
| 9 Contas (admin) + /conta | `feat/front-contas` | P1 T3, P2 T7 |
| 10 Remover mock | `chore/front-remove-mock` | todas acima |

Tasks 3–9 tocam arquivos diferentes (`features/*` distintas) e podem rodar em paralelo **em worktrees separadas** se o controlador quiser; os PRs continuam um por vez.

---

## Task 1: Cliente HTTP, sessão real, login e guarda de rota

**Files:**
- Create: `frontend/src/data/api/erro.ts`, `frontend/src/data/api/sessao.ts`, `frontend/src/data/api/http.ts`, `frontend/src/data/api/Providers.tsx`, `frontend/src/data/api/useSessao.ts`, `frontend/tests/api/http.test.ts`
- Modify: `frontend/package.json` (+ `@tanstack/react-query`), `frontend/src/app/layout.tsx`, `frontend/src/features/auth/LoginForm.tsx`, `frontend/src/features/auth/AuthGuard.tsx`, `frontend/src/features/shell/AppShell.tsx`, `frontend/tests/components/login.test.tsx`

**Interfaces:**
- Produces: `class ApiError { status; code; message; details? }`; `sessao.{access(), estado(), assinar(f), entrar(email, senha), renovar(), restaurar(), sair(), aplicar(r)}`; `type UsuarioSessao = { slug: string; nome: string; role: 'admin'|'mentor'|'aluno' }`; `type EstadoSessao`; `api<T>(path, { method?, body?, publica? }): Promise<T>`; `requisicao(path, opts): Promise<Response>` (para CSV); `useSessao(): EstadoSessao`; `useUsuario(): UsuarioSessao | null`; `<Providers>`.

- [ ] **Step 1: Branch, issue, dependência**

```bash
git checkout staging && git pull && git checkout -b feat/front-sessao-api
gh issue create --title "front: cliente HTTP + sessão real (JWT/refresh) + login sem atalho de demo" --body "Adaptador data/api: ApiError, sessão (access em memória, refresh em localStorage, refresh single-flight), fetch com Bearer e retry; login real; AuthGuard/AppShell pela sessão; remove o login rápido." --label enhancement
cd frontend && npm install @tanstack/react-query@^5
```
Comente "Pegando." na issue.

- [ ] **Step 2: Teste do cliente (falha)**

`frontend/tests/api/http.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '@/data/api/http';
import { ApiError } from '@/data/api/erro';
import { sessao } from '@/data/api/sessao';

function resposta(status: number, corpo?: unknown) {
  return new Response(corpo === undefined ? null : JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
const SESSAO = { access: 'A1', refresh: 'R1', usuario: { slug: 's', nome: 'Ana', role: 'admin' as const } };

describe('api()', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    sessao.aplicar(SESSAO);
  });

  it('manda o Bearer da sessão', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockResolvedValue(resposta(200, { ok: 1 }));
    await expect(api('/x')).resolves.toEqual({ ok: 1 });
    expect(f).toHaveBeenCalledWith('/api/v1/x', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer A1' }) }));
  });

  it('em 401 renova UMA vez e repete a requisição', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      if (url === '/api/v1/auth/refresh') return resposta(200, { ...SESSAO, access: 'A2', refresh: 'R2' });
      const auth = (init?.headers as Record<string, string>).Authorization;
      return auth === 'Bearer A2' ? resposta(200, { ok: 2 }) : resposta(401, { error: { code: 'INVALID_TOKEN', message: 'x' } });
    });
    const [a, b] = await Promise.all([api('/x'), api('/y')]);
    expect(a).toEqual({ ok: 2 });
    expect(b).toEqual({ ok: 2 });
    expect(f.mock.calls.filter(([u]) => u === '/api/v1/auth/refresh')).toHaveLength(1);
    expect(localStorage.getItem('infohub-refresh')).toBe('R2');
  });

  it('refresh falhou → sessão anônima e ApiError 401', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(resposta(401, { error: { code: 'INVALID_TOKEN', message: 'expirou' } }));
    await expect(api('/x')).rejects.toMatchObject({ status: 401 });
    expect(sessao.estado().status).toBe('anonimo');
  });

  it('erro de domínio vira ApiError com code, message e details', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      resposta(409, { error: { code: 'RN01_PENDENCIAS', message: 'Há pendências', details: { pendencias: [] } } }),
    );
    const e = await api('/x', { method: 'POST', body: {} }).catch((x) => x);
    expect(e).toBeInstanceOf(ApiError);
    expect(e).toMatchObject({ status: 409, code: 'RN01_PENDENCIAS', message: 'Há pendências', details: { pendencias: [] } });
  });
});
```
Run: `npx vitest run tests/api/http.test.ts` → Expected: FAIL (módulos inexistentes).

- [ ] **Step 3: Implementar o adaptador**

`frontend/src/data/api/erro.ts`:
```ts
/** Erro de domínio da API: { error: { code, message, details? } }. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function lerErro(res: Response): Promise<ApiError> {
  let corpo: { error?: { code?: string; message?: string; details?: unknown } } = {};
  try {
    corpo = await res.json();
  } catch {
    /* resposta sem corpo JSON */
  }
  return new ApiError(
    res.status,
    corpo.error?.code ?? `HTTP_${res.status}`,
    corpo.error?.message ?? 'Não foi possível falar com o servidor. Tente de novo.',
    corpo.error?.details,
  );
}
```
`frontend/src/data/api/sessao.ts`:
```ts
import { lerErro } from './erro';

// Sessão real (JWT). Access token SÓ em memória (não sobrevive a reload — é
// reobtido pelo refresh); refresh em localStorage. Várias 401 simultâneas
// disparam UM refresh (single-flight): o backend revoga tudo se um refresh
// usado for reapresentado (TOKEN_REUSE).

export type Papel = 'admin' | 'mentor' | 'aluno';
export interface UsuarioSessao {
  slug: string;
  nome: string;
  role: Papel;
}
export type EstadoSessao =
  | { status: 'carregando' }
  | { status: 'anonimo' }
  | { status: 'autenticado'; usuario: UsuarioSessao };
export interface RespostaSessao {
  access: string;
  refresh: string;
  usuario: UsuarioSessao;
}

const CHAVE = 'infohub-refresh';
let accessAtual: string | null = null;
let estadoAtual: EstadoSessao = { status: 'carregando' };
let renovando: Promise<boolean> | null = null;
const ouvintes = new Set<() => void>();

function lerRefresh(): string | null {
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}
function gravarRefresh(v: string | null): void {
  try {
    if (v) localStorage.setItem(CHAVE, v);
    else localStorage.removeItem(CHAVE);
  } catch {
    /* storage indisponível: sessão dura só a aba */
  }
}
function definir(e: EstadoSessao): void {
  estadoAtual = e;
  ouvintes.forEach((f) => f());
}
function limpar(): void {
  accessAtual = null;
  gravarRefresh(null);
  definir({ status: 'anonimo' });
}
function postar(path: string, body: unknown, bearer?: string): Promise<Response> {
  return fetch(`/api/v1${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

export const sessao = {
  access: (): string | null => accessAtual,
  estado: (): EstadoSessao => estadoAtual,
  assinar(f: () => void): () => void {
    ouvintes.add(f);
    return () => {
      ouvintes.delete(f);
    };
  },
  /** Grava uma sessão recebida (login, cadastro, aceite de convite, troca de senha). */
  aplicar(r: RespostaSessao): void {
    accessAtual = r.access;
    gravarRefresh(r.refresh);
    definir({ status: 'autenticado', usuario: r.usuario });
  },
  async entrar(email: string, senha: string): Promise<UsuarioSessao> {
    const res = await postar('/auth/login', { email, senha });
    if (!res.ok) throw await lerErro(res);
    const r = (await res.json()) as RespostaSessao;
    sessao.aplicar(r);
    return r.usuario;
  },
  renovar(): Promise<boolean> {
    if (!renovando) {
      renovando = (async () => {
        const refresh = lerRefresh();
        if (!refresh) {
          limpar();
          return false;
        }
        const res = await postar('/auth/refresh', { refresh }).catch(() => null);
        if (!res || !res.ok) {
          limpar();
          return false;
        }
        sessao.aplicar((await res.json()) as RespostaSessao);
        return true;
      })().finally(() => {
        renovando = null;
      });
    }
    return renovando;
  },
  /** No carregamento da página: tenta reabrir a sessão pelo refresh guardado. */
  async restaurar(): Promise<void> {
    if (estadoAtual.status !== 'carregando') return;
    await sessao.renovar();
  },
  async sair(): Promise<void> {
    const a = accessAtual;
    limpar();
    if (a) await postar('/auth/logout', {}, a).catch(() => undefined);
  },
};
```
`frontend/src/data/api/http.ts`:
```ts
import { lerErro } from './erro';
import { sessao } from './sessao';

export interface Opcoes {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Rota pública: não manda Bearer nem tenta refresh. */
  publica?: boolean;
}

function enviar(path: string, o: Opcoes, access: string | null): Promise<Response> {
  const headers: Record<string, string> = {};
  if (o.body !== undefined) headers['Content-Type'] = 'application/json';
  if (access && !o.publica) headers.Authorization = `Bearer ${access}`;
  return fetch(`/api/v1${path}`, {
    method: o.method ?? 'GET',
    headers,
    body: o.body === undefined ? undefined : JSON.stringify(o.body),
  });
}

/** Resposta crua (ex.: CSV). Em 401 renova a sessão uma vez e repete. */
export async function requisicao(path: string, o: Opcoes = {}): Promise<Response> {
  let res = await enviar(path, o, sessao.access());
  if (res.status === 401 && !o.publica && (await sessao.renovar())) {
    res = await enviar(path, o, sessao.access());
  }
  if (!res.ok) throw await lerErro(res);
  return res;
}

export async function api<T>(path: string, o: Opcoes = {}): Promise<T> {
  const res = await requisicao(path, o);
  return (res.status === 204 ? undefined : await res.json()) as T;
}
```
`frontend/src/data/api/useSessao.ts`:
```ts
'use client';
import { useSyncExternalStore } from 'react';
import { sessao, type EstadoSessao, type UsuarioSessao } from './sessao';

const CARREGANDO: EstadoSessao = { status: 'carregando' };

export function useSessao(): EstadoSessao {
  return useSyncExternalStore(sessao.assinar, sessao.estado, () => CARREGANDO);
}

export function useUsuario(): UsuarioSessao | null {
  const s = useSessao();
  return s.status === 'autenticado' ? s.usuario : null;
}
```
`frontend/src/data/api/Providers.tsx`:
```tsx
'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from './erro';
import { sessao } from './sessao';

export function Providers({ children }: { children: ReactNode }) {
  const [cliente] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            // Erro 4xx é resposta de domínio: não adianta repetir.
            retry: (n, e) => !(e instanceof ApiError && e.status < 500) && n < 2,
          },
        },
      }),
  );
  useEffect(() => {
    void sessao.restaurar();
  }, []);
  return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
}
```
Run: `npx vitest run tests/api/http.test.ts` → Expected: PASS (4).

- [ ] **Step 4: Providers no layout**

Em `frontend/src/app/layout.tsx`, importar `import { Providers } from '@/data/api/Providers';` e envolver o conteúdo que hoje está dentro de `<StoreProvider>`: `<Providers><StoreProvider>{…}</StoreProvider></Providers>` (o `StoreProvider` sai só na Task 10).

- [ ] **Step 5: Login real (sem atalho de demo)**

Em `frontend/src/features/auth/LoginForm.tsx`:
- remover `SENHA_DEMO`, `DEMOS`, `preencher`, o `<Select>` inteiro e os imports de `Select`, `useActions`, `setUsuarioAtual`;
- importar `import { sessao } from '@/data/api/sessao';` e `import { ApiError } from '@/data/api/erro';`;
- estado `const [enviando, setEnviando] = useState(false);` e `onSubmit`:
```tsx
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const usuario = await sessao.entrar(email.trim(), senha);
      router.push(homeFor(usuario.role));
    } catch (err) {
      setErro(
        err instanceof ApiError && err.status === 401
          ? 'Credenciais inválidas'
          : err instanceof ApiError
            ? err.message
            : 'Não foi possível entrar. Tente de novo.',
      );
    } finally {
      setEnviando(false);
    }
  }
```
- botão: `<Button type="submit" size="lg" className="mt-1 w-full" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</Button>`; placeholder da senha `••••••••`.

- [ ] **Step 6: Guarda de rota e casca pela sessão**

`frontend/src/features/auth/AuthGuard.tsx` — substituir o corpo do componente por:
```tsx
export function AuthGuard({ permitido, children }: { permitido: TipoUsuario[]; children: ReactNode }) {
  const router = useRouter();
  const s = useSessao();
  const papel = s.status === 'autenticado' ? s.usuario.role : null;

  useEffect(() => {
    if (s.status === 'anonimo') router.replace('/login');
    else if (papel && !permitido.includes(papel)) router.replace(homeFor(papel));
  }, [s.status, papel, permitido, router]);

  if (!papel || !permitido.includes(papel)) return null;
  return <>{children}</>;
}
```
(imports: `useEffect` de react, `useSessao` de `@/data/api/useSessao`; remover `useStore`, `getUsuarioAtual`, `useState`.)

`frontend/src/features/shell/AppShell.tsx` — trocar a obtenção do usuário e o `sair`:
```tsx
  const usuario = useUsuario();
  const cliente = useQueryClient();
  const itens = usuario ? navFor(usuario.role) : [];
  …
  async function sair() {
    await sessao.sair();
    cliente.clear();
    router.replace('/login');
  }
```
(trocar `usuario.tipo` por `usuario.role` onde aparecer no arquivo; imports `useUsuario`, `sessao`, `useQueryClient` de `@tanstack/react-query`; remover `useStore`, `getUsuarioAtual`, `logout`, `montado`.)

- [ ] **Step 7: Teste do login**

Substituir `frontend/tests/components/login.test.tsx` por:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

import { LoginForm } from '@/features/auth/LoginForm';
import { sessao } from '@/data/api/sessao';
import { ApiError } from '@/data/api/erro';

describe('LoginForm (API real)', () => {
  beforeEach(() => {
    push.mockClear();
    vi.restoreAllMocks();
  });

  it('401 mostra "Credenciais inválidas"', async () => {
    vi.spyOn(sessao, 'entrar').mockRejectedValue(new ApiError(401, 'INVALID_CREDENTIALS', 'x'));
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText('E-mail'), 'x@y.dev');
    await user.type(screen.getByLabelText('Senha'), 'errada123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));
    expect(await screen.findByText(/credenciais inválidas/i)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('sucesso redireciona pela role', async () => {
    vi.spyOn(sessao, 'entrar').mockResolvedValue({ slug: 's', nome: 'M', role: 'mentor' });
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText('E-mail'), 'mentor1@demo.infohub.dev');
    await user.type(screen.getByLabelText('Senha'), 'mentor123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));
    expect(push).toHaveBeenCalledWith('/orientador');
  });

  it('não existe mais atalho de conta de demonstração', () => {
    render(<LoginForm />);
    expect(screen.queryByLabelText(/conta de demonstração/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 8: Rodar e checar**

Run (em `frontend/`): `npm test && npm run build` → Expected: PASS e build ok. Testes antigos que dependiam do login mock (ex.: `tests/store.test.tsx`) continuam passando porque o store ainda existe; se algum teste de componente quebrar **por causa do AppShell/AuthGuard**, ajuste-o para mockar `useSessao`/`useUsuario` (`vi.mock('@/data/api/useSessao', …)`) — não reintroduza o mock de sessão.

Smoke manual (opcional, se o backend local estiver no ar com seed): `npm --prefix ../backend run dev` + `npm run dev` → `/login` com `admin@infohub.dev` / `admin123` leva a `/admin`.

- [ ] **Step 9: Commit e PR**

```bash
git add package.json package-lock.json src/data/api src/app/layout.tsx src/features/auth src/features/shell/AppShell.tsx tests/api tests/components/login.test.tsx
git commit -m "feat(front): sessão real com JWT/refresh e login sem atalho de demonstração

Closes #N"
git push -u origin feat/front-sessao-api
gh pr create --base staging --title "feat(front): cliente HTTP + sessão real + login" --body "Adaptador data/api (ApiError, sessão com refresh single-flight, fetch com Bearer/retry, React Query). Login real; AuthGuard/AppShell pela sessão; login rápido removido.

Closes #N

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```
**Parar e pedir aprovação do usuário.**

---

## Task 2: Tipos da API e hooks de consulta/mutação

**Files:**
- Create: `frontend/src/data/api/tipos.ts`, `frontend/src/data/api/consultas.ts`, `frontend/tests/api/consultas.test.tsx`

**Interfaces:**
- Consumes: `api`, `requisicao`, `sessao.aplicar` (Task 1).
- Produces (usados pelas Tasks 3–9 — nomes exatos):
  - Tipos: `Pagina<T>`, `Ref`, `EtapaRef`, `EquipeResumo`, `Pendencia`, `Membro`, `MovimentoHistorico`, `EquipeDetalhe`, `Tarefa`, `Arquivo`, `Avaliacao`, `Entrega`, `Etapa`, `Area`, `Ciclo`, `ModeloTarefa`, `Anotacao`, `Dashboard`, `UsuarioAdmin`, `Me`, `ColegaCriado`, `FiltrosEquipes`.
  - Chaves: `chaves` (objeto com fábricas de query keys).
  - Consultas: `useEtapas()`, `useAreas()`, `useCiclos()`, `useModelos()`, `useEquipes(filtros)` (busca todas as páginas), `useEquipe(slug)`, `useTarefas(equipeSlug)`, `useEntregas(tarefaSlug)`, `useAnotacoes(equipeSlug)`, `useDashboard()`, `useUsuarios(tipo?)`, `useMe()`, `useConvite(token)`.
  - Mutações: `useInscricao()`, `useAceitarConvite()`, `useMoverEtapa(slug)`, `useCriarTarefa(equipeSlug)`, `useEnviarEntrega(tarefaSlug, equipeSlug)`, `useAvaliar(tarefaSlug, equipeSlug)`, `useAnotar(equipeSlug)`, `useAdicionarMembro(equipeSlug)`, `useGerarConvite(equipeSlug)`, `useCriarUsuario()`, `useEditarUsuario()`, `useReenviarConvite()`, `useAtualizarMe()`, `useTrocarSenha()`; e `baixarCSV(filtros): Promise<void>`.

- [ ] **Step 1: Branch e issue**

```bash
git checkout staging && git pull && git checkout -b feat/front-consultas
gh issue create --title "front: tipos da API + hooks React Query" --body "Contrato único entre telas e API: DTOs e hooks de consulta/mutação com invalidação." --label enhancement
```
Comente "Pegando." na issue.

- [ ] **Step 2: Tipos**

`frontend/src/data/api/tipos.ts`:
```ts
import type {
  EstagioIdeia,
  PapelMembro,
  ResultadoAvaliacao,
  StatusEquipe,
  StatusTarefa,
  TipoUsuario,
} from '@/domain/types';

// DTOs exatamente como a API /api/v1 responde (ver backend/src/controllers).
export interface Pagina<T> { data: T[]; page: number; perPage: number; total: number }
export interface Ref { slug: string; nome: string }
export interface EtapaRef { numero: number; nome: string }

export interface Etapa { numero: number; nome: string; descricao: string | null; entregavel: string | null }
export interface Area { nome: string; ordem: number }
export interface Ciclo { nome: string; dataInicio: string; dataFim: string | null }
export interface ModeloTarefa {
  id: number; etapa: number; titulo: string; descricao: string | null; obrigatoria: boolean; prazoPadraoDias: number;
}

export interface EquipeResumo {
  slug: string; nomeIdeia: string; descricaoIdeia: string; status: StatusEquipe; estagio: EstagioIdeia;
  etapa: EtapaRef; area: string | null; ciclo: string | null; mentor: Ref | null;
  lider: (Ref & { curso: string | null }) | null; membrosCount: number; tarefasAtrasadas: number; criadoEm: string;
}

export type Pendencia =
  | { tipo: 'tarefa'; slug: string; titulo: string }
  | { tipo: 'integrante'; slug: string; nome: string; motivo: 'convite_pendente' | 'dados_incompletos' };

export interface Membro {
  slug: string; nome: string; papel: PapelMembro; tipo: TipoUsuario; pendente: boolean;
  curso: string | null; semestre: string | null;
}
export type Posicao = number | 'pronta';
export interface MovimentoHistorico {
  de: Posicao | null; para: Posicao; forcado: boolean; observacao: string | null; por: Ref | null; em: string;
}
export interface EquipeDetalhe {
  slug: string; nomeIdeia: string; descricaoIdeia: string; estagio: EstagioIdeia; status: StatusEquipe;
  origemDivulgacao: string | null; prontaInovamfEm: string | null; criadoEm: string; etapa: EtapaRef;
  area: string | null; ciclo: string | null; mentor: Ref | null; membros: Membro[];
  historico: MovimentoHistorico[]; pendenciasParaAvancar: Pendencia[];
}

export interface Tarefa {
  slug: string; titulo: string; descricao: string | null; obrigatoria: boolean; dataEntrega: string;
  status: StatusTarefa; etapa: EtapaRef; equipe: { slug: string; nomeIdeia: string };
  criadoEm: string; concluidaEm: string | null;
}
export interface Arquivo { tipo: 'arquivo' | 'link'; nome: string | null; url: string | null }
export interface Avaliacao { resultado: ResultadoAvaliacao; comentario: string | null; por: Ref; em: string }
export interface Entrega {
  slug: string; versao: number; comentario: string | null; enviadoPor: Ref; criadoEm: string;
  arquivos: Arquivo[]; avaliacoes: Avaliacao[];
}

export interface Anotacao { slug: string; conteudo: string; autor: Ref; etapa: number | null; criadoEm: string }

export interface Dashboard {
  equipesAtivas: number; prontasInovamf: number; totalEquipes: number; tarefasAtrasadas: number; aAvaliar: number;
  porEtapa: Array<{ numero: number; nome: string; total: number }>;
  serieSemanal: Array<{ semanaInicio: string; rotulo: string; avancos: number; entregas: number }>;
}

export interface UsuarioAdmin {
  slug: string; nome: string; email: string; telefone: string; role: TipoUsuario; ativo: boolean;
  conviteAceito: boolean; ultimoLoginEm?: string | null; criadoEm?: string;
}
export interface Me {
  slug: string; nome: string; email: string; telefone: string; role: TipoUsuario; criadoEm: string; ultimoLoginEm: string | null;
}
export interface ColegaCriado { slug: string; nome: string; email: string; conviteUrl: string | null }

export interface FiltrosEquipes {
  q?: string; curso?: string; area?: string; mentor?: string; statusTarefa?: StatusTarefa; ciclo?: string;
  etapa?: number; status?: StatusEquipe;
}
```
(**Antes de fechar a task**, confira cada DTO contra o controller correspondente em `backend/src/controllers/` e corrija divergências — o backend é a verdade.)

- [ ] **Step 3: Hooks**

`frontend/src/data/api/consultas.ts`:
```ts
'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, requisicao } from './http';
import { sessao, type RespostaSessao } from './sessao';
import type {
  Anotacao, Area, Ciclo, ColegaCriado, Dashboard, Entrega, EquipeDetalhe, EquipeResumo, Etapa,
  FiltrosEquipes, Me, ModeloTarefa, Pagina, Posicao, Tarefa, UsuarioAdmin,
} from './tipos';

function qs(f: object): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v !== undefined && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const chaves = {
  etapas: ['etapas'] as const,
  areas: ['areas'] as const,
  ciclos: ['ciclos'] as const,
  modelos: ['modelos'] as const,
  equipes: (f: FiltrosEquipes = {}) => ['equipes', f] as const,
  equipe: (slug: string) => ['equipe', slug] as const,
  tarefas: (equipeSlug: string) => ['tarefas', equipeSlug] as const,
  entregas: (tarefaSlug: string) => ['entregas', tarefaSlug] as const,
  anotacoes: (equipeSlug: string) => ['anotacoes', equipeSlug] as const,
  dashboard: ['dashboard'] as const,
  usuarios: (tipo?: string) => ['usuarios', tipo ?? 'todos'] as const,
  me: ['me'] as const,
};

// ── Referência ────────────────────────────────────────────────────────────────
const lista = <T,>(path: string) => () => api<{ data: T[] }>(path).then((r) => r.data);
export const useEtapas = () => useQuery({ queryKey: chaves.etapas, queryFn: lista<Etapa>('/etapas-funil'), staleTime: Infinity });
export const useAreas = () => useQuery({ queryKey: chaves.areas, queryFn: lista<Area>('/areas-ideia'), staleTime: Infinity });
export const useCiclos = () => useQuery({ queryKey: chaves.ciclos, queryFn: lista<Ciclo>('/ciclos'), staleTime: Infinity });
export const useModelos = () => useQuery({ queryKey: chaves.modelos, queryFn: lista<ModeloTarefa>('/modelos-tarefa') });

// ── Equipes ───────────────────────────────────────────────────────────────────
/** Todas as equipes do escopo (percorre as páginas de 100). */
export function useEquipes(filtros: FiltrosEquipes = {}) {
  return useQuery({
    queryKey: chaves.equipes(filtros),
    queryFn: async () => {
      const todas: EquipeResumo[] = [];
      for (let page = 1; ; page++) {
        const r = await api<Pagina<EquipeResumo>>(`/equipes${qs({ ...filtros, page, perPage: 100 })}`);
        todas.push(...r.data);
        if (todas.length >= r.total || r.data.length === 0) return todas;
      }
    },
  });
}
export const useEquipe = (slug: string) =>
  useQuery({ queryKey: chaves.equipe(slug), queryFn: () => api<EquipeDetalhe>(`/equipes/${slug}`), enabled: !!slug });

export function useMoverEtapa(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { etapa: Posicao; forcado?: boolean; observacao?: string }) =>
      api(`/equipes/${slug}/etapa`, { method: 'POST', body: b }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['equipes'] });
      void qc.invalidateQueries({ queryKey: chaves.equipe(slug) });
      void qc.invalidateQueries({ queryKey: chaves.dashboard });
    },
  });
}

export function useInscricao() {
  return useMutation({
    mutationFn: (body: unknown) =>
      api<RespostaSessao & { equipe: { slug: string; nomeIdeia: string }; colegas: ColegaCriado[] }>(
        '/equipes/inscricao',
        { method: 'POST', body, publica: true },
      ),
    onSuccess: (r) => sessao.aplicar(r),
  });
}

export function useAdicionarMembro(equipeSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { nome: string; email: string }) =>
      api<ColegaCriado & { pendente: boolean }>(`/equipes/${equipeSlug}/membros`, { method: 'POST', body: b }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: chaves.equipe(equipeSlug) }),
  });
}

export function useGerarConvite(equipeSlug: string) {
  return useMutation({
    mutationFn: (membroSlug: string) =>
      api<{ conviteUrl: string; expiraEm: string }>(`/equipes/${equipeSlug}/membros/${membroSlug}/convite`, { method: 'POST' }),
  });
}

/** RF-23: o backend gera o CSV com os filtros; aqui só baixa. */
export async function baixarCSV(filtros: FiltrosEquipes): Promise<void> {
  const res = await requisicao(`/equipes/export.csv${qs(filtros)}`);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = 'equipes-infohub.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ── Convite ───────────────────────────────────────────────────────────────────
export const useConvite = (token: string) =>
  useQuery({
    queryKey: ['convite', token],
    queryFn: () =>
      api<{ nome: string; email: string; telefone: string; role: string }>(
        `/auth/invite?token=${encodeURIComponent(token)}`,
        { publica: true },
      ),
    enabled: !!token,
    retry: false,
  });

export function useAceitarConvite() {
  return useMutation({
    mutationFn: (body: {
      token: string; senha: string; nome?: string; telefone?: string; curso?: string; semestre?: string; matricula?: string;
    }) => api<RespostaSessao>('/auth/register', { method: 'POST', body, publica: true }),
    onSuccess: (r) => sessao.aplicar(r),
  });
}

// ── Tarefas e entregas ────────────────────────────────────────────────────────
export const useTarefas = (equipeSlug: string) =>
  useQuery({
    queryKey: chaves.tarefas(equipeSlug),
    queryFn: () => api<{ data: Tarefa[] }>(`/equipes/${equipeSlug}/tarefas`).then((r) => r.data),
    enabled: !!equipeSlug,
  });

export function useCriarTarefa(equipeSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { modelo: number; dataEntrega?: string } | {
      titulo: string; descricao?: string; etapa: number; dataEntrega: string; obrigatoria: boolean;
    }) => api<Tarefa>(`/equipes/${equipeSlug}/tarefas`, { method: 'POST', body: b }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: chaves.tarefas(equipeSlug) });
      void qc.invalidateQueries({ queryKey: chaves.equipe(equipeSlug) });
    },
  });
}

export const useEntregas = (tarefaSlug: string) =>
  useQuery({
    queryKey: chaves.entregas(tarefaSlug),
    queryFn: () => api<{ data: Entrega[] }>(`/tarefas/${tarefaSlug}/entregas`).then((r) => r.data),
    enabled: !!tarefaSlug,
  });

function invalidarTarefa(qc: ReturnType<typeof useQueryClient>, tarefaSlug: string, equipeSlug: string) {
  void qc.invalidateQueries({ queryKey: chaves.entregas(tarefaSlug) });
  void qc.invalidateQueries({ queryKey: chaves.tarefas(equipeSlug) });
  void qc.invalidateQueries({ queryKey: chaves.equipe(equipeSlug) });
  void qc.invalidateQueries({ queryKey: ['equipes'] });
  void qc.invalidateQueries({ queryKey: chaves.dashboard });
}

export function useEnviarEntrega(tarefaSlug: string, equipeSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { links: Array<string | { url: string; nome?: string }>; comentario?: string }) =>
      api<Entrega>(`/tarefas/${tarefaSlug}/entregas`, { method: 'POST', body: b }),
    onSuccess: () => invalidarTarefa(qc, tarefaSlug, equipeSlug),
  });
}

export function useAvaliar(tarefaSlug: string, equipeSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { entregaSlug: string; resultado: 'aprovada' | 'ajustar'; comentario?: string }) =>
      api(`/entregas/${b.entregaSlug}/avaliacoes`, { method: 'POST', body: { resultado: b.resultado, comentario: b.comentario } }),
    onSuccess: () => invalidarTarefa(qc, tarefaSlug, equipeSlug),
  });
}

// ── Anotações (RF-10) ─────────────────────────────────────────────────────────
export const useAnotacoes = (equipeSlug: string) =>
  useQuery({
    queryKey: chaves.anotacoes(equipeSlug),
    queryFn: () => api<{ data: Anotacao[] }>(`/equipes/${equipeSlug}/anotacoes`).then((r) => r.data),
    enabled: !!equipeSlug,
  });

export function useAnotar(equipeSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conteudo: string) =>
      api<Anotacao>(`/equipes/${equipeSlug}/anotacoes`, { method: 'POST', body: { conteudo } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: chaves.anotacoes(equipeSlug) }),
  });
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const useDashboard = () => useQuery({ queryKey: chaves.dashboard, queryFn: () => api<Dashboard>('/dashboard') });

// ── Contas ────────────────────────────────────────────────────────────────────
export const useUsuarios = (tipo?: 'admin' | 'mentor' | 'aluno') =>
  useQuery({
    queryKey: chaves.usuarios(tipo),
    queryFn: () => api<Pagina<UsuarioAdmin>>(`/usuarios${qs({ tipo, perPage: 100 })}`).then((r) => r.data),
  });

export function useCriarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { nome: string; email: string; telefone?: string; tipo: 'admin' | 'mentor' }) =>
      api<UsuarioAdmin & { conviteUrl: string }>('/usuarios', { method: 'POST', body: b }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['usuarios'] }),
  });
}

export function useEditarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, ...b }: { slug: string; nome?: string; telefone?: string; tipo?: string; ativo?: boolean }) =>
      api<UsuarioAdmin>(`/usuarios/${slug}`, { method: 'PATCH', body: b }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['usuarios'] }),
  });
}

export function useReenviarConvite() {
  return useMutation({
    mutationFn: (slug: string) => api<{ conviteUrl: string }>(`/usuarios/${slug}/convite`, { method: 'POST' }),
  });
}

export const useMe = () => useQuery({ queryKey: chaves.me, queryFn: () => api<Me>('/auth/me') });

export function useAtualizarMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { nome?: string; telefone?: string }) => api<Me>('/auth/me', { method: 'PATCH', body: b }),
    onSuccess: (me) => qc.setQueryData(chaves.me, me),
  });
}

export function useTrocarSenha() {
  return useMutation({
    mutationFn: (b: { atual: string; nova: string }) => api<RespostaSessao>('/auth/senha', { method: 'POST', body: b }),
    onSuccess: (r) => sessao.aplicar(r),
  });
}
```

- [ ] **Step 4: Teste de fumaça dos hooks**

`frontend/tests/api/consultas.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useEquipes, useMoverEtapa } from '@/data/api/consultas';
import { sessao } from '@/data/api/sessao';

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });

describe('consultas', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessao.aplicar({ access: 'A', refresh: 'R', usuario: { slug: 's', nome: 'x', role: 'admin' } });
  });

  it('useEquipes percorre as páginas e junta tudo', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) =>
      String(url).includes('page=1')
        ? json({ data: new Array(100).fill({ slug: 'a' }), page: 1, perPage: 100, total: 101 })
        : json({ data: [{ slug: 'b' }], page: 2, perPage: 100, total: 101 }),
    );
    const { result } = renderHook(() => useEquipes({ q: 'x' }), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(101);
    expect(String(f.mock.calls[0]![0])).toContain('q=x');
  });

  it('useMoverEtapa expõe o 409 da RN-01 com as pendências', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      json({ error: { code: 'RN01_PENDENCIAS', message: 'Há pendências', details: { pendencias: [{ tipo: 'tarefa', slug: 't', titulo: 'BMC' }] } } }, 409),
    );
    const { result } = renderHook(() => useMoverEtapa('eq'), { wrapper: wrapper() });
    result.current.mutate({ etapa: 3 });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ code: 'RN01_PENDENCIAS', details: { pendencias: [{ titulo: 'BMC' }] } });
  });
});
```
Run: `npx vitest run tests/api` → PASS.

- [ ] **Step 5: Rodar tudo** — `npm test && npm run build` → PASS.

- [ ] **Step 6: Commit e PR**

```bash
git add src/data/api/tipos.ts src/data/api/consultas.ts tests/api/consultas.test.tsx
git commit -m "feat(front): tipos da API e hooks React Query com invalidação

Closes #N"
git push -u origin feat/front-consultas
gh pr create --base staging --title "feat(front): tipos da API + hooks" --body "Contrato único telas ↔ API (DTOs + hooks de consulta/mutação, invalidação por recurso, CSV via backend).

Closes #N

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```
**Parar e pedir aprovação do usuário.**

---

## Tasks 3–9: telas (contrato por tela)

Cada task abaixo é **integração de tela**: o implementador lê o componente atual, troca `useStore`/`useActions`/`getUsuarioAtual` pelos hooks da Task 2 e ajusta a renderização ao DTO. Regras comuns a todas:

- **Estados**: `isPending` → skeleton/texto "Carregando…" com o design system; `isError` → mensagem `error.message` com botão "Tentar de novo" (`refetch`); lista vazia → estado vazio já existente no componente.
- **Mutações**: botão desabilitado com `isPending`; erro mostrado com `role="alert"` usando `ApiError.message`; sucesso fecha o diálogo.
- **Identidade**: comparar usuário por `useUsuario().slug`; papel por `.role`.
- **Nada de regra de negócio no componente**: status "atrasada", pendências, contagens vêm da API.
- **Testes**: atualizar os testes de componente existentes da tela (em `frontend/tests/components/`) para mockar `@/data/api/consultas` com `vi.mock` e cobrir: render com dados, estado de erro, e a ação principal chamando o hook de mutação com o body correto. Remover testes de `repository`/`store` **só** na Task 10.
- **Fluxo de cada task**: branch → issue "Pegando." → teste que falha → implementação → `npm test && npm run build` → commit → PR para `staging` → **aprovação do usuário**.

### Task 3: Cadastro da ideia + página `/convite`

**Files:** Modify `src/features/aluno-cadastro/CadastroForm.tsx`, `src/app/cadastro/page.tsx`; Create `src/app/convite/page.tsx`, `src/features/auth/AceitarConviteForm.tsx`, `src/features/aluno-cadastro/LinksConvite.tsx`; Test `tests/components/cadastro.test.tsx`, `tests/components/convite.test.tsx`.
**Endpoints:** `POST /equipes/inscricao` (`useInscricao`), `GET /areas-ideia` (`useAreas`), `GET /auth/invite` (`useConvite`), `POST /auth/register` (`useAceitarConvite`).
**Contrato:**
- Corpo da inscrição: `{ lider: { nome, email, senha, telefone, curso, semestre, matricula? }, ideia: { nome, descricao, estagio, area /* nome */, origem? }, colegas: [{ nome, email }] }`. **E-mail obrigatório para cada colega**; curso/semestre dos colegas saem do formulário (a pessoa informa no convite). Senha mínima **8**.
- Erros: 409 `EMAIL_TAKEN` (líder já tem conta → link "Entrar"), `RN03_EQUIPE_ATIVA`/`EMAIL_NAO_ALUNO` (mostrar a mensagem no colega correspondente), 400 → mensagem.
- Sucesso: sessão já aplicada pelo hook; mostrar `LinksConvite` com cada colega `{nome, email, conviteUrl}` e botão **Copiar link** (`navigator.clipboard.writeText`), texto "Envie este link para cada integrante (ex.: WhatsApp). O link vale 72 h."; colega com `conviteUrl: null` aparece como "já tem conta — entrou na equipe". Botão "Ir para minha equipe" → `/aluno`.
- `/convite?token=…`: `useConvite(token)` mostra nome/e-mail (somente leitura); campos **senha, confirmar senha, telefone** e, quando `role === 'aluno'`, **curso** (`CURSO_OPTIONS`), **semestre** (`SEMESTRE_OPTIONS`), **matrícula** (opcional). Erros do preview: `INVITE_USED` → "Este convite já foi usado — entre com sua senha."; `INVITE_EXPIRED` → "Convite expirado — peça um novo link ao líder ou ao mentor."; `INVALID_INVITE` → "Convite inválido.". Sucesso → `router.push(homeFor(role))`.

### Task 4: Funil/kanban (admin e mentor), filtros, CSV e lista de equipes

**Files:** Modify `src/features/funil/FunilBoard.tsx`, `src/features/admin-funil/{Funil.tsx,FiltrosBar.tsx,ExportarCSV.tsx}`, `src/features/admin-equipes/EquipesList.tsx`, `src/features/orientador/FunilKanban.tsx`; Create `src/features/funil/DialogoMover.tsx`; Test `tests/components/kanban.test.tsx`.
**Endpoints:** `GET /equipes` (`useEquipes(filtros)` — escopo por papel já vem do backend), `GET /equipes/:slug` (`useEquipe` para `pendenciasParaAvancar` no preview), `POST /equipes/:slug/etapa` (`useMoverEtapa`), `GET /equipes/export.csv` (`baixarCSV`), `useEtapas`, `useAreas`, `useCiclos`, `useUsuarios('mentor')` (só admin).
**Contrato:**
- Colunas: etapas 1–6 + "Pronta p/ InovAMF" (status `pronta_inovamf`/`encaminhada_inovamf`). Card: `nomeIdeia` (link `{base}/{slug}`), etapa, `area`, badge de `tarefasAtrasadas > 0`. Lista: nome, área, `"{n}. {nome}"`, status label, `mentor?.nome`, atrasadas.
- Filtros → `FiltrosEquipes`: `q`, `curso` (CURSO_OPTIONS), `area` (nome), `mentor` (slug; oculto para mentor), `statusTarefa` (preset `?status=` da URL continua funcionando), `ciclo` (nome).
- Soltar card numa coluna: abrir `DialogoMover` com origem → destino; ao abrir, buscar `useEquipe(slug)` e, se for avanço, listar `pendenciasParaAvancar` ("tarefa: {titulo}" / "integrante: {nome} — convite pendente | dados incompletos"). Confirmar chama `useMoverEtapa` com `{ etapa: número | 'pronta' }`; se houver pendências ou salto, o diálogo exige **observação** e manda `forcado: true`. Se a API responder 409 (`RN01_PENDENCIAS`/`RN01_SALTO`), o diálogo passa para o modo "forçar" mostrando `error.details.pendencias`. Remover o "Desfazer" (o backend registra histórico; desfazer = mover de volta).
- CSV: botão chama `baixarCSV(filtrosAtuais)`; erro → alerta.

### Task 5: Detalhe da equipe (admin/mentor)

**Files:** Modify `src/features/admin-detalhe/{DetalheEquipe.tsx,AvancarEtapa.tsx,HistoricoEtapas.tsx,AnotacoesInternas.tsx}`, `src/features/equipe/AdicionarMembroDialog.tsx`; Create `src/features/equipe/MembrosLista.tsx` (compartilhado com a Task 7); Test `tests/components/detalhe-equipe.test.tsx`.
**Endpoints:** `useEquipe`, `useMoverEtapa`, `useAnotacoes`, `useAnotar`, `useAdicionarMembro`, `useGerarConvite`.
**Contrato:**
- Cabeçalho/ideia: `nomeIdeia`, `descricaoIdeia`, `estagio` (ESTAGIO_LABEL), `area`, `ciclo`, `status` (STATUS_EQUIPE_LABEL), `mentor?.nome`, `origemDivulgacao`.
- `MembrosLista`: nome, papel (Líder), `curso`, `semestre` (semestreCurto), badge **"convite pendente"** quando `pendente`; para quem pode gerir (admin, mentor da equipe, líder): botão **"Gerar link"** em membro pendente → `useGerarConvite(membro.slug)` e mostra o link com **Copiar**.
- `AdicionarMembroDialog`: campos **nome + e-mail** (sem curso/semestre); sucesso mostra `conviteUrl` com Copiar (ou "já tem conta — adicionado" quando `null`); 409 mostra `error.message`.
- `AvancarEtapa`: botões Avançar/Retroceder/Marcar como pronta (etapa 6) usando `useMoverEtapa`; lista `pendenciasParaAvancar`; com pendências, o avanço vira "Forçar avanço" com observação obrigatória; 409 tratado como na Task 4.
- `HistoricoEtapas`: `de → para` (número ou "Pronta"), `forcado` (badge "forçado"), `observacao`, `por?.nome`, `em` formatado.
- `AnotacoesInternas`: lista `useAnotacoes` (mais recentes primeiro) com autor e data; formulário `useAnotar`. Texto "Visível só para a coordenação e o mentor".

### Task 6: Tarefas da equipe (admin/mentor)

**Files:** Modify `src/features/admin-tarefas/{TarefaList.tsx,NovaTarefaDialog.tsx,AvaliarEntrega.tsx}`; Test `tests/components/entrega.test.tsx` (atualizar).
**Endpoints:** `useTarefas`, `useEntregas`, `useCriarTarefa`, `useAvaliar`, `useModelos`, `useEtapas`.
**Contrato:**
- Lista: `titulo`, `obrigatoria`, `dataEntrega` (formatada, **sem** fuso — `dataEntrega.slice(0,10)`), `descricao`, `StatusBadge(status)` (a API já manda `atrasada`). Por tarefa, `useEntregas(slug)` lista **todas as versões** (`v{versao} — links`) com `arquivos[].url` clicáveis (`target="_blank" rel="noreferrer"`).
- Avaliar: só a **última** versão e só se `status === 'entregue'`; `useAvaliar` `{ entregaSlug, resultado, comentario }`; comentário obrigatório para "Solicitar ajustes".
- Nova tarefa: modo "De um modelo" (`useModelos`, rótulo `"{etapa} · {titulo}"`, data opcional — placeholder "prazo padrão: {prazoPadraoDias} dias") → `{ modelo: id, dataEntrega? }`; modo manual → `{ titulo, descricao, etapa, dataEntrega, obrigatoria }` com **obrigatória marcada por padrão**.

### Task 7: Área do aluno

**Files:** Modify `src/features/aluno-equipe/MinhaEquipe.tsx`, `src/features/aluno-tarefas/{MinhasTarefas.tsx,EnviarEntregaDialog.tsx}`; Test `tests/components/aluno.test.tsx`.
**Endpoints:** `useEquipes()` (para o aluno o backend devolve só a equipe dele → pegar `data[0]`), `useEquipe(slug)`, `useTarefas(slug)`, `useEntregas`, `useEnviarEntrega`, `useAdicionarMembro`, `useGerarConvite`, `useEtapas`.
**Contrato:**
- Sem equipe → estado vazio "Você ainda não está em uma equipe" com link para `/cadastro`.
- MinhaEquipe: dados da ideia, `StageProgress` (`etapas`, atual = `etapa.numero`, pronta = status), resumo (pendentes, atrasadas, próxima data), `MembrosLista` (Task 5); se o usuário é o **líder** (`membros.find(papel==='lider').slug === usuario.slug`), mostra adicionar membro e gerar link.
- MinhasTarefas: "A fazer" = `pendente|em_andamento|atrasada|ajustar`; "Concluídas" = `entregue|aprovada`; mostrar o comentário da última avaliação quando `status === 'ajustar'`.
- EnviarEntregaDialog: **somente link** por enquanto (https obrigatório — validar `^https://`), vários links, comentário; a aba "Arquivo" fica **desabilitada** com o texto "Envio de arquivo em breve" (volta no Plano 4). `useEnviarEntrega` `{ links: [{ url, nome? }], comentario }`.

### Task 8: Dashboard do admin e painel do mentor

**Files:** Modify `src/features/admin-dashboard/{DashboardIndicadores.tsx,DistribuicaoPorEtapa.tsx}`, `src/features/orientador/PainelOrientador.tsx`; Test `tests/components/dashboard.test.tsx`.
**Endpoints:** `useDashboard()` (admin e mentor — escopo pelo backend).
**Contrato:** cards `equipesAtivas`, `prontasInovamf`, `tarefasAtrasadas` (link `/admin?status=atrasada`), `totalEquipes`; barras de `porEtapa`; painel do mentor: cards `totalEquipes`, `aAvaliar`, `tarefasAtrasadas`, `prontasInovamf` + gráfico de `serieSemanal` (`rotulo`, `avancos`, `entregas`). Nenhum cálculo no front.

### Task 9: Contas (admin) e /conta

**Files:** Modify `src/features/admin-contas/ContasAdmin.tsx`, `src/features/conta/ContaPerfil.tsx`; Test `tests/components/contas.test.tsx`.
**Endpoints:** `useUsuarios()` (filtrar admin+mentor no cliente), `useCriarUsuario`, `useEditarUsuario`, `useReenviarConvite`, `useMe`, `useAtualizarMe`, `useTrocarSenha`.
**Contrato:**
- ContasAdmin: lista nome, e-mail, papel, ativo, "convite pendente" (`!conviteAceito`). Criar conta: **nome, e-mail, telefone (opcional), papel (admin|mentor)** — **sem senha**; sucesso mostra `conviteUrl` com Copiar ("envie para a pessoa definir a senha"). Editar: nome, telefone, papel. Ativar/desativar: `ativo`. Pendente: botão "Novo link" → `useReenviarConvite` e mostra o link.
- /conta: `useMe` preenche nome/telefone (e-mail e papel só leitura) → `useAtualizarMe`. Trocar senha: **senha atual**, nova (mín. 8), confirmar → `useTrocarSenha`; 401 `SENHA_ATUAL_INVALIDA` → "Senha atual incorreta".

---

## Task 10: Remover o mock

**Files:** Delete `src/data/store.tsx`, `src/data/fixtures.ts`, `src/data/session.ts`, `src/data/repository.ts` (mover para `src/domain/` o que ainda for usado **só** como formatação — ex.: `normalizar` — e apagar o resto), `tests/repository*.test.ts`, `tests/store.test.tsx`; Modify `src/app/layout.tsx` (sai `StoreProvider`), `src/features/auth/RecuperarSenhaForm.tsx` (sem backend ainda: mostrar "Para redefinir a senha, fale com a coordenação — admin@infohub.dev." até o Plano 4).

- [ ] **Step 1:** `grep -rn "@/data/store\|@/data/repository\|@/data/session\|@/data/fixtures" src tests` deve listar só os arquivos a remover/ajustar.
- [ ] **Step 2:** remover/ajustar; `npm test && npm run build` → PASS; `grep` do Step 1 → vazio.
- [ ] **Step 3:** Smoke E2E local com o backend e `SEED_DEMO=true`: login como `admin@infohub.dev`, `mentor1@demo.infohub.dev`, `bruna.lopes@demo.infohub.dev`; percorrer funil, detalhe, tarefas, entrega, avaliação, avançar etapa (A passa; B dá 409 → forçar), dashboard, contas, /conta.
- [ ] **Step 4:** commit `chore(front): remove o adaptador em memória (mock)`, PR para `staging`, **aprovação do usuário**.

## CP2 — promoção para `main`

Após Planos 2 e 3 mergeados em `staging`: PR `staging → main` "release: CP2 — front integrado", aprovação do usuário, deploy no Coolify e smoke no servidor com as contas do seed.
