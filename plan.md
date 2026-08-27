# Frontend InfoHub → InovAMF — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar tarefa a tarefa. Os passos usam checkbox (`- [ ]`) para tracking.

**Goal:** Entregar o frontend web do InfoHub → InovAMF com dados mockados, guiado por um Design System próprio (marca *infohub*), com 5 fluxos que funcionam de ponta a ponta e cobertura de testes (TDD).

**Architecture:** Next.js (App Router) + React + TypeScript. Uma camada de dados **mockada em memória** (repositório de funções puras + store React Context/reducer) alimenta todas as telas, de modo que uma ação numa tela (ex.: aluno envia entrega) reflete em outra (admin avalia). O visual sai de um Design System híbrido: tokens e componentes-marca próprios, `shadcn/ui` só para primitivos de acessibilidade. Proteção de rota via `middleware.ts` + checagem em layout (guards padrão do Next).

**Tech Stack:** Next.js (App Router), React, TypeScript, Tailwind CSS + CSS variables (tokens), shadcn/ui (Radix) para Dialog/Select/Tooltip/DropdownMenu, `next/font` (Poppins), Vitest + React Testing Library + jsdom.

**Referências:** `docs/superpowers/specs/2026-08-26-frontend-infohub-design.md` (spec), `docs/Infohub_InovAMF_Requisitos.md` (RF/RNF/RN/Q), `docs/sql/infohub_schema.sql` (entidades).

---

## Global Constraints

- **Node** ≥ 20, **Next.js** ≥ 14 (App Router), **React** 18+, **TypeScript** strict (`strict: true`).
- **Sem backend / sem persistência**: todo estado vive em memória na sessão do browser. Login é **mockado**.
- **Cores só via tokens**: nenhum hex literal em componente ou classe. Toda cor referencia uma CSS variable (§3) através do Tailwind. Um hex hardcoded em componente é falha de revisão.
- **Dark e light mode** são requisito, não opcional: todo token semântico tem valor nos dois temas.
- **Idioma**: identificadores de código em inglês; texto de UI em português (pt-BR).
- **TDD**: camada de domínio/repositório é escrita test-first, com alta cobertura. Componentes críticos têm testes RTL seletivos.
- **Mobile-first** na área do aluno (RNF-01); admin pode ser desktop-first.
- **Status de tarefa** (schema): `pendente | em_andamento | entregue | atrasada | aprovada | ajustar`.
- **Status de equipe** (schema): `ativa | pronta_inovamf | encaminhada_inovamf | pausada | desistente`.
- Commits frequentes, um por tarefa concluída (Conventional Commits).

---

## Decisões (registro para o revisor)

| # | Decisão | Racional |
| --- | --- | --- |
| D1 | **Fluxos funcionais com mocks** (não telas estáticas) | Objetivo da entrega: caminhos que funcionam de ponta a ponta com estado real. |
| D2 | **5 fluxos**: login, cadastro da ideia, funil+detalhe (admin), tarefas+avaliação (admin), tarefas+entrega (aluno) | Cobrem o núcleo do funil InfoHub→InovAMF (RF-01,02,04,05,06,07,08,09,11,12,13,14,15). |
| D3 | **Login mockado** (e-mail+senha contra usuários fixos), sem auth real | RF-01 demonstrável sem backend. "Esqueci a senha" é stub visual. |
| D4 | **Design System híbrido** | Tokens + componentes-marca próprios (autoria do DS); shadcn/ui só para primitivos chatos (Dialog/Select/Tooltip/DropdownMenu). |
| D5 | **Cores 100% tokenizadas**, extraídas dos logos, com light+dark | Pedido explícito; garante consistência e troca de tema. Ver §3. |
| D6 | **Funil = gradiente da marca**: as 6 etapas usam os stops laranja→vermelho→bordô do logo | Amarra o produto à identidade visual (lâmpada-rede). |
| D7 | **Dados em memória**: repositório de funções puras + store Context/reducer | Funções puras são ideais para TDD; store compartilha estado entre telas. |
| D8 | **Guards/hooks padrão do Next**: `middleware.ts` + checagem em layout; `useRouter`/`usePathname` | Proteção de rota simples sobre a sessão mockada. |
| D9 | **graphify como tooling de dev** (não runtime) | Indexa a codebase num grafo (`graphify-out/graph.json`) para busca/navegação rápida durante o desenvolvimento. Ver §5. |
| D10 | **Fora de escopo hoje**: auth real, e-mails/lembretes (RF-17–21), relatórios/exportação (RF-22–24), upload físico de arquivo, LGPD/auditoria | Foco em profundidade nos 5 fluxos. Entrega por arquivo mocka só o nome; por link é real. |
| D11 | **Ordem de corte** se o tempo apertar | DS+tokens → dados → login → cadastro → funil → detalhe/tarefas → aluno. Base compartilhada primeiro. |

---

## 1. Escopo e fora de escopo

**Dentro:** os 5 fluxos de D2, o Design System (tokens + componentes), a camada de dados mockada, dark/light mode, testes.

**Fora (v1 de hoje):** autenticação real / backend / persistência; e-mails e lembretes (RF-17–21); relatórios e exportação CSV/Excel (RF-22–24); upload físico de arquivo (mocka nome/metadados; link é real); LGPD (RNF-02), auditoria (RNF-05), recuperação de senha real (stub).

---

## 2. Estrutura de arquivos

Cada arquivo tem uma responsabilidade. Arquivos que mudam juntos ficam juntos (por feature, não por camada técnica).

