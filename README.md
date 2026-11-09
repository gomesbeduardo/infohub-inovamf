# InfoHub → InovAMF

Sistema de acompanhamento da jornada do empreendedor no laboratório **InfoHub** da Faculdade Antonio Meneghetti, digitalizando o funil de 6 etapas até o encaminhamento ao centro de inovação **InovAMF**.

Hoje esse acompanhamento é manual — a jornada é guiada por uma cartilha impressa e o contato com os alunos acontece por WhatsApp. O sistema centraliza o cadastro das ideias e equipes, mostra em que etapa cada equipe está, permite atribuir tarefas com prazos, receber os entregáveis e disparar lembretes automáticos por e-mail.

Este repositório é o projeto prático da disciplina de **Arquitetura de Sistemas**, do curso de graduação em Sistemas de Informação. O sistema é construído de forma incremental ao longo da cadeira:

- **Fase 1** — levantamento de requisitos e modelagem do banco de dados.
- **Fase 2** — frontend web com dados mockados: Design System próprio, os 5 fluxos centrais + funcionalidades de coordenação (painel, contas, relatórios CSV), dark/light e cobertura de testes (TDD).
- **Fase 3 (atual)** — backend Node/Express/Prisma com PostgreSQL, autenticação por perfil e seed de demonstração. O projeto roda apenas localmente.
- **Fases futuras** — e-mails/lembretes e relatórios, conforme a disciplina avançar.

## Documentação

- [`docs/Infohub_InovAMF_Requisitos.md`](docs/Infohub_InovAMF_Requisitos.md) — documento de requisitos v1.0 (convertido do PDF fornecido pela coordenação): objetivos, perfis de usuário, RF-01 a RF-24, RNF-01 a RNF-07, regras de negócio e as perguntas em aberto Q1–Q7.
- [`docs/sql/infohub_schema.sql`](docs/sql/infohub_schema.sql) — schema PostgreSQL (DDL) derivado dos requisitos: identidade e acesso, equipes e jornada, mentoria, tarefas e entregas versionadas, fila de e-mails e auditoria.

## A jornada

As seis etapas herdadas da cartilha do InfoHub, representadas no sistema como um funil:

| Etapa | Nome | Entregável |
| --- | --- | --- |
| 1 | Envio da ideia | Cadastro da ideia (formulário) |
| 2 | Contato com a equipe | Agendamento confirmado |
| 3 | Encontro 1 – Entendendo a ideia | Problema, público-alvo e solução |
| 4 | Encontro 2 – Proposta de valor | Value Proposition Design |
| 5 | Encontro 3 – Modelo de negócio | Business Model Canvas |
| 6 | Encontro 4 – Pitch e inscrição | Pitch Vídeo, Canvas e VPD finais |

Concluída a etapa 6 com os entregáveis aprovados, a equipe é marcada como **Pronta para o InovAMF**.

## Stack

Frontend web falando com uma API própria, guiado por um Design System da marca *infohub*:

- **Next.js 14** (App Router) + **React 18** + **TypeScript** (strict) + TanStack Query.
- **Tailwind CSS v3** com cores 100% tokenizadas (CSS variables) e **dark/light**; o tema é **persistente por cookie**, aplicado no SSR (sem flash entre sessões).
- **Backend**: Express 4 + Prisma 5 + **PostgreSQL** (`backend/`). O front fala só com `/api/v1`; o Next repassa `/api/*` para a API.
- **shadcn/Radix** só para primitivos de acessibilidade (Dialog).
- **Vitest + React Testing Library + jsdom** no frontend; **Vitest + supertest** no backend (TDD).

### Design System

- **Tipografia**: `Space Grotesk` (display) + `Inter` (corpo).
- **Marca**: a lâmpada-rede em **SVG** (`frontend/src/design-system/brand/`) + a assinatura *ignition rail* (o gradiente da marca faísca→forja), reaproveitada em headers e cards.
- **Cores**: extraídas dos logos, declaradas como CSS variables em `frontend/src/design-system/tokens.css` — nenhum hex literal em componente.
- **Movimento**: animações contidas (fade de entrada + cross-fade de tema), sempre respeitando `prefers-reduced-motion`.
- **Acessibilidade**: foco visível tokenizado, `color-scheme` por tema, labels via `FormField`, datas via `Intl`.

