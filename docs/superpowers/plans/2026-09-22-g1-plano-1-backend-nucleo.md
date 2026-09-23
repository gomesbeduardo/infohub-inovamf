# G1 · Plano 1 — Núcleo do backend (regras + seed) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar o backend com as regras de negócio que o professor cobra (RN-01, RN-02, RN-03, RN-04), convites por link copiável e o seed obrigatório do G1 rodando no deploy — o **checkpoint CP1** (23/09 ~13h).

**Architecture:** Hexagonal leve já existente: regra pura em `backend/src/domain/*.ts` (testada sem banco), acesso a dados em `backend/src/models/*.ts` (Prisma), HTTP em `backend/src/controllers/*.ts`. A RN-01 vira **uma transação ACID** no model (`SELECT … FOR UPDATE` + checagem + update + histórico). "Atrasada" é **derivada na consulta** por uma função única. O seed é um script TS idempotente rodado no `npm start` entre `migrate deploy` e o servidor.

**Tech Stack:** Node 22, Express 4, Prisma 5 (PostgreSQL), Vitest 2 + supertest, TypeScript strict (`noUncheckedIndexedAccess`).

**Planos irmãos (escritos depois deste):** Plano 2 — endpoints que a UI precisa (anotações, modelos, dashboard, CSV, filtros/ciclos, perfil, adicionar membro); Plano 3 — integração do frontend; Plano 4 — upload, e-mail/recuperar senha, LGPD, notificações, roteiro de defesa.

## Global Constraints

- Todo PR mira **`staging`** (`gh pr create --base staging`), **uma branch por issue**, **Conventional Commits**, **nenhum merge sem aprovação do usuário — um PR por vez**.
- Antes de começar uma task: comentar na issue "pegando esta issue" (`gh issue comment <n> --body "Pegando."`).
- `npm test` **e** `npm run build` verdes em `backend/` antes do PR. TDD: teste antes da implementação.
- Nunca expor UUID na API — só slug (`toSlug`/`fromSlug` de `src/utils/slug.ts`).
- Só `src/env.ts` lê `process.env`.
- Erro de domínio sempre via `httpError(status, code, message[, details])`; shape `{ error: { code, message, details? } }`.
- Etapas: **6 fixas**; "Pronta para o InovAMF" é a **posição 7** (status da equipe, não etapa).
- "Equipe ativa" (RN-03) = `equipes.status IN ('ativa','pronta_inovamf')` com `equipe_membros.ativo`.
- Datas "hoje" no fuso **America/Sao_Paulo**, formato `YYYY-MM-DD`.
- Senhas do seed: admin `admin123`, mentores `mentor123`, alunos `aluno123`. Admin base: `admin@infohub.dev`. Contas demo: domínio `@demo.infohub.dev`.
- Não usar `prisma migrate dev` (apaga CHECKs/índices não modelados). Migrations novas são SQL escrito à mão + edição do `schema.prisma` + `npx prisma generate`.
- Commits terminam com:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  ```
  PRs terminam com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

## Ordem, branches e issues

| Task | Issue | Branch | Base |
|---|---|---|---|
| 1 RN-04 | #88 | `feat/rn04-atrasada-derivada` | `staging` |
| 2 RN-01/RN-02 | #93, #94 | `feat/rn01-transicao-acid` | `staging` (após merge da 1) ou empilhada sobre a 1 |
| 3 RN-03 + convites | nova | `feat/rn03-vinculo-e-convite-link` | idem |
| 4 Aceite completa aluno | nova | `feat/convite-completa-aluno` | idem |
| 5 Seed base | nova | `feat/seed-base` | idem |
| 6 Seed demo + purge + start | nova | `feat/seed-demo-g1` | idem |

Se o PR anterior ainda não foi aprovado, a próxima branch sai **da branch anterior** (empilhada) e o corpo do PR diz "depende de #X". Depois do merge do anterior: `git rebase staging`.

## File Structure

**Criar**
- `backend/tests/helpers.ts` — fábricas de teste (usuário, login, equipe, limpeza). Usado só pelos testes novos.
- `backend/src/domain/atraso.ts` — `hojeISO`, `dataISO`, `statusEfetivo` (RN-04, puro).
- `backend/src/domain/transicao.ts` — `avaliarTransicao`, `pendenciasDeIntegrantes`, `POSICAO_PRONTA` (RN-01/RN-02, puro).
- `backend/src/domain/membros.ts` — `classificarColega`, `STATUS_EQUIPE_ATIVA` (RN-03, puro).
- `backend/src/utils/convite.ts` — `linkConvite(token)`.
- `backend/prisma/migrations/20260923000000_historico_status/migration.sql` — colunas `status_origem/status_destino`.
- `backend/src/seed/base.ts`, `backend/src/seed/demo.ts`, `backend/src/seed/purge-demo.ts`, `backend/src/seed/index.ts`, `backend/src/seed/purge.ts`.
- Testes: `backend/tests/atraso.test.ts`, `backend/tests/transicao.unit.test.ts`, `backend/tests/rn01.test.ts`, `backend/tests/membros.unit.test.ts`, `backend/tests/rn03-convites.test.ts`, `backend/tests/seed.test.ts`.

**Modificar**
- `backend/src/utils/error.ts`, `backend/src/middlewares/error.ts` — `details` opcional.
- `backend/src/models/tarefa.model.ts`, `backend/src/controllers/tarefa.controller.ts` — status efetivo + filtro.
- `backend/src/models/equipe.model.ts`, `backend/src/controllers/equipe.controller.ts` — transição, inscrição RN-03, convite de membro, `pendente` nos membros, histórico com "pronta".
- `backend/src/models/usuario.model.ts` — `findParaVinculo`.
- `backend/src/models/token.model.ts` — `consumirConvite` grava `alunos`.
- `backend/src/controllers/auth.controller.ts` — register exige curso/semestre de aluno.
- `backend/src/controllers/usuario.controller.ts`, `backend/src/controllers/convite.controller.ts` — `conviteUrl`.
- `backend/src/routes.ts` — rota do convite de membro.
- `backend/prisma/schema.prisma` — 2 colunas em `historico_etapas`.
- `backend/src/env.ts`, `backend/.env.example`, `backend/package.json`, `README.md` — seed.
- `backend/tests/equipes.test.ts` — ajustes de contrato (áreas ≥4, PATCH pronta, aceite com curso).

---

## Task 0: Ambiente de teste local (sem PR)

O `.env` local aponta para `schema=public`, que foi criado fora das migrations (sem histórico) — migration nova não aplica ali. Usar um schema limpo.

- [ ] **Step 1: Subir o Postgres local e trocar o schema**

```bash
docker start infohub-dev-db
cd backend
sed -i 's/schema=public/schema=g1/' .env      # .env é gitignored
npx prisma migrate deploy
```
Expected: `All migrations have been successfully applied.` (ou "No pending migrations").

- [ ] **Step 2: Rodar a suíte**

Run: `npm test`
Expected: 78 passam, 1 falha em `tests/equipes.test.ts` "GET /areas-ideia" (`expected 4 to be greater than or equal to 5`) — o seed de referência tem 4 áreas. É corrigido na Task 1.

---

## Task 1: RN-04 — "atrasada" derivada na consulta (issue #88)

**Files:**
- Create: `backend/src/domain/atraso.ts`, `backend/tests/helpers.ts`, `backend/tests/atraso.test.ts`
- Modify: `backend/src/models/tarefa.model.ts`, `backend/src/controllers/tarefa.controller.ts:42-77`, `backend/tests/equipes.test.ts:85`

**Interfaces:**
- Produces: `hojeISO(agora?: Date): string`, `dataISO(d: Date): string`, `statusEfetivo(status: string, dataEntrega: Date, hoje: string): string`, `STATUS_SEM_ENTREGA` (de `src/domain/atraso.ts`); `whereStatusEfetivo(status: string, hoje: string): Prisma.tarefasWhereInput` (de `tarefa.model.ts`); helpers de teste `SENHA`, `bearer`, `criarUsuario`, `login`, `criarEquipe`, `limpar` (de `tests/helpers.ts`).

- [ ] **Step 1: Branch e issue**

```bash
git checkout staging && git pull && git checkout -b feat/rn04-atrasada-derivada
gh issue comment 88 --body "Pegando: 'atrasada' derivada na consulta (função única), sem job."
```

- [ ] **Step 2: Criar os helpers de teste**

`backend/tests/helpers.ts`:
```ts
import request from "supertest";
import { expect } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { hashSenha } from "../src/utils/hash.js";
import { novoIdComSlug } from "../src/utils/slug.js";

// Fábricas compartilhadas pelos testes novos. Tudo que é criado leva o `sufixo`
// do arquivo no nome/e-mail, e `limpar(sufixo)` apaga no afterAll.
export type App = ReturnType<typeof createApp>;
export const SENHA = "senha-de-teste-forte";
export const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

export async function criarUsuario(
  email: string,
  tipo: "admin" | "mentor" | "aluno",
  opts: { ativado?: boolean; nome?: string } = {},
): Promise<{ id: string; slug: string }> {
  const ids = novoIdComSlug();
  await prisma.usuarios.create({
    data: {
      id: ids.id,
      slug: ids.slug,
      nome: opts.nome ?? `User ${tipo}`,
      email,
      senha: await hashSenha(SENHA),
      telefone: "55990000000",
      tipo_usuario: tipo,
      ativo: true,
      convite_aceito_em: opts.ativado === false ? null : new Date(),
    },
  });
  return ids;
}

export async function login(app: App, email: string, senha = SENHA): Promise<string> {
  const res = await request(app).post("/api/v1/auth/login").send({ email, senha });
  expect(res.status).toBe(200);
  return res.body.access as string;
}

export async function criarEquipe(p: {
  nome: string;
  mentorId?: string | null;
  etapa?: number;
  status?: string;
  membros?: Array<{ id: string; papel: "lider" | "integrante" }>;
}): Promise<{ id: string; slug: string }> {
  const ids = novoIdComSlug();
  await prisma.equipes.create({
    data: {
      id: ids.id,
      slug: ids.slug,
      nome_ideia: p.nome,
      descricao_ideia: "descrição de teste",
      estagio_ideia: "ideia",
      mentor_id: p.mentorId ?? null,
      etapa_atual_id: p.etapa ?? 1, // etapas.id == etapas.numero (seed de referência)
      status: p.status ?? "ativa",
    },
  });
  for (const m of p.membros ?? []) {
    await prisma.equipe_membros.create({
      data: { equipe_id: ids.id, usuario_id: m.id, papel: m.papel },
    });
  }
  return ids;
}

// Equipes primeiro (cascade em tarefas/entregas/histórico/membros), depois e-mails
// e usuários do sufixo.
export async function limpar(sufixo: string): Promise<void> {
  await prisma.equipes.deleteMany({ where: { nome_ideia: { contains: sufixo } } });
  await prisma.emails.deleteMany({ where: { destinatario_email: { contains: sufixo } } });
  await prisma.usuarios.deleteMany({ where: { email: { contains: sufixo } } });
}
```

- [ ] **Step 3: Escrever os testes que falham**

`backend/tests/atraso.test.ts`:
```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { dataISO, hojeISO, statusEfetivo } from "../src/domain/atraso.js";
import { bearer, criarEquipe, criarUsuario, limpar, login } from "./helpers.js";

describe("statusEfetivo (RN-04, puro)", () => {
  const ontem = new Date("2026-09-21T00:00:00.000Z");
  const hoje = "2026-09-22";
  it("pendente com prazo passado → atrasada", () => {
    expect(statusEfetivo("pendente", ontem, hoje)).toBe("atrasada");
  });
  it("em_andamento com prazo passado → atrasada", () => {
    expect(statusEfetivo("em_andamento", ontem, hoje)).toBe("atrasada");
  });
  it("prazo = hoje ainda não está atrasada", () => {
    expect(statusEfetivo("pendente", new Date("2026-09-22T00:00:00.000Z"), hoje)).toBe("pendente");
  });
  it("entregue/aprovada/ajustar nunca viram atrasada", () => {
    for (const s of ["entregue", "aprovada", "ajustar"]) {
      expect(statusEfetivo(s, ontem, hoje)).toBe(s);
    }
  });
  it("hojeISO usa o fuso de São Paulo", () => {
    // 02:00 UTC do dia 23 ainda é 23:00 do dia 22 em SP (UTC-3).
    expect(hojeISO(new Date("2026-09-23T02:00:00.000Z"))).toBe("2026-09-22");
  });
  it("dataISO corta a data do DATE do Postgres", () => {
    expect(dataISO(ontem)).toBe("2026-09-21");
  });
});

const app = createApp();
const sufixo = `atr${Date.now()}`;
let adminAccess = "";
let equipeSlug = "";