```
plan.md                          # este plano
package.json  tsconfig.json  next.config.mjs  vitest.config.ts  vitest.setup.ts
tailwind.config.ts  postcss.config.mjs
src/
  app/
    layout.tsx                   # RootLayout: fontes, <ThemeProvider>, <StoreProvider>
    globals.css                  # @import tokens.css + Tailwind layers
    page.tsx                     # redireciona p/ /login
    login/page.tsx               # Fluxo 1
    cadastro/page.tsx            # Fluxo 2
    admin/layout.tsx             # guard admin/mentor
    admin/page.tsx               # Fluxo 3 (funil)
    admin/equipes/[slug]/page.tsx# Fluxo 3/4 (detalhe + tarefas)
    aluno/layout.tsx             # guard aluno
    aluno/page.tsx               # Fluxo 5
  middleware.ts                  # guard de rota (redireciona sem sessão)
  design-system/
    tokens.css                   # §3 — TODAS as cores (primitivas + semânticas light/dark)
    theme.ts                     # ThemeProvider + useTheme (light/dark/toggle)
    Logo.tsx                     # logo infohub (mono e cor)
    cn.ts                        # helper clsx/tailwind-merge
    components/
      Button.tsx  Badge.tsx  Card.tsx  Input.tsx  Textarea.tsx
      Select.tsx  FormField.tsx  Avatar.tsx  EmptyState.tsx
      PageHeader.tsx  Tabs.tsx  ThemeToggle.tsx  StatusBadge.tsx  StageTag.tsx
      primitives/                # wrappers shadcn tematizados
        Dialog.tsx  DropdownMenu.tsx  Tooltip.tsx
  domain/
    types.ts                     # tipos derivados do schema
    labels.ts                    # rótulos pt-BR de status/etapa/estágio
  data/
    fixtures.ts                  # estado inicial (seed)
    repository.ts                # funções puras (o núcleo TDD)
    store.tsx                    # Context + useReducer sobre o repositório
    session.ts                   # usuário atual mockado (sessionStorage)
  features/
    aluno-cadastro/CadastroForm.tsx
    admin-funil/Funil.tsx  admin-funil/EquipeCard.tsx  admin-funil/FiltrosBar.tsx
    admin-detalhe/DetalheEquipe.tsx  admin-detalhe/HistoricoEtapas.tsx  admin-detalhe/AvancarEtapa.tsx
    admin-tarefas/TarefaList.tsx  admin-tarefas/NovaTarefaDialog.tsx  admin-tarefas/AvaliarEntrega.tsx
    aluno-tarefas/MinhasTarefas.tsx  aluno-tarefas/EnviarEntregaDialog.tsx
tests/
  repository.test.ts  domain.test.ts
  components/*.test.tsx
```

---

## 3. Sistema de cores tokenizado (extraído dos logos)

As cores foram **amostradas dos PNGs do Design System**. Duas famílias de marca (vermelho *ember* e cinza *hub*) + o gradiente da lâmpada-rede (laranja→vermelho→bordô). Tudo declarado como CSS variables em `src/design-system/tokens.css`; o Tailwind mapeia para essas variables (§Task 3). **Nenhum componente usa hex literal.**

### 3.1 Primitivas (raw palette — independente de tema)

Valores medidos: vermelho da marca `#E6321E`; cinza do wordmark `≈#505050`; stops do gradiente `#F7951B → #F4761E → #F04C21 → #E6321E → #C01818 → #921E26 → #711927`.

```css
:root {
  /* ── Ember (vermelho da marca) ── base 500 = #E6321E medido ── */
  --ember-50:  #FDECE9;
  --ember-100: #FBD5CF;
  --ember-200: #F6AEA1;
  --ember-300: #F08571;
  --ember-400: #EC5B43;
  --ember-500: #E6321E;  /* PRIMÁRIA da marca */
  --ember-600: #C32915;
  --ember-700: #9C2011;
  --ember-800: #75180D;
  --ember-900: #4E1008;

  /* ── Hub (cinza da marca) ── 700 = #4A4A4A (wordmark ~#505050) ── */
  --hub-50:  #F7F7F7;
  --hub-100: #EDEDED;
  --hub-200: #DCDCDC;
  --hub-300: #BEBEBE;
  --hub-400: #969696;
  --hub-500: #6E6E6E;
  --hub-600: #565656;
  --hub-700: #4A4A4A;  /* cinza da marca */
  --hub-800: #333333;
  --hub-900: #1F1F1F;
  --hub-950: #121212;

  /* ── Gradiente da lâmpada-rede (stops medidos, topo→base) ── */
  --grad-orange:  #F7951B;
  --grad-amber:   #F4761E;
  --grad-flame:   #F04C21;
  --grad-ember:   #E6321E;
  --grad-crimson: #C01818;
  --grad-maroon:  #921E26;
  --grad-wine:    #711927;
  --brand-gradient: linear-gradient(160deg,
      var(--grad-orange) 0%, var(--grad-flame) 42%,
      var(--grad-ember) 62%, var(--grad-maroon) 100%);

  /* ── Status (funcional) — bases claras/escuras em 3.3 ── */
  --blue-500:   #2563EB; --blue-400:   #60A5FA;  /* em_andamento */
  --indigo-500: #4F46E5; --indigo-400: #818CF8;  /* entregue */
  --amber-600:  #D97706; --amber-400:  #FBBF24;  /* atrasada */
  --green-600:  #16A34A; --green-400:  #4ADE80;  /* aprovada / pronta */
}
```

### 3.2 Semânticas — LIGHT (default) e DARK

Componentes consomem **apenas** estas. Light no `:root`; dark em `[data-theme="dark"]` (o `ThemeProvider` seta `data-theme` no `<html>`).

```css
:root, [data-theme="light"] {
  --bg:              var(--hub-50);      /* fundo da página */
  --surface:         #FFFFFF;            /* cards, painéis */
  --surface-raised:  #FFFFFF;            /* + sombra */
  --surface-sunken:  var(--hub-100);     /* inputs, colunas do funil */
  --border:          var(--hub-200);
  --border-strong:   var(--hub-300);
  --text:            var(--hub-900);
  --text-muted:      var(--hub-500);
  --text-subtle:     var(--hub-400);
  --text-inverted:   #FFFFFF;

  --primary:         var(--ember-500);   /* fills, botões */
  --primary-hover:   var(--ember-600);
  --primary-active:  var(--ember-700);
  --primary-fg:      #FFFFFF;            /* texto sobre primária */
  --primary-text:    var(--ember-600);   /* primária como texto/link (contraste AA) */
  --primary-soft:    var(--ember-50);    /* fundo suave */

  --accent:          var(--grad-orange);
  --focus-ring:      color-mix(in srgb, var(--ember-500) 55%, transparent);
  --overlay:         rgba(31,31,31,0.50);
}

[data-theme="dark"] {
  --bg:              var(--hub-950);      /* combina com o logo em fundo preto */
  --surface:         var(--hub-900);
  --surface-raised:  #262626;
  --surface-sunken:  #171717;
  --border:          var(--hub-800);
  --border-strong:   #454545;
  --text:            #F2F2F2;
  --text-muted:      var(--hub-400);
  --text-subtle:     var(--hub-500);
  --text-inverted:   var(--hub-950);

  --primary:         var(--ember-500);
  --primary-hover:   var(--ember-400);
  --primary-active:  var(--ember-300);
  --primary-fg:      #FFFFFF;
  --primary-text:    var(--ember-400);   /* mais claro p/ contraste no escuro */
  --primary-soft:    color-mix(in srgb, var(--ember-500) 18%, var(--hub-900));

  --accent:          var(--grad-orange);
  --focus-ring:      color-mix(in srgb, var(--ember-400) 65%, transparent);
  --overlay:         rgba(0,0,0,0.60);
}
```

