# InfoHub — Backend (`backend/`)

Node + Express 4 + TypeScript strict + Prisma (**migrations**). MVC cru,
tudo função exportada. Convenções completas em [`../plan-backend.md`](../plan-backend.md)
e inventário do banco em [`../docs/backend/ENTITIES.md`](../docs/backend/ENTITIES.md).

## Regras invioláveis (resumo)

- DDL **só** em `prisma/migrations/`. `schema.prisma` é a fonte de verdade.
- Coluna/tabela nova = editar o model + `npm run db:migrate:dev -- --name <slug>`,
  commitando a migration junto. Migration já commitada nunca é editada.
- Slug (base64url do UUID) sai na API; UUID/id numérico **nunca**.
- Regra de negócio no controller; model só fala com Prisma.

## Setup

```bash
cp .env.example .env      # ajuste DATABASE_URL (com ?schema=) / JWT_SECRET
npm install
npm run db:migrate        # aplica as migrations no schema da DATABASE_URL
npm run dev               # sobe a API em http://localhost:3333/api/v1
```

Qualquer Postgres **13+** vazio serve: as migrations criam o schema, as tabelas,
os CHECK/índices/triggers e já semeiam os dados de referência (6 etapas do funil
e as áreas de ideia). `gen_random_uuid()` é nativo do PG13+, então nenhuma
extensão é necessária.

## Banco e migrations

O schema-alvo dentro do banco sai do `?schema=` da `DATABASE_URL`
(`postgresql://user:senha@host:5432/infohub?schema=infohub`). O Prisma cria o
schema na primeira execução — para isso o usuário precisa de `CREATE` no
database. Se a política do banco não permitir, peça ao DBA:

```sql
CREATE SCHEMA infohub AUTHORIZATION infohub;
```

Depois disso o usuário só precisa de DDL **dentro** do schema.

| Migration | O quê |
| --------- | ----- |
| `20260917120000_init` | todas as tabelas, PKs, FKs e índices (gerado do `schema.prisma`) |
| `20260917120100_constraints_triggers_indices` | CHECKs, índices parciais/GIN e triggers `atualizado_em` — o que o Prisma não modela |
| `20260917120200_seed_referencia` | etapas 1..6 e `areas_ideia` (idempotente) |

> ⚠️ Ao rodar `prisma migrate dev`, **releia o SQL gerado**: o Prisma não conhece
> os objetos da segunda migration e pode propor dropá-los.

`docs/sql/infohub_schema.sql` continua no repo como referência histórica do
desenho; quem manda hoje é `prisma/migrations/`.

## Rodando junto com o frontend

Este projeto roda só localmente. O `npm start`
do backend é `prisma migrate deploy && node dist/seed/index.js && node dist/server.js`
(aplica as migrations, roda o seed e abre a API). O `npm start` da raiz sobe API
e frontend juntos depois de `npm run build`.

A API escuta em `localhost:3333` e o Next repassa `/api/*` para ela (rewrite em
`frontend/next.config.mjs`), então o browser fala só com `http://localhost:3000`.

## Scripts

| Script | O quê |
| ------ | ----- |
| `npm run dev` | API com reload (tsx watch) |
| `npm run build` / `start` | compila para `dist/` e roda |
| `npm run typecheck` | `tsc --noEmit` (strict, sem `any`) |
| `npm test` | Vitest (supertest para as rotas) |
| `npm run db:migrate` | `prisma migrate deploy` — aplica as pendentes (prod e CI) |
| `npm run db:migrate:dev` | cria/aplica migration a partir do `schema.prisma` (dev) |
| `npm run db:status` | mostra migrations pendentes/falhas sem aplicar |
| `npm run db:reset` | **apaga e recria** o schema (só dev) |

## Fluxo de criação de conta (RF-03)

O admin **não define senha** ao criar uma conta:

1. `POST /usuarios` (admin) cria o `usuario` **pendente** (senha inutilizável) +
   um **convite de uso único** (`tokens_senha`) e **enfileira** um e-mail
   `convite_conta` em `emails` com o link `/convite?token=<id>.<segredo>` (relativo; o front completa com
   a própria origem, ou absoluto se `INVITE_URL_BASE` estiver definida).
2. A pessoa abre o link → `GET /auth/invite?token=...` mostra os dados
   pré-preenchidos ("vê os dados").
3. `POST /auth/register` com `{ token, senha, nome?, telefone? }` confirma os
   dados, define a senha, queima o convite e já entra logada.

> O valor de enum `convite_conta` (antiga CR-001) já faz parte da migration
> `20260917120100_constraints_triggers_indices` — não há mais bloqueio de DBA.
> O envio real do e-mail (SMTP/provedor) é de um worker à parte (Q7, fora de escopo).

## Estrutura

```
src/
├── server.ts / app.ts        # http + express (cors, json, rotas, 404, error)
├── env.ts / prisma.ts        # config e client únicos
├── routes.ts                 # router /api/v1
├── domain/enums.ts           # uniões de string dos CHECK do schema
├── utils/                    # error, slug (base64url), hash (bcrypt+sha256), jwt, text
├── middlewares/              # auth (Bearer), role, error (handler central)
├── models/                   # só queries Prisma
└── controllers/              # regra de negócio + validação inline
```