### Segurança / dependências

`npm audit` acusa vulnerabilidades cujo fix automático (`npm audit fix --force`) exigiria pular para Next 16 + React 19 + eslint 9 (cascata de majors que foge do plano). A decisão foi **manter o Next 14** por ser um projeto acadêmico que roda **só localmente**, porque os avisos não são exploráveis neste contexto:

- **esbuild / vite / vitest / postcss / glob** — tooling de **dev/build**; não recebe input não-confiável.
- **Next.js** (DoS no Image Optimizer, cache poisoning em RSC, SSRF em rewrites) — só afetam apps expostos publicamente usando esses recursos.

Se o projeto for exposto na internet, revisar e atualizar as dependências (incluindo o salto de major do Next) vem antes.

## Estrutura do repositório

Monorepo: `frontend/` (Next.js) e `backend/` (API) como irmãos; docs e
planos ficam na raiz. Dentro do frontend, por feature — arquivos que mudam juntos
ficam juntos:

```
frontend/         # app Next.js (pacote próprio: package.json, tsconfig, testes)
  src/
    app/          # rotas (App Router): / (landing pública), login, cadastro,
                  #   recuperar-senha,
                  #   admin (funil+dashboard), admin/equipes/[slug], admin/contas, aluno
    design-system/# tokens.css, tema, cn, componentes-marca, brand/ (logos SVG)
    domain/       # tipos derivados do schema + labels pt-BR
    data/         # cliente da API (api/), consultas, sessão
    features/     # telas por feature (landing, auth, aluno-cadastro, admin-funil,
                  #   admin-detalhe, admin-tarefas, admin-dashboard, admin-contas,
                  #   aluno-tarefas, shell)
  tests/          # Vitest: repository/domain (funções puras) + componentes (RTL)
backend/          # API Node/Express/Prisma (ver plan-backend.md)
docs/             # requisitos (RF/RNF/RN), schema SQL e contas de demonstração
docker-compose.yml# Postgres local
scripts/          # start-all.mjs: sobe API e frontend juntos
plan.md           # plano de implementação (decisões, paleta, tarefas TDD)
```

## Como rodar

O projeto roda só localmente. Precisa de Node 20+ e Docker (para o Postgres).

```bash
# 1. Postgres em localhost:5544 (usuário, senha e banco: infohub)
docker compose up -d

# 2. Variáveis do backend (já apontam para o Postgres acima e ligam o seed de demonstração)
cp backend/.env.example backend/.env

# 3. Dependências
npm --prefix backend install
npm --prefix frontend install

# 4. Migrations e seed (cria o admin e, com SEED_DEMO=true, as contas de demonstração)
npm --prefix backend run db:migrate
npm --prefix backend run seed

# 5. Em dois terminais
npm --prefix backend run dev      # API em http://localhost:3333/api/v1
npm --prefix frontend run dev     # app em http://localhost:3000
```

Abra http://localhost:3000/login. Na tela de login, o bloco **Acesso rápido** tem
um botão por papel (Admin, Mentor, Aluno) que entra com a conta de demonstração
correspondente. Os e-mails e senhas estão em [`docs/logins-demo.md`](docs/logins-demo.md).

Para subir API e frontend juntos num terminal só, a partir da build:

```bash
npm run build   # builda backend e frontend
npm start       # roda migrate, seed e os dois servidores (http://localhost:3000)
```

Testes e tipos:

```bash
npm --prefix backend test && npm --prefix backend run typecheck   # o backend precisa do Postgres no ar
npm --prefix frontend test && (cd frontend && npx tsc --noEmit)
```

Para parar o banco: `docker compose down` (acrescente `-v` para apagar os dados).

