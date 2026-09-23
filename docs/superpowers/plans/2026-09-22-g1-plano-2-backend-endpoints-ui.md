# G1 · Plano 2 — Endpoints que a UI precisa Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completar a API para que TODAS as telas do front rodem sobre dados reais: lista rica do funil com filtros, detalhe com dados dos membros e pendências, anotações internas (RF-10), modelos de tarefa (RF-11), dashboard + série do mentor (RF-22), CSV (RF-23), perfil/senha próprios e adicionar membro. Parte backend do **CP2** (23/09 ~22h).

**Architecture:** Mesmo padrão do Plano 1: regra pura em `backend/src/domain/`, dados em `backend/src/models/`, HTTP em `backend/src/controllers/`. Nenhuma regra nova no front: agregados (atrasadas, indicadores, série, CSV) são calculados no backend, reutilizando `whereStatusEfetivo` (RN-04) e `pendenciasDaPosicao` (RN-01).

**Tech Stack:** Node 22, Express 4, Prisma 5, Vitest 2 + supertest, TypeScript strict.

**Depende do Plano 1 mergeado** (usa `domain/atraso.ts`, `domain/transicao.ts`, `domain/membros.ts`, `utils/convite.ts`, `tests/helpers.ts`, `equipe.model.transicionar/pendenciasDaPosicao`, `seed/base.ts`).

## Global Constraints

- Todo PR mira **`staging`**, uma branch por issue, Conventional Commits, **nenhum merge sem aprovação do usuário — um PR por vez**. Comentar "Pegando." na issue antes de começar.
- `npm test` **e** `npm run build` verdes em `backend/` antes do PR. TDD.
- Nunca expor UUID — só slug. Áreas e ciclos são referenciados por **nome**; etapas por **número**; modelos de tarefa por **id numérico** (SERIAL, não é UUID).
- Só `src/env.ts` lê `process.env`.
- Erros: `httpError(status, code, message[, details])`.
- "Atrasada" só via `statusEfetivo`/`whereStatusEfetivo` (nunca reimplementar a regra).
- Escopo por papel (RNF-03): admin vê tudo; mentor só as equipes que mentora; aluno só a própria.
- Anotações internas **nunca** chegam ao aluno (RF-10).
- Troca de senha **exige a senha atual** (decisão do usuário).
- Adicionar membro = **nome + e-mail → link de convite** (decisão do usuário), com RN-03 (`classificarColega`).
- Labels de status no CSV idênticos ao front (`frontend/src/domain/labels.ts`): `ativa: 'Ativa'`, `pronta_inovamf: 'Pronta p/ InovAMF'`, `encaminhada_inovamf: 'Encaminhada ao InovAMF'`, `pausada: 'Pausada'`, `desistente: 'Desistente'`.
- CSV: BOM UTF-8, separador vírgula, quebra `\n`, célula com `"`, `,` ou `\n` vai entre aspas com `"` dobrada; cabeçalho exato `Ideia,Área,Etapa,Status,Mentor,Curso do líder,Tarefas atrasadas`; arquivo `equipes-infohub.csv`.
- Commits terminam com a linha de atribuição da sessão; PRs com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

## Ordem e branches

Todas as tasks tocam `equipe.controller.ts`/`equipe.model.ts` → **sequenciais**. Branch de cada uma sai de `staging` atualizado (ou empilhada na anterior enquanto o PR anterior aguarda aprovação).

| Task | Branch | Issue |
|---|---|---|
| 1 Lista rica + filtros + ciclos | `feat/equipes-lista-filtros` | #95 (RF-07) |
| 2 Detalhe com membros e pendências | `feat/equipe-detalhe-membros` | nova |
| 3 Anotações internas | `feat/anotacoes-internas` | #96 (RF-10) |
| 4 Modelos de tarefa | `feat/modelos-tarefa` | #91 (RF-11) |
| 5 Dashboard + série do mentor | `feat/dashboard-indicadores` | nova (RF-22) |
| 6 Exportar CSV | `feat/export-csv` | nova (RF-23) |
| 7 Perfil e senha próprios | `feat/conta-perfil-senha` | nova |
| 8 Adicionar membro | `feat/adicionar-membro` | nova |

## File Structure

**Criar:** `src/models/ciclo.model.ts`, `src/models/anotacao.model.ts`, `src/models/modelo.model.ts`, `src/models/dashboard.model.ts`, `src/controllers/anotacao.controller.ts`, `src/controllers/modelo.controller.ts`, `src/controllers/dashboard.controller.ts`, `src/domain/serie.ts`, `src/domain/csv.ts`; testes `tests/equipes-lista.test.ts`, `tests/equipes-detalhe.test.ts`, `tests/anotacoes.test.ts`, `tests/modelos.test.ts`, `tests/serie.unit.test.ts`, `tests/dashboard.test.ts`, `tests/csv.test.ts`, `tests/conta.test.ts`, `tests/membros-adicionar.test.ts`.

**Modificar:** `src/models/equipe.model.ts`, `src/controllers/equipe.controller.ts`, `src/controllers/referencia.controller.ts`, `src/controllers/tarefa.controller.ts`, `src/models/tarefa.model.ts`, `src/controllers/auth.controller.ts`, `src/models/usuario.model.ts`, `src/utils/acesso.ts`, `src/domain/atraso.ts`, `src/middlewares/rateLimit.ts`, `src/routes.ts`.

(Todos os caminhos abaixo são relativos a `backend/`.)

---

## Task 1: Lista de equipes rica + filtros RF-07 + ciclos

**Files:**
- Create: `src/models/ciclo.model.ts`, `tests/equipes-lista.test.ts`
- Modify: `src/models/equipe.model.ts` (`FiltrosEquipe`, `whereFiltros`, `RESUMO_SELECT`→`resumoSelect`, `listar`, `contar`, `DadosInscricao.equipe`, `inscrever`), `src/controllers/equipe.controller.ts` (`index`, `inscricao`), `src/controllers/referencia.controller.ts`, `src/routes.ts`

**Interfaces:**
- Consumes: `whereStatusEfetivo(status, hoje)` (tarefa.model), `hojeISO`, `dataISO` (domain/atraso).
- Produces:
  - `GET /equipes` aceita, além dos atuais, `curso` (qualquer membro ativo, sem diferenciar maiúsculas), `statusTarefa` (equipe TEM tarefa com esse status efetivo), `ciclo` (nome; 400 `INVALID_CICLO` se não existe). Cada linha ganha `descricaoIdeia`, `ciclo: string|null`, `lider: {slug,nome,curso}|null`, `membrosCount: number`, `tarefasAtrasadas: number`.
  - `GET /ciclos` → `{ data: [{ nome, dataInicio, dataFim }] }` (ativos, mais recente primeiro).
  - Inscrição grava `ciclo_id` do ciclo atual (ativo mais recente).
  - `equipeModel.lerFiltros` **não** existe; a função exportada nova é `export function resumoSelect(hoje: string)` e `mapResumo(e)` no controller (reusados pela Task 6).

- [ ] **Step 1: Branch e issue**

```bash
git checkout staging && git pull && git checkout -b feat/equipes-lista-filtros
gh issue comment 95 --body "Pegando: filtros curso/statusTarefa/ciclo + linha do funil com líder, membros e atrasadas."
```

- [ ] **Step 2: Teste (falha)**

`tests/equipes-lista.test.ts`:
```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { bearer, criarEquipe, criarUsuario, limpar, login } from "./helpers.js";

const app = createApp();
const sufixo = `lst${Date.now()}`;
const email = (n: string) => `${n}.${sufixo}@teste.local`;
const CICLO = `C${sufixo}`.slice(0, 60);
let adminAccess = "";
let x = { id: "", slug: "" };
let y = { id: "", slug: "" };

beforeAll(async () => {
  await criarUsuario(email("admin"), "admin");
  adminAccess = await login(app, email("admin"));
  const lider = await criarUsuario(email("lider"), "aluno", { nome: "Lia Líder" });
  const membro = await criarUsuario(email("membro"), "aluno");
  await prisma.alunos.create({ data: { usuario_id: lider.id, curso: "Direito", semestre: "3º" } });
  await prisma.alunos.create({ data: { usuario_id: membro.id, curso: "ADS", semestre: "2º" } });
  x = await criarEquipe({
    nome: `X ${sufixo}`,
    membros: [{ id: lider.id, papel: "lider" }, { id: membro.id, papel: "integrante" }],
  });
  await prisma.tarefas.create({
    data: { equipe_id: x.id, etapa_id: 1, titulo: "Vencida", data_entrega: new Date("2020-01-01T00:00:00Z") },
  });
  const ciclo = await prisma.ciclos.create({
    data: { nome: CICLO, data_inicio: new Date("2000-01-01T00:00:00Z") },
  });
  y = await criarEquipe({ nome: `Y ${sufixo}` });
  await prisma.equipes.update({ where: { id: y.id }, data: { ciclo_id: ciclo.id } });
});

afterAll(async () => {
  await limpar(sufixo);
  await prisma.ciclos.deleteMany({ where: { nome: CICLO } });
  await prisma.$disconnect();
});

const listar = (qs: string) =>
  request(app).get(`/api/v1/equipes?q=${sufixo}&${qs}`).set(bearer(adminAccess));
const nomes = (r: request.Response) =>
  (r.body.data as Array<{ nomeIdeia: string }>).map((e) => e.nomeIdeia).sort();

describe("GET /equipes — linha do funil", () => {
  it("traz líder com curso, contagem de membros e de atrasadas", async () => {
    const r = await listar("");
    expect(r.status).toBe(200);
    const lx = r.body.data.find((e: { nomeIdeia: string }) => e.nomeIdeia === `X ${sufixo}`);
    expect(lx).toMatchObject({
      lider: { nome: "Lia Líder", curso: "Direito" },
      membrosCount: 2,
      tarefasAtrasadas: 1,
      ciclo: null,
    });
    const ly = r.body.data.find((e: { nomeIdeia: string }) => e.nomeIdeia === `Y ${sufixo}`);
    expect(ly).toMatchObject({ lider: null, membrosCount: 0, tarefasAtrasadas: 0, ciclo: CICLO });
  });
});

describe("GET /equipes — filtros RF-07", () => {
  it("curso casa com QUALQUER membro, sem diferenciar maiúsculas", async () => {
    expect(nomes(await listar("curso=ads"))).toEqual([`X ${sufixo}`]);
  });
  it("statusTarefa usa o status efetivo (RN-04)", async () => {
    expect(nomes(await listar("statusTarefa=atrasada"))).toEqual([`X ${sufixo}`]);
    expect(nomes(await listar("statusTarefa=aprovada"))).toEqual([]);
  });
  it("ciclo por nome; ciclo desconhecido → 400", async () => {
    expect(nomes(await listar(`ciclo=${encodeURIComponent(CICLO)}`))).toEqual([`Y ${sufixo}`]);
    const r = await listar("ciclo=nao-existe");
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("INVALID_CICLO");
  });
});

describe("ciclos", () => {
  it("GET /ciclos lista os ativos", async () => {
    const r = await request(app).get("/api/v1/ciclos");
    expect(r.status).toBe(200);
    expect(r.body.data.some((c: { nome: string }) => c.nome === CICLO)).toBe(true);
  });
  it("inscrição entra no ciclo atual (ativo mais recente)", async () => {
    const r = await request(app).post("/api/v1/equipes/inscricao").send({
      lider: { nome: "Líder Ciclo", email: email("lciclo"), senha: "senha-forte-1", telefone: "5199" },
      ideia: { nome: `Z ${sufixo}`, descricao: "d", estagio: "ideia" },
    });
    expect(r.status).toBe(201);
    const atual = await prisma.ciclos.findFirst({ where: { ativo: true }, orderBy: { data_inicio: "desc" } });
    const eq = await prisma.equipes.findUnique({ where: { slug: r.body.equipe.slug }, select: { ciclo_id: true } });
    expect(eq?.ciclo_id).toBe(atual?.id ?? null);
  });
});
```
Run: `npx vitest run tests/equipes-lista.test.ts` → Expected: FAIL (`lider` ausente na linha).

