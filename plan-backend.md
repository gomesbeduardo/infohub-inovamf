# plan.md — Backend InfoHub (Node + Express + Prisma, MVC cru)

> Documento de execução para agente de código. Leia inteiro antes de escrever código.

---

## 0. Contexto

- Monorepo. Frontend Next.js vive em `frontend/`; o backend nasce em `api/`, irmão dele.
- `docs/sql/infohub_schema.sql` é a **fonte de verdade do banco**. `docs/Infohub_InovAMF_Requisitos*` traz os RFs.
- PostgreSQL **gerenciado por DBA**. O backend só lê e escreve dados, nunca estrutura.
- Domínio: jornada empreendedora de alunos — usuários, equipes, etapas de funil, tarefas, entregas por link, convites, notificações.

---

## 1. Regras invioláveis

1. **Nunca rodar `prisma migrate`** (dev, deploy, reset, diff). Não existe `prisma/migrations/`.
2. **Nunca rodar DDL** (`CREATE`, `ALTER`, `DROP`) em código, script, seed ou teste.
3. `schema.prisma` é gerado por `prisma db pull`. Models nunca escritos à mão.
4. Precisa de coluna/tabela nova? **Pare**, escreva em `docs/sql/CHANGE_REQUEST.md`, aguarde o DBA. Sem gambiarra de JSON ou tabela paralela.
5. **ID numérico nunca sai da API.** URL e resposta usam `slug` (cuid2, `VARCHAR(32)`).
6. Regra de negócio no **controller**. Model só fala com Prisma.
7. **Tudo é função exportada.** Sem classe, sem objeto de métodos, sem `this`, sem factory. `export async function nome(req, res, next)`.
8. Toda rota autenticada passa por `auth` (e `role` quando restrita).
9. Sem `any`. `strict: true`.

---

## 2. Stack

Express 4 · TypeScript · Prisma Client (só introspecção) · `jsonwebtoken` · `argon2` · `@paralleldrive/cuid2`.

Sem Zod, sem service layer, sem presenter, sem container de DI. Validação é `if` no controller. Nova dependência exige justificativa.

---

## 3. Estrutura

```
backend/
├── prisma/
│   └── schema.prisma          # GERADO por db pull
├── src/
│   ├── server.ts              # sobe o http
│   ├── app.ts                 # express, json, cors, rotas, error handler
│   ├── env.ts                 # único lugar que lê process.env
│   ├── prisma.ts              # export const prisma = new PrismaClient()
│   ├── routes.ts              # router único, monta /api/v1
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── usuario.controller.ts
│   │   ├── equipe.controller.ts
│   │   └── ...
│   ├── models/
│   │   ├── usuario.model.ts
│   │   ├── equipe.model.ts
│   │   └── ...
│   ├── middlewares/
│   │   ├── auth.ts            # Bearer
│   │   ├── role.ts            # papel
│   │   └── error.ts           # handler central
│   └── utils/
│       ├── error.ts           # httpError(status, code, message)
│       ├── slug.ts            # newSlug()
│       ├── hash.ts            # senha + sha256
│       ├── jwt.ts             # sign / verify
│       └── text.ts            # unaccent do termo de busca
└── tests/
```

Direção: `routes.ts → middlewares → controller → model → prisma`. Model não importa controller. Controller não importa outro controller.

---

## 4. Prisma por introspecção