function diaRelativo(n: number): string {
  const d = new Date(`${hojeISO()}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return dataISO(d);
}

beforeAll(async () => {
  await criarUsuario(`admin.${sufixo}@teste.local`, "admin");
  adminAccess = await login(app, `admin.${sufixo}@teste.local`);
  equipeSlug = (await criarEquipe({ nome: `Equipe ${sufixo}` })).slug;
  for (const [titulo, dia] of [["Vencida", -2], ["No prazo", 3]] as const) {
    const r = await request(app)
      .post(`/api/v1/equipes/${equipeSlug}/tarefas`)
      .set(bearer(adminAccess))
      .send({ titulo, etapa: 1, dataEntrega: diaRelativo(dia), obrigatoria: true });
    expect(r.status).toBe(201);
  }
});

afterAll(async () => {
  await limpar(sufixo);
  await prisma.$disconnect();
});

describe("GET /equipes/:slug/tarefas (RN-04 na API)", () => {
  it("devolve 'atrasada' para a vencida e 'pendente' para a do prazo", async () => {
    const res = await request(app)
      .get(`/api/v1/equipes/${equipeSlug}/tarefas`)
      .set(bearer(adminAccess));
    expect(res.status).toBe(200);
    const porTitulo = Object.fromEntries(
      res.body.data.map((t: { titulo: string; status: string }) => [t.titulo, t.status]),
    );
    expect(porTitulo).toEqual({ Vencida: "atrasada", "No prazo": "pendente" });
  });

  it("?status=atrasada traz só a vencida; ?status=pendente só a do prazo", async () => {
    const atr = await request(app)
      .get(`/api/v1/equipes/${equipeSlug}/tarefas?status=atrasada`)
      .set(bearer(adminAccess));
    expect(atr.body.data.map((t: { titulo: string }) => t.titulo)).toEqual(["Vencida"]);

    const pen = await request(app)
      .get(`/api/v1/equipes/${equipeSlug}/tarefas?status=pendente`)
      .set(bearer(adminAccess));
    expect(pen.body.data.map((t: { titulo: string }) => t.titulo)).toEqual(["No prazo"]);
  });

  it("o banco NÃO grava 'atrasada' (derivado na leitura)", async () => {
    const n = await prisma.tarefas.count({
      where: { equipes: { slug: equipeSlug }, status: "atrasada" },
    });
    expect(n).toBe(0);
  });
});
```

- [ ] **Step 4: Rodar e ver falhar**

Run: `npx vitest run tests/atraso.test.ts`
Expected: FAIL — `Cannot find module '../src/domain/atraso.js'`.

- [ ] **Step 5: Implementar a regra pura**

`backend/src/domain/atraso.ts`:
```ts
// RN-04: "tarefas vencidas sem entrega são marcadas como atrasadas".
// Decisão: DERIVADO NA CONSULTA, nunca gravado. Um job no mesmo processo seria
// o Problema 3 (um ponto de falha) e duas fontes de verdade (coluna x prazo
// adiado — RF-17). Esta é a ÚNICA definição de "atrasada" do sistema: listas,
// kanban, dashboard e CSV passam por aqui (ou por whereStatusEfetivo no model).

export const STATUS_SEM_ENTREGA = ["pendente", "em_andamento"] as const;

const FMT_SP = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// "Hoje" no fuso da AMF, como YYYY-MM-DD (en-CA já formata assim).
export function hojeISO(agora: Date = new Date()): string {
  return FMT_SP.format(agora);
}

// Coluna DATE do Postgres chega como 00:00Z do dia — o dia é o prefixo ISO.
export function dataISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function statusEfetivo(status: string, dataEntrega: Date, hoje: string): string {
  const semEntrega = (STATUS_SEM_ENTREGA as readonly string[]).includes(status);
  return semEntrega && dataISO(dataEntrega) < hoje ? "atrasada" : status;
}
```

- [ ] **Step 6: Filtro no model**

Em `backend/src/models/tarefa.model.ts`, adicionar o import e a função, e trocar o `where` de `listarPorEquipe`:
```ts
import { STATUS_SEM_ENTREGA } from "../domain/atraso.js";

// Tradução de statusEfetivo para WHERE: mesma regra, do lado do banco.
export function whereStatusEfetivo(
  status: string,
  hoje: string,
): Prisma.tarefasWhereInput {
  const limite = new Date(`${hoje}T00:00:00.000Z`);
  const semEntrega = [...STATUS_SEM_ENTREGA];
  if (status === "atrasada") {
    return {
      OR: [
        { status: "atrasada" }, // legado: valor aceito pelo CHECK, nunca gravado por nós
        { status: { in: semEntrega }, data_entrega: { lt: limite } },
      ],
    };
  }
  if ((semEntrega as string[]).includes(status)) {
    return { status, data_entrega: { gte: limite } };
  }
  return { status };
}

export function listarPorEquipe(
  equipeId: string,
  filtros: { status?: string; hoje: string },
) {
  const where: Prisma.tarefasWhereInput = { equipe_id: equipeId };
  if (filtros.status) Object.assign(where, whereStatusEfetivo(filtros.status, filtros.hoje));
  return prisma.tarefas.findMany({
    where,
    orderBy: { data_entrega: "asc" },
    select: DETALHE_SELECT,
  });
}
```
(remove a versão antiga de `listarPorEquipe`).

- [ ] **Step 7: Controller usa o status efetivo**

Em `backend/src/controllers/tarefa.controller.ts`: importar `import { hojeISO, statusEfetivo } from "../domain/atraso.js";`, e em `mapTarefa` trocar `status: t.status,` por:
```ts
    status: statusEfetivo(t.status, t.data_entrega, hojeISO()),
```
e em `index` trocar a chamada do model por:
```ts
    const tarefas = await tarefaModel.listarPorEquipe(controle.id, {
      status,
      hoje: hojeISO(),
    });
```

- [ ] **Step 8: Corrigir o teste antigo de áreas**

Em `backend/tests/equipes.test.ts:85` trocar `toBeGreaterThanOrEqual(5)` por `toBeGreaterThanOrEqual(4)` (a migration `seed_referencia` cria 4 áreas).

- [ ] **Step 9: Rodar tudo**

Run: `npm test && npm run build`
Expected: todos PASS; build sem erro.

- [ ] **Step 10: Commit e PR**

```bash
git add src/domain/atraso.ts src/models/tarefa.model.ts src/controllers/tarefa.controller.ts tests/helpers.ts tests/atraso.test.ts tests/equipes.test.ts
git commit -m "feat(backend): deriva 'atrasada' na consulta com função única (RN-04)

Closes #88

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -u origin feat/rn04-atrasada-derivada
gh pr create --base staging --title "feat(backend): RN-04 — atrasada derivada na consulta" --body "$(cat <<'EOF'
## O quê
- `src/domain/atraso.ts`: `statusEfetivo` — única definição de "atrasada" (pendente/em_andamento com prazo < hoje em SP).
- `tarefa.model.whereStatusEfetivo`: a mesma regra como WHERE (filtro `?status=atrasada`).
- A API devolve o status efetivo; o banco nunca grava `atrasada`.
- `tests/helpers.ts`: fábricas para os testes novos.

## Por quê (defesa)
Calculado na consulta: sem job no mesmo processo (Problema 3), sem duas fontes de verdade quando o prazo é adiado (RF-17), regra num lugar só (Problema 4).

Closes #88

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
**Parar e pedir aprovação do usuário para o merge.**

---

## Task 2: RN-01/RN-02 — transição de etapa numa transação ACID (issues #93, #94)

**Files:**
- Create: `backend/src/domain/transicao.ts`, `backend/prisma/migrations/20260923000000_historico_status/migration.sql`, `backend/tests/transicao.unit.test.ts`, `backend/tests/rn01.test.ts`
- Modify: `backend/src/utils/error.ts`, `backend/src/middlewares/error.ts:14-17`, `backend/prisma/schema.prisma` (model `historico_etapas`), `backend/src/models/equipe.model.ts` (`findDetalheBySlug`, `findControleBySlug`, `moverEtapa` → `transicionar`), `backend/src/controllers/equipe.controller.ts` (`show`, `update`, `moverEtapa`), `backend/tests/equipes.test.ts:240-247`

**Interfaces:**
- Consumes: `criarUsuario`, `criarEquipe`, `login`, `bearer`, `limpar` (Task 1).
- Produces:
  - `POSICAO_PRONTA = 7`; `type Pendencia = { tipo: "tarefa"; slug: string; titulo: string } | { tipo: "integrante"; slug: string; nome: string; motivo: "convite_pendente" | "dados_incompletos" }`; `type Decisao`; `avaliarTransicao(i: { origem: number; destino: number; pendencias: Pendencia[]; forcado: boolean; observacao: string | null }): Decisao`; `pendenciasDeIntegrantes(membros: Array<{ slug: string; nome: string; conviteAceitoEm: Date | null; curso: string | null; semestre: string | null }>): Pendencia[]` (de `src/domain/transicao.ts`).
  - `equipeModel.transicionar(p: { equipeId: string; destino: number; movidoPor: string; forcado: boolean; observacao: string | null }): Promise<{ tipo: "ok"; equipe: { slug: string; status: string; etapa: { numero: number; nome: string }; forcado: boolean } } | { tipo: "rejeitada"; decisao: Exclude<Decisao, { tipo: "permitida" }> }>`.
  - `findControleBySlug` passa a trazer `equipe_membros[].papel`.
  - `httpError(status, code, message, details?)`.
  - API: `POST /equipes/:slug/etapa` aceita `etapa: 1..6 | "pronta"`; 409 `RN01_PENDENCIAS`/`RN01_SALTO` com `error.details.pendencias`; 400 `OBSERVACAO_OBRIGATORIA`/`MESMA_POSICAO`; `historico[].de/para` pode ser `"pronta"`; `PATCH /equipes/:slug {status:"pronta_inovamf"}` → 400 `USE_TRANSICAO`.

- [ ] **Step 1: Branch e issues**

```bash
git checkout staging && git pull && git checkout -b feat/rn01-transicao-acid
gh issue comment 93 --body "Pegando: RN-01 como transação única (FOR UPDATE + checagem + update + histórico); forçar exige observação."
gh issue comment 94 --body "Pegando junto da #93: 'Pronta' = posição 7, gate RN-02 (tarefas obrigatórias da etapa 6 + dados de todos os integrantes)."
```

- [ ] **Step 2: Teste unitário da regra (falha)**

`backend/tests/transicao.unit.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import {
  POSICAO_PRONTA,
  avaliarTransicao,
  pendenciasDeIntegrantes,
  type Pendencia,
} from "../src/domain/transicao.js";

const tarefa: Pendencia = { tipo: "tarefa", slug: "s", titulo: "BMC" };
const base = { pendencias: [] as Pendencia[], forcado: false, observacao: null };

describe("avaliarTransicao (RN-01/RN-02)", () => {
  it("avança uma posição sem pendências", () => {
    expect(avaliarTransicao({ ...base, origem: 2, destino: 3 })).toEqual({
      tipo: "permitida", forcado: false, direcao: "avanco",
    });
  });
  it("bloqueia avanço com pendência", () => {
    expect(avaliarTransicao({ ...base, origem: 2, destino: 3, pendencias: [tarefa] })).toEqual({
      tipo: "bloqueada", motivo: "pendencias", pendencias: [tarefa],
    });
  });
  it("forçar com observação libera e marca forcado", () => {
    expect(
      avaliarTransicao({ origem: 2, destino: 3, pendencias: [tarefa], forcado: true, observacao: "decisão do mentor" }),
    ).toEqual({ tipo: "permitida", forcado: true, direcao: "avanco" });
  });
  it("forçar sem observação é inválido", () => {
    expect(
      avaliarTransicao({ origem: 2, destino: 3, pendencias: [tarefa], forcado: true, observacao: "  " }),
    ).toEqual({ tipo: "invalida", codigo: "OBSERVACAO_OBRIGATORIA" });
  });
  it("salto de etapa exige forçar", () => {
    expect(avaliarTransicao({ ...base, origem: 2, destino: 4 })).toEqual({
      tipo: "bloqueada", motivo: "salto", pendencias: [],
    });
    expect(
      avaliarTransicao({ origem: 2, destino: 4, pendencias: [], forcado: true, observacao: "ok" }),
    ).toEqual({ tipo: "permitida", forcado: true, direcao: "avanco" });
  });
  it("forcado sem nada a forçar é registrado como não forçado", () => {
    expect(
      avaliarTransicao({ origem: 2, destino: 3, pendencias: [], forcado: true, observacao: "x" }),
    ).toEqual({ tipo: "permitida", forcado: false, direcao: "avanco" });
  });
  it("retroceder é sempre permitido e nunca forçado", () => {
    expect(avaliarTransicao({ ...base, origem: 3, destino: 2, pendencias: [tarefa] })).toEqual({
      tipo: "permitida", forcado: false, direcao: "retrocesso",
    });
    expect(avaliarTransicao({ ...base, origem: POSICAO_PRONTA, destino: 6 })).toEqual({
      tipo: "permitida", forcado: false, direcao: "retrocesso",
    });
  });
  it("6 → pronta é um avanço normal; 5 → pronta é salto", () => {
    expect(avaliarTransicao({ ...base, origem: 6, destino: POSICAO_PRONTA }).tipo).toBe("permitida");
    expect(avaliarTransicao({ ...base, origem: 5, destino: POSICAO_PRONTA }).tipo).toBe("bloqueada");
  });
  it("mesma posição e posição fora de 1..7 são inválidas", () => {
    expect(avaliarTransicao({ ...base, origem: 3, destino: 3 })).toEqual({ tipo: "invalida", codigo: "MESMA_POSICAO" });
    expect(avaliarTransicao({ ...base, origem: 3, destino: 8 })).toEqual({ tipo: "invalida", codigo: "POSICAO_INVALIDA" });
  });
});

describe("pendenciasDeIntegrantes (RN-02: dados de todos os integrantes)", () => {
  it("aponta convite pendente e dados incompletos", () => {
    const r = pendenciasDeIntegrantes([
      { slug: "a", nome: "Ana", conviteAceitoEm: new Date(), curso: "ADS", semestre: "3º" },
      { slug: "b", nome: "Bia", conviteAceitoEm: null, curso: null, semestre: null },
      { slug: "c", nome: "Caio", conviteAceitoEm: new Date(), curso: "ADS", semestre: null },
    ]);
    expect(r).toEqual([
      { tipo: "integrante", slug: "b", nome: "Bia", motivo: "convite_pendente" },
      { tipo: "integrante", slug: "c", nome: "Caio", motivo: "dados_incompletos" },
    ]);
  });
});
```

Run: `npx vitest run tests/transicao.unit.test.ts`
Expected: FAIL — `Cannot find module '../src/domain/transicao.js'`.

- [ ] **Step 3: Implementar a regra pura**

`backend/src/domain/transicao.ts`:
```ts
// RN-01: a equipe só avança quando as tarefas OBRIGATÓRIAS da etapa atual estão
// aprovadas — ou por decisão do mentor/admin (forçar, com observação gravada).
// RN-02: "Pronta para o InovAMF" (posição 7) exige, além das obrigatórias da
// etapa 6, os dados de todos os integrantes (convite aceito + curso/semestre).
// Regra PURA: quem busca as pendências e grava é equipe.model.transicionar,
// dentro de uma única transação.

export const POSICAO_PRONTA = 7;

export type Pendencia =
  | { tipo: "tarefa"; slug: string; titulo: string }
  | {
      tipo: "integrante";
      slug: string;
      nome: string;
      motivo: "convite_pendente" | "dados_incompletos";
    };

export type Decisao =
  | { tipo: "permitida"; forcado: boolean; direcao: "avanco" | "retrocesso" }
  | { tipo: "bloqueada"; motivo: "pendencias" | "salto"; pendencias: Pendencia[] }
  | { tipo: "invalida"; codigo: "MESMA_POSICAO" | "OBSERVACAO_OBRIGATORIA" | "POSICAO_INVALIDA" };

export function avaliarTransicao(i: {
  origem: number;
  destino: number;
  pendencias: Pendencia[];
  forcado: boolean;
  observacao: string | null;
}): Decisao {
  if (!Number.isInteger(i.destino) || i.destino < 1 || i.destino > POSICAO_PRONTA) {
    return { tipo: "invalida", codigo: "POSICAO_INVALIDA" };
  }
  if (i.destino === i.origem) return { tipo: "invalida", codigo: "MESMA_POSICAO" };
  if (i.forcado && (i.observacao ?? "").trim().length === 0) {
    return { tipo: "invalida", codigo: "OBSERVACAO_OBRIGATORIA" };
  }
  if (i.destino < i.origem) return { tipo: "permitida", forcado: false, direcao: "retrocesso" };

  const salto = i.destino > i.origem + 1;
  if (!i.forcado && i.pendencias.length > 0) {
    return { tipo: "bloqueada", motivo: "pendencias", pendencias: i.pendencias };
  }
  if (!i.forcado && salto) {
    return { tipo: "bloqueada", motivo: "salto", pendencias: i.pendencias };
  }
  return {
    tipo: "permitida",
    forcado: i.forcado && (i.pendencias.length > 0 || salto),
    direcao: "avanco",
  };
}

export function pendenciasDeIntegrantes(
  membros: Array<{
    slug: string;
    nome: string;
    conviteAceitoEm: Date | null;
    curso: string | null;
    semestre: string | null;
  }>,
): Pendencia[] {
  const r: Pendencia[] = [];
  for (const m of membros) {
    if (!m.conviteAceitoEm) {
      r.push({ tipo: "integrante", slug: m.slug, nome: m.nome, motivo: "convite_pendente" });
    } else if (!m.curso || !m.semestre) {
      r.push({ tipo: "integrante", slug: m.slug, nome: m.nome, motivo: "dados_incompletos" });
    }
  }
  return r;
}
```

Run: `npx vitest run tests/transicao.unit.test.ts`
Expected: PASS (10 testes).

- [ ] **Step 4: `details` no erro HTTP**

`backend/src/utils/error.ts` — substituir o arquivo por:
```ts
export interface HttpError extends Error {
  status: number;
  code: string;
  details?: unknown;
}

// httpError(status, code, message[, details]) — erro de domínio que o handler
// central traduz direto para { error: { code, message, details? } }.
export function httpError(
  status: number,
  code: string,
  message: string,
  details?: unknown,
): HttpError {
  return Object.assign(new Error(message), {
    status,
    code,
    ...(details !== undefined ? { details } : {}),
  }) as HttpError;
}

export function ehHttpError(err: unknown): err is HttpError {
  return (
    err instanceof Error &&
    typeof (err as Partial<HttpError>).status === "number" &&
    typeof (err as Partial<HttpError>).code === "string"
  );
}
```
`backend/src/middlewares/error.ts` — no bloco `if (ehHttpError(err))`, trocar o `res.status(...).json(...)` por:
```ts
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    });
```

- [ ] **Step 5: Migration das colunas de status no histórico**

`backend/prisma/migrations/20260923000000_historico_status/migration.sql`:
```sql
-- RN-02: entrar/sair de "Pronta para o InovAMF" muda o STATUS da equipe, não a
-- etapa (continua 6). Sem estas colunas o histórico mostraria "6 → 6".
ALTER TABLE "historico_etapas" ADD COLUMN "status_origem" VARCHAR(25);
ALTER TABLE "historico_etapas" ADD COLUMN "status_destino" VARCHAR(25);
```
Em `backend/prisma/schema.prisma`, no `model historico_etapas`, logo abaixo de `observacao String?`:
```prisma
  status_origem                                    String?   @db.VarChar(25)
  status_destino                                   String?   @db.VarChar(25)
