# Handoff: polimento de UI e acessibilidade (pausado)

> **Estado:** pausado em 24/09, antes da apresentação do G1. Retomar só se passarmos na seleção.
> Antes de codar, siga a seção "Handoff" do `AGENTS.md`: ler, explicar de volta, planejar e esperar o OK.

## Onde está cada coisa

| Branch (remota) | Conteúdo | Estado |
|---|---|---|
| `fix/ui-polimento-1` | Plano `docs/superpowers/plans/2026-09-24-polimento-ui-apresentacao.md` e a etapa 1 (quebrados e celular) | WIP, **não testado** |
| `fix/ui-polimento-2` | Etapa 2 (cor e hierarquia) | WIP inicial, **não testado** |
| `fix/ui-polimento-3` | Etapa 3 (interação e formulários) | WIP, **não testado** |
| `fix/a11y-estrutura-foco`, `fix/a11y-dados-funil-landing` | Primeira tentativa de acessibilidade, substituída pelas branches acima | Só referência (ex.: tabela acessível do `LineChart`) |

Todas partem de `feat/pilulas-cor-por-area` (PR #194). Se o #194 já estiver em `staging`, faça rebase das branches sobre `staging`.

## Decisões aprovadas pelo usuário (24/09)

- **D1.** O fundo do botão primário com texto vira `ember-600` (novo token `--primary-solido`). `--primary` continua sendo a brasa da marca.
- **D2.** O botão ghost fica neutro. O vermelho fica só para link principal ou ação destrutiva, e "Desativar" usa `--danger-text`.
- **D3b.** No escuro, a correção mínima: `--surface-sunken` mais escuro que `--bg`, e itens aninhados em `--surface-raised`. A paleta morna nova (D3a) fica para depois.
- **D4.** Um `StageTag` só, inclusive na landing. O ponto no kanban fica.
- **D5** (tag de etapa sólida no escuro): em aberto.
- **Mobile-first** em todo layout novo.
- **Escopo enxuto:** priorizar P1 e os P2 visíveis; deixar os P3 de fora.

## Como validar

- **Testes:** no `frontend/`, rodar `npx vitest run`, `npm run lint`, `npx tsc --noEmit` e `npm run build`.
- **Scan axe-core nos dois temas:** com a API rodando com dados de demo (`SEED_DEMO=true`), num schema local separado. A meta é zero `color-contrast`.
- **Largura no celular:** a 390px, `scrollWidth - innerWidth === 0` em /admin, /orientador, /admin/contas e /admin/equipes/[slug].

---

## 1. Placar (impeccable audit)

| # | Dimensão | Nota | Principal achado |
|---|---|---|---|
| 1 | Acessibilidade | **2/4** | Foco pouco visível (2,3:1), kanban só por arrasto, gráfico só por hover |
| 2 | Performance | **3/4** | Filtros `blur` em camadas grandes e `transition-all`; nada grave |
| 3 | Responsivo | **2/4** | 4 páginas estouram a largura no celular; gráfico de barras ilegível no celular |
| 4 | Tema e tokens | **2/4** | Classes com `/opacidade` sobre `var()` **não geram CSS** (cabeçalhos transparentes); no escuro a escada de superfícies está invertida |
| 5 | Integridade da implementação | **3/4** | Sistema coerente, com deriva: 8 raios, 2 sistemas de pílula, a etapa aparece de 4 jeitos |
| | **Total** | **12/20** | **Aceitável.** Base boa, com trabalho relevante |

**Veredito de integridade: passa, com ressalvas.**
- O produto tem identidade própria: brasa/ember, papel morno, jornada de etapas.
- Os tokens estão em camadas (primitivos → semânticos), com valor para o escuro.
- A deriva está nos detalhes: receitas de card, raios, pílulas de status e de etapa, e uso do vermelho da marca como cor de ação genérica.

**Contagem:** 16 P1 · 22 P2 · 16 P3.

**Os 5 que mais importam**

1. **Cabeçalhos transparentes.** As classes `bg-surface/90` e `bg-[color:var(--bg)]/95` não geram CSS, então o conteúdo passa por trás do cabeçalho do app e da landing (P1-01).
2. **4 páginas estouram no celular:** /admin, /orientador, /admin/contas e detalhe da equipe (P1-02).
3. **O vermelho não significa mais nada.**
   - Onde aparece: indicadores neutros e de perigo idênticos, botões ghost vermelhos, "Desativar" igual a "Editar", "Etapa atual" em vermelho.
   - Consequência: o alerta real (atrasada) perde força (P1-11, P1-12, P2-22).
4. **Acessibilidade de interação:**
   - Contorno de foco a 2,3:1.
   - Mover equipe no kanban só por arrasto.
   - Valores do gráfico só por hover (P1-04, P1-07, P1-08).
5. **Escuro sem profundidade.** `--surface-sunken` é mais claro que `--bg` e os cards aninhados somem (P1-16).

---

## 2. P1: quebrado, ou viola WCAG AA

### P1-01. Classes de cor com `/opacidade` não geram CSS
- **Onde:**
  - `features/shell/AppShell.tsx:69` e `:90`: `bg-surface/90` no cabeçalho e no nav do app.
  - `features/landing/LandingHeader.tsx:32`: `bg-[color:var(--bg)]/95`.
  - `features/funil/FunilBoard.tsx:175`: `ring-primary/40`, o destaque da coluna ao arrastar.
  - `design-system/components/StageProgress.tsx:45`: `bg-primary/40`, a linha entre etapas concluídas.
- **Evidência:**
  - Cabeçalho da landing depois de rolar: `background-color: rgba(0,0,0,0)`, medido no navegador.
  - O Tailwind compilado não contém essas classes.
- **Impacto:**
  - O conteúdo e a foto do campus passam visíveis atrás do logo e dos botões.
  - Ao arrastar, a coluna de destino não acende.
  - Na barra de progresso falta o conector entre etapas concluídas.
- **Causa:** as cores são `var(--x)`. O Tailwind 3 não consegue aplicar opacidade nelas e descarta a classe em silêncio.
- **Correção:** criar tokens prontos, como `--surface-vidro: color-mix(in srgb, var(--surface) 90%, transparent)`, ou declarar as cores no config como `rgb(var(--x-rgb) / <alpha-value>)`.
- **Comando:** `/impeccable harden`

### P1-02. Páginas mais largas que a tela no celular (390px)
| Página | Estouro | Causa | Correção |
|---|---|---|---|
| /admin e /orientador | 105px | `features/agenda/Agenda.tsx:303` e `:319`: `grid lg:grid-cols-2` sem coluna abaixo de `lg`. O `truncate` do título (`:160`) define a largura mínima | `grid-cols-1 lg:grid-cols-2`, ou `min-w-0` no Card (`:140`) |
| /admin/contas | 48px | `features/admin-contas/ContasAdmin.tsx:290`: linha de ações `flex` sem `flex-wrap`. E-mail longo sem quebra (`:283`) | `flex-wrap`; `break-all` no e-mail |
| /admin/equipes/[slug] | 8px | `design-system/components/Tabs.tsx:174`: 5 abas em `flex` sem rolagem | `overflow-x-auto` na lista; `shrink-0 whitespace-nowrap` nas abas |

Ligado a isso: no celular as abas quebram em 3 linhas ("Linha do tempo") e 2 linhas ("Visão geral"), em `Tabs.tsx:32,40`.

### P1-03. Texto do gráfico "Distribuição por etapa" escala junto com o SVG
- **Onde:** `features/admin-dashboard/DistribuicaoPorEtapa.tsx:18, 88-91, 108, 125, 146`
- **Impacto:**
  - Os rótulos têm `11px` num viewBox fixo de 720 esticado para a largura do card.
  - No desktop viram cerca de **18px**, maiores que o título do card, e a hierarquia se inverte.
  - No celular caem para cerca de **5px** e não dá para ler.
- **Correção:** barras em HTML/CSS grid e só o preenchimento em SVG, ou rótulos fora do SVG escalado.
- **Comando:** `/impeccable adapt`

### P1-04. Contorno de foco com contraste de 2,3:1
- **Onde:** `design-system/tokens.css:115` (claro) e `:194` (escuro): `--focus-ring` é um `color-mix` translúcido.
- **Números:** 2,35:1 no branco e 2,2:1 no fundo claro; 2,75 a 2,95:1 no escuro.
- **Impacto:**
  - Quem usa teclado quase não vê onde está.
  - Afeta botões, navegação, menus e abas.
  - Os inputs se salvam porque também trocam a borda.
- **WCAG:** 1.4.11 e 2.4.7.
- **Correção:** anel sólido, `ember-600` no claro e `ember-400` no escuro.

### P1-05. Borda dos campos quase invisível
- **Onde:** `Input`, `Select` e `Textarea` usam `border-border`.
- **Números:** claro `#dcdcdc` sobre branco = 1,37:1 (1,28:1 sobre o fundo creme); escuro `#333` sobre `#1f1f1f` = 1,30:1.
- **Impacto:** o limite do campo não é perceptível para quem tem baixa visão.
- **WCAG:** 1.4.11 (limite de componente ≥ 3:1).
- **Correção:** token `--border-campo` a ≥3:1 só para campos (claro ≈ `#8f8f8f`, escuro ≈ `#6b6b6b`). A borda de cards pode ficar sutil, porque cards não são controles.

### P1-06. Botão primário a 4,33:1 (decisão pendente, ver §5)
- **Onde:** `design-system/components/Button.tsx:9`. Também no contador do sino (`features/shell/SinoNotificacoes.tsx:109`).
- **WCAG:** 1.4.3. É o único texto que o axe ainda acusa.
- **Correção:** o preenchimento do botão vai para `ember-600` (`#c32915`, 5,76:1). A cor da marca continua em ícones, bordas e destaques.

### P1-07. Kanban: mover para qualquer coluna só arrastando
- **Onde:** `features/funil/FunilBoard.tsx:241-261`.
- **Impacto:**
  - A alternativa por teclado (`features/admin-detalhe/AvancarEtapa.tsx:57-68`) só anda ±1 etapa e fica em outra página.
  - O texto da coluna vazia e o `title` do card só falam em arrastar.
- **WCAG:** 2.5.7 e 2.1.1.
- **Correção:** botão discreto "Mover para…" no card, que abre a lista de colunas e reaproveita o `DialogoMover`.

### P1-08. Gráfico de linha (painel da mentora) inacessível e confuso
- **Onde:** `design-system/components/LineChart.tsx:148-156, 167-168, 238-239, 273-282`.
- **Impacto:**
  - Os valores só aparecem no hover do mouse, e os retângulos não recebem foco.
  - Não há tabela, então teclado e leitor de tela ficam sem os números.
  - Visualmente: `--series-2` e `--series-4` são tons vizinhos do vermelho da marca.
  - Os preenchimentos de área empilhados a 18% viram uma mancha oliva.
  - 3 das 4 séries ficam em 0 e são cobertas pela amarela.
- **WCAG:** 1.1.1 e 2.1.1.
- **Correção:**
  - "Ver tabela", como o `DistribuicaoPorEtapa` já faz.
  - Sem área quando houver mais de uma série.
  - `--series-4` violeta (`#a78bfa` no escuro).
- **Comando:** `/impeccable colorize` para as séries.

### P1-09. Números brancos sobre laranja nas etapas
- **Onde:** `features/landing/JornadaOnda.tsx:142, 177` e `design-system/components/StageProgress.tsx:~57`.
- **Números:** branco sobre `--stage-1/2/3` = 2,3 / 2,9 / 3,6:1.
- **WCAG:** 1.4.3.
- **Correção:** usar `--stage-N-tag` (já existe e passa em AA), ou texto escuro `#1a0f05`.

### P1-10. Abas fora do padrão ARIA
- **Onde:** `design-system/components/Tabs.tsx:32-51`.
- **Problemas:**
  - Sem `id` ou `aria-controls`.
  - O painel não tem `aria-labelledby` nem `tabIndex=0`.
  - Sem setas, Home ou End.
- **WCAG:** 1.3.1 e 4.1.2.
- **Correção:** padrão APG de abas (ou Radix Tabs), mantendo a API do componente.

### P1-11. Indicadores: "neutro" e "perigo" são iguais
- **Onde:**
  - `design-system/components/StatCard.tsx:9-10`: no claro, `--primary-soft` e `--danger-soft` são ambos `--ember-50`; no escuro, 14% contra 20% de ember.
  - `features/orientador/PainelOrientador.tsx:75` contra `features/admin-dashboard/DashboardIndicadores.tsx:67`: regras de tom diferentes entre os painéis.
- **Impacto:**
  - "Equipes ativas" e "Tarefas atrasadas" ganham o mesmo quadrado vermelho, e o alarme real se perde.
  - A mentora vê "Prontas p/ InovAMF = 0" com check vermelho; o admin vê sempre verde.
- **Correção:**
  - Neutro com `--chip-bg` e ícone `--text-muted`; vermelho só para perigo.
  - A mesma regra de tom nos dois painéis.

### P1-12. /admin/contas: hierarquia de ações
- **Onde:**
  - `design-system/components/Button.tsx:12`: o ghost é `text-primary-text`.
  - `features/admin-contas/ContasAdmin.tsx:234`: filtros.
  - `ContasAdmin.tsx:278`: 18 cards.
  - `ContasAdmin.tsx:293-306`: ações.
- **Impacto:**
  - A tela fica "alarmante", com ~36 links vermelhos.
  - "Desativar" (destrutivo) tem o mesmo peso de "Editar".
  - Os filtros por papel parecem links.
  - O status "Inativa" também sai em vermelho.
- **Correção:**
  - Ghost neutro (`text-text-muted hover:text-text`).
  - "Desativar" em `--danger-text`, ou num menu de mais ações com confirmação.
  - Lista em tabela dividida, como `EquipesList`.
- **Comando:** `/impeccable distill`

### P1-13. Tarefa já entregue continua com "Enviar entrega" em destaque
- **Onde:** `features/aluno-tarefas/MinhasTarefas.tsx:163`: `entregavel = status !== 'aprovada'`.
- **Impacto:**
  - Uma tarefa "Entregue", em "Concluídas", mostra o botão primário vermelho.
  - Ficam dois primários na página, um deles numa ação sobre item concluído.
- **Correção:** o primário só aparece em pendente, em andamento e ajustar. Para "entregue", usar o secundário "Enviar nova versão".

### P1-14. Formulários: erros e dicas que não chegam ao campo
- **`features/aluno-tarefas/EnviarEntregaDialog.tsx:115-138`**
  - Problema: o `FormField` envolve uma `div` (input + botão), então `aria-invalid` e `aria-describedby` vão para a div. A dica "Precisa começar com https://" e o erro não chegam ao input.
  - Também: um `role="tablist"` falso em `:104-111`.
- **`design-system/components/FormField.tsx:39-44`**
  - Problema: o `cloneElement` sobrescreve o `aria-describedby` que o filho já tinha e não injeta `id`. Sem `htmlFor`, o label fica desassociado.
- **`features/admin-detalhe/GestaoEquipe.tsx:56-82`**
  - Problema: o select salva a cada `onChange` e se desativa. Uma seta no select fechado dispara um PATCH e o foco se perde.
  - WCAG: 3.2.2 e 2.4.3.
- **`features/aluno-cadastro/CadastroForm.tsx:225-267`**
  - Problema: os erros das linhas de colega não estão ligados aos campos, e só o primeiro aparece.
- **`autocomplete` ausente (1.3.5):**
  - `features/auth/AceitarConviteForm.tsx:151,154` (`new-password`) e `:161` (`tel`).
  - `CadastroForm.tsx:154` e `features/conta/ContaPerfil.tsx:154` (`name`).
- **Regra "mínimo 8 caracteres" só aparece depois do erro:** `AceitarConviteForm.tsx:150` e `CadastroForm.tsx:159` (3.3.2).
- **`features/admin-tarefas/NovaTarefaDialog.tsx`**
  - O botão fica desativado sem dizer o que falta (`:180`).
  - O alternador "De um modelo/Manual" não tem `aria-pressed` (`:95-108`).
  - O `placeholder` de data nunca aparece, porque navegador não mostra placeholder em `type=date` (`:157-161`).
  - Enter não envia, porque não é `<form>`.
- **Comando:** `/impeccable harden`

### P1-15. Foco perdido quando o conteúdo troca
- **Onde:**
  - `features/admin-tarefas/AvaliarEntrega.tsx:63-70`: "Solicitar ajustes" some e o textarea surge sem foco.
  - `features/auth/RedefinirSenhaForm.tsx:47-61`: o sucesso não é anunciado.
  - `CadastroForm.tsx:126-133`: a troca para `LinksConvite` não é anunciada.
  - `features/equipe/AdicionarMembroDialog.tsx:75` e `ContasAdmin.tsx:337`: o botão focado desmonta.
  - `features/orientador/PainelOrientador.tsx:62-76`: os indicadores trocam de aba e desmontam.
  - Landing: `features/landing/JornadaOnda.tsx:193` recebe foco estando com `opacity:0` (`app/globals.css:447-452`).
- **WCAG:** 2.4.3, 2.4.7 e 4.1.3.

### P1-16. Escuro: escada de superfícies invertida e cards aninhados somem
- **Onde:**
  - `design-system/tokens.css:175-178`: `--bg #141110`, `--surface #1f1f1f`, `--surface-sunken #171717`, `--surface-raised #262626`.
  - Card do kanban: `features/funil/FunilBoard.tsx:29` (`CARTAO_KANBAN`).
- **Impacto:**
  - O "rebaixado" é mais claro que o fundo.
  - O "elevado" só é usado em tooltip.
  - Itens `bg-surface` dentro de cards `bg-surface` (agenda, linha do tempo, kanban) se separam só por uma linha de 1,3:1.
  - As superfícies são cinza neutro sobre uma página morna.
- **Correção (proposta):** bg `#121010` → sunken `#0f0d0c` → surface `#1c1917` → raised `#27221f`, com itens aninhados e cards do kanban em `--surface-raised`.
- **Comando:** `/impeccable colorize`, ou `polish` com os tokens do escuro.

---

## 3. P2: menor, mas visível

| ID | Achado | Onde | Correção |
|---|---|---|---|
| P2-01 | **A etapa aparece de 4 jeitos:** tag sólida (tabela, detalhe, aluno), chip com ponto (kanban), Badge cinza "Etapa 3" (landing) e "Pronta p/ InovAMF" suave no hero mas sólida no carrossel | `features/funil/FunilBoard.tsx:270`, `features/landing/Landing.tsx:136,138`, `features/landing/HeroTransformacao.tsx:115` | Um `StageTag` só, com variantes de tamanho. O ponto no kanban foi escolha sua e fica |
| P2-02 | **Tag de etapa sólida no escuro fica "barrenta"** (`#a76516` e `#b95a19` sobre quase-preto). É `rounded-md` enquanto as outras pílulas são `rounded-full`. Quebra em 2 linhas na tabela do celular | `design-system/components/StageTag.tsx:38`, `design-system/tokens.css:85-89` (sem override no escuro) | Override no escuro com a receita tingida do #194 (fundo 18%, borda 55%, texto claro); `rounded-full`; `whitespace-nowrap` |
| P2-03 | **Segundo sistema de pílulas:** o `StatusBadge` (Pendente/Aprovada/Entregue) não tem borda, e "Entregue" é a pílula mais apagada no escuro (≈4,7:1) | `design-system/components/StatusBadge.tsx:6-11`, `tokens.css:219-224` | Migrar para os tons do `Badge`, com borda |
| P2-04 | **Telas de erro sem saída:** 403 oferece "Tentar de novo", que não resolve; "Convite inválido" não tem saída nem h1 | `features/admin-detalhe/DetalheEquipe.tsx:39-53`, `features/auth/AceitarConviteForm.tsx:28-40` | `EmptyState` com explicação e "Voltar" / "Ir para o login" |
| P2-05 | **Larguras de página diferentes:** painel e equipes em largura total; contas, detalhe e minha equipe em `max-w-4xl`; tarefas em `max-w-2xl` (a coluna pula de 848 para 624px). A mentora não tem barra de navegação | `features/shell/AppShell.tsx:20-23, :58` | Duas larguras no máximo; nav também para a mentora |
| P2-06 | **"Forçar avanço" é o elemento mais alto da página:** é quase o vermelho do primário, com cor fixa `bg-ember-600`, e "Enviar lembrete" fica empilhado com outra largura | `design-system/components/Button.tsx:13`, `features/admin-detalhe/AvancarEtapa.tsx:60`, `DetalheEquipe.tsx:118-123` | Secundário com ícone de aviso (perigo suave); as duas ações na mesma linha; variante `danger` usando `--danger` e `--danger-fg` |
| P2-07 | **Indicadores um por linha no celular:** 4 cards de ~90px empurram o gráfico para fora da primeira tela | `features/admin-dashboard/DashboardIndicadores.tsx:57`, `PainelOrientador.tsx:61` | `grid-cols-2` na base |
| P2-08 | **Tabela de equipes cortada no celular** sem indicação (Status, Mentor e Atrasadas somem) | `features/admin-equipes/EquipesList.tsx:65-66` (`min-w-[720px]`) | Lista de cards abaixo de `sm`, ou fade na borda |
| P2-09 | **A base do logo some no escuro** (`#4C1327`/`#631727` sobre `#141110` ≈ 1,4:1) | `design-system/brand/mark.svg` | Variante do logo para o escuro, com a base clareada (~`#b8323a`) |
| P2-10 | **Falta "Pular para o conteúdo"**; landing e telas de login sem `<main>` | `AppShell.tsx:66-126`, `features/landing/Landing.tsx:205`, `features/auth/AuthLayout.tsx:18` | Skip link e `<main id="conteudo">` |
| P2-11 | **Títulos pulam de h1 para h3:** /admin, /orientador, detalhe, tarefas, gestão. Visualmente h2 e h3 são iguais (`text-sm font-semibold`). O título da página varia entre `text-xl` e `text-2xl` | `DistribuicaoPorEtapa.tsx:66`, `features/agenda/Agenda.tsx:53,148`, `PainelOrientador.tsx:83`, `DetalheEquipe.tsx:70,91`, `features/admin-tarefas/TarefaList.tsx:21`, `GestaoEquipe.tsx:51`, `design-system/components/PageHeader.tsx:25` contra `DetalheEquipe.tsx:104` | h2 nas seções; escala visual própria para h2 |
| P2-12 | **Scroll de foco para baixo do cabeçalho:** `scroll-padding-top: 4rem` foi dimensionado para a landing, mas o app tem ~98px | `app/globals.css:283` | `html:has([data-app-shell]) { scroll-padding-top: 7rem }` |
| P2-13 | **Toast fecha em 4 s** sem pausar no hover ou foco; se o foco estiver no ✕, cai no `body` | `design-system/components/Toast.tsx:53,80-86` | Pausar no hover e no foco |
| P2-14 | **Menus de perfil e notificações continuam abertos** quando o foco sai; `aria-controls` aponta para um id inexistente | `features/shell/PerfilMenu.tsx:31-47,76`, `SinoNotificacoes.tsx:100` | Fechar no `focusout` |
| P2-15 | **Botões repetidos sem contexto:** "Editar", "Desativar", "Novo link", "Gerar link", "Remover" | `ContasAdmin.tsx:296-317`, `MinhasTarefas.tsx:222,227`, `AvaliarEntrega.tsx:60-70`, `features/equipe/MembrosLista.tsx:79`, `CadastroForm.tsx:248`, `EnviarEntregaDialog.tsx:148` | `aria-label` "Editar {nome}", mantendo o texto visível no início |
| P2-16 | **`StageProgress`: concluída ou pendente só por cor** e ícone oculto | `StageProgress.tsx:40-64` | Texto `sr-only` e `aria-current="step"` |
| P2-17 | **Link envolvendo botão** (interativos aninhados) | `features/aluno-equipe/MinhaEquipe.tsx:74-76` | Estilizar o Link como botão |
| P2-18 | **Contagem de resultados filtrados não é anunciada** (funil, equipes, contas); colunas do kanban sem nome | `FunilBoard.tsx:158-183`, `EquipesList.tsx:41-45`, `ContasAdmin.tsx:243-247` | `role="status"`; `aria-labelledby` na coluna |
| P2-19 | **O `aria-label` do card da agenda apaga o conteúdo** (etapa, pendências) para o leitor de tela | `Agenda.tsx:157` | Remover o `aria-label` |
| P2-20 | **Alvos de toque abaixo de 44px em ações principais no celular:** `Button sm` = 32px (34 usos: "Nova conta", "Exportar CSV", ações de linha) e ícones do cabeçalho com 36px | `Button.tsx`, `features/shell/BuscaRapida.tsx:40`, `SinoNotificacoes.tsx:102`, `design-system/components/ThemeToggle.tsx:35` | `h-10 sm:h-8`, ou área de toque ampliada. Nada fica abaixo de 24px, então passa no 2.5.8 |
| P2-21 | **Revelar senha só por segurar:** leitor de tela e voz mandam só `click` | `design-system/components/PasswordInput.tsx:72-78` | Alternar também no clique (`aria-pressed`) |
| P2-22 | **Vermelho em coisas que não são ação nem erro:** "Etapa atual" e o próximo passo | `StageProgress.tsx:76`, `features/aluno-equipe/ProximoPasso.tsx:17` | Cor do texto (ou muted) com ícone |

---

## 4. P3: acabamento

- **Sombras no escuro não aparecem.**
  - `--shadow-sm rgba(0,0,0,.4)` é invisível (`tokens.css:309-310`). Trocar por um brilho no topo: `inset 0 1px 0 rgba(255,255,255,.04)`.
  - O Dialog usa `shadow-lg` do Tailwind, sem token (`primitives/Dialog.tsx:30`).
- **Raios.**
  - São **8 raios diferentes**. O de 10px (`rounded-[0.625rem]`) aparece **47×** e não é token.
  - `rounded-[1.25rem]` aparece fixo no código, mas é igual a `rounded-lg`: `Card.tsx:8`, `EquipesList.tsx:65`, `MinhaEquipe.tsx:160`.
  - A coluna do funil tem 16px e os cards dentro dela 20px, ou seja, raio interno maior que o externo.
- **Cards dentro de cards:** agenda (`Agenda.tsx:36,140`) e linha do tempo (`features/equipe/LinhaDoTempo.tsx:74`, `MinhaEquipe.tsx:205-210`). Melhor como linhas divididas.
- **Landing: faixas cinza-frias** `bg-surface-sunken` quebram o fundo morno (`Landing.tsx:296,338`).
- **Landing: etapas da jornada no desktop.** Cada etapa ocupa quase uma tela vazia, e "Pular para os casos" aparece nas 5.
- **Landing: dois grids de recursos seguidos,** um com ícone solto e outro com ícone em quadrado (`Landing.tsx:255` e `:272`). Unir.
- **Landing: metadado do card de caso.** Sobra um "·" pendurado no fim da linha e os cursos saem cortados como "Administra…" (`Landing.tsx:144-152`). Pôr os cursos em linha própria.
- **Botão de tema** é o único ícone com caixa no cabeçalho (`ThemeToggle.tsx:34`).
- **Texto antigo:** a dica do cadastro ainda diz "mesmo que ainda cru" (`CadastroForm.tsx:284`), expressão que o #191 já trocou na landing.
- **Tokens sem uso:** `--grad-wine`, `--accent`, `--text-inverted`, `--danger-fg`, `--success-fg`, `--brand-gradient`, `.ignition-rail`.
- **Tokens duplicados:**
  - `#166534` aparece 3×, `#92400e` 3×.
  - Pares quase iguais: `#e6f5ec` e `#dcfce7`; `#fef3c7` e `#fef3e2`.
  - `--grad-ember` é igual a `--ember-500`.
- **Classes arbitrárias repetidas:**
  - `ring-[color:var(--focus-ring)]` (24×) e as cores de chip, aviso e info (~20×) deveriam ir para o config do Tailwind.
  - `text-[color:var(--primary-fg)]` aparece 3×, mas `text-primary-fg` já existe.
  - `text-white` fixo em `StageTag.tsx:38` e `StageProgress.tsx:91`.
- **Escala tipográfica:**
  - **16 tamanhos diferentes**, 7 deles arbitrários (5 com 12px ou menos: `[11px]`, `[10px]`, `[0.7rem]`, `[0.65rem]`).
  - A escala de espaçamento está limpa: nenhum `p-[..]` ou `gap-[..]` arbitrário.
- **Performance:**
  - `filter: blur(12px)` numa camada de brilho da seção inteira que repinta a cada movimento do mouse (`globals.css:82`).
  - Os pontos do carrossel animam `width` com `transition-all` (`CarrosselCasos.tsx:167`) e há transição de `filter: blur` (`:15-16`, `:124`).
  - `transition-all` também em `FunilBoard.tsx:29` e `StatCard.tsx:51,61`.
  - O título do hero anima blur (`globals.css:372`), o que atrasa a pintura do texto principal.
- **Dialog:**
  - Sem descrição, repete o título em `sr-only`, então o leitor lê duas vezes (`primitives/Dialog.tsx:39`).
  - Não tem botão ✕ visível.
- **Busca Ctrl+K:** não anuncia "N resultados" (`BuscaRapida.tsx:121`).
- **Carrossel:** falta `inert` nos slides escondidos (`CarrosselCasos.tsx:118`). Hoje eles não têm nada focável, então é prevenção.
- **Números da landing:** o `<dt>` `sr-only` repete o rótulo visível (`NumerosVitrine.tsx:367,389`).
- **Carregamentos:** vários "Carregando…" sem `role="status"` (`AceitarConviteForm.tsx:71`, `ContaPerfil.tsx:78`, `AnotacoesInternas.tsx:58`, `TarefaList.tsx:81`, `EquipesList.tsx:58`, `DialogoMover.tsx:130`).

---

## 5. Decisões que são suas

| # | Decisão | Opções | Minha recomendação |
|---|---|---|---|
| D1 | Botão primário a 4,33:1 | (a) fundo `ember-600` só nos botões com texto; (b) manter e registrar a exceção | **(a).** A diferença visual é pequena, e o vermelho da marca segue em ícones e destaques |
| D2 | Botão ghost vermelho em todo o sistema | (a) ghost neutro, vermelho só em link principal ou destrutivo; (b) manter | **(a).** Resolve contas, filtros e o "tudo parece alerta" |
| D3 | Escada de superfícies do escuro | (a) paleta morna nova (§P1-16); (b) só corrigir a inversão do sunken e usar raised nos aninhados | **(b) primeiro.** Menor risco perto da defesa; (a) depois |
| D4 | Etapa com um visual só | (a) `StageTag` único com variantes, incluindo a landing; (b) manter as variações | **(a)**, mantendo o ponto no kanban como você escolheu |
| D5 | Tag de etapa sólida no escuro | (a) receita tingida do #194; (b) manter sólida, mas com a cor cheia e texto escuro | Depende do visual. Posso mostrar os dois num artifact antes |

---

## 6. O que está bom (manter)

**Movimento**
- Todas as animações respeitam `prefers-reduced-motion`: hero, jornada, carrossel, scroll suave, skeleton e troca de tema.

**Carrossel**
- Tem botão de pausa.
- Para sozinho no hover, no foco, fora da tela e com a aba oculta.
- Os slides têm nome ("i de N"), e as setas também.

**Modais e busca**
- O Radix prende o foco, fecha com Esc e devolve o foco.
- A busca Ctrl+K funciona pelo teclado e é lida corretamente por leitores de tela (`aria-activedescendant`, setas, Enter).

**Semântica**
- Idioma em `lang="pt-BR"`.
- Landmarks `header`, `nav` e `main` no app, com `aria-current` na navegação.
- Ícones com `aria-hidden`.
- Todos os botões só com ícone têm nome.
- Erros com `role="alert"`, toast com `role="status"` e skeleton com "Carregando…" para leitor de tela.

**Pílulas do #194**
- Estão coerentes, acesas no escuro e sem depender só de cor.
- O axe não acusa mais nenhuma falha de texto além do botão primário.

**Identidade visual**
- O fundo de papel morno com cards brancos funciona bem no claro.
- O brilho de brasa no hero e nas telas de login funciona no escuro.
- O stepper do aluno deixa a etapa atual óbvia, inclusive no celular.

**Código**
- Tokens em camadas, com valor para o escuro.
- Imagens sempre via `next/image`.
- O efeito spotlight não re-renderiza o React.
- Nenhum espaçamento arbitrário.
- O nav e o kanban rolam dentro do próprio container, corretamente.

---

## 7. Proposta de etapas (para o plano, depois da sua aprovação)

A ordem prioriza o que aparece na demo e o que está quebrado. Cada etapa vira 1 PR para `staging`.

1. **Quebrados e responsivo:**
   - P1-01 (opacidade), P1-02 (overflow), P1-03 (gráfico de barras), P1-13 (enviar entrega).
   - Abas no celular, P2-07 e P2-08.
2. **Cor e hierarquia:** conforme D1 a D5.
   - P1-04, P1-05, P1-06, P1-09, P1-11, P1-12, P1-16.
   - P2-01, P2-02, P2-03, P2-06, P2-09, P2-22.
3. **Acessibilidade de interação:**
   - P1-07 (kanban), P1-08 (gráfico de linha), P1-10 (abas), P1-15 (foco).
   - P2-10 a P2-19 e P2-21.
4. **Formulários:** P1-14 e o que restar de formulário.
5. **Acabamento:** P3 selecionados (raios, cards aninhados, landing, texto antigo, performance).

Depois de cada etapa: testes, lint e build, mais o scan axe e as capturas de novo (os scripts já existem).

---