### 3.3 Status de tarefa (par bg-soft + fg, por tema)

Usados pelo `StatusBadge`. `pendente` neutro; `ajustar` = vermelho da marca.

```css
:root, [data-theme="light"] {
  --st-pendente-fg: var(--hub-600);   --st-pendente-bg: var(--hub-100);
  --st-andamento-fg:var(--blue-500);  --st-andamento-bg:#E8F0FE;
  --st-entregue-fg: var(--indigo-500);--st-entregue-bg: #ECEBFB;
  --st-atrasada-fg: var(--amber-600); --st-atrasada-bg: #FEF3E2;
  --st-aprovada-fg: var(--green-600); --st-aprovada-bg: #E6F5EC;
  --st-ajustar-fg:  var(--ember-600); --st-ajustar-bg:  var(--ember-50);
}
[data-theme="dark"] {
  --st-pendente-fg: var(--hub-300);   --st-pendente-bg: var(--hub-800);
  --st-andamento-fg:var(--blue-400);  --st-andamento-bg:color-mix(in srgb,var(--blue-500) 22%,var(--hub-900));
  --st-entregue-fg: var(--indigo-400);--st-entregue-bg: color-mix(in srgb,var(--indigo-500) 22%,var(--hub-900));
  --st-atrasada-fg: var(--amber-400); --st-atrasada-bg: color-mix(in srgb,var(--amber-600) 24%,var(--hub-900));
  --st-aprovada-fg: var(--green-400); --st-aprovada-bg: color-mix(in srgb,var(--green-600) 24%,var(--hub-900));
  --st-ajustar-fg:  var(--ember-400); --st-ajustar-bg:  color-mix(in srgb,var(--ember-500) 22%,var(--hub-900));
}
```

### 3.4 Etapas do funil (D6 — o gradiente da marca)

As 6 etapas percorrem o gradiente laranja→bordô; "Pronta p/ InovAMF" é verde (conclusão). Iguais nos dois temas (cores de marca); o texto sobre elas é `--text-inverted`/branco.

```css
:root {
  --stage-1: var(--grad-orange);
  --stage-2: var(--grad-amber);
  --stage-3: var(--grad-flame);
  --stage-4: var(--grad-ember);
  --stage-5: var(--grad-crimson);
  --stage-6: var(--grad-maroon);
  --stage-pronta: var(--green-600);
}
```

### 3.5 Contraste (AA) — notas para o revisor