```
Run: `npx prisma migrate deploy && npx prisma generate`
Expected: `Applying migration 20260923000000_historico_status` … `All migrations have been successfully applied.`

- [ ] **Step 6: Teste de integração (falha)**

`backend/tests/rn01.test.ts`:
```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { bearer, criarEquipe, criarUsuario, limpar, login } from "./helpers.js";

const app = createApp();
const sufixo = `rn01${Date.now()}`;
const email = (n: string) => `${n}.${sufixo}@teste.local`;
let adminAccess = "";
let mentorAccess = "";
let equipe = { id: "", slug: "" };
let final = { id: "", slug: "" };
let obrigatoriaSlug = "";

async function novaTarefa(slug: string, titulo: string, etapa: number, obrigatoria: boolean) {
  const r = await request(app)
    .post(`/api/v1/equipes/${slug}/tarefas`)
    .set(bearer(adminAccess))
    .send({ titulo, etapa, dataEntrega: "2099-12-31", obrigatoria });
  expect(r.status).toBe(201);
  return r.body.slug as string;
}

beforeAll(async () => {
  await criarUsuario(email("admin"), "admin");
  const mentor = await criarUsuario(email("mentor"), "mentor");
  const lider = await criarUsuario(email("lider"), "aluno");
  const pendente = await criarUsuario(email("pendente"), "aluno", { ativado: false, nome: "Pendente Silva" });
  adminAccess = await login(app, email("admin"));
  mentorAccess = await login(app, email("mentor"));

  equipe = await criarEquipe({ nome: `Equipe ${sufixo}`, mentorId: mentor.id, etapa: 2 });
  obrigatoriaSlug = await novaTarefa(equipe.slug, "Obrigatória E2", 2, true);
  await novaTarefa(equipe.slug, "Opcional E2", 2, false);

  final = await criarEquipe({
    nome: `Final ${sufixo}`,
    mentorId: mentor.id,
    etapa: 6,
    membros: [{ id: lider.id, papel: "lider" }, { id: pendente.id, papel: "integrante" }],
  });
  await prisma.alunos.create({ data: { usuario_id: lider.id, curso: "ADS", semestre: "5º" } });
});

afterAll(async () => {
  await limpar(sufixo);
  await prisma.$disconnect();
});

const mover = (slug: string, body: object) =>
  request(app).post(`/api/v1/equipes/${slug}/etapa`).set(bearer(mentorAccess)).send(body);

describe("RN-01 — avançar etapa", () => {
  it("409 com a obrigatória pendente (a opcional não bloqueia)", async () => {
    const r = await mover(equipe.slug, { etapa: 3 });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("RN01_PENDENCIAS");
    expect(r.body.error.details.pendencias).toEqual([
      { tipo: "tarefa", slug: obrigatoriaSlug, titulo: "Obrigatória E2" },
    ]);
  });

  it("forçar sem observação → 400", async () => {
    const r = await mover(equipe.slug, { etapa: 3, forcado: true });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("OBSERVACAO_OBRIGATORIA");
  });

  it("aprovada a obrigatória, avança sem forçar e registra histórico", async () => {
    const ap = await request(app)
      .patch(`/api/v1/tarefas/${obrigatoriaSlug}`)
      .set(bearer(mentorAccess))
      .send({ status: "aprovada" });
    expect(ap.status).toBe(200);

    const r = await mover(equipe.slug, { etapa: 3 });
    expect(r.status).toBe(200);
    expect(r.body.etapa.numero).toBe(3);
    expect(r.body.forcado).toBe(false);

    const det = await request(app).get(`/api/v1/equipes/${equipe.slug}`).set(bearer(adminAccess));
    expect(det.body.historico[0]).toMatchObject({ de: 2, para: 3, forcado: false });
  });

  it("salto 3 → 5 exige forçar; forçado com observação passa", async () => {
    const bloq = await mover(equipe.slug, { etapa: 5 });
    expect(bloq.status).toBe(409);
    expect(bloq.body.error.code).toBe("RN01_SALTO");

    const ok = await mover(equipe.slug, { etapa: 5, forcado: true, observacao: "equipe já tinha o VPD" });
    expect(ok.status).toBe(200);
    expect(ok.body.forcado).toBe(true);
  });

  it("retroceder não checa nada", async () => {
    const r = await mover(equipe.slug, { etapa: 2 });
    expect(r.status).toBe(200);
    expect(r.body.etapa.numero).toBe(2);
  });
});

describe("RN-02 — Pronta para o InovAMF", () => {
  it("409 lista o integrante com convite pendente", async () => {
    const r = await mover(final.slug, { etapa: "pronta" });
    expect(r.status).toBe(409);
    expect(r.body.error.details.pendencias).toEqual([
      expect.objectContaining({ tipo: "integrante", nome: "Pendente Silva", motivo: "convite_pendente" }),
    ]);
  });

  it("forçado vira pronta_inovamf; histórico mostra 6 → pronta", async () => {
    const r = await mover(final.slug, { etapa: "pronta", forcado: true, observacao: "coordenação liberou" });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("pronta_inovamf");
    const det = await request(app).get(`/api/v1/equipes/${final.slug}`).set(bearer(adminAccess));
    expect(det.body.historico[0]).toMatchObject({ de: 6, para: "pronta", forcado: true });
    expect(det.body.prontaInovamfEm).toBeTruthy();
  });

  it("voltar para a etapa 6 reativa a equipe", async () => {
    const r = await mover(final.slug, { etapa: 6 });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("ativa");
    const det = await request(app).get(`/api/v1/equipes/${final.slug}`).set(bearer(adminAccess));
    expect(det.body.prontaInovamfEm).toBeNull();
    expect(det.body.historico[0]).toMatchObject({ de: "pronta", para: 6 });
  });

  it("PATCH status=pronta_inovamf é recusado (só pela transição)", async () => {
    const r = await request(app)
      .patch(`/api/v1/equipes/${final.slug}`)
      .set(bearer(adminAccess))
      .send({ status: "pronta_inovamf" });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("USE_TRANSICAO");
  });
});
```

Run: `npx vitest run tests/rn01.test.ts`
Expected: FAIL — primeiro teste recebe 200 em vez de 409 (hoje não há checagem).

- [ ] **Step 7: Model — transação `transicionar`**

Em `backend/src/models/equipe.model.ts`:

(a) imports no topo:
```ts
import {
  POSICAO_PRONTA,
  avaliarTransicao,
  pendenciasDeIntegrantes,
  type Decisao,
  type Pendencia,
} from "../domain/transicao.js";
import { toSlug } from "../utils/slug.js";
```

(b) em `findDetalheBySlug`, no select de `equipe_membros.usuarios` acrescentar `convite_aceito_em: true`, e no select de `historico_etapas` acrescentar `status_origem: true, status_destino: true`.

(c) em `findControleBySlug`, trocar `select: { usuario_id: true }` de `equipe_membros` por `select: { usuario_id: true, papel: true }`.

(d) **remover** a função `moverEtapa` inteira e colocar no lugar:
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
  if (posicao === 6) {
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
    pendencias.push(
      ...pendenciasDeIntegrantes(
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
  return pendencias;
}

// RN-01 como UMA transação ACID: trava a equipe, lê a posição, busca pendências,
// decide (regra pura) e grava equipe + histórico. Duas transições simultâneas
// na mesma equipe ficam em fila no FOR UPDATE — nenhuma lê estado velho.
export async function transicionar(p: {
  equipeId: string;
  destino: number;
  movidoPor: string;
  forcado: boolean;
  observacao: string | null;
}): Promise<
  | {
      tipo: "ok";
      equipe: {
        slug: string;
        status: string;
        etapa: { numero: number; nome: string };
        forcado: boolean;
      };
    }
  | { tipo: "rejeitada"; decisao: Exclude<Decisao, { tipo: "permitida" }> }
> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM equipes WHERE id = ${p.equipeId}::uuid FOR UPDATE`;
    const eq = await tx.equipes.findUniqueOrThrow({
      where: { id: p.equipeId },
      select: { status: true, etapa_atual_id: true, etapas: { select: { numero: true } } },
    });
    const origem = eq.status === "pronta_inovamf" ? POSICAO_PRONTA : eq.etapas.numero;
    const pendencias =
      p.destino > origem ? await pendenciasDaPosicao(tx, p.equipeId, origem) : [];

    const decisao = avaliarTransicao({
      origem,
      destino: p.destino,
      pendencias,
      forcado: p.forcado,
      observacao: p.observacao,
    });
    if (decisao.tipo !== "permitida") return { tipo: "rejeitada" as const, decisao };

    const etapaDestino = await tx.etapas.findUniqueOrThrow({
      where: { numero: Math.min(p.destino, 6) },
      select: { id: true },
    });
    const data: Prisma.equipesUncheckedUpdateInput = { etapa_atual_id: etapaDestino.id };
    if (p.destino === POSICAO_PRONTA) {
      data.status = "pronta_inovamf";
      data.pronta_inovamf_em = new Date();
    } else if (origem === POSICAO_PRONTA) {
      data.status = "ativa";
      data.pronta_inovamf_em = null;
    }

    const atualizada = await tx.equipes.update({
      where: { id: p.equipeId },
      data,
      select: { slug: true, status: true, etapas: { select: { numero: true, nome: true } } },
    });
    await tx.historico_etapas.create({
      data: {
        equipe_id: p.equipeId,
        etapa_origem_id: eq.etapa_atual_id,
        etapa_destino_id: etapaDestino.id,
        status_origem: eq.status,
        status_destino: atualizada.status,
        movido_por: p.movidoPor,
        forcado: decisao.forcado,
        observacao: p.observacao,
      },
    });

    return {
      tipo: "ok" as const,
      equipe: {
        slug: atualizada.slug,
        status: atualizada.status,
        etapa: { numero: atualizada.etapas.numero, nome: atualizada.etapas.nome },
        forcado: decisao.forcado,
      },
    };
  });
}
```

- [ ] **Step 8: Controller**

Em `backend/src/controllers/equipe.controller.ts`:

(a) imports: trocar `import { idDoChamador } from "../utils/acesso.js";` por `import { idDoChamador, podeGerirEquipe } from "../utils/acesso.js";` e acrescentar `import { POSICAO_PRONTA } from "../domain/transicao.js";`. Remover o import de `etapaModel` **só se** nenhuma outra função do arquivo o usar (após esta task, `moverEtapa` deixa de usar; confira com `grep -n etapaModel src/controllers/equipe.controller.ts`).

(b) em `show`, trocar o bloco `membros:` e `historico:` do `res.json` por:
```ts
      membros: equipe.equipe_membros.map((m) => ({
        slug: m.usuarios.slug,
        nome: m.usuarios.nome,
        papel: m.papel,
        tipo: m.usuarios.tipo_usuario,
        pendente: m.usuarios.convite_aceito_em === null,
      })),
      historico: equipe.historico_etapas.map((h) => ({
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
        por: h.usuarios ? { slug: h.usuarios.slug, nome: h.usuarios.nome } : null,
        em: h.criado_em,
      })),
