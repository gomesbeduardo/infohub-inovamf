# InfoHub — Backend (`backend/`)

Node + Express 4 + TypeScript strict + Prisma (**só introspecção**). MVC cru,
tudo função exportada. Convenções completas em [`../plan-backend.md`](../plan-backend.md)
e inventário do banco em [`../docs/backend/ENTITIES.md`](../docs/backend/ENTITIES.md).

## Regras invioláveis (resumo)

- **Nunca** `prisma migrate` / DDL. `schema.prisma` vem de `prisma db pull`.
- Precisa de coluna/tabela nova? Pare e escreva em `docs/sql/CHANGE_REQUEST.md`.
- Slug (base64url do UUID) sai na API; UUID/id numérico **nunca**.
- Regra de negócio no controller; model só fala com Prisma.

## Setup

```bash
cp .env.example .env      # ajuste DATABASE_URL / JWT_SECRET
npm install
npm run db:pull           # gera prisma/schema.prisma + client (precisa do banco no ar)
npm run dev               # sobe a API em http://localhost:3333/api/v1
```

## Banco de dev local

Em produção o Postgres é **gerenciado pelo DBA** e a `DATABASE_URL` vem dele
(usuário só com DML, sem DDL). Para desenvolver localmente sobe-se um Postgres
descartável e aplica-se o **`.sql` canônico do próprio DBA** (não é DDL nosso):

```bash
docker run -d --name infohub-dev-db \
  -e POSTGRES_USER=infohub -e POSTGRES_PASSWORD=infohub -e POSTGRES_DB=infohub \
  -p 5544:5432 postgres:16-alpine

# aplica o schema canônico
docker exec -i infohub-dev-db psql -U infohub -d infohub -v ON_ERROR_STOP=1 \
  < ../docs/sql/infohub_schema.sql

# seed local das 6 etapas (reference data — INSERT/DML, necessário p/ FKs de equipe)
# ver comando em docs/backend/ENTITIES.md §4
```

`DATABASE_URL` do `.env.example` já aponta para esse banco (porta 5544).

## Scripts

| Script | O quê |
| ------ | ----- |
| `npm run dev` | API com reload (tsx watch) |
| `npm run build` / `start` | compila para `dist/` e roda |
| `npm run typecheck` | `tsc --noEmit` (strict, sem `any`) |
| `npm test` | Vitest (supertest para as rotas) |
| `npm run db:pull` | introspecção + `prisma generate` |
| `npm run db:check` | **quebra o CI se o banco divergir do `schema.prisma`** (drift do DBA) |

## Fluxo de criação de conta (RF-03)

O admin **não define senha** ao criar uma conta:

1. `POST /usuarios` (admin) cria o `usuario` **pendente** (senha inutilizável) +
   um **convite de uso único** (`tokens_senha`) e **enfileira** um e-mail
   `convite_conta` em `emails` com o link `INVITE_URL_BASE?token=<id>.<segredo>`.
2. A pessoa abre o link → `GET /auth/invite?token=...` mostra os dados
   pré-preenchidos ("vê os dados").
3. `POST /auth/register` com `{ token, senha, nome?, telefone? }` confirma os
   dados, define a senha, queima o convite e já entra logada.

> ⚠️ **Bloqueio em produção:** o e-mail `convite_conta` depende de **CR-001**
> ([`../docs/sql/CHANGE_REQUEST.md`](../docs/sql/CHANGE_REQUEST.md)) — um novo valor
> de enum que o **DBA precisa aplicar**. Já foi aplicado só ao banco de dev local.
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
