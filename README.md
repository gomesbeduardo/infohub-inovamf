# InfoHub → InovAMF

Sistema de acompanhamento da jornada do empreendedor no laboratório **InfoHub** da Faculdade Antonio Meneghetti, digitalizando o funil de 6 etapas até o encaminhamento ao centro de inovação **InovAMF**.

Hoje esse acompanhamento é manual — a jornada é guiada por uma cartilha impressa e o contato com os alunos acontece por WhatsApp. O sistema centraliza o cadastro das ideias e equipes, mostra em que etapa cada equipe está, permite atribuir tarefas com prazos, receber os entregáveis e disparar lembretes automáticos por e-mail.

Este repositório é o projeto prático da disciplina de **Arquitetura de Sistemas**, do curso de graduação em Sistemas de Informação. O sistema é construído de forma incremental ao longo da cadeira:

- **Fase 1** — levantamento de requisitos e modelagem do banco de dados.
- **Fase 2 (atual)** — frontend web com dados mockados: Design System próprio, os 5 fluxos centrais + funcionalidades de coordenação (painel, contas, relatórios CSV), dark/light e cobertura de testes (TDD).
- **Fases futuras** — backend/persistência real, e-mails/lembretes e relatórios, conforme a disciplina avançar.

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

Frontend web com **dados mockados em memória** (sem backend/persistência nesta fase), guiado por um Design System próprio da marca *infohub*:

- **Next.js 14** (App Router) + **React 18** + **TypeScript** (strict).
- **Tailwind CSS v3** com cores 100% tokenizadas (CSS variables) e **dark/light**; o tema é **persistente por cookie**, aplicado no SSR (sem flash entre sessões).
- **Dados em memória**: repositório de **funções puras** (`(estado, args) → estado`) + store React (Context/reducer); a sessão é mockada.
- **shadcn/Radix** só para primitivos de acessibilidade (Dialog).
- **Vitest + React Testing Library + jsdom** (TDD na camada de domínio/repositório e componentes críticos).

O scaffold é gerado pelo init oficial do framework (`create-next-app@14`); nenhum arquivo de configuração é escrito à mão.

### Design System

- **Tipografia**: `Space Grotesk` (display) + `Inter` (corpo).
- **Marca**: a lâmpada-rede em **SVG** (`frontend/src/design-system/brand/`) + a assinatura *ignition rail* (o gradiente da marca faísca→forja), reaproveitada em headers e cards.
- **Cores**: extraídas dos logos, declaradas como CSS variables em `frontend/src/design-system/tokens.css` — nenhum hex literal em componente.
- **Movimento**: animações contidas (fade de entrada + cross-fade de tema), sempre respeitando `prefers-reduced-motion`.
- **Acessibilidade**: foco visível tokenizado, `color-scheme` por tema, labels via `FormField`, datas via `Intl`.

### Segurança / dependências

`npm audit` acusa vulnerabilidades cujo fix automático (`npm audit fix --force`) exigiria pular para Next 16 + React 19 + eslint 9 (cascata de majors que foge do plano). A decisão foi **manter o Next 14** por ser um projeto acadêmico que roda **localmente**, porque os avisos não são exploráveis neste contexto:

- **esbuild / vite / vitest / postcss / glob** — tooling de **dev/build**; não vai para o artefato final e não recebe input não-confiável.
- **Next.js** (DoS no Image Optimizer, cache poisoning em RSC, SSRF em rewrites) — só afetam apps **self-hosted em produção** usando esses recursos, que este mock não usa.

Ao evoluir para um deploy real, revisar e atualizar as dependências (incluindo o salto de major do Next) faz parte do hardening.

## Estrutura do repositório

Monorepo: `frontend/` (Next.js) e `api/` (backend, a nascer) como irmãos; docs e
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
    data/         # fixtures (seed), repository (funções puras), store, session
    features/     # telas por feature (landing, auth, aluno-cadastro, admin-funil,
                  #   admin-detalhe, admin-tarefas, admin-dashboard, admin-contas,
                  #   aluno-tarefas, shell)
  tests/          # Vitest: repository/domain (funções puras) + componentes (RTL)