- `--primary` (#E6321E) com texto branco: usar em **fills** (botões, badges). Como **texto** sobre fundo claro, usar `--primary-text` (ember-600) para atingir AA.
- No dark, `--primary-text` = ember-400 (#EC5B43) sobre `--bg` (#121212) passa AA para texto normal.
- Status `atrasada` no light usa amber-600 (#D97706) como fg (AA em texto pequeno sobre bg-soft).

---

## 4. Setup do Design System no Tailwind

O `tailwind.config.ts` referencia as variables (não redefine cores):

```ts
// trecho de theme.extend.colors
colors: {
  bg: 'var(--bg)', surface: 'var(--surface)', 'surface-sunken': 'var(--surface-sunken)',
  border: 'var(--border)', text: 'var(--text)', 'text-muted': 'var(--text-muted)',
  primary: { DEFAULT: 'var(--primary)', hover: 'var(--primary-hover)', fg: 'var(--primary-fg)', text: 'var(--primary-text)', soft: 'var(--primary-soft)' },
  accent: 'var(--accent)',
  ember: { 50:'var(--ember-50)', /* … */ 900:'var(--ember-900)' },
  hub: { 50:'var(--hub-50)', /* … */ 950:'var(--hub-950)' },
}
```

`darkMode: ['selector', '[data-theme="dark"]']`. Fonte via `next/font` (Poppins) exposta como `--font-poppins`.

---

## 5. Tooling de dev — graphify (D9)

graphify já está instalado (`~/.local/bin/graphify`, v0.9.50). Serve para **buscar/navegar** a codebase como grafo durante o desenvolvimento — não é dependência do app e **não entra no `package.json`**.

Setup (uma vez, no início):

```bash
graphify install --platform claude   # instala a skill no config do Claude Code
graphify update src                  # extrai o grafo de src/ -> graphify-out/graph.json (sem LLM)
```

Uso durante o dev:

```bash
graphify update src                  # re-extrai após mudanças estruturais
graphify explain "repository"        # explica um nó e seus vizinhos
graphify path "CadastroForm" "repository"  # caminho mais curto entre dois nós
graphify watch src                   # (opcional) rebuild contínuo
```

Adicionar `graphify-out/` ao `.gitignore`.

---

## 6. Domínio e dados (contratos)

Assinaturas que as tarefas seguintes consomem. **O repositório é de funções puras** `(estado, args) -> estado|resultado` — nunca muta o argumento.

```ts
// src/domain/types.ts
export type TipoUsuario = 'admin' | 'mentor' | 'aluno';
export type EstagioIdeia = 'ideia' | 'prototipo' | 'mvp_desenvolvimento' | 'mvp_pronto';
export type StatusTarefa = 'pendente' | 'em_andamento' | 'entregue' | 'atrasada' | 'aprovada' | 'ajustar';
export type StatusEquipe = 'ativa' | 'pronta_inovamf' | 'encaminhada_inovamf' | 'pausada' | 'desistente';
export type PapelMembro = 'lider' | 'integrante';
export type TipoArquivo = 'arquivo' | 'link';
export type ResultadoAvaliacao = 'aprovada' | 'ajustar';

export interface Usuario { id: string; nome: string; email: string; senha: string; telefone: string; tipo: TipoUsuario; ativo: boolean; }
export interface AlunoInfo { usuarioId: string; curso: string; semestre: string; }
export interface Area { id: number; nome: string; }
export interface Etapa { id: number; numero: number; nome: string; entregavel: string; }
export interface Ciclo { id: number; nome: string; }
export interface EquipeMembro { usuarioId: string; nome: string; curso: string; papel: PapelMembro; ativo: boolean; }
export interface Equipe {
  id: string; nomeIdeia: string; slug: string; descricaoIdeia: string;
  areaId: number; estagioIdeia: EstagioIdeia; origemDivulgacao?: string;
  mentorId?: string; cicloId: number; etapaAtualId: number; status: StatusEquipe;
  membros: EquipeMembro[]; prontaInovamfEm?: string; criadoEm: string;
}
export interface HistoricoEtapa { id: string; equipeId: string; etapaOrigemId?: number; etapaDestinoId: number; movidoPor?: string; forcado: boolean; observacao?: string; criadoEm: string; }
export interface AnotacaoInterna { id: string; equipeId: string; etapaId?: number; autorId: string; conteudo: string; criadoEm: string; }
export interface ModeloTarefa { id: number; etapaId: number; titulo: string; descricao?: string; obrigatoria: boolean; prazoPadraoDias: number; }
export interface Tarefa { id: string; equipeId: string; etapaId: number; titulo: string; descricao?: string; obrigatoria: boolean; dataEntrega: string; status: StatusTarefa; criadoPor?: string; concluidaEm?: string; }
export interface ArquivoEntrega { id: string; tipo: TipoArquivo; nomeOriginal?: string; urlExterna?: string; }
export interface Entrega { id: string; tarefaId: string; versao: number; enviadoPor: string; comentario?: string; arquivos: ArquivoEntrega[]; criadoEm: string; }
export interface AvaliacaoEntrega { id: string; entregaId: string; avaliadorId: string; resultado: ResultadoAvaliacao; comentario?: string; criadoEm: string; }

export interface AppState {
  usuarios: Usuario[]; alunos: AlunoInfo[]; areas: Area[]; etapas: Etapa[]; ciclos: Ciclo[];
  equipes: Equipe[]; historico: HistoricoEtapa[]; anotacoes: AnotacaoInterna[];
  modelosTarefa: ModeloTarefa[]; tarefas: Tarefa[]; entregas: Entrega[]; avaliacoes: AvaliacaoEntrega[];
}
```

Assinaturas do repositório (`src/data/repository.ts`) que as tarefas produzem/consomem:

```ts
export function autenticar(s: AppState, email: string, senha: string): Usuario | null;
export interface DadosCadastro { nome: string; email: string; senha: string; telefone: string; curso: string; semestre: string;
  integrantes: { nome: string; curso: string }[]; nomeIdeia: string; descricaoIdeia: string; areaId: number; estagioIdeia: EstagioIdeia; origemDivulgacao?: string; }
export function validarCadastro(d: Partial<DadosCadastro>): Record<string, string>;      // {} = válido
export function criarEquipeDoFormulario(s: AppState, d: DadosCadastro): { estado: AppState; equipe: Equipe; usuario: Usuario };
export interface FiltrosFunil { busca?: string; curso?: string; areaId?: number; mentorId?: string; statusTarefa?: StatusTarefa; }
export function filtrarEquipes(s: AppState, f: FiltrosFunil): Equipe[];
export function tarefasObrigatoriasPendentes(s: AppState, equipeId: string, etapaId: number): Tarefa[];
export function avancarEtapa(s: AppState, equipeId: string, opts: { forcar: boolean; autorId: string; observacao?: string }): AppState;
export function retrocederEtapa(s: AppState, equipeId: string, opts: { autorId: string; observacao?: string }): AppState;
export function criarTarefa(s: AppState, equipeId: string, dados: { titulo: string; descricao?: string; etapaId: number; dataEntrega: string; obrigatoria: boolean; criadoPor: string } | { modeloId: number; dataEntrega: string; criadoPor: string }): AppState;
export function enviarEntrega(s: AppState, tarefaId: string, dados: { enviadoPor: string; arquivos: ArquivoEntrega[]; comentario?: string }): AppState;
export function avaliarEntrega(s: AppState, entregaId: string, dados: { resultado: ResultadoAvaliacao; comentario?: string; avaliadorId: string }): AppState;
export function calcularStatusAtraso(s: AppState, hoje: string): AppState;
```

---

## 7. Tarefas

> Ordem = ordem de corte (D11). Cada tarefa termina com deliverable testável e um commit. Testes primeiro nas tarefas de domínio/repositório.

### Task 1: Scaffold do projeto + Tailwind + Vitest

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `vitest.setup.ts`, `.gitignore`
- Create: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`

**Interfaces:**
- Produces: projeto Next roda (`npm run dev`); `npm test` roda Vitest; `src/app/page.tsx` redireciona para `/login`.

- [ ] **Step 1:** `npx create-next-app@latest . --ts --app --tailwind --eslint --src-dir --no-import-alias` (aceitar defaults). Depois `npm i -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom` e `npm i clsx tailwind-merge`.
- [ ] **Step 2:** Criar `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, setupFiles: ['./vitest.setup.ts'] },
  resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
});
```

- [ ] **Step 3:** `vitest.setup.ts`: `import '@testing-library/jest-dom';`. Adicionar em `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.
- [ ] **Step 4:** Escrever teste-fumaça `tests/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
describe('setup', () => { it('roda', () => { expect(1 + 1).toBe(2); }); });
```

- [ ] **Step 5:** Rodar `npm test` → PASS. Rodar `npm run build` → sucesso. Adicionar `graphify-out/` ao `.gitignore`.
- [ ] **Step 6:** Commit: `git commit -m "chore: scaffold next+ts+tailwind+vitest"`.

---

### Task 2: Tokens do Design System (cores light/dark)

**Files:**
- Create: `src/design-system/tokens.css`
- Modify: `src/app/globals.css` (importar tokens), `tailwind.config.ts` (mapear variables), `src/design-system/cn.ts`

**Interfaces:**
- Produces: CSS variables de §3 disponíveis; classes Tailwind `bg-bg`, `text-text`, `bg-primary`, etc.; `cn()` helper.