- [ ] **Step 3: Model de ciclos**

`src/models/ciclo.model.ts`:
```ts
import { prisma } from "../prisma.js";

// ciclos: PK SERIAL → referenciado por `nome` (UNIQUE), como áreas.
export function listarAtivos() {
  return prisma.ciclos.findMany({
    where: { ativo: true },
    orderBy: { data_inicio: "desc" },
    select: { nome: true, data_inicio: true, data_fim: true },
  });
}

export function findIdByNome(nome: string) {
  return prisma.ciclos.findFirst({ where: { nome, ativo: true }, select: { id: true } });
}

// Ciclo "atual" = o ativo mais recente; é onde a inscrição entra.
export function findAtual() {
  return prisma.ciclos.findFirst({
    where: { ativo: true },
    orderBy: { data_inicio: "desc" },
    select: { id: true },
  });
}
```
Em `src/controllers/referencia.controller.ts` acrescentar (e importar `* as cicloModel from "../models/ciclo.model.js"` e `{ dataISO } from "../domain/atraso.js"`):
```ts
// GET /ciclos — pública (filtro do funil).
export async function ciclos(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await cicloModel.listarAtivos();
    res.json({
      data: rows.map((c) => ({
        nome: c.nome,
        dataInicio: dataISO(c.data_inicio),
        dataFim: c.data_fim ? dataISO(c.data_fim) : null,
      })),
    });
  } catch (err) {
    next(err);
  }
}
```
(se o arquivo ainda não importa `NextFunction`, `Request`, `Response` de `express`, acrescente). Em `src/routes.ts`, logo após `routes.get("/etapas-funil", …)`:
```ts
routes.get("/ciclos", referenciaCtrl.ciclos);
```

- [ ] **Step 4: Model de equipes — filtros e linha rica**

Em `src/models/equipe.model.ts`:

(a) import: `import { whereStatusEfetivo } from "./tarefa.model.js";`

(b) substituir `interface FiltrosEquipe` e `whereFiltros` por:
```ts
interface FiltrosEquipe {
  etapaNumero?: number;
  areaId?: number;
  status?: string;
  mentorId?: string;
  q?: string;
  curso?: string;
  statusTarefa?: string;
  cicloId?: number;
  hoje: string;
}

function whereFiltros(f: FiltrosEquipe): Prisma.equipesWhereInput {
  const w: Prisma.equipesWhereInput = {};
  if (f.etapaNumero) w.etapas = { numero: f.etapaNumero };
  if (f.areaId) w.area_id = f.areaId;
  if (f.status) w.status = f.status;
  if (f.mentorId) w.mentor_id = f.mentorId;
  if (f.cicloId) w.ciclo_id = f.cicloId;
  // Busca simples por enquanto (ILIKE). O índice GIN full-text de nome_ideia
  // fica como otimização futura (ENTITIES.md §3).
  if (f.q) w.nome_ideia = { contains: f.q, mode: "insensitive" };
  // RF-07: curso de QUALQUER integrante ativo.
  if (f.curso) {
    w.equipe_membros = {
      some: { ativo: true, usuarios: { alunos: { curso: { equals: f.curso, mode: "insensitive" } } } },
    };
  }
  // RF-07: a equipe TEM ao menos uma tarefa com esse status (efetivo — RN-04).
  if (f.statusTarefa) w.tarefas = { some: whereStatusEfetivo(f.statusTarefa, f.hoje) };
  return w;
}
```

(c) substituir `const RESUMO_SELECT = {…} satisfies Prisma.equipesSelect;` por:
```ts
export function resumoSelect(hoje: string) {
  return {
    slug: true,
    nome_ideia: true,
    descricao_ideia: true,
    status: true,
    estagio_ideia: true,
    criado_em: true,
    etapas: { select: { numero: true, nome: true } },
    areas_ideia: { select: { nome: true } },
    ciclos: { select: { nome: true } },
    usuarios: { select: { slug: true, nome: true } },
    equipe_membros: {
      where: { ativo: true, papel: "lider" },
      select: { usuarios: { select: { slug: true, nome: true, alunos: { select: { curso: true } } } } },
    },
    _count: {
      select: {
        equipe_membros: { where: { ativo: true } },
        tarefas: { where: whereStatusEfetivo("atrasada", hoje) },
      },
    },
  } satisfies Prisma.equipesSelect;
}
```
e em `listar` trocar `select: RESUMO_SELECT,` por `select: resumoSelect(params.hoje),`.

(d) em `DadosInscricao.equipe` acrescentar `ciclo_id: number | null;` e no `prisma.equipes.create` de `inscrever` acrescentar `ciclo_id: p.equipe.ciclo_id,`.

- [ ] **Step 5: Controller**

Em `src/controllers/equipe.controller.ts`:

(a) imports: `import * as cicloModel from "../models/ciclo.model.js";`, `import { hojeISO } from "../domain/atraso.js";`, e `STATUS_TAREFA` no import de `../domain/enums.js`.

(b) acrescentar acima de `index`:
```ts
// Filtros do funil (RF-07) a partir da query — compartilhado pela lista e pelo CSV.
async function lerFiltros(req: Request) {
  let areaId: number | undefined;
  if (typeof req.query.area === "string" && req.query.area.trim()) {
    const area = await areaModel.findIdByNome(req.query.area.trim());
    if (!area) throw httpError(400, "INVALID_AREA", "Área desconhecida");
    areaId = area.id;
  }
  let cicloId: number | undefined;
  if (typeof req.query.ciclo === "string" && req.query.ciclo.trim()) {
    const ciclo = await cicloModel.findIdByNome(req.query.ciclo.trim());
    if (!ciclo) throw httpError(400, "INVALID_CICLO", "Ciclo desconhecido");
    cicloId = ciclo.id;
  }
  const texto = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  const etapaNumero = req.query.etapa !== undefined ? Number(req.query.etapa) : undefined;
  const status = texto(req.query.status);
  const statusTarefa = texto(req.query.statusTarefa);
  const mentor = texto(req.query.mentor);
  return {
    escopo: escopoDo(req),
    etapaNumero: etapaNumero && etapaNumero >= 1 ? etapaNumero : undefined,
    areaId,
    cicloId,
    status: status && (STATUS_EQUIPE as string[]).includes(status) ? status : undefined,
    statusTarefa:
      statusTarefa && (STATUS_TAREFA as string[]).includes(statusTarefa) ? statusTarefa : undefined,
    mentorId: mentor ? (fromSlug(mentor) ?? undefined) : undefined,
    q: texto(req.query.q),
    curso: texto(req.query.curso),
    hoje: hojeISO(),
  };
}

type LinhaResumo = Awaited<ReturnType<typeof equipeModel.listar>>[number];

// Linha do funil/lista (RF-06). Exportada para o CSV (Task 6) reusar.
export function mapResumo(e: LinhaResumo) {
  const lider = e.equipe_membros[0]?.usuarios ?? null;
  return {
    slug: e.slug,
    nomeIdeia: e.nome_ideia,
    descricaoIdeia: e.descricao_ideia,
    status: e.status,
    estagio: e.estagio_ideia,
    etapa: { numero: e.etapas.numero, nome: e.etapas.nome },
    area: e.areas_ideia?.nome ?? null,
    ciclo: e.ciclos?.nome ?? null,
    mentor: e.usuarios ? { slug: e.usuarios.slug, nome: e.usuarios.nome } : null,
    lider: lider ? { slug: lider.slug, nome: lider.nome, curso: lider.alunos?.curso ?? null } : null,
    membrosCount: e._count.equipe_membros,
    tarefasAtrasadas: e._count.tarefas,
    criadoEm: e.criado_em,
  };
}
```

(c) substituir o corpo de `index` por:
```ts
export async function index(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, perPage, skip } = paginacao(req);
    const filtros = await lerFiltros(req);
    const [linhas, total] = await Promise.all([
      equipeModel.listar({ skip, take: perPage, ...filtros }),
      equipeModel.contar(filtros),
    ]);
    res.json({ data: linhas.map(mapResumo), page, perPage, total });
  } catch (err) {
    next(err);
  }
}
```

(d) em `inscricao`, antes de `await equipeModel.inscrever({`, acrescentar `const cicloAtual = await cicloModel.findAtual();` e no objeto `equipe: { … }` acrescentar `ciclo_id: cicloAtual?.id ?? null,`.

- [ ] **Step 6: Rodar tudo**

Run: `npm test && npm run build` → Expected: todos PASS.

- [ ] **Step 7: Commit e PR**

```bash
git add src/models/ciclo.model.ts src/models/equipe.model.ts src/controllers/equipe.controller.ts src/controllers/referencia.controller.ts src/routes.ts tests/equipes-lista.test.ts
git commit -m "feat(backend): funil com líder, membros e atrasadas + filtros curso/status/ciclo (RF-07)

Closes #95"
git push -u origin feat/equipes-lista-filtros
gh pr create --base staging --title "feat(backend): lista do funil rica + filtros RF-07 + ciclos" --body "Linha do funil com líder/curso, nº de membros e atrasadas (contagem filtrada no banco, sem N+1); filtros curso (qualquer membro), statusTarefa (status efetivo), ciclo; GET /ciclos; inscrição entra no ciclo atual.

Closes #95

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```
**Parar e pedir aprovação do usuário.**

