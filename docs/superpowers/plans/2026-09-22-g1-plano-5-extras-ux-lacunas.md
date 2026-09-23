# G1 — Extras de UX e lacunas de requisito (Plano 5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar as lacunas de requisito que aparecem na demo ao vivo do G1 (gestão da equipe, RN-02 de verdade, redefinição de senha pelo admin, tarefa "em andamento", log de auditoria e linha do tempo) e entregar as melhorias de UX aprovadas (sino de notificações, toast, skeleton, card "Próximo passo", chips de prazo e busca rápida Ctrl+K).

**Architecture:** O backend segue o hexágono que já existe: regras puras novas em `backend/src/domain` (RN-02, regra de mudança de status, montagem da linha do tempo), Prisma só em `backend/src/models` (inclusive o helper `registrarAuditoria`, sempre chamado com o `tx` da transação da própria ação), controllers finos e rotas em `backend/src/routes.ts`. No frontend, hooks TanStack Query em `frontend/src/data/api/consultas.ts`, tipos em `tipos.ts`, componentes novos de DS (`Toast`, `Skeleton`, `PrazoChip`) e telas em `frontend/src/features`. São quatro blocos, com um PR por bloco para `staging` e aprovação entre eles.

**Tech Stack:** Express 4 + Prisma 5 + PostgreSQL, Vitest + supertest (backend); Next.js 14 (App Router), React 18, TanStack Query v5, Tailwind com tokens do DS, Radix Dialog, Vitest + Testing Library (frontend).

**Spec:** `docs/superpowers/specs/2026-09-22-g1-extras-ux-e-lacunas-design.md` (aprovada).

## Global Constraints

- **Nenhuma migration nova**: usar as tabelas que já existem (`log_auditoria`, `tokens_senha`, `emails`).
- **Todo PR mira `staging`** (`gh pr create --base staging`), nunca `main`.
- Antes de cada PR: backend com `npm test` + `npm run typecheck` verdes; frontend com `npm test` + `npm run build` verdes.
- O front fala com o back **só por `/api/v1/*` relativo** (sempre pelo `api()` de `frontend/src/data/api/http.ts`).
- **Regra de negócio só no backend**: o front só mostra o que a API decide (pendências, status efetivo, transições válidas).
- Erros da API: mostrar `ApiError.message` **inline**, perto da ação, com `role="alert"`. **O toast é só para sucesso.**
- Todo campo de senha usa `PasswordInput`, e todo formulário que define senha tem **campo de confirmação** (mínimo de 8 caracteres).
- Animações só com `motion-safe` / respeitando `prefers-reduced-motion`.
- Cores **só por tokens do DS** (nada de hex ou cor crua em componente).
- Links de convite e de redefinição são **relativos**; o `CopiarLink` completa com `window.location.origin`.
- O log de auditoria é gravado **dentro da mesma transação** da ação.
- **Solução mínima, sem over-engineering** (demo do G1 em 24/09).
- Convenções do repo: identificadores em português; erros via `httpError(status, code, message, details?)`; slugs são base64url dos UUIDs e **nunca** se expõe UUID na API; testes de backend usam `tests/helpers.ts` (`criarUsuario`/`criarEquipe`/`limpar`/`login`/`bearer`); o banco de teste é compartilhado por arquivos em paralelo, então asserções de contagem global usam delta (ou filtram por ids do próprio arquivo); TS strict com `noUncheckedIndexedAccess` no backend.
- Frontend: testes de componente fazem `vi.mock('@/data/api/consultas')` listando **todos** os hooks que a árvore renderizada chama (hook novo num componente = hook novo no `vi.mock` dos testes que o renderizam). O `next build` também checa os tipos de `tests/**` e roda o ESLint (`next/core-web-vitals` + `next/typescript`): nada de import sem uso nem `any`.
- Commits: Conventional Commits em pt-BR, terminando com as duas linhas de trailer abaixo (sempre via `git commit -F -` com heredoc, como nos passos de commit).

---

## Estrutura de arquivos

**Bloco E1 — Backend**
- Create `backend/src/models/auditoria.model.ts` — `registrarAuditoria(db, registro)`; única porta de escrita em `log_auditoria`.
- Create `backend/src/domain/linhaDoTempo.ts` — montagem pura da linha do tempo (histórico + auditoria → itens sem UUID).
- Modify `backend/src/domain/transicao.ts` — `mudancaDeStatusValida`, `ENTREGAVEIS_FINAIS`, pendência `entregavel`, `pendenciasEntregaveisFinais`, `juntarPendencias`, `codigoBloqueio`.
- Modify `backend/src/models/equipe.model.ts` — auditoria em `transicionar`; `atualizarGestao` (substitui `atualizarPorSlug`); RN-02 em `pendenciasDaPosicao`; `eventosLinhaDoTempo`.
- Modify `backend/src/models/entrega.model.ts` — `enviar` e `avaliar` transacionais com auditoria (substituem `criarComArquivos`/`criarAvaliacao`).
- Modify `backend/src/models/email.model.ts` — `NovoEmail`, `enfileirarComAuditoria`.
- Modify `backend/src/models/token.model.ts` — `RECUPERACAO_TTL_HORAS`, `emitirRecuperacao`, `consumirRecuperacao`.
- Modify `backend/src/models/tarefa.model.ts` — `iniciar`.
- Modify `backend/src/models/usuario.model.ts` — `findParaConviteBySlug` passa a trazer `ativo`.
- Modify `backend/src/utils/acesso.ts` — `ipDoChamador`.
- Modify `backend/src/utils/convite.ts` — `linkRedefinicao`.
- Modify controllers `equipe`, `entrega`, `notificacao`, `tarefa`, `usuario`, `auth` e `backend/src/routes.ts`.
- Modify `backend/src/seed/demo.ts` — notificações de demo (canceladas) dentro do `seedDemo`.
- Tests: `backend/tests/gestao-equipe.test.ts`, `rn02.test.ts`, `entregas-auditoria.test.ts`, `redefinir-senha.test.ts`, `tarefas-iniciar.test.ts`, `linha-do-tempo.test.ts`, `linha-do-tempo.unit.test.ts`; modify `transicao.unit.test.ts`, `rn01.test.ts`, `seed.test.ts`.

**Bloco E2 — DS + sino**
- Create `frontend/src/design-system/components/Toast.tsx` — `ToastProvider` + `useToast().sucesso`.
- Create `frontend/src/design-system/components/Skeleton.tsx`.
- Create `frontend/src/features/shell/notificacoes.ts` — regras de apresentação do sino (contagem, tempo relativo, destino, `localStorage`).
- Create `frontend/src/features/shell/SinoNotificacoes.tsx`.
- Modify `frontend/src/data/api/Providers.tsx`, `frontend/src/design-system/icons.tsx` (`BellIcon`), `tipos.ts` (`Notificacao`), `consultas.ts` (`useNotificacoes`), `frontend/src/features/shell/AppShell.tsx`.
- Tests: `frontend/tests/components/feedback.test.tsx`, `frontend/tests/components/sino.test.tsx`.

**Bloco E3 — Telas**
- Create `frontend/src/features/equipe/LinhaDoTempo.tsx`, `frontend/src/features/aluno-equipe/ProximoPasso.tsx`, `frontend/src/features/admin-detalhe/GestaoEquipe.tsx`, `frontend/src/features/admin-detalhe/EnviarLembreteDialog.tsx`, `frontend/src/domain/prazo.ts`, `frontend/src/design-system/components/PrazoChip.tsx`, `frontend/src/features/auth/RedefinirSenhaForm.tsx`, `frontend/src/app/redefinir-senha/page.tsx`.
- Delete `frontend/src/features/admin-detalhe/HistoricoEtapas.tsx` (a aba vira "Linha do tempo").
- Modify `tipos.ts`, `consultas.ts`, `DialogoMover.tsx`, `AvancarEtapa.tsx`, `DetalheEquipe.tsx`, `MinhaEquipe.tsx`, `MinhasTarefas.tsx`, `TarefaList.tsx`, `ContasAdmin.tsx`, `ContaPerfil.tsx`, `NovaTarefaDialog.tsx`, `EnviarEntregaDialog.tsx`, `AvaliarEntrega.tsx`, `AdicionarMembroDialog.tsx`, `FunilBoard.tsx`, `DashboardIndicadores.tsx`, `PainelOrientador.tsx`.
- Tests: create `frontend/tests/components/linha-do-tempo.test.tsx`, `frontend/tests/domain/prazo.test.tsx`, `frontend/tests/components/redefinir-senha.test.tsx`; modify `detalhe-equipe.test.tsx`, `aluno.test.tsx`, `contas.test.tsx`, `entrega.test.tsx`.

**Bloco E4 — Busca rápida**
- Create `frontend/src/features/shell/busca.ts`, `frontend/src/features/shell/BuscaRapida.tsx`.
- Modify `icons.tsx` (`SearchIcon`), `consultas.ts` (`useUsuarios` com `enabled`), `AppShell.tsx`, `ContasAdmin.tsx` (âncora `conta-<slug>`).
- Test: `frontend/tests/components/busca-rapida.test.tsx`.

## Contratos compartilhados (Interfaces fixadas)

Todas as tasks usam exatamente estes nomes e formatos.

**Auditoria (backend, `backend/src/models/auditoria.model.ts`)**
```ts
export type EntidadeAuditoria = "equipe" | "tarefa" | "entrega" | "usuario";
export type AcaoAuditoria =
  | "etapa_movida" | "status_alterado" | "mentor_atribuido"
  | "entrega_enviada" | "entrega_avaliada" | "lembrete_enviado"
  | "redefinicao_senha_gerada";
export interface RegistroAuditoria {
  usuarioId: string | null;   // UUID de quem agiu
  entidade: EntidadeAuditoria;
  entidadeId: string;         // UUID da linha afetada (coluna interna, nunca sai pela API)
  acao: AcaoAuditoria;
  antes?: Prisma.InputJsonValue;
  depois?: Prisma.InputJsonValue;
  ip?: string | null;         // ipDoChamador(req) === req.ip ?? null
}
export function registrarAuditoria(db: Prisma.TransactionClient, r: RegistroAuditoria): Promise<{ id: bigint }>;
```
Dados gravados por ação (sem UUID, sem segredo):
`etapa_movida` antes `{ posicao, status }` depois `{ posicao, status, forcado, observacao }` ·
`status_alterado` antes/depois `{ status }` · `mentor_atribuido` antes/depois `{ mentor: nome | null }` ·
`entrega_enviada` depois `{ tarefa, versao }` · `entrega_avaliada` depois `{ tarefa, resultado, comentario }` ·
`lembrete_enviado` depois `{ mensagem, destinatarios }` · `redefinicao_senha_gerada` depois `{ expiraEm }`.

**Endpoints novos ou alterados (todos em `/api/v1`)**
| Método e rota | Quem | Corpo | Resposta |
|---|---|---|---|
| `PATCH /equipes/:slug` | admin | `{ mentor?: string(slug) \| null, status?: "ativa"\|"pausada"\|"desistente"\|"encaminhada_inovamf", ...campos já existentes }` | 200 `{ slug, nomeIdeia, status, estagio }`; 409 `TRANSICAO_INVALIDA`; 400 `USE_TRANSICAO` |
| `POST /equipes/:slug/etapa` | admin, mentor da equipe | igual ao atual | 409 `RN02_PENDENCIAS` com `details: { pendencias: Pendencia[] }` ao sair da Etapa 6 |
| `POST /equipes/:slug/lembrete` | admin, mentor da equipe | `{ mensagem?: string (≤ 500) }` | 201 `{ enfileirados, total }`; 400 `MENSAGEM_LONGA` |
| `GET /equipes/:slug/linha-do-tempo` | admin; mentor da equipe; aluno membro | — | 200 `{ data: ItemLinhaDoTempo[] }`; 403 `FORBIDDEN` |
| `POST /tarefas/:slug/iniciar` | aluno membro | — | 200 `Tarefa` com `status: "em_andamento"`; 409 `TAREFA_NAO_PENDENTE`; 403 |
| `POST /usuarios/:slug/redefinir-senha` | admin | — | 201 `{ link: "/redefinir-senha?token=<id>.<segredo>", expiraEm: ISO }`; 409 `CONVITE_PENDENTE` \| `CONTA_INATIVA`; 404 |
| `POST /auth/redefinir-senha` | pública (rate-limited) | `{ token, senha (≥ 8) }` | 204; 400 `WEAK_PASSWORD` \| `INVALID_RESET` \| `RESET_USED` \| `RESET_EXPIRED` |
| `GET /notificacoes` | logado | — | inalterado: `{ data: [{ tipo, assunto, status, dados, criadoEm }], page, perPage, total }` |

```ts
// Pendencia (backend domain/transicao.ts e frontend tipos.ts)
type Pendencia =
  | { tipo: "tarefa"; slug: string; titulo: string }
  | { tipo: "integrante"; slug: string; nome: string; motivo: "convite_pendente" | "dados_incompletos" }
  | { tipo: "entregavel"; titulo: string };   // NOVO: entregável final da RN-02 que nem foi criado

// ItemLinhaDoTempo (JSON)
{ tipo: "etapa" | "status" | "mentor" | "entrega" | "avaliacao" | "lembrete"; titulo: string; detalhe?: string; autor?: string; em: string /* ISO */ }
```
As notificações `entrega_aprovada`/`entrega_ajustar`/`entrega_recebida_admin` passam a levar `dados.equipe_slug` e `dados.tarefa`.

**Frontend — hooks (`frontend/src/data/api/consultas.ts`)**
```ts
chaves.notificacoes = ['notificacoes'];                 chaves.linhaDoTempo = (slug) => ['linha-do-tempo', slug];
useNotificacoes(): UseQueryResult<Notificacao[]>        // refetchInterval 60_000 + refetchOnWindowFocus
useLinhaDoTempo(equipeSlug: string): UseQueryResult<ItemLinhaDoTempo[]>
useAtualizarEquipe(slug: string)   // mutate({ mentor?: string | null; status?: StatusEquipe })
useEnviarLembrete(equipeSlug: string) // mutate({ mensagem?: string }) → { enfileirados, total }
useIniciarTarefa(equipeSlug: string)  // mutate(tarefaSlug: string) → Tarefa
useGerarRedefinicao()                 // mutate(usuarioSlug: string) → { link, expiraEm }
useRedefinirSenha()                   // mutate({ token, senha }) → void (pública)
useUsuarios(tipo?, opcoes?: { enabled?: boolean })     // E4 acrescenta `opcoes`
```

**Frontend — componentes e props**
```ts
ToastProvider({ children }); useToast(): { sucesso(mensagem: string): void }; DURACAO_TOAST_MS = 4000
Skeleton({ linhas?: number = 3; className?: string })   // role="status" + "Carregando…" (sr-only)
PrazoChip({ dataEntrega: string; status: StatusTarefa; hoje?: string; className?: string })
textoPrazo(dataEntrega: string, status: StatusTarefa, hoje?: string): string | null   // domain/prazo.ts
SinoNotificacoes({ usuario: UsuarioSessao })
LinhaDoTempo({ equipeSlug: string; resumida?: boolean })   // resumida → 5 itens
ProximoPasso({ equipe: EquipeDetalhe })
GestaoEquipe({ equipe: EquipeDetalhe })
EnviarLembreteDialog({ equipeSlug: string })               // LIMITE_LEMBRETE = 500
RedefinirSenhaForm()                                        // lê ?token= via useSearchParams
BuscaRapida({ papel: 'admin' | 'mentor' })
textoPendencia(p: Pendencia): string; chavePendencia(p: Pendencia): string  // DialogoMover.tsx
```
**localStorage do sino:** chave `infohub-notif-vista:<slug>` com o ISO da última abertura do painel (lida/gravada com try/catch em `features/shell/notificacoes.ts`).

---

## Bloco E1 — Backend

Branch do bloco (sai de `staging` atualizado):

```bash
git fetch origin && git switch -c feat/g1-e1-backend origin/staging
cd backend && npm ci
```

Todos os comandos de teste abaixo rodam dentro de `backend/` com o `.env` de teste (banco compartilhado).

### Task 1: `registrarAuditoria` + auditoria no movimento de etapa + gestão da equipe no PATCH (A1, A4)

**Files:**
- Create: `backend/src/models/auditoria.model.ts`
- Modify: `backend/src/utils/acesso.ts` (novo `ipDoChamador`)
- Modify: `backend/src/domain/transicao.ts` (novo `mudancaDeStatusValida`)
- Modify: `backend/src/models/equipe.model.ts` (`transicionar` ganha `ip` e auditoria; `atualizarPorSlug` → `atualizarGestao`)
- Modify: `backend/src/controllers/equipe.controller.ts` (`update` e `moverEtapa`)
- Test: `backend/tests/transicao.unit.test.ts`, `backend/tests/gestao-equipe.test.ts` (novo)

**Interfaces:**
- Consumes: `httpError`, `idDoChamador`, `fromSlug`, `usuarioModel.findParaSessaoById` (já existem).
- Produces: `registrarAuditoria(db: Prisma.TransactionClient, r: RegistroAuditoria)`, os tipos `EntidadeAuditoria`, `AcaoAuditoria`, `RegistroAuditoria` (formato na seção "Contratos compartilhados"); `ipDoChamador(req: Request): string | null`; `mudancaDeStatusValida(atual: string, novo: string): boolean`; `equipeModel.atualizarGestao(p)` → `{ tipo: "ok"; equipe } | { tipo: "nao_encontrada" } | { tipo: "transicao_invalida" }`; `equipeModel.transicionar` passa a exigir `ip: string | null`.

- [ ] **Step 1: Escrever os testes unitários da regra de status (falham)**

Em `backend/tests/transicao.unit.test.ts`, troque o bloco de import do topo por:

```ts
import { describe, expect, it } from "vitest";
import {
  POSICAO_PRONTA,
  avaliarTransicao,
  mudancaDeStatusValida,
  pendenciasDeIntegrantes,
  type Pendencia,
} from "../src/domain/transicao.js";
```

e acrescente no fim do arquivo:

```ts
describe("mudancaDeStatusValida (A1)", () => {
  it("encaminhar ao InovAMF só a partir de pronta", () => {
    expect(mudancaDeStatusValida("pronta_inovamf", "encaminhada_inovamf")).toBe(true);
    expect(mudancaDeStatusValida("encaminhada_inovamf", "encaminhada_inovamf")).toBe(true);
    expect(mudancaDeStatusValida("ativa", "encaminhada_inovamf")).toBe(false);
    expect(mudancaDeStatusValida("pausada", "encaminhada_inovamf")).toBe(false);
  });
  it("ativa, pausada e desistente são livres", () => {
    expect(mudancaDeStatusValida("ativa", "pausada")).toBe(true);
    expect(mudancaDeStatusValida("pausada", "ativa")).toBe(true);
    expect(mudancaDeStatusValida("pronta_inovamf", "desistente")).toBe(true);
  });
});
```

- [ ] **Step 2: Escrever o teste de integração da gestão e da auditoria (falha)**

Crie `backend/tests/gestao-equipe.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { bearer, criarEquipe, criarUsuario, limpar, login } from "./helpers.js";

// A1 (gestão pelo admin via PATCH) + A4 (auditoria na MESMA transação da ação).
const app = createApp();
const sufixo = `gest${Date.now()}`;
const email = (n: string) => `${n}.${sufixo}@teste.local`;
let adminAccess = "";
let mentorAccess = "";
let mentorNovo = { id: "", slug: "" };
let equipe = { id: "", slug: "" };
let pronta = { id: "", slug: "" };
let movel = { id: "", slug: "" };

beforeAll(async () => {
  await criarUsuario(email("admin"), "admin");
  const mentor = await criarUsuario(email("mentor"), "mentor", { nome: "Mentora Antiga" });
  mentorNovo = await criarUsuario(email("mentor2"), "mentor", { nome: "Mentor Novo" });
  adminAccess = await login(app, email("admin"));
  mentorAccess = await login(app, email("mentor"));
  equipe = await criarEquipe({ nome: `Gestao ${sufixo}`, mentorId: mentor.id, etapa: 2 });
  pronta = await criarEquipe({ nome: `Pronta ${sufixo}`, mentorId: mentor.id, etapa: 6, status: "pronta_inovamf" });
  movel = await criarEquipe({ nome: `Movel ${sufixo}`, mentorId: mentor.id, etapa: 2 });
});

afterAll(async () => {
  await limpar(sufixo);
  await prisma.$disconnect();
});

const auditoria = (equipeId: string) =>
  prisma.log_auditoria.findMany({
    where: { entidade: "equipe", entidade_id: equipeId },
    orderBy: { id: "asc" },
  });
const patch = (slug: string, body: object, access = adminAccess) =>
  request(app).patch(`/api/v1/equipes/${slug}`).set(bearer(access)).send(body);

describe("PATCH /equipes/:slug — gestão (A1) auditada (A4)", () => {
  it("troca o mentor e audita com os nomes (sem UUID)", async () => {
    const r = await patch(equipe.slug, { mentor: mentorNovo.slug });
    expect(r.status).toBe(200);
    const log = await auditoria(equipe.id);
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({
      acao: "mentor_atribuido",
      dados_anteriores: { mentor: "Mentora Antiga" },
      dados_novos: { mentor: "Mentor Novo" },
    });
    expect(log[0]?.usuario_id).not.toBeNull();
    expect(log[0]?.ip_origem).toBeTruthy();
  });

  it("status ativa → pausada é auditado", async () => {
    const r = await patch(equipe.slug, { status: "pausada" });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("pausada");
    const log = await auditoria(equipe.id);
    expect(log.at(-1)).toMatchObject({
      acao: "status_alterado",
      dados_anteriores: { status: "ativa" },
      dados_novos: { status: "pausada" },
    });
  });

  it("encaminhar sem estar pronta → 409 TRANSICAO_INVALIDA; nada muda nem é auditado", async () => {
    const antes = (await auditoria(equipe.id)).length;
    const r = await patch(equipe.slug, { status: "encaminhada_inovamf" });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("TRANSICAO_INVALIDA");
    expect(await auditoria(equipe.id)).toHaveLength(antes);
    const eq = await prisma.equipes.findUniqueOrThrow({ where: { id: equipe.id }, select: { status: true } });
    expect(eq.status).toBe("pausada");
  });

  it("pronta_inovamf → encaminhada_inovamf é aceita", async () => {
    const r = await patch(pronta.slug, { status: "encaminhada_inovamf" });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("encaminhada_inovamf");
  });

  it("mentor: null tira o mentor e audita 'sem mentor'", async () => {
    const r = await patch(equipe.slug, { mentor: null });
    expect(r.status).toBe(200);
    const log = await auditoria(equipe.id);
    expect(log.at(-1)).toMatchObject({ acao: "mentor_atribuido", dados_novos: { mentor: null } });
  });

  it("o PATCH é só do admin (mentor → 403)", async () => {
    const r = await patch(equipe.slug, { status: "ativa" }, mentorAccess);
    expect(r.status).toBe(403);
  });
});

describe("POST /equipes/:slug/etapa — auditoria na mesma transação (A4)", () => {
  const mover = (body: object) =>
    request(app).post(`/api/v1/equipes/${movel.slug}/etapa`).set(bearer(adminAccess)).send(body);

  it("movimento recusado (409) não deixa log", async () => {
    const r = await mover({ etapa: 4 });
    expect(r.status).toBe(409);
    expect(await auditoria(movel.id)).toHaveLength(0);
  });

  it("movimento forçado grava etapa_movida com a observação", async () => {
    const r = await mover({ etapa: 4, forcado: true, observacao: "banca pediu" });
    expect(r.status).toBe(200);
    const log = await auditoria(movel.id);
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({
      acao: "etapa_movida",
      dados_anteriores: { posicao: 2, status: "ativa" },
      dados_novos: { posicao: 4, status: "ativa", forcado: true, observacao: "banca pediu" },
    });
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run tests/transicao.unit.test.ts tests/gestao-equipe.test.ts`
Expected: FAIL — `mudancaDeStatusValida is not a function` no unitário; no de integração, `expected 1 … received 0` (nenhum log) e o 409 `TRANSICAO_INVALIDA` volta 200.

- [ ] **Step 4: Criar o helper de auditoria**

Crie `backend/src/models/auditoria.model.ts`:

```ts
import type { Prisma } from "@prisma/client";

// RNF-05: log de auditoria. SEMPRE chamado com o `tx` da mesma transação da
// ação — se a ação desfaz, o log desfaz junto (nunca há log do que não
// aconteceu, nem ação sem log). Nada sensível (senha/token) em antes/depois;
// nomes em vez de UUID. entidade_id é o UUID da linha (coluna interna, nunca
// sai pela API).

export type EntidadeAuditoria = "equipe" | "tarefa" | "entrega" | "usuario";

export type AcaoAuditoria =
  | "etapa_movida"
  | "status_alterado"
  | "mentor_atribuido"
  | "entrega_enviada"
  | "entrega_avaliada"
  | "lembrete_enviado"
  | "redefinicao_senha_gerada";

export interface RegistroAuditoria {
  usuarioId: string | null;
  entidade: EntidadeAuditoria;
  entidadeId: string;
  acao: AcaoAuditoria;
  antes?: Prisma.InputJsonValue;
  depois?: Prisma.InputJsonValue;
  ip?: string | null;
}

export function registrarAuditoria(db: Prisma.TransactionClient, r: RegistroAuditoria) {
  return db.log_auditoria.create({
    data: {
      usuario_id: r.usuarioId,
      entidade: r.entidade,
      entidade_id: r.entidadeId,
      acao: r.acao,
      dados_anteriores: r.antes,
      dados_novos: r.depois,
      ip_origem: r.ip ?? null,
    },
    select: { id: true },
  });
}
```

- [ ] **Step 5: `ipDoChamador` e a regra pura de status**

No fim de `backend/src/utils/acesso.ts`:

```ts
// RNF-05: IP de origem gravado na auditoria. req.ip já é o IP real do cliente
// (app.ts confia no X-Forwarded-For do rewrite do Next — trust proxy).
export function ipDoChamador(req: Request): string | null {
  return req.ip ?? null;
}
```

No fim de `backend/src/domain/transicao.ts`:

```ts
// A1: status que o admin escolhe na gestão (PATCH /equipes/:slug).
// "pronta_inovamf" nunca vem daqui (só da transição — RN-02); encaminhar ao
// InovAMF só a partir de "pronta_inovamf".
export function mudancaDeStatusValida(atual: string, novo: string): boolean {
  if (novo === "encaminhada_inovamf") {
    return atual === "pronta_inovamf" || atual === "encaminhada_inovamf";
  }
  return true;
}
```

- [ ] **Step 6: Model — auditoria no `transicionar` e `atualizarGestao`**

Em `backend/src/models/equipe.model.ts`:

1. Troque o import do domínio e acrescente o do helper:

```ts
import {
  POSICAO_PRONTA,
  avaliarTransicao,
  mudancaDeStatusValida,
  pendenciasDeIntegrantes,
  type Decisao,
  type Pendencia,
} from "../domain/transicao.js";
import { toSlug } from "../utils/slug.js";
import { whereStatusEfetivo } from "./tarefa.model.js";
import { registrarAuditoria } from "./auditoria.model.js";
```

2. Apague a função `atualizarPorSlug` inteira e, no lugar dela, cole:

```ts
// A1 (gestão pelo admin) como UMA transação: trava a equipe, confere a regra
// de status (pura), grava e audita mentor/status (RNF-05). `campos` são as
// colunas simples já validadas no controller (nome, descrição, estágio, área, origem).
export async function atualizarGestao(p: {
  slug: string;
  campos: Record<string, unknown>;
  status?: string;
  mentor?: { id: string; nome: string } | null; // undefined = não mexe; null = sem mentor
  por: string;
  ip: string | null;
}): Promise<
  | {
      tipo: "ok";
      equipe: { slug: string; nome_ideia: string; status: string; estagio_ideia: string };
    }
  | { tipo: "nao_encontrada" }
  | { tipo: "transicao_invalida" }
> {
  return prisma.$transaction(async (tx) => {
    const [trava] = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM equipes WHERE slug = ${p.slug} FOR UPDATE`;
    if (!trava) return { tipo: "nao_encontrada" as const };

    const atual = await tx.equipes.findUniqueOrThrow({
      where: { id: trava.id },
      select: { status: true, mentor_id: true, usuarios: { select: { nome: true } } },
    });
    if (p.status !== undefined && !mudancaDeStatusValida(atual.status, p.status)) {
      return { tipo: "transicao_invalida" as const };
    }

    const data = { ...p.campos } as Prisma.equipesUncheckedUpdateInput;
    if (p.status !== undefined) data.status = p.status;
    if (p.mentor !== undefined) data.mentor_id = p.mentor?.id ?? null;
    const equipe = await tx.equipes.update({
      where: { id: trava.id },
      data,
      select: { slug: true, nome_ideia: true, status: true, estagio_ideia: true },
    });

    if (p.status !== undefined && p.status !== atual.status) {
      await registrarAuditoria(tx, {
        usuarioId: p.por,
        entidade: "equipe",
        entidadeId: trava.id,
        acao: "status_alterado",
        antes: { status: atual.status },
        depois: { status: p.status },
        ip: p.ip,
      });
    }
    if (p.mentor !== undefined && (p.mentor?.id ?? null) !== atual.mentor_id) {
      await registrarAuditoria(tx, {
        usuarioId: p.por,
        entidade: "equipe",
        entidadeId: trava.id,
        acao: "mentor_atribuido",
        antes: { mentor: atual.usuarios?.nome ?? null },
        depois: { mentor: p.mentor?.nome ?? null },
        ip: p.ip,
      });
    }
    return { tipo: "ok" as const, equipe };
  });
}
```

3. Em `transicionar`, acrescente `ip: string | null;` ao tipo do parâmetro `p` (depois de `observacao: string | null;`) e, logo depois do `await tx.historico_etapas.create({...});`, cole:

```ts
    await registrarAuditoria(tx, {
      usuarioId: p.movidoPor,
      entidade: "equipe",
      entidadeId: p.equipeId,
      acao: "etapa_movida",
      antes: { posicao: origem, status: eq.status },
      depois: {
        posicao: p.destino,
        status: atualizada.status,
        forcado: decisao.forcado,
        observacao: p.observacao,
      },
      ip: p.ip,
    });