Cabeçalho do `schema.prisma` (única parte manual):

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [citext, unaccent, pg_trgm]
}
// models abaixo: gerados por `prisma db pull`
```

```json
{
  "scripts": {
    "db:pull": "prisma db pull && prisma generate",
    "db:check": "prisma db pull --print > /tmp/db.prisma && diff -q prisma/schema.prisma /tmp/db.prisma",
    "postinstall": "prisma generate"
  }
}
```

`db:check` roda no CI e quebra o build se o banco divergir do schema — é assim que se descobre mudança do DBA.

O usuário em `DATABASE_URL` deve ter só DML (`SELECT/INSERT/UPDATE/DELETE`), sem DDL. Confirmar com o DBA.

---

## 5. Primeiro passo do agente

Ler `docs/sql/infohub_schema.sql` inteiro e escrever `docs/backend/ENTITIES.md`:

| Tabela | Model | Slug | Colunas NOT NULL sem default | CHECKs | Relações | RFs |
| ------ | ----- | ---- | ---------------------------- | ------ | -------- | --- |

Registrar também: `DOMAIN`s (viram union de string em TS), índices GIN (definem quais campos aceitam busca), e que as **etapas do funil já vêm seeded** — são somente leitura pela API.

**Parar aqui e reportar o inventário antes de codar rota.**

---

## 6. Padrões de código

### Model — só query

```ts
import { prisma } from "../prisma";

export async function findBySlug(slug: string) {
  return prisma.equipe.findUnique({
    where: { slug },
    include: { membros: { include: { usuario: true } } },
  });
}

export async function create(data: { nome: string; slug: string }) {
  return prisma.equipe.create({ data });
}
```

### Controller — regra de negócio + validação inline

```ts
import type { Request, Response, NextFunction } from "express";
import * as equipeModel from "../models/equipe.model";
import { httpError } from "../utils/error";

