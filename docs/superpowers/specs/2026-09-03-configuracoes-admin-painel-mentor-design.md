# Configurações do admin, painel do mentor e fix do gráfico — design

- **Data:** 2026-09-03
- **Autor:** brainstorming assistido (Claude)
- **Origem:** pedido — "o gráfico do mentor está quebrado (corta na metade); o
  mentor precisa gerir as tarefas das equipes mentoradas; o envio de tarefas
  deve ter tarefas pré-prontas (admin e mentor); e criar uma seção de
  configurações do admin para cursos, áreas, tarefas pré-prontas e afins".

## Contexto

Investigação do estado atual revelou que boa parte do pedido já existe, o que
enxuga o escopo:

1. **O mentor já gere tarefas** — abre uma equipe mentorada pelo funil
   (`/orientador/equipes/[slug]`) e cai na **mesma** tela de detalhe do admin
   (`DetalheEquipe` → aba Tarefas → `NovaTarefaDialog`). O que falta é **acesso
   mais direto no painel** (hoje é equipe por equipe).
2. **Tarefas pré-prontas já existem** — `NovaTarefaDialog` tem os modos "De um
   modelo" (`ModeloTarefa` por etapa) e "Manual". O que falta é o admin poder
   **editar** o catálogo de modelos, hoje fixo no seed.
3. **Cursos são constante fixa** (`src/domain/cursos.ts` → `CURSOS_AMF`),
   enquanto **áreas** e **modelos de tarefa** já são dados no `AppState`.
4. **Não existe seção de Configurações** — o nav do admin tem só Painel,
   Equipes e Contas.

O projeto é **hexagonal**: regra de negócio nova entra no núcleo (`src/domain`,
`src/data/repository.ts`) como **função pura** `(estado, args) → estado`, com
**teste antes** (TDD); a UI (`src/features`, `src/app`) só consome. Cores 100%
tokenizadas. Dados são **mock em memória** (`seed()` + store com `SET_STATE`).

**Persistência:** confirmado com o autor — mock agora, backend depois. Por isso
todo CRUD de configuração entra como função pura sobre `AppState`; trocar para
persistência real no futuro é só o adaptador de dados, sem tocar no núcleo nem
na UI.

## Decisões

- **D1 — Três branches/PRs para `staging`** (AGENTS.md, um por feature):
  `fix/grafico-mentor`, `feat/admin-configuracoes`, `feat/painel-mentor-tarefas`.
- **D2 — Cursos viram dados no estado.** Migrar `CURSOS_AMF` (const) para
  `cursos: Curso[]` (`{ id: number; nome: string }`) no `AppState`, seed a partir
  da constante atual. Consumidores (cadastro, filtros) passam a ler as opções do
  estado. O campo `curso` gravado em aluno/membro continua sendo o **nome**
  (string), como hoje — evita refatorar todas as referências para id.
- **D3 — CRUD como funções puras + TDD**, com validações e guardas de remoção.
- **D4 — Reuso de UI.** A tela de Configurações reusa primitives existentes
  (`Card`, `Input`, `Button`, `Dialog`, `EmptyState`) no padrão do `ContasAdmin`.
  O painel do mentor reusa `equipesVisiveis`, `StatusBadge`, `StageTag`, `Tabs`.
- **D5 — Sem novas permissões de escrita para o mentor.** A criação/edição de
  tarefa continua no detalhe da equipe; o painel só agrega e navega.

## Núcleo (domínio / repositório) — TDD

Todas as funções abaixo são puras, imutáveis e recebem/retornam `AppState`
(ou dados derivados). Teste antes da implementação.

### Cursos (novo em `AppState`)

- Tipo `Curso { id: number; nome: string }` em `src/domain/types.ts`;
  `AppState.cursos: Curso[]`. Seed em `fixtures.ts` a partir de `CURSOS_AMF`.
- `adicionarCurso(state, nome) → AppState`
- `renomearCurso(state, id, nome) → AppState`
- `removerCurso(state, id) → AppState`

### Áreas (já em `AppState.areas`)

- `adicionarArea(state, nome) → AppState`
- `renomearArea(state, id, nome) → AppState`
- `removerArea(state, id) → AppState`

### Modelos de tarefa (já em `AppState.modelosTarefa`)

- `adicionarModelo(state, dados) → AppState`
  (`dados: { etapaId, titulo, descricao?, obrigatoria, prazoPadraoDias }`)
- `editarModelo(state, id, dados) → AppState`
- `removerModelo(state, id) → AppState`

### Validações e guardas

- Nome **não-vazio** (trim) para curso, área e título de modelo.
- **Sem duplicado** de nome (curso/área) — comparação case- e acento-insensível
  (reusar o normalizador já usado em `filtrarEquipes`).