```

- [ ] **Step 7: Controller — `update` usa `atualizarGestao`; `moverEtapa` passa o IP**

Em `backend/src/controllers/equipe.controller.ts`, troque o import de acesso por:

```ts
import { escopoDo, idDoChamador, ipDoChamador, podeGerirEquipe } from "../utils/acesso.js";
```

Substitua a função `update` inteira (e o comentário acima dela) por:

```ts
// PATCH /equipes/:slug — admin edita e faz a gestão (A1): mentor e status.
// "pronta_inovamf" só vem da transição (RN-02); "encaminhada_inovamf" só a
// partir de "pronta_inovamf" (409). Mentor/status mudados são auditados (RNF-05).
export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const { nomeIdeia, descricaoIdeia, estagio, status, area, mentor, origem } =
      req.body ?? {};
    const campos: Record<string, unknown> = {};

    if (nomeIdeia !== undefined) {
      if (typeof nomeIdeia !== "string" || nomeIdeia.trim().length < 3) {
        throw httpError(400, "INVALID_NOME", "Nome da ideia inválido");
      }
      campos.nome_ideia = nomeIdeia.trim();
    }
    if (descricaoIdeia !== undefined) {
      if (typeof descricaoIdeia !== "string" || descricaoIdeia.trim().length === 0) {
        throw httpError(400, "INVALID_DESCRICAO", "Descrição inválida");
      }
      campos.descricao_ideia = descricaoIdeia.trim();
    }
    if (estagio !== undefined) campos.estagio_ideia = validarEstagio(estagio);
    if (origem !== undefined) {
      campos.origem_divulgacao = typeof origem === "string" ? origem.trim() : null;
    }
    if (area !== undefined) {
      if (typeof area === "string" && area.trim()) {
        const a = await areaModel.findIdByNome(area.trim());
        if (!a) throw httpError(400, "INVALID_AREA", "Área desconhecida");
        campos.area_id = a.id;
      } else {
        campos.area_id = null;
      }
    }

    let novoStatus: StatusEquipe | undefined;
    if (status !== undefined) {
      if (typeof status !== "string" || !(STATUS_EQUIPE as string[]).includes(status)) {
        throw httpError(400, "INVALID_STATUS", "Status inválido");
      }
      if ((status as StatusEquipe) === "pronta_inovamf") {
        throw httpError(
          400,
          "USE_TRANSICAO",
          "Use POST /equipes/:slug/etapa com etapa 'pronta' (RN-02)",
        );
      }
      novoStatus = status as StatusEquipe;
    }

    // undefined = não mexe; null = "sem mentor".
    let novoMentor: { id: string; nome: string } | null | undefined;
    if (mentor !== undefined) {
      if (typeof mentor === "string" && mentor.trim()) {
        const id = fromSlug(mentor.trim());
        const u = id ? await usuarioModel.findParaSessaoById(id) : null;
        if (!id || !u || (u.tipo_usuario !== "mentor" && u.tipo_usuario !== "admin")) {
          throw httpError(400, "INVALID_MENTOR", "Mentor inválido");
        }
        novoMentor = { id, nome: u.nome };
      } else {
        novoMentor = null;
      }
    }

    if (
      Object.keys(campos).length === 0 &&
      novoStatus === undefined &&
      novoMentor === undefined
    ) {
      throw httpError(400, "EMPTY_UPDATE", "Nada para atualizar");
    }

    const r = await equipeModel.atualizarGestao({
      slug: req.params.slug ?? "",
      campos,
      status: novoStatus,
      mentor: novoMentor,
      por: idDoChamador(req),
      ip: ipDoChamador(req),
    });
    if (r.tipo === "nao_encontrada") {
      throw httpError(404, "EQUIPE_NOT_FOUND", "Equipe não encontrada");
    }
    if (r.tipo === "transicao_invalida") {
      throw httpError(
        409,
        "TRANSICAO_INVALIDA",
        "Só dá para encaminhar ao InovAMF uma equipe que está Pronta p/ InovAMF",
      );
    }
    res.json({
      slug: r.equipe.slug,
      nomeIdeia: r.equipe.nome_ideia,
      status: r.equipe.status,
      estagio: r.equipe.estagio_ideia,
    });
  } catch (err) {
    next(err);
  }
}
```

Em `moverEtapa`, na chamada `equipeModel.transicionar({ ... })`, acrescente a linha `ip: ipDoChamador(req),` depois de `observacao: ...`.

- [ ] **Step 8: Rodar os testes e o typecheck**

Run: `npx vitest run tests/transicao.unit.test.ts tests/gestao-equipe.test.ts tests/rn01.test.ts tests/equipes.test.ts && npm run typecheck`
Expected: PASS em todos; `tsc --noEmit` sem erros.

- [ ] **Step 9: Commit**

```bash
git add src/models/auditoria.model.ts src/utils/acesso.ts src/domain/transicao.ts src/models/equipe.model.ts src/controllers/equipe.controller.ts tests/transicao.unit.test.ts tests/gestao-equipe.test.ts
git commit -F - <<'EOF'
feat(backend): auditoria na mesma transação e gestão da equipe pelo admin

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E9TXsEhLzvh1bBR9LeB58C
EOF
```

### Task 2: RN-02 de verdade (entregáveis finais + integrantes, 409 `RN02_PENDENCIAS`)

**Files:**
- Modify: `backend/src/domain/transicao.ts`
- Modify: `backend/src/models/equipe.model.ts` (`pendenciasDaPosicao`, retorno de `transicionar`)
- Modify: `backend/src/controllers/equipe.controller.ts` (`moverEtapa`)
- Test: `backend/tests/transicao.unit.test.ts`, `backend/tests/rn01.test.ts`, `backend/tests/rn02.test.ts` (novo)

**Interfaces:**
- Consumes: `registrarAuditoria` no `transicionar` (Task 1), `MODELOS_TAREFA` de `src/seed/base.ts` (só no teste).
- Produces: `ENTREGAVEIS_FINAIS: readonly ["Pitch vídeo", "Business Model Canvas final", "Value Proposition Design final"]`; `Pendencia` com a variante `{ tipo: "entregavel"; titulo: string }`; `pendenciasEntregaveisFinais(tarefas: Array<{ slug; titulo; status; modelo }>): Pendencia[]`; `juntarPendencias(...listas: Pendencia[][]): Pendencia[]`; `codigoBloqueio(origem: number, motivo: "pendencias" | "salto"): "RN01_SALTO" | "RN01_PENDENCIAS" | "RN02_PENDENCIAS"`; `transicionar` rejeitada passa a devolver `origem: number`.

- [ ] **Step 1: Testes unitários da RN-02 (falham)**

Em `backend/tests/transicao.unit.test.ts`, troque o import do topo por:

```ts
import { describe, expect, it } from "vitest";
import {
  ENTREGAVEIS_FINAIS,
  POSICAO_PRONTA,
  avaliarTransicao,
  codigoBloqueio,
  juntarPendencias,
  mudancaDeStatusValida,
  pendenciasDeIntegrantes,
  pendenciasEntregaveisFinais,
  type Pendencia,
} from "../src/domain/transicao.js";
import { MODELOS_TAREFA } from "../src/seed/base.js";
```

e acrescente no fim:

```ts
describe("RN-02 — entregáveis finais da Etapa 6", () => {
  const t = (slug: string, modelo: string, status: string) => ({ slug, titulo: modelo, status, modelo });

  it("são exatamente os modelos da Etapa 6 do seed", () => {
    expect([...ENTREGAVEIS_FINAIS]).toEqual(MODELOS_TAREFA.filter((m) => m.etapa === 6).map((m) => m.titulo));
  });

  it("sem nenhuma tarefa: os três viram pendência 'entregavel'", () => {
    expect(pendenciasEntregaveisFinais([])).toEqual([
      { tipo: "entregavel", titulo: "Pitch vídeo" },
      { tipo: "entregavel", titulo: "Business Model Canvas final" },
      { tipo: "entregavel", titulo: "Value Proposition Design final" },
    ]);
  });

  it("uma aprovada basta; a não aprovada vira pendência 'tarefa'", () => {
    expect(
      pendenciasEntregaveisFinais([
        t("p1", "Pitch vídeo", "ajustar"),
        t("p2", "Pitch vídeo", "aprovada"),
        t("b1", "Business Model Canvas final", "entregue"),
      ]),
    ).toEqual([
      { tipo: "tarefa", slug: "b1", titulo: "Business Model Canvas final" },
      { tipo: "entregavel", titulo: "Value Proposition Design final" },
    ]);
  });

  it("juntarPendencias não repete a mesma tarefa", () => {
    const a: Pendencia = { tipo: "tarefa", slug: "x", titulo: "BMC" };
    const e: Pendencia = { tipo: "entregavel", titulo: "Pitch vídeo" };
    expect(juntarPendencias([a], [a, e], [e])).toEqual([a, e]);
  });

  it("codigoBloqueio: salto é RN-01; sair da Etapa 6 é RN-02", () => {
    expect(codigoBloqueio(3, "salto")).toBe("RN01_SALTO");
    expect(codigoBloqueio(3, "pendencias")).toBe("RN01_PENDENCIAS");
    expect(codigoBloqueio(POSICAO_PRONTA - 1, "pendencias")).toBe("RN02_PENDENCIAS");
  });
});
```

- [ ] **Step 2: Teste de integração da RN-02 (falha)**

Crie `backend/tests/rn02.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { seedBase } from "../src/seed/base.js";
import { bearer, criarEquipe, criarUsuario, limpar, login } from "./helpers.js";

// RN-02: "Pronta p/ InovAMF" exige os 3 entregáveis finais (tarefas dos modelos
// da Etapa 6) aprovados + todos os integrantes com convite aceito e dados.
const app = createApp();
const sufixo = `rn02${Date.now()}`;
const email = (n: string) => `${n}.${sufixo}@teste.local`;
let adminAccess = "";
let mentorAccess = "";
let pendente = { id: "", slug: "" };
let equipe = { id: "", slug: "" };

beforeAll(async () => {
  await seedBase(prisma); // garante os modelos da Etapa 6 (idempotente)
  await criarUsuario(email("admin"), "admin");
  const mentor = await criarUsuario(email("mentor"), "mentor");
  const lider = await criarUsuario(email("lider"), "aluno");
  pendente = await criarUsuario(email("pendente"), "aluno", { ativado: false, nome: "Pendente Souza" });
  adminAccess = await login(app, email("admin"));
  mentorAccess = await login(app, email("mentor"));
  equipe = await criarEquipe({
    nome: `Final ${sufixo}`,
    mentorId: mentor.id,
    etapa: 6,
    membros: [{ id: lider.id, papel: "lider" }, { id: pendente.id, papel: "integrante" }],
  });
  await prisma.alunos.create({ data: { usuario_id: lider.id, curso: "Direito", semestre: "5" } });
});

afterAll(async () => {
  await limpar(sufixo);
  await prisma.$disconnect();
});

const mover = () =>
  request(app).post(`/api/v1/equipes/${equipe.slug}/etapa`).set(bearer(mentorAccess)).send({ etapa: "pronta" });

describe("RN-02 — Pronta p/ InovAMF", () => {
  it("sem os entregáveis e com convite pendente → 409 RN02_PENDENCIAS com a lista", async () => {
    const r = await mover();
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("RN02_PENDENCIAS");
    expect(r.body.error.details.pendencias).toEqual([
      { tipo: "entregavel", titulo: "Pitch vídeo" },
      { tipo: "entregavel", titulo: "Business Model Canvas final" },
      { tipo: "entregavel", titulo: "Value Proposition Design final" },
      expect.objectContaining({ tipo: "integrante", nome: "Pendente Souza", motivo: "convite_pendente" }),
    ]);
  });

  it("o detalhe mostra as mesmas pendências (preview do drag e do Próximo passo)", async () => {
    const det = await request(app).get(`/api/v1/equipes/${equipe.slug}`).set(bearer(adminAccess));
    expect(det.body.pendenciasParaAvancar).toHaveLength(4);
  });

  it("com as 3 tarefas dos modelos aprovadas, só o integrante bloqueia", async () => {
    const modelos = await request(app).get("/api/v1/modelos-tarefa").set(bearer(adminAccess));
    const finais = (modelos.body.data as Array<{ id: number; etapa: number }>).filter((m) => m.etapa === 6);
    expect(finais).toHaveLength(3);
    for (const m of finais) {
      const t = await request(app)
        .post(`/api/v1/equipes/${equipe.slug}/tarefas`)
        .set(bearer(adminAccess))
        .send({ modelo: m.id });
      expect(t.status).toBe(201);
      const ap = await request(app)
        .patch(`/api/v1/tarefas/${t.body.slug}`)
        .set(bearer(adminAccess))
        .send({ status: "aprovada" });
      expect(ap.status).toBe(200);
    }
    const r = await mover();
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("RN02_PENDENCIAS");
    expect(r.body.error.details.pendencias).toEqual([
      expect.objectContaining({ tipo: "integrante", nome: "Pendente Souza" }),
    ]);
  });

  it("todos os integrantes em dia → vira pronta sem forçar", async () => {
    await prisma.usuarios.update({ where: { id: pendente.id }, data: { convite_aceito_em: new Date() } });
    await prisma.alunos.create({ data: { usuario_id: pendente.id, curso: "Pedagogia", semestre: "2" } });
    const r = await mover();
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("pronta_inovamf");
    expect(r.body.forcado).toBe(false);
  });
});
```

Em `backend/tests/rn01.test.ts`, substitua o teste `it("409 lista o integrante com convite pendente", ...)` (primeiro `it` do `describe("RN-02 — Pronta para o InovAMF")`) por:

```ts
  it("409 RN02_PENDENCIAS lista os entregáveis ausentes e o integrante com convite pendente", async () => {
    const r = await mover(final.slug, { etapa: "pronta" });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("RN02_PENDENCIAS");
    expect(r.body.error.details.pendencias).toEqual(
      expect.arrayContaining([
        { tipo: "entregavel", titulo: "Pitch vídeo" },
        expect.objectContaining({ tipo: "integrante", nome: "Pendente Silva", motivo: "convite_pendente" }),
      ]),
    );
  });
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run tests/transicao.unit.test.ts tests/rn02.test.ts tests/rn01.test.ts`
Expected: FAIL — `ENTREGAVEIS_FINAIS`/`pendenciasEntregaveisFinais`/`codigoBloqueio` indefinidos; a integração recebe `RN01_PENDENCIAS` e só 1 pendência.

- [ ] **Step 4: Domínio — RN-02 pura**

Em `backend/src/domain/transicao.ts`:

1. Troque o cabeçalho de comentário (linhas 1–6) por:

```ts
// RN-01: a equipe só avança quando as tarefas OBRIGATÓRIAS da etapa atual estão
// aprovadas — ou por decisão do mentor/admin (forçar, com observação gravada).
// RN-02: "Pronta para o InovAMF" (posição 7) exige, além das obrigatórias da
// etapa 6, os três entregáveis finais (tarefas criadas dos modelos da Etapa 6)
// APROVADOS e os dados de todos os integrantes (convite aceito + curso/semestre).
// Regra PURA: quem busca as pendências e grava é equipe.model.transicionar,
// dentro de uma única transação.
```

2. Troque o tipo `Pendencia` por:

```ts
export type Pendencia =
  | { tipo: "tarefa"; slug: string; titulo: string }
  | {
      tipo: "integrante";
      slug: string;
      nome: string;
      motivo: "convite_pendente" | "dados_incompletos";
    }
  // RN-02: entregável final que o mentor ainda nem criou como tarefa.
  | { tipo: "entregavel"; titulo: string };
```

3. Logo depois de `export const POSICAO_PRONTA = 7;`, acrescente:

```ts
// RN-02: os entregáveis finais, pelo título do MODELO (RF-11) de onde a tarefa
// nasceu. Mesmos títulos da Etapa 6 em seed/base.ts (o teste unitário garante).
export const ENTREGAVEIS_FINAIS = [
  "Pitch vídeo",
  "Business Model Canvas final",
  "Value Proposition Design final",
] as const;
```

4. No fim do arquivo, acrescente:

```ts
// RN-02: cada entregável final precisa de ao menos UMA tarefa (criada do
// modelo) aprovada. Nenhuma tarefa → pendência "entregavel"; tarefa(s) ainda
// não aprovada(s) → cada uma vira pendência "tarefa" (o aluno vai direto nela).
export function pendenciasEntregaveisFinais(
  tarefas: Array<{ slug: string; titulo: string; status: string; modelo: string }>,
): Pendencia[] {
  const r: Pendencia[] = [];
  for (const titulo of ENTREGAVEIS_FINAIS) {
    const doModelo = tarefas.filter((t) => t.modelo === titulo);
    if (doModelo.some((t) => t.status === "aprovada")) continue;
    if (doModelo.length === 0) {
      r.push({ tipo: "entregavel", titulo });
    } else {
      for (const t of doModelo) r.push({ tipo: "tarefa", slug: t.slug, titulo: t.titulo });
    }
  }
  return r;
}

// Junta listas sem repetir a mesma pendência (a obrigatória da Etapa 6 da
// RN-01 pode ser também um entregável final da RN-02).
export function juntarPendencias(...listas: Pendencia[][]): Pendencia[] {
  const vistas = new Set<string>();
  const r: Pendencia[] = [];
  for (const p of listas.flat()) {
    const chave = p.tipo === "entregavel" ? `entregavel:${p.titulo}` : `${p.tipo}:${p.slug}`;
    if (vistas.has(chave)) continue;
    vistas.add(chave);
    r.push(p);
  }
  return r;
}

// Código do 409 de uma transição bloqueada: salto é RN-01; pendências ao sair
// da Etapa 6 (rumo a "pronta") são RN-02; as demais, RN-01.
export function codigoBloqueio(
  origem: number,
  motivo: "pendencias" | "salto",
): "RN01_SALTO" | "RN01_PENDENCIAS" | "RN02_PENDENCIAS" {
  if (motivo === "salto") return "RN01_SALTO";
  return origem === POSICAO_PRONTA - 1 ? "RN02_PENDENCIAS" : "RN01_PENDENCIAS";
}
```

- [ ] **Step 5: Model — pendências da Etapa 6 e `origem` na recusa**

Em `backend/src/models/equipe.model.ts`, troque o import do domínio por:

```ts
import {
  ENTREGAVEIS_FINAIS,
  POSICAO_PRONTA,
  avaliarTransicao,
  juntarPendencias,
  mudancaDeStatusValida,
  pendenciasDeIntegrantes,
  pendenciasEntregaveisFinais,
  type Decisao,
  type Pendencia,
} from "../domain/transicao.js";
```

Substitua a função `pendenciasDaPosicao` inteira por:

```ts
// Pendências que impedem SAIR da posição atual para frente (RN-01/RN-02).
async function pendenciasDaPosicao(
  tx: Prisma.TransactionClient,
  equipeId: string,
  posicao: number,
): Promise<Pendencia[]> {
  if (posicao >= POSICAO_PRONTA) return [];
  const tarefas = await tx.tarefas.findMany({
    where: {
      equipe_id: equipeId,
      obrigatoria: true,
      status: { not: "aprovada" },
      etapas: { numero: posicao },
    },
    orderBy: { data_entrega: "asc" },
    select: { id: true, titulo: true },
  });
  const pendencias: Pendencia[] = tarefas.map((t) => ({
    tipo: "tarefa",
    slug: toSlug(t.id),
    titulo: t.titulo,
  }));
  if (posicao !== 6) return pendencias;

  // RN-02: os três entregáveis finais (tarefas nascidas dos modelos da Etapa 6)
  // + os dados de todos os integrantes ativos.
  const finais = await tx.tarefas.findMany({
    where: {
      equipe_id: equipeId,
      modelos_tarefa: { etapas: { numero: 6 }, titulo: { in: [...ENTREGAVEIS_FINAIS] } },
    },
    orderBy: { criado_em: "asc" },
    select: { id: true, titulo: true, status: true, modelos_tarefa: { select: { titulo: true } } },
  });
  const membros = await tx.equipe_membros.findMany({
    where: { equipe_id: equipeId, ativo: true },
    select: {
      usuarios: {
        select: {
          slug: true,
          nome: true,
          convite_aceito_em: true,
          alunos: { select: { curso: true, semestre: true } },
        },
      },
    },
  });
  return juntarPendencias(
    pendencias,
    pendenciasEntregaveisFinais(
      finais.map((t) => ({
        slug: toSlug(t.id),
        titulo: t.titulo,
        status: t.status,
        modelo: t.modelos_tarefa?.titulo ?? "",
      })),
    ),
    pendenciasDeIntegrantes(
      membros.map((m) => ({
        slug: m.usuarios.slug,
        nome: m.usuarios.nome,
        conviteAceitoEm: m.usuarios.convite_aceito_em,
        curso: m.usuarios.alunos?.curso ?? null,
        semestre: m.usuarios.alunos?.semestre ?? null,
      })),
    ),
  );
}
```

Em `transicionar`:
- no tipo de retorno, troque `| { tipo: "rejeitada"; decisao: Exclude<Decisao, { tipo: "permitida" }> }` por `| { tipo: "rejeitada"; decisao: Exclude<Decisao, { tipo: "permitida" }>; origem: number }`;
- troque `if (decisao.tipo !== "permitida") return { tipo: "rejeitada" as const, decisao };` por `if (decisao.tipo !== "permitida") return { tipo: "rejeitada" as const, decisao, origem };`.

- [ ] **Step 6: Controller — código `RN02_PENDENCIAS`**

Em `backend/src/controllers/equipe.controller.ts`, troque `import { POSICAO_PRONTA } from "../domain/transicao.js";` por:

```ts
import { POSICAO_PRONTA, codigoBloqueio } from "../domain/transicao.js";
```

Logo abaixo da constante `MENSAGEM_INVALIDA`, acrescente:

```ts
const MENSAGEM_BLOQUEIO: Record<ReturnType<typeof codigoBloqueio>, string> = {
  RN01_SALTO: "Pular etapas exige forçar com observação",
  RN01_PENDENCIAS: "Há pendências obrigatórias nesta etapa",
  RN02_PENDENCIAS: "Faltam entregáveis finais ou dados de integrantes para ficar Pronta p/ InovAMF",
};
```

Em `moverEtapa`, substitua o bloco `if (r.tipo === "rejeitada") { ... }` por:

```ts
    if (r.tipo === "rejeitada") {
      if (r.decisao.tipo === "invalida") {
        throw httpError(400, r.decisao.codigo, MENSAGEM_INVALIDA[r.decisao.codigo] ?? "");
      }
      const codigo = codigoBloqueio(r.origem, r.decisao.motivo);
      throw httpError(409, codigo, MENSAGEM_BLOQUEIO[codigo], {
        pendencias: r.decisao.pendencias,
      });
    }
```

- [ ] **Step 7: Rodar os testes e o typecheck**

Run: `npx vitest run tests/transicao.unit.test.ts tests/rn02.test.ts tests/rn01.test.ts tests/seed.test.ts && npm run typecheck`
Expected: PASS (o ensaio do `seed.test.ts` continua recebendo `RN01_PENDENCIAS` na Etapa 2).

- [ ] **Step 8: Commit**

```bash
git add src/domain/transicao.ts src/models/equipe.model.ts src/controllers/equipe.controller.ts tests/transicao.unit.test.ts tests/rn01.test.ts tests/rn02.test.ts
git commit -F - <<'EOF'
feat(backend): RN-02 exige os entregáveis finais aprovados e responde RN02_PENDENCIAS

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E9TXsEhLzvh1bBR9LeB58C
EOF
```

### Task 3: Entrega, avaliação e lembrete auditados + aviso da avaliação a todos os alunos (A1, A4, B1)

**Files:**
- Modify: `backend/src/models/entrega.model.ts` (`enviar`, `avaliar`; `DETALHE_SELECT`)
- Modify: `backend/src/models/email.model.ts` (`NovoEmail`, `enfileirarComAuditoria`)
- Modify: `backend/src/controllers/entrega.controller.ts` (`store`, `avaliar`)
- Modify: `backend/src/controllers/notificacao.controller.ts` (`lembrete`)
- Test: `backend/tests/entregas-auditoria.test.ts` (novo)

**Interfaces:**
- Consumes: `registrarAuditoria`, `RegistroAuditoria`, `ipDoChamador` (Task 1); `equipeModel.listarEmailsMembros(equipeId)`.
- Produces: `entregaModel.enviar(p)` e `entregaModel.avaliar(p)` (transacionais); `emailModel.enfileirarComAuditoria(itens: NovoEmail[], auditoria: RegistroAuditoria): Promise<number>`; notificações `entrega_aprovada`/`entrega_ajustar` para **todos** os membros ativos com `dados: { tarefa, comentario, equipe_slug }`; `entrega_recebida_admin` com `dados.equipe_slug`; lembrete com teto de 500 caracteres (400 `MENSAGEM_LONGA`).

- [ ] **Step 1: Teste de integração (falha)**

Crie `backend/tests/entregas-auditoria.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { fromSlug } from "../src/utils/slug.js";
import { bearer, criarEquipe, criarUsuario, limpar, login } from "./helpers.js";

// A4: entrega enviada, avaliação e lembrete gravam auditoria na mesma
// transação. B1: a avaliação avisa TODOS os alunos ativos da equipe.
const app = createApp();
const sufixo = `aud${Date.now()}`;
const email = (n: string) => `${n}.${sufixo}@teste.local`;
let admin = { id: "", slug: "" };
let lider = { id: "", slug: "" };
let colega = { id: "", slug: "" };
let equipe = { id: "", slug: "" };
let adminAccess = "";
let mentorAccess = "";
let mentor2Access = "";
let liderAccess = "";
let tarefaSlug = "";
let entregaSlug = "";

beforeAll(async () => {
  admin = await criarUsuario(email("admin"), "admin");
  const mentor = await criarUsuario(email("mentor"), "mentor");
  await criarUsuario(email("mentor2"), "mentor");
  lider = await criarUsuario(email("lider"), "aluno");
  colega = await criarUsuario(email("colega"), "aluno");
  adminAccess = await login(app, email("admin"));
  mentorAccess = await login(app, email("mentor"));
  mentor2Access = await login(app, email("mentor2"));
  liderAccess = await login(app, email("lider"));
  equipe = await criarEquipe({
    nome: `Auditada ${sufixo}`,
    mentorId: mentor.id,
    membros: [{ id: lider.id, papel: "lider" }, { id: colega.id, papel: "integrante" }],
  });
  const t = await request(app)
    .post(`/api/v1/equipes/${equipe.slug}/tarefas`)
    .set(bearer(adminAccess))
    .send({ titulo: "Tarefa auditada", etapa: 1, dataEntrega: "2099-12-31" });
  expect(t.status).toBe(201);
  tarefaSlug = t.body.slug;
});

afterAll(async () => {
  await limpar(sufixo);
  await prisma.$disconnect();
});

const logDe = (entidade: string, id: string) =>
  prisma.log_auditoria.findMany({ where: { entidade, entidade_id: id }, orderBy: { id: "asc" } });

describe("entrega enviada (A4)", () => {
  it("grava entrega_enviada com o título e a versão", async () => {
    const r = await request(app)
      .post(`/api/v1/tarefas/${tarefaSlug}/entregas`)
      .set(bearer(liderAccess))
      .send({ links: ["https://exemplo.dev/entrega"] });
    expect(r.status).toBe(201);
    entregaSlug = r.body.slug;
    const log = await logDe("entrega", fromSlug(entregaSlug)!);
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({
      acao: "entrega_enviada",
      usuario_id: lider.id,
      dados_novos: { tarefa: "Tarefa auditada", versao: 1 },
    });
  });

  it("o aviso aos admins leva o slug da equipe (link do sino)", async () => {
    const aviso = await prisma.emails.findFirst({
      where: { destinatario_id: admin.id, tipo: "entrega_recebida_admin" },
      orderBy: { criado_em: "desc" },
    });
    expect(aviso?.dados_template).toMatchObject({ tarefa: "Tarefa auditada", equipe_slug: equipe.slug });
  });
});

describe("avaliação (A4 + B1)", () => {
  it("outro mentor (403) não avalia nem deixa log", async () => {
    const r = await request(app)
      .post(`/api/v1/entregas/${entregaSlug}/avaliacoes`)
      .set(bearer(mentor2Access))
      .send({ resultado: "aprovada" });
    expect(r.status).toBe(403);
    expect(await logDe("entrega", fromSlug(entregaSlug)!)).toHaveLength(1);
  });

  it("grava entrega_avaliada com o comentário e avisa TODOS os alunos ativos", async () => {
    const r = await request(app)
      .post(`/api/v1/entregas/${entregaSlug}/avaliacoes`)
      .set(bearer(mentorAccess))
      .send({ resultado: "ajustar", comentario: "refazer o áudio" });
    expect(r.status).toBe(201);
    const log = await logDe("entrega", fromSlug(entregaSlug)!);
    expect(log.at(-1)).toMatchObject({
      acao: "entrega_avaliada",
      dados_novos: { tarefa: "Tarefa auditada", resultado: "ajustar", comentario: "refazer o áudio" },
    });
    const avisos = await prisma.emails.findMany({
      where: { tarefa_id: fromSlug(tarefaSlug)!, tipo: "entrega_ajustar" },
      select: { destinatario_id: true, dados_template: true },
    });
    expect(avisos.map((a) => a.destinatario_id).sort()).toEqual([lider.id, colega.id].sort());
    expect(avisos[0]?.dados_template).toMatchObject({ tarefa: "Tarefa auditada", equipe_slug: equipe.slug });
  });
});