---

## Task 2: Detalhe da equipe com dados dos membros e pendências

**Files:**
- Create: `tests/equipes-detalhe.test.ts`
- Modify: `src/models/equipe.model.ts` (`findDetalheBySlug`, nova `pendenciasParaAvancar`), `src/controllers/equipe.controller.ts` (`show`)

**Interfaces:**
- Consumes: `pendenciasDaPosicao(tx, equipeId, posicao)` e `POSICAO_PRONTA` (Plano 1 Task 2).
- Produces: `GET /equipes/:slug` → `membros[]` ganham `curso: string|null`, `semestre: string|null`; resposta ganha `pendenciasParaAvancar: Pendencia[]` (o que impede avançar da posição atual — usado pelo preview do drag no kanban). `equipeModel.pendenciasParaAvancar(equipeId: string): Promise<Pendencia[]>`.

- [ ] **Step 1: Branch e issue**

```bash
git checkout staging && git pull && git checkout -b feat/equipe-detalhe-membros
gh issue create --title "backend: detalhe da equipe com curso/semestre dos membros e pendências para avançar" --body "Front precisa de curso/semestre por integrante (MinhaEquipe, DetalheEquipe) e da lista de pendências RN-01 para o preview do drag no kanban." --label enhancement
```
Comente "Pegando." na issue criada.

- [ ] **Step 2: Teste (falha)**

`tests/equipes-detalhe.test.ts`:
```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { bearer, criarEquipe, criarUsuario, limpar, login } from "./helpers.js";

const app = createApp();
const sufixo = `det${Date.now()}`;
const email = (n: string) => `${n}.${sufixo}@teste.local`;
let liderAccess = "";
let equipe = { id: "", slug: "" };

beforeAll(async () => {
  const lider = await criarUsuario(email("lider"), "aluno");
  await prisma.alunos.create({ data: { usuario_id: lider.id, curso: "Direito", semestre: "3º" } });
  equipe = await criarEquipe({ nome: `D ${sufixo}`, etapa: 2, membros: [{ id: lider.id, papel: "lider" }] });
  await prisma.tarefas.create({
    data: { equipe_id: equipe.id, etapa_id: 2, titulo: "Obrigatória", obrigatoria: true, data_entrega: new Date("2099-01-01T00:00:00Z") },
  });
  liderAccess = await login(app, email("lider"));
});

afterAll(async () => {
  await limpar(sufixo);
  await prisma.$disconnect();
});

describe("GET /equipes/:slug", () => {
  it("membros trazem curso e semestre; pendências para avançar listadas", async () => {
    const r = await request(app).get(`/api/v1/equipes/${equipe.slug}`).set(bearer(liderAccess));
    expect(r.status).toBe(200);
    expect(r.body.membros[0]).toMatchObject({ curso: "Direito", semestre: "3º", pendente: false });
    expect(r.body.pendenciasParaAvancar).toEqual([
      expect.objectContaining({ tipo: "tarefa", titulo: "Obrigatória" }),
    ]);
  });
});
```
Run: `npx vitest run tests/equipes-detalhe.test.ts` → Expected: FAIL.

- [ ] **Step 3: Model**

Em `src/models/equipe.model.ts`:
- em `findDetalheBySlug`, acrescentar `id: true,` no select raiz e, em `equipe_membros.select.usuarios.select`, acrescentar `alunos: { select: { curso: true, semestre: true } },`.
- trocar a assinatura de `pendenciasDaPosicao` para aceitar o client normal também:
```ts
async function pendenciasDaPosicao(
  tx: Prisma.TransactionClient,
```
(fica igual — `PrismaClient` é atribuível a `Prisma.TransactionClient`), e acrescentar abaixo dela:
```ts
// Pendências que hoje impedem a equipe de avançar (preview do drag no kanban).
// Mesma função da transação — a regra não é duplicada.
export async function pendenciasParaAvancar(equipeId: string): Promise<Pendencia[]> {
  const eq = await prisma.equipes.findUniqueOrThrow({
    where: { id: equipeId },
    select: { status: true, etapas: { select: { numero: true } } },
  });
  const posicao = eq.status === "pronta_inovamf" ? POSICAO_PRONTA : eq.etapas.numero;
  return pendenciasDaPosicao(prisma, equipeId, posicao);
}
```

- [ ] **Step 4: Controller**

Em `show`, no map de `membros` acrescentar:
```ts
        curso: m.usuarios.alunos?.curso ?? null,
        semestre: m.usuarios.alunos?.semestre ?? null,
```
e, antes do `res.json`, `const pendencias = await equipeModel.pendenciasParaAvancar(equipe.id);`, e no objeto de resposta acrescentar `pendenciasParaAvancar: pendencias,`.

- [ ] **Step 5: Rodar tudo** — `npm test && npm run build` → PASS.

- [ ] **Step 6: Commit e PR**

```bash
git add src/models/equipe.model.ts src/controllers/equipe.controller.ts tests/equipes-detalhe.test.ts
git commit -m "feat(backend): detalhe da equipe com curso/semestre e pendências para avançar

Closes #N"
git push -u origin feat/equipe-detalhe-membros
gh pr create --base staging --title "feat(backend): detalhe da equipe com membros e pendências" --body "membros[].curso/semestre (tabela alunos) e pendenciasParaAvancar (mesma função da RN-01, sem duplicar regra) para o preview do kanban.

Closes #N

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```
**Parar e pedir aprovação do usuário.**

---

## Task 3: Anotações internas do mentor (RF-10)

**Files:**
- Create: `src/models/anotacao.model.ts`, `src/controllers/anotacao.controller.ts`, `tests/anotacoes.test.ts`
- Modify: `src/routes.ts`

**Interfaces:**
- Produces: `GET /equipes/:slug/anotacoes` → `{ data: [{ slug, conteudo, autor: {slug,nome}, etapa: number|null, criadoEm }] }` (mais recente primeiro); `POST /equipes/:slug/anotacoes {conteudo, etapa?}` → 201 com o item. Só admin e mentor da equipe; aluno → 403 (rota tem `role("admin","mentor")`).

- [ ] **Step 1: Branch e issue**

```bash
git checkout staging && git pull && git checkout -b feat/anotacoes-internas
gh issue comment 96 --body "Pegando: GET/POST /equipes/:slug/anotacoes, só admin e mentor da equipe (RF-10)."
```

- [ ] **Step 2: Teste (falha)**

`tests/anotacoes.test.ts`:
```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { bearer, criarEquipe, criarUsuario, limpar, login } from "./helpers.js";

const app = createApp();
const sufixo = `ano${Date.now()}`;
const email = (n: string) => `${n}.${sufixo}@teste.local`;
let mentorAccess = "";
let outroMentorAccess = "";
let alunoAccess = "";
let slug = "";

beforeAll(async () => {
  const mentor = await criarUsuario(email("mentor"), "mentor", { nome: "Mentora Ana" });
  await criarUsuario(email("outro"), "mentor");
  const aluno = await criarUsuario(email("aluno"), "aluno");
  slug = (await criarEquipe({ nome: `A ${sufixo}`, mentorId: mentor.id, membros: [{ id: aluno.id, papel: "lider" }] })).slug;
  mentorAccess = await login(app, email("mentor"));
  outroMentorAccess = await login(app, email("outro"));
  alunoAccess = await login(app, email("aluno"));
});

afterAll(async () => {
  await limpar(sufixo);
  await prisma.$disconnect();
});

const url = () => `/api/v1/equipes/${slug}/anotacoes`;

describe("anotações internas (RF-10)", () => {
  it("mentor da equipe cria e lista (mais recente primeiro)", async () => {
    for (const conteudo of ["primeira", "segunda"]) {
      const r = await request(app).post(url()).set(bearer(mentorAccess)).send({ conteudo });
      expect(r.status).toBe(201);
      expect(r.body.autor.nome).toBe("Mentora Ana");
    }
    const r = await request(app).get(url()).set(bearer(mentorAccess));
    expect(r.body.data.map((a: { conteudo: string }) => a.conteudo)).toEqual(["segunda", "primeira"]);
  });
  it("aluno nunca vê (403)", async () => {
    const r = await request(app).get(url()).set(bearer(alunoAccess));
    expect(r.status).toBe(403);
  });
  it("mentor de outra equipe não vê (403)", async () => {
    const r = await request(app).get(url()).set(bearer(outroMentorAccess));
    expect(r.status).toBe(403);
  });
  it("conteúdo vazio → 400", async () => {
    const r = await request(app).post(url()).set(bearer(mentorAccess)).send({ conteudo: "  " });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("INVALID_CONTEUDO");
  });
});
```
Run → FAIL (404 rota).

- [ ] **Step 3: Model**

`src/models/anotacao.model.ts`:
```ts
import { prisma } from "../prisma.js";

const SELECT = {
  id: true,
  conteudo: true,
  criado_em: true,
  etapas: { select: { numero: true } },
  usuarios: { select: { slug: true, nome: true } },
} as const;

export function listarPorEquipe(equipeId: string) {
  return prisma.anotacoes_internas.findMany({
    where: { equipe_id: equipeId },
    orderBy: { criado_em: "desc" },
    select: SELECT,
  });
}

export function criar(data: { equipeId: string; autorId: string; conteudo: string; etapaId: number | null }) {
  return prisma.anotacoes_internas.create({
    data: { equipe_id: data.equipeId, autor_id: data.autorId, conteudo: data.conteudo, etapa_id: data.etapaId },
    select: SELECT,
  });
}
```

- [ ] **Step 4: Controller**

