# AGENTS.md — convenções do projeto InfoHub → InovAMF

- Leia [`plan.md`](plan.md).

Regras para qualquer agente/dev que trabalhe neste repositório. Fonte original:
seção "Fluxo de desenvolvimento" do [`README.md`](README.md).

## ⚠️ Frentes em handoff: LGPD e e-mail (Resend). Leia antes de qualquer código

Se a tarefa tocar em **LGPD** (consentimento, política de privacidade,
anonimização, exclusão ou retenção de dados) ou em **e-mail** (Resend, worker,
fila `emails`, templates, preferências), siga esta ordem **sem pular etapas**:

1. **Leia o documento inteiro** da frente, inclusive a seção "Decisões e porquês":
   - LGPD: [`docs/handoff/lgpd.md`](docs/handoff/lgpd.md)
   - E-mail: [`docs/handoff/resend.md`](docs/handoff/resend.md)

   Os dois se cruzam (a anonimização cancela e-mails pendentes), então leia o
   outro também, ao menos o resumo e as decisões.
2. **Explique de volta ao dev**, com suas palavras e antes de propor qualquer
   coisa:
   - o que foi decidido e **por quê**;
   - o que já existe no código;
   - o que falta.

   Se algo no código divergir do documento, aponte a divergência. Não assuma.
3. **Planeje antes de programar.** Escreva o plano em
   `docs/superpowers/plans/AAAA-MM-DD-<tema>.md`, contendo:
   - os arquivos a criar e alterar;
   - os contratos (rotas, códigos de erro, tipos);
   - os testes de cada passo (TDD);
   - a ordem dos passos e os riscos.

   Apresente o plano e **espere o OK do dev**. Nenhum código antes disso.
4. **Não reabra uma decisão sozinho.** As decisões do documento foram tomadas com
   o dono do produto (por exemplo: anonimizar em vez de apagar, nenhuma migration,
   worker como processo separado no mesmo resource, nunca enviar para
   `@demo.infohub.dev`). Se achar que uma delas está errada, **pergunte**, com o
   motivo, antes de mudar o plano.
5. **Segredos:** a `RESEND_API_KEY` vive **só** no Coolify. Nunca em código,
   `.env` versionado, issue, PR ou chat.

## Fluxo de branches e PRs
- **Branch base é `staging`** — nunca dê push direto no `main`. Toda branch sai
  de `staging` e o PR vai **para `staging`** (`gh pr create --base staging`).
  `main` só recebe merges promovidos a partir de `staging`.
- **Uma branch por issue/feature**; a branch é deletada logo após o merge.
- **Nenhum merge sem aprovação** (na conversa ou no GitHub).

## Issues
- **Todo trabalho vira issue** no GitHub (nada fica só local).
- **Antes de começar**, comente na issue quem pegou — sem comentário, a issue é
  considerada **livre**.

## Commits, testes e build
- **Conventional Commits**.
- **TDD** na camada de domínio/repositório (teste antes da implementação).
- `npm test` e `npm run build` **verdes** antes de abrir o PR.

## Arquitetura (hexagonal / ports & adapters)
O núcleo de domínio é isolado dos detalhes de entrega e infraestrutura:
- **Núcleo** — `frontend/src/domain/` (tipos derivados do schema + labels/regras)
  e a lógica de negócio como **funções puras** `(estado, args) → estado`.
- **Adaptadores de dados** — `frontend/src/data/` (`repository` de funções puras,
  `store` React, `session` mockada); hoje é memória, amanhã persistência real, sem
  tocar no núcleo.
- **Adaptadores de entrega (UI)** — `frontend/src/features/` + `frontend/src/app/`
  (App Router).
Regras práticas: o domínio **não importa** UI, store nem framework; dependências
apontam para dentro (UI/data → domínio, nunca o contrário); regra de negócio nova
entra no núcleo com teste antes (TDD), não dentro de componente.

## Stack
- Frontend: Next.js 14 (App Router) + React 18 + TypeScript strict + TanStack
  Query; Tailwind v3 com cores 100% tokenizadas (sem hex literal em componente).
- Backend: Express 4 + Prisma 5 + PostgreSQL (`backend/`), testes com Vitest e
  supertest. Os dados são reais: o front fala só com `/api/v1`, e não há mais
  mock em memória.
- Deploy: um resource no Coolify (Railpack). `scripts/start-all.mjs` sobe a API
  (127.0.0.1:3333) e o Next ($PORT), que repassa `/api/*` para a API.

## Documentação de referência
Já existem `.md`s no repo — consulte antes de duplicar decisão:
- [`README.md`](README.md) — visão geral, stack, design system, estrutura e o
  "Fluxo de desenvolvimento" (fonte das regras acima).
- [`plan.md`](plan.md) — plano de implementação: decisões (D1–D10), paleta,
  tipos de domínio e tarefas em TDD.
- [`docs/Infohub_InovAMF_Requisitos.md`](docs/Infohub_InovAMF_Requisitos.md) —
  requisitos v1.0 (RF-01…RF-24, RNF-01…RNF-07, regras de negócio, Q1–Q7).
- [`docs/sql/infohub_schema.sql`](docs/sql/infohub_schema.sql) — DDL de
  referência histórica. O banco **vivo** é versionado por
  [`backend/prisma/migrations/`](backend/prisma/migrations/) (`prisma migrate`);
  o schema-alvo vem do `?schema=` da `DATABASE_URL`.
- [`docs/superpowers/specs/`](docs/superpowers/specs/) — specs de design/feature.