describe("lembrete manual (RF-20 + A4)", () => {
  const lembrete = (body: object) =>
    request(app).post(`/api/v1/equipes/${equipe.slug}/lembrete`).set(bearer(mentorAccess)).send(body);
  const logsLembrete = async () =>
    (await logDe("equipe", equipe.id)).filter((l) => l.acao === "lembrete_enviado");

  it("mensagem com mais de 500 caracteres → 400 e sem log", async () => {
    const r = await lembrete({ mensagem: "x".repeat(501) });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("MENSAGEM_LONGA");
    expect(await logsLembrete()).toHaveLength(0);
  });

  it("enfileira para os 2 integrantes e audita a mensagem", async () => {
    const r = await lembrete({ mensagem: "Pitch na sexta" });
    expect(r.status).toBe(201);
    expect(r.body).toEqual({ enfileirados: 2, total: 2 });
    const log = await logsLembrete();
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ dados_novos: { mensagem: "Pitch na sexta", destinatarios: 2 } });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/entregas-auditoria.test.ts`
Expected: FAIL — nenhum log gravado, só o remetente recebe `entrega_ajustar`, `equipe_slug` ausente e o lembrete de 501 caracteres volta 201.

- [ ] **Step 3: Model de entregas transacional**

Em `backend/src/models/entrega.model.ts`:

1. Troque os imports do topo por:

```ts
import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import type { ResultadoAvaliacao } from "../domain/enums.js";
import { registrarAuditoria } from "./auditoria.model.js";
```

2. No `DETALHE_SELECT`, troque o trecho `tarefas: { select: { id: true, equipes: { select: { slug: true, ...` por (acrescenta `titulo` da tarefa e `id` da equipe):

```ts
  tarefas: {
    select: {
      id: true,
      titulo: true,
      equipes: {
        select: {
          id: true,
          slug: true,
          mentor_id: true,
          equipe_membros: {
            where: { ativo: true },
            select: { usuario_id: true },
          },
        },
      },
    },
  },
```

3. Substitua as funções `criarComArquivos` e `criarAvaliacao` (inteiras) por:

```ts
// Entrega (links, v1) + tarefa "entregue" + auditoria numa transação (RNF-05).
export function enviar(p: {
  tarefaId: string;
  tarefaTitulo: string;
  versao: number;
  enviadoPor: string;
  comentario: string | null;
  arquivos: Array<{ url: string; nome: string | null }>;
  ip: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const entrega = await tx.entregas.create({
      data: {
        tarefa_id: p.tarefaId,
        versao: p.versao,
        enviado_por: p.enviadoPor,
        comentario: p.comentario,
        arquivos_entrega: {
          create: p.arquivos.map((a) => ({ tipo: "link", url_externa: a.url, nome_original: a.nome })),
        },
      },
      select: LIST_SELECT,
    });
    await tx.tarefas.update({ where: { id: p.tarefaId }, data: { status: "entregue" } });
    await registrarAuditoria(tx, {
      usuarioId: p.enviadoPor,
      entidade: "entrega",
      entidadeId: entrega.id,
      acao: "entrega_enviada",
      depois: { tarefa: p.tarefaTitulo, versao: p.versao },
      ip: p.ip,
    });
    return entrega;
  });
}

// Avaliação + status da tarefa (RF-15) + auditoria numa transação (RNF-05).
export function avaliar(p: {
  entregaId: string;
  tarefaId: string;
  tarefaTitulo: string;
  avaliadorId: string;
  resultado: ResultadoAvaliacao;
  comentario: string | null;
  ip: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const avaliacao = await tx.avaliacoes_entrega.create({
      data: {
        entrega_id: p.entregaId,
        avaliador_id: p.avaliadorId,
        resultado: p.resultado,
        comentario: p.comentario,
      },
      select: { resultado: true, comentario: true, criado_em: true },
    });
    await tx.tarefas.update({
      where: { id: p.tarefaId },
      data: {
        status: p.resultado,
        concluida_em: p.resultado === "aprovada" ? new Date() : null,
      },
    });
    await registrarAuditoria(tx, {
      usuarioId: p.avaliadorId,
      entidade: "entrega",
      entidadeId: p.entregaId,
      acao: "entrega_avaliada",
      depois: { tarefa: p.tarefaTitulo, resultado: p.resultado, comentario: p.comentario },
      ip: p.ip,
    });
    return avaliacao;
  });
}
```

- [ ] **Step 4: Fila de e-mail com auditoria**

Substitua o conteúdo de `backend/src/models/email.model.ts` até o fim de `enfileirar` (imports + `enfileirar`) por:

```ts
import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import type { TipoEmail } from "../domain/enums.js";
import { registrarAuditoria, type RegistroAuditoria } from "./auditoria.model.js";

export interface NovoEmail {
  tipo: TipoEmail;
  destinatarioId?: string | null;
  destinatarioEmail: string;
  assunto: string;
  template?: string | null;
  dadosTemplate?: Prisma.InputJsonValue;
  equipeId?: string | null;
  tarefaId?: string | null;
}

function linha(data: NovoEmail) {
  return {
    tipo: data.tipo,
    destinatario_id: data.destinatarioId ?? null,
    destinatario_email: data.destinatarioEmail,
    assunto: data.assunto,
    template: data.template ?? null,
    dados_template: data.dadosTemplate,
    equipe_id: data.equipeId ?? null,
    tarefa_id: data.tarefaId ?? null,
  };
}

// Enfileira um e-mail (status='pendente'). O envio real (SMTP/provedor) é feito
// por um worker à parte — Q7 dos requisitos, fora de escopo agora (RNF-06).
export function enfileirar(data: NovoEmail) {
  return prisma.emails.create({ data: linha(data), select: { id: true, status: true } });
}

// Lembrete manual (RF-20): fila + auditoria na MESMA transação — ou tudo, ou
// nada (RNF-05). Devolve quantos e-mails entraram na fila.
export async function enfileirarComAuditoria(
  itens: NovoEmail[],
  auditoria: RegistroAuditoria,
): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const r = await tx.emails.createMany({ data: itens.map(linha) });
    await registrarAuditoria(tx, auditoria);
    return r.count;
  });
}
```

(`enfileirarLote`, `listarPorDestinatario` e `contarPorDestinatario` ficam como estão; `enfileirarLote` continua com `Array<Parameters<typeof enfileirar>[0]>`.)

- [ ] **Step 5: Controller de entregas**

Em `backend/src/controllers/entrega.controller.ts`:

1. Troque os imports de acesso, domínio e models por:

```ts
import {
  idDoChamador,
  ipDoChamador,
  podeGerirEquipe,
  podeVerEquipe,
} from "../utils/acesso.js";
import { RESULTADOS_AVALIACAO, type ResultadoAvaliacao } from "../domain/enums.js";
import * as entregaModel from "../models/entrega.model.js";
import * as tarefaModel from "../models/tarefa.model.js";
import * as usuarioModel from "../models/usuario.model.js";
import * as equipeModel from "../models/equipe.model.js";
import * as emailModel from "../models/email.model.js";
```

2. Em `store`, substitua do comentário `// Colisão de versão por reenvio simultâneo...` até a linha `await tarefaModel.atualizarPorId(tarefaId as string, { status: "entregue" });` (inclusive) por:

```ts
    // Colisão de versão por reenvio simultâneo (P2002) → 409 pelo handler central.
    // Entrega + status "entregue" + auditoria numa transação só (RNF-05).
    const versao = await entregaModel.proximaVersao(tarefaId as string);
    const entrega = await entregaModel.enviar({
      tarefaId: tarefaId as string,
      tarefaTitulo: tarefa.titulo,
      versao,
      enviadoPor: idDoChamador(req),
      comentario: typeof comentario === "string" ? comentario.trim() : null,
      arquivos,
      ip: ipDoChamador(req),
    });
```

e, no aviso aos admins logo abaixo, troque `dadosTemplate: { tarefa: tarefa.titulo, versao },` por `dadosTemplate: { tarefa: tarefa.titulo, versao, equipe_slug: tarefa.equipes.slug },`.

3. Em `avaliar`, substitua do `const avaliacao = await entregaModel.criarAvaliacao({` até o fim do `await emailModel.enfileirarLote([ ... ]);` (inclusive) por:

```ts
    const texto = typeof comentario === "string" ? comentario.trim() : null;
    // Avaliação + status da tarefa (RF-15) + auditoria numa transação (RNF-05).
    const avaliacao = await entregaModel.avaliar({
      entregaId: id as string,
      tarefaId: entrega.tarefas.id,
      tarefaTitulo: entrega.tarefas.titulo,
      avaliadorId: idDoChamador(req),
      resultado: resultado as ResultadoAvaliacao,
      comentario: texto,
      ip: ipDoChamador(req),
    });

    // RF-18/B1: todos os alunos ativos da equipe ficam sabendo (best-effort).
    const equipe = entrega.tarefas.equipes;
    const aprovada = resultado === "aprovada";
    const membros = await equipeModel.listarEmailsMembros(equipe.id).catch(() => []);
    await emailModel.enfileirarLote(
      membros.map((m) => ({
        tipo: aprovada ? "entrega_aprovada" : "entrega_ajustar",
        destinatarioId: m.usuarios.id,
        destinatarioEmail: m.usuarios.email,
        assunto: aprovada ? "Entrega aprovada" : "Ajustes solicitados",
        template: aprovada ? "entrega_aprovada" : "entrega_ajustar",
        dadosTemplate: {
          tarefa: entrega.tarefas.titulo,
          comentario: texto ?? "",
          equipe_slug: equipe.slug,
        },
        equipeId: equipe.id,
        tarefaId: entrega.tarefas.id,
      })),
    );
```

- [ ] **Step 6: Controller do lembrete**

Em `backend/src/controllers/notificacao.controller.ts`, troque o import de acesso por `import { idDoChamador, ipDoChamador, podeGerirEquipe } from "../utils/acesso.js";` e substitua a função `lembrete` inteira (com o comentário) por:

```ts
// Teto da mensagem do lembrete manual — o front usa o mesmo limite.
const LIMITE_MENSAGEM = 500;

// POST /equipes/:slug/lembrete — admin/mentor dispara lembrete manual (RF-20).
// Fila de e-mails + auditoria na mesma transação (RNF-05).
export async function lembrete(req: Request, res: Response, next: NextFunction) {
  try {
    const controle = await equipeModel.findControleBySlug(req.params.slug ?? "");
    if (!controle) throw httpError(404, "EQUIPE_NOT_FOUND", "Equipe não encontrada");
    if (!podeGerirEquipe(req, controle.mentor_id)) {
      throw httpError(403, "FORBIDDEN", "Equipe fora do seu escopo");
    }

    const { assunto, mensagem } = req.body ?? {};
    if (mensagem !== undefined && typeof mensagem !== "string") {
      throw httpError(400, "INVALID_MENSAGEM", "Mensagem inválida");
    }
    const texto = typeof mensagem === "string" ? mensagem.trim() : "";
    if (texto.length > LIMITE_MENSAGEM) {
      throw httpError(400, "MENSAGEM_LONGA", `A mensagem pode ter até ${LIMITE_MENSAGEM} caracteres`);
    }
    const titulo =
      typeof assunto === "string" && assunto.trim()
        ? assunto.trim().slice(0, 255)
        : "Lembrete da equipe InfoHub";

    const membros = await equipeModel.listarEmailsMembros(controle.id);
    const enfileirados = await emailModel.enfileirarComAuditoria(
      membros.map((m) => ({
        tipo: "lembrete_manual",
        destinatarioId: m.usuarios.id,
        destinatarioEmail: m.usuarios.email,
        assunto: titulo,
        template: "lembrete_manual",
        dadosTemplate: { mensagem: texto },
        equipeId: controle.id,
      })),
      {
        usuarioId: idDoChamador(req),
        entidade: "equipe",
        entidadeId: controle.id,
        acao: "lembrete_enviado",
        depois: { mensagem: texto, destinatarios: membros.length },
        ip: ipDoChamador(req),
      },
    );
    res.status(201).json({ enfileirados, total: membros.length });
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 7: Rodar os testes e o typecheck**

Run: `npx vitest run tests/entregas-auditoria.test.ts tests/entregas.test.ts tests/notificacoes.test.ts tests/seed.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/models/entrega.model.ts src/models/email.model.ts src/controllers/entrega.controller.ts src/controllers/notificacao.controller.ts tests/entregas-auditoria.test.ts
git commit -F - <<'EOF'
feat(backend): entrega, avaliação e lembrete auditados; avaliação avisa toda a equipe

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E9TXsEhLzvh1bBR9LeB58C
EOF
```

### Task 4: Redefinição de senha pelo admin + tarefa "em andamento" (A3)

**Files:**
- Modify: `backend/src/utils/convite.ts` (`linkRedefinicao`)
- Modify: `backend/src/models/token.model.ts` (`RECUPERACAO_TTL_HORAS`, `emitirRecuperacao`, `consumirRecuperacao`)
- Modify: `backend/src/models/usuario.model.ts` (`findParaConviteBySlug` traz `ativo`)
- Modify: `backend/src/controllers/usuario.controller.ts` (`gerarRedefinicaoSenha`)
- Modify: `backend/src/controllers/auth.controller.ts` (`abrirConvite` → `abrirTokenSenha`; `redefinirSenha`)
- Modify: `backend/src/models/tarefa.model.ts` (`iniciar`), `backend/src/controllers/tarefa.controller.ts` (`iniciar`)
- Modify: `backend/src/routes.ts`
- Test: `backend/tests/redefinir-senha.test.ts`, `backend/tests/tarefas-iniciar.test.ts` (novos)

**Interfaces:**
- Consumes: `registrarAuditoria` (Task 1), `ipDoChamador` (Task 1), `linkConvite`, `hashTokenSenha`, `compararTokenSenha`, `tokenModel.findConviteById`.
- Produces: `POST /usuarios/:slug/redefinir-senha` → 201 `{ link, expiraEm }`; `POST /auth/redefinir-senha` → 204; `POST /tarefas/:slug/iniciar` → 200 `Tarefa`; `linkRedefinicao(tokenBruto: string): string`; `tokenModel.emitirRecuperacao({ usuarioId, adminId, ip }): Promise<{ tokenBruto: string; expiraEm: Date }>`; `tokenModel.consumirRecuperacao({ tokenId, usuarioId, senhaHash }): Promise<boolean>`; `tarefaModel.iniciar(id: string)` → tarefa (`DETALHE_SELECT`) ou `null`.

- [ ] **Step 1: Testes de integração (falham)**

Crie `backend/tests/redefinir-senha.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { SENHA, bearer, criarUsuario, limpar, login } from "./helpers.js";

// A3/RF-01: o admin gera um link de uso único (24 h); a pessoa define a senha nova.
const app = createApp();
const sufixo = `rs${Date.now()}`;
const email = (n: string) => `${n}.${sufixo}@teste.local`;
let admin = { id: "", slug: "" };
let alvo = { id: "", slug: "" };
let pendente = { id: "", slug: "" };
let adminAccess = "";
let mentorAccess = "";

beforeAll(async () => {
  admin = await criarUsuario(email("admin"), "admin");
  await criarUsuario(email("mentor"), "mentor");
  alvo = await criarUsuario(email("alvo"), "mentor", { nome: "Alvo Silva" });
  pendente = await criarUsuario(email("pend"), "mentor", { ativado: false });
  adminAccess = await login(app, email("admin"));
  mentorAccess = await login(app, email("mentor"));
});

afterAll(async () => {
  await limpar(sufixo);
  await prisma.$disconnect();
});

const gerar = (slug: string, access = adminAccess) =>
  request(app).post(`/api/v1/usuarios/${slug}/redefinir-senha`).set(bearer(access));
const tokenDo = (link: string) => decodeURIComponent(link.split("token=")[1] ?? "");
const redefinir = (token: string, senha: string) =>
  request(app).post("/api/v1/auth/redefinir-senha").send({ token, senha });
async function novoToken(): Promise<string> {
  const r = await gerar(alvo.slug);
  expect(r.status).toBe(201);
  return tokenDo(r.body.link);
}

describe("POST /usuarios/:slug/redefinir-senha (admin)", () => {
  it("201 com link relativo de 24 h e auditoria sem o segredo", async () => {
    const r = await gerar(alvo.slug);
    expect(r.status).toBe(201);
    expect(r.body.link).toMatch(/^\/redefinir-senha\?token=/);
    const horas = (Date.parse(r.body.expiraEm) - Date.now()) / 3_600_000;
    expect(horas).toBeGreaterThan(23.9);
    expect(horas).toBeLessThanOrEqual(24);

    const log = await prisma.log_auditoria.findMany({
      where: { entidade: "usuario", entidade_id: alvo.id, acao: "redefinicao_senha_gerada" },
    });
    expect(log).toHaveLength(1);
    expect(log[0]?.usuario_id).toBe(admin.id);
    const segredo = tokenDo(r.body.link).split(".")[1] ?? "";
    expect(JSON.stringify(log[0]?.dados_novos)).not.toContain(segredo);
  });

  it("mentor não gera (403)", async () => {
    expect((await gerar(alvo.slug, mentorAccess)).status).toBe(403);
  });

  it("conta com convite pendente → 409 CONVITE_PENDENTE", async () => {
    const r = await gerar(pendente.slug);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("CONVITE_PENDENTE");
  });
});

describe("POST /auth/redefinir-senha (pública)", () => {
  it("senha curta → 400 WEAK_PASSWORD", async () => {
    const r = await redefinir(await novoToken(), "curta");
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("WEAK_PASSWORD");
  });

  it("troca a senha, derruba as sessões e o link não serve de novo", async () => {
    const acessoAntigo = await login(app, email("alvo"));
    const token = await novoToken();
    expect((await redefinir(token, "nova-senha-123")).status).toBe(204);

    expect((await request(app).get("/api/v1/auth/me").set(bearer(acessoAntigo))).status).toBe(401);
    const velha = await request(app).post("/api/v1/auth/login").send({ email: email("alvo"), senha: SENHA });
    expect(velha.status).toBe(401);
    await login(app, email("alvo"), "nova-senha-123");

    const reuso = await redefinir(token, "outra-senha-123");
    expect(reuso.status).toBe(400);
    expect(reuso.body.error.code).toBe("RESET_USED");
  });

  it("um link novo invalida o anterior", async () => {
    const primeiro = await novoToken();
    const segundo = await novoToken();
    expect((await redefinir(primeiro, "senha-do-primeiro")).body.error.code).toBe("RESET_USED");
    expect((await redefinir(segundo, "senha-do-segundo")).status).toBe(204);
  });

  it("link expirado → 400 RESET_EXPIRED", async () => {
    const token = await novoToken();
    await prisma.tokens_senha.update({
      where: { id: token.split(".")[0] ?? "" },
      data: { expira_em: new Date(Date.now() - 1000) },
    });
    const r = await redefinir(token, "qualquer-senha-1");
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("RESET_EXPIRED");
  });

  it("token malformado → 400 INVALID_RESET", async () => {
    const r = await redefinir("nao-e-um-token", "qualquer-senha-1");
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("INVALID_RESET");
  });
});
```

Crie `backend/tests/tarefas-iniciar.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { bearer, criarEquipe, criarUsuario, limpar, login } from "./helpers.js";

// A3/RF-12: "Comecei" — o aluno da equipe leva a tarefa de pendente a em_andamento.
const app = createApp();
const sufixo = `ini${Date.now()}`;
const email = (n: string) => `${n}.${sufixo}@teste.local`;
let adminAccess = "";
let mentorAccess = "";
let alunoAccess = "";
let foraAccess = "";
let tarefaSlug = "";

beforeAll(async () => {
  await criarUsuario(email("admin"), "admin");
  const mentor = await criarUsuario(email("mentor"), "mentor");
  const aluno = await criarUsuario(email("aluno"), "aluno");
  await criarUsuario(email("fora"), "aluno");
  adminAccess = await login(app, email("admin"));
  mentorAccess = await login(app, email("mentor"));
  alunoAccess = await login(app, email("aluno"));
  foraAccess = await login(app, email("fora"));
  const equipe = await criarEquipe({
    nome: `Iniciar ${sufixo}`,
    mentorId: mentor.id,
    membros: [{ id: aluno.id, papel: "lider" }],
  });
  const t = await request(app)
    .post(`/api/v1/equipes/${equipe.slug}/tarefas`)
    .set(bearer(adminAccess))
    .send({ titulo: "Tarefa a começar", etapa: 1, dataEntrega: "2099-12-31" });
  expect(t.status).toBe(201);
  tarefaSlug = t.body.slug;
});

afterAll(async () => {
  await limpar(sufixo);
  await prisma.$disconnect();
});

const iniciar = (access: string) =>
  request(app).post(`/api/v1/tarefas/${tarefaSlug}/iniciar`).set(bearer(access));

describe("POST /tarefas/:slug/iniciar", () => {
  it("aluno de fora → 403; mentor → 403 (só aluno)", async () => {
    expect((await iniciar(foraAccess)).status).toBe(403);
    expect((await iniciar(mentorAccess)).status).toBe(403);
  });

  it("aluno da equipe começa a tarefa pendente → em_andamento", async () => {
    const r = await iniciar(alunoAccess);
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("em_andamento");
  });

  it("de novo → 409 TAREFA_NAO_PENDENTE", async () => {
    const r = await iniciar(alunoAccess);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("TAREFA_NAO_PENDENTE");
  });

  it("enviar a entrega continua levando a 'entregue'", async () => {
    const e = await request(app)
      .post(`/api/v1/tarefas/${tarefaSlug}/entregas`)
      .set(bearer(alunoAccess))
      .send({ links: ["https://exemplo.dev/x"] });
    expect(e.status).toBe(201);
    const t = await request(app).get(`/api/v1/tarefas/${tarefaSlug}`).set(bearer(alunoAccess));
    expect(t.body.status).toBe("entregue");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/redefinir-senha.test.ts tests/tarefas-iniciar.test.ts`
Expected: FAIL — as rotas novas respondem 404 `NOT_FOUND` (rota não existe).

- [ ] **Step 3: Link relativo e tokens de recuperação**

No fim de `backend/src/utils/convite.ts`:

```ts
// Link de redefinição de senha (RF-01) gerado pelo admin: SEMPRE relativo; o
// CopiarLink do front completa com a origem da página.
export function linkRedefinicao(tokenBruto: string): string {
  return linkConvite(tokenBruto, "/redefinir-senha");
}
```

Em `backend/src/models/token.model.ts`, acrescente o import `import { registrarAuditoria } from "./auditoria.model.js";` e, no fim do arquivo:

```ts
// --- Redefinição de senha pelo admin (tokens_senha, finalidade='recuperacao') --
// RF-01: link de uso único, 24 h. Um link novo invalida os anteriores; a
// geração é auditada na mesma transação (RNF-05) — sem o segredo no log.
export const RECUPERACAO_TTL_HORAS = 24;

export async function emitirRecuperacao(p: {
  usuarioId: string;
  adminId: string;
  ip: string | null;
}): Promise<{ tokenBruto: string; expiraEm: Date }> {
  const segredo = tokenAleatorio(24);
  const hash = await hashTokenSenha(segredo); // bcrypt é caro: fora da transação
  const expiraEm = new Date(Date.now() + RECUPERACAO_TTL_HORAS * 3_600_000);
  const id = await prisma.$transaction(async (tx) => {
    await tx.tokens_senha.updateMany({
      where: { usuario_id: p.usuarioId, finalidade: "recuperacao", usado_em: null },
      data: { usado_em: new Date() },
    });
    const row = await tx.tokens_senha.create({
      data: { usuario_id: p.usuarioId, token_hash: hash, finalidade: "recuperacao", expira_em: expiraEm },
      select: { id: true },
    });
    await registrarAuditoria(tx, {
      usuarioId: p.adminId,
      entidade: "usuario",
      entidadeId: p.usuarioId,
      acao: "redefinicao_senha_gerada",
      depois: { expiraEm: expiraEm.toISOString() },
      ip: p.ip,
    });
    return row.id;
  });
  return { tokenBruto: `${id}.${segredo}`, expiraEm };
}

// Consome o link: queima o token (UPDATE condicional — dois envios simultâneos
// não trocam a senha duas vezes), grava a senha e derruba as sessões vivas.
// false = o token já tinha sido usado.
export function consumirRecuperacao(p: {
  tokenId: string;
  usuarioId: string;
  senhaHash: string;
}): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const agora = new Date();
    const queimado = await tx.tokens_senha.updateMany({
      where: { id: p.tokenId, usado_em: null },
      data: { usado_em: agora },
    });
    if (queimado.count === 0) return false;
    await tx.usuarios.update({ where: { id: p.usuarioId }, data: { senha: p.senhaHash } });
    await tx.tokens_acesso.updateMany({
      where: { usuario_id: p.usuarioId, revogado_em: null },
      data: { revogado_em: agora, motivo_revogacao: "troca_senha" },
    });
    return true;
  });
}
```

Em `backend/src/models/usuario.model.ts`, na `findParaConviteBySlug`, troque o `select` por `select: { id: true, nome: true, email: true, ativo: true, convite_aceito_em: true },`.

- [ ] **Step 4: Controllers de usuário e de auth**

Em `backend/src/controllers/usuario.controller.ts`, troque a linha `import { linkConvite } from "../utils/convite.js";` por:

```ts
import { linkConvite, linkRedefinicao } from "../utils/convite.js";
import { idDoChamador, ipDoChamador } from "../utils/acesso.js";
```

e acrescente no fim do arquivo:

```ts
// POST /usuarios/:slug/redefinir-senha — admin gera o link de uso único (24 h)
// para a pessoa definir outra senha (RF-01). Sem e-mail configurado, o admin
// copia o link. Só para conta ativa que já aceitou o convite.
export async function gerarRedefinicaoSenha(req: Request, res: Response, next: NextFunction) {
  try {
    const alvo = await usuarioModel.findParaConviteBySlug(req.params.slug ?? "");
    if (!alvo) throw httpError(404, "USUARIO_NOT_FOUND", "Usuário não encontrado");
    if (!alvo.ativo) {
      throw httpError(409, "CONTA_INATIVA", "Conta inativa: ative a conta antes de redefinir a senha");
    }
    if (!alvo.convite_aceito_em) {
      throw httpError(
        409,
        "CONVITE_PENDENTE",
        "A pessoa ainda não aceitou o convite: gere um novo link de convite",
      );
    }
    const r = await tokenModel.emitirRecuperacao({
      usuarioId: alvo.id,
      adminId: idDoChamador(req),
      ip: ipDoChamador(req),
    });
    res.status(201).json({ link: linkRedefinicao(r.tokenBruto), expiraEm: r.expiraEm.toISOString() });
  } catch (err) {
    next(err);
  }
}
```

Em `backend/src/controllers/auth.controller.ts`:

1. Acrescente o import `import type { FinalidadeToken } from "../domain/enums.js";`.
2. Substitua a função `abrirConvite` inteira (com o comentário acima dela) por:

```ts
// Mensagens por finalidade: o mesmo formato "<id>.<segredo>" serve ao convite
// (RF-03) e ao link de redefinição gerado pelo admin (RF-01).
const ERROS_TOKEN: Record<
  FinalidadeToken,
  Record<"invalido" | "usado" | "expirado", [string, string]>
> = {
  convite: {
    invalido: ["INVALID_INVITE", "Convite inválido"],
    usado: ["INVITE_USED", "Convite já utilizado"],
    expirado: ["INVITE_EXPIRED", "Convite expirado"],
  },
  recuperacao: {
    invalido: ["INVALID_RESET", "Link de redefinição inválido"],
    usado: ["RESET_USED", "Este link já foi usado"],
    expirado: ["RESET_EXPIRED", "Link expirado: peça um novo à coordenação"],
  },
};

// Valida um token "<id>.<segredo>" de tokens_senha da finalidade pedida e
// devolve a linha, ou lança httpError 400 com o código daquela finalidade.
async function abrirTokenSenha(
  token: unknown,
  finalidade: FinalidadeToken,
): Promise<{ id: string; usuario_id: string }> {
  const erro = (k: "invalido" | "usado" | "expirado") => {
    const [codigo, mensagem] = ERROS_TOKEN[finalidade][k];
    return httpError(400, codigo, mensagem);
  };
  if (typeof token !== "string" || token.length === 0) throw erro("invalido");
  const ponto = token.indexOf(".");
  const tokenId = ponto > 0 ? token.slice(0, ponto) : "";
  const segredo = ponto > 0 ? token.slice(ponto + 1) : "";
  if (!tokenId || !segredo || !isUuid(tokenId)) throw erro("invalido");

  const linha = await tokenModel.findConviteById(tokenId);
  if (!linha || linha.finalidade !== finalidade) throw erro("invalido");
  if (linha.usado_em) throw erro("usado");
  if (linha.expira_em <= new Date()) throw erro("expirado");
  if (!(await compararTokenSenha(segredo, linha.token_hash))) throw erro("invalido");
  return { id: linha.id, usuario_id: linha.usuario_id };
}
```

3. Troque as duas chamadas `await abrirConvite(req.query.token)` e `await abrirConvite(token)` por `await abrirTokenSenha(req.query.token, "convite")` e `await abrirTokenSenha(token, "convite")`.
4. No fim do arquivo:

```ts
// POST /auth/redefinir-senha — pública (rate-limited). Consome o link gerado
// pelo admin (RF-01): troca a senha e derruba as sessões vivas.
export async function redefinirSenha(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, senha } = req.body ?? {};
    if (typeof senha !== "string" || senha.length < 8) {
      throw httpError(400, "WEAK_PASSWORD", "Senha deve ter ao menos 8 caracteres");
    }
    const linha = await abrirTokenSenha(token, "recuperacao");
    const ok = await tokenModel.consumirRecuperacao({
      tokenId: linha.id,
      usuarioId: linha.usuario_id,
      senhaHash: await hashSenha(senha),
    });
    if (!ok) throw httpError(400, "RESET_USED", "Este link já foi usado");
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 5: `iniciar` no model e no controller de tarefas**

No fim de `backend/src/models/tarefa.model.ts`:

```ts
// RF-12: pendente → em_andamento. UPDATE condicional: só vale se ainda está
// pendente (dois cliques simultâneos não "começam" duas vezes). null = não estava.
export async function iniciar(id: string) {
  const r = await prisma.tarefas.updateMany({
    where: { id, status: "pendente" },
    data: { status: "em_andamento" },
  });
  return r.count === 0 ? null : findById(id);
}
```

No fim de `backend/src/controllers/tarefa.controller.ts`:

```ts
// POST /tarefas/:slug/iniciar — o aluno da equipe marca "Comecei" (RF-12).
// Enviar a entrega continua levando a "entregue".
export async function iniciar(req: Request, res: Response, next: NextFunction) {
  try {
    const id = fromSlug(req.params.slug ?? "");
    const tarefa = id ? await tarefaModel.findById(id) : null;
    if (!tarefa) throw httpError(404, "TAREFA_NOT_FOUND", "Tarefa não encontrada");
    const membros = tarefa.equipes.equipe_membros.map((m) => m.usuario_id);
    if (!membros.includes(idDoChamador(req))) {
      throw httpError(403, "NOT_TEAM_MEMBER", "Você não participa desta equipe");
    }
    const iniciada = await tarefaModel.iniciar(tarefa.id);
    if (!iniciada) {
      throw httpError(409, "TAREFA_NAO_PENDENTE", "Só dá para começar uma tarefa pendente");
    }
    res.json(mapTarefa(iniciada));
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 6: Rotas**

Em `backend/src/routes.ts`:
- depois de `routes.post("/auth/senha", auth, authLimiter, authCtrl.trocarSenha);`: `routes.post("/auth/redefinir-senha", authLimiter, authCtrl.redefinirSenha);`
- depois de `routes.patch("/usuarios/:slug", auth, role("admin"), usuarioCtrl.update);`: `routes.post("/usuarios/:slug/redefinir-senha", auth, role("admin"), usuarioCtrl.gerarRedefinicaoSenha);`
- depois de `routes.patch("/tarefas/:slug", auth, role("admin", "mentor"), tarefaCtrl.update);`: `routes.post("/tarefas/:slug/iniciar", auth, role("aluno"), tarefaCtrl.iniciar);`

- [ ] **Step 7: Rodar os testes e o typecheck**

Run: `npx vitest run tests/redefinir-senha.test.ts tests/tarefas-iniciar.test.ts tests/auth.test.ts tests/convites.test.ts tests/rn03-convites.test.ts && npm run typecheck`
Expected: PASS (os fluxos de convite continuam com `INVALID_INVITE`/`INVITE_USED`/`INVITE_EXPIRED`).

- [ ] **Step 8: Commit**

```bash
git add src/utils/convite.ts src/models/token.model.ts src/models/usuario.model.ts src/controllers/usuario.controller.ts src/controllers/auth.controller.ts src/models/tarefa.model.ts src/controllers/tarefa.controller.ts src/routes.ts tests/redefinir-senha.test.ts tests/tarefas-iniciar.test.ts
git commit -F - <<'EOF'
feat(backend): redefinição de senha pelo admin e tarefa em andamento

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E9TXsEhLzvh1bBR9LeB58C
EOF
```

### Task 5: Linha do tempo da equipe (A5)

**Files:**
- Create: `backend/src/domain/linhaDoTempo.ts`
- Modify: `backend/src/models/equipe.model.ts` (`eventosLinhaDoTempo`)
- Modify: `backend/src/controllers/equipe.controller.ts` (`linhaDoTempo`)
- Modify: `backend/src/routes.ts`
- Test: `backend/tests/linha-do-tempo.unit.test.ts`, `backend/tests/linha-do-tempo.test.ts` (novos)

**Interfaces:**
- Consumes: logs gravados nas Tasks 1–3 (`status_alterado`, `mentor_atribuido`, `entrega_enviada`, `entrega_avaliada`, `lembrete_enviado`); `historico_etapas`; `podeVerEquipe`.
- Produces: `GET /equipes/:slug/linha-do-tempo` → `{ data: ItemLinhaDoTempo[] }`; `montarLinhaDoTempo({ movimentos, auditoria, paraAluno, limite? })`; `LIMITE_LINHA_DO_TEMPO = 50`; `equipeModel.eventosLinhaDoTempo(equipeId, limite)`.

- [ ] **Step 1: Teste unitário da montagem (falha)**

Crie `backend/tests/linha-do-tempo.unit.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { montarLinhaDoTempo, type EventoAuditoria, type MovimentoEtapa } from "../src/domain/linhaDoTempo.js";

const d = (iso: string) => new Date(iso);
const forcado: MovimentoEtapa = {
  de: 2, para: 4, forcado: true, observacao: "combinado com a banca", autor: "Ana Mentora", em: d("2026-09-10T10:00:00Z"),
};
const pronta: MovimentoEtapa = {
  de: 6, para: "pronta", forcado: false, observacao: "tudo certo", autor: null, em: d("2026-09-12T10:00:00Z"),
};
const eventos: EventoAuditoria[] = [
  { acao: "entrega_avaliada", antes: null, depois: { tarefa: "BMC", resultado: "ajustar", comentario: "refazer" }, autor: "Ana Mentora", em: d("2026-09-11T10:00:00Z") },
  { acao: "status_alterado", antes: { status: "ativa" }, depois: { status: "pausada" }, autor: "Coord", em: d("2026-09-09T10:00:00Z") },
  { acao: "etapa_movida", antes: null, depois: null, autor: "Ana Mentora", em: d("2026-09-10T10:00:00Z") },
  { acao: "entrega_enviada", antes: null, depois: { tarefa: "BMC", versao: 2 }, autor: "Lia", em: d("2026-09-08T10:00:00Z") },
  { acao: "mentor_atribuido", antes: { mentor: null }, depois: { mentor: "Ana Mentora" }, autor: "Coord", em: d("2026-09-07T10:00:00Z") },
  { acao: "lembrete_enviado", antes: null, depois: { mensagem: "Pitch na sexta", destinatarios: 3 }, autor: "Coord", em: d("2026-09-06T10:00:00Z") },
];

describe("montarLinhaDoTempo (A5)", () => {
  it("junta histórico e auditoria do mais novo para o mais antigo, sem duplicar o movimento", () => {
    const itens = montarLinhaDoTempo({ movimentos: [forcado, pronta], auditoria: eventos, paraAluno: false });
    expect(itens.map((i) => i.titulo)).toEqual([
      "Etapa 6 → Pronta p/ InovAMF",
      "Ajustes pedidos: BMC",
      "Etapa 2 → Etapa 4 (forçado)",
      "Status: Ativa → Pausada",
      "Entrega enviada: BMC (v2)",
      "Mentor: Ana Mentora",
      "Lembrete enviado à equipe",
    ]);
    expect(itens[1]).toMatchObject({ tipo: "avaliacao", detalhe: "refazer", autor: "Ana Mentora" });
    expect(itens[2]).toMatchObject({ tipo: "etapa", detalhe: "combinado com a banca" });
  });

  it("para o aluno, esconde só a observação de movimento forçado", () => {
    const itens = montarLinhaDoTempo({ movimentos: [forcado, pronta], auditoria: [], paraAluno: true });
    expect(itens[0]?.detalhe).toBe("tudo certo");
    expect(itens[1]?.detalhe).toBeUndefined();
  });

  it("respeita o limite", () => {
    expect(montarLinhaDoTempo({ movimentos: [forcado, pronta], auditoria: eventos, paraAluno: false, limite: 3 })).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Teste de integração do endpoint (falha)**

Crie `backend/tests/linha-do-tempo.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { bearer, criarEquipe, criarUsuario, limpar, login } from "./helpers.js";

// A5: GET /equipes/:slug/linha-do-tempo — escopo por papel, sem UUID, e o
// aluno não vê a observação de movimento forçado.
const app = createApp();
const sufixo = `ldt${Date.now()}`;
const email = (n: string) => `${n}.${sufixo}@teste.local`;
const OBS = "combinado com a banca";
let adminAccess = "";
let mentor2Access = "";
let alunoAccess = "";
let foraAccess = "";
let equipe = { id: "", slug: "" };

beforeAll(async () => {
  await criarUsuario(email("admin"), "admin");
  const mentor = await criarUsuario(email("mentor"), "mentor", { nome: "Ana Mentora" });
  await criarUsuario(email("mentor2"), "mentor");
  const aluno = await criarUsuario(email("aluno"), "aluno", { nome: "Lia Líder" });
  await criarUsuario(email("fora"), "aluno");
  adminAccess = await login(app, email("admin"));
  const mentorAccess = await login(app, email("mentor"));
  mentor2Access = await login(app, email("mentor2"));
  alunoAccess = await login(app, email("aluno"));
  foraAccess = await login(app, email("fora"));
  equipe = await criarEquipe({
    nome: `Linha ${sufixo}`,
    mentorId: mentor.id,
    etapa: 2,
    membros: [{ id: aluno.id, papel: "lider" }],
  });

  const t = await request(app)
    .post(`/api/v1/equipes/${equipe.slug}/tarefas`)
    .set(bearer(adminAccess))
    .send({ titulo: "Tarefa da linha", etapa: 2, dataEntrega: "2099-12-31" });
  const e = await request(app)
    .post(`/api/v1/tarefas/${t.body.slug}/entregas`)
    .set(bearer(alunoAccess))
    .send({ links: ["https://exemplo.dev/linha"] });
  await request(app)
    .post(`/api/v1/entregas/${e.body.slug}/avaliacoes`)
    .set(bearer(mentorAccess))
    .send({ resultado: "aprovada", comentario: "ótimo" });
  await request(app)
    .post(`/api/v1/equipes/${equipe.slug}/etapa`)
    .set(bearer(mentorAccess))
    .send({ etapa: 4, forcado: true, observacao: OBS });
  await request(app).patch(`/api/v1/equipes/${equipe.slug}`).set(bearer(adminAccess)).send({ status: "pausada" });
  await request(app)
    .post(`/api/v1/equipes/${equipe.slug}/lembrete`)
    .set(bearer(mentorAccess))
    .send({ mensagem: "Reunião sexta" });
});

afterAll(async () => {
  await limpar(sufixo);
  await prisma.$disconnect();
});

const linha = (access: string) =>
  request(app).get(`/api/v1/equipes/${equipe.slug}/linha-do-tempo`).set(bearer(access));

describe("GET /equipes/:slug/linha-do-tempo", () => {
  it("admin vê tudo, do mais novo para o mais antigo, sem UUID", async () => {
    const r = await linha(adminAccess);
    expect(r.status).toBe(200);
    const itens = r.body.data as Array<{ tipo: string; titulo: string; detalhe?: string; em: string }>;
    expect(itens.map((i) => i.tipo).sort()).toEqual(["avaliacao", "entrega", "etapa", "lembrete", "status"]);
    const datas = itens.map((i) => i.em);
    expect([...datas].sort().reverse()).toEqual(datas);
    expect(itens.find((i) => i.tipo === "etapa")?.detalhe).toBe(OBS);
    expect(itens.find((i) => i.tipo === "avaliacao")).toMatchObject({ titulo: "Entrega aprovada: Tarefa da linha", detalhe: "ótimo", autor: "Ana Mentora" });
    expect(JSON.stringify(r.body)).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-/i);
  });

  it("aluno da equipe vê a linha sem a observação do movimento forçado", async () => {
    const r = await linha(alunoAccess);
    expect(r.status).toBe(200);
    const itens = r.body.data as Array<{ tipo: string; detalhe?: string }>;
    expect(itens.find((i) => i.tipo === "etapa")?.detalhe).toBeUndefined();
    expect(JSON.stringify(r.body)).not.toContain(OBS);
    expect(itens.find((i) => i.tipo === "avaliacao")?.detalhe).toBe("ótimo");
  });

  it("mentor de outra equipe e aluno de fora → 403", async () => {
    expect((await linha(mentor2Access)).status).toBe(403);
    expect((await linha(foraAccess)).status).toBe(403);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run tests/linha-do-tempo.unit.test.ts tests/linha-do-tempo.test.ts`
Expected: FAIL — módulo `src/domain/linhaDoTempo.js` não existe; o endpoint responde 404.

- [ ] **Step 4: Domínio puro da linha do tempo**

Crie `backend/src/domain/linhaDoTempo.ts`:

```ts
// A5/RF-08: linha do tempo da equipe — histórico de etapas + log de auditoria
// (equipe, tarefas e entregas dela) numa lista só, do mais novo para o mais
// antigo, sem UUID. Regra PURA: o model busca, o controller aplica o escopo.
// O movimento de etapa vem de historico_etapas (tem de/para/forçado); o log
// "etapa_movida" existe para a auditoria (RNF-05) e é ignorado aqui para não
// duplicar. Anotações internas nunca entram (não são auditadas).

export type TipoItem = "etapa" | "status" | "mentor" | "entrega" | "avaliacao" | "lembrete";

export interface ItemLinhaDoTempo {
  tipo: TipoItem;
  titulo: string;
  detalhe?: string;
  autor?: string;
  em: Date;
}

export interface MovimentoEtapa {
  de: number | "pronta" | null;
  para: number | "pronta";
  forcado: boolean;
  observacao: string | null;
  autor: string | null;
  em: Date;
}

export interface EventoAuditoria {
  acao: string;
  antes: unknown;
  depois: unknown;
  autor: string | null;
  em: Date;
}

export const LIMITE_LINHA_DO_TEMPO = 50;

const STATUS_LABEL: Record<string, string> = {
  ativa: "Ativa",
  pronta_inovamf: "Pronta p/ InovAMF",
  encaminhada_inovamf: "Encaminhada ao InovAMF",
  pausada: "Pausada",
  desistente: "Desistente",
};

const posicao = (p: number | "pronta") => (p === "pronta" ? "Pronta p/ InovAMF" : `Etapa ${p}`);

// Lê um campo texto/número de um JSON de auditoria (antes/depois).
function campo(o: unknown, chave: string): string | undefined {
  if (typeof o !== "object" || o === null) return undefined;
  const v = (o as Record<string, unknown>)[chave];
  return typeof v === "string" || typeof v === "number" ? String(v) : undefined;
}

function doMovimento(m: MovimentoEtapa, paraAluno: boolean): ItemLinhaDoTempo {
  const origem = m.de !== null ? `${posicao(m.de)} → ` : "";
  const esconder = paraAluno && m.forcado; // observação de forçado é interna
  return {
    tipo: "etapa",
    titulo: `${origem}${posicao(m.para)}${m.forcado ? " (forçado)" : ""}`,
    detalhe: !esconder && m.observacao ? m.observacao : undefined,
    autor: m.autor ?? undefined,
    em: m.em,
  };
}

function daAuditoria(e: EventoAuditoria): ItemLinhaDoTempo | null {
  const base = { autor: e.autor ?? undefined, em: e.em };
  const tarefa = campo(e.depois, "tarefa") ?? "tarefa";
  switch (e.acao) {
    case "status_alterado": {
      const de = campo(e.antes, "status") ?? "";
      const para = campo(e.depois, "status") ?? "";
      return { tipo: "status", titulo: `Status: ${STATUS_LABEL[de] ?? de} → ${STATUS_LABEL[para] ?? para}`, ...base };
    }
    case "mentor_atribuido":
      return { tipo: "mentor", titulo: `Mentor: ${campo(e.depois, "mentor") ?? "sem mentor"}`, ...base };
    case "entrega_enviada": {
      const versao = campo(e.depois, "versao");
      return { tipo: "entrega", titulo: `Entrega enviada: ${tarefa}${versao ? ` (v${versao})` : ""}`, ...base };
    }
    case "entrega_avaliada": {
      const aprovada = campo(e.depois, "resultado") === "aprovada";
      return {
        tipo: "avaliacao",
        titulo: aprovada ? `Entrega aprovada: ${tarefa}` : `Ajustes pedidos: ${tarefa}`,
        detalhe: campo(e.depois, "comentario") || undefined,
        ...base,
      };
    }
    case "lembrete_enviado":
      return {
        tipo: "lembrete",
        titulo: "Lembrete enviado à equipe",
        detalhe: campo(e.depois, "mensagem") || undefined,
        ...base,
      };
    default:
      return null; // etapa_movida (vem do histórico) e ações que não são da equipe
  }
}

export function montarLinhaDoTempo(i: {
  movimentos: MovimentoEtapa[];
  auditoria: EventoAuditoria[];
  paraAluno: boolean;
  limite?: number;
}): ItemLinhaDoTempo[] {
  const itens = [
    ...i.movimentos.map((m) => doMovimento(m, i.paraAluno)),
    ...i.auditoria.map(daAuditoria).filter((x): x is ItemLinhaDoTempo => x !== null),
  ];
  itens.sort((a, b) => b.em.getTime() - a.em.getTime());
  return itens.slice(0, i.limite ?? LIMITE_LINHA_DO_TEMPO);
}
```

- [ ] **Step 5: Model — buscar os eventos da equipe**

No fim de `backend/src/models/equipe.model.ts`:

```ts
// A5: o que a linha do tempo junta — histórico de etapas e auditoria da
// equipe, das tarefas dela e das entregas dessas tarefas. Só leitura.
export async function eventosLinhaDoTempo(equipeId: string, limite: number) {
  const tarefas = await prisma.tarefas.findMany({
    where: { equipe_id: equipeId },
    select: { id: true, entregas: { select: { id: true } } },
  });
  const tarefaIds = tarefas.map((t) => t.id);
  const entregaIds = tarefas.flatMap((t) => t.entregas.map((e) => e.id));
  const [historico, auditoria] = await Promise.all([
    prisma.historico_etapas.findMany({
      where: { equipe_id: equipeId },
      orderBy: { criado_em: "desc" },
      take: limite,
      select: {
        forcado: true,
        observacao: true,
        status_origem: true,
        status_destino: true,
        criado_em: true,
        etapas_historico_etapas_etapa_origem_idToetapas: { select: { numero: true } },
        etapas_historico_etapas_etapa_destino_idToetapas: { select: { numero: true } },
        usuarios: { select: { nome: true } },
      },
    }),
    prisma.log_auditoria.findMany({
      where: {
        acao: { not: "etapa_movida" },
        OR: [
          { entidade: "equipe", entidade_id: equipeId },
          { entidade: "tarefa", entidade_id: { in: tarefaIds } },
          { entidade: "entrega", entidade_id: { in: entregaIds } },
        ],
      },
      orderBy: { criado_em: "desc" },
      take: limite,
      select: {
        acao: true,
        dados_anteriores: true,
        dados_novos: true,
        criado_em: true,
        usuarios: { select: { nome: true } },
      },
    }),
  ]);
  return { historico, auditoria };
}
```

- [ ] **Step 6: Controller e rota**

Em `backend/src/controllers/equipe.controller.ts`:
- troque o import de acesso (o da Task 1) por `import { escopoDo, idDoChamador, ipDoChamador, podeGerirEquipe, podeVerEquipe } from "../utils/acesso.js";`;
- acrescente `import { LIMITE_LINHA_DO_TEMPO, montarLinhaDoTempo } from "../domain/linhaDoTempo.js";`;
- acrescente no fim do arquivo:

```ts
// GET /equipes/:slug/linha-do-tempo — A5 (RF-08, RNF-05 visível). Admin vê
// tudo; mentor só as próprias equipes; aluno a própria, sem a observação de
// movimento forçado. Nunca devolve UUID.
export async function linhaDoTempo(req: Request, res: Response, next: NextFunction) {
  try {
    const controle = await equipeModel.findControleBySlug(req.params.slug ?? "");
    if (!controle) throw httpError(404, "EQUIPE_NOT_FOUND", "Equipe não encontrada");
    const membros = controle.equipe_membros.map((m) => m.usuario_id);
    if (!podeVerEquipe(req, controle.mentor_id, membros)) {
      throw httpError(403, "FORBIDDEN", "Equipe fora do seu escopo");
    }

    const { historico, auditoria } = await equipeModel.eventosLinhaDoTempo(
      controle.id,
      LIMITE_LINHA_DO_TEMPO,
    );
    const data = montarLinhaDoTempo({
      paraAluno: req.auth.role === "aluno",
      movimentos: historico.map((h) => ({
        de:
          h.status_origem === "pronta_inovamf"
            ? "pronta"
            : (h.etapas_historico_etapas_etapa_origem_idToetapas?.numero ?? null),
        para:
          h.status_destino === "pronta_inovamf"
            ? "pronta"
            : h.etapas_historico_etapas_etapa_destino_idToetapas.numero,
        forcado: h.forcado,
        observacao: h.observacao,
        autor: h.usuarios?.nome ?? null,
        em: h.criado_em,
      })),
      auditoria: auditoria.map((a) => ({
        acao: a.acao,
        antes: a.dados_anteriores,
        depois: a.dados_novos,
        autor: a.usuarios?.nome ?? null,
        em: a.criado_em,
      })),
    });
    res.json({ data });
  } catch (err) {
    next(err);
  }
}
```

Em `backend/src/routes.ts`, depois de `routes.get("/equipes/:slug", auth, equipeCtrl.show);`, acrescente:

```ts
routes.get("/equipes/:slug/linha-do-tempo", auth, equipeCtrl.linhaDoTempo);
```

- [ ] **Step 7: Rodar os testes e o typecheck**

Run: `npx vitest run tests/linha-do-tempo.unit.test.ts tests/linha-do-tempo.test.ts tests/equipes-detalhe.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/domain/linhaDoTempo.ts src/models/equipe.model.ts src/controllers/equipe.controller.ts src/routes.ts tests/linha-do-tempo.unit.test.ts tests/linha-do-tempo.test.ts
git commit -F - <<'EOF'
feat(backend): linha do tempo da equipe a partir do histórico e da auditoria

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E9TXsEhLzvh1bBR9LeB58C
EOF
```

### Task 6: Notificações realistas no seed de demo (B1)

**Files:**
- Modify: `backend/src/seed/demo.ts`
- Test: `backend/tests/seed.test.ts`

**Interfaces:**
- Consumes: `ADMIN_EMAIL`, `MODELOS_TAREFA` (`seed/base.ts`); `TipoEmail` (`domain/enums.ts`); formato de `dados` do sino (`equipe_slug`, `tarefa`, `titulo`, `mensagem`).
- Produces: 3–4 linhas em `emails` (status `cancelado`) para `admin@infohub.dev`, `mentor1@demo.infohub.dev` e os líderes `bruna.lopes`, `pedro.souza`, `mariana.alves` — criadas na mesma transação do `seedDemo` (que só roda uma vez: idempotente); todas com `equipe_id` de equipe demo (o `purgeDemo` já apaga).

- [ ] **Step 1: Teste (falha)**

Em `backend/tests/seed.test.ts`, dentro do `describe("seedDemo — cenário obrigatório do G1", ...)`, logo depois do `it("todo aluno seedado tem curso na lista fechada...")`, acrescente:

```ts
  it("B1: cada perfil de demo tem 3–4 notificações realistas, todas canceladas", async () => {
    for (const u of ["mentor1", "bruna.lopes", "pedro.souza", "mariana.alves"]) {
      const n = await prisma.emails.count({
        where: { destinatario_email: `${u}${DEMO_DOMINIO}`, status: "cancelado" },
      });
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(4);
    }
    const doAdmin = await prisma.emails.count({
      where: {
        destinatario_email: ADMIN_EMAIL,
        status: "cancelado",
        equipes: { nome_ideia: { in: ["EcoRota", "SaúdeJá", "Aprende+"] } },
      },
    });
    expect(doAdmin).toBe(4);
    // nada do seed fica na fila de envio
    expect(
      await prisma.emails.count({
        where: { destinatario_email: { endsWith: DEMO_DOMINIO }, status: { not: "cancelado" } },
      }),
    ).toBe(0);

    const access = await entrar(`bruna.lopes${DEMO_DOMINIO}`, SENHAS_DEMO.aluno);
    const inbox = await request(app).get("/api/v1/notificacoes").set(bearer(access));
    expect(inbox.body.data.length).toBeGreaterThanOrEqual(3);
    expect(inbox.body.data[0].dados.equipe_slug).toBeTruthy();
  });
```

E, no `describe("purgeDemo", ...)`, no fim do `it(...)`, acrescente:

```ts
    expect(await prisma.emails.count({ where: { destinatario_email: ADMIN_EMAIL, status: "cancelado" } })).toBe(0);
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/seed.test.ts`
Expected: FAIL — `expected 0 to be greater than or equal to 3`.

- [ ] **Step 3: Implementar no `seedDemo`**

Em `backend/src/seed/demo.ts`:

1. Troque os imports por:

```ts
import type { Prisma, PrismaClient } from "@prisma/client";
import { hashSenha, hashTokenSenha, tokenAleatorio } from "../utils/hash.js";
import { newId, novoIdComSlug } from "../utils/slug.js";
import { hojeISO } from "../domain/atraso.js";
import type { TipoEmail } from "../domain/enums.js";
import { ADMIN_EMAIL, CICLO_ATUAL, MODELOS_TAREFA } from "./base.js";
```

2. Logo antes de `await db.$transaction(`, acrescente:

```ts
  const admin = await db.usuarios.findUnique({ where: { email: ADMIN_EMAIL }, select: { id: true } });
```

3. Dentro da transação, logo antes de `const mentorIds: string[] = [];`, acrescente:

```ts
      // B1: notificações realistas para o sino já ter o que mostrar na demo
      // (3–4 por perfil usado ao vivo: admin, mentor1 e os líderes). Status
      // "cancelado" = nunca saem por e-mail. Plano 4: o worker também deve
      // ignorar destinatários DEMO_DOMINIO. O purge apaga (equipe demo).
      const notificacoes: Prisma.emailsCreateManyInput[] = [];
      const notificar = (n: {
        tipo: TipoEmail;
        para: { id: string; email: string };
        assunto: string;
        dados: Prisma.InputJsonValue;
        equipeId: string;
        horas: number;
      }) => {
        const em = horasAtras(n.horas);
        notificacoes.push({
          tipo: n.tipo,
          destinatario_id: n.para.id,
          destinatario_email: n.para.email,
          assunto: n.assunto,
          template: n.tipo,
          dados_template: n.dados,
          equipe_id: n.equipeId,
          status: "cancelado",
          agendado_para: em,
          criado_em: em,
        });
      };
```

4. No fim do corpo do `for (const e of EQUIPES) { ... }` (depois do bloco `if (e.chave === "B") { await criarTarefa(...) }` da Etapa 2), acrescente:

```ts
        // B1 — o que cada perfil encontra no sino (ver `notificar` acima).
        const lider = { id: liderId, email: email(e.lider) };
        const mentor = { id: mentorId, email: email(MENTORES[e.mentor]!) };
        const sobre = { equipe: e.nome, equipe_slug: equipe.slug };
        if (admin) {
          notificar({
            tipo: "novo_cadastro_admin", para: { id: admin.id, email: ADMIN_EMAIL },
            assunto: "Novo cadastro no InfoHub", dados: { ...sobre, lider: e.lider.nome },
            equipeId: equipe.id, horas: 24 * 12,
          });
        }
        if (e.chave === "A") {
          notificar({
            tipo: "entrega_aprovada", para: lider, assunto: "Entrega aprovada",
            dados: { ...sobre, tarefa: e1.titulo, comentario: "Ideia clara, podem seguir." },
            equipeId: equipe.id, horas: 180,
          });
          notificar({
            tipo: "nova_tarefa", para: lider, assunto: "Nova tarefa atribuída",
            dados: { ...sobre, titulo: e2.titulo }, equipeId: equipe.id, horas: 24 * 7,
          });
          notificar({
            tipo: "lembrete_manual", para: lider, assunto: "Lembrete da equipe InfoHub",
            dados: { ...sobre, mensagem: "Encontro com a mentora na quinta, 19h, sala 204." },
            equipeId: equipe.id, horas: 30,
          });
          notificar({
            tipo: "boas_vindas", para: mentor, assunto: "Boas-vindas ao InfoHub",
            dados: sobre, equipeId: equipe.id, horas: 24 * 12,
          });
          notificar({
            tipo: "entrega_recebida_admin", para: mentor, assunto: "Nova entrega recebida",
            dados: { ...sobre, tarefa: e2.titulo, versao: 1 }, equipeId: equipe.id, horas: 20,
          });
          if (admin) {
            notificar({
              tipo: "entrega_recebida_admin", para: { id: admin.id, email: ADMIN_EMAIL },
              assunto: "Nova entrega recebida", dados: { ...sobre, tarefa: e2.titulo, versao: 1 },
              equipeId: equipe.id, horas: 20,
            });
          }
        }
        if (e.chave === "B") {
          notificar({
            tipo: "entrega_aprovada", para: lider, assunto: "Entrega aprovada",
            dados: { ...sobre, tarefa: e1.titulo, comentario: "Ideia clara, podem seguir." },
            equipeId: equipe.id, horas: 180,
          });
          notificar({
            tipo: "nova_tarefa", para: lider, assunto: "Nova tarefa atribuída",
            dados: { ...sobre, titulo: e2.titulo }, equipeId: equipe.id, horas: 24 * 7,
          });
          notificar({
            tipo: "lembrete_manual", para: lider, assunto: "Lembrete da equipe InfoHub",
            dados: { ...sobre, mensagem: "A confirmação do primeiro encontro venceu — enviem ainda hoje." },
            equipeId: equipe.id, horas: 20,
          });
          notificar({
            tipo: "tarefa_atrasada_admin", para: mentor, assunto: "Tarefa atrasada",
            dados: { ...sobre, tarefa: e2.titulo }, equipeId: equipe.id, horas: 48,
          });
        }
        if (e.chave === "C") {
          notificar({
            tipo: "boas_vindas", para: lider, assunto: "Boas-vindas ao InfoHub",
            dados: sobre, equipeId: equipe.id, horas: 24 * 12,
          });
          notificar({
            tipo: "nova_tarefa", para: lider, assunto: "Nova tarefa atribuída",
            dados: { ...sobre, titulo: e1.titulo }, equipeId: equipe.id, horas: 24 * 11,
          });
          notificar({
            tipo: "lembrete_manual", para: lider, assunto: "Lembrete da equipe InfoHub",
            dados: { ...sobre, mensagem: "Revisem os dados da ideia até sexta." },
            equipeId: equipe.id, horas: 48,
          });
        }
```

5. Depois do fechamento do `for (const e of EQUIPES) { ... }` (ainda dentro da transação), acrescente:

```ts
      await tx.emails.createMany({ data: notificacoes });
```

- [ ] **Step 4: Rodar os testes e o typecheck**

Run: `npx vitest run tests/seed.test.ts && npm run typecheck`
Expected: PASS (inclusive "rodar de novo não duplica nada" e o `purgeDemo` com 17 contas).

- [ ] **Step 5: Commit**

```bash
git add src/seed/demo.ts tests/seed.test.ts
git commit -F - <<'EOF'
feat(seed): notificações realistas e canceladas para os perfis da demo

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E9TXsEhLzvh1bBR9LeB58C
EOF
```

### Fechamento do Bloco E1 — PR para `staging`

- [ ] Rodar a suíte inteira e o typecheck (dentro de `backend/`):

Run: `npm test && npm run typecheck`
Expected: todos os arquivos PASS; `tsc --noEmit` sem erros.

- [ ] Abrir o PR (base **`staging`**):

```bash
git push -u origin feat/g1-e1-backend
gh pr create --base staging --title "feat: G1 E1 — backend dos extras e lacunas (RN-02, auditoria, linha do tempo, senha)" --body "$(cat <<'EOF'
## Resumo
- A4: `registrarAuditoria` na mesma transação de etapa/status/mentor/entrega/avaliação/lembrete/redefinição
- A1: PATCH /equipes/:slug valida `encaminhada_inovamf` (409 TRANSICAO_INVALIDA); lembrete com até 500 caracteres
- A2: RN-02 real (entregáveis finais + integrantes) com 409 RN02_PENDENCIAS
- A3: POST /usuarios/:slug/redefinir-senha, POST /auth/redefinir-senha, POST /tarefas/:slug/iniciar
- A5: GET /equipes/:slug/linha-do-tempo
- B1: avaliação avisa todos os alunos ativos; seed de notificações canceladas
- Sem migration nova

## Testes
- `npm test` e `npm run typecheck` verdes

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01E9TXsEhLzvh1bBR9LeB58C
EOF
)"
```

Aguardar aprovação e merge antes do Bloco E2.

## Bloco E2 — DS + sino

Branch do bloco (depois do merge do E1):

```bash
git fetch origin && git switch -c feat/g1-e2-ds-sino origin/staging
cd frontend && npm ci
```

Todos os comandos abaixo rodam dentro de `frontend/`.

### Task 7: `Toast` e `Skeleton` no design system (B2)

**Files:**
- Create: `frontend/src/design-system/components/Toast.tsx`
- Create: `frontend/src/design-system/components/Skeleton.tsx`
- Modify: `frontend/src/data/api/Providers.tsx`
- Test: `frontend/tests/components/feedback.test.tsx` (novo)

**Interfaces:**
- Consumes: `CheckIcon`, `CloseIcon` (`design-system/icons.tsx`); classe `.toast-in` de `globals.css` (já desligada com `prefers-reduced-motion: reduce`).
- Produces: `ToastProvider({ children })`, `useToast(): ToastApi` com `sucesso(mensagem: string): void`, `DURACAO_TOAST_MS = 4000`; fora do provider `useToast()` é no-op. `Skeleton({ linhas?: number; className?: string })` com `role="status"` e texto sr-only "Carregando…" (por isso os testes existentes que procuram "Carregando…" continuam passando).

- [ ] **Step 1: Teste (falha)**

Crie `frontend/tests/components/feedback.test.tsx`:

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { DURACAO_TOAST_MS, ToastProvider, useToast } from '@/design-system/components/Toast';
import { Skeleton } from '@/design-system/components/Skeleton';

function Disparador({ mensagem = 'Tarefa criada.' }: { mensagem?: string }) {
  const toast = useToast();
  return (
    <button type="button" onClick={() => toast.sucesso(mensagem)}>
      disparar
    </button>
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe('Toast (B2)', () => {
  it('anuncia o sucesso numa região aria-live="polite"', () => {
    render(
      <ToastProvider>
        <Disparador />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'disparar' }));
    const regiao = screen.getByRole('status');
    expect(regiao).toHaveAttribute('aria-live', 'polite');
    expect(regiao).toHaveTextContent('Tarefa criada.');
  });

  it('some sozinho depois de 4 s', () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <Disparador />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'disparar' }));
    expect(screen.getByText('Tarefa criada.')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(DURACAO_TOAST_MS);
    });
    expect(screen.queryByText('Tarefa criada.')).not.toBeInTheDocument();
  });

  it('pode ser fechado pelo botão e usa a animação .toast-in', () => {
    render(
      <ToastProvider>
        <Disparador />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'disparar' }));
    expect(screen.getByText('Tarefa criada.').closest('.toast-in')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar aviso' }));
    expect(screen.queryByText('Tarefa criada.')).not.toBeInTheDocument();
  });

  it('fora do provider, useToast é um no-op (telas isoladas não quebram)', () => {
    render(<Disparador />);
    expect(() => fireEvent.click(screen.getByRole('button', { name: 'disparar' }))).not.toThrow();
  });
});