`src/controllers/anotacao.controller.ts`:
```ts
import type { NextFunction, Request, Response } from "express";
import { httpError } from "../utils/error.js";
import { toSlug } from "../utils/slug.js";
import { idDoChamador, podeGerirEquipe } from "../utils/acesso.js";
import * as equipeModel from "../models/equipe.model.js";
import * as etapaModel from "../models/etapa.model.js";
import * as anotacaoModel from "../models/anotacao.model.js";

// RF-10: anotação interna do mentor. O que impede vazar para o aluno: a rota
// exige role admin/mentor E aqui só o admin ou o mentor DESTA equipe passam.
type Anotacao = Awaited<ReturnType<typeof anotacaoModel.listarPorEquipe>>[number];

function mapAnotacao(a: Anotacao) {
  return {
    slug: toSlug(a.id),
    conteudo: a.conteudo,
    autor: { slug: a.usuarios.slug, nome: a.usuarios.nome },
    etapa: a.etapas?.numero ?? null,
    criadoEm: a.criado_em,
  };
}

async function equipeGerida(req: Request) {
  const controle = await equipeModel.findControleBySlug(req.params.slug ?? "");
  if (!controle) throw httpError(404, "EQUIPE_NOT_FOUND", "Equipe não encontrada");
  if (!podeGerirEquipe(req, controle.mentor_id)) {
    throw httpError(403, "FORBIDDEN", "Equipe fora do seu escopo");
  }
  return controle;
}

export async function index(req: Request, res: Response, next: NextFunction) {
  try {
    const equipe = await equipeGerida(req);
    const rows = await anotacaoModel.listarPorEquipe(equipe.id);
    res.json({ data: rows.map(mapAnotacao) });
  } catch (err) {
    next(err);
  }
}

export async function store(req: Request, res: Response, next: NextFunction) {
  try {
    const equipe = await equipeGerida(req);
    const { conteudo, etapa } = req.body ?? {};
    if (typeof conteudo !== "string" || conteudo.trim().length === 0 || conteudo.length > 5000) {
      throw httpError(400, "INVALID_CONTEUDO", "Escreva a anotação (até 5000 caracteres)");
    }
    let etapaId: number | null = null;
    if (etapa !== undefined && etapa !== null) {
      const row = await etapaModel.findByNumero(Number(etapa));
      if (!row) throw httpError(400, "INVALID_ETAPA", "Etapa inexistente");
      etapaId = row.id;
    }
    const a = await anotacaoModel.criar({
      equipeId: equipe.id,
      autorId: idDoChamador(req),
      conteudo: conteudo.trim(),
      etapaId,
    });
    res.status(201).json(mapAnotacao(a));
  } catch (err) {
    next(err);
  }
}
```
`src/routes.ts`: importar `import * as anotacaoCtrl from "./controllers/anotacao.controller.js";` e, após as rotas de equipes:
```ts
// --- Anotações internas (RF-10) — nunca chegam ao aluno ----------------------
routes.get("/equipes/:slug/anotacoes", auth, role("admin", "mentor"), anotacaoCtrl.index);
routes.post("/equipes/:slug/anotacoes", auth, role("admin", "mentor"), anotacaoCtrl.store);
```

- [ ] **Step 5: Rodar tudo** — `npm test && npm run build` → PASS.

- [ ] **Step 6: Commit e PR**

```bash
git add src/models/anotacao.model.ts src/controllers/anotacao.controller.ts src/routes.ts tests/anotacoes.test.ts
git commit -m "feat(backend): anotações internas do mentor por equipe (RF-10)

Closes #96"
git push -u origin feat/anotacoes-internas
gh pr create --base staging --title "feat(backend): anotações internas (RF-10)" --body "GET/POST /equipes/:slug/anotacoes. Aluno nunca vê: role admin/mentor na rota + só o mentor da equipe no controller.

Closes #96

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```
**Parar e pedir aprovação do usuário.**

---

## Task 4: Modelos de tarefa (RF-11)

**Files:**
- Create: `src/models/modelo.model.ts`, `src/controllers/modelo.controller.ts`, `tests/modelos.test.ts`
- Modify: `src/domain/atraso.ts` (nova `somarDias`), `src/models/tarefa.model.ts` (`criar` com `modelo_id`), `src/controllers/tarefa.controller.ts` (`store`), `src/routes.ts`

**Interfaces:**
- Consumes: `seedBase` (Plano 1) para ter os 8 modelos.
- Produces: `GET /modelos-tarefa` (admin/mentor) → `{ data: [{ id, etapa, titulo, descricao, obrigatoria, prazoPadraoDias }] }` ordenado por etapa, ordem. `POST /equipes/:slug/tarefas` aceita `{ modelo: <id>, dataEntrega? }` — copia título/descrição/etapa/obrigatoria do modelo; sem `dataEntrega`, usa hoje + `prazoPadraoDias`. `somarDias(iso: string, n: number): Date`.

- [ ] **Step 1: Branch e issue**

```bash
git checkout staging && git pull && git checkout -b feat/modelos-tarefa
gh issue comment 91 --body "Pegando: GET /modelos-tarefa + criar tarefa a partir de modelo (prazo padrão se não informar data)."
```

- [ ] **Step 2: Teste (falha)**

`tests/modelos.test.ts`:
```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { seedBase } from "../src/seed/base.js";
import { dataISO, hojeISO, somarDias } from "../src/domain/atraso.js";
import { bearer, criarEquipe, criarUsuario, limpar, login } from "./helpers.js";

const app = createApp();
const sufixo = `mod${Date.now()}`;
let mentorAccess = "";
let alunoAccess = "";
let slug = "";

beforeAll(async () => {
  await seedBase(prisma);
  const mentor = await criarUsuario(`mentor.${sufixo}@teste.local`, "mentor");
  await criarUsuario(`aluno.${sufixo}@teste.local`, "aluno");
  slug = (await criarEquipe({ nome: `M ${sufixo}`, mentorId: mentor.id })).slug;
  mentorAccess = await login(app, `mentor.${sufixo}@teste.local`);
  alunoAccess = await login(app, `aluno.${sufixo}@teste.local`);
});

afterAll(async () => {
  await limpar(sufixo);
  await prisma.$disconnect();
});

describe("modelos de tarefa (RF-11)", () => {
  it("somarDias", () => {
    expect(dataISO(somarDias("2026-09-28", 5))).toBe("2026-10-03");
  });

  it("mentor lista; aluno não (403)", async () => {
    const r = await request(app).get("/api/v1/modelos-tarefa").set(bearer(mentorAccess));
    expect(r.status).toBe(200);
    expect(r.body.data.filter((m: { etapa: number }) => m.etapa === 6)).toHaveLength(3);
    const a = await request(app).get("/api/v1/modelos-tarefa").set(bearer(alunoAccess));
    expect(a.status).toBe(403);
  });

  it("cria tarefa do modelo com prazo padrão", async () => {
    const lista = await request(app).get("/api/v1/modelos-tarefa").set(bearer(mentorAccess));
    const bmc = lista.body.data.find((m: { titulo: string }) => m.titulo === "Business Model Canvas (BMC)");
    const r = await request(app)
      .post(`/api/v1/equipes/${slug}/tarefas`)
      .set(bearer(mentorAccess))
      .send({ modelo: bmc.id });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ titulo: "Business Model Canvas (BMC)", obrigatoria: true, etapa: { numero: 5 } });
    expect(dataISO(new Date(r.body.dataEntrega))).toBe(dataISO(somarDias(hojeISO(), bmc.prazoPadraoDias)));
    const row = await prisma.tarefas.findFirst({ where: { equipes: { slug } }, select: { modelo_id: true } });
    expect(row?.modelo_id).toBe(bmc.id);
  });

  it("modelo inexistente → 400", async () => {
    const r = await request(app).post(`/api/v1/equipes/${slug}/tarefas`).set(bearer(mentorAccess)).send({ modelo: 999999 });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("INVALID_MODELO");
  });
});
```
Run → FAIL.

- [ ] **Step 3: `somarDias`**

Em `src/domain/atraso.ts` acrescentar:
```ts
// Dia `iso` + n dias, como o Date 00:00Z que a coluna DATE usa.
export function somarDias(iso: string, n: number): Date {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}
```

- [ ] **Step 4: Model e controller de modelos**

`src/models/modelo.model.ts`:
```ts
import { prisma } from "../prisma.js";

const SELECT = {
  id: true,
  titulo: true,
  descricao: true,
  obrigatoria: true,
  prazo_padrao_dias: true,
  etapas: { select: { numero: true } },
} as const;

export function listarAtivos() {
  return prisma.modelos_tarefa.findMany({
    where: { ativo: true },
    orderBy: [{ etapa_id: "asc" }, { ordem: "asc" }],
    select: SELECT,
  });
}

export function findAtivoById(id: number) {
  return prisma.modelos_tarefa.findFirst({ where: { id, ativo: true }, select: SELECT });
}
```
`src/controllers/modelo.controller.ts`:
```ts
import type { NextFunction, Request, Response } from "express";
import * as modeloModel from "../models/modelo.model.js";

// GET /modelos-tarefa — RF-11 (admin/mentor). id é SERIAL numérico, não UUID.
export async function index(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await modeloModel.listarAtivos();
    res.json({
      data: rows.map((m) => ({
        id: m.id,
        etapa: m.etapas.numero,
        titulo: m.titulo,
        descricao: m.descricao,
        obrigatoria: m.obrigatoria,
        prazoPadraoDias: m.prazo_padrao_dias ?? 7,
      })),
    });
  } catch (err) {
    next(err);
  }
}
```
`src/routes.ts`: importar `import * as modeloCtrl from "./controllers/modelo.controller.js";` e acrescentar antes das rotas de tarefas:
```ts
routes.get("/modelos-tarefa", auth, role("admin", "mentor"), modeloCtrl.index);
```

- [ ] **Step 5: Criar tarefa a partir do modelo**

`src/models/tarefa.model.ts` — em `criar`, acrescentar `modelo_id?: number | null;` ao tipo de `data` e `modelo_id: data.modelo_id ?? null,` ao `data` do `create`.