- [ ] **Step 1:** Criar `src/design-system/tokens.css` colando **integralmente** os blocos §3.1, §3.2, §3.3, §3.4.
- [ ] **Step 2:** `src/design-system/cn.ts`:

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...i: ClassValue[]) { return twMerge(clsx(i)); }
```

- [ ] **Step 3:** Em `globals.css`, no topo: `@import '../design-system/tokens.css';` (antes das diretivas Tailwind). Setar `body { background: var(--bg); color: var(--text); }`.
- [ ] **Step 4:** `tailwind.config.ts`: `darkMode: ['selector', '[data-theme="dark"]']` e `theme.extend.colors` conforme §4 (mapear bg, surface, surface-sunken, border, text, text-muted, primary.*, accent, ember.*, hub.*). Adicionar `backgroundImage: { 'brand-gradient': 'var(--brand-gradient)' }`.
- [ ] **Step 5:** Teste visual manual: numa page temporária, um `<div className="bg-primary text-primary-fg">` aparece vermelho. Alternar `data-theme="dark"` no `<html>` via devtools muda o fundo. (Sem teste automatizado — é CSS.)
- [ ] **Step 6:** Commit: `git commit -m "feat(ds): tokens de cor light/dark extraídos dos logos"`.

---

### Task 3: ThemeProvider + ThemeToggle

**Files:**
- Create: `src/design-system/theme.ts`, `src/design-system/components/ThemeToggle.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: tokens (Task 2).
- Produces: `ThemeProvider`, `useTheme(): { theme, toggle }`; seta `data-theme` no `<html>`; persiste em `localStorage`.

- [ ] **Step 1:** Teste `tests/components/theme.test.tsx`: renderizar `ThemeProvider` + botão do `ThemeToggle`; clicar; esperar `document.documentElement.getAttribute('data-theme')` alternar entre `light`/`dark`.
- [ ] **Step 2:** Rodar → FAIL (não existe).
- [ ] **Step 3:** Implementar `theme.ts` (Context com estado `'light'|'dark'`, efeito que seta `document.documentElement.dataset.theme` e grava em `localStorage`; hydration-safe: default `'light'`), e `ThemeToggle` (botão que chama `toggle`, ícone sol/lua textual).
- [ ] **Step 4:** Envolver o app com `ThemeProvider` em `layout.tsx`; carregar Poppins via `next/font` e expor `--font-poppins`.
- [ ] **Step 5:** Rodar → PASS.
- [ ] **Step 6:** Commit: `git commit -m "feat(ds): theme provider + toggle light/dark"`.

---

### Task 4: Componentes-marca base (Button, Card, Badge, Input, FormField, Logo)

**Files:**
- Create: `src/design-system/components/{Button,Card,Badge,Input,Textarea,Select,FormField,Avatar,EmptyState,PageHeader}.tsx`, `src/design-system/Logo.tsx`

**Interfaces:**
- Consumes: `cn` (Task 2).
- Produces (assinaturas que features consomem):
  - `Button({ variant?: 'primary'|'secondary'|'ghost'|'danger'; size?: 'sm'|'md'|'lg' } & ButtonHTMLAttributes)`
  - `Badge({ tone?: 'neutral'|'brand'; children })`
  - `Card`, `Card.Header`, `Card.Body` (ou props simples)
  - `Input(InputHTMLAttributes)`, `Textarea`, `Select({ options: {value,label}[] } & …)`
  - `FormField({ label, error?, hint?, htmlFor, children })`
  - `Logo({ variant?: 'color'|'mono'; withTagline?: boolean })`

- [ ] **Step 1:** Teste `tests/components/button.test.tsx`: `render(<Button>Enviar</Button>)` → há botão com texto; `variant="primary"` aplica classe `bg-primary`; `disabled` desabilita.
- [ ] **Step 2:** Rodar → FAIL.
- [ ] **Step 3:** Implementar `Button` (mapa de variantes usando classes tokenizadas: primary=`bg-primary text-primary-fg hover:bg-primary-hover`, secondary=`bg-surface border border-border text-text`, ghost=`text-primary-text hover:bg-primary-soft`, danger=`bg-ember-600 text-white`; foco: `focus-visible:ring-2 ring-[color:var(--focus-ring)]`).
- [ ] **Step 4:** Rodar teste do Button → PASS. Implementar os demais componentes (sem teste unitário próprio além de render, exceto FormField no passo 5) seguindo o mesmo padrão tokenizado. `Logo`: wordmark "info" (cor `--text`) + "hub" (cor `--primary-text`) em Poppins bold, com opção `withTagline`.
- [ ] **Step 5:** Teste `tests/components/formfield.test.tsx`: `FormField` com `error="Obrigatório"` mostra a mensagem e associa `aria-describedby`. Implementar até passar.
- [ ] **Step 6:** Commit: `git commit -m "feat(ds): componentes base (button, card, badge, input, formfield, logo)"`.

---

### Task 5: StatusBadge + StageTag + labels pt-BR

**Files:**
- Create: `src/domain/labels.ts`, `src/design-system/components/StatusBadge.tsx`, `src/design-system/components/StageTag.tsx`

**Interfaces:**
- Consumes: tipos (Task 6 fornece; se Task 6 ainda não feita, definir tipos mínimos aqui e reconciliar). *Nota de ordem:* fazer Task 6 antes desta se possível; senão importar tipos de `@/domain/types`.
- Produces:
  - `labels.ts`: `STATUS_TAREFA_LABEL: Record<StatusTarefa,string>`, `ESTAGIO_LABEL`, `ETAPA_NOME[]`.
  - `StatusBadge({ status: StatusTarefa })` → usa `--st-<status>-fg/bg`.
  - `StageTag({ etapaId: number; children? })` → fundo `--stage-N`, texto branco.

- [ ] **Step 1:** Teste `tests/components/statusbadge.test.tsx`: `render(<StatusBadge status="atrasada" />)` mostra "Atrasada" e tem `style`/classe ligada a `--st-atrasada-bg`.
- [ ] **Step 2:** Rodar → FAIL.
- [ ] **Step 3:** Implementar `labels.ts` (mapa completo dos 6 status → rótulos pt-BR: Pendente, Em andamento, Entregue, Atrasada, Aprovada, Ajustar) e `StatusBadge` (aplica `style={{ color:'var(--st-..-fg)', background:'var(--st-..-bg)' }}` via mapa por status).
- [ ] **Step 4:** Rodar → PASS. Implementar `StageTag` (fundo `var(--stage-${id})`).
- [ ] **Step 5:** Commit: `git commit -m "feat(ds): status badge, stage tag e labels pt-BR"`.

---

### Task 6: Tipos de domínio + fixtures (seed)

**Files:**
- Create: `src/domain/types.ts`, `src/data/fixtures.ts`