describe('Skeleton (B2)', () => {
  it('anuncia "Carregando…" e desenha N barras com pulso só em motion-safe', () => {
    const { container } = render(<Skeleton linhas={4} />);
    expect(screen.getByRole('status')).toHaveTextContent('Carregando…');
    const barras = container.querySelectorAll('[aria-hidden="true"]');
    expect(barras).toHaveLength(4);
    barras.forEach((b) => expect(b.className).toContain('motion-safe:animate-pulse'));
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/components/feedback.test.tsx`
Expected: FAIL — `Failed to resolve import "@/design-system/components/Toast"`.

- [ ] **Step 3: Implementar o `Toast`**

Crie `frontend/src/design-system/components/Toast.tsx`:

```tsx
'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CheckIcon, CloseIcon } from '@/design-system/icons';

/** Quanto tempo o aviso fica na tela (B2). */
export const DURACAO_TOAST_MS = 4000;

export interface ToastApi {
  /** Confirma uma ação que DEU CERTO. Erro nunca vai para o toast: fica inline, com role="alert". */
  sucesso: (mensagem: string) => void;
}

// Fora do provider (ex.: um componente renderizado sozinho num teste) o toast
// é um no-op — nenhuma tela quebra por falta dele.
const Contexto = createContext<ToastApi>({ sucesso: () => {} });

interface Aviso {
  id: number;
  mensagem: string;
}

/**
 * Avisos de sucesso: somem em 4 s e podem ser fechados. Embaixo no celular, em
 * cima à direita no desktop. A entrada usa `.toast-in` (globals.css), que já é
 * desligada com prefers-reduced-motion — só anima para quem aceita movimento.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const proximo = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const fechar = useCallback((id: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setAvisos((lista) => lista.filter((a) => a.id !== id));
  }, []);

  const sucesso = useCallback(
    (mensagem: string) => {
      proximo.current += 1;
      const id = proximo.current;
      setAvisos((lista) => [...lista, { id, mensagem }]);
      timers.current.set(id, setTimeout(() => fechar(id), DURACAO_TOAST_MS));
    },
    [fechar],
  );

  useEffect(() => {
    const ativos = timers.current;
    return () => ativos.forEach((t) => clearTimeout(t));
  }, []);

  const api = useMemo(() => ({ sucesso }), [sucesso]);

  return (
    <Contexto.Provider value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-20 sm:items-end"
      >
        {avisos.map((a) => (
          <div
            key={a.id}
            className="toast-in pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-[0.625rem] border border-border bg-surface px-4 py-3 text-sm text-text shadow-md"
          >
            <CheckIcon size={18} className="shrink-0 text-success-text" />
            <span className="flex-1">{a.mensagem}</span>
            <button
              type="button"
              aria-label="Fechar aviso"
              onClick={() => fechar(a.id)}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
            >
              <CloseIcon size={16} />
            </button>
          </div>
        ))}
      </div>
    </Contexto.Provider>
  );
}

export function useToast(): ToastApi {
  return useContext(Contexto);
}
```

- [ ] **Step 4: Implementar o `Skeleton`**

Crie `frontend/src/design-system/components/Skeleton.tsx`:

```tsx
import { cn } from '@/design-system/cn';

// Larguras alternadas para a "silhueta" parecer texto (classes literais para o JIT do Tailwind).
const LARGURAS = ['w-full', 'w-11/12', 'w-4/5', 'w-2/3'];

export interface SkeletonProps {
  /** Quantas barras desenhar. */
  linhas?: number;
  className?: string;
}

/**
 * Placeholder de carregamento (B2) no lugar de "Carregando…". O pulso só roda
 * com `motion-safe` (prefers-reduced-motion desliga); o texto fica para leitor de tela.
 */
export function Skeleton({ linhas = 3, className }: SkeletonProps) {
  return (
    <div role="status" className={cn('flex flex-col gap-3 py-2', className)}>
      <span className="sr-only">Carregando…</span>
      {Array.from({ length: linhas }, (_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className={cn(
            'h-4 rounded-md bg-surface-sunken motion-safe:animate-pulse',
            LARGURAS[i % LARGURAS.length],
          )}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Montar o provider na raiz**

Em `frontend/src/data/api/Providers.tsx`, acrescente `import { ToastProvider } from '@/design-system/components/Toast';` e troque o `return` por:

```tsx
  return (
    <QueryClientProvider client={cliente}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
```

- [ ] **Step 6: Rodar os testes**

Run: `npx vitest run tests/components/feedback.test.tsx`
Expected: PASS (5 testes).

- [ ] **Step 7: Commit**

```bash
git add src/design-system/components/Toast.tsx src/design-system/components/Skeleton.tsx src/data/api/Providers.tsx tests/components/feedback.test.tsx
git commit -F - <<'EOF'
feat(ds): toast de sucesso e skeleton de carregamento

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E9TXsEhLzvh1bBR9LeB58C
EOF
```

### Task 8: Sino de notificações no `AppShell` (B1)

**Files:**
- Create: `frontend/src/features/shell/notificacoes.ts`
- Create: `frontend/src/features/shell/SinoNotificacoes.tsx`
- Modify: `frontend/src/design-system/icons.tsx` (`BellIcon`)
- Modify: `frontend/src/data/api/tipos.ts` (`Notificacao`), `frontend/src/data/api/consultas.ts` (`chaves.notificacoes`, `useNotificacoes`)
- Modify: `frontend/src/features/shell/AppShell.tsx`
- Test: `frontend/tests/components/sino.test.tsx` (novo)

**Interfaces:**
- Consumes: `GET /api/v1/notificacoes` (inalterado; `dados.equipe_slug`/`dados.tarefa` vindos do E1); `Skeleton` (Task 7); `UsuarioSessao`/`Papel` de `data/api/sessao.ts`.
- Produces: `Notificacao { tipo: string; assunto: string; status: string; dados: Record<string, unknown> | null; criadoEm: string }`; `useNotificacoes()` (60 s + foco); `chaveVisto(slug) === 'infohub-notif-vista:' + slug`, `lerVisto`, `gravarVisto`, `contarNaoLidas(itens, vistoEm)`, `tempoRelativo(iso, agora?)`, `destinoNotificacao(n, papel)`, `detalheNotificacao(n)`; `SinoNotificacoes({ usuario })`; `BellIcon` (usado depois pela linha do tempo e pelo lembrete).

- [ ] **Step 1: Teste (falha)**

Crie `frontend/tests/components/sino.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/data/api/consultas', () => ({ useNotificacoes: vi.fn() }));

import { useNotificacoes } from '@/data/api/consultas';
import type { Notificacao } from '@/data/api/tipos';
import { SinoNotificacoes } from '@/features/shell/SinoNotificacoes';
import {
  chaveVisto,
  contarNaoLidas,
  destinoNotificacao,
  tempoRelativo,
} from '@/features/shell/notificacoes';

type R<T extends (...a: never[]) => unknown> = ReturnType<T>;

const ALUNO = { slug: 'lia', nome: 'Lia Líder', role: 'aluno' as const };

const NOTIFS: Notificacao[] = [
  {
    tipo: 'entrega_ajustar',
    assunto: 'Ajustes solicitados',
    status: 'pendente',
    dados: { tarefa: 'Pitch vídeo', comentario: 'Refazer o áudio', equipe_slug: 'agro' },
    criadoEm: '2026-09-21T10:00:00Z',
  },
  {
    tipo: 'lembrete_manual',
    assunto: 'Lembrete da equipe InfoHub',
    status: 'pendente',
    dados: { mensagem: 'Reunião sexta' },
    criadoEm: '2026-09-21T09:00:00Z',
  },
  {
    tipo: 'nova_tarefa',
    assunto: 'Nova tarefa atribuída',
    status: 'pendente',
    dados: { titulo: 'BMC final' },
    criadoEm: '2026-09-19T10:00:00Z',
  },
];

function mockNotificacoes(data: Notificacao[] = NOTIFS) {
  vi.mocked(useNotificacoes).mockReturnValue({
    data,
    isPending: false,
    isError: false,
    error: null,
  } as unknown as R<typeof useNotificacoes>);
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockNotificacoes();
});

describe('SinoNotificacoes (B1)', () => {
  it('conta só o que chegou depois da última abertura do painel', () => {
    localStorage.setItem(chaveVisto('lia'), '2026-09-20T12:00:00Z');
    render(<SinoNotificacoes usuario={ALUNO} />);
    expect(screen.getByTestId('contador-notificacoes')).toHaveTextContent('2');
    expect(screen.getByRole('button', { name: 'Notificações: 2 novas' })).toBeInTheDocument();
  });

  it('sem registro de abertura, todas contam como novas', () => {
    render(<SinoNotificacoes usuario={ALUNO} />);
    expect(screen.getByTestId('contador-notificacoes')).toHaveTextContent('3');
  });

  it('abrir o painel zera o contador, grava o horário e lista com link para a tela certa', async () => {
    const user = userEvent.setup();
    render(<SinoNotificacoes usuario={ALUNO} />);
    await user.click(screen.getByRole('button', { name: /notificações/i }));

    expect(screen.queryByTestId('contador-notificacoes')).not.toBeInTheDocument();
    expect(localStorage.getItem(chaveVisto('lia'))).not.toBeNull();

    const painel = screen.getByRole('region', { name: 'Notificações' });
    const links = within(painel).getAllByRole('link');
    expect(links).toHaveLength(3);
    expect(links[0]).toHaveTextContent('Ajustes solicitados');
    expect(links[0]).toHaveTextContent('Pitch vídeo');
    expect(links[0]).toHaveAttribute('href', '/aluno/tarefas');
    expect(links[1]).toHaveAttribute('href', '/aluno');
  });

  it('Esc fecha o painel', async () => {
    const user = userEvent.setup();
    render(<SinoNotificacoes usuario={ALUNO} />);
    await user.click(screen.getByRole('button', { name: /notificações/i }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('region', { name: 'Notificações' })).not.toBeInTheDocument();
  });

  it('sem notificações mostra o estado vazio', async () => {
    mockNotificacoes([]);
    const user = userEvent.setup();
    render(<SinoNotificacoes usuario={ALUNO} />);
    expect(screen.queryByTestId('contador-notificacoes')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /notificações/i }));
    expect(screen.getByText('Nenhuma notificação por enquanto.')).toBeInTheDocument();
  });
});

describe('notificacoes — regras de apresentação', () => {
  const agora = new Date('2026-09-22T12:00:00Z');

  it('tempoRelativo', () => {
    expect(tempoRelativo('2026-09-22T11:59:40Z', agora)).toBe('agora');
    expect(tempoRelativo('2026-09-22T11:55:00Z', agora)).toBe('há 5 min');
    expect(tempoRelativo('2026-09-22T10:00:00Z', agora)).toBe('há 2 h');
    expect(tempoRelativo('2026-09-21T11:00:00Z', agora)).toBe('há 1 dia');
    expect(tempoRelativo('2026-09-19T12:00:00Z', agora)).toBe('há 3 dias');
  });

  it('destinoNotificacao leva à equipe certa por papel', () => {
    const n = NOTIFS[0]!;
    expect(destinoNotificacao(n, 'admin')).toBe('/admin/equipes/agro');
    expect(destinoNotificacao(n, 'mentor')).toBe('/orientador/equipes/agro');
    expect(destinoNotificacao(NOTIFS[1]!, 'mentor')).toBe('/orientador');
  });

  it('contarNaoLidas trata "visto" inválido como nunca aberto', () => {
    expect(contarNaoLidas(NOTIFS, 'lixo')).toBe(3);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/components/sino.test.tsx`
Expected: FAIL — não resolve `@/features/shell/SinoNotificacoes`.

- [ ] **Step 3: Ícone, tipo e hook**

Em `frontend/src/design-system/icons.tsx`, no fim:

```tsx
export function BellIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
```

Em `frontend/src/data/api/tipos.ts`, no fim:

```ts
/** GET /notificacoes (RF-18) — a fila de e-mails endereçada à pessoa; o sino (B1) lê daqui. */
export interface Notificacao {
  tipo: string; assunto: string; status: string; dados: Record<string, unknown> | null; criadoEm: string;
}
```

Em `frontend/src/data/api/consultas.ts`:
- acrescente `Notificacao` à lista do `import type { ... } from './tipos';`;
- em `chaves`, depois de `publicoNumeros: ['publico', 'numeros'] as const,`, acrescente `notificacoes: ['notificacoes'] as const,`;
- antes da seção `// ── Público (landing)`, acrescente:

```ts
// ── Notificações (B1) ────────────────────────────────────────────────────────
/** Inbox do sino. Consulta a cada 60 s e quando a janela volta a ter foco. */
export const useNotificacoes = () =>
  useQuery({
    queryKey: chaves.notificacoes,
    queryFn: () => api<Pagina<Notificacao>>('/notificacoes?perPage=20').then((r) => r.data),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
```

- [ ] **Step 4: Regras de apresentação do sino**

Crie `frontend/src/features/shell/notificacoes.ts`:

```ts
import type { Notificacao } from '@/data/api/tipos';
import type { Papel } from '@/data/api/sessao';

/**
 * "Lida/não lida" do sino (B1) NÃO vai ao banco: guardamos, por usuário, o
 * instante da última abertura do painel. Tudo mais novo que isso é "novo".
 */
export const chaveVisto = (slug: string) => `infohub-notif-vista:${slug}`;

export function lerVisto(slug: string): string | null {
  try {
    return localStorage.getItem(chaveVisto(slug));
  } catch {
    return null;
  }
}

export function gravarVisto(slug: string, iso: string): void {
  try {
    localStorage.setItem(chaveVisto(slug), iso);
  } catch {
    /* storage indisponível: o contador só não persiste entre recargas */
  }
}

export function contarNaoLidas(itens: Notificacao[], vistoEm: string | null): number {
  const limite = vistoEm ? Date.parse(vistoEm) : Number.NaN;
  if (Number.isNaN(limite)) return itens.length;
  return itens.filter((n) => Date.parse(n.criadoEm) > limite).length;
}

/** "agora", "há 5 min", "há 2 h", "há 1 dia", "há 3 dias". */
export function tempoRelativo(iso: string, agora: Date = new Date()): string {
  const min = Math.max(0, Math.floor((agora.getTime() - Date.parse(iso)) / 60_000));
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'há 1 dia' : `há ${d} dias`;
}

const TIPOS_DE_TAREFA = ['nova_tarefa', 'entrega_aprovada', 'entrega_ajustar', 'prazo_proximo', 'prazo_vencido'];

/** Para onde o item do sino leva: aluno → tarefas ou equipe; admin/mentor → detalhe da equipe. */
export function destinoNotificacao(n: Notificacao, papel: Papel): string {
  if (papel === 'aluno') return TIPOS_DE_TAREFA.includes(n.tipo) ? '/aluno/tarefas' : '/aluno';
  const equipe = typeof n.dados?.equipe_slug === 'string' ? n.dados.equipe_slug : null;
  if (papel === 'mentor') return equipe ? `/orientador/equipes/${equipe}` : '/orientador';
  return equipe ? `/admin/equipes/${equipe}` : '/admin';
}

/** Texto curto de apoio: a tarefa, a equipe, o título ou a mensagem, nessa ordem. */
export function detalheNotificacao(n: Notificacao): string | null {
  for (const chave of ['tarefa', 'equipe', 'titulo', 'mensagem']) {
    const v = n.dados?.[chave];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return null;
}
```

- [ ] **Step 5: Componente do sino**

Crie `frontend/src/features/shell/SinoNotificacoes.tsx`:

```tsx
'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import type { UsuarioSessao } from '@/data/api/sessao';
import type { Notificacao } from '@/data/api/tipos';
import { useNotificacoes } from '@/data/api/consultas';
import { Skeleton } from '@/design-system/components/Skeleton';
import {
  AlertIcon,
  BellIcon,
  CalendarIcon,
  CheckIcon,
  LightbulbIcon,
  ListChecksIcon,
  MailIcon,
  UploadIcon,
  type IconProps,
} from '@/design-system/icons';
import {
  contarNaoLidas,
  destinoNotificacao,
  detalheNotificacao,
  gravarVisto,
  lerVisto,
  tempoRelativo,
} from '@/features/shell/notificacoes';

const ICONE: Record<string, (p: IconProps) => JSX.Element> = {
  nova_tarefa: ListChecksIcon,
  entrega_aprovada: CheckIcon,
  entrega_ajustar: AlertIcon,
  entrega_recebida_admin: UploadIcon,
  novo_cadastro_admin: LightbulbIcon,
  lembrete_manual: BellIcon,
  prazo_proximo: CalendarIcon,
  prazo_vencido: CalendarIcon,
  tarefa_atrasada_admin: CalendarIcon,
};

/**
 * Sino do AppShell (B1), para todos os papéis. Lê GET /notificacoes; o
 * contador compara com a última abertura do painel (localStorage por usuário).
 * Esc ou clique fora fecham o painel.
 */
export function SinoNotificacoes({ usuario }: { usuario: UsuarioSessao }) {
  const consulta = useNotificacoes();
  const [aberto, setAberto] = useState(false);
  const [vistoEm, setVistoEm] = useState<string | null>(null);
  const raiz = useRef<HTMLDivElement>(null);
  const painelId = useId();

  // localStorage só existe no cliente: lê depois de montar.
  useEffect(() => {
    setVistoEm(lerVisto(usuario.slug));
  }, [usuario.slug]);

  useEffect(() => {
    if (!aberto) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberto(false);
    };
    const clique = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener('keydown', tecla);
    document.addEventListener('mousedown', clique);
    return () => {
      document.removeEventListener('keydown', tecla);
      document.removeEventListener('mousedown', clique);
    };
  }, [aberto]);

  const itens = consulta.data ?? [];
  const naoLidas = contarNaoLidas(itens, vistoEm);

  function alternar() {
    if (!aberto) {
      const agora = new Date().toISOString();
      gravarVisto(usuario.slug, agora);
      setVistoEm(agora);
    }
    setAberto((a) => !a);
  }

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        onClick={alternar}
        aria-expanded={aberto}
        aria-controls={painelId}
        aria-label={naoLidas > 0 ? `Notificações: ${naoLidas} ${naoLidas === 1 ? 'nova' : 'novas'}` : 'Notificações'}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
      >
        <BellIcon size={18} />
        {naoLidas > 0 && (
          <span
            aria-hidden="true"
            data-testid="contador-notificacoes"
            className="absolute -right-0.5 -top-0.5 min-w-[1.1rem] rounded-full bg-primary px-1 text-center text-[0.65rem] font-semibold leading-[1.1rem] text-primary-fg"
          >
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div
          id={painelId}
          role="region"
          aria-label="Notificações"
          className="absolute right-0 top-11 z-40 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-1 rounded-xl border border-border bg-surface p-2 shadow-md"
        >
          {consulta.isPending ? (
            <Skeleton linhas={3} className="p-2" />
          ) : consulta.isError ? (
            <p
              role="alert"
              className="rounded-[0.625rem] bg-danger-soft px-3 py-2 text-sm font-medium text-danger-text"
            >
              {consulta.error.message}
            </p>
          ) : itens.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-text-muted">Nenhuma notificação por enquanto.</p>
          ) : (
            <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto">
              {itens.map((n, i) => (
                <ItemNotificacao
                  key={`${n.criadoEm}-${i}`}
                  n={n}
                  papel={usuario.role}
                  onAbrir={() => setAberto(false)}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function ItemNotificacao({
  n,
  papel,
  onAbrir,
}: {
  n: Notificacao;
  papel: UsuarioSessao['role'];
  onAbrir: () => void;
}) {
  const Icone = ICONE[n.tipo] ?? MailIcon;
  const detalhe = detalheNotificacao(n);
  return (
    <li>
      <Link
        href={destinoNotificacao(n, papel)}
        onClick={onAbrir}
        className="flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
      >
        <Icone size={18} className="mt-0.5 shrink-0 text-primary-text" />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-medium text-text">{n.assunto}</span>
          {detalhe && <span className="truncate text-xs text-text-muted">{detalhe}</span>}
          <span className="text-xs text-text-subtle">{tempoRelativo(n.criadoEm)}</span>
        </span>
      </Link>
    </li>
  );
}
```

- [ ] **Step 6: Colocar o sino no `AppShell`**

Em `frontend/src/features/shell/AppShell.tsx`, acrescente `import { SinoNotificacoes } from '@/features/shell/SinoNotificacoes';` e, dentro de `<div className="flex items-center gap-2 sm:gap-3">`, antes do `{usuario && ( <Link href="/conta" ...`, acrescente:

```tsx
            {usuario && <SinoNotificacoes usuario={usuario} />}
```

- [ ] **Step 7: Rodar os testes**

Run: `npx vitest run tests/components/sino.test.tsx`
Expected: PASS (8 testes).

- [ ] **Step 8: Commit**

```bash
git add src/design-system/icons.tsx src/data/api/tipos.ts src/data/api/consultas.ts src/features/shell/notificacoes.ts src/features/shell/SinoNotificacoes.tsx src/features/shell/AppShell.tsx tests/components/sino.test.tsx
git commit -F - <<'EOF'
feat(shell): sino de notificações com contador de novas

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E9TXsEhLzvh1bBR9LeB58C
EOF
```

### Fechamento do Bloco E2 — PR para `staging`

- [ ] Rodar a suíte e o build (dentro de `frontend/`):

Run: `npm test && npm run build`
Expected: testes PASS; `next build` conclui sem erro de tipo nem de lint.

- [ ] Abrir o PR (base **`staging`**):

```bash
git push -u origin feat/g1-e2-ds-sino
gh pr create --base staging --title "feat: G1 E2 — toast, skeleton e sino de notificações" --body "$(cat <<'EOF'
## Resumo
- DS: `ToastProvider`/`useToast().sucesso` (aria-live polite, 4 s, fechável, `.toast-in` respeitando prefers-reduced-motion) e `Skeleton` (pulso motion-safe)
- Sino no AppShell para todos os papéis: GET /notificacoes a cada 60 s e no foco; contador por `infohub-notif-vista:<slug>` no localStorage

## Testes
- `npm test` e `npm run build` verdes

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01E9TXsEhLzvh1bBR9LeB58C
EOF
)"
```

Aguardar aprovação e merge antes do Bloco E3.

## Bloco E3 — Telas

Branch do bloco (depois do merge do E2):

```bash
git fetch origin && git switch -c feat/g1-e3-telas origin/staging
cd frontend && npm ci
```

Todos os comandos abaixo rodam dentro de `frontend/`.

### Task 9: Linha do tempo + card "Próximo passo" + pendências da RN-02 no `DialogoMover` (A2, A5, B3)

**Files:**
- Create: `frontend/src/features/equipe/LinhaDoTempo.tsx`
- Create: `frontend/src/features/aluno-equipe/ProximoPasso.tsx`
- Delete: `frontend/src/features/admin-detalhe/HistoricoEtapas.tsx`
- Modify: `frontend/src/data/api/tipos.ts` (`Pendencia` + `entregavel`; `ItemLinhaDoTempo`)
- Modify: `frontend/src/data/api/consultas.ts` (`chaves.linhaDoTempo`, `useLinhaDoTempo`, invalidações)
- Modify: `frontend/src/features/funil/DialogoMover.tsx`, `frontend/src/features/admin-detalhe/AvancarEtapa.tsx`
- Modify: `frontend/src/features/admin-detalhe/DetalheEquipe.tsx`, `frontend/src/features/aluno-equipe/MinhaEquipe.tsx`, `frontend/src/features/aluno-tarefas/MinhasTarefas.tsx` (âncora `tarefa-<slug>`)
- Test: `frontend/tests/components/linha-do-tempo.test.tsx` (novo); modify `frontend/tests/components/detalhe-equipe.test.tsx`, `frontend/tests/components/aluno.test.tsx`

**Interfaces:**
- Consumes: `GET /equipes/:slug/linha-do-tempo`, `pendenciasParaAvancar` do detalhe e o 409 `RN02_PENDENCIAS` (E1); `Skeleton`, `BellIcon` (E2).
- Produces: `ItemLinhaDoTempo`, `TipoItemLinhaDoTempo`; `useLinhaDoTempo(equipeSlug)`; `chaves.linhaDoTempo(slug)` (usada pelas Tasks 10 e 11 para invalidar); `textoPendencia(p)` e `chavePendencia(p)` em `DialogoMover.tsx`; `LinhaDoTempo({ equipeSlug, resumida? })`; `ProximoPasso({ equipe })`; âncora `id="tarefa-<slug>"` em cada tarefa de `/aluno/tarefas`.

- [ ] **Step 1: Testes novos (falham)**

Crie `frontend/tests/components/linha-do-tempo.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/data/api/consultas', () => ({ useLinhaDoTempo: vi.fn() }));

import { useLinhaDoTempo } from '@/data/api/consultas';
import { ApiError } from '@/data/api/erro';
import type { EquipeDetalhe, ItemLinhaDoTempo } from '@/data/api/tipos';
import { LinhaDoTempo } from '@/features/equipe/LinhaDoTempo';
import { ProximoPasso } from '@/features/aluno-equipe/ProximoPasso';

type R<T extends (...a: never[]) => unknown> = ReturnType<T>;

const ITENS: ItemLinhaDoTempo[] = Array.from(
  { length: 7 },
  (_, i): ItemLinhaDoTempo => ({
    tipo: 'entrega',
    titulo: `Entrega enviada: Tarefa ${i + 1} (v1)`,
    detalhe: i === 0 ? 'Segue o link' : undefined,
    autor: 'Lia Líder',
    em: `2026-09-${String(20 - i).padStart(2, '0')}T12:00:00Z`,
  }),
);
const refetch = vi.fn();

function mockLinha(parcial: Record<string, unknown> = {}) {
  vi.mocked(useLinhaDoTempo).mockReturnValue({
    data: ITENS,
    isPending: false,
    isError: false,
    error: null,
    refetch,
    ...parcial,
  } as unknown as R<typeof useLinhaDoTempo>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockLinha();
});

describe('LinhaDoTempo (A5)', () => {
  it('lista os eventos com título, detalhe, autor e data', () => {
    render(<LinhaDoTempo equipeSlug="agro" />);
    expect(useLinhaDoTempo).toHaveBeenCalledWith('agro');
    const itens = within(screen.getByRole('list', { name: 'Linha do tempo' })).getAllByRole('listitem');
    expect(itens).toHaveLength(7);
    expect(itens[0]).toHaveTextContent('Entrega enviada: Tarefa 1 (v1)');
    expect(itens[0]).toHaveTextContent('Segue o link');
    expect(itens[0]).toHaveTextContent('Lia Líder');
    expect(itens[0]).toHaveTextContent('20/09/2026');
  });

  it('a versão resumida mostra só os 5 mais recentes', () => {
    render(<LinhaDoTempo equipeSlug="agro" resumida />);
    expect(within(screen.getByRole('list', { name: 'Linha do tempo' })).getAllByRole('listitem')).toHaveLength(5);
  });

  it('carregando mostra o skeleton; vazio mostra o estado vazio', () => {
    mockLinha({ data: undefined, isPending: true });
    const { unmount } = render(<LinhaDoTempo equipeSlug="agro" />);
    expect(screen.getByRole('status')).toHaveTextContent('Carregando…');
    unmount();
    mockLinha({ data: [] });
    render(<LinhaDoTempo equipeSlug="agro" />);
    expect(screen.getByText('Nada por aqui ainda')).toBeInTheDocument();
  });

  it('erro mostra a mensagem da API e "Tentar de novo"', async () => {
    mockLinha({ data: undefined, isError: true, error: new ApiError(500, 'X', 'Falha na linha do tempo') });
    const user = userEvent.setup();
    render(<LinhaDoTempo equipeSlug="agro" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Falha na linha do tempo');
    await user.click(screen.getByRole('button', { name: /tentar de novo/i }));
    expect(refetch).toHaveBeenCalled();
  });
});

describe('ProximoPasso (B3)', () => {
  const base = {
    slug: 'agro',
    nomeIdeia: 'Agro',
    status: 'ativa',
    etapa: { numero: 3, nome: 'Encontro 1' },
    pendenciasParaAvancar: [],
  } as unknown as EquipeDetalhe;

  it('lista as pendências da API; a tarefa leva direto a ela', () => {
    render(
      <ProximoPasso
        equipe={{
          ...base,
          pendenciasParaAvancar: [
            { tipo: 'tarefa', slug: 't1', titulo: 'Definir problema' },
            { tipo: 'integrante', slug: 'bia', nome: 'Bia', motivo: 'convite_pendente' },
            { tipo: 'entregavel', titulo: 'Pitch vídeo' },
          ],
        }}
      />,
    );
    expect(screen.getByRole('link', { name: 'Definir problema' })).toHaveAttribute('href', '/aluno/tarefas#tarefa-t1');
    const lista = screen.getByTestId('proximo-passo-pendencias');
    expect(lista).toHaveTextContent('Bia ainda não aceitou o convite');
    expect(lista).toHaveTextContent('Pitch vídeo — o mentor ainda vai criar esta tarefa');
  });

  it('sem pendências: "Tudo entregue — aguardando a avaliação do mentor"', () => {
    render(<ProximoPasso equipe={base} />);
    expect(screen.getByText('Tudo entregue — aguardando a avaliação do mentor')).toBeInTheDocument();
  });

  it('equipe pronta não mostra pendências', () => {
    render(<ProximoPasso equipe={{ ...base, status: 'pronta_inovamf' }} />);
    expect(screen.getByText('Sua equipe está pronta para o InovAMF.')).toBeInTheDocument();
  });
});
```

Em `frontend/tests/components/detalhe-equipe.test.tsx`:

1. No `vi.mock('@/data/api/consultas', () => ({ ... }))`, acrescente `useLinhaDoTempo: vi.fn(),`; no `import { ... } from '@/data/api/consultas';` acrescente `useLinhaDoTempo`; troque `import type { Anotacao, EquipeDetalhe } from '@/data/api/tipos';` por `import type { Anotacao, EquipeDetalhe, ItemLinhaDoTempo } from '@/data/api/tipos';`.
2. Depois da constante `ANOTACOES`, acrescente:

```tsx
const LINHA: ItemLinhaDoTempo[] = [
  {
    tipo: 'etapa',
    titulo: 'Etapa 6 → Pronta p/ InovAMF (forçado)',
    detalhe: 'Banca antecipada',
    autor: 'Coord Admin',
    em: '2026-09-10T15:30:00Z',
  },
  { tipo: 'avaliacao', titulo: 'Entrega aprovada: Pitch', autor: 'Ana Mentora', em: '2026-09-09T10:00:00Z' },
];
```

3. No fim de `mockPadrao()`, acrescente:

```tsx
  vi.mocked(useLinhaDoTempo).mockReturnValue({
    data: LINHA,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as R<typeof useLinhaDoTempo>);
```

4. Substitua o `describe('HistoricoEtapas', ...)` inteiro por:

```tsx
describe('Linha do tempo', () => {
  it('a aba mostra os eventos da API com detalhe, autor e data', async () => {
    const user = userEvent.setup();
    render(<DetalheEquipe slug="agrosmart" />);
    await user.click(screen.getByRole('tab', { name: 'Linha do tempo' }));

    expect(useLinhaDoTempo).toHaveBeenCalledWith('agrosmart');
    const itens = within(screen.getByRole('list', { name: 'Linha do tempo' })).getAllByRole('listitem');
    expect(itens[0]).toHaveTextContent('Etapa 6 → Pronta p/ InovAMF (forçado)');
    expect(itens[0]).toHaveTextContent('Banca antecipada');
    expect(itens[0]).toHaveTextContent('Coord Admin');
    expect(itens[0]).toHaveTextContent('10/09/2026');
    expect(itens[1]).toHaveTextContent('Entrega aprovada: Pitch');
  });
});
```

5. Dentro do `describe('AvancarEtapa', ...)`, acrescente:

```tsx
  it('409 RN02_PENDENCIAS também vira "forçar", listando o entregável ausente', async () => {
    mover.mockImplementationOnce((_b: unknown, opts?: { onError?: (e: unknown) => void }) =>
      opts?.onError?.(
        new ApiError(409, 'RN02_PENDENCIAS', 'Faltam entregáveis finais ou dados de integrantes', {
          pendencias: [{ tipo: 'entregavel', titulo: 'Pitch vídeo' }],
        }),
      ),
    );
    const user = userEvent.setup();
    render(<DetalheEquipe slug="agrosmart" />);
    await user.click(screen.getByRole('button', { name: /avançar etapa/i }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByTestId('confirmar-movimento'));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Faltam entregáveis finais');
    expect(within(dialog).getByTestId('pendencias-mover')).toHaveTextContent('entregável não criado: Pitch vídeo');
    expect(within(dialog).getByLabelText('Observação')).toBeInTheDocument();
  });
```

Em `frontend/tests/components/aluno.test.tsx`:

1. No `vi.mock('@/data/api/consultas', ...)` acrescente `useLinhaDoTempo: vi.fn(),` e, no `import { ... } from '@/data/api/consultas';`, acrescente `useLinhaDoTempo`.
2. No fim de `mockPadrao()`, acrescente:

```tsx
  vi.mocked(useLinhaDoTempo).mockReturnValue({
    data: [],
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as R<typeof useLinhaDoTempo>);
```

3. Dentro do `describe('MinhaEquipe', ...)`, acrescente:

```tsx
  it('mostra o "Próximo passo" e a linha do tempo resumida da equipe', () => {
    render(<MinhaEquipe />);
    expect(screen.getByText('Próximo passo')).toBeInTheDocument();
    expect(screen.getByText('Tudo entregue — aguardando a avaliação do mentor')).toBeInTheDocument();
    expect(useLinhaDoTempo).toHaveBeenCalledWith('agrosmart');
  });
```

4. Dentro do `describe('MinhasTarefas', ...)`, acrescente:

```tsx
  it('cada tarefa tem a âncora que o "Próximo passo" usa', () => {
    render(<MinhasTarefas />);
    expect(document.getElementById('tarefa-t-1')).not.toBeNull();
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/components/linha-do-tempo.test.tsx tests/components/detalhe-equipe.test.tsx tests/components/aluno.test.tsx`
Expected: FAIL — `LinhaDoTempo`/`ProximoPasso` não existem; a aba "Linha do tempo" não existe; o RN02 não vira "forçar".

- [ ] **Step 3: Tipos e hooks**

Em `frontend/src/data/api/tipos.ts`, troque o tipo `Pendencia` por:

```ts
export type Pendencia =
  | { tipo: 'tarefa'; slug: string; titulo: string }
  | { tipo: 'integrante'; slug: string; nome: string; motivo: 'convite_pendente' | 'dados_incompletos' }
  // RN-02: entregável final que o mentor ainda nem criou como tarefa.
  | { tipo: 'entregavel'; titulo: string };
```

e acrescente no fim:

```ts
/** GET /equipes/:slug/linha-do-tempo (A5) — sem UUID; `detalhe` e `autor` só quando existem. */
export type TipoItemLinhaDoTempo = 'etapa' | 'status' | 'mentor' | 'entrega' | 'avaliacao' | 'lembrete';
export interface ItemLinhaDoTempo {
  tipo: TipoItemLinhaDoTempo; titulo: string; detalhe?: string; autor?: string; em: string;
}
```

Em `frontend/src/data/api/consultas.ts`:
- acrescente `ItemLinhaDoTempo` ao `import type { ... } from './tipos';`;
- em `chaves`, depois de `anotacoes: ...`, acrescente `linhaDoTempo: (equipeSlug: string) => ['linha-do-tempo', equipeSlug] as const,`;
- em `useMoverEtapa`, dentro do `onSuccess`, acrescente `void qc.invalidateQueries({ queryKey: chaves.linhaDoTempo(slug) });`;
- em `invalidarTarefa`, acrescente `void qc.invalidateQueries({ queryKey: chaves.linhaDoTempo(equipeSlug) });`;
- logo depois de `useEquipe`, acrescente:

```ts
/** A5: linha do tempo da equipe (o backend já aplica o escopo do papel). */
export const useLinhaDoTempo = (equipeSlug: string) =>
  useQuery({
    queryKey: chaves.linhaDoTempo(equipeSlug),
    queryFn: () =>
      api<{ data: ItemLinhaDoTempo[] }>(`/equipes/${equipeSlug}/linha-do-tempo`).then((r) => r.data),
    enabled: !!equipeSlug,
  });
```

- [ ] **Step 4: `DialogoMover` e `AvancarEtapa` entendem a RN-02**

Em `frontend/src/features/funil/DialogoMover.tsx`, substitua a função `textoPendencia` por:

```tsx
export function textoPendencia(p: Pendencia): string {
  if (p.tipo === 'tarefa') return `tarefa: ${p.titulo}`;
  if (p.tipo === 'entregavel') return `entregável não criado: ${p.titulo}`;
  return `integrante: ${p.nome} — ${MOTIVO[p.motivo]}`;
}

/** Chave estável de uma pendência numa lista (o entregável ausente não tem slug). */
export function chavePendencia(p: Pendencia): string {
  return p.tipo === 'entregavel' ? `entregavel-${p.titulo}` : `${p.tipo}-${p.slug}`;
}

/** 409 que levam o diálogo ao modo "forçar" com as pendências da API (RN-01 e RN-02). */
const CODIGOS_FORCAR = ['RN01_PENDENCIAS', 'RN01_SALTO', 'RN02_PENDENCIAS'];
```

No mesmo arquivo:
- troque `if (e instanceof ApiError && (e.code === 'RN01_PENDENCIAS' || e.code === 'RN01_SALTO')) {` por `if (e instanceof ApiError && CODIGOS_FORCAR.includes(e.code)) {`;
- troque `<li key={`${p.tipo}-${p.slug}`}>{textoPendencia(p)}</li>` por `<li key={chavePendencia(p)}>{textoPendencia(p)}</li>`;
- no comentário do componente, troque `409 \`RN01_*\`` por `409 \`RN01_*\`/\`RN02_PENDENCIAS\``.

Em `frontend/src/features/admin-detalhe/AvancarEtapa.tsx`, troque o import de `DialogoMover` por `import { DialogoMover, POSICAO_PRONTA, chavePendencia, posicaoDe, textoPendencia } from '@/features/funil/DialogoMover';` e `<li key={`${p.tipo}-${p.slug}`}>{textoPendencia(p)}</li>` por `<li key={chavePendencia(p)}>{textoPendencia(p)}</li>`.

- [ ] **Step 5: Componente `LinhaDoTempo`**

Crie `frontend/src/features/equipe/LinhaDoTempo.tsx`:

```tsx
'use client';

import type { TipoItemLinhaDoTempo } from '@/data/api/tipos';
import { useLinhaDoTempo } from '@/data/api/consultas';
import { formatarDataHora } from '@/domain/labels';
import { Button } from '@/design-system/components/Button';
import { EmptyState } from '@/design-system/components/EmptyState';
import { Skeleton } from '@/design-system/components/Skeleton';
import {
  BellIcon,
  CheckIcon,
  RocketIcon,
  TargetIcon,
  UploadIcon,
  UserIcon,
  type IconProps,
} from '@/design-system/icons';

const ICONE: Record<TipoItemLinhaDoTempo, (p: IconProps) => JSX.Element> = {
  etapa: RocketIcon,
  status: TargetIcon,
  mentor: UserIcon,
  entrega: UploadIcon,
  avaliacao: CheckIcon,
  lembrete: BellIcon,
};

/** Quantos itens a versão resumida (área do aluno) mostra. */
export const ITENS_RESUMO = 5;

/**
 * Linha do tempo da equipe (A5): movimentos no funil, mentor/status, entregas,
 * avaliações e lembretes, do mais novo para o mais antigo. O escopo (o aluno
 * não vê observação de movimento forçado) é do backend. Usada no detalhe
 * (admin/mentor) e, resumida, em "Minha equipe".
 */
export function LinhaDoTempo({ equipeSlug, resumida = false }: { equipeSlug: string; resumida?: boolean }) {
  const consulta = useLinhaDoTempo(equipeSlug);

  if (consulta.isPending) return <Skeleton linhas={resumida ? 2 : 4} />;
  if (consulta.isError) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p
          role="alert"
          className="rounded-[0.625rem] bg-danger-soft px-3 py-2 text-sm font-medium text-danger-text"
        >
          {consulta.error.message}
        </p>
        <Button variant="secondary" size="sm" onClick={() => void consulta.refetch()}>
          Tentar de novo
        </Button>
      </div>
    );
  }

  const itens = resumida ? consulta.data.slice(0, ITENS_RESUMO) : consulta.data;
  if (itens.length === 0) {
    return (
      <EmptyState
        title="Nada por aqui ainda"
        description="Movimentos no funil, entregas e avaliações aparecem aqui."
      />
    );
  }

  return (
    <ol aria-label="Linha do tempo" className="flex flex-col gap-2">
      {itens.map((it, i) => {
        const Icone = ICONE[it.tipo] ?? RocketIcon;
        return (
          <li
            key={`${it.em}-${i}`}
            className="flex gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          >
            <Icone size={18} className="mt-0.5 shrink-0 text-primary-text" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="font-medium text-text">{it.titulo}</span>
              {it.detalhe && <p className="whitespace-pre-line text-text-muted">{it.detalhe}</p>}
              <span className="text-xs text-text-subtle">
                {it.autor ? `${it.autor} · ` : ''}
                {formatarDataHora(it.em)}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 6: Componente `ProximoPasso`**

Crie `frontend/src/features/aluno-equipe/ProximoPasso.tsx`:

```tsx
import Link from 'next/link';
import type { EquipeDetalhe, Pendencia } from '@/data/api/tipos';
import { Card } from '@/design-system/components/Card';
import { CheckIcon } from '@/design-system/icons';
import { POSICAO_PRONTA, chavePendencia, posicaoDe } from '@/features/funil/DialogoMover';

const MOTIVO: Record<Extract<Pendencia, { tipo: 'integrante' }>['motivo'], string> = {
  convite_pendente: 'ainda não aceitou o convite',
  dados_incompletos: 'precisa completar curso e semestre',
};

function ItemPendencia({ p }: { p: Pendencia }) {
  if (p.tipo === 'tarefa') {
    return (
      <Link
        href={`/aluno/tarefas#tarefa-${p.slug}`}
        className="rounded-sm text-primary-text underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
      >
        {p.titulo}
      </Link>
    );
  }
  if (p.tipo === 'entregavel') return <span>{p.titulo} — o mentor ainda vai criar esta tarefa</span>;
  return (
    <span>
      {p.nome} {MOTIVO[p.motivo]}
    </span>
  );
}

/**
 * Card "Próximo passo" (B3) da área do aluno: a etapa atual e o que falta para
 * avançar — as MESMAS pendências que o backend usa na RN-01 (e na RN-02, na
 * Etapa 6). Cada tarefa leva direto a ela em /aluno/tarefas.
 */
export function ProximoPasso({ equipe }: { equipe: EquipeDetalhe }) {
  const pronta = posicaoDe(equipe) === POSICAO_PRONTA;
  const pendencias = equipe.pendenciasParaAvancar;

  return (
    <Card>
      <Card.Header>
        <h3 className="text-sm font-semibold text-text">Próximo passo</h3>
      </Card.Header>
      <Card.Body className="flex flex-col gap-3 text-sm">
        {pronta ? (
          <p className="flex items-center gap-2 text-text">
            <CheckIcon size={16} className="shrink-0 text-success-text" />
            Sua equipe está pronta para o InovAMF.
          </p>
        ) : (
          <>
            <p className="text-text-muted">
              Vocês estão em{' '}
              <span className="font-medium text-text">
                {equipe.etapa.numero}. {equipe.etapa.nome}
              </span>
              .
            </p>
            {pendencias.length === 0 ? (
              <p className="flex items-center gap-2 text-text">
                <CheckIcon size={16} className="shrink-0 text-success-text" />
                Tudo entregue — aguardando a avaliação do mentor
              </p>
            ) : (
              <>
                <p className="font-medium text-text">Para avançar, falta:</p>
                <ul
                  data-testid="proximo-passo-pendencias"
                  className="flex list-disc flex-col gap-1 pl-5 text-text-muted"
                >
                  {pendencias.map((p) => (
                    <li key={chavePendencia(p)}>
                      <ItemPendencia p={p} />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </Card.Body>
    </Card>
  );
}
```

- [ ] **Step 7: Encaixar nas telas**

Em `frontend/src/features/admin-detalhe/DetalheEquipe.tsx`:
- troque `import { HistoricoEtapas } from '@/features/admin-detalhe/HistoricoEtapas';` por `import { LinhaDoTempo } from '@/features/equipe/LinhaDoTempo';`;
- troque a aba `{ id: 'historico', label: 'Histórico', content: <HistoricoEtapas historico={equipe.historico} /> },` por `{ id: 'linha', label: 'Linha do tempo', content: <LinhaDoTempo equipeSlug={equipe.slug} /> },`.

Apague o arquivo: `git rm src/features/admin-detalhe/HistoricoEtapas.tsx`.

Em `frontend/src/features/aluno-equipe/MinhaEquipe.tsx`:
- acrescente `import { LinhaDoTempo } from '@/features/equipe/LinhaDoTempo';` e `import { ProximoPasso } from '@/features/aluno-equipe/ProximoPasso';`;
- logo depois do `</Card>` do bloco `{/* A ideia */}`, acrescente `<ProximoPasso equipe={equipe} />`;
- logo depois do `</div>` que fecha o `<div className="grid gap-5 md:grid-cols-2">`, acrescente:

```tsx
      {/* Linha do tempo (resumida) */}
      <Card>
        <Card.Header>
          <h3 className="text-sm font-semibold text-text">Linha do tempo</h3>
        </Card.Header>
        <Card.Body>
          <LinhaDoTempo equipeSlug={equipe.slug} resumida />
        </Card.Body>
      </Card>
```

Em `frontend/src/features/aluno-tarefas/MinhasTarefas.tsx`, em `LinhaTarefa`, troque `<li className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">` por:

```tsx
    <li
      id={`tarefa-${tarefa.slug}`}
      className="flex scroll-mt-28 flex-col gap-2 rounded-lg border border-border bg-surface p-3"
    >
```

- [ ] **Step 8: Rodar os testes**

Run: `npx vitest run tests/components/linha-do-tempo.test.tsx tests/components/detalhe-equipe.test.tsx tests/components/aluno.test.tsx tests/components/funil.test.tsx tests/components/kanban.test.tsx`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/data/api/tipos.ts src/data/api/consultas.ts src/features/funil/DialogoMover.tsx src/features/admin-detalhe/AvancarEtapa.tsx src/features/equipe/LinhaDoTempo.tsx src/features/aluno-equipe/ProximoPasso.tsx src/features/admin-detalhe/DetalheEquipe.tsx src/features/aluno-equipe/MinhaEquipe.tsx src/features/aluno-tarefas/MinhasTarefas.tsx tests/components/linha-do-tempo.test.tsx tests/components/detalhe-equipe.test.tsx tests/components/aluno.test.tsx
git commit -F - <<'EOF'
feat(telas): linha do tempo, próximo passo e pendências da RN-02

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E9TXsEhLzvh1bBR9LeB58C
EOF
```

(O `git rm` do Step 7 já deixou a remoção de `HistoricoEtapas.tsx` no índice.)

### Task 10: Gestão da equipe (mentor e status) + "Enviar lembrete" (A1)

**Files:**
- Create: `frontend/src/features/admin-detalhe/GestaoEquipe.tsx`
- Create: `frontend/src/features/admin-detalhe/EnviarLembreteDialog.tsx`
- Modify: `frontend/src/data/api/consultas.ts` (`useAtualizarEquipe`, `useEnviarLembrete`)
- Modify: `frontend/src/features/admin-detalhe/DetalheEquipe.tsx`
- Test: `frontend/tests/components/detalhe-equipe.test.tsx`

**Interfaces:**
- Consumes: `PATCH /equipes/:slug` e `POST /equipes/:slug/lembrete` (E1); `useUsuarios('mentor')`; `useToast` (E2); `chaves.linhaDoTempo` (Task 9).
- Produces: `useAtualizarEquipe(slug)` → `mutate({ mentor?: string | null; status?: StatusEquipe })`; `useEnviarLembrete(equipeSlug)` → `mutate({ mensagem?: string })` → `{ enfileirados, total }`; `GestaoEquipe({ equipe })` (aba "Gestão", só admin); `EnviarLembreteDialog({ equipeSlug })` com `LIMITE_LEMBRETE = 500` (admin e mentor da equipe).

- [ ] **Step 1: Testes (falham)**

Em `frontend/tests/components/detalhe-equipe.test.tsx`:

1. No `vi.mock('@/data/api/consultas', ...)`, acrescente `useUsuarios: vi.fn(), useAtualizarEquipe: vi.fn(), useEnviarLembrete: vi.fn(),`; no `import { ... } from '@/data/api/consultas';` acrescente `useAtualizarEquipe, useEnviarLembrete, useUsuarios`; troque o import de tipos por `import type { Anotacao, EquipeDetalhe, ItemLinhaDoTempo, UsuarioAdmin } from '@/data/api/tipos';`.
2. Depois de `const refetch = vi.fn();`, acrescente:

```tsx
const atualizarEquipe = vi.fn();
const enviarLembrete = vi.fn();

const MENTORES: UsuarioAdmin[] = [
  { slug: 'mentor-ana', nome: 'Ana Mentora', email: 'ana@amf.edu.br', telefone: '', role: 'mentor', ativo: true, conviteAceito: true },
  { slug: 'mentor-bruno', nome: 'Bruno Mentor', email: 'bruno@amf.edu.br', telefone: '', role: 'mentor', ativo: true, conviteAceito: true },
  { slug: 'mentor-inativo', nome: 'Inativo Mentor', email: 'x@amf.edu.br', telefone: '', role: 'mentor', ativo: false, conviteAceito: true },
];
```

3. No fim de `mockPadrao()`, acrescente:

```tsx
  vi.mocked(useUsuarios).mockReturnValue({ data: MENTORES, isPending: false, isError: false } as unknown as R<
    typeof useUsuarios
  >);
  vi.mocked(useAtualizarEquipe).mockReturnValue({ mutate: atualizarEquipe, isPending: false } as unknown as R<
    typeof useAtualizarEquipe
  >);
  vi.mocked(useEnviarLembrete).mockReturnValue({ mutate: enviarLembrete, isPending: false } as unknown as R<
    typeof useEnviarLembrete
  >);
```

4. No fim do arquivo, acrescente:

```tsx
describe('Gestão da equipe (A1)', () => {
  async function abrirGestao() {
    const user = userEvent.setup();
    render(<DetalheEquipe slug="agrosmart" />);
    await user.click(screen.getByRole('tab', { name: 'Gestão' }));
    return user;
  }

  it('só o admin vê a aba Gestão', () => {
    comoMentor();
    render(<DetalheEquipe slug="agrosmart" />);
    expect(screen.queryByRole('tab', { name: 'Gestão' })).not.toBeInTheDocument();
  });

  it('lista só mentores ativos e troca o mentor com { mentor: slug }', async () => {
    const user = await abrirGestao();
    const select = screen.getByLabelText('Mentor');
    expect(within(select).queryByRole('option', { name: 'Inativo Mentor' })).not.toBeInTheDocument();
    await user.selectOptions(select, 'mentor-bruno');
    expect(useAtualizarEquipe).toHaveBeenCalledWith('agrosmart');
    expect(atualizarEquipe).toHaveBeenCalledWith({ mentor: 'mentor-bruno' }, expect.anything());
  });

  it('"Sem mentor" envia { mentor: null }', async () => {
    const user = await abrirGestao();
    await user.selectOptions(screen.getByLabelText('Mentor'), '');
    expect(atualizarEquipe).toHaveBeenCalledWith({ mentor: null }, expect.anything());
  });

  it('status manda { status } e o 409 da API aparece inline', async () => {
    atualizarEquipe.mockImplementationOnce((_b: unknown, opts?: { onError?: (e: unknown) => void }) =>
      opts?.onError?.(
        new ApiError(409, 'TRANSICAO_INVALIDA', 'Só dá para encaminhar ao InovAMF uma equipe que está Pronta p/ InovAMF'),
      ),
    );
    const user = await abrirGestao();
    await user.selectOptions(screen.getByLabelText('Status'), 'encaminhada_inovamf');
    expect(atualizarEquipe).toHaveBeenCalledWith({ status: 'encaminhada_inovamf' }, expect.anything());
    expect(screen.getByRole('alert')).toHaveTextContent('Só dá para encaminhar ao InovAMF');
  });
});

describe('Enviar lembrete (RF-20)', () => {
  it('envia a mensagem opcional, com teto de 500 caracteres', async () => {
    const user = userEvent.setup();
    render(<DetalheEquipe slug="agrosmart" />);
    await user.click(screen.getByRole('button', { name: /enviar lembrete/i }));
    const dialog = screen.getByRole('dialog');
    const campo = within(dialog).getByLabelText('Mensagem (opcional)');
    expect(campo).toHaveAttribute('maxlength', '500');
    await user.type(campo, 'Pitch na sexta');
    await user.click(within(dialog).getByRole('button', { name: /^enviar$/i }));
    expect(useEnviarLembrete).toHaveBeenCalledWith('agrosmart');
    expect(enviarLembrete).toHaveBeenCalledWith({ mensagem: 'Pitch na sexta' }, expect.anything());
  });

  it('mentor de outra equipe não vê o botão', () => {
    comoMentor('outro-mentor');
    render(<DetalheEquipe slug="agrosmart" />);
    expect(screen.queryByRole('button', { name: /enviar lembrete/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/components/detalhe-equipe.test.tsx`
Expected: FAIL — não há aba "Gestão" nem botão "Enviar lembrete".

- [ ] **Step 3: Hooks**

Em `frontend/src/data/api/consultas.ts`, acrescente `import type { StatusEquipe } from '@/domain/types';` e, logo depois de `useMoverEtapa`, acrescente:

```ts
/** A1: gestão do admin — mentor e status via PATCH /equipes/:slug (a regra é do backend). */
export function useAtualizarEquipe(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { mentor?: string | null; status?: StatusEquipe }) =>
      api(`/equipes/${slug}`, { method: 'PATCH', body: b }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: chaves.equipe(slug) });
      void qc.invalidateQueries({ queryKey: ['equipes'] });
      void qc.invalidateQueries({ queryKey: chaves.linhaDoTempo(slug) });
      void qc.invalidateQueries({ queryKey: chaves.dashboard });
    },
  });
}

/** RF-20: lembrete manual avulso para os integrantes (admin ou mentor da equipe). */
export function useEnviarLembrete(equipeSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { mensagem?: string }) =>
      api<{ enfileirados: number; total: number }>(`/equipes/${equipeSlug}/lembrete`, { method: 'POST', body: b }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: chaves.linhaDoTempo(equipeSlug) }),
  });
}
```

- [ ] **Step 4: Card de gestão**

Crie `frontend/src/features/admin-detalhe/GestaoEquipe.tsx`:

```tsx
'use client';

import { useState } from 'react';
import type { StatusEquipe } from '@/domain/types';
import type { EquipeDetalhe } from '@/data/api/tipos';
import { useAtualizarEquipe, useUsuarios } from '@/data/api/consultas';
import { STATUS_EQUIPE_LABEL } from '@/domain/labels';
import { Card } from '@/design-system/components/Card';
import { FormField } from '@/design-system/components/FormField';
import { Select, type SelectOption } from '@/design-system/components/Select';
import { useToast } from '@/design-system/components/Toast';

/** Status que o admin escolhe à mão (A1). "Pronta" só vem do avanço de etapa (RN-02). */
const STATUS_GESTAO: StatusEquipe[] = ['ativa', 'pausada', 'desistente', 'encaminhada_inovamf'];

/**
 * Card "Gestão" (só admin): mentor e status da equipe via PATCH /equipes/:slug.
 * Quem decide se a transição vale é o backend — o 409 TRANSICAO_INVALIDA
 * aparece inline; o sucesso vira toast.
 */
export function GestaoEquipe({ equipe }: { equipe: EquipeDetalhe }) {
  const mentores = useUsuarios('mentor');
  const atualizar = useAtualizarEquipe(equipe.slug);
  const toast = useToast();
  const [erro, setErro] = useState<string | null>(null);

  const opcoesMentor: SelectOption[] = [
    { value: '', label: 'Sem mentor' },
    ...(mentores.data ?? []).filter((u) => u.ativo).map((u) => ({ value: u.slug, label: u.nome })),
  ];
  // O mentor atual pode não estar na lista (ex.: um admin mentorando) — mantém a opção dele.
  if (equipe.mentor && !opcoesMentor.some((o) => o.value === equipe.mentor?.slug)) {
    opcoesMentor.push({ value: equipe.mentor.slug, label: equipe.mentor.nome });
  }
  const opcoesStatus: SelectOption[] = STATUS_GESTAO.map((s) => ({ value: s, label: STATUS_EQUIPE_LABEL[s] }));
  if (!STATUS_GESTAO.includes(equipe.status)) {
    opcoesStatus.unshift({ value: equipe.status, label: STATUS_EQUIPE_LABEL[equipe.status] });
  }

  function salvar(body: { mentor?: string | null; status?: StatusEquipe }, mensagem: string) {
    setErro(null);
    atualizar.mutate(body, {
      onSuccess: () => toast.sucesso(mensagem),
      onError: (err) => setErro(err instanceof Error ? err.message : 'Não foi possível atualizar a equipe.'),
    });
  }

  return (
    <Card>
      <Card.Header>
        <h3 className="text-sm font-semibold text-text">Gestão</h3>
      </Card.Header>
      <Card.Body className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Mentor" htmlFor="gestao-mentor">
            <Select
              id="gestao-mentor"
              options={opcoesMentor}
              value={equipe.mentor?.slug ?? ''}
              disabled={atualizar.isPending}
              onChange={(e) => {
                const v = e.target.value;
                salvar({ mentor: v || null }, v ? 'Mentor atualizado.' : 'A equipe ficou sem mentor.');
              }}
            />
          </FormField>
          <FormField
            label="Status"
            htmlFor="gestao-status"
            hint="“Pronta p/ InovAMF” vem do avanço de etapa; encaminhar só a partir dela."
          >
            <Select
              id="gestao-status"
              options={opcoesStatus}
              value={equipe.status}
              disabled={atualizar.isPending}
              onChange={(e) => {
                const v = e.target.value as StatusEquipe;
                if (v === equipe.status) return;
                salvar({ status: v }, `Status alterado para ${STATUS_EQUIPE_LABEL[v]}.`);
              }}
            />
          </FormField>
        </div>
        {erro && (
          <p
            role="alert"
            className="rounded-[0.625rem] bg-danger-soft px-3 py-2 text-sm font-medium text-danger-text"
          >
            {erro}
          </p>
        )}
      </Card.Body>
    </Card>
  );
}
```

- [ ] **Step 5: Diálogo de lembrete**

Crie `frontend/src/features/admin-detalhe/EnviarLembreteDialog.tsx`:

```tsx
'use client';

import { useState, type FormEvent } from 'react';
import { useEnviarLembrete } from '@/data/api/consultas';
import { Dialog } from '@/design-system/components/primitives/Dialog';
import { Button } from '@/design-system/components/Button';
import { FormField } from '@/design-system/components/FormField';
import { Textarea } from '@/design-system/components/Textarea';
import { useToast } from '@/design-system/components/Toast';
import { BellIcon } from '@/design-system/icons';

/** Mesmo teto do backend (POST /equipes/:slug/lembrete). */
export const LIMITE_LEMBRETE = 500;

/** RF-20: admin ou mentor da equipe manda um lembrete avulso a todos os integrantes. */
export function EnviarLembreteDialog({ equipeSlug }: { equipeSlug: string }) {
  const enviar = useEnviarLembrete(equipeSlug);
  const toast = useToast();
  const [aberto, setAberto] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  function fechar() {
    setAberto(false);
    setMensagem('');
    setErro(null);
  }

  function confirmar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    const texto = mensagem.trim();
    enviar.mutate(texto ? { mensagem: texto } : {}, {
      onSuccess: (r) => {
        toast.sucesso(`Lembrete enviado para ${r.enfileirados} integrante${r.enfileirados === 1 ? '' : 's'}.`);
        fechar();
      },
      onError: (err) => setErro(err instanceof Error ? err.message : 'Não foi possível enviar o lembrete.'),
    });
  }

  return (
    <>
      <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setAberto(true)}>
        <BellIcon size={16} />
        Enviar lembrete
      </Button>
      <Dialog
        open={aberto}
        onOpenChange={(o) => (o ? setAberto(true) : fechar())}
        title="Enviar lembrete"
        description="Todos os integrantes ativos recebem o lembrete."
      >
        <form onSubmit={confirmar} className="flex flex-col gap-4" noValidate>
          <FormField
            label="Mensagem (opcional)"
            htmlFor="lembrete-mensagem"
            hint={`${mensagem.length}/${LIMITE_LEMBRETE} caracteres`}
          >
            <Textarea
              id="lembrete-mensagem"
              rows={4}
              maxLength={LIMITE_LEMBRETE}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
            />
          </FormField>
          {erro && (
            <p
              role="alert"
              className="rounded-[0.625rem] bg-danger-soft px-3 py-2 text-sm font-medium text-danger-text"
            >
              {erro}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={fechar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={enviar.isPending}>
              {enviar.isPending ? 'Enviando…' : 'Enviar'}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 6: Encaixar no detalhe da equipe**

Em `frontend/src/features/admin-detalhe/DetalheEquipe.tsx`:
- acrescente `import { GestaoEquipe } from '@/features/admin-detalhe/GestaoEquipe';` e `import { EnviarLembreteDialog } from '@/features/admin-detalhe/EnviarLembreteDialog';`;
- depois de `const pronta = posicaoDe(equipe) === POSICAO_PRONTA;`, acrescente `const ehAdmin = usuario?.role === 'admin';`;
- troque `{podeMover && <AvancarEtapa equipe={equipe} />}` por:

```tsx
        {podeMover && (
          <div className="flex flex-col gap-3">
            <AvancarEtapa equipe={equipe} />
            <div>
              <EnviarLembreteDialog equipeSlug={equipe.slug} />
            </div>
          </div>
        )}
```

- no array de `tabs`, depois da aba `linha`, acrescente:

```tsx
          ...(ehAdmin ? [{ id: 'gestao', label: 'Gestão', content: <GestaoEquipe equipe={equipe} /> }] : []),
```

- [ ] **Step 7: Rodar os testes**

Run: `npx vitest run tests/components/detalhe-equipe.test.tsx`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/data/api/consultas.ts src/features/admin-detalhe/GestaoEquipe.tsx src/features/admin-detalhe/EnviarLembreteDialog.tsx src/features/admin-detalhe/DetalheEquipe.tsx tests/components/detalhe-equipe.test.tsx
git commit -F - <<'EOF'
feat(telas): gestão da equipe (mentor e status) e envio de lembrete

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E9TXsEhLzvh1bBR9LeB58C
EOF
```

### Task 11: Chips de prazo + botão "Comecei" (B3, A3)

**Files:**
- Create: `frontend/src/domain/prazo.ts`
- Create: `frontend/src/design-system/components/PrazoChip.tsx`
- Modify: `frontend/src/data/api/consultas.ts` (`useIniciarTarefa`)
- Modify: `frontend/src/features/aluno-tarefas/MinhasTarefas.tsx` (`LinhaTarefa`)
- Modify: `frontend/src/features/admin-tarefas/TarefaList.tsx` (`TarefaItem`)
- Test: `frontend/tests/domain/prazo.test.tsx` (novo); modify `frontend/tests/components/aluno.test.tsx`

**Interfaces:**
- Consumes: `POST /tarefas/:slug/iniciar` (E1); `status` efetivo que o backend manda (RN-04); `useToast` (E2).
- Produces: `hojeISO(agora?: Date): string` e `textoPrazo(dataEntrega, status, hoje?)` em `domain/prazo.ts`; `PrazoChip({ dataEntrega, status, hoje?, className? })`; `useIniciarTarefa(equipeSlug)` → `mutate(tarefaSlug)`.

- [ ] **Step 1: Testes (falham)**

Crie `frontend/tests/domain/prazo.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { textoPrazo } from '@/domain/prazo';
import { PrazoChip } from '@/design-system/components/PrazoChip';

const HOJE = '2026-09-22';

describe('textoPrazo (B3)', () => {
  it('vence hoje / em 1 dia / em N dias', () => {
    expect(textoPrazo('2026-09-22T00:00:00.000Z', 'pendente', HOJE)).toBe('vence hoje');
    expect(textoPrazo('2026-09-23', 'em_andamento', HOJE)).toBe('vence em 1 dia');
    expect(textoPrazo('2026-09-30', 'ajustar', HOJE)).toBe('vence em 8 dias');
  });

  it('atrasada há N dias — o status "atrasada" vem do backend (RN-04)', () => {
    expect(textoPrazo('2026-09-21', 'atrasada', HOJE)).toBe('atrasada há 1 dia');
    expect(textoPrazo('2026-09-19', 'atrasada', HOJE)).toBe('atrasada há 3 dias');
  });

  it('não decide atraso sozinho nem mostra prazo de tarefa entregue/aprovada', () => {
    expect(textoPrazo('2026-09-10', 'ajustar', HOJE)).toBeNull();
    expect(textoPrazo('2026-09-30', 'entregue', HOJE)).toBeNull();
    expect(textoPrazo('2026-09-30', 'aprovada', HOJE)).toBeNull();
  });
});

describe('PrazoChip', () => {
  it('atrasada usa o tom de perigo do DS', () => {
    render(<PrazoChip dataEntrega="2026-09-19" status="atrasada" hoje={HOJE} />);
    expect(screen.getByText('atrasada há 3 dias').className).toContain('text-danger-text');
  });

  it('não renderiza nada para tarefa aprovada', () => {
    const { container } = render(<PrazoChip dataEntrega="2026-09-19" status="aprovada" hoje={HOJE} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

Em `frontend/tests/components/aluno.test.tsx`:

1. No `vi.mock('@/data/api/consultas', ...)`, acrescente `useIniciarTarefa: vi.fn(),`; no `import { ... } from '@/data/api/consultas';` acrescente `useIniciarTarefa`; acrescente `import { ApiError } from '@/data/api/erro';` junto dos imports.
2. Depois de `const adicionarMutate = vi.fn();`, acrescente `const iniciarMutate = vi.fn();`.
3. No fim de `mockPadrao()`, acrescente:

```tsx
  vi.mocked(useIniciarTarefa).mockReturnValue({ mutate: iniciarMutate, isPending: false } as unknown as R<
    typeof useIniciarTarefa
  >);
```

4. Dentro do `describe('MinhasTarefas', ...)`, acrescente:

```tsx
  it('"Comecei" só aparece na tarefa pendente e chama useIniciarTarefa().mutate(slug)', async () => {
    mockTarefas([
      tarefa({ slug: 't-1', status: 'pendente' }),
      tarefa({ slug: 't-2', titulo: 'Outra tarefa', status: 'em_andamento' }),
    ]);
    const user = userEvent.setup();
    render(<MinhasTarefas />);
    const botoes = screen.getAllByRole('button', { name: 'Comecei' });
    expect(botoes).toHaveLength(1);
    await user.click(botoes[0]!);
    expect(useIniciarTarefa).toHaveBeenCalledWith('agrosmart');
    expect(iniciarMutate).toHaveBeenCalledWith('t-1', expect.anything());
  });

  it('erro ao começar aparece inline com a mensagem da API', async () => {
    iniciarMutate.mockImplementationOnce((_s: unknown, opts?: { onError?: (e: unknown) => void }) =>
      opts?.onError?.(new ApiError(409, 'TAREFA_NAO_PENDENTE', 'Só dá para começar uma tarefa pendente')),
    );
    const user = userEvent.setup();
    render(<MinhasTarefas />);
    await user.click(screen.getByRole('button', { name: 'Comecei' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Só dá para começar uma tarefa pendente');
  });

  it('tarefa atrasada mostra o chip "atrasada há N dias"', () => {
    mockTarefas([tarefa({ status: 'atrasada', dataEntrega: '2026-09-01T00:00:00.000Z' })]);
    render(<MinhasTarefas />);
    expect(screen.getByText(/^atrasada há \d+ dias$/)).toBeInTheDocument();
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/domain/prazo.test.tsx tests/components/aluno.test.tsx`
Expected: FAIL — `@/domain/prazo` não existe; não há botão "Comecei".

- [ ] **Step 3: Formatação pura do prazo**

Crie `frontend/src/domain/prazo.ts`:

```ts
import type { StatusTarefa } from '@/domain/types';

// B3: chips de prazo. O STATUS (inclusive "atrasada", RN-04) vem do backend;
// aqui só se formata a diferença de dias entre hoje (fuso da AMF) e o prazo.

const FMT_SP = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** "Hoje" no fuso da AMF, como YYYY-MM-DD (o mesmo critério do backend). */
export function hojeISO(agora: Date = new Date()): string {
  return FMT_SP.format(agora);
}

const DIA_MS = 86_400_000;
const diasEntre = (de: string, ate: string) =>
  Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / DIA_MS);

const SEM_ENTREGA: StatusTarefa[] = ['pendente', 'em_andamento', 'ajustar'];

/** "vence hoje", "vence em N dias", "atrasada há N dias" — ou null (sem chip). */
export function textoPrazo(dataEntrega: string, status: StatusTarefa, hoje: string = hojeISO()): string | null {
  const data = dataEntrega.slice(0, 10);
  if (status === 'atrasada') {
    const n = Math.max(1, diasEntre(data, hoje));
    return n === 1 ? 'atrasada há 1 dia' : `atrasada há ${n} dias`;
  }
  if (!SEM_ENTREGA.includes(status)) return null;
  const n = diasEntre(hoje, data);
  if (n < 0) return null; // atraso quem decide é o backend
  if (n === 0) return 'vence hoje';
  return n === 1 ? 'vence em 1 dia' : `vence em ${n} dias`;
}
```

- [ ] **Step 4: Componente de DS `PrazoChip`**

Crie `frontend/src/design-system/components/PrazoChip.tsx`:

```tsx
import type { StatusTarefa } from '@/domain/types';
import { textoPrazo } from '@/domain/prazo';
import { cn } from '@/design-system/cn';

export interface PrazoChipProps {
  /** `dataEntrega` como a API manda (ISO; só o dia importa). */
  dataEntrega: string;
  status: StatusTarefa;
  /** Injetável para teste; padrão = hoje no fuso da AMF. */
  hoje?: string;
  className?: string;
}

/** Chip de prazo (B3) nas listas de tarefas. Não renderiza nada quando não há prazo a mostrar. */
export function PrazoChip({ dataEntrega, status, hoje, className }: PrazoChipProps) {
  const texto = textoPrazo(dataEntrega, status, hoje);
  if (!texto) return null;
  const tom =
    status === 'atrasada'
      ? 'bg-danger-soft text-danger-text'
      : texto === 'vence hoje'
        ? 'bg-primary-soft text-primary-text'
        : 'bg-surface-sunken text-text-muted';
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', tom, className)}>
      {texto}
    </span>
  );
}
```

- [ ] **Step 5: Hook `useIniciarTarefa`**

Em `frontend/src/data/api/consultas.ts`, logo depois de `useCriarTarefa`, acrescente:

```ts
/** A3/RF-12: o aluno marca "Comecei" (pendente → em andamento). */
export function useIniciarTarefa(equipeSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tarefaSlug: string) => api<Tarefa>(`/tarefas/${tarefaSlug}/iniciar`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: chaves.tarefas(equipeSlug) });
      void qc.invalidateQueries({ queryKey: chaves.equipe(equipeSlug) });
    },
  });
}
```

- [ ] **Step 6: Tarefas do aluno — chip + "Comecei"**

Em `frontend/src/features/aluno-tarefas/MinhasTarefas.tsx`:
- acrescente no topo `import { useState } from 'react';`, `import { PrazoChip } from '@/design-system/components/PrazoChip';` e `import { useToast } from '@/design-system/components/Toast';`;
- troque `import { useEntregas, useEquipe, useEquipes, useTarefas } from '@/data/api/consultas';` por `import { useEntregas, useEquipe, useEquipes, useIniciarTarefa, useTarefas } from '@/data/api/consultas';`;
- substitua a função `LinhaTarefa` inteira por:

```tsx
function LinhaTarefa({ tarefa, equipeSlug }: { tarefa: Tarefa; equipeSlug: string }) {
  const entregavel = tarefa.status !== 'aprovada';
  const entregasConsulta = useEntregas(tarefa.slug);
  const iniciar = useIniciarTarefa(equipeSlug);
  const toast = useToast();
  const [erroInicio, setErroInicio] = useState<string | null>(null);
  const entregas = [...(entregasConsulta.data ?? [])].sort((a, b) => a.versao - b.versao);
  const ultima = entregas[entregas.length - 1];
  const comentarioAjuste =
    tarefa.status === 'ajustar' ? (ultima?.avaliacoes[0]?.comentario ?? null) : null;

  function comecar() {
    setErroInicio(null);
    iniciar.mutate(tarefa.slug, {
      onSuccess: () => toast.sucesso('Tarefa marcada como em andamento.'),
      onError: (err) =>
        setErroInicio(err instanceof Error ? err.message : 'Não foi possível atualizar a tarefa.'),
    });
  }

  return (
    <li
      id={`tarefa-${tarefa.slug}`}
      className="flex scroll-mt-28 flex-col gap-2 rounded-lg border border-border bg-surface p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-2 font-medium text-text">
            {tarefa.titulo}
            {tarefa.obrigatoria && <Badge>obrigatória</Badge>}
          </span>
          <span className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
            Entrega até {formatarData(tarefa.dataEntrega.slice(0, 10))}
            <PrazoChip dataEntrega={tarefa.dataEntrega} status={tarefa.status} />
          </span>
        </div>
        <StatusBadge status={tarefa.status} />
      </div>
      {tarefa.descricao && <p className="text-sm text-text-muted">{tarefa.descricao}</p>}
      {comentarioAjuste && (
        <p
          className="rounded-md px-3 py-2 text-sm"
          style={{ color: 'var(--st-ajustar-fg)', background: 'var(--st-ajustar-bg)' }}
        >
          <span className="font-medium">Ajustes solicitados: </span>
          {comentarioAjuste}
        </p>
      )}
      {erroInicio && (
        <p
          role="alert"
          className="rounded-[0.625rem] bg-danger-soft px-3 py-2 text-sm font-medium text-danger-text"
        >
          {erroInicio}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {tarefa.status === 'pendente' && (
          <Button size="sm" variant="secondary" disabled={iniciar.isPending} onClick={comecar}>
            Comecei
          </Button>
        )}
        {entregavel && (
          <EnviarEntregaDialog
            tarefaSlug={tarefa.slug}
            equipeSlug={equipeSlug}
            tituloTarefa={tarefa.titulo}
          />
        )}
      </div>
    </li>
  );
}
```

Em `frontend/src/features/admin-tarefas/TarefaList.tsx`, acrescente `import { PrazoChip } from '@/design-system/components/PrazoChip';` e, em `TarefaItem`, troque:

```tsx
          <span className="text-xs text-text-muted">
            Entrega até {formatarData(tarefa.dataEntrega.slice(0, 10))}
          </span>
```

por:

```tsx
          <span className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
            Entrega até {formatarData(tarefa.dataEntrega.slice(0, 10))}
            <PrazoChip dataEntrega={tarefa.dataEntrega} status={tarefa.status} />
          </span>
```

- [ ] **Step 7: Rodar os testes**

Run: `npx vitest run tests/domain/prazo.test.tsx tests/components/aluno.test.tsx tests/components/entrega.test.tsx`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/domain/prazo.ts src/design-system/components/PrazoChip.tsx src/data/api/consultas.ts src/features/aluno-tarefas/MinhasTarefas.tsx src/features/admin-tarefas/TarefaList.tsx tests/domain/prazo.test.tsx tests/components/aluno.test.tsx
git commit -F - <<'EOF'
feat(telas): chips de prazo e botão "Comecei" nas tarefas

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E9TXsEhLzvh1bBR9LeB58C
EOF
```

### Task 12: Redefinição de senha — botão na tela Contas e página `/redefinir-senha` (A3)

**Files:**
- Create: `frontend/src/features/auth/RedefinirSenhaForm.tsx`
- Create: `frontend/src/app/redefinir-senha/page.tsx`
- Modify: `frontend/src/data/api/consultas.ts` (`useGerarRedefinicao`, `useRedefinirSenha`)
- Modify: `frontend/src/features/admin-contas/ContasAdmin.tsx`
- Test: `frontend/tests/components/redefinir-senha.test.tsx` (novo); modify `frontend/tests/components/contas.test.tsx`

**Interfaces:**
- Consumes: `POST /usuarios/:slug/redefinir-senha` → `{ link, expiraEm }` e `POST /auth/redefinir-senha` (E1); `CopiarLink`, `PasswordInput`, `useToast` (E2).
- Produces: `useGerarRedefinicao()` → `mutate(usuarioSlug)`; `useRedefinirSenha()` → `mutate({ token, senha })` (rota pública); `RedefinirSenhaForm()`; rota `/redefinir-senha?token=…`. A tela "recuperar senha" continua dizendo "fale com a coordenação" (sem mudança).

- [ ] **Step 1: Testes (falham)**

Crie `frontend/tests/components/redefinir-senha.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const nav = vi.hoisted(() => ({ busca: 'token=abc.def' }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(nav.busca),
}));
vi.mock('@/data/api/consultas', () => ({ useRedefinirSenha: vi.fn() }));

import { useRedefinirSenha } from '@/data/api/consultas';
import { ApiError } from '@/data/api/erro';
import { RedefinirSenhaForm } from '@/features/auth/RedefinirSenhaForm';

type R<T extends (...a: never[]) => unknown> = ReturnType<T>;
const mutate = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  nav.busca = 'token=abc.def';
  vi.mocked(useRedefinirSenha).mockReturnValue({ mutate, isPending: false } as unknown as R<
    typeof useRedefinirSenha
  >);
});

async function preencher(senha: string, confirma: string) {
  const user = userEvent.setup();
  render(<RedefinirSenhaForm />);
  await user.type(screen.getByLabelText('Nova senha'), senha);
  await user.type(screen.getByLabelText('Confirmar nova senha'), confirma);
  await user.click(screen.getByRole('button', { name: /salvar nova senha/i }));
}

describe('RedefinirSenhaForm (A3)', () => {
  it('sem ?token avisa que o link é inválido', () => {
    nav.busca = '';
    render(<RedefinirSenhaForm />);
    expect(screen.getByRole('alert')).toHaveTextContent('Link de redefinição inválido ou incompleto.');
  });

  it('usa PasswordInput na senha nova e na confirmação', () => {
    render(<RedefinirSenhaForm />);
    expect(screen.getAllByLabelText(/mostrar senha enquanto pressionado/i)).toHaveLength(2);
  });

  it('bloqueia senha com menos de 8 caracteres e confirmação diferente', async () => {
    await preencher('curta', 'outra');
    expect(screen.getByText('A senha deve ter ao menos 8 caracteres.')).toBeInTheDocument();
    expect(screen.getByText('As senhas não coincidem.')).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('envia { token, senha } e mostra o sucesso com o caminho para entrar', async () => {
    mutate.mockImplementationOnce((_b: unknown, opts?: { onSuccess?: () => void }) => opts?.onSuccess?.());
    await preencher('novaSenha123', 'novaSenha123');
    expect(mutate).toHaveBeenCalledWith({ token: 'abc.def', senha: 'novaSenha123' }, expect.anything());
    expect(screen.getByText(/senha redefinida/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^entrar$/i })).toHaveAttribute('href', '/login');
  });

  it('erro da API aparece inline com a mensagem dela', async () => {
    mutate.mockImplementationOnce((_b: unknown, opts?: { onError?: (e: unknown) => void }) =>
      opts?.onError?.(new ApiError(400, 'RESET_USED', 'Este link já foi usado')),
    );
    await preencher('novaSenha123', 'novaSenha123');
    expect(screen.getByRole('alert')).toHaveTextContent('Este link já foi usado');
  });
});
```

Em `frontend/tests/components/contas.test.tsx`:

1. No `vi.mock('@/data/api/consultas', ...)` acrescente `useGerarRedefinicao: vi.fn(),`; no `import { ... } from '@/data/api/consultas';` acrescente `useGerarRedefinicao`.
2. Depois de `const reenviar = vi.fn();`, acrescente `const gerarRedefinicao = vi.fn();`.
3. Troque o `beforeEach` do topo por:

```tsx
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useGerarRedefinicao).mockReturnValue({
    mutate: gerarRedefinicao,
    isPending: false,
  } as unknown as R<typeof useGerarRedefinicao>);
});
```

4. Dentro do `describe('ContasAdmin', ...)`, acrescente:

```tsx
  it('"Redefinir senha" só em conta ativa com convite aceito; mostra o link para copiar', async () => {
    mockPadraoAdmin();
    gerarRedefinicao.mockImplementationOnce((_slug: unknown, opts?: { onSuccess?: (r: unknown) => void }) =>
      opts?.onSuccess?.({ link: '/redefinir-senha?token=abc.def', expiraEm: '2026-09-23T12:00:00Z' }),
    );
    const user = userEvent.setup();
    render(<ContasAdmin />);

    const marina = screen.getByText('Marina Mentora').closest('li')!;
    expect(within(marina).queryByRole('button', { name: /redefinir senha/i })).not.toBeInTheDocument();

    const ana = screen.getByText('Ana Admin').closest('li')!;
    await user.click(within(ana).getByRole('button', { name: /redefinir senha/i }));
    expect(gerarRedefinicao).toHaveBeenCalledWith('admin-1', expect.anything());
    expect(within(ana).getByDisplayValue(/\/redefinir-senha\?token=abc\.def$/)).toBeInTheDocument();
  });

  it('erro ao gerar o link de redefinição aparece como alerta', async () => {
    mockPadraoAdmin();
    gerarRedefinicao.mockImplementationOnce((_slug: unknown, opts?: { onError?: (e: unknown) => void }) =>
      opts?.onError?.(new ApiError(409, 'CONVITE_PENDENTE', 'A pessoa ainda não aceitou o convite')),
    );
    const user = userEvent.setup();
    render(<ContasAdmin />);
    const ana = screen.getByText('Ana Admin').closest('li')!;
    await user.click(within(ana).getByRole('button', { name: /redefinir senha/i }));
    expect(screen.getByRole('alert')).toHaveTextContent('A pessoa ainda não aceitou o convite');
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/components/redefinir-senha.test.tsx tests/components/contas.test.tsx`
Expected: FAIL — `RedefinirSenhaForm` não existe; não há botão "Redefinir senha".

- [ ] **Step 3: Hooks**

Em `frontend/src/data/api/consultas.ts`, logo depois de `useReenviarConvite`, acrescente:

```ts
/** A3/RF-01: admin gera o link de uso único (24 h) para a pessoa definir outra senha. */
export function useGerarRedefinicao() {
  return useMutation({
    mutationFn: (slug: string) =>
      api<{ link: string; expiraEm: string }>(`/usuarios/${slug}/redefinir-senha`, { method: 'POST' }),
  });
}

/** A3/RF-01: a pessoa troca a senha pelo link (rota pública; 204). */
export function useRedefinirSenha() {
  return useMutation({
    mutationFn: (b: { token: string; senha: string }) =>
      api<void>('/auth/redefinir-senha', { method: 'POST', body: b, publica: true }),
  });
}
```

- [ ] **Step 4: Formulário e página `/redefinir-senha`**

Crie `frontend/src/features/auth/RedefinirSenhaForm.tsx`:

```tsx
'use client';

import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRedefinirSenha } from '@/data/api/consultas';
import { Card } from '@/design-system/components/Card';
import { Button } from '@/design-system/components/Button';
import { PasswordInput } from '@/design-system/components/PasswordInput';
import { FormField } from '@/design-system/components/FormField';
import { AlertIcon, CheckIcon } from '@/design-system/icons';

const MINIMO = 8;

/**
 * A3/RF-01: a pessoa abre o link que a coordenação gerou
 * (/redefinir-senha?token=…) e define a senha nova, com confirmação. Quem
 * valida o token (uso único, 24 h) é o backend; o erro dele aparece inline.
 */
export function RedefinirSenhaForm() {
  const token = useSearchParams().get('token') ?? '';
  const redefinir = useRedefinirSenha();
  const [senha, setSenha] = useState('');
  const [confirma, setConfirma] = useState('');
  const [erros, setErros] = useState<{ senha?: string; confirma?: string }>({});
  const [erroApi, setErroApi] = useState<string | null>(null);
  const [concluido, setConcluido] = useState(false);

  if (!token) {
    return (
      <Card className="w-full overflow-hidden shadow-md">
        <Card.Body className="flex flex-col gap-4 p-7">
          <p
            role="alert"
            className="flex items-center gap-2 rounded-[0.625rem] bg-danger-soft px-3 py-2 text-sm font-medium text-danger-text"
          >
            <AlertIcon size={16} className="shrink-0" />
            Link de redefinição inválido ou incompleto.
          </p>
          <a href="/login" className="text-center text-sm text-primary-text hover:underline">
            Voltar ao login
          </a>
        </Card.Body>
      </Card>
    );
  }

  if (concluido) {
    return (
      <Card className="w-full overflow-hidden shadow-md">
        <Card.Body className="flex flex-col gap-4 p-7">
          <p className="flex items-center gap-2 rounded-[0.625rem] bg-success-soft px-3 py-2 text-sm font-medium text-success-text">
            <CheckIcon size={16} className="shrink-0" />
            Senha redefinida. Entre com a senha nova.
          </p>
          <a href="/login" className="text-center text-sm text-primary-text hover:underline">
            Entrar
          </a>
        </Card.Body>
      </Card>
    );
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    const novos: { senha?: string; confirma?: string } = {};
    if (senha.length < MINIMO) novos.senha = `A senha deve ter ao menos ${MINIMO} caracteres.`;
    if (confirma !== senha) novos.confirma = 'As senhas não coincidem.';
    setErros(novos);
    if (novos.senha || novos.confirma) return;
    setErroApi(null);
    redefinir.mutate(
      { token, senha },
      {
        onSuccess: () => setConcluido(true),
        onError: (err) => setErroApi(err instanceof Error ? err.message : 'Não foi possível redefinir a senha.'),
      },
    );
  }

  return (
    <Card className="w-full overflow-hidden shadow-md">
      <Card.Body className="flex flex-col gap-5 p-7">
        <h1 className="text-xl font-semibold text-text">Definir nova senha</h1>
        <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
          <FormField label="Nova senha" htmlFor="rs-senha" hint={`Mínimo ${MINIMO} caracteres`} error={erros.senha}>
            <PasswordInput
              id="rs-senha"
              autoComplete="new-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </FormField>
          <FormField label="Confirmar nova senha" htmlFor="rs-confirma" error={erros.confirma}>
            <PasswordInput
              id="rs-confirma"
              autoComplete="new-password"
              value={confirma}
              onChange={(e) => setConfirma(e.target.value)}
            />
          </FormField>
          {erroApi && (
            <p
              role="alert"
              className="flex items-center gap-2 rounded-[0.625rem] bg-danger-soft px-3 py-2 text-sm font-medium text-danger-text"
            >
              <AlertIcon size={16} className="shrink-0" />
              {erroApi}
            </p>
          )}
          <Button type="submit" disabled={redefinir.isPending}>
            {redefinir.isPending ? 'Salvando…' : 'Salvar nova senha'}
          </Button>
        </form>
        <a href="/login" className="text-center text-sm text-primary-text hover:underline">
          Voltar ao login
        </a>
      </Card.Body>
    </Card>
  );
}
```

Crie `frontend/src/app/redefinir-senha/page.tsx`:

```tsx
import { Suspense } from 'react';
import { AuthLayout } from '@/features/auth/AuthLayout';
import { RedefinirSenhaForm } from '@/features/auth/RedefinirSenhaForm';

export default function RedefinirSenhaPage() {
  return (
    <AuthLayout formWidth="sm">
      {/* RedefinirSenhaForm usa useSearchParams (?token=) → precisa de Suspense */}
      <Suspense fallback={null}>
        <RedefinirSenhaForm />
      </Suspense>
    </AuthLayout>
  );
}
```

- [ ] **Step 5: Botão "Redefinir senha" na tela Contas**

Em `frontend/src/features/admin-contas/ContasAdmin.tsx`:
- troque o import de hooks por `import { useCriarUsuario, useEditarUsuario, useGerarRedefinicao, useReenviarConvite, useUsuarios } from '@/data/api/consultas';` e acrescente `import { useToast } from '@/design-system/components/Toast';`;
- depois de `const reenviar = useReenviarConvite();`, acrescente:

```tsx
  const gerarRedefinicao = useGerarRedefinicao();
  const toast = useToast();
```

- depois de `const [erroAcao, setErroAcao] = useState<string | null>(null);`, acrescente:

```tsx
  const [linkRedefinicao, setLinkRedefinicao] = useState<{ slug: string; url: string } | null>(null);
```

- depois da função `novoLink`, acrescente:

```tsx
  function gerarLinkRedefinicao(u: UsuarioAdmin) {
    setLinkRedefinicao(null);
    setErroAcao(null);
    gerarRedefinicao.mutate(u.slug, {
      onSuccess: (r) => {
        setLinkRedefinicao({ slug: u.slug, url: r.link });
        toast.sucesso('Link de redefinição gerado — vale 24 h.');
      },
      onError: (err) => setErroAcao(err instanceof Error ? err.message : 'Não foi possível gerar o link.'),
    });
  }
```

- logo depois do bloco `{!u.conviteAceito && ( <Button ...>Novo link</Button> )}`, acrescente:

```tsx
                  {u.ativo && u.conviteAceito && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={gerarRedefinicao.isPending}
                      onClick={() => gerarLinkRedefinicao(u)}
                    >
                      Redefinir senha
                    </Button>
                  )}
```

- logo depois do bloco `{linkPendente?.slug === u.slug && ( ... )}`, acrescente:

```tsx
              {linkRedefinicao?.slug === u.slug && (
                <div className="flex flex-col gap-1.5 border-t border-border pt-2">
                  <p className="text-xs text-text-muted">
                    Envie este link para a pessoa definir uma senha nova (uso único, vale 24 h).
                  </p>
                  <CopiarLink url={linkRedefinicao.url} rotulo={`Link de redefinição de ${u.nome}`} />
                </div>
              )}
```

- [ ] **Step 6: Rodar os testes**

Run: `npx vitest run tests/components/redefinir-senha.test.tsx tests/components/contas.test.tsx tests/components/recuperar.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/data/api/consultas.ts src/features/auth/RedefinirSenhaForm.tsx src/app/redefinir-senha/page.tsx src/features/admin-contas/ContasAdmin.tsx tests/components/redefinir-senha.test.tsx tests/components/contas.test.tsx
git commit -F - <<'EOF'
feat(telas): redefinição de senha pelo link gerado pela coordenação

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E9TXsEhLzvh1bBR9LeB58C
EOF
```

### Task 13: Toasts de sucesso e skeletons aplicados nas telas (B2)

**Files:**
- Modify: `frontend/src/features/admin-tarefas/NovaTarefaDialog.tsx`, `frontend/src/features/aluno-tarefas/EnviarEntregaDialog.tsx`, `frontend/src/features/admin-tarefas/AvaliarEntrega.tsx`, `frontend/src/features/funil/DialogoMover.tsx`, `frontend/src/features/equipe/AdicionarMembroDialog.tsx`, `frontend/src/features/conta/ContaPerfil.tsx`, `frontend/src/features/admin-contas/ContasAdmin.tsx` (toasts)
- Modify: `frontend/src/features/funil/FunilBoard.tsx`, `frontend/src/features/admin-detalhe/DetalheEquipe.tsx`, `frontend/src/features/aluno-tarefas/MinhasTarefas.tsx`, `frontend/src/features/admin-tarefas/TarefaList.tsx`, `frontend/src/features/admin-dashboard/DashboardIndicadores.tsx`, `frontend/src/features/orientador/PainelOrientador.tsx`, `frontend/src/features/aluno-equipe/MinhaEquipe.tsx`, `frontend/src/features/admin-contas/ContasAdmin.tsx` (skeletons)
- Test: modify `frontend/tests/components/contas.test.tsx`, `frontend/tests/components/entrega.test.tsx`, `frontend/tests/components/detalhe-equipe.test.tsx`

**Interfaces:**
- Consumes: `useToast`, `Skeleton` (Task 7); `const toast = useToast()` que a Task 12 já pôs em `ContasAdmin`.
- Produces: mensagens de sucesso — criar tarefa "Tarefa criada."; enviar entrega "Entrega enviada para avaliação."; avaliar "Entrega aprovada." / "Ajustes solicitados à equipe."; mover etapa "`<ideia>` movida para `<destino>`."; adicionar integrante "`<nome>` adicionado(a) à equipe."; salvar perfil "Dados atualizados."; trocar senha "Senha alterada."; criar conta "Conta de `<nome>` criada." (as de mentor/status, lembrete, "Comecei" e redefinição já vieram nas Tasks 10–12). Erros continuam inline com `role="alert"`.

- [ ] **Step 1: Testes (falham)**

Em `frontend/tests/components/contas.test.tsx`, acrescente `import { ToastProvider } from '@/design-system/components/Toast';` e, no fim do `describe('ContaPerfil', ...)`, acrescente:

```tsx
  it('salvar dados confirma com toast (sucesso não vira alerta)', async () => {
    mockPadraoConta();
    atualizarMe.mockImplementationOnce((_b: unknown, opts?: { onSuccess?: () => void }) => opts?.onSuccess?.());
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <ContaPerfil />
      </ToastProvider>,
    );
    await user.click(screen.getByRole('button', { name: /salvar dados/i }));
    expect(screen.getByRole('status')).toHaveTextContent('Dados atualizados.');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
```

Em `frontend/tests/components/entrega.test.tsx`, acrescente `import { ToastProvider } from '@/design-system/components/Toast';` e, dentro do `describe('AvaliarEntrega', ...)`, acrescente:

```tsx
  it('aprovar confirma com toast', async () => {
    avaliarMutate.mockImplementationOnce((_b: unknown, opts?: { onSuccess?: () => void }) => opts?.onSuccess?.());
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <TarefaList equipe={EQUIPE} />
      </ToastProvider>,
    );
    await user.click(screen.getByRole('button', { name: /^aprovar$/i }));
    expect(screen.getByRole('status')).toHaveTextContent('Entrega aprovada.');
  });
```

Em `frontend/tests/components/detalhe-equipe.test.tsx`, no teste `it('carregando mostra "Carregando…"', ...)`, acrescente depois do `expect(...)` existente:

```tsx
    expect(screen.getByRole('status')).toHaveTextContent('Carregando…');
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/components/contas.test.tsx tests/components/entrega.test.tsx tests/components/detalhe-equipe.test.tsx`
Expected: FAIL — nenhum `role="status"` com a mensagem de sucesso; no detalhe, "Carregando…" ainda é um `<p>` sem `role="status"`.

- [ ] **Step 3: Toasts nas ações**

Em cada arquivo abaixo, acrescente `import { useToast } from '@/design-system/components/Toast';` e declare `const toast = useToast();` logo depois do hook de mutação indicado:

1. `NovaTarefaDialog.tsx` (depois de `const criar = useCriarTarefa(equipeSlug);`): troque `onSuccess: () => fechar(),` por:

```tsx
      onSuccess: () => {
        fechar();
        toast.sucesso('Tarefa criada.');
      },
```

2. `EnviarEntregaDialog.tsx` (depois de `const enviar = useEnviarEntrega(tarefaSlug, equipeSlug);`): troque `onSuccess: fechar,` por:

```tsx
        onSuccess: () => {
          fechar();
          toast.sucesso('Entrega enviada para avaliação.');
        },
```

3. `AvaliarEntrega.tsx` (depois de `const avaliar = useAvaliar(tarefa.slug, equipeSlug);`): em `aprovar()`, troque o segundo argumento do `avaliar.mutate(...)` por:

```tsx
      {
        onSuccess: () => toast.sucesso('Entrega aprovada.'),
        onError: (err) => setErro(err instanceof Error ? err.message : 'Não foi possível avaliar a entrega.'),
      },
```

e, em `solicitarAjustes()`, dentro do `onSuccess`, acrescente `toast.sucesso('Ajustes solicitados à equipe.');` depois de `setComentario('');`.

4. `DialogoMover.tsx` (depois de `const mover = useMoverEtapa(equipe.slug);`): troque `onSuccess: () => onClose(),` por:

```tsx
      onSuccess: () => {
        toast.sucesso(`${equipe.nomeIdeia} movida para ${destinoLabel}.`);
        onClose();
      },
```

5. `AdicionarMembroDialog.tsx` (depois de `const adicionar = useAdicionarMembro(equipeSlug);`): troque `onSuccess: (r) => setCriado(r),` por:

```tsx
        onSuccess: (r) => {
          setCriado(r);
          toast.sucesso(`${r.nome} adicionado(a) à equipe.`);
        },
```

6. `ContaPerfil.tsx` (depois de `const trocarSenha = useTrocarSenha();`): em `salvarDados`, troque `onSuccess: () => setMsgDados({ ok: true, texto: 'Dados atualizados.' }),` por `onSuccess: () => toast.sucesso('Dados atualizados.'),`; em `alterarSenha`, dentro do `onSuccess`, troque `setMsgSenha({ ok: true, texto: 'Senha alterada.' });` por `toast.sucesso('Senha alterada.');`.

7. `ContasAdmin.tsx` (o `toast` já existe desde a Task 12): em `salvar`, troque `onSuccess: (r) => setConviteCriado({ nome: r.nome, url: r.conviteUrl }),` por:

```tsx
        onSuccess: (r) => {
          setConviteCriado({ nome: r.nome, url: r.conviteUrl });
          toast.sucesso(`Conta de ${r.nome} criada.`);
        },
```

- [ ] **Step 4: Skeletons no lugar de "Carregando…"**

Em cada arquivo, acrescente `import { Skeleton } from '@/design-system/components/Skeleton';` e troque:

1. `FunilBoard.tsx`: `<p className="px-1 py-10 text-center text-sm text-text-muted">Carregando…</p>` → `<Skeleton linhas={5} className="px-1 py-6" />`
2. `DetalheEquipe.tsx`: `return <p className="text-sm text-text-muted">Carregando…</p>;` → `return <Skeleton linhas={6} />;`
3. `MinhasTarefas.tsx` (em `CarregandoOuErro`): `if (isPending) return <p className="text-sm text-text-muted">Carregando…</p>;` → `if (isPending) return <Skeleton linhas={4} />;`
4. `TarefaList.tsx`: `<p className="text-sm text-text-muted">Carregando…</p>` → `<Skeleton linhas={3} />`
5. `DashboardIndicadores.tsx` (em `CarregandoOuErro`): `if (isPending) return <p className="text-sm text-text-muted">Carregando…</p>;` → `if (isPending) return <Skeleton linhas={4} />;`
6. `PainelOrientador.tsx` (em `CarregandoOuErro`): a mesma troca do item 5.
7. `MinhaEquipe.tsx` (em `CarregandoOuErro`): `if (isPending) return <p className="text-sm text-text-muted">Carregando…</p>;` → `if (isPending) return <Skeleton linhas={5} />;`
8. `ContasAdmin.tsx`: `<p className="px-1 py-10 text-center text-sm text-text-muted">Carregando…</p>` → `<Skeleton linhas={4} className="px-1 py-6" />`

(O `Skeleton` mantém "Carregando…" para leitor de tela, então os testes existentes de carregamento seguem válidos.)

- [ ] **Step 5: Rodar a suíte e o build**

Run: `npm test && npm run build`
Expected: todos PASS; `next build` sem erro de tipo nem de lint (nenhum import sobrando).

- [ ] **Step 6: Commit**

```bash
git add src/features tests/components/contas.test.tsx tests/components/entrega.test.tsx tests/components/detalhe-equipe.test.tsx
git commit -F - <<'EOF'
feat(telas): toasts de sucesso e skeletons de carregamento

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E9TXsEhLzvh1bBR9LeB58C
EOF
```

### Fechamento do Bloco E3 — PR para `staging`

- [ ] Rodar a suíte e o build (dentro de `frontend/`):

Run: `npm test && npm run build`
Expected: testes PASS; `next build` OK.

- [ ] Abrir o PR (base **`staging`**):

```bash
git push -u origin feat/g1-e3-telas
gh pr create --base staging --title "feat: G1 E3 — gestão, linha do tempo, próximo passo, prazos e senha" --body "$(cat <<'EOF'
## Resumo
- Admin: aba "Gestão" (mentor e status) no detalhe; admin e mentor: "Enviar lembrete" (até 500 caracteres)
- Linha do tempo no detalhe (substitui "Histórico") e resumida em "Minha equipe"; card "Próximo passo" com as pendências da API (RN-01/RN-02)
- `DialogoMover` trata 409 RN02_PENDENCIAS e a pendência de entregável ausente
- Chips de prazo nas listas de tarefas e botão "Comecei"
- Contas: "Redefinir senha" gera link (CopiarLink); página /redefinir-senha com PasswordInput + confirmação
- Toasts de sucesso e skeletons nas telas pedidas

## Testes
- `npm test` e `npm run build` verdes

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01E9TXsEhLzvh1bBR9LeB58C
EOF
)"
```

Aguardar aprovação e merge antes do Bloco E4.

## Bloco E4 — Busca rápida

Branch do bloco (depois do merge do E3):

```bash
git fetch origin && git switch -c feat/g1-e4-busca origin/staging
cd frontend && npm ci
```

### Task 14: Busca rápida Ctrl+K / ⌘K para admin e mentor (B4)

**Files:**
- Create: `frontend/src/features/shell/busca.ts`
- Create: `frontend/src/features/shell/BuscaRapida.tsx`
- Modify: `frontend/src/design-system/icons.tsx` (`SearchIcon`)
- Modify: `frontend/src/data/api/consultas.ts` (`useUsuarios` aceita `{ enabled }`)
- Modify: `frontend/src/features/shell/AppShell.tsx`
- Modify: `frontend/src/features/admin-contas/ContasAdmin.tsx` (âncora `conta-<slug>`)
- Test: `frontend/tests/components/busca-rapida.test.tsx` (novo)

**Interfaces:**
- Consumes: `useEquipes()` (já no escopo do papel pelo backend), `useUsuarios()` (lista de contas, só admin), `Dialog` (Radix: foco preso, Esc fecha), `Input`.
- Produces: `filtrarResultados({ termo, papel, equipes, pessoas }): ResultadoBusca[]` (`ResultadoBusca = { chave; titulo; subtitulo; href }`, até `LIMITE_RESULTADOS = 8`); `BuscaRapida({ papel: 'admin' | 'mentor' })`; `useUsuarios(tipo?, opcoes: { enabled?: boolean } = {})`; âncora `id="conta-<slug>"` nas linhas de Contas.

- [ ] **Step 1: Teste (falha)**

Crie `frontend/tests/components/busca-rapida.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));
vi.mock('@/data/api/consultas', () => ({ useEquipes: vi.fn(), useUsuarios: vi.fn() }));

import { useEquipes, useUsuarios } from '@/data/api/consultas';
import type { EquipeResumo, UsuarioAdmin } from '@/data/api/tipos';
import { BuscaRapida } from '@/features/shell/BuscaRapida';
import { filtrarResultados } from '@/features/shell/busca';

type R<T extends (...a: never[]) => unknown> = ReturnType<T>;

function equipe(slug: string, nomeIdeia: string): EquipeResumo {
  return {
    slug, nomeIdeia, descricaoIdeia: '', status: 'ativa', estagio: 'ideia',
    etapa: { numero: 2, nome: 'Contato com a equipe' }, area: null, ciclo: null, mentor: null, lider: null,
    membrosCount: 3, tarefasAtrasadas: 0, criadoEm: '2026-09-01T00:00:00Z',
  };
}
const EQUIPES = [equipe('ecorota', 'EcoRota'), equipe('ecologia', 'Ecologia Já'), equipe('saudeja', 'SaúdeJá')];
const PESSOAS: UsuarioAdmin[] = [
  { slug: 'carla', nome: 'Carla Menezes', email: 'mentor1@demo.infohub.dev', telefone: '', role: 'mentor', ativo: true, conviteAceito: true },
  { slug: 'bruna', nome: 'Bruna Lopes', email: 'bruna.lopes@demo.infohub.dev', telefone: '', role: 'aluno', ativo: true, conviteAceito: true },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useEquipes).mockReturnValue({ data: EQUIPES } as unknown as R<typeof useEquipes>);
  vi.mocked(useUsuarios).mockReturnValue({ data: PESSOAS } as unknown as R<typeof useUsuarios>);
});

async function abrir(papel: 'admin' | 'mentor' = 'admin') {
  const user = userEvent.setup();
  render(<BuscaRapida papel={papel} />);
  await user.keyboard('{Control>}k{/Control}');
  return user;
}

describe('BuscaRapida (B4)', () => {
  it('Ctrl+K abre o diálogo com o campo de busca focado', async () => {
    const user = userEvent.setup();
    render(<BuscaRapida papel="admin" />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.keyboard('{Control>}k{/Control}');
    expect(screen.getByRole('dialog', { name: 'Busca rápida' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Buscar' })).toHaveFocus());
  });

  it('a lupa do topo também abre', async () => {
    const user = userEvent.setup();
    render(<BuscaRapida papel="admin" />);
    await user.click(screen.getByRole('button', { name: 'Busca rápida' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('filtra equipes pelo nome (sem acento); Enter navega e fecha', async () => {
    const user = await abrir();
    await user.type(screen.getByRole('combobox', { name: 'Buscar' }), 'saude');
    const opcoes = screen.getAllByRole('option');
    expect(opcoes).toHaveLength(1);
    expect(opcoes[0]).toHaveTextContent('SaúdeJá');
    await user.keyboard('{Enter}');
    expect(push).toHaveBeenCalledWith('/admin/equipes/saudeja');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('setas mudam a opção ativa', async () => {
    const user = await abrir();
    await user.type(screen.getByRole('combobox', { name: 'Buscar' }), 'eco');
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowDown}');
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Enter}');
    expect(push).toHaveBeenCalledWith('/admin/equipes/ecologia');
  });

  it('admin acha contas por e-mail e vai para a linha delas em Contas', async () => {
    const user = await abrir();
    await user.type(screen.getByRole('combobox', { name: 'Buscar' }), 'mentor1');
    expect(screen.getByRole('option')).toHaveTextContent('Carla Menezes');
    await user.keyboard('{Enter}');
    expect(push).toHaveBeenCalledWith('/admin/contas#conta-carla');
  });

  it('mentor: só equipes, sem consultar contas', async () => {
    const user = await abrir('mentor');
    expect(useUsuarios).toHaveBeenCalledWith(undefined, { enabled: false });
    await user.type(screen.getByRole('combobox', { name: 'Buscar' }), 'ecorota');
    await user.keyboard('{Enter}');
    expect(push).toHaveBeenCalledWith('/orientador/equipes/ecorota');
  });

  it('Esc fecha o diálogo', async () => {
    const user = await abrir();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('filtrarResultados', () => {
  it('termo vazio não lista nada; mentor não recebe pessoas; aluno não é "pessoa"', () => {
    expect(filtrarResultados({ termo: '  ', papel: 'admin', equipes: EQUIPES, pessoas: PESSOAS })).toEqual([]);
    expect(filtrarResultados({ termo: 'carla', papel: 'mentor', equipes: EQUIPES, pessoas: PESSOAS })).toEqual([]);
    expect(filtrarResultados({ termo: 'bruna', papel: 'admin', equipes: EQUIPES, pessoas: PESSOAS })).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/components/busca-rapida.test.tsx`
Expected: FAIL — não resolve `@/features/shell/BuscaRapida`.

- [ ] **Step 3: Filtro puro**

Crie `frontend/src/features/shell/busca.ts`:

```ts
import type { EquipeResumo, UsuarioAdmin } from '@/data/api/tipos';

export interface ResultadoBusca {
  chave: string;
  titulo: string;
  subtitulo: string;
  href: string;
}

export const LIMITE_RESULTADOS = 8;

/** Sem acento e minúsculo: "SaúdeJá" casa com "saude". */
export const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * B4: filtra o que as listas do papel já trouxeram (o escopo é do backend).
 * Equipes pelo nome da ideia; para o admin, também contas de admin/mentor por
 * nome ou e-mail (aluno não tem tela própria — acha-se pela equipe).
 */
export function filtrarResultados(p: {
  termo: string;
  papel: 'admin' | 'mentor';
  equipes: EquipeResumo[];
  pessoas: UsuarioAdmin[];
}): ResultadoBusca[] {
  const t = normalizar(p.termo.trim());
  if (!t) return [];
  const base = p.papel === 'admin' ? '/admin/equipes' : '/orientador/equipes';
  const equipes = p.equipes
    .filter((e) => normalizar(e.nomeIdeia).includes(t))
    .map((e) => ({
      chave: `equipe-${e.slug}`,
      titulo: e.nomeIdeia,
      subtitulo: `Equipe · Etapa ${e.etapa.numero}`,
      href: `${base}/${e.slug}`,
    }));
  const pessoas =
    p.papel !== 'admin'
      ? []
      : p.pessoas
          .filter(
            (u) =>
              (u.role === 'admin' || u.role === 'mentor') &&
              (normalizar(u.nome).includes(t) || normalizar(u.email).includes(t)),
          )
          .map((u) => ({
            chave: `pessoa-${u.slug}`,
            titulo: u.nome,
            subtitulo: u.email,
            href: `/admin/contas#conta-${u.slug}`,
          }));
  return [...equipes, ...pessoas].slice(0, LIMITE_RESULTADOS);
}
```

- [ ] **Step 4: Ícone e `useUsuarios` com `enabled`**

Em `frontend/src/design-system/icons.tsx`, no fim:

```tsx
export function SearchIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
```

Em `frontend/src/data/api/consultas.ts`, substitua `useUsuarios` por:

```ts
export const useUsuarios = (tipo?: 'admin' | 'mentor' | 'aluno', opcoes: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: chaves.usuarios(tipo),
    queryFn: () => api<Pagina<UsuarioAdmin>>(`/usuarios${qs({ tipo, perPage: 100 })}`).then((r) => r.data),
    // GET /usuarios é só do admin: quem não é admin passa enabled=false.
    enabled: opcoes.enabled ?? true,
  });
```

- [ ] **Step 5: Componente `BuscaRapida`**

Crie `frontend/src/features/shell/BuscaRapida.tsx`:

```tsx
'use client';

import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useEquipes, useUsuarios } from '@/data/api/consultas';
import { Dialog } from '@/design-system/components/primitives/Dialog';
import { Input } from '@/design-system/components/Input';
import { SearchIcon } from '@/design-system/icons';
import { cn } from '@/design-system/cn';
import { filtrarResultados, type ResultadoBusca } from '@/features/shell/busca';

type Papel = 'admin' | 'mentor';

/**
 * Busca rápida (B4) para admin e mentor: Ctrl+K / ⌘K ou a lupa do topo.
 * Diálogo Radix (foco preso, Esc fecha); setas escolhem, Enter navega.
 */
export function BuscaRapida({ papel }: { papel: Papel }) {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    function atalho(e: globalThis.KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setAberto(true);
      }
    }
    window.addEventListener('keydown', atalho);
    return () => window.removeEventListener('keydown', atalho);
  }, []);

  return (
    <>
      <button
        type="button"
        aria-label="Busca rápida"
        aria-keyshortcuts="Control+K Meta+K"
        title="Busca rápida (Ctrl+K)"
        onClick={() => setAberto(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
      >
        <SearchIcon size={18} />
      </button>
      {aberto && <PainelBusca papel={papel} onFechar={() => setAberto(false)} />}
    </>
  );
}

// Só monta quando aberto: as listas não são buscadas à toa em toda tela.
function PainelBusca({ papel, onFechar }: { papel: Papel; onFechar: () => void }) {
  const router = useRouter();
  const equipes = useEquipes();
  const pessoas = useUsuarios(undefined, { enabled: papel === 'admin' });
  const [termo, setTermo] = useState('');
  const [ativo, setAtivo] = useState(0);
  const listaId = useId();

  const resultados = filtrarResultados({
    termo,
    papel,
    equipes: equipes.data ?? [],
    pessoas: pessoas.data ?? [],
  });
  const idOpcao = (i: number) => `${listaId}-${i}`;

  function ir(r: ResultadoBusca) {
    onFechar();
    router.push(r.href);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAtivo((i) => Math.min(i + 1, resultados.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setAtivo((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      const r = resultados[ativo];
      if (r) {
        e.preventDefault();
        ir(r);
      }
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onFechar();
      }}
      title="Busca rápida"
      description={
        papel === 'admin'
          ? 'Equipes pelo nome da ideia e contas por nome ou e-mail.'
          : 'Suas equipes pelo nome da ideia.'
      }
    >
      <div className="flex flex-col gap-3">
        <Input
          role="combobox"
          aria-label="Buscar"
          aria-expanded={resultados.length > 0}
          aria-controls={listaId}
          aria-autocomplete="list"
          aria-activedescendant={resultados[ativo] ? idOpcao(ativo) : undefined}
          placeholder="Digite para buscar…"
          value={termo}
          onChange={(e) => {
            setTermo(e.target.value);
            setAtivo(0);
          }}
          onKeyDown={onKeyDown}
        />
        {termo.trim() !== '' && resultados.length === 0 && (
          <p role="status" className="px-1 text-sm text-text-muted">
            Nada encontrado para “{termo.trim()}”.
          </p>
        )}
        <ul
          id={listaId}
          role="listbox"
          aria-label="Resultados"
          className="flex max-h-72 flex-col gap-1 overflow-y-auto"
        >
          {resultados.map((r, i) => (
            <li
              key={r.chave}
              id={idOpcao(i)}
              role="option"
              aria-selected={i === ativo}
              onMouseEnter={() => setAtivo(i)}
              onClick={() => ir(r)}
              className={cn(
                'flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm',
                i === ativo ? 'bg-primary-soft text-primary-text' : 'text-text hover:bg-surface-sunken',
              )}
            >
              <span className="truncate font-medium">{r.titulo}</span>
              <span className="shrink-0 text-xs text-text-muted">{r.subtitulo}</span>
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  );
}
```

- [ ] **Step 6: Encaixar no `AppShell` e ancorar as contas**

Em `frontend/src/features/shell/AppShell.tsx`, acrescente `import { BuscaRapida } from '@/features/shell/BuscaRapida';` e, antes da linha `{usuario && <SinoNotificacoes usuario={usuario} />}`, acrescente:

```tsx
            {usuario && (usuario.role === 'admin' || usuario.role === 'mentor') && (
              <BuscaRapida papel={usuario.role} />
            )}
```

Em `frontend/src/features/admin-contas/ContasAdmin.tsx`, troque a abertura do `<li key={u.slug} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">` por:

```tsx
            <li
              key={u.slug}
              id={`conta-${u.slug}`}
              className="flex scroll-mt-28 flex-col gap-2 rounded-lg border border-border bg-surface p-3"
            >
```

- [ ] **Step 7: Rodar os testes**

Run: `npx vitest run tests/components/busca-rapida.test.tsx tests/components/contas.test.tsx tests/components/funil.test.tsx tests/components/kanban.test.tsx`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/features/shell/busca.ts src/features/shell/BuscaRapida.tsx src/design-system/icons.tsx src/data/api/consultas.ts src/features/shell/AppShell.tsx src/features/admin-contas/ContasAdmin.tsx tests/components/busca-rapida.test.tsx
git commit -F - <<'EOF'
feat(shell): busca rápida Ctrl+K para admin e mentor

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E9TXsEhLzvh1bBR9LeB58C
EOF
```

### Fechamento do Bloco E4 — PR para `staging`

- [ ] Rodar a suíte e o build (dentro de `frontend/`):

Run: `npm test && npm run build`
Expected: testes PASS; `next build` OK.

- [ ] Abrir o PR (base **`staging`**):

```bash
git push -u origin feat/g1-e4-busca
gh pr create --base staging --title "feat: G1 E4 — busca rápida Ctrl+K" --body "$(cat <<'EOF'
## Resumo
- Busca rápida (Ctrl+K / ⌘K ou lupa) para admin e mentor: equipes pelo nome da ideia; admin também acha contas por nome/e-mail
- Setas + Enter navegam, Esc fecha; diálogo Radix com foco preso e rótulos
- Usa as listas que já existem, com o escopo do papel

## Testes
- `npm test` e `npm run build` verdes

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01E9TXsEhLzvh1bBR9LeB58C
EOF
)"
```

Depois do merge do E4 (fora deste plano, conforme a spec): promoção `staging` → `main`, *purge* da demo (`npm run seed:demo:purge`) + redeploy para o cenário voltar limpo já com as notificações, e smoke.

---

## Self-review

**1. Cobertura da spec**

| Item da spec | Task |
|---|---|
| A1 gestão (mentor/status, `encaminhada` só de `pronta`, 409 `TRANSICAO_INVALIDA`, `pronta` não escolhível) | 1 (backend), 10 (card "Gestão") |
| A1 "Enviar lembrete" (admin e mentor, até 500 caracteres) | 3 (backend), 10 (diálogo) |
| A2 RN-02 real + 409 `RN02_PENDENCIAS` no formato da RN-01 + forçar com observação no `DialogoMover` | 2 (backend), 9 (front) |
| A3 redefinição pelo admin (token 24 h em `tokens_senha`, link relativo, revoga sessões, tela com `PasswordInput` + confirmação, botão em Contas, "recuperar senha" inalterada) | 4, 12 |
| A3 `POST /tarefas/:slug/iniciar` + botão "Comecei" | 4, 11 |
| A4 `registrarAuditoria` na mesma transação (etapa/status inclusive forçado, mentor, entrega, avaliação, lembrete, senha) com `req.ip` | 1, 2, 3, 4 |
| A5 `GET /equipes/:slug/linha-do-tempo` (escopo por papel, aluno sem observação de forçado, sem UUID) | 5 |
| B1 sino (ícone por tipo, texto, tempo relativo, link, contador por `infohub-notif-vista:<slug>`, 60 s + foco) | 8 |
| B1 avaliação avisa todos os alunos ativos; seed de notificações canceladas e idempotente | 3, 6 |
| B2 toast (DS, aria-live polite, 4 s, fechável, posição, `.toast-in`) e skeleton (DS, motion-safe) | 7; aplicação nas telas: 10, 11, 12, 13 |
| B3 "Próximo passo", chips de prazo, linha do tempo (detalhe e resumida) | 9, 11 |
| B4 busca rápida (Ctrl+K/⌘K, lupa, equipes + pessoas para admin, setas/Enter/Esc, foco preso) | 14 |
| Testes pedidos (feliz, 403, 409, auditoria na transação, linha do tempo sem dado interno; toast/skeleton, sino, próximo passo, chips, gestão, redefinição, Ctrl+K) | cada task tem os seus |
| Nota para o Plano 4 (worker ignora `@demo.infohub.dev`) | comentário em `seed/demo.ts` (Task 6) |

**2. Placeholders:** nenhum "TBD"/"TODO"/"similar à Task N"; todo passo de código traz o código.

**3. Consistência de tipos e nomes:** `registrarAuditoria`/`RegistroAuditoria` (Task 1) usados em 2–4 com as mesmas ações do contrato; `ipDoChamador` (Task 1) usado em 1–4; `Pendencia.entregavel` igual no backend (Task 2) e no front (Task 9); `codigoBloqueio` usa `origem` que `transicionar` passa a devolver (Task 2); `ItemLinhaDoTempo` do backend (Task 5, `em: Date` serializado como ISO) = tipo do front (Task 9, `em: string`); `chaves.linhaDoTempo` criada na Task 9 e usada nas Tasks 10–11; `useToast`/`Skeleton` (Task 7) usados em 8–13; `BellIcon` (Task 8) usado em 9–10; `useUsuarios(tipo, { enabled })` (Task 14) é compatível com as chamadas antigas `useUsuarios()`/`useUsuarios('mentor')`; `useIniciarTarefa`, `useGerarRedefinicao`, `useRedefinirSenha`, `useAtualizarEquipe`, `useEnviarLembrete` batem com os `vi.mock` dos testes que os renderizam.