`src/controllers/tarefa.controller.ts` — importar `import * as modeloModel from "../models/modelo.model.js";` e `somarDias` (junto de `hojeISO`), e substituir, em `store`, tudo desde `const { titulo, descricao, etapa, dataEntrega, obrigatoria } = req.body ?? {};` até a linha `if (!etapaRow) throw httpError(400, "INVALID_ETAPA", "Etapa inexistente");` por:
```ts
    const { titulo, descricao, etapa, dataEntrega, obrigatoria, modelo } = req.body ?? {};
    let dados: {
      titulo: string;
      descricao: string | null;
      etapaNumero: number;
      obrigatoria: boolean;
      data: Date;
      modeloId: number | null;
    };
    if (modelo !== undefined) {
      // RF-11: a tarefa nasce do modelo; só a data pode ser escolhida.
      const m = Number.isInteger(modelo) ? await modeloModel.findAtivoById(modelo) : null;
      if (!m) throw httpError(400, "INVALID_MODELO", "Modelo de tarefa inexistente");
      dados = {
        titulo: m.titulo,
        descricao: m.descricao,
        etapaNumero: m.etapas.numero,
        obrigatoria: m.obrigatoria,
        data:
          dataEntrega !== undefined
            ? parseDataEntrega(dataEntrega)
            : somarDias(hojeISO(), m.prazo_padrao_dias ?? 7),
        modeloId: m.id,
      };
    } else {
      if (typeof titulo !== "string" || titulo.trim().length < 3) {
        throw httpError(400, "INVALID_TITULO", "Título deve ter ao menos 3 caracteres");
      }
      const numero = Number(etapa);
      if (!Number.isInteger(numero) || numero < 1 || numero > 6) {
        throw httpError(400, "INVALID_ETAPA", "Etapa deve ser um número de 1 a 6");
      }
      if (descricao !== undefined && typeof descricao !== "string") {
        throw httpError(400, "INVALID_DESCRICAO", "Descrição inválida");
      }
      if (obrigatoria !== undefined && typeof obrigatoria !== "boolean") {
        throw httpError(400, "INVALID_OBRIGATORIA", "obrigatoria deve ser booleano");
      }
      dados = {
        titulo: titulo.trim(),
        descricao: typeof descricao === "string" ? descricao.trim() : null,
        etapaNumero: numero,
        obrigatoria: obrigatoria === undefined ? true : obrigatoria,
        data: parseDataEntrega(dataEntrega),
        modeloId: null,
      };
    }

    const controle = await equipeModel.findControleBySlug(req.params.slug ?? "");
    if (!controle) throw httpError(404, "EQUIPE_NOT_FOUND", "Equipe não encontrada");
    if (!podeGerirEquipe(req, controle.mentor_id)) {
      throw httpError(403, "FORBIDDEN", "Sem permissão para criar tarefas nesta equipe");
    }

    const etapaRow = await etapaModel.findByNumero(dados.etapaNumero);
    if (!etapaRow) throw httpError(400, "INVALID_ETAPA", "Etapa inexistente");
```
e trocar a chamada `tarefaModel.criar({ … })` por:
```ts
    const tarefa = await tarefaModel.criar({
      equipe_id: controle.id,
      etapa_id: etapaRow.id,
      modelo_id: dados.modeloId,
      titulo: dados.titulo,
      descricao: dados.descricao,
      obrigatoria: dados.obrigatoria,
      data_entrega: dados.data,
      criado_por: idDoChamador(req),
    });
```

- [ ] **Step 6: Rodar tudo** — `npm test && npm run build` → PASS (os testes antigos de tarefas manuais seguem válidos).

- [ ] **Step 7: Commit e PR**

```bash
git add src/domain/atraso.ts src/models/modelo.model.ts src/controllers/modelo.controller.ts src/models/tarefa.model.ts src/controllers/tarefa.controller.ts src/routes.ts tests/modelos.test.ts
git commit -m "feat(backend): modelos de tarefa por etapa e criação a partir do modelo (RF-11)

Closes #91"
git push -u origin feat/modelos-tarefa
gh pr create --base staging --title "feat(backend): modelos de tarefa (RF-11)" --body "GET /modelos-tarefa; POST /equipes/:slug/tarefas {modelo} copia o modelo (tarefa guarda modelo_id) e usa o prazo padrão se a data não vier. Q10 do professor: modelo e tarefa são DUAS tabelas.

Closes #91

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```
**Parar e pedir aprovação do usuário.**

---

## Task 5: Dashboard e série semanal do mentor (RF-22)

**Files:**
- Create: `src/domain/serie.ts`, `src/models/dashboard.model.ts`, `src/controllers/dashboard.controller.ts`, `tests/serie.unit.test.ts`, `tests/dashboard.test.ts`
- Modify: `src/models/equipe.model.ts` (exportar `whereEscopo`), `src/utils/acesso.ts` (mover `escopoDo` para cá), `src/controllers/equipe.controller.ts` (importar `escopoDo`), `src/routes.ts`

**Interfaces:**
- Produces: `GET /dashboard` (admin: tudo; mentor: só as suas) →
  ```
  { equipesAtivas, prontasInovamf, totalEquipes, tarefasAtrasadas, aAvaliar,
    porEtapa: [{ numero, nome, total }],            // só equipes ativas
    serieSemanal: [{ semanaInicio, rotulo, avancos, entregas }] }  // 8 semanas, a última termina hoje
  ```
  `serieSemanal(hoje: string, semanas: number, avancos: string[], entregas: string[])`, `ehAvanco(h: { origem: number | null; destino: number; statusOrigem: string | null; statusDestino: string | null }): boolean` (de `domain/serie.ts`); `escopoDo(req): Escopo` (de `utils/acesso.ts`).
- Definições (idênticas ao mock): `prontasInovamf` = status `pronta_inovamf` ou `encaminhada_inovamf`; `aAvaliar` = tarefas com status `entregue`; `avancos` = histórico com destino > origem, ou entrada em "pronta"; `entregas` = tarefas com `concluida_em` na janela; janelas de 7 dias pela data de São Paulo.

- [ ] **Step 1: Branch e issue**

```bash
git checkout staging && git pull && git checkout -b feat/dashboard-indicadores
gh issue create --title "backend: dashboard (RF-22) e série semanal do mentor" --body "Indicadores do admin e do painel do mentor calculados no backend, com escopo por papel." --label enhancement
```
Comente "Pegando." na issue.

- [ ] **Step 2: Teste unitário (falha)**

`tests/serie.unit.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { ehAvanco, serieSemanal } from "../src/domain/serie.js";

describe("serieSemanal", () => {
  it("8 janelas de 7 dias terminando hoje, contando por data", () => {
    const s = serieSemanal("2026-09-22", 8, ["2026-09-22", "2026-09-16", "2026-09-15"], ["2026-08-01"]);
    expect(s).toHaveLength(8);
    expect(s[7]).toEqual({ semanaInicio: "2026-09-16", rotulo: "16/09", avancos: 2, entregas: 0 });
    expect(s[6]).toMatchObject({ semanaInicio: "2026-09-09", avancos: 1 });
    expect(s[0]!.semanaInicio).toBe("2026-07-29");
    expect(s[0]!.entregas).toBe(1);
  });
});

describe("ehAvanco", () => {
  it("destino maior que origem, ou entrada em pronta", () => {
    expect(ehAvanco({ origem: 1, destino: 2, statusOrigem: "ativa", statusDestino: "ativa" })).toBe(true);
    expect(ehAvanco({ origem: 3, destino: 2, statusOrigem: "ativa", statusDestino: "ativa" })).toBe(false);
    expect(ehAvanco({ origem: 6, destino: 6, statusOrigem: "ativa", statusDestino: "pronta_inovamf" })).toBe(true);
    expect(ehAvanco({ origem: null, destino: 1, statusOrigem: null, statusDestino: null })).toBe(true);
  });
});
```
Run → FAIL.

- [ ] **Step 3: Regra pura**

`src/domain/serie.ts`:
```ts
import { dataISO } from "./atraso.js";

// Série semanal do painel do mentor: `semanas` janelas de 7 dias, a última
// terminando em `hoje` (datas YYYY-MM-DD no fuso de SP). Conta quantos eventos
// de cada lista caem em cada janela (limites inclusivos).
export function serieSemanal(
  hoje: string,
  semanas: number,
  avancos: string[],
  entregas: string[],
): Array<{ semanaInicio: string; rotulo: string; avancos: number; entregas: number }> {
  const dia = (base: string, n: number) => {
    const d = new Date(`${base}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return dataISO(d);
  };
  const conta = (lista: string[], ini: string, fim: string) =>
    lista.filter((d) => d >= ini && d <= fim).length;

  const r = [];
  for (let i = semanas - 1; i >= 0; i--) {
    const fim = dia(hoje, -7 * i);
    const ini = dia(fim, -6);
    r.push({
      semanaInicio: ini,
      rotulo: `${ini.slice(8, 10)}/${ini.slice(5, 7)}`,
      avancos: conta(avancos, ini, fim),
      entregas: conta(entregas, ini, fim),
    });
  }
  return r;
}

// Movimento que conta como avanço no painel: etapa maior, ou entrada em "pronta".
export function ehAvanco(h: {
  origem: number | null;
  destino: number;
  statusOrigem: string | null;
  statusDestino: string | null;
}): boolean {
  if (h.statusDestino === "pronta_inovamf" && h.statusOrigem !== "pronta_inovamf") return true;
  return h.destino > (h.origem ?? 0);
}
```
Run `npx vitest run tests/serie.unit.test.ts` → PASS.

- [ ] **Step 4: `escopoDo` compartilhado**

Em `src/utils/acesso.ts` acrescentar:
```ts
import type { Escopo } from "../models/equipe.model.js";