**Interfaces:**
- Produces: todos os tipos de §6; `seed(): AppState` com dados iniciais.

- [ ] **Step 1:** Criar `src/domain/types.ts` colando §6 (tipos + `AppState`).
- [ ] **Step 2:** Teste `tests/domain.test.ts`: `const s = seed();` → `s.etapas.length === 6`; existe ≥1 admin, ≥1 mentor, ≥2 alunos; `s.equipes.length >= 6`; ao menos uma equipe com `status==='pronta_inovamf'`; ao menos uma tarefa `atrasada` e uma `entregue` com avaliação.
- [ ] **Step 3:** Rodar → FAIL.
- [ ] **Step 4:** Implementar `fixtures.ts`: `seed()` retornando `AppState` completo — 6 etapas (nomes da §3 do requisitos), 4 áreas (Educação, Saúde, Tecnologia, Sustentabilidade), 1 ciclo ("2026/2"), usuários (admin `admin@infohub.dev`/`123456`, mentor, 2 alunos), 6–8 equipes distribuídas nas etapas com membros, modelos de tarefa por etapa, tarefas em vários status, ≥1 entrega + avaliação. IDs fixos (strings estáveis, sem `Math.random`).
- [ ] **Step 5:** Rodar → PASS.
- [ ] **Step 6:** Commit: `git commit -m "feat(data): tipos de domínio e fixtures seed"`.

---

### Task 7: Repositório — autenticar + validar/criar cadastro

**Files:**
- Create: `src/data/repository.ts`
- Test: `tests/repository.test.ts`

**Interfaces:**
- Consumes: `AppState`, `seed()`.
- Produces: `autenticar`, `validarCadastro`, `criarEquipeDoFormulario` (assinaturas §6).

- [ ] **Step 1:** Testes (escrever todos primeiro):
  - `autenticar(seed(), 'admin@infohub.dev', '123456')` retorna usuário tipo `admin`; senha errada → `null`; e-mail inexistente → `null`.
  - `validarCadastro({})` retorna erros para todos os obrigatórios (nome, email, senha, telefone, curso, nomeIdeia, descricaoIdeia, areaId, estagioIdeia); e-mail já usado → erro em `email`.
  - `criarEquipeDoFormulario(seed(), dadosValidos)` → `equipe.etapaAtualId === 1`, `status==='ativa'`, líder nos `membros` com `papel==='lider'`, novo `usuario` tipo `aluno` em `estado.usuarios`; **não** muta o `seed()` original (imutabilidade).
- [ ] **Step 2:** Rodar → FAIL.
- [ ] **Step 3:** Implementar as três funções (imutáveis; `slug` do nome da ideia; validação por campo retornando `Record<string,string>`).
- [ ] **Step 4:** Rodar → PASS.
- [ ] **Step 5:** Commit: `git commit -m "feat(data): autenticar, validar e criar cadastro (TDD)"`.

---

### Task 8: Repositório — funil, etapas e atraso

**Files:**
- Modify: `src/data/repository.ts`, `tests/repository.test.ts`

**Interfaces:**
- Produces: `filtrarEquipes`, `tarefasObrigatoriasPendentes`, `avancarEtapa`, `retrocederEtapa`, `calcularStatusAtraso`.

- [ ] **Step 1:** Testes primeiro:
  - `filtrarEquipes(s, { busca:'<parte do nome>' })` retorna só as que casam (case-insensitive, sem acento); `{ areaId }`, `{ mentorId }`, `{ statusTarefa:'atrasada' }` filtram corretamente.
  - `tarefasObrigatoriasPendentes(s, equipeId, etapaId)` lista obrigatórias não aprovadas da etapa.
  - `avancarEtapa` **sem** `forcar` com obrigatória pendente → **não** avança e não grava histórico; **com** `forcar:true` → avança +1, grava `HistoricoEtapa` (`forcado:true`, `observacao`). Avançar da etapa 6 concluída → `status='pronta_inovamf'` e `prontaInovamfEm` setado.
  - `retrocederEtapa` → etapaAtual −1, grava histórico (não abaixo de 1).
  - `calcularStatusAtraso(s, '2026-09-01')` → tarefas com `dataEntrega < hoje` e status em `pendente|em_andamento` viram `atrasada`; `aprovada`/`entregue` não mudam.
- [ ] **Step 2:** Rodar → FAIL.
- [ ] **Step 3:** Implementar as funções (imutáveis; normalização de acento via `.normalize('NFD').replace(/\p{Diacritic}/gu,'')`).
- [ ] **Step 4:** Rodar → PASS.
- [ ] **Step 5:** Commit: `git commit -m "feat(data): filtros do funil, avançar/retroceder etapa e atraso (TDD)"`.

---

### Task 9: Repositório — tarefas, entregas e avaliação

**Files:**
- Modify: `src/data/repository.ts`, `tests/repository.test.ts`

**Interfaces:**
- Produces: `criarTarefa`, `enviarEntrega`, `avaliarEntrega`.

- [ ] **Step 1:** Testes primeiro:
  - `criarTarefa(s, equipeId, { titulo, etapaId, dataEntrega, obrigatoria, criadoPor })` adiciona tarefa `status='pendente'`; via `{ modeloId, dataEntrega, criadoPor }` copia título/descrição/obrigatória do modelo.
  - `enviarEntrega(s, tarefaId, { enviadoPor, arquivos:[{tipo:'link',urlExterna:'http…'}] })` cria `Entrega` `versao=1`; reenvio → `versao=2`; tarefa passa a `entregue`.
  - `avaliarEntrega(s, entregaId, { resultado:'aprovada', avaliadorId })` → tarefa `aprovada` + `concluidaEm`; `{ resultado:'ajustar' }` → tarefa `ajustar`, registra `AvaliacaoEntrega`.
- [ ] **Step 2:** Rodar → FAIL.
- [ ] **Step 3:** Implementar (imutáveis; `versao` = max atual + 1 por tarefa).
- [ ] **Step 4:** Rodar → PASS.
- [ ] **Step 5:** Commit: `git commit -m "feat(data): tarefas, entregas versionadas e avaliação (TDD)"`.

---

### Task 10: Store (Context + reducer) + sessão mockada

**Files:**
- Create: `src/data/store.tsx`, `src/data/session.ts`

