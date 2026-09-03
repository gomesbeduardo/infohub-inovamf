# AGENTS.md — convenções do projeto InfoHub → InovAMF

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

## Stack / estrutura
- Next.js 14 (App Router) + React 18 + TypeScript strict; Tailwind v3 com cores
  100% tokenizadas (sem hex literal em componente); dados mockados em memória.
- Organização por feature, não por camada. Detalhes de stack, design system e
  estrutura de pastas estão no [`README.md`](README.md).