// Escopo de leitura por papel (RNF-03), usado por listas, dashboard e CSV.
export function escopoDo(req: Request): Escopo {
  if (req.auth.role === "admin") return { tipo: "admin" };
  if (req.auth.role === "mentor") return { tipo: "mentor", usuarioId: idDoChamador(req) };
  return { tipo: "aluno", usuarioId: idDoChamador(req) };
}
```
Em `src/controllers/equipe.controller.ts`, apagar a função local `escopoDo` e importá-la: `import { escopoDo, idDoChamador, podeGerirEquipe } from "../utils/acesso.js";`. Em `src/models/equipe.model.ts`, trocar `function whereEscopo(` por `export function whereEscopo(`.

- [ ] **Step 5: Teste de integração (falha)**

`tests/dashboard.test.ts`:
```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { bearer, criarEquipe, criarUsuario, limpar, login } from "./helpers.js";

const app = createApp();
const sufixo = `dsh${Date.now()}`;
const email = (n: string) => `${n}.${sufixo}@teste.local`;
let mentorAccess = "";
let alunoAccess = "";

beforeAll(async () => {
  const mentor = await criarUsuario(email("mentor"), "mentor");
  const aluno = await criarUsuario(email("aluno"), "aluno");
  const eq = await criarEquipe({ nome: `D ${sufixo}`, mentorId: mentor.id, etapa: 2, membros: [{ id: aluno.id, papel: "lider" }] });
  await prisma.tarefas.createMany({
    data: [
      { equipe_id: eq.id, etapa_id: 2, titulo: "Atrasada", data_entrega: new Date("2020-01-01T00:00:00Z") },
      { equipe_id: eq.id, etapa_id: 2, titulo: "Entregue", status: "entregue", data_entrega: new Date("2099-01-01T00:00:00Z") },
      { equipe_id: eq.id, etapa_id: 1, titulo: "Aprovada", status: "aprovada", concluida_em: new Date(), data_entrega: new Date("2099-01-01T00:00:00Z") },
    ],
  });
  await prisma.historico_etapas.create({
    data: { equipe_id: eq.id, etapa_origem_id: 1, etapa_destino_id: 2, movido_por: mentor.id, status_origem: "ativa", status_destino: "ativa" },
  });
  await criarEquipe({ nome: `Pronta ${sufixo}`, mentorId: mentor.id, etapa: 6, status: "pronta_inovamf" });
  mentorAccess = await login(app, email("mentor"));
  alunoAccess = await login(app, email("aluno"));
});

afterAll(async () => {
  await limpar(sufixo);
  await prisma.$disconnect();
});

describe("GET /dashboard", () => {
  it("mentor vê só as suas equipes", async () => {
    const r = await request(app).get("/api/v1/dashboard").set(bearer(mentorAccess));
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({
      equipesAtivas: 1,
      prontasInovamf: 1,
      totalEquipes: 2,
      tarefasAtrasadas: 1,
      aAvaliar: 1,
    });
    expect(r.body.porEtapa).toHaveLength(6);
    expect(r.body.porEtapa[1]).toMatchObject({ numero: 2, total: 1 });
    expect(r.body.serieSemanal).toHaveLength(8);
    expect(r.body.serieSemanal[7]).toMatchObject({ avancos: 1, entregas: 1 });
  });
  it("aluno → 403", async () => {
    const r = await request(app).get("/api/v1/dashboard").set(bearer(alunoAccess));
    expect(r.status).toBe(403);
  });
});
```
Run → FAIL (404).

- [ ] **Step 6: Model e controller**

`src/models/dashboard.model.ts`:
```ts
import { prisma } from "../prisma.js";
import { whereEscopo, type Escopo } from "./equipe.model.js";
import { whereStatusEfetivo } from "./tarefa.model.js";

// Agregados do dashboard (RF-22) — COUNT/GROUP BY no banco, com o escopo do papel.
export async function indicadores(escopo: Escopo, hoje: string) {
  const wEq = whereEscopo(escopo);
  const [equipesAtivas, prontasInovamf, totalEquipes, porEtapaRaw, tarefasAtrasadas, aAvaliar, etapas] =
    await Promise.all([
      prisma.equipes.count({ where: { AND: [wEq, { status: "ativa" }] } }),
      prisma.equipes.count({
        where: { AND: [wEq, { status: { in: ["pronta_inovamf", "encaminhada_inovamf"] } }] },
      }),
      prisma.equipes.count({ where: wEq }),
      prisma.equipes.groupBy({
        by: ["etapa_atual_id"],
        where: { AND: [wEq, { status: "ativa" }] },
        _count: { _all: true },
      }),
      prisma.tarefas.count({ where: { AND: [whereStatusEfetivo("atrasada", hoje), { equipes: wEq }] } }),
      prisma.tarefas.count({ where: { status: "entregue", equipes: wEq } }),
      prisma.etapas.findMany({
        where: { ativo: true },
        orderBy: { numero: "asc" },
        select: { id: true, numero: true, nome: true },
      }),
    ]);
  const porEtapa = etapas.map((e) => ({
    numero: e.numero,
    nome: e.nome,
    total: porEtapaRaw.find((g) => g.etapa_atual_id === e.id)?._count._all ?? 0,
  }));
  return { equipesAtivas, prontasInovamf, totalEquipes, tarefasAtrasadas, aAvaliar, porEtapa };
}

// Eventos crus da série semanal (desde uma data), no escopo do papel.
export async function eventosSerie(escopo: Escopo, desde: Date) {
  const wEq = whereEscopo(escopo);
  const [historico, concluidas] = await Promise.all([
    prisma.historico_etapas.findMany({
      where: { criado_em: { gte: desde }, equipes: wEq },
      select: {
        criado_em: true,
        status_origem: true,
        status_destino: true,
        etapas_historico_etapas_etapa_origem_idToetapas: { select: { numero: true } },
        etapas_historico_etapas_etapa_destino_idToetapas: { select: { numero: true } },
      },
    }),
    prisma.tarefas.findMany({
      where: { concluida_em: { gte: desde }, equipes: wEq },
      select: { concluida_em: true },
    }),
  ]);
  return { historico, concluidas };
}
```
`src/controllers/dashboard.controller.ts`:
```ts
import type { NextFunction, Request, Response } from "express";
import { escopoDo } from "../utils/acesso.js";
import { hojeISO, somarDias } from "../domain/atraso.js";
import { ehAvanco, serieSemanal } from "../domain/serie.js";
import * as dashboardModel from "../models/dashboard.model.js";

const SEMANAS = 8;

// GET /dashboard — admin (tudo) e mentor (só as suas equipes). RF-22.
export async function show(req: Request, res: Response, next: NextFunction) {
  try {
    const escopo = escopoDo(req);
    const hoje = hojeISO();
    // Margem de 1 dia: o filtro é em UTC e a janela é contada pela data de SP.
    const desde = somarDias(hoje, -(SEMANAS * 7));
    const [ind, ev] = await Promise.all([
      dashboardModel.indicadores(escopo, hoje),
      dashboardModel.eventosSerie(escopo, desde),
    ]);
    const avancos = ev.historico
      .filter((h) =>
        ehAvanco({
          origem: h.etapas_historico_etapas_etapa_origem_idToetapas?.numero ?? null,
          destino: h.etapas_historico_etapas_etapa_destino_idToetapas.numero,
          statusOrigem: h.status_origem,
          statusDestino: h.status_destino,
        }),
      )
      .map((h) => hojeISO(h.criado_em));
    const entregas = ev.concluidas.map((t) => hojeISO(t.concluida_em as Date));
    res.json({ ...ind, serieSemanal: serieSemanal(hoje, SEMANAS, avancos, entregas) });
  } catch (err) {
    next(err);
  }
}
```
`src/routes.ts`: `import * as dashboardCtrl from "./controllers/dashboard.controller.js";` e
```ts
// --- Dashboard (RF-22) ---------------------------------------------------------
routes.get("/dashboard", auth, role("admin", "mentor"), dashboardCtrl.show);
```

- [ ] **Step 7: Rodar tudo** — `npm test && npm run build` → PASS.

- [ ] **Step 8: Commit e PR**

```bash
git add src/domain/serie.ts src/models/dashboard.model.ts src/controllers/dashboard.controller.ts src/models/equipe.model.ts src/controllers/equipe.controller.ts src/utils/acesso.ts src/routes.ts tests/serie.unit.test.ts tests/dashboard.test.ts
git commit -m "feat(backend): dashboard com indicadores e série semanal do mentor (RF-22)

Closes #N"
git push -u origin feat/dashboard-indicadores
gh pr create --base staging --title "feat(backend): dashboard (RF-22)" --body "GET /dashboard com escopo por papel: ativas, prontas, total, atrasadas (COUNT direto com a regra da RN-04), a avaliar, por etapa (GROUP BY) e série de 8 semanas.

Closes #N

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```
**Parar e pedir aprovação do usuário.**

---

## Task 6: Exportar CSV das equipes (RF-23)

**Files:**
- Create: `src/domain/csv.ts`, `tests/csv.test.ts`
- Modify: `src/controllers/equipe.controller.ts` (nova `exportarCSV`), `src/models/equipe.model.ts` (nova `listarTodas`), `src/routes.ts`

**Interfaces:**
- Consumes: `lerFiltros(req)`, `mapResumo(e)` (Task 1), `resumoSelect(hoje)`.
- Produces: `GET /equipes/export.csv?<mesmos filtros da lista>` (admin/mentor) → `text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="equipes-infohub.csv"`. `STATUS_EQUIPE_LABEL`, `celulaCSV(v)`, `equipesCSV(linhas)` (de `domain/csv.ts`).

- [ ] **Step 1: Branch e issue**

```bash
git checkout staging && git pull && git checkout -b feat/export-csv
gh issue create --title "backend: exportar CSV das equipes filtradas (RF-23)" --body "Mesmo formato do export do front (colunas, labels, BOM), gerado no backend com os filtros do funil." --label enhancement
```
Comente "Pegando." na issue.

- [ ] **Step 2: Teste (falha)**

`tests/csv.test.ts`:
```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { celulaCSV, equipesCSV } from "../src/domain/csv.js";
import { bearer, criarEquipe, criarUsuario, limpar, login } from "./helpers.js";

describe("domain/csv", () => {
  it("escapa aspas, vírgula e quebra de linha", () => {
    expect(celulaCSV("simples")).toBe("simples");
    expect(celulaCSV('diz "oi", tchau')).toBe('"diz ""oi"", tchau"');
    expect(celulaCSV("a\nb")).toBe('"a\nb"');
  });
  it("BOM + cabeçalho exato + linha formatada", () => {
    const csv = equipesCSV([
      {
        nomeIdeia: "EcoRota, a ideia",
        area: "Sustentabilidade",
        etapa: { numero: 2, nome: "Contato com a equipe" },
        status: "pronta_inovamf",
        mentor: "Carla",
        cursoLider: null,
        tarefasAtrasadas: 3,
      },
    ]);
    expect(csv).toBe(
      "﻿Ideia,Área,Etapa,Status,Mentor,Curso do líder,Tarefas atrasadas\n" +
        '"EcoRota, a ideia",Sustentabilidade,2. Contato com a equipe,Pronta p/ InovAMF,Carla,,3',
    );
  });
});

const app = createApp();
const sufixo = `csv${Date.now()}`;
let adminAccess = "";

beforeAll(async () => {
  await criarUsuario(`admin.${sufixo}@teste.local`, "admin");
  adminAccess = await login(app, `admin.${sufixo}@teste.local`);
  await criarEquipe({ nome: `Planilha ${sufixo}` });
});

afterAll(async () => {
  await limpar(sufixo);
  await prisma.$disconnect();
});

describe("GET /equipes/export.csv", () => {
  it("devolve o CSV das equipes filtradas", async () => {
    const r = await request(app).get(`/api/v1/equipes/export.csv?q=${sufixo}`).set(bearer(adminAccess));
    expect(r.status).toBe(200);
    expect(r.headers["content-type"]).toContain("text/csv");
    expect(r.headers["content-disposition"]).toContain("equipes-infohub.csv");
    const linhas = r.text.split("\n");
    expect(linhas).toHaveLength(2);
    expect(linhas[1]).toContain(`Planilha ${sufixo}`);
  });
});
```
Run → FAIL.

- [ ] **Step 3: Regra pura**

`src/domain/csv.ts`:
```ts
// RF-23: exportação CSV das equipes — mesmo formato que o front gerava.
// Labels idênticos a frontend/src/domain/labels.ts (STATUS_EQUIPE_LABEL).
export const STATUS_EQUIPE_LABEL: Record<string, string> = {
  ativa: "Ativa",
  pronta_inovamf: "Pronta p/ InovAMF",
  encaminhada_inovamf: "Encaminhada ao InovAMF",
  pausada: "Pausada",
  desistente: "Desistente",
};

const CABECALHO = ["Ideia", "Área", "Etapa", "Status", "Mentor", "Curso do líder", "Tarefas atrasadas"];

export function celulaCSV(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function equipesCSV(
  linhas: Array<{
    nomeIdeia: string;
    area: string | null;
    etapa: { numero: number; nome: string };
    status: string;
    mentor: string | null;
    cursoLider: string | null;
    tarefasAtrasadas: number;
  }>,
): string {
  const corpo = linhas.map((e) => [
    e.nomeIdeia,
    e.area ?? "",
    `${e.etapa.numero}. ${e.etapa.nome}`,
    STATUS_EQUIPE_LABEL[e.status] ?? e.status,
    e.mentor ?? "",
    e.cursoLider ?? "",
    String(e.tarefasAtrasadas),
  ]);
  // BOM: o Excel só lê acentos em UTF-8 com ele.
  return "﻿" + [CABECALHO, ...corpo].map((r) => r.map(celulaCSV).join(",")).join("\n");
}
```

- [ ] **Step 4: Model, controller e rota**

`src/models/equipe.model.ts` — acrescentar:
```ts
// Sem paginação (export). Teto defensivo para não varrer o banco inteiro (Problema 5).
export const LIMITE_EXPORT = 5000;
export function listarTodas(params: { escopo: Escopo } & FiltrosEquipe) {
  return prisma.equipes.findMany({
    where: { AND: [whereEscopo(params.escopo), whereFiltros(params)] },
    take: LIMITE_EXPORT,
    orderBy: [{ etapa_atual_id: "asc" }, { nome_ideia: "asc" }],
    select: resumoSelect(params.hoje),
  });
}
```
`src/controllers/equipe.controller.ts` — importar `import { equipesCSV } from "../domain/csv.js";` e acrescentar:
```ts
// GET /equipes/export.csv — RF-23, com os mesmos filtros e escopo da lista.
export async function exportarCSV(req: Request, res: Response, next: NextFunction) {
  try {
    const filtros = await lerFiltros(req);
    const linhas = (await equipeModel.listarTodas(filtros)).map(mapResumo);
    const csv = equipesCSV(
      linhas.map((e) => ({
        nomeIdeia: e.nomeIdeia,
        area: e.area,
        etapa: e.etapa,
        status: e.status,
        mentor: e.mentor?.nome ?? null,
        cursoLider: e.lider?.curso ?? null,
        tarefasAtrasadas: e.tarefasAtrasadas,
      })),
    );
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="equipes-infohub.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
}
```
`src/routes.ts` — **antes** de `routes.get("/equipes/:slug", …)` (senão `export.csv` vira um slug):
```ts
routes.get("/equipes/export.csv", auth, role("admin", "mentor"), equipeCtrl.exportarCSV);
```

- [ ] **Step 5: Rodar tudo** — `npm test && npm run build` → PASS.

- [ ] **Step 6: Commit e PR**

```bash
git add src/domain/csv.ts src/models/equipe.model.ts src/controllers/equipe.controller.ts src/routes.ts tests/csv.test.ts
git commit -m "feat(backend): exportação CSV das equipes filtradas (RF-23)

Closes #N"
git push -u origin feat/export-csv
gh pr create --base staging --title "feat(backend): exportar CSV (RF-23)" --body "GET /equipes/export.csv com os filtros do funil, escopo por papel, teto de 5000 linhas; mesmo formato do export do front.

Closes #N

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```
**Parar e pedir aprovação do usuário.**

---

## Task 7: Perfil e senha próprios

**Files:**
- Create: `tests/conta.test.ts`
- Modify: `src/models/usuario.model.ts` (novas `atualizarPerfil`, `findSenhaById`, `definirSenha`), `src/controllers/auth.controller.ts` (novas `atualizarMe`, `trocarSenha`), `src/routes.ts`

**Interfaces:**
- Produces: `PATCH /auth/me {nome?, telefone?}` → mesmo shape de `GET /auth/me`. `POST /auth/senha {atual, nova}` → 200 com **nova sessão** `{access, refresh, usuario}` (todas as outras sessões são revogadas); 401 `SENHA_ATUAL_INVALIDA`; 400 `WEAK_PASSWORD` (< 8).

- [ ] **Step 1: Branch e issue**

```bash
git checkout staging && git pull && git checkout -b feat/conta-perfil-senha
gh issue create --title "backend: editar o próprio perfil e trocar a senha (exige a atual)" --body "PATCH /auth/me e POST /auth/senha; troca revoga as outras sessões." --label enhancement
```
Comente "Pegando." na issue.

- [ ] **Step 2: Teste (falha)**

`tests/conta.test.ts`:
```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { SENHA, bearer, criarUsuario, limpar, login } from "./helpers.js";

const app = createApp();
const sufixo = `cta${Date.now()}`;
const email = `aluno.${sufixo}@teste.local`;
let access = "";

beforeAll(async () => {
  await criarUsuario(email, "aluno");
  access = await login(app, email);
});

afterAll(async () => {
  await limpar(sufixo);
  await prisma.$disconnect();
});

describe("PATCH /auth/me", () => {
  it("edita nome e telefone", async () => {
    const r = await request(app).patch("/api/v1/auth/me").set(bearer(access)).send({ nome: "Nome Novo", telefone: "51988887777" });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ nome: "Nome Novo", telefone: "51988887777", email });
  });
  it("nome curto → 400", async () => {
    const r = await request(app).patch("/api/v1/auth/me").set(bearer(access)).send({ nome: "A" });
    expect(r.status).toBe(400);
  });
});

describe("POST /auth/senha", () => {
  it("senha atual errada → 401", async () => {
    const r = await request(app).post("/api/v1/auth/senha").set(bearer(access)).send({ atual: "errada-123", nova: "nova-senha-123" });
    expect(r.status).toBe(401);
    expect(r.body.error.code).toBe("SENHA_ATUAL_INVALIDA");
  });
  it("troca, devolve sessão nova e derruba a antiga", async () => {
    const r = await request(app).post("/api/v1/auth/senha").set(bearer(access)).send({ atual: SENHA, nova: "nova-senha-123" });
    expect(r.status).toBe(200);
    expect(r.body.access).toBeTruthy();
    const velho = await request(app).get("/api/v1/auth/me").set(bearer(access));
    expect(velho.status).toBe(401);
    const novo = await request(app).get("/api/v1/auth/me").set(bearer(r.body.access));
    expect(novo.status).toBe(200);
    await login(app, email, "nova-senha-123");
  });
});
```
Run → FAIL.

- [ ] **Step 3: Model**

Em `src/models/usuario.model.ts` acrescentar:
```ts
export function atualizarPerfil(id: string, data: { nome?: string; telefone?: string }) {
  return prisma.usuarios.update({ where: { id }, data, select: { slug: true } });
}

export function findSenhaById(id: string) {
  return prisma.usuarios.findFirst({
    where: { id, ativo: true, excluido_em: null },
    select: { id: true, slug: true, nome: true, tipo_usuario: true, senha: true },
  });
}

export function definirSenha(id: string, senhaHash: string) {
  return prisma.usuarios.update({ where: { id }, data: { senha: senhaHash } });
}
```

- [ ] **Step 4: Controller e rotas**

Em `src/controllers/auth.controller.ts` — importar `import { idDoChamador } from "../utils/acesso.js";` e acrescentar:
```ts
// PATCH /auth/me — a pessoa edita o próprio nome/telefone (e-mail e papel não).
export async function atualizarMe(req: Request, res: Response, next: NextFunction) {
  try {
    const { nome, telefone } = req.body ?? {};
    const data: { nome?: string; telefone?: string } = {};
    if (nome !== undefined) {
      if (typeof nome !== "string" || nome.trim().length < 3) {
        throw httpError(400, "INVALID_NOME", "Nome deve ter ao menos 3 caracteres");
      }
      data.nome = nome.trim();
    }
    if (telefone !== undefined) {
      if (typeof telefone !== "string") throw httpError(400, "INVALID_TELEFONE", "Telefone inválido");
      data.telefone = telefone.trim();
    }
    if (Object.keys(data).length === 0) throw httpError(400, "EMPTY_UPDATE", "Nada para atualizar");
    await usuarioModel.atualizarPerfil(idDoChamador(req), data);
    await me(req, res, next);
  } catch (err) {
    next(err);
  }
}

// POST /auth/senha — troca exige a senha ATUAL; revoga todas as sessões e
// devolve uma nova para quem trocou (as outras abas/dispositivos caem).
export async function trocarSenha(req: Request, res: Response, next: NextFunction) {
  try {
    const { atual, nova } = req.body ?? {};
    if (typeof atual !== "string" || typeof nova !== "string") {
      throw httpError(400, "INVALID_BODY", "Informe a senha atual e a nova");
    }
    if (nova.length < 8) throw httpError(400, "WEAK_PASSWORD", "Senha deve ter ao menos 8 caracteres");
    const usuario = await usuarioModel.findSenhaById(idDoChamador(req));
    if (!usuario || !(await verificarSenha(atual, usuario.senha))) {
      throw httpError(401, "SENHA_ATUAL_INVALIDA", "Senha atual incorreta");
    }
    await usuarioModel.definirSenha(usuario.id, await hashSenha(nova));
    await tokenModel.revogarTodosVivosDoUsuario(usuario.id, "troca_senha");
    res.json(await emitirSessao(usuario, null, req));
  } catch (err) {
    next(err);
  }
}
```
`src/routes.ts`, na seção Auth:
```ts
routes.patch("/auth/me", auth, authCtrl.atualizarMe);
routes.post("/auth/senha", auth, authLimiter, authCtrl.trocarSenha);
```

- [ ] **Step 5: Rodar tudo** — `npm test && npm run build` → PASS.

- [ ] **Step 6: Commit e PR**

```bash
git add src/models/usuario.model.ts src/controllers/auth.controller.ts src/routes.ts tests/conta.test.ts
git commit -m "feat(backend): editar o próprio perfil e trocar senha exigindo a atual

Closes #N"
git push -u origin feat/conta-perfil-senha
gh pr create --base staging --title "feat(backend): perfil e senha próprios" --body "PATCH /auth/me (nome/telefone) e POST /auth/senha {atual, nova}: confere a atual, revoga as sessões e devolve uma nova.

Closes #N

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```
**Parar e pedir aprovação do usuário.**

---

## Task 8: Adicionar membro depois do cadastro (nome + e-mail → convite)

**Files:**
- Create: `tests/membros-adicionar.test.ts`
- Modify: `src/models/equipe.model.ts` (extrair `opsVinculoColega`, nova `adicionarMembro`), `src/controllers/equipe.controller.ts` (extrair `prepararColega`, nova `adicionarMembro`), `src/middlewares/rateLimit.ts` (chave usa `lider.email`), `src/routes.ts`

**Interfaces:**
- Consumes: `classificarColega`, `linkConvite`, `inscrever` (Plano 1 Task 3).
- Produces: `POST /equipes/:slug/membros {nome, email}` (líder da equipe, mentor da equipe ou admin) → 201 `{ slug, nome, email, conviteUrl: string|null, pendente: boolean }`; 409 `RN03_EQUIPE_ATIVA` / `EMAIL_NAO_ALUNO`; 403 para os demais.

- [ ] **Step 1: Branch e issue**

```bash
git checkout staging && git pull && git checkout -b feat/adicionar-membro
gh issue create --title "backend: adicionar integrante depois do cadastro (nome + e-mail → convite)" --body "Líder, mentor ou admin adicionam; RN-03 reaproveita a pessoa; devolve conviteUrl." --label enhancement
```
Comente "Pegando." na issue.

- [ ] **Step 2: Teste (falha)**

`tests/membros-adicionar.test.ts`:
```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { bearer, criarEquipe, criarUsuario, limpar, login } from "./helpers.js";

const app = createApp();
const sufixo = `add${Date.now()}`;
const email = (n: string) => `${n}.${sufixo}@teste.local`;
let liderAccess = "";
let mentorAccess = "";
let estranhoAccess = "";
let slug = "";

beforeAll(async () => {
  const mentor = await criarUsuario(email("mentor"), "mentor");
  const lider = await criarUsuario(email("lider"), "aluno");
  await criarUsuario(email("livre"), "aluno", { nome: "Livre Silva" });
  const ocupado = await criarUsuario(email("ocupado"), "aluno");
  await criarEquipe({ nome: `Outra ${sufixo}`, membros: [{ id: ocupado.id, papel: "lider" }] });
  const estranho = await criarUsuario(email("estranho"), "aluno");
  void estranho;
  slug = (await criarEquipe({ nome: `E ${sufixo}`, mentorId: mentor.id, membros: [{ id: lider.id, papel: "lider" }] })).slug;
  liderAccess = await login(app, email("lider"));
  mentorAccess = await login(app, email("mentor"));
  estranhoAccess = await login(app, email("estranho"));
});

afterAll(async () => {
  await limpar(sufixo);
  await prisma.$disconnect();
});

const adicionar = (access: string, body: object) =>
  request(app).post(`/api/v1/equipes/${slug}/membros`).set(bearer(access)).send(body);

describe("POST /equipes/:slug/membros", () => {
  it("líder adiciona pessoa nova → link de convite", async () => {
    const r = await adicionar(liderAccess, { nome: "Nova Pessoa", email: email("nova") });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ nome: "Nova Pessoa", pendente: true });
    expect(r.body.conviteUrl).toContain("/convite?token=");
  });
  it("mentor adiciona aluno já ativado e livre → sem convite", async () => {
    const r = await adicionar(mentorAccess, { nome: "Livre Silva", email: email("livre") });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ conviteUrl: null, pendente: false });
  });
  it("RN-03: quem está em outra equipe ativa → 409", async () => {
    const r = await adicionar(liderAccess, { nome: "Ocupado", email: email("ocupado") });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("RN03_EQUIPE_ATIVA");
  });
  it("aluno de fora → 403", async () => {
    const r = await adicionar(estranhoAccess, { nome: "Qualquer", email: email("qq") });
    expect(r.status).toBe(403);
  });
  it("detalhe mostra os 3 integrantes", async () => {
    const r = await request(app).get(`/api/v1/equipes/${slug}`).set(bearer(liderAccess));
    expect(r.body.membros).toHaveLength(3);
  });
});
```
Run → FAIL.

- [ ] **Step 3: Model — extrair as operações de vínculo**

Em `src/models/equipe.model.ts`, extrair o corpo do `for (const c of p.colegas) { … }` de `inscrever` para:
```ts
export type ColegaPreparado = DadosInscricao["colegas"][number];