**Interfaces:**
- Consumes: repositório (Tasks 7–9), `seed()`.
- Produces:
  - `StoreProvider`, `useStore(): { state: AppState; dispatch }` e seletores/ações helper: `useActions()` expondo `login`, `cadastrar`, `filtrar`, `avancar`, `retroceder`, `novaTarefa`, `enviarEntrega`, `avaliar` — cada uma chama a função pura e faz `dispatch` do novo estado.
  - `session.ts`: `getUsuarioAtual(): Usuario|null`, `setUsuarioAtual(u)`, `logout()` (usa `sessionStorage`, guardando só o `id`; resolve o objeto pelo `state`).

- [ ] **Step 1:** Teste `tests/store.test.tsx`: renderizar um componente de teste dentro de `StoreProvider` que chama `useActions().avancar(equipeId,{forcar:true,autorId})` e verifica que `useStore().state` refletiu a mudança (etapa +1). (RTL + `act`.)
- [ ] **Step 2:** Rodar → FAIL.
- [ ] **Step 3:** Implementar reducer com uma action `SET_STATE` (as ações helper calculam via repositório e despacham o novo estado) + `session.ts`.
- [ ] **Step 4:** Rodar → PASS.
- [ ] **Step 5:** Commit: `git commit -m "feat(data): store context/reducer e sessão mockada"`.

---

### Task 11: Guards de rota (middleware + layouts) e Fluxo 1 (Login)

**Files:**
- Create: `src/middleware.ts`, `src/app/login/page.tsx`, `src/app/admin/layout.tsx`, `src/app/aluno/layout.tsx`
- Modify: `src/app/page.tsx` (redirect → `/login`)

**Interfaces:**
- Consumes: `autenticar`/store, `session`.
- Produces: `/login` funcional; guards que redirecionam sem sessão / tipo errado.

- [ ] **Step 1:** Teste `tests/components/login.test.tsx`: renderizar `LoginForm` dentro de `StoreProvider`; submeter e-mail/senha errados → mensagem "Credenciais inválidas"; corretos (admin do seed) → chama `setUsuarioAtual` e `router.push('/admin')` (mockar `next/navigation`).
- [ ] **Step 2:** Rodar → FAIL.
- [ ] **Step 3:** Implementar `LoginForm` (Card central, `Logo`, Input e-mail/senha, `FormField` com erro, botão primário, link "Esqueci a senha" stub, link "Criar conta" → `/cadastro`). `admin/layout.tsx` e `aluno/layout.tsx`: client component que lê `getUsuarioAtual()`; sem sessão → `redirect('/login')`; tipo incompatível → redirect à área correta. `middleware.ts`: como a sessão é client-side (sessionStorage), o middleware apenas garante que `/` → `/login`; a checagem fina fica nos layouts (documentar essa limitação do mock).
- [ ] **Step 4:** Rodar → PASS. Verificar manualmente: acessar `/admin` sem login volta para `/login`.
- [ ] **Step 5:** Commit: `git commit -m "feat(auth): login mockado + guards de rota"`.

---

### Task 12: Fluxo 2 — Cadastro da ideia

**Files:**
- Create: `src/app/cadastro/page.tsx`, `src/features/aluno-cadastro/CadastroForm.tsx`

**Interfaces:**
- Consumes: `validarCadastro`, `criarEquipeDoFormulario` (via `useActions().cadastrar`), componentes DS.
- Produces: cadastro cria equipe na Etapa 1 e loga o aluno.

- [ ] **Step 1:** Teste `tests/components/cadastro.test.tsx`: submeter vazio → mostra erros dos obrigatórios (usa `validarCadastro`); preencher válido + adicionar 1 integrante → chama `cadastrar` e redireciona a `/aluno`.
- [ ] **Step 2:** Rodar → FAIL.
- [ ] **Step 3:** Implementar `CadastroForm`: seções (Seus dados; Sua equipe — lista de integrantes com "Adicionar/Remover"; Sua ideia — nome, descrição `Textarea`, área `Select`, estágio radios, origem opcional). Estado local controlado; no submit chama `validarCadastro`, se `{}` chama `cadastrar` e `router.push('/aluno')`. Mobile-first.
- [ ] **Step 4:** Rodar → PASS.
- [ ] **Step 5:** Commit: `git commit -m "feat(cadastro): formulário da ideia cria equipe na etapa 1"`.

---

### Task 13: Fluxo 3 — Funil (kanban) + filtros

**Files:**
- Create: `src/app/admin/page.tsx`, `src/features/admin-funil/{Funil,EquipeCard,FiltrosBar}.tsx`

**Interfaces:**
- Consumes: `filtrarEquipes`, `StageTag`, `StatusBadge`, `Badge`.
- Produces: funil de 6 colunas + "Pronta p/ InovAMF"; busca/filtros; card linka para detalhe.

- [ ] **Step 1:** Teste `tests/components/funil.test.tsx`: renderizar `Funil` com o `seed()`; existem 7 colunas (6 etapas + pronta); digitar no campo de busca filtra os cards exibidos (usa `filtrarEquipes`); cada card mostra nome da ideia e badge de área.
- [ ] **Step 2:** Rodar → FAIL.
- [ ] **Step 3:** Implementar `FiltrosBar` (busca + selects de área/curso/mentor/status), `EquipeCard` (nome, `StageTag`, área, mentor, contador de atrasadas via `StatusBadge`) com `<Link href={/admin/equipes/${slug}}>`, `Funil` (agrupa equipes por `etapaAtualId` + coluna pronta, `EmptyState` por coluna vazia). Header com `Logo` + `ThemeToggle` + logout.
- [ ] **Step 4:** Rodar → PASS.
- [ ] **Step 5:** Commit: `git commit -m "feat(funil): kanban das 6 etapas com busca e filtros"`.

---

### Task 14: Fluxo 3/4 — Detalhe da equipe + avançar/retroceder

**Files:**
- Create: `src/app/admin/equipes/[slug]/page.tsx`, `src/features/admin-detalhe/{DetalheEquipe,HistoricoEtapas,AvancarEtapa}.tsx`

**Interfaces:**
- Consumes: `avancarEtapa`, `retrocederEtapa`, `tarefasObrigatoriasPendentes` (via actions), `Tabs`.
- Produces: página de detalhe com dados, histórico, ação de mover etapa (com RN-01 + forçar).