export async function show(req: Request, res: Response, next: NextFunction) {
  try {
    const equipe = await equipeModel.findBySlug(req.params.slug);
    if (!equipe)
      throw httpError(404, "EQUIPE_NOT_FOUND", "Equipe não encontrada");

    if (
      req.auth.role === "aluno" &&
      !equipe.membros.some((m) => m.usuario.slug === req.auth.slug)
    ) {
      throw httpError(
        403,
        "NOT_TEAM_MEMBER",
        "Você não participa desta equipe",
      );
    }

    res.json({
      slug: equipe.slug,
      nome: equipe.nome,
      membros: equipe.membros.map((m) => ({
        slug: m.usuario.slug,
        nome: m.usuario.nome,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function store(req: Request, res: Response, next: NextFunction) {
  try {
    const { nome } = req.body;
    if (typeof nome !== "string" || nome.trim().length < 3) {
      throw httpError(
        400,
        "INVALID_NOME",
        "Nome deve ter ao menos 3 caracteres",
      );
    }

    const equipe = await equipeModel.create({
      nome: nome.trim(),
      slug: newSlug(),
    });
    res.status(201).json({ slug: equipe.slug, nome: equipe.nome });
  } catch (err) {
    next(err);
  }
}
```

O controller monta o JSON de resposta na mão — é aqui que se garante que `id`, `senha_hash` e `token_hash` nunca vazam. Não devolver objeto do Prisma direto.

### Rotas — arquivo único

```ts
import { Router } from "express";
import { auth } from "./middlewares/auth";
import { role } from "./middlewares/role";
import * as authCtrl from "./controllers/auth.controller";
import * as equipeCtrl from "./controllers/equipe.controller";

export const routes = Router();

routes.post("/auth/login", authCtrl.login);
routes.post("/auth/register", authCtrl.register);
routes.post("/auth/refresh", authCtrl.refresh);
routes.get("/auth/me", auth, authCtrl.me);

routes.get("/equipes", auth, equipeCtrl.index);
routes.get("/equipes/:slug", auth, equipeCtrl.show);
routes.post("/equipes", auth, role("admin", "orientador"), equipeCtrl.store);
routes.patch(
  "/equipes/:slug",
  auth,
  role("admin", "orientador"),
  equipeCtrl.update,
);
```

Quando `routes.ts` passar de ~150 linhas, quebre em `routes/<recurso>.routes.ts` e mantenha o `routes.ts` só montando os routers.

### Erro

```ts
export function httpError(status: number, code: string, message: string) {
  return Object.assign(new Error(message), { status, code });
}
```

Handler central (`middlewares/error.ts`) traduz:

- erro com `.status` → usa o próprio
- Prisma `P2002` → 409 · `P2025` → 404 · `P2003` → 409
- resto → 500, loga stack, devolve mensagem genérica

Shape de erro sempre: `{ "error": { "code": "...", "message": "..." } }`

---

## 7. Auth Bearer

| Método | Rota                    | Auth                             |
| ------ | ----------------------- | -------------------------------- |
| POST   | `/api/v1/auth/login`    | pública                          |
| POST   | `/api/v1/auth/register` | pública (exige token de convite) |
| POST   | `/api/v1/auth/refresh`  | pública                          |
| POST   | `/api/v1/auth/logout`   | Bearer                           |
| GET    | `/api/v1/auth/me`       | Bearer                           |

Payload do access: `{ sub: slug, role, jti, iat, exp }` — nunca o id numérico.

`middlewares/auth.ts`:

1. sem header ou fora de `Authorization: Bearer <token>` → 401 `MISSING_TOKEN`
2. assinatura inválida/expirado → 401 `INVALID_TOKEN`
3. usuário inativo → 401 `INACTIVE_USER`
4. ok → `req.auth = { slug, role, jti }`

`middlewares/role.ts`: autenticado sem papel → 403 `FORBIDDEN`.

Segurança:

- Senha com Argon2id. Nunca loga, nunca retorna.
- Login inválido: mesma mensagem para e-mail inexistente e senha errada.
- Refresh persistido com hash SHA-256, rotação a cada uso; reuso de token rotacionado revoga a família.
- Rate limit em `/auth/login` e `/auth/register`: 5 tentativas / 15 min por IP + e-mail.
- Convite: comparar por hash, checar expiração e uso único no controller.

---

## 8. Contratos que o banco não valida

| Contrato                                              | Onde                                          |
| ----------------------------------------------------- | --------------------------------------------- |
| cuid2 com retry em colisão (3 tentativas, depois 500) | `utils/slug.ts`, chamado no controller        |
| `unaccent` no termo de busca antes da query (RF-07)   | `utils/text.ts` + model de listagem           |
| Formato de URL dos links de entrega (https)           | validação no controller                       |
| Hash de token de convite e refresh antes de gravar    | `utils/hash.ts`                               |
| Anonimização LGPD na exclusão de usuário              | `usuario.controller.ts`                       |
| Coerência convite/senha no cadastro                   | `auth.controller.ts`, antes de bater no CHECK |

Todo `CHECK` e `NOT NULL` do schema precisa de um `if` equivalente no controller — para falhar em 400, não em 500 do Postgres.

---

## 9. Convenções

- Prefixo `/api/v1`, plural, kebab-case: `/equipes`, `/etapas-funil`, `/links-entrega`.
- Sempre `:slug`, nunca `:id`.
- Paginação: `?page=1&perPage=20`, `perPage` máx 100.
- Busca: `?q=termo`, normalizado com unaccent.
- Filtros com whitelist explícita no controller. Nunca repassar `req.query` para o `where`.

---

## 10. Ordem de execução

1. Ler o SQL → escrever `ENTITIES.md` → **parar e reportar**.
2. Subir `api/`: tsconfig, env, prisma introspectado, `db:check` no CI.
3. Base: `app.ts`, `prisma.ts`, `utils/`, `middlewares/`.
4. Auth completo + testes. Não avançar enquanto 401/403 não passarem.
5. Recursos, um por vez: `usuarios` → `equipes` → `etapas-funil` → `tarefas` → `links-entrega` → `convites` → `notificacoes`.

Por recurso: model → controller → rota → testes (200, 400, 401, 403, 404).

---

## 11. Definition of Done

- [ ] `db:check` passa, sem drift
- [ ] `prisma/migrations/` não existe
- [ ] Nenhum DDL no repositório
- [ ] `tsc --noEmit` limpo, sem `any`
- [ ] Nenhuma classe ou objeto de métodos nos controllers/models
- [ ] Nenhum `id` numérico em URL ou resposta
- [ ] Nenhum objeto do Prisma devolvido cru
- [ ] Todo CHECK/NOT NULL com validação equivalente
- [ ] `ENTITIES.md` e `.env.example` atualizados