### Como as peças se conectam

| Processo | Porta | Observação |
| -------- | ----- | ---------- |
| Express (API) | `localhost:3333` | só local |
| Next.js (front) | `3000` | é o endereço do app |

O Next repassa `/api/*` para o Express (rewrite em `frontend/next.config.mjs`),
então front e API respondem na mesma origem e o browser não precisa de CORS. A
porta interna `3333` é constante em `frontend/next.config.mjs` e em
`scripts/start-all.mjs`: os rewrites do Next são resolvidos no build, e uma
variável de ambiente seria ignorada em runtime.

### Seed

- **Base** (sempre): ciclo 2026/2, modelos de tarefa por etapa e o admin inicial `admin@infohub.dev` / `admin123`.
- **Demo** (`SEED_DEMO=true`): contas `@demo.infohub.dev` — 4 mentores `mentor1..4` / `mentor123` + 13 alunos `<nome.sobrenome>` / `aluno123` (ex.: `bruna.lopes@demo.infohub.dev`), total **17 contas demo**. Cada equipe tem líder + 3 integrantes ativos; a equipe C tem ainda um 5º integrante (Letícia) com convite pendente. Roda uma vez; o link de convite pendente da Letícia sai no log do seed.
- Remover a demo: `npm --prefix backend run seed:demo:purge` (log: `removidas 3 equipes e 17 contas demo`). Para reconstruir o cenário com prazos frescos, rode o purge e o seed de novo.

## Status

Frontend e backend integrados, com dados reais no PostgreSQL. Requisitos levantados, schema do banco escrito e os **5 fluxos centrais** implementados de ponta a ponta:

1. **Login** com guarda de rota por perfil (admin, mentor, aluno) e atalho de acesso rápido com as contas de demonstração.
2. **Cadastro da ideia** — cria a conta do aluno e a equipe na Etapa 1.
3. **Funil** (kanban de 6 etapas + "Pronta p/ InovAMF") com busca e filtros.
4. **Detalhe da equipe** — avançar/retroceder etapa (RN-01 + forçar), criar tarefas e avaliar entregas (aprovar/ajustar).
5. **Área do aluno** — tarefas da equipe e envio de entregas (arquivo ou link), refletindo no painel do admin.

Também cobertos: painel consolidado com indicadores (RF-22), atraso automático de tarefas (RN-04), anotações internas do mentor (RF-10), escopo de visão do mentor (RNF-03), exportação CSV (RF-23), filtro por ciclo (RF-24), gestão de contas admin/mentor com criação/edição/desativação (RF-03), recuperação de senha (RF-01) e múltiplos arquivos/links por entrega (RF-14).

Sobre o visual: identidade própria (tipografia, logo SVG, *ignition rail*), dark/light com tema persistente, animações contidas e correções de acessibilidade a partir de auditoria (Web Interface Guidelines).

**Decisão de produto (RN-03 / Q4):** um aluno pode integrar mais de uma equipe e é adicionado automaticamente pelo líder, sem fluxo de pedido/aceite.

Ficam de fora: upload físico de arquivo, armazenamento seguro de arquivos e backup (RNF-04/07).

Pontos que ainda dependem de decisão da coordenação (Q1–Q7): entre eles se cada integrante terá login próprio e qual serviço de e-mail será usado.

## Fluxo de desenvolvimento

Convenções do time (2 devs) para trabalhar em paralelo sem conflito:

- **Branch base é `staging`** — nunca se dá push direto no `main`. Toda branch sai de `staging` e o PR vai para `staging`.
- **Todo trabalho vira issue** no GitHub (nada fica só local).
- **Antes de começar**, comente na issue quem pegou — sem comentário, a issue é considerada **livre**.
- **Uma branch por issue/feature**; a branch é deletada logo após o merge.
- **Nenhum merge sem aprovação** (na conversa ou no GitHub).
- **Conventional Commits**; TDD na camada de domínio/repositório (teste antes da implementação); `npm test` e `npm run build` verdes antes do PR.