- `prazoPadraoDias` inteiro ≥ 0; `etapaId` deve existir em `state.etapas`.
- **Bloqueio de remoção quando em uso** (retorna estado inalterado + a UI avisa):
  - Área referenciada por alguma `equipe.areaId`.
  - Curso referenciado por algum `aluno.curso` ou `membro.curso`.
  - Modelos podem ser removidos livremente (a `Tarefa` copia o conteúdo do
    modelo no momento da criação; não há FK viva).
- **Rename/remover não faz cascata** em registros já gravados (limitação do
  mock, documentada). No backend futuro isso vira integridade referencial.

### Leituras do painel do mentor

- `pendenciasMentor(state, usuario) → { entregasAAvaliar: Entrega[]; tarefasAtrasadas: Tarefa[] }`
  — escopadas via `equipesVisiveis(state, usuario)`.
- `tarefasDasEquipesMentoradas(state, usuario, filtros?) → Tarefa[]`
  — `filtros?: { equipeId?; etapaId?; status? }`; escopo por `equipesVisiveis`.

### Store

Novas actions envolvendo as funções puras: `adicionarCurso`, `renomearCurso`,
`removerCurso`, `adicionarArea`, `renomearArea`, `removerArea`, `adicionarModelo`,
`editarModelo`, `removerModelo`. As leituras do mentor são chamadas direto do
repositório na UI (sem estado novo).

## Entrega (UI)

### 1. Fix do gráfico do mentor — `LineChart` (`fix/grafico-mentor`)

Reproduzir rodando a app para confirmar a causa antes de corrigir. Hipótese:
pontos (raio 3) e rótulos dos eixos plotados exatamente nas bordas do
`viewBox 640×200`, sem folga interna, e possível `overflow` cortando. Correção:

- Insets internos para nada encostar na borda (topo/base para os círculos de
  raio 3; laterais para o primeiro/último rótulo do eixo X centralizado).
- `overflow: visible` no `<svg>` (ou ampliar o `viewBox`/margens).
- Conferir a altura efetiva do container (o SVG é `h-auto w-full`; garantir que
  nenhum ancestral limite a altura).
- **Verificação visual** obrigatória antes de fechar o PR.

### 2. Configurações do admin — `/admin/configuracoes` (`feat/admin-configuracoes`)

- **Nav:** novo item "Configurações" em `src/features/shell/nav.tsx`
  (`navFor('admin')`), com ícone; rota protegida por `AuthGuard permitido={['admin']}`.
- **Página:** `src/app/admin/configuracoes/page.tsx` → feature em
  `src/features/admin-config/` com três seções/abas:
  - **Cursos** — lista com adicionar/renomear/remover inline.
  - **Áreas** — idem.
  - **Tarefas pré-prontas** — lista de `ModeloTarefa` mostrando título, etapa,
    obrigatória e prazo padrão; adicionar/editar/remover via `Dialog`.
- **Consumidores dos cursos:** onde hoje se lê `CURSO_OPTIONS`/`CURSOS_AMF`
  (form de cadastro e filtros), passar a derivar de `state.cursos`. Manter
  `src/domain/cursos.ts` apenas como fonte do seed inicial.
- Remoção bloqueada por uso mostra um aviso (toast/inline) explicando o motivo.

### 3. Painel do mentor — `PainelOrientador` (`feat/painel-mentor-tarefas`)

Mantém as abas atuais (Visão geral · Funil) e adiciona:

- **Pendências** (na "Visão geral", abaixo do gráfico): duas listas acionáveis —
  *Entregas a avaliar* e *Tarefas atrasadas* das equipes mentoradas (via
  `pendenciasMentor`), cada item linkando para o detalhe da equipe.
- **Nova aba "Tarefas"**: lista **agregada** das tarefas de todas as equipes
  mentoradas (via `tarefasDasEquipesMentoradas`), com filtro por
  equipe/etapa/status; cada linha leva ao detalhe da equipe (onde cria/edita —
  fluxo atual mantido). O botão "Nova tarefa" **não** sobe para o painel.

## Fora de escopo (YAGNI)

- Persistência real (fica para o backend depois).
- Edição de etapas e ciclos (fixos por ora).
- Cascata de rename/remover em registros já gravados.
- Botão de "Nova tarefa" no nível do painel do mentor.
- Reordenação de modelos/áreas/cursos.

## Verificação

- TDD no núcleo: `tests/repository-config.test.ts` (CRUD de curso/área/modelo +
  validações e guardas) e casos para `pendenciasMentor` /
  `tarefasDasEquipesMentoradas`.
- `npm test`, `npm run build` e `npm run lint` verdes antes de cada PR.
- Conferência visual: gráfico do mentor corrigido, tela de Configurações e o
  painel do mentor com Pendências + aba Tarefas.
