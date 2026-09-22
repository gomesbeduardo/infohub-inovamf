# AGENTS.md — convenções do projeto InfoHub → InovAMF

- Leia [`plan.md`](plan.md).

Regras para qualquer agente/dev que trabalhe neste repositório. Fonte original:
seção "Fluxo de desenvolvimento" do [`README.md`](README.md).

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
- Next.js 14 (App Router) + React 18 + TypeScript strict; Tailwind v3 com cores
  100% tokenizadas (sem hex literal em componente); dados mockados em memória.

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