api/              # backend Node/Express/Prisma (ver plan-backend.md)
docs/             # requisitos (RF/RNF/RN) + schema SQL
plan.md           # plano de implementação (decisões, paleta, tarefas TDD)
```

## Como rodar

```bash
cd frontend      # o app é um pacote próprio dentro do monorepo
npm install      # instala as dependências
npm run dev      # sobe o app em http://localhost:3000 (landing pública em /)
npm test         # roda a suíte Vitest (TDD)
npm run build    # build de produção
```

Login mockado do seed: administrador `admin@infohub.dev` / `123456`; aluno `aluno@infohub.dev` / `123456`.

## Status

Frontend mockado funcionando. Requisitos levantados, schema do banco escrito e os **5 fluxos centrais** implementados de ponta a ponta com estado compartilhado em memória:

1. **Login** mockado com guarda de rota por perfil.
2. **Cadastro da ideia** — cria a conta do aluno e a equipe na Etapa 1.
3. **Funil** (kanban de 6 etapas + "Pronta p/ InovAMF") com busca e filtros.
4. **Detalhe da equipe** — avançar/retroceder etapa (RN-01 + forçar), criar tarefas e avaliar entregas (aprovar/ajustar).
5. **Área do aluno** — tarefas da equipe e envio de entregas (arquivo mock ou link), refletindo no painel do admin.

Também cobertos, além dos 5 fluxos, após revisão dos requisitos: painel consolidado com indicadores (RF-22), atraso automático de tarefas (RN-04), anotações internas do mentor (RF-10), escopo de visão do mentor (RNF-03), exportação CSV (RF-23), filtro por ciclo (RF-24), **gestão de contas admin/mentor com criação/edição/desativação (RF-03)**, recuperação de senha simulada (RF-01) e **múltiplos arquivos/links por entrega (RF-14)**.

Sobre o visual: identidade própria (tipografia, logo SVG, *ignition rail*), dark/light com tema persistente, animações contidas e correções de acessibilidade a partir de auditoria (Web Interface Guidelines).

**Decisão de produto (RN-03 / Q4):** um aluno pode integrar mais de uma equipe e é adicionado automaticamente pelo líder, sem fluxo de pedido/aceite.

Fora do escopo desta fase (dependem de backend/infra): e-mails e lembretes (RF-17–21), LGPD (RNF-02), auditoria completa (RNF-05), armazenamento seguro de arquivos e backup (RNF-04/07), upload físico de arquivo.

Pontos que ainda dependem de decisão da coordenação (Q1–Q7): entre eles se cada integrante terá login próprio e qual serviço de e-mail será usado.

## Fluxo de desenvolvimento

Convenções do time (2 devs) para trabalhar em paralelo sem conflito:

- **Branch base é `staging`** — nunca se dá push direto no `main`. Toda branch sai de `staging` e o PR vai para `staging`.
- **Todo trabalho vira issue** no GitHub (nada fica só local).
- **Antes de começar**, comente na issue quem pegou — sem comentário, a issue é considerada **livre**.
- **Uma branch por issue/feature**; a branch é deletada logo após o merge.
- **Nenhum merge sem aprovação** (na conversa ou no GitHub).
- **Conventional Commits**; TDD na camada de domínio/repositório (teste antes da implementação); `npm test` e `npm run build` verdes antes do PR.

## Deploy (Coolify, sem Docker, um resource só)

Front e backend sobem **juntos, num único resource**, com **um comando**:
`npm start` na raiz roda `scripts/start-all.mjs`, que dá spawn nos dois.

No Coolify: **Build Pack = Nixpacks**, **Base Directory = `/`**, **Port = 3000**.
O `nixpacks.toml` da raiz instala e builda os dois workspaces.

Como fica dentro do container:

| Processo | Porta | Exposto |
| -------- | ----- | ------- |
| Express (API) | `127.0.0.1:3333` | não |
| Next.js (front) | `0.0.0.0:$PORT` (3000) | sim, é o domínio do app |

O Next repassa `/api/*` para o Express (rewrite em `frontend/next.config.mjs`),
então **front e API vivem no mesmo domínio** — uma porta pública, sem CORS entre
eles, e o browser nunca fala com a API diretamente.

Duas armadilhas que já custaram tempo:

- A porta interna `3333` é **constante nos dois arquivos**, não env. Os rewrites
  do Next são resolvidos no build e viram `routes-manifest.json`; uma env aqui
  seria lida no build e ignorada em runtime.
- Se qualquer um dos dois processos morrer, o supervisor derruba o outro e sai
  com código ≠ 0, para o Coolify reiniciar o container inteiro. Nada de meia
  aplicação no ar.

As variáveis de ambiente vão todas numa lista só, no resource — ver
[.env.example](.env.example).