// Operações que ligam UMA pessoa a uma equipe como integrante: cria a conta se
// for nova, o vínculo, e o convite (invalidando o anterior se ela já existia).
function opsVinculoColega(equipeId: string, c: ColegaPreparado): Prisma.PrismaPromise<unknown>[] {
  const ops: Prisma.PrismaPromise<unknown>[] = [];
  // … (mover para cá, sem mudar nada, o corpo atual do laço de inscrever,
  //     trocando `ops.push(` pelo mesmo `ops.push(` e `p.equipe.id` por `equipeId`)
  return ops;
}
```
e em `inscrever` trocar o laço por:
```ts
  for (const c of p.colegas) ops.push(...opsVinculoColega(p.equipe.id, c));
```
Acrescentar:
```ts
export function adicionarMembro(equipeId: string, c: ColegaPreparado) {
  return prisma.$transaction(opsVinculoColega(equipeId, c));
}
```
(Movimento puro de código: os testes de inscrição do Plano 1 devem continuar verdes — rode `npx vitest run tests/rn03-convites.test.ts tests/equipes.test.ts` antes de seguir.)

- [ ] **Step 4: Controller — extrair `prepararColega` e criar a ação**

Em `src/controllers/equipe.controller.ts`:

(a) extrair o callback do `listaColegas.map(async (c) => { … })` de `inscricao` para uma função de módulo com a mesma lógica, e usá-la:
```ts
const MSG_RECUSA = {
  RN03_EQUIPE_ATIVA: (e: string) => `${e} já participa de uma equipe ativa`,
  EMAIL_NAO_ALUNO: (e: string) => `${e} pertence a uma conta de mentor/admin`,
} as const;