```

(c) em `update`, trocar o bloco `if (status !== undefined) { … }` por:
```ts
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
      data.status = status;
    }
```

(d) substituir a função `moverEtapa` inteira por:
```ts
const MENSAGEM_INVALIDA: Record<string, string> = {
  MESMA_POSICAO: "A equipe já está nessa etapa",
  OBSERVACAO_OBRIGATORIA: "Para forçar, explique o motivo na observação",
  POSICAO_INVALIDA: "Etapa deve ser um número de 1 a 6 ou 'pronta'",
};

// POST /equipes/:slug/etapa — avançar/retroceder (RF-09, RN-01, RN-02).
export async function moverEtapa(req: Request, res: Response, next: NextFunction) {
  try {
    const { etapa, observacao, forcado } = req.body ?? {};
    const destino = etapa === "pronta" ? POSICAO_PRONTA : Number(etapa);
    if (!Number.isInteger(destino) || destino < 1 || destino > POSICAO_PRONTA) {
      throw httpError(400, "INVALID_ETAPA", MENSAGEM_INVALIDA.POSICAO_INVALIDA ?? "");
    }
    if (forcado !== undefined && typeof forcado !== "boolean") {
      throw httpError(400, "INVALID_FORCADO", "forcado deve ser booleano");
    }

    const controle = await equipeModel.findControleBySlug(req.params.slug ?? "");
    if (!controle) throw httpError(404, "EQUIPE_NOT_FOUND", "Equipe não encontrada");
    if (!podeGerirEquipe(req, controle.mentor_id)) {
      throw httpError(403, "NOT_TEAM_MENTOR", "Equipe fora do seu escopo");
    }

    const r = await equipeModel.transicionar({
      equipeId: controle.id,
      destino,
      movidoPor: idDoChamador(req),
      forcado: forcado === true,
      observacao: typeof observacao === "string" && observacao.trim() ? observacao.trim() : null,
    });

    if (r.tipo === "rejeitada") {
      if (r.decisao.tipo === "invalida") {
        throw httpError(400, r.decisao.codigo, MENSAGEM_INVALIDA[r.decisao.codigo] ?? "");
      }
      throw httpError(
        409,
        r.decisao.motivo === "salto" ? "RN01_SALTO" : "RN01_PENDENCIAS",
        r.decisao.motivo === "salto"
          ? "Pular etapas exige forçar com observação"
          : "Há pendências obrigatórias nesta etapa",
        { pendencias: r.decisao.pendencias },
      );
    }
    res.json(r.equipe);
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 9: Ajustar o teste antigo de "pronta" via PATCH**

Em `backend/tests/equipes.test.ts`, substituir o `it("admin marca pronta_inovamf", …)` por:
```ts
  it("PATCH não marca pronta_inovamf (RN-02 exige a transição)", async () => {
    const res = await request(app)
      .patch(`/api/v1/equipes/${storeSlug}`)
      .set(bearer(adminAccess))
      .send({ status: "pronta_inovamf" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("USE_TRANSICAO");
  });
```

- [ ] **Step 10: Rodar tudo**

Run: `npm test && npm run build`
Expected: todos PASS (incl. `rn01.test.ts` 9 testes, `transicao.unit.test.ts` 10 testes).

- [ ] **Step 11: Commit e PR**

```bash
git add prisma/ src/domain/transicao.ts src/utils/error.ts src/middlewares/error.ts src/models/equipe.model.ts src/controllers/equipe.controller.ts tests/transicao.unit.test.ts tests/rn01.test.ts tests/equipes.test.ts
git commit -m "feat(backend): transição de etapa como transação ACID com gate RN-01/RN-02

Closes #93
Closes #94

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -u origin feat/rn01-transicao-acid
gh pr create --base staging --title "feat(backend): RN-01/RN-02 — transição de etapa ACID" --body "$(cat <<'EOF'
## O quê
- `src/domain/transicao.ts`: regra pura (avanço exige obrigatórias aprovadas; salto e pendência só forçando com observação; retroceder livre; 'pronta' = posição 7 com dados de todos os integrantes).
- `equipe.model.transicionar`: `SELECT … FOR UPDATE` + pendências + decisão + update + histórico **numa transação**.
- API: `etapa: 1..6 | "pronta"`; 409 `RN01_PENDENCIAS`/`RN01_SALTO` com `details.pendencias`; histórico mostra `"pronta"`.
- Migration `historico_status`: `status_origem/status_destino` em `historico_etapas`.
- `PATCH status=pronta_inovamf` → 400 `USE_TRANSICAO`.

## Por quê (defesa)
"Onde mora a RN-01?" → regra em `domain/transicao.ts`, atomicidade em `equipe.model.transicionar`. É o "aprovar + avançar ACID" que justifica o monolito.

Closes #93
Closes #94

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
**Parar e pedir aprovação do usuário para o merge.**

---

## Task 3: RN-03 + convites por link copiável

**Files:**
- Create: `backend/src/domain/membros.ts`, `backend/src/utils/convite.ts`, `backend/tests/membros.unit.test.ts`, `backend/tests/rn03-convites.test.ts`
- Modify: `backend/src/models/usuario.model.ts`, `backend/src/models/equipe.model.ts` (`DadosInscricao`, `inscrever`), `backend/src/controllers/equipe.controller.ts` (`inscricao` + nova `gerarConviteMembro`), `backend/src/controllers/usuario.controller.ts` (`store`), `backend/src/controllers/convite.controller.ts` (`reenviar`), `backend/src/routes.ts`

**Interfaces:**
- Consumes: helpers (Task 1); `findControleBySlug` com `papel` e `show` com `membros[].pendente` (Task 2).
- Produces:
  - `STATUS_EQUIPE_ATIVA`, `type ColegaExistente`, `type Vinculo`, `classificarColega(e: ColegaExistente | null): Vinculo` (de `src/domain/membros.ts`).
  - `linkConvite(tokenBruto: string): string` (de `src/utils/convite.ts`).
  - `usuarioModel.findParaVinculo(emails: string[]): Promise<Array<ColegaExistente & { email: string; nome: string }>>`.
  - API: inscrição responde `colegas: [{ slug, nome, email, conviteUrl: string | null, token_dev? }]`; `POST /equipes/:slug/membros/:membro/convite` → 201 `{ conviteUrl, expiraEm }`; `POST /usuarios` e `POST /usuarios/:slug/convite` passam a devolver `conviteUrl`.

- [ ] **Step 1: Branch e issue**

```bash
git checkout staging && git pull && git checkout -b feat/rn03-vinculo-e-convite-link
gh issue create --title "backend: RN-03 (1 pessoa, 1 equipe ativa) + link de convite copiável" --body "Reutilizar a pessoa existente na inscrição (bloquear só se já está em equipe ativa); líder ativado no cadastro; devolver conviteUrl ao líder/admin; endpoint para gerar novo link de um membro pendente." --label enhancement
```
Anote o número `N` da issue criada e rode `gh issue comment N --body "Pegando."`.

- [ ] **Step 2: Teste unitário (falha)**

`backend/tests/membros.unit.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { classificarColega } from "../src/domain/membros.js";

const base = { id: "u", slug: "s", tipo_usuario: "aluno", convite_aceito_em: new Date(), emEquipeAtiva: false };

describe("classificarColega (RN-03)", () => {
  it("e-mail novo → criar", () => {
    expect(classificarColega(null)).toEqual({ acao: "criar" });
  });
  it("aluno ativado sem equipe ativa → vincular sem convite", () => {
    expect(classificarColega(base)).toEqual({ acao: "vincular", comConvite: false });
  });
  it("aluno que nunca aceitou convite → vincular com convite novo", () => {
    expect(classificarColega({ ...base, convite_aceito_em: null })).toEqual({ acao: "vincular", comConvite: true });
  });
  it("já em equipe ativa → recusar RN03_EQUIPE_ATIVA", () => {
    expect(classificarColega({ ...base, emEquipeAtiva: true })).toEqual({ acao: "recusar", codigo: "RN03_EQUIPE_ATIVA" });
  });
  it("conta de mentor/admin → recusar EMAIL_NAO_ALUNO", () => {
    expect(classificarColega({ ...base, tipo_usuario: "mentor" })).toEqual({ acao: "recusar", codigo: "EMAIL_NAO_ALUNO" });
  });
});
```
Run: `npx vitest run tests/membros.unit.test.ts` → Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Regra pura e link**

`backend/src/domain/membros.ts`:
```ts
// RN-03: um aluno integra apenas UMA equipe ativa por vez. Uma pessoa = uma
// linha em `usuarios` (e-mail UNIQUE): quem já participou de outra equipe
// (encerrada) é REUTILIZADO, não duplicado (Q4/Q9 do professor).
export const STATUS_EQUIPE_ATIVA = ["ativa", "pronta_inovamf"] as const;

export interface ColegaExistente {
  id: string;
  slug: string;
  tipo_usuario: string;
  convite_aceito_em: Date | null;
  emEquipeAtiva: boolean;
}

export type Vinculo =
  | { acao: "criar" }
  | { acao: "vincular"; comConvite: boolean }
  | { acao: "recusar"; codigo: "EMAIL_NAO_ALUNO" | "RN03_EQUIPE_ATIVA" };

export function classificarColega(e: ColegaExistente | null): Vinculo {
  if (!e) return { acao: "criar" };
  if (e.tipo_usuario !== "aluno") return { acao: "recusar", codigo: "EMAIL_NAO_ALUNO" };
  if (e.emEquipeAtiva) return { acao: "recusar", codigo: "RN03_EQUIPE_ATIVA" };
  return { acao: "vincular", comConvite: e.convite_aceito_em === null };
}
```
`backend/src/utils/convite.ts`:
```ts
import { env } from "../env.js";

// Link que a pessoa abre para definir a senha (página /convite do front).
// Sem provedor de e-mail, este link é mostrado para quem convidou copiar.
export function linkConvite(tokenBruto: string): string {
  return `${env.inviteUrlBase}?token=${encodeURIComponent(tokenBruto)}`;
}
```
Run: `npx vitest run tests/membros.unit.test.ts` → Expected: PASS.

- [ ] **Step 4: Teste de integração (falha)**

`backend/tests/rn03-convites.test.ts`:
```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { SENHA, bearer, criarEquipe, criarUsuario, limpar, login } from "./helpers.js";

const app = createApp();
const sufixo = `rn03${Date.now()}`;
const email = (n: string) => `${n}.${sufixo}@teste.local`;
let equipeSlug = "";
let liderAccess = "";
let novoSlug = "";
let veteranoSlug = "";
let tokenInicial = "";

function inscricao(liderEmail: string, colegas: Array<{ nome: string; email: string }>) {
  return request(app)
    .post("/api/v1/equipes/inscricao")
    .send({
      lider: { nome: "Líder RN03", email: liderEmail, senha: SENHA, telefone: "55991112222", curso: "ADS", semestre: "4º" },
      ideia: { nome: `Ideia ${liderEmail} ${sufixo}`, descricao: "desc", estagio: "ideia" },
      colegas,
    });
}

beforeAll(async () => {
  const veterano = await criarUsuario(email("veterano"), "aluno", { nome: "Veterano Souza" });
  veteranoSlug = veterano.slug;
  await criarEquipe({ nome: `Antiga ${sufixo}`, status: "encaminhada_inovamf", membros: [{ id: veterano.id, papel: "lider" }] });
  const ocupado = await criarUsuario(email("ocupado"), "aluno");
  await criarEquipe({ nome: `Ocupada ${sufixo}`, membros: [{ id: ocupado.id, papel: "lider" }] });
  await criarUsuario(email("mentor"), "mentor");
});

afterAll(async () => {
  await limpar(sufixo);
  await prisma.$disconnect();
});

describe("inscrição com colegas já cadastrados (RN-03)", () => {
  it("reutiliza o veterano (1 linha) e gera link só para o novo", async () => {
    const r = await inscricao(email("lider"), [
      { nome: "Veterano Souza", email: email("veterano") },
      { nome: "Novo Colega", email: email("novo") },
    ]);
    expect(r.status).toBe(201);
    equipeSlug = r.body.equipe.slug;
    liderAccess = r.body.access;
    const porEmail = Object.fromEntries(r.body.colegas.map((c: { email: string }) => [c.email, c]));
    expect(porEmail[email("veterano")].conviteUrl).toBeNull();
    expect(porEmail[email("novo")].conviteUrl).toContain("/convite?token=");
    novoSlug = porEmail[email("novo")].slug;
    tokenInicial = decodeURIComponent(porEmail[email("novo")].conviteUrl.split("token=")[1]);
    expect(await prisma.usuarios.count({ where: { email: email("veterano") } })).toBe(1);
  });

  it("líder nasce ativado; membro novo aparece como pendente", async () => {
    const r = await request(app).get(`/api/v1/equipes/${equipeSlug}`).set(bearer(liderAccess));
    const porSlug = Object.fromEntries(r.body.membros.map((m: { slug: string; pendente: boolean }) => [m.slug, m.pendente]));
    expect(porSlug[novoSlug]).toBe(true);
    expect(porSlug[veteranoSlug]).toBe(false);
    expect(r.body.membros.find((m: { papel: string }) => m.papel === "lider").pendente).toBe(false);
  });

  it("409 RN03_EQUIPE_ATIVA para quem já está em equipe ativa", async () => {
    const r = await inscricao(email("lider2"), [{ nome: "Ocupado Lima", email: email("ocupado") }]);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("RN03_EQUIPE_ATIVA");
  });

  it("409 EMAIL_NAO_ALUNO para e-mail de mentor", async () => {
    const r = await inscricao(email("lider3"), [{ nome: "Mentor Mesmo", email: email("mentor") }]);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("EMAIL_NAO_ALUNO");
  });
});

describe("POST /equipes/:slug/membros/:membro/convite", () => {
  it("líder gera link novo; o anterior deixa de valer", async () => {
    const r = await request(app)
      .post(`/api/v1/equipes/${equipeSlug}/membros/${novoSlug}/convite`)
      .set(bearer(liderAccess));
    expect(r.status).toBe(201);
    expect(r.body.conviteUrl).toContain("/convite?token=");
    const antigo = await request(app).get("/api/v1/auth/invite").query({ token: tokenInicial });
    expect(antigo.status).toBe(400);
    expect(antigo.body.error.code).toBe("INVITE_USED");
    const novo = decodeURIComponent(r.body.conviteUrl.split("token=")[1]);
    const ok = await request(app).get("/api/v1/auth/invite").query({ token: novo });
    expect(ok.status).toBe(200);
  });

  it("409 para quem já aceitou; 403 para quem não é da equipe", async () => {
    const aceito = await request(app)
      .post(`/api/v1/equipes/${equipeSlug}/membros/${veteranoSlug}/convite`)
      .set(bearer(liderAccess));
    expect(aceito.status).toBe(409);

    const estranhoAccess = await login(app, email("ocupado"));
    const proibido = await request(app)
      .post(`/api/v1/equipes/${equipeSlug}/membros/${novoSlug}/convite`)
      .set(bearer(estranhoAccess));
    expect(proibido.status).toBe(403);
  });
});
```
Run: `npx vitest run tests/rn03-convites.test.ts` → Expected: FAIL (primeiro teste: 409 `EMAIL_TAKEN`).

- [ ] **Step 5: Model de usuários**

Em `backend/src/models/usuario.model.ts` acrescentar:
```ts
import { STATUS_EQUIPE_ATIVA, type ColegaExistente } from "../domain/membros.js";

// Para a inscrição: quem destes e-mails já existe, e se está em equipe ativa (RN-03).
export async function findParaVinculo(
  emails: string[],
): Promise<Array<ColegaExistente & { email: string; nome: string }>> {
  if (emails.length === 0) return [];
  const rows = await prisma.usuarios.findMany({
    where: { email: { in: emails } },
    select: {
      id: true,
      slug: true,
      nome: true,
      email: true,
      tipo_usuario: true,
      convite_aceito_em: true,
      equipe_membros: {
        where: { ativo: true, equipes: { status: { in: [...STATUS_EQUIPE_ATIVA] } } },
        select: { equipe_id: true },
      },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    nome: r.nome,
    email: r.email,
    tipo_usuario: r.tipo_usuario,
    convite_aceito_em: r.convite_aceito_em,
    emEquipeAtiva: r.equipe_membros.length > 0,
  }));
}
```

- [ ] **Step 6: Model da inscrição**

Em `backend/src/models/equipe.model.ts`, substituir o tipo `colegas` de `DadosInscricao` por:
```ts
  colegas: Array<{
    usuarioId: string;
    // null = pessoa já existe (RN-03): só ganha o vínculo com a equipe.
    criar: { slug: string; nome: string; email: string; telefone: string; senhaHash: string } | null;
    convite: { id: string; hash: string; expiraEm: Date } | null;
  }>;
```
Em `inscrever`, no `prisma.usuarios.create` do líder acrescentar `convite_aceito_em: new Date(),` (o líder define a senha no cadastro — RF-02), e substituir o `for (const c of p.colegas) { … }` por:
```ts
  for (const c of p.colegas) {
    if (c.criar) {
      ops.push(
        prisma.usuarios.create({
          data: {
            id: c.usuarioId,
            slug: c.criar.slug,
            nome: c.criar.nome,
            email: c.criar.email,
            telefone: c.criar.telefone,
            senha: c.criar.senhaHash,
            tipo_usuario: "aluno",
          },
        }),
      );
    }
    ops.push(
      prisma.equipe_membros.create({
        data: { equipe_id: p.equipe.id, usuario_id: c.usuarioId, papel: "integrante" },
      }),
    );
    if (c.convite) {
      if (!c.criar) {
        ops.push(
          prisma.tokens_senha.updateMany({
            where: { usuario_id: c.usuarioId, finalidade: "convite", usado_em: null },
            data: { usado_em: new Date() },
          }),
        );
      }
      ops.push(
        prisma.tokens_senha.create({
          data: {
            id: c.convite.id,
            usuario_id: c.usuarioId,
            token_hash: c.convite.hash,
            finalidade: "convite",
            expira_em: c.convite.expiraEm,
          },
        }),
      );
    }
  }
```

- [ ] **Step 7: Controller da inscrição**

Em `backend/src/controllers/equipe.controller.ts`:

(a) imports: `import { classificarColega } from "../domain/membros.js";`, `import { linkConvite } from "../utils/convite.js";`, `import * as tokenModel from "../models/token.model.js";`.

(b) substituir o trecho que começa em `const jaExistem = await usuarioModel.findEmailsExistentes(todosEmails);` até o fim de `const colegasPrep = await Promise.all(…);` por:
```ts
    if (await usuarioModel.findAnyByEmail(emailLider)) {
      throw httpError(409, "EMAIL_TAKEN", "Você já tem conta: entre com seu e-mail e senha");
    }
    const existentes = new Map(
      (await usuarioModel.findParaVinculo(listaColegas.map((c) => c.email))).map((u) => [u.email, u]),
    );
    const MSG_RECUSA = {
      RN03_EQUIPE_ATIVA: (e: string) => `${e} já participa de uma equipe ativa`,
      EMAIL_NAO_ALUNO: (e: string) => `${e} pertence a uma conta de mentor/admin`,
    } as const;

    // Preparar dados (hashes prontos; model só grava)
    const liderIds = novoIdComSlug();
    const equipeIds = novoIdComSlug();
    const expiraConvite = new Date(Date.now() + env.inviteTtlHoras * 3_600_000);

    const colegasPrep = await Promise.all(
      listaColegas.map(async (c) => {
        const existente = existentes.get(c.email) ?? null;
        const v = classificarColega(existente);
        if (v.acao === "recusar") throw httpError(409, v.codigo, MSG_RECUSA[v.codigo](c.email));

        const precisaConvite = v.acao === "criar" || v.comConvite;
        const segredo = tokenAleatorio(24);
        const conviteId = newId();
        const convite = precisaConvite
          ? { id: conviteId, hash: await hashTokenSenha(segredo), expiraEm: expiraConvite }
          : null;

        if (v.acao === "criar") {
          const ids = novoIdComSlug();
          return {
            usuarioId: ids.id,
            slug: ids.slug,
            nome: c.nome,
            email: c.email,
            criar: {
              slug: ids.slug,
              nome: c.nome,
              email: c.email,
              telefone: c.telefone,
              senhaHash: await hashSenha(tokenAleatorio(32)),
            },
            convite,
            conviteToken: `${conviteId}.${segredo}`,
          };
        }
        return {
          usuarioId: existente!.id,
          slug: existente!.slug,
          nome: existente!.nome,
          email: c.email,
          criar: null,
          convite,
          conviteToken: convite ? `${conviteId}.${segredo}` : null,
        };
      }),
    );
```
(c) no objeto passado a `equipeModel.inscrever`, trocar `colegas: colegasPrep,` por:
```ts
      colegas: colegasPrep.map((c) => ({ usuarioId: c.usuarioId, criar: c.criar, convite: c.convite })),
```
(d) no loop de e-mails de convite, trocar `for (const c of colegasPrep) {` por `for (const c of colegasPrep.filter((x) => x.conviteToken)) {`, trocar `destinatarioId: c.id,` por `destinatarioId: c.usuarioId,` e `link: link(c.conviteToken)` por `link: linkConvite(c.conviteToken!)`; apagar a constante local `const link = (token: string) => …`.

(e) no `res.status(201).json`, trocar `colegas: colegasPrep.map(…)` por:
```ts
      colegas: colegasPrep.map((c) => ({
        slug: c.slug,
        nome: c.nome,
        email: c.email,
        conviteUrl: c.conviteToken ? linkConvite(c.conviteToken) : null,
        ...(env.nodeEnv !== "production" && c.conviteToken ? { token_dev: c.conviteToken } : {}),
      })),
```
(f) remover o import agora não usado de `findEmailsExistentes` se nada mais usar (é uma função do model; só remova a chamada, a função pode ficar).

(g) acrescentar a nova ação no fim do arquivo:
```ts
// POST /equipes/:slug/membros/:membro/convite — gera um link NOVO para um
// integrante que ainda não aceitou (o anterior é invalidado). Líder da equipe,
// mentor da equipe ou admin. Sem e-mail configurado, quem pede copia o link.
export async function gerarConviteMembro(req: Request, res: Response, next: NextFunction) {
  try {
    const controle = await equipeModel.findControleBySlug(req.params.slug ?? "");
    if (!controle) throw httpError(404, "EQUIPE_NOT_FOUND", "Equipe não encontrada");

    const eu = idDoChamador(req);
    const ehLider = controle.equipe_membros.some((m) => m.usuario_id === eu && m.papel === "lider");
    if (!podeGerirEquipe(req, controle.mentor_id) && !(req.auth.role === "aluno" && ehLider)) {
      throw httpError(403, "FORBIDDEN", "Só o líder, o mentor ou o admin geram convites");
    }

    const membroId = fromSlug(req.params.membro ?? "");
    if (!membroId || !controle.equipe_membros.some((m) => m.usuario_id === membroId)) {
      throw httpError(404, "MEMBRO_NOT_FOUND", "Integrante não encontrado nesta equipe");
    }
    const dados = await usuarioModel.findDadosConvite(membroId);
    if (!dados) throw httpError(404, "MEMBRO_NOT_FOUND", "Integrante não encontrado");
    if (dados.convite_aceito_em) {
      throw httpError(409, "ALREADY_ACCEPTED", "Esta pessoa já ativou a conta");
    }

    await tokenModel.invalidarConvitesAtivos(membroId);
    const convite = await tokenModel.criarConvite({ usuarioId: membroId, ttlHoras: env.inviteTtlHoras });
    res.status(201).json({
      conviteUrl: linkConvite(convite.tokenBruto),
      expiraEm: convite.expiraEm.toISOString(),
    });
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 8: Rota e `conviteUrl` do admin**

`backend/src/routes.ts`, logo após a linha de `moverEtapa`:
```ts
routes.post("/equipes/:slug/membros/:membro/convite", auth, equipeCtrl.gerarConviteMembro);
```
`backend/src/controllers/usuario.controller.ts` (`store`): importar `import { linkConvite } from "../utils/convite.js";`, trocar `const link = \`${env.inviteUrlBase}?token=…\`;` por `const link = linkConvite(convite.tokenBruto);` e acrescentar `conviteUrl: link,` dentro do `res.status(201).json({ … })` (ao lado de `convite:`).
`backend/src/controllers/convite.controller.ts` (`reenviar`): mesma troca do `link` e acrescentar `conviteUrl: link,` no `res.status(201).json({ … })`.

- [ ] **Step 9: Rodar tudo**

Run: `npm test && npm run build`
Expected: todos PASS (os testes antigos de convite usam `token_dev`, que continua fora de produção).

- [ ] **Step 10: Commit e PR**

```bash
git add src/domain/membros.ts src/utils/convite.ts src/models/usuario.model.ts src/models/equipe.model.ts src/controllers/equipe.controller.ts src/controllers/usuario.controller.ts src/controllers/convite.controller.ts src/routes.ts tests/membros.unit.test.ts tests/rn03-convites.test.ts
git commit -m "feat(backend): reutiliza aluno existente (RN-03) e devolve link de convite copiável

Closes #N

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -u origin feat/rn03-vinculo-e-convite-link
gh pr create --base staging --title "feat(backend): RN-03 + convite por link copiável" --body "$(cat <<'EOF'
## O quê
- Inscrição reutiliza o aluno já cadastrado (1 linha por pessoa) e só recusa se ele está em equipe ativa (`RN03_EQUIPE_ATIVA`) ou se o e-mail é de mentor/admin (`EMAIL_NAO_ALUNO`).
- Líder nasce com a conta ativada (define a senha no cadastro — RF-02).
- Resposta da inscrição, de `POST /usuarios` e do reenvio trazem `conviteUrl`.
- `POST /equipes/:slug/membros/:membro/convite`: líder/mentor/admin gera link novo (o anterior morre).
- `GET /equipes/:slug` → `membros[].pendente`.

## Por quê
Sem provedor de e-mail no G1, o link é entregue a quem convidou (WhatsApp). Q9 do professor: mesmo e-mail em duas equipes = 1 linha em `usuarios`.

Closes #N

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
(substituir `#N` pelo número da issue). **Parar e pedir aprovação do usuário para o merge.**

---

## Task 4: Aceite de convite completa os dados do aluno

**Files:**
- Modify: `backend/src/models/token.model.ts` (`consumirConvite`), `backend/src/controllers/auth.controller.ts` (`register`), `backend/tests/equipes.test.ts:135-141`, `backend/tests/rn03-convites.test.ts` (novo describe)

**Interfaces:**
- Consumes: `tokenInicial`/`novoSlug` fluxo da Task 3 (o teste gera um link novo).
- Produces: `POST /auth/register` aceita `curso`, `semestre`, `matricula`; para `role=aluno` exige `curso` e `semestre` (400 `INVALID_CURSO`/`INVALID_SEMESTRE`); grava/atualiza `alunos`. `tokenModel.consumirConvite(params & { aluno?: { curso: string; semestre: string; matricula: string | null } })`.

- [ ] **Step 1: Branch e issue**

```bash
git checkout staging && git pull && git checkout -b feat/convite-completa-aluno
gh issue create --title "backend: aceite de convite completa curso/semestre/matrícula do aluno" --body "O colega informa os próprios dados ao criar a senha em /convite; isso alimenta a RN-02 (dados de todos os integrantes)." --label enhancement
```
Comente "Pegando." na issue criada.

- [ ] **Step 2: Testes (falham)**

Acrescentar ao fim de `backend/tests/rn03-convites.test.ts`:
```ts
describe("POST /auth/register completa os dados do aluno", () => {
  let token = "";
  beforeAll(async () => {
    const r = await request(app)
      .post(`/api/v1/equipes/${equipeSlug}/membros/${novoSlug}/convite`)
      .set(bearer(liderAccess));
    token = decodeURIComponent(r.body.conviteUrl.split("token=")[1]);
  });

  it("400 sem curso", async () => {
    const r = await request(app).post("/api/v1/auth/register").send({ token, senha: "senha-forte-123" });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("INVALID_CURSO");
  });

  it("201 grava curso/semestre/matrícula em alunos", async () => {
    const r = await request(app)
      .post("/api/v1/auth/register")
      .send({ token, senha: "senha-forte-123", curso: "Direito", semestre: "2º", matricula: "20260001" });
    expect(r.status).toBe(201);
    const u = await prisma.usuarios.findUnique({
      where: { email: email("novo") },
      select: { convite_aceito_em: true, alunos: { select: { curso: true, semestre: true, matricula: true } } },
    });
    expect(u?.convite_aceito_em).toBeTruthy();
    expect(u?.alunos).toEqual({ curso: "Direito", semestre: "2º", matricula: "20260001" });
  });
});
```
Em `backend/tests/equipes.test.ts`, no `it("colega aceita o convite e define a senha")`, trocar o `.send({...})` por:
```ts
      .send({ token: colegaToken, senha: "senha-colega-forte", telefone: "55993334444", curso: "Engenharia", semestre: "3º" });
```
Run: `npx vitest run tests/rn03-convites.test.ts` → Expected: FAIL ("400 sem curso" recebe 201).

- [ ] **Step 3: Model**

Em `backend/src/models/token.model.ts`, acrescentar no topo `import type { Prisma } from "@prisma/client";` e substituir `consumirConvite` por:
```ts
export function consumirConvite(params: {
  conviteId: string;
  usuarioId: string;
  senhaHash: string;
  perfil?: { nome?: string; telefone?: string };
  // Aluno completa os próprios dados ao aceitar (RN-02: dados de todos os integrantes).
  aluno?: { curso: string; semestre: string; matricula: string | null };
}) {
  const agora = new Date();
  const ops: Prisma.PrismaPromise<unknown>[] = [
    prisma.usuarios.update({
      where: { id: params.usuarioId },
      data: {
        senha: params.senhaHash,
        convite_aceito_em: agora,
        email_verificado_em: agora,
        ...(params.perfil?.nome ? { nome: params.perfil.nome } : {}),
        ...(params.perfil?.telefone ? { telefone: params.perfil.telefone } : {}),
      },
    }),
    prisma.tokens_senha.update({
      where: { id: params.conviteId },
      data: { usado_em: agora },
    }),
  ];
  if (params.aluno) {
    ops.push(
      prisma.alunos.upsert({
        where: { usuario_id: params.usuarioId },
        create: { usuario_id: params.usuarioId, ...params.aluno },
        update: params.aluno,
      }),
    );
  }
  return prisma.$transaction(ops);
}
```

- [ ] **Step 4: Controller**

Em `backend/src/controllers/auth.controller.ts`, `register`: trocar `const { token, senha, nome, telefone } = req.body ?? {};` por `const { token, senha, nome, telefone, curso, semestre, matricula } = req.body ?? {};` e, **depois** de `const convite = await abrirConvite(token);`, inserir:
```ts
    const dados = await usuarioModel.findDadosConvite(convite.usuario_id);
    let aluno: { curso: string; semestre: string; matricula: string | null } | undefined;
    if (dados?.tipo_usuario === "aluno") {
      if (typeof curso !== "string" || curso.trim().length === 0) {
        throw httpError(400, "INVALID_CURSO", "Informe seu curso");
      }
      if (typeof semestre !== "string" || semestre.trim().length === 0) {
        throw httpError(400, "INVALID_SEMESTRE", "Informe seu semestre");
      }
      aluno = {
        curso: curso.trim(),
        semestre: semestre.trim(),
        matricula: typeof matricula === "string" && matricula.trim() ? matricula.trim() : null,
      };
    }
```
e na chamada `tokenModel.consumirConvite({ … })` acrescentar `aluno,`.

- [ ] **Step 5: Rodar tudo**

Run: `npm test && npm run build`
Expected: todos PASS.

- [ ] **Step 6: Commit e PR**

```bash
git add src/models/token.model.ts src/controllers/auth.controller.ts tests/rn03-convites.test.ts tests/equipes.test.ts
git commit -m "feat(backend): aceite de convite grava curso/semestre/matrícula do aluno

Closes #N

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -u origin feat/convite-completa-aluno
gh pr create --base staging --title "feat(backend): convite completa dados do aluno" --body "$(cat <<'EOF'
## O quê
`POST /auth/register` aceita `curso`, `semestre`, `matricula`; para aluno, curso e semestre são obrigatórios e vão para `alunos` na mesma transação que queima o convite.

## Por quê
O dado vem da própria pessoa (não do líder) e fecha a pendência "dados do integrante" da RN-02.

Closes #N

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
**Parar e pedir aprovação do usuário para o merge.**

---

## Task 5: Seed base (dado real, sempre aplicado)

**Files:**
- Create: `backend/src/seed/base.ts`, `backend/tests/seed.test.ts`
- Modify: nenhum ainda (o `start` muda na Task 6)

**Interfaces:**
- Produces: `ADMIN_EMAIL = "admin@infohub.dev"`, `ADMIN_SENHA = "admin123"`, `CICLO_ATUAL = { nome: "2026/2", inicio: "2026-08-01", fim: "2026-12-20" }`, `MODELOS_TAREFA` (8 modelos), `seedBase(db: PrismaClient): Promise<void>` (de `src/seed/base.ts`).

- [ ] **Step 1: Branch e issue**

```bash
git checkout staging && git pull && git checkout -b feat/seed-base
gh issue create --title "backend: seed base (ciclo, modelos de tarefa por etapa, admin inicial)" --body "Camada real do seed, idempotente, aplicada em todo boot." --label enhancement
```
Comente "Pegando." na issue.

- [ ] **Step 2: Teste (falha)**

`backend/tests/seed.test.ts`:
```ts
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { ADMIN_EMAIL, ADMIN_SENHA, CICLO_ATUAL, MODELOS_TAREFA, seedBase } from "../src/seed/base.js";

const app = createApp();

afterAll(async () => {
  await prisma.$disconnect();
});

describe("seedBase", () => {
  it("cria ciclo, modelos e admin — e rodar de novo não duplica", async () => {
    await seedBase(prisma);
    await seedBase(prisma);

    expect(await prisma.ciclos.count({ where: { nome: CICLO_ATUAL.nome } })).toBe(1);
    for (const m of MODELOS_TAREFA) {
      expect(
        await prisma.modelos_tarefa.count({ where: { etapa_id: m.etapa, titulo: m.titulo } }),
      ).toBe(1);
    }
    expect(await prisma.usuarios.count({ where: { email: ADMIN_EMAIL, tipo_usuario: "admin" } })).toBe(1);
  });

  it("o admin inicial consegue logar", async () => {
    const r = await request(app).post("/api/v1/auth/login").send({ email: ADMIN_EMAIL, senha: ADMIN_SENHA });
    expect(r.status).toBe(200);
    expect(r.body.usuario.role).toBe("admin");
  });

  it("etapa 6 tem os entregáveis finais da RN-02", () => {
    expect(MODELOS_TAREFA.filter((m) => m.etapa === 6).map((m) => m.titulo)).toEqual([
      "Pitch vídeo",
      "Business Model Canvas final",
      "Value Proposition Design final",
    ]);
  });
});
```
Run: `npx vitest run tests/seed.test.ts` → Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implementar**

`backend/src/seed/base.ts`:
```ts
import type { PrismaClient } from "@prisma/client";
import { hashSenha } from "../utils/hash.js";
import { novoIdComSlug } from "../utils/slug.js";

// Camada BASE do seed: dados que um InfoHub REAL precisa para funcionar.
// Idempotente — roda em todo boot e nunca sobrescreve o que já existe
// (inclusive a senha do admin, se alguém trocou).

export const ADMIN_EMAIL = "admin@infohub.dev";
export const ADMIN_SENHA = "admin123"; // G1: fixo por decisão do usuário; trocar depois.
export const CICLO_ATUAL = { nome: "2026/2", inicio: "2026-08-01", fim: "2026-12-20" } as const;

// RF-11: modelos pré-configurados por etapa. Etapa 6 = entregáveis finais (RN-02).
export const MODELOS_TAREFA: ReadonlyArray<{
  etapa: number;
  titulo: string;
  descricao: string;
  prazoDias: number;
  ordem: number;
}> = [
  { etapa: 1, titulo: "Revisar e confirmar os dados da ideia", descricao: "Conferir o formulário de inscrição e corrigir o que for preciso.", prazoDias: 3, ordem: 1 },
  { etapa: 2, titulo: "Confirmar agendamento do primeiro encontro", descricao: "Combinar data e horário com o mentor e confirmar.", prazoDias: 5, ordem: 1 },
  { etapa: 3, titulo: "Definir problema, público-alvo e solução", descricao: "Documento curto com as três definições do Encontro 1.", prazoDias: 7, ordem: 1 },
  { etapa: 4, titulo: "Value Proposition Design (VPD)", descricao: "Canvas de proposta de valor preenchido.", prazoDias: 7, ordem: 1 },
  { etapa: 5, titulo: "Business Model Canvas (BMC)", descricao: "Canvas de modelo de negócio preenchido.", prazoDias: 7, ordem: 1 },
  { etapa: 6, titulo: "Pitch vídeo", descricao: "Vídeo de até 3 minutos apresentando a ideia (link).", prazoDias: 10, ordem: 1 },
  { etapa: 6, titulo: "Business Model Canvas final", descricao: "Versão final do BMC.", prazoDias: 10, ordem: 2 },
  { etapa: 6, titulo: "Value Proposition Design final", descricao: "Versão final do VPD.", prazoDias: 10, ordem: 3 },
];

const dia = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

export async function seedBase(db: PrismaClient): Promise<void> {
  await db.ciclos.upsert({
    where: { nome: CICLO_ATUAL.nome },
    update: {},
    create: {
      nome: CICLO_ATUAL.nome,
      data_inicio: dia(CICLO_ATUAL.inicio),
      data_fim: dia(CICLO_ATUAL.fim),
    },
  });

  for (const m of MODELOS_TAREFA) {
    const existe = await db.modelos_tarefa.findFirst({
      where: { etapa_id: m.etapa, titulo: m.titulo },
      select: { id: true },
    });
    if (!existe) {
      await db.modelos_tarefa.create({
        data: {
          etapa_id: m.etapa,
          titulo: m.titulo,
          descricao: m.descricao,
          obrigatoria: true,
          prazo_padrao_dias: m.prazoDias,
          ordem: m.ordem,
        },
      });
    }
  }

  const admin = await db.usuarios.findUnique({ where: { email: ADMIN_EMAIL }, select: { id: true } });
  if (!admin) {
    const ids = novoIdComSlug();
    const agora = new Date();
    await db.usuarios.create({
      data: {
        id: ids.id,
        slug: ids.slug,
        nome: "Coordenação InfoHub",
        email: ADMIN_EMAIL,
        senha: await hashSenha(ADMIN_SENHA),
        telefone: "",
        tipo_usuario: "admin",
        convite_aceito_em: agora,
        email_verificado_em: agora,
      },
    });
  }
}
```

- [ ] **Step 4: Rodar tudo**

Run: `npm test && npm run build`
Expected: todos PASS; `dist/seed/base.js` gerado.

- [ ] **Step 5: Commit e PR**

```bash
git add src/seed/base.ts tests/seed.test.ts
git commit -m "feat(backend): seed base idempotente — ciclo, modelos por etapa e admin

Closes #N

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -u origin feat/seed-base
gh pr create --base staging --title "feat(backend): seed base" --body "$(cat <<'EOF'
## O quê
`src/seed/base.ts`: ciclo 2026/2, 8 modelos de tarefa (etapa 6 = entregáveis finais da RN-02) e o admin inicial `admin@infohub.dev`. Idempotente; ainda não é chamado no start (Task seguinte).

Closes #N

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
**Parar e pedir aprovação do usuário para o merge.**

---

## Task 6: Seed demo do G1 + purge + `npm start`

**Files:**
- Create: `backend/src/seed/demo.ts`, `backend/src/seed/purge-demo.ts`, `backend/src/seed/index.ts`, `backend/src/seed/purge.ts`
- Modify: `backend/src/env.ts`, `backend/.env.example`, `backend/package.json` (scripts), `backend/tests/seed.test.ts`, `README.md` (seção Deploy)

**Interfaces:**
- Consumes: `seedBase`, `CICLO_ATUAL`, `MODELOS_TAREFA` (Task 5); `hojeISO`, `dataISO` (Task 1); `linkConvite` (Task 3); RN-01 via API (Task 2).
- Produces: `DEMO_DOMINIO = "@demo.infohub.dev"`, `SENHAS_DEMO = { mentor: "mentor123", aluno: "aluno123" }`, `seedDemo(db: PrismaClient, hoje?: string): Promise<{ criado: false } | { criado: true; convitePendente: string }>` (de `demo.ts`); `purgeDemo(db: PrismaClient): Promise<{ equipes: number; usuarios: number }>` (de `purge-demo.ts`); `env.seedDemo: boolean`; scripts `seed`, `seed:demo:purge`.

**Cenário (decidido):**
- Mentores: Carla Menezes (`mentor1`, equipes A e B), Rafael Dornelles (`mentor2`, equipe C), Juliana Prates (`mentor3`, livre), Marcos Tavares (`mentor4`, livre).
- **A — EcoRota** (Sustentabilidade, protótipo), etapa 2: E1 aprovada (+entrega+avaliação+histórico 1→2); E2 obrigatória **entregue aguardando avaliação**; E2 opcional pendente. → demo: aprovar → avançar (200).
- **B — SaúdeJá** (Saúde, ideia), etapa 2: E1 aprovada (+histórico); E2 obrigatória **pendente com prazo há 3 dias** (atrasada). → demo: avançar dá 409, forçar com observação; dashboard conta 1 atrasada.
- **C — Aprende+** (Educação, ideia), etapa 1: E1 pendente (prazo +3); integrante Letícia com **convite pendente**. → demo: gerar/abrir link de convite.

- [ ] **Step 1: Branch e issue**

```bash
git checkout staging && git pull && git checkout -b feat/seed-demo-g1
gh issue create --title "backend: seed demo do G1 (SEED_DEMO) + purge + seed no npm start" --body "Cenário do G1: 3 equipes (1 líder + ≥3 integrantes), 1 admin, 4 mentores (um com 2 equipes, outro com 1), 2 equipes com Etapa 1 aprovada cursando a 2, 1 equipe com tarefa atrasada. Contas @demo.infohub.dev removíveis via npm run seed:demo:purge." --label enhancement
```
Comente "Pegando." na issue.

- [ ] **Step 2: Testes do cenário (falham)**

Acrescentar a `backend/tests/seed.test.ts` (imports novos no topo do arquivo):
```ts
import { beforeAll } from "vitest";
import { DEMO_DOMINIO, SENHAS_DEMO, seedDemo } from "../src/seed/demo.js";
import { purgeDemo } from "../src/seed/purge-demo.js";

const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
async function entrar(email: string, senha: string): Promise<string> {
  const r = await request(app).post("/api/v1/auth/login").send({ email, senha });
  expect(r.status).toBe(200);
  return r.body.access;
}

describe("seedDemo — cenário obrigatório do G1", () => {
  beforeAll(async () => {
    await seedBase(prisma);
    await purgeDemo(prisma);
    const r = await seedDemo(prisma);
    expect(r.criado).toBe(true);
  });

  afterAll(async () => {
    await purgeDemo(prisma);
  });

  const equipesDemo = () =>
    prisma.equipes.findMany({
      where: { equipe_membros: { some: { papel: "lider", usuarios: { email: { endsWith: DEMO_DOMINIO } } } } },
      select: {
        nome_ideia: true,
        etapas: { select: { numero: true } },
        usuarios: { select: { email: true } },
        equipe_membros: { where: { ativo: true }, select: { papel: true } },
        historico_etapas: { select: { etapa_destino_id: true } },
        tarefas: { select: { status: true, obrigatoria: true, etapas: { select: { numero: true } } } },
      },
    });

  it("3 equipes, cada uma com ≥3 integrantes e exatamente 1 líder", async () => {
    const eqs = await equipesDemo();
    expect(eqs).toHaveLength(3);
    for (const e of eqs) {
      expect(e.equipe_membros.length).toBeGreaterThanOrEqual(3);
      expect(e.equipe_membros.filter((m) => m.papel === "lider")).toHaveLength(1);
    }
  });

  it("4 mentores: mentor1 com 2 equipes, mentor2 com 1", async () => {
    expect(
      await prisma.usuarios.count({ where: { tipo_usuario: "mentor", email: { endsWith: DEMO_DOMINIO } } }),
    ).toBe(4);
    const eqs = await equipesDemo();
    const porMentor = eqs.reduce<Record<string, number>>((acc, e) => {
      const k = e.usuarios?.email ?? "-";
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {});
    expect(porMentor[`mentor1${DEMO_DOMINIO}`]).toBe(2);
    expect(porMentor[`mentor2${DEMO_DOMINIO}`]).toBe(1);
  });

  it("2 equipes com a Etapa 1 aprovada cursando a Etapa 2", async () => {
    const naDois = (await equipesDemo()).filter((e) => e.etapas.numero === 2);
    expect(naDois).toHaveLength(2);
    for (const e of naDois) {
      const e1 = e.tarefas.filter((t) => t.etapas.numero === 1 && t.obrigatoria);
      expect(e1.length).toBeGreaterThan(0);
      expect(e1.every((t) => t.status === "aprovada")).toBe(true);
      expect(e.historico_etapas.some((h) => h.etapa_destino_id === 2)).toBe(true);
    }
  });

  it("1 equipe com tarefa atrasada (visível pela API)", async () => {
    const access = await entrar(`mentor1${DEMO_DOMINIO}`, SENHAS_DEMO.mentor);
    const lista = await request(app).get("/api/v1/equipes").set(bearer(access));
    expect(lista.body.data).toHaveLength(2);
    let comAtraso = 0;
    for (const e of lista.body.data as Array<{ slug: string }>) {
      const t = await request(app).get(`/api/v1/equipes/${e.slug}/tarefas?status=atrasada`).set(bearer(access));
      if (t.body.data.length > 0) comAtraso++;
    }
    expect(comAtraso).toBe(1);
  });

  it("ensaio da demo: A avança após aprovar a entrega; B é barrada pela RN-01", async () => {
    const access = await entrar(`mentor1${DEMO_DOMINIO}`, SENHAS_DEMO.mentor);
    const lista = await request(app).get("/api/v1/equipes").set(bearer(access));
    const slugDe = (nome: string) =>
      (lista.body.data as Array<{ slug: string; nomeIdeia: string }>).find((e) => e.nomeIdeia === nome)!.slug;

    const tarefasA = await request(app).get(`/api/v1/equipes/${slugDe("EcoRota")}/tarefas?status=entregue`).set(bearer(access));
    const entregas = await request(app).get(`/api/v1/tarefas/${tarefasA.body.data[0].slug}/entregas`).set(bearer(access));
    const av = await request(app)
      .post(`/api/v1/entregas/${entregas.body.data[0].slug}/avaliacoes`)
      .set(bearer(access))
      .send({ resultado: "aprovada", comentario: "Agendamento ok" });
    expect(av.status).toBe(201);
    const okA = await request(app).post(`/api/v1/equipes/${slugDe("EcoRota")}/etapa`).set(bearer(access)).send({ etapa: 3 });
    expect(okA.status).toBe(200);

    const b = await request(app).post(`/api/v1/equipes/${slugDe("SaúdeJá")}/etapa`).set(bearer(access)).send({ etapa: 3 });
    expect(b.status).toBe(409);
    expect(b.body.error.code).toBe("RN01_PENDENCIAS");
  });

  it("alunos e mentores logam com a senha do papel", async () => {
    await entrar(`bruna.lopes${DEMO_DOMINIO}`, SENHAS_DEMO.aluno);
    await entrar(`mentor3${DEMO_DOMINIO}`, SENHAS_DEMO.mentor);
  });

  it("rodar de novo não duplica nada", async () => {
    const antes = await prisma.usuarios.count({ where: { email: { endsWith: DEMO_DOMINIO } } });
    const r = await seedDemo(prisma);
    expect(r.criado).toBe(false);
    expect(await prisma.usuarios.count({ where: { email: { endsWith: DEMO_DOMINIO } } })).toBe(antes);
  });
});

describe("purgeDemo", () => {
  it("remove só a camada demo; a base fica", async () => {
    await seedDemo(prisma);
    const r = await purgeDemo(prisma);
    expect(r.equipes).toBe(3);
    expect(await prisma.usuarios.count({ where: { email: { endsWith: DEMO_DOMINIO } } })).toBe(0);
    expect(await prisma.usuarios.count({ where: { email: ADMIN_EMAIL } })).toBe(1);
  });
});
```
Run: `npx vitest run tests/seed.test.ts` → Expected: FAIL (módulos `demo`/`purge-demo` inexistentes).

- [ ] **Step 3: `env.seedDemo`**

Em `backend/src/env.ts`, dentro de `export const env = { … }`, antes de `} as const;`:
```ts
  // G1: monta o cenário de demonstração no boot (contas @demo.infohub.dev).
  seedDemo: process.env.SEED_DEMO === "true",
```
Em `backend/.env.example`, no fim:
```
# Seed de demonstração do G1 (contas @demo.infohub.dev). Remover com
# `npm run seed:demo:purge` quando o sistema entrar em uso real.
SEED_DEMO=false
```

- [ ] **Step 4: Seed demo**

`backend/src/seed/demo.ts`:
```ts
import type { Prisma, PrismaClient } from "@prisma/client";
import { hashSenha, hashTokenSenha, tokenAleatorio } from "../utils/hash.js";
import { newId, novoIdComSlug } from "../utils/slug.js";
import { hojeISO } from "../domain/atraso.js";
import { CICLO_ATUAL, MODELOS_TAREFA } from "./base.js";

// Camada DEMO do seed — cenário obrigatório do G1, armado para cada fluxo da
// demo ao vivo. Tudo que é demo usa o domínio DEMO_DOMINIO: é o marcador que o
// purge usa para remover a camada quando o sistema entrar em uso real.
// Roda UMA vez (se mentor1 já existe, não faz nada): o que acontecer na demo
// persiste entre deploys.

export const DEMO_DOMINIO = "@demo.infohub.dev";
export const SENHAS_DEMO = { mentor: "mentor123", aluno: "aluno123" } as const;

type Pessoa = {
  nome: string;
  usuario: string; // parte local do e-mail
  curso?: string;
  semestre?: string;
  matricula?: string;
  pendente?: boolean; // ainda não aceitou o convite
};

const MENTORES: Pessoa[] = [
  { nome: "Carla Menezes", usuario: "mentor1" },
  { nome: "Rafael Dornelles", usuario: "mentor2" },
  { nome: "Juliana Prates", usuario: "mentor3" },
  { nome: "Marcos Tavares", usuario: "mentor4" },
];

type EquipeDemo = {
  chave: "A" | "B" | "C";
  nome: string;
  descricao: string;
  area: string;
  estagio: string;
  mentor: 0 | 1;
  etapa: 1 | 2;
  lider: Pessoa;
  integrantes: Pessoa[];
};

const EQUIPES: EquipeDemo[] = [
  {
    chave: "A",
    nome: "EcoRota",
    descricao: "Aplicativo que otimiza rotas de coleta seletiva para cooperativas de reciclagem de Canoas.",
    area: "Sustentabilidade",
    estagio: "prototipo",
    mentor: 0,
    etapa: 2,
    lider: { nome: "Bruna Lopes", usuario: "bruna.lopes", curso: "Engenharia de Software", semestre: "5º", matricula: "20230101" },
    integrantes: [
      { nome: "Diego Ramos", usuario: "diego.ramos", curso: "Engenharia de Software", semestre: "5º", matricula: "20230102" },
      { nome: "Larissa Kunz", usuario: "larissa.kunz", curso: "Administração", semestre: "4º", matricula: "20230215" },
    ],
  },
  {
    chave: "B",
    nome: "SaúdeJá",
    descricao: "Triagem por WhatsApp que orienta o paciente para a unidade de saúde certa antes de sair de casa.",
    area: "Saúde",
    estagio: "ideia",
    mentor: 0,
    etapa: 2,
    lider: { nome: "Pedro Henrique Souza", usuario: "pedro.souza", curso: "Enfermagem", semestre: "6º", matricula: "20220330" },
    integrantes: [
      { nome: "Camila Fontana", usuario: "camila.fontana", curso: "Enfermagem", semestre: "6º", matricula: "20220331" },
      { nome: "Thiago Weber", usuario: "thiago.weber", curso: "Sistemas de Informação", semestre: "3º", matricula: "20240112" },
    ],
  },
  {
    chave: "C",
    nome: "Aprende+",
    descricao: "Plataforma de monitoria entre alunos veteranos e calouros, com agendamento e trilhas por disciplina.",
    area: "Educação",
    estagio: "ideia",
    mentor: 1,
    etapa: 1,
    lider: { nome: "Mariana Alves", usuario: "mariana.alves", curso: "Pedagogia", semestre: "2º", matricula: "20250404" },
    integrantes: [
      { nome: "Gustavo Pires", usuario: "gustavo.pires", curso: "Análise e Desenvolvimento de Sistemas", semestre: "2º", matricula: "20250405" },
      { nome: "Letícia Moraes", usuario: "leticia.moraes", pendente: true },
    ],
  },
];

const email = (p: Pessoa) => `${p.usuario}${DEMO_DOMINIO}`;

function diaRelativo(hoje: string, n: number): Date {
  const d = new Date(`${hoje}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}
const horasAtras = (h: number) => new Date(Date.now() - h * 3_600_000);

export async function seedDemo(
  db: PrismaClient,
  hoje: string = hojeISO(),
): Promise<{ criado: false } | { criado: true; convitePendente: string }> {
  const marcador = await db.usuarios.findUnique({
    where: { email: email(MENTORES[0]!) },
    select: { id: true },
  });
  if (marcador) return { criado: false };

  // bcrypt é caro: um hash por papel (contas demo compartilham a senha do papel).
  const [hashMentor, hashAluno, hashInutil] = await Promise.all([
    hashSenha(SENHAS_DEMO.mentor),
    hashSenha(SENHAS_DEMO.aluno),
    hashSenha(tokenAleatorio(32)),
  ]);
  const conviteId = newId();
  const segredo = tokenAleatorio(24);
  const conviteHash = await hashTokenSenha(segredo);

  const ciclo = await db.ciclos.findUnique({ where: { nome: CICLO_ATUAL.nome }, select: { id: true } });
  const areas = await db.areas_ideia.findMany({ select: { id: true, nome: true } });
  const modelos = await db.modelos_tarefa.findMany({ select: { id: true, etapa_id: true, titulo: true } });
  const modeloId = (etapa: number, titulo: string) =>
    modelos.find((m) => m.etapa_id === etapa && m.titulo === titulo)?.id ?? null;
  const T = (etapa: number) => MODELOS_TAREFA.find((m) => m.etapa === etapa)!;

  await db.$transaction(
    async (tx) => {
      const agora = new Date();

      const criarPessoa = async (p: Pessoa, tipo: "mentor" | "aluno") => {
        const ids = novoIdComSlug();
        await tx.usuarios.create({
          data: {
            id: ids.id,
            slug: ids.slug,
            nome: p.nome,
            email: email(p),
            senha: p.pendente ? hashInutil : tipo === "mentor" ? hashMentor : hashAluno,
            telefone: "51999990000",
            tipo_usuario: tipo,
            convite_aceito_em: p.pendente ? null : agora,
            email_verificado_em: p.pendente ? null : agora,
          },
        });
        if (tipo === "aluno" && !p.pendente) {
          await tx.alunos.create({
            data: { usuario_id: ids.id, curso: p.curso, semestre: p.semestre, matricula: p.matricula },
          });
        }
        return ids.id;
      };

      const criarTarefa = async (t: {
        equipeId: string;
        etapa: number;
        titulo: string;
        descricao: string;
        obrigatoria: boolean;
        prazo: Date;
        status: string;
        criadoPor: string;
        concluidaEm?: Date;
      }) =>
        (
          await tx.tarefas.create({
            data: {
              equipe_id: t.equipeId,
              etapa_id: t.etapa,
              modelo_id: modeloId(t.etapa, t.titulo),
              titulo: t.titulo,
              descricao: t.descricao,
              obrigatoria: t.obrigatoria,
              data_entrega: t.prazo,
              status: t.status,
              criado_por: t.criadoPor,
              concluida_em: t.concluidaEm ?? null,
            },
            select: { id: true },
          })
        ).id;

      const criarEntrega = async (e: {
        tarefaId: string;
        enviadoPor: string;
        url: string;
        nome: string;
        comentario: string;
        em: Date;
      }) =>
        (
          await tx.entregas.create({
            data: {
              tarefa_id: e.tarefaId,
              versao: 1,
              enviado_por: e.enviadoPor,
              comentario: e.comentario,
              criado_em: e.em,
              arquivos_entrega: {
                create: [{ tipo: "link", url_externa: e.url, nome_original: e.nome }],
              },
            },
            select: { id: true },
          })
        ).id;

      const mentorIds: string[] = [];
      for (const m of MENTORES) mentorIds.push(await criarPessoa(m, "mentor"));

      for (const e of EQUIPES) {
        const mentorId = mentorIds[e.mentor]!;
        const equipe = novoIdComSlug();
        await tx.equipes.create({
          data: {
            id: equipe.id,
            slug: equipe.slug,
            nome_ideia: e.nome,
            descricao_ideia: e.descricao,
            estagio_ideia: e.estagio,
            area_id: areas.find((a) => a.nome === e.area)?.id ?? null,
            ciclo_id: ciclo?.id ?? null,
            mentor_id: mentorId,
            etapa_atual_id: e.etapa,
            origem_divulgacao: "Divulgação em sala",
            criado_em: horasAtras(24 * 12),
          } satisfies Prisma.equipesUncheckedCreateInput,
        });

        const liderId = await criarPessoa(e.lider, "aluno");
        await tx.equipe_membros.create({ data: { equipe_id: equipe.id, usuario_id: liderId, papel: "lider" } });
        for (const p of e.integrantes) {
          const id = await criarPessoa(p, "aluno");
          await tx.equipe_membros.create({ data: { equipe_id: equipe.id, usuario_id: id, papel: "integrante" } });
          if (p.pendente) {
            await tx.tokens_senha.create({
              data: {
                id: conviteId,
                usuario_id: id,
                token_hash: conviteHash,
                finalidade: "convite",
                expira_em: diaRelativo(hoje, 7),
              },
            });
          }
        }

        // Etapa 1 — igual para todos; A e B já aprovaram e avançaram.
        const e1 = T(1);
        if (e.etapa === 2) {
          const t1 = await criarTarefa({
            equipeId: equipe.id, etapa: 1, titulo: e1.titulo, descricao: e1.descricao,
            obrigatoria: true, prazo: diaRelativo(hoje, -10), status: "aprovada",
            criadoPor: mentorId, concluidaEm: horasAtras(24 * 7),
          });
          const en1 = await criarEntrega({
            tarefaId: t1, enviadoPor: liderId,
            url: `https://docs.google.com/document/d/demo-${e.chave.toLowerCase()}-ideia`,
            nome: "Ideia revisada", comentario: "Dados conferidos pela equipe.", em: horasAtras(24 * 8),
          });
          await tx.avaliacoes_entrega.create({
            data: { entrega_id: en1, avaliador_id: mentorId, resultado: "aprovada", comentario: "Ideia clara, podem seguir." },
          });
          await tx.historico_etapas.create({
            data: {
              equipe_id: equipe.id, etapa_origem_id: 1, etapa_destino_id: 2,
              status_origem: "ativa", status_destino: "ativa",
              movido_por: mentorId, forcado: false, observacao: "Etapa 1 aprovada",
              criado_em: horasAtras(24 * 7),
            },
          });
        } else {
          await criarTarefa({
            equipeId: equipe.id, etapa: 1, titulo: e1.titulo, descricao: e1.descricao,
            obrigatoria: true, prazo: diaRelativo(hoje, 3), status: "pendente", criadoPor: mentorId,
          });
        }

        const e2 = T(2);
        if (e.chave === "A") {
          const t2 = await criarTarefa({
            equipeId: equipe.id, etapa: 2, titulo: e2.titulo, descricao: e2.descricao,
            obrigatoria: true, prazo: diaRelativo(hoje, 4), status: "entregue", criadoPor: mentorId,
          });
          await criarEntrega({
            tarefaId: t2, enviadoPor: liderId,
            url: "https://calendar.google.com/calendar/demo-ecorota-encontro-1",
            nome: "Convite do encontro", comentario: "Encontro marcado para quinta, 19h, sala 204.",
            em: horasAtras(20),
          });
          await criarTarefa({
            equipeId: equipe.id, etapa: 2, titulo: "Gravar apresentação de 1 minuto",
            descricao: "Opcional: vídeo curto para o mentor conhecer a equipe.",
            obrigatoria: false, prazo: diaRelativo(hoje, 10), status: "pendente", criadoPor: mentorId,
          });
        }
        if (e.chave === "B") {
          await criarTarefa({
            equipeId: equipe.id, etapa: 2, titulo: e2.titulo, descricao: e2.descricao,
            obrigatoria: true, prazo: diaRelativo(hoje, -3), status: "pendente", criadoPor: mentorId,
          });
        }
      }
    },
    { timeout: 30_000 },
  );

  return { criado: true, convitePendente: `${conviteId}.${segredo}` };
}
```

- [ ] **Step 5: Purge**

`backend/src/seed/purge-demo.ts`:
```ts
import type { PrismaClient } from "@prisma/client";
import { DEMO_DOMINIO } from "./demo.js";

// Remove a camada DEMO (contas DEMO_DOMINIO e as equipes que elas LIDERAM),
// preservando a base e qualquer dado real. Equipe real que tinha mentor demo
// fica sem mentor. Tudo numa transação: se algo real referenciar uma conta demo
// de um jeito não previsto (FK), nada é apagado e o erro aparece.
export async function purgeDemo(db: PrismaClient): Promise<{ equipes: number; usuarios: number }> {
  return db.$transaction(
    async (tx) => {
      const ids = (
        await tx.usuarios.findMany({ where: { email: { endsWith: DEMO_DOMINIO } }, select: { id: true } })
      ).map((u) => u.id);
      if (ids.length === 0) return { equipes: 0, usuarios: 0 };

      const equipeIds = (
        await tx.equipes.findMany({
          where: { equipe_membros: { some: { papel: "lider", usuario_id: { in: ids } } } },
          select: { id: true },
        })
      ).map((e) => e.id);

      await tx.equipes.updateMany({
        where: { mentor_id: { in: ids }, id: { notIn: equipeIds } },
        data: { mentor_id: null },
      });
      await tx.emails.deleteMany({
        where: { OR: [{ destinatario_id: { in: ids } }, { equipe_id: { in: equipeIds } }] },
      });
      await tx.equipes.deleteMany({ where: { id: { in: equipeIds } } });
      await tx.equipe_membros.deleteMany({ where: { usuario_id: { in: ids } } });
      const u = await tx.usuarios.deleteMany({ where: { id: { in: ids } } });
      return { equipes: equipeIds.length, usuarios: u.count };
    },
    { timeout: 30_000 },
  );
}
```

- [ ] **Step 6: Entradas de linha de comando**

`backend/src/seed/index.ts`:
```ts
import { prisma } from "../prisma.js";
import { env } from "../env.js";
import { linkConvite } from "../utils/convite.js";
import { seedBase } from "./base.js";
import { seedDemo } from "./demo.js";

// Roda no `npm start`, entre `prisma migrate deploy` e o servidor.
// Falha de seed NÃO derruba o boot (loga e segue): um deploy não pode tirar o
// sistema do ar por causa de dado de demonstração (Problema 1).
async function main() {
  await seedBase(prisma);
  console.log("[seed] base ok");
  if (!env.seedDemo) return;
  const r = await seedDemo(prisma);
  console.log(
    r.criado
      ? `[seed] demo criado — link de convite pendente (Letícia): ${linkConvite(r.convitePendente)}`
      : "[seed] demo já existe — nada a fazer",
  );
}

main()
  .catch((e) => console.error("[seed] falhou — a aplicação sobe mesmo assim", e))
  .finally(() => prisma.$disconnect());
```
`backend/src/seed/purge.ts`:
```ts
import { prisma } from "../prisma.js";
import { purgeDemo } from "./purge-demo.js";

// `npm run seed:demo:purge` — remove a camada de demonstração do G1.
purgeDemo(prisma)
  .then((r) => console.log(`[purge] removidas ${r.equipes} equipes e ${r.usuarios} contas demo`))
  .catch((e) => {
    console.error("[purge] falhou — nada foi apagado", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 7: Scripts**

Em `backend/package.json`, trocar a linha `"start"` e acrescentar dois scripts:
```json
    "start": "prisma migrate deploy && node dist/seed/index.js && node dist/server.js",
    "seed": "tsx src/seed/index.ts",
    "seed:demo:purge": "node dist/seed/purge.js",
```

- [ ] **Step 8: Rodar tudo e testar o boot local**

```bash
npm test && npm run build
SEED_DEMO=true node dist/seed/index.js
```
Expected: testes PASS; build ok; saída `[seed] base ok` e `[seed] demo criado — link de convite pendente (Letícia): http://localhost:3000/convite?token=…` (ou "demo já existe"). Depois limpar: `npm run seed:demo:purge` → `[purge] removidas 3 equipes e 13 contas demo`.

- [ ] **Step 9: README**

Em `README.md`, na seção "Deploy (Coolify…)", acrescentar:
```markdown
### Seed (G1)
O `npm start` roda `prisma migrate deploy` → **seed** → servidor.
- **Base** (sempre): ciclo 2026/2, modelos de tarefa por etapa e o admin inicial `admin@infohub.dev` / `admin123`.
- **Demo** (`SEED_DEMO=true`): cenário do G1 com contas `@demo.infohub.dev` — mentores `mentor1..4` / `mentor123`, alunos `<nome.sobrenome>` / `aluno123` (ex.: `bruna.lopes@demo.infohub.dev`). Roda uma vez; o link de convite pendente da Letícia sai no log do deploy.
- Remover a demo quando o sistema entrar em uso real: `npm --prefix backend run seed:demo:purge`.
```

- [ ] **Step 10: Commit e PR**

```bash
git add src/seed/ src/env.ts .env.example package.json tests/seed.test.ts ../README.md
git commit -m "feat(backend): seed demo do G1 com purge e seed no npm start

Closes #N

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -u origin feat/seed-demo-g1
gh pr create --base staging --title "feat(backend): seed demo do G1 + purge" --body "$(cat <<'EOF'
## O quê
- `SEED_DEMO=true` monta o cenário do G1 (3 equipes, 4 mentores, 2 equipes na etapa 2 com a 1 aprovada, 1 tarefa atrasada, 1 convite pendente) — contas `@demo.infohub.dev`.
- `npm start` = `migrate deploy` → seed (falha não derruba o boot) → servidor.
- `npm run seed:demo:purge` remove só a camada demo.
- Teste `seed.test.ts` verifica cada item do slide do G1 e ensaia a demo (aprovar → avançar; RN-01 barrando a equipe atrasada).

## Ação manual no Coolify
Adicionar `SEED_DEMO=true` nas variáveis de ambiente antes do deploy do CP1.

Closes #N

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
**Parar e pedir aprovação do usuário para o merge.**

---

## CP1 — promoção para `main` e deploy (após os 6 merges)

- [ ] Pedir ao usuário para adicionar `SEED_DEMO=true` no Coolify (Production).
- [ ] `gh pr create --base main --head staging --title "release: CP1 — regras de negócio + seed do G1"` — **aprovação do usuário**.
- [ ] Após o deploy: `curl -s https://<domínio>/api/v1/health` → `{"status":"ok"}`; login `admin@infohub.dev`/`admin123` e `mentor1@demo.infohub.dev`/`mentor123` via `POST /api/v1/auth/login` → 200; log do deploy contém `[seed] demo criado`.
