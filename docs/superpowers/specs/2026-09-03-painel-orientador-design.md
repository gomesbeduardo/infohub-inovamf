# Painel do mentor + tema padrão do sistema — design

- **Data:** 2026-09-03
- **Autor:** brainstorming assistido (Claude)
- **Origem:** pedido — "transformar a tela do mentor: kanban, gráficos de linha
  e KPIs; e o padrão do tema deve vir por default para o tema do sistema".
- **Entregue em:** PR #64 (tema) e PR #66 (painel do mentor), ambos → `staging`.

## Contexto

A tela do mentor (`/orientador`) era apenas `MinhasEquipes`: três KPIs e uma
grade de cartões de equipe. O pedido pede um painel de acompanhamento (KPIs +
gráfico + funil operável) e que o tema siga o sistema operacional por padrão.

Ao investigar, duas descobertas guiaram o design:

1. **O funil já existia** (`admin-funil/Funil.tsx`): colunas por etapa, com
   escopo por perfil (`equipesVisiveis`). Reaproveitado como base do kanban —
   que, a pedido, mantém o nome **"Funil"**.
2. **O tema "sistema" já existia e estava testado no `main`**, mas nunca voltou
   para `staging` (drift do commit que o empacotou junto a `yarn.lock`, `--turbo`
   e mudanças de schema). Em vez de reescrever, portamos os arquivos do tema.

O projeto é **hexagonal**: regra de negócio nova entra no núcleo (`src/domain`,
`src/data/repository.ts`) como função pura, com **teste antes** (TDD); a UI
(`src/features`, `src/app`) só consome. Cores 100% tokenizadas, sem lib de chart
ou de drag-and-drop.

## Decisões

- **D1 — Empacotamento em dois PRs.** Tema e painel são concerns independentes;
  cada um vira uma branch/PR para `staging` (AGENTS.md).
- **D2 — Tema: portar, não reescrever.** Trazer do `main` `theme.tsx`,
  `ThemeToggle.tsx`, `icons.tsx`, `layout.tsx` e `theme.test.tsx`, excluindo o
  ruído não relacionado. Padrão para novo usuário = `system`.
- **D3 — Gráfico em SVG puro tokenizado.** Nenhuma dependência nova; consistente
  com as barras do dashboard do admin.
- **D4 — Kanban com HTML5 DnD nativo.** Sem lib. O caminho acessível por teclado
  permanece nos botões Avançar/Retroceder do detalhe da equipe.
- **D5 — Nova regra de domínio `moverEquipeParaEtapa`** para o arraste (movimento
  que pode saltar etapas), em vez de repetir `avancar/retroceder` ±1.
- **D6 — Layout em abas** (`Tabs`): "Visão geral" e "Funil".
- **D7 — Dashboards clicáveis** (admin e mentor): KPIs e elementos do gráfico/
  distribuição levam ao funil relevante.

## Núcleo (domínio / repositório) — TDD

### `moverEquipeParaEtapa(state, equipeId, opts)`

`opts: { destino: number | 'pronta'; autorId; forcar?; observacao? }` → `AppState`
(imutável).

- Avançar (`destino > atual`) com **obrigatória pendente** na etapa atual exige
  `forcar` (RN-01); sem forçar, retorna o estado inalterado.
- Salto de mais de uma etapa é sempre gravado como `forcado`.
- Retroceder reativa a equipe (`status: 'ativa'`, limpa `prontaInovamfEm`).
- `destino: 'pronta'` marca `pronta_inovamf`; mover uma equipe pronta de volta a
  uma etapa a reativa. Mesma etapa (e já ativa) e equipe inexistente são no-op.
- Registra um `HistoricoEtapa` (origem → destino, `forcado`, `movidoPor`).

### `serieSemanalMentor(state, usuario, hoje, semanas = 8)`

Retorna `PontoSerieSemanal[]` (`{ semanaInicio, rotulo, avancos, entregas }`),
da semana mais antiga para a corrente, em janelas de 7 dias terminando em `hoje`:

- **avancos**: entradas de `historico` das equipes visíveis com
  `etapaDestinoId > etapaOrigemId`, por semana.
- **entregas**: tarefas das equipes visíveis com `concluidaEm` na semana.

Escopo via `equipesVisiveis(state, usuario)` (mentor vê só as suas). Função pura
e determinística (recebe `hoje`, não lê o relógio) — testável.

### Store

Nova action `mover(equipeId, opts)` → `moverEquipeParaEtapa`.

## Entrega (UI)

### `PainelOrientador` (`/orientador`)

`Tabs` controlado:

- **Visão geral**: quatro `StatCard` clicáveis (Equipes mentoradas · Entregas a
  avaliar · Tarefas atrasadas · Prontas p/ InovAMF) que trocam para a aba Funil;
  `LineChart` com duas séries (Avanços de etapa `--primary`, Entregas concluídas
  `--accent`) das últimas 8 semanas.
- **Funil**: `FunilKanban`.

### `FunilKanban`

Colunas por etapa (1..6) + "Pronta p/ InovAMF", escopadas ao mentor. Cards
`draggable`; soltar em uma coluna chama `mover`. Avanço com obrigatória pendente
abre `window.confirm` (mover forçado?). Feedback visual de coluna-alvo. O nome da
equipe é um link para o detalhe (arraste ≠ clique).

### Componentes de design system

- `StatCard`: props opcionais `href` (vira `Link`) e `onClick` (vira `button`).
- `Tabs`: modo **controlado** via `active` + `onChange` (retrocompatível).
- `LineChart`: SVG puro, `viewBox` responsivo, grade + eixos, legenda,
  `role="img"` + `aria-label`. Escala uniforme (sem distorcer texto).

### Dashboard do admin clicável (`DashboardIndicadores`)

KPIs viram links (`/admin/equipes`, `/admin?status=atrasada`, `/admin#col-pronta`)
e cada barra de distribuição por etapa aponta para a âncora da coluna do funil
(`/admin#col-etapa-N`). O `Funil` do admin lê `?status=` ao montar para pré-filtrar
e expõe `id="col-<key>"` com `scroll-mt` nas colunas.

## Tema padrão = sistema (PR #64)

Portado do `main`: preferência `light | dark | system`, resolução no SSR por
cookie + script inline anti-flash, acompanhamento de `prefers-color-scheme` em
tempo real quando a preferência é `system`, e toggle ciclando Claro → Escuro →
Sistema (`MonitorIcon`). Novo usuário (sem cookie) segue o SO.

## Fora de escopo (YAGNI)

Sem lib de charts, sem lib de DnD, sem reordenar cartões dentro da coluna, sem
persistência (segue mock em memória).

## Verificação

- Núcleo com teste antes da implementação: `tests/repository-orientador.test.ts`
  (14 casos) cobrindo `moverEquipeParaEtapa` e `serieSemanalMentor`.
- `npm test` verde (102), `npm run build` verde, `npm run lint` limpo.
- Pendente: conferência visual manual (sem tooling de screenshot no projeto).