// Prepara (hashes prontos) o vínculo de UMA pessoa a uma equipe — RN-03 decide
// entre criar, reaproveitar ou recusar. Usado pela inscrição e por "adicionar membro".
async function prepararColega(
  c: { nome: string; email: string; telefone: string },
  existente: Awaited<ReturnType<typeof usuarioModel.findParaVinculo>>[number] | null,
  expiraConvite: Date,
) {
  // … (corpo idêntico ao callback atual, incluindo o throw de recusa)
}
```
e na inscrição: `const colegasPrep = await Promise.all(listaColegas.map((c) => prepararColega(c, existentes.get(c.email) ?? null, expiraConvite)));` (remova o `MSG_RECUSA` local da inscrição, que agora é de módulo).

(b) acrescentar a ação:
```ts
// POST /equipes/:slug/membros — líder, mentor da equipe ou admin adicionam um
// integrante por nome + e-mail. RN-03 igual à inscrição; devolve o link.
export async function adicionarMembro(req: Request, res: Response, next: NextFunction) {
  try {
    const controle = await equipeModel.findControleBySlug(req.params.slug ?? "");
    if (!controle) throw httpError(404, "EQUIPE_NOT_FOUND", "Equipe não encontrada");
    const eu = idDoChamador(req);
    const ehLider = controle.equipe_membros.some((m) => m.usuario_id === eu && m.papel === "lider");
    if (!podeGerirEquipe(req, controle.mentor_id) && !(req.auth.role === "aluno" && ehLider)) {
      throw httpError(403, "FORBIDDEN", "Só o líder, o mentor ou o admin adicionam integrantes");
    }

    const { nome, email } = req.body ?? {};
    if (typeof nome !== "string" || nome.trim().length < 3) {
      throw httpError(400, "INVALID_NOME", "Nome deve ter ao menos 3 caracteres");
    }
    if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
      throw httpError(400, "INVALID_EMAIL", "E-mail inválido");
    }
    const emailNorm = email.toLowerCase().trim();
    const [existente] = await usuarioModel.findParaVinculo([emailNorm]);
    const expira = new Date(Date.now() + env.inviteTtlHoras * 3_600_000);
    const c = await prepararColega({ nome: nome.trim(), email: emailNorm, telefone: "" }, existente ?? null, expira);

    await equipeModel.adicionarMembro(controle.id, { usuarioId: c.usuarioId, criar: c.criar, convite: c.convite });
    if (c.conviteToken) {
      await emailModel
        .enfileirar({
          tipo: "convite_conta",
          destinatarioId: c.usuarioId,
          destinatarioEmail: c.email,
          assunto: "Você foi adicionado a uma equipe no InfoHub",
          template: "convite_conta",
          dadosTemplate: { nome: c.nome, link: linkConvite(c.conviteToken) },
          equipeId: controle.id,
        })
        .catch((e) => console.error("[adicionarMembro] falha ao enfileirar convite", e));
    }
    res.status(201).json({
      slug: c.slug,
      nome: c.nome,
      email: c.email,
      conviteUrl: c.conviteToken ? linkConvite(c.conviteToken) : null,
      pendente: c.conviteToken !== null,
    });
  } catch (err) {
    next(err);
  }
}
```
`src/routes.ts`: `routes.post("/equipes/:slug/membros", auth, equipeCtrl.adicionarMembro);`

- [ ] **Step 5: Rate limit da inscrição**

Em `src/middlewares/rateLimit.ts`, no `keyGenerator`, trocar a extração do e-mail por:
```ts
    // Inscrição manda o e-mail em lider.email; login/register em email.
    const bruto = req.body?.email ?? req.body?.lider?.email;
    const email = typeof bruto === "string" ? bruto.toLowerCase() : "sem-email";
```

- [ ] **Step 6: Rodar tudo** — `npm test && npm run build` → PASS.

- [ ] **Step 7: Commit e PR**

```bash
git add src/models/equipe.model.ts src/controllers/equipe.controller.ts src/middlewares/rateLimit.ts src/routes.ts tests/membros-adicionar.test.ts
git commit -m "feat(backend): adicionar integrante por nome + e-mail com convite (RN-03)

Closes #N"
git push -u origin feat/adicionar-membro
gh pr create --base staging --title "feat(backend): adicionar integrante" --body "POST /equipes/:slug/membros (líder/mentor/admin), mesma preparação da inscrição (RN-03, convite). Rate limit da inscrição passa a usar lider.email.

Closes #N

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```
**Parar e pedir aprovação do usuário.**