- [ ] **Step 1:** Teste `tests/components/avancar.test.tsx`: numa equipe com obrigatória pendente, clicar "Avançar etapa" mostra aviso (RN-01) e só avança ao marcar "Forçar" + confirmar; verifica etapa +1 no store e nova linha no histórico.
- [ ] **Step 2:** Rodar → FAIL.
- [ ] **Step 3:** Implementar `DetalheEquipe` (abas: Dados/Membros, Tarefas [Task 15], Entregas, Histórico), `HistoricoEtapas` (lista de `HistoricoEtapa` ordenada desc), `AvancarEtapa` (botões avançar/retroceder; se `tarefasObrigatoriasPendentes` não vazio, exige checkbox "Forçar" + `Textarea` observação; usa `primitives/Dialog` de confirmação).
- [ ] **Step 4:** Rodar → PASS.
- [ ] **Step 5:** Commit: `git commit -m "feat(detalhe): página da equipe com avançar/retroceder (RN-01)"`.

---

### Task 15: Fluxo 4 — Criar tarefa + avaliar entrega (admin)

**Files:**
- Create: `src/features/admin-tarefas/{TarefaList,NovaTarefaDialog,AvaliarEntrega}.tsx`, `src/design-system/components/primitives/Dialog.tsx`
- Modify: `src/features/admin-detalhe/DetalheEquipe.tsx` (aba Tarefas)

**Interfaces:**
- Consumes: `criarTarefa`, `avaliarEntrega` (via actions), `StatusBadge`.
- Produces: criar tarefa (form ou modelo), listar entregas, aprovar/ajustar.

- [ ] **Step 1:** Teste `tests/components/avaliar.test.tsx`: numa tarefa `entregue`, clicar "Aprovar" → tarefa vira `aprovada` no store; "Solicitar ajustes" com comentário → `ajustar`.
- [ ] **Step 2:** Rodar → FAIL.
- [ ] **Step 3:** Implementar `primitives/Dialog` (wrapper shadcn/Radix tematizado com `--surface`, `--overlay`), `NovaTarefaDialog` (campos ou `Select` de modelo por etapa + data), `TarefaList` (tarefas da equipe com `StatusBadge` e entregas versionadas), `AvaliarEntrega` (botões Aprovar / Solicitar ajustes + comentário).
- [ ] **Step 4:** Rodar → PASS.
- [ ] **Step 5:** Commit: `git commit -m "feat(tarefas): criar tarefa e avaliar entrega (aprovar/ajustar)"`.

---

### Task 16: Fluxo 5 — Área do aluno: tarefas + enviar entrega

**Files:**
- Create: `src/app/aluno/page.tsx`, `src/features/aluno-tarefas/{MinhasTarefas,EnviarEntregaDialog}.tsx`

**Interfaces:**
- Consumes: `enviarEntrega` (via actions), `StatusBadge`, `Dialog`, sessão.
- Produces: aluno vê tarefas da sua equipe e envia entrega (arquivo mock ou link).

- [ ] **Step 1:** Teste `tests/components/entrega.test.tsx`: como aluno do seed, `MinhasTarefas` lista tarefas da sua equipe; abrir `EnviarEntregaDialog`, escolher "Link", preencher URL + comentário, enviar → cria entrega e a tarefa vira `entregue` no store (visível ao admin).
- [ ] **Step 2:** Rodar → FAIL.
- [ ] **Step 3:** Implementar `MinhasTarefas` (mobile-first: cabeçalho com equipe + etapa atual via `StageTag`; listas Pendentes/Concluídas com prazo, instruções, `StatusBadge`), `EnviarEntregaDialog` (toggle Arquivo|Link; Arquivo = `<input type=file>` capturando só `file.name` → `ArquivoEntrega{tipo:'arquivo',nomeOriginal}`; Link = URL → `{tipo:'link',urlExterna}`; comentário opcional).
- [ ] **Step 4:** Rodar → PASS.
- [ ] **Step 5:** Commit: `git commit -m "feat(aluno): tarefas e envio de entrega (arquivo mock/link)"`.

---

### Task 17: Polimento — landing/redirect, empty states, revisão de tokens

**Files:**
- Modify: telas conforme necessário; `src/app/page.tsx`

**Interfaces:** nenhuma nova.

- [ ] **Step 1:** Verificar que **nenhum** componente usa hex literal (`grep -rnE '#[0-9a-fA-F]{3,6}' src/ --include=*.tsx` deve retornar vazio; hex só em `tokens.css`).
- [ ] **Step 2:** Alternar dark/light em cada tela e conferir contraste (§3.5). Ajustar tokens se necessário (só em `tokens.css`).
- [ ] **Step 3:** Garantir `EmptyState` em: coluna de funil vazia, aluno sem tarefas, equipe sem entregas.
- [ ] **Step 4:** Rodar `npm test` (tudo verde) e `npm run build` (sucesso).
- [ ] **Step 5:** Commit: `git commit -m "chore: polimento, empty states e verificação de tokens"`.

---

## 8. Cobertura vs. requisitos (self-review)

| Requisito | Tarefa |
| --- | --- |
| RF-01 login separado | Task 11 |
| RF-02/04/05 cadastro cria conta+equipe, valida | Task 7, 12 |
| RF-06 funil por etapa | Task 13 |
| RF-07 busca e filtros | Task 8 (lógica), 13 (UI) |
| RF-08 detalhe da equipe | Task 14 |
| RF-09 avançar/retroceder (+forçar) | Task 8 (lógica), 14 (UI) |
| RF-11/12 criar tarefa / modelos | Task 9, 15 |
| RF-13 aluno vê tarefas | Task 16 |
| RF-14 anexar entrega (arquivo mock/link) | Task 9, 16 |
| RF-15 aprovar / solicitar ajustes | Task 9, 15 |
| RN-01 avanço condicionado (+forçar) | Task 8, 14 |
| RN-04 atraso automático | Task 8 |
| RNF-01 responsivo mobile-first (aluno) | Task 12, 16 |
| Dark/light tokenizado | Task 2, 3 |
| Design System (D4/D5/D6) | Task 2–5 |

**Fora de escopo hoje** (declarado em §1/D10): RF-03, RF-10, RF-16, RF-17–24, RNF-02/05/06/07, Q1–Q7. Sem tarefa — intencional.

---

## 9. Handoff de execução

Duas opções para implementar este plano:

1. **Subagent-Driven (recomendado):** um subagente por tarefa, com revisão entre tarefas (skill `superpowers:subagent-driven-development`).
2. **Inline:** executar as tarefas nesta sessão com checkpoints (skill `superpowers:executing-plans`).
