# Spec — Frontend InfoHub → InovAMF (v1, dados mockados)

**Data:** 2026-08-26
**Projeto:** Arquitetura de Sistemas — InfoHub → InovAMF
**Escopo desta spec:** frontend web com dados mockados, construído com Next.js + React + TypeScript, guiado por um Design System próprio (marca *infohub*) e desenvolvido em TDD.

> Referências: `docs/Infohub_InovAMF_Requisitos.md` (RF/RNF/RN/Q) e `docs/sql/infohub_schema.sql` (entidades). Este documento não redefine requisitos; referencia-os pelos identificadores.

---

## 1. Objetivo e forma da entrega

Entregar **fluxos funcionais** (não apenas telas estáticas): poucos caminhos que funcionam de ponta a ponta com dados mockados, com estado e interação reais, cobertos por testes. O valor demonstrado é o funil InfoHub → InovAMF operando de verdade sobre uma camada de dados em memória.

**Perfil de construção do Design System:** híbrido — tokens e componentes-marca próprios; `shadcn/ui` apenas para primitivos de acessibilidade (Dialog, Select, Tooltip, DropdownMenu).

---

## 2. Fora de escopo (v1 de hoje)

Explicitamente **não** incluídos, para manter o foco no que funciona:

- Autenticação real / backend / persistência (login é **mockado**, ver §6.1).
- E-mails e lembretes automáticos (RF-17 a RF-21).
- Relatórios e exportação CSV/Excel (RF-22 a RF-24).
- Upload físico de arquivo — a entrega por arquivo **mocka apenas o nome/metadados**; entrega por link é real.
- Fluxos de LGPD (RNF-02), auditoria (RNF-05), recuperação de senha real (só stub visual).

**Ordem de corte se o tempo apertar:** Design System + camada de dados (base compartilhada, garantida primeiro) → Fluxo 1 (login) → Fluxo 2 (cadastro) → Fluxo 3 (funil+detalhe) → Fluxo 4 (tarefas+avaliação) → Fluxo 5 (aluno tarefas+entrega).

---

## 3. Stack

| Camada | Escolha |
| --- | --- |
| Framework | Next.js (App Router) + React + TypeScript |
| Estilo | Tailwind CSS + CSS variables (tokens) |
| Primitivos | shadcn/ui (Radix) — Dialog, Select, Tooltip, DropdownMenu |
| Fontes | Poppins/Montserrat via `next/font` |
| Testes | Vitest + React Testing Library + jsdom |
| Dados | Fixtures tipadas + repositório em memória (mutável) + React Context/reducer |

---

## 4. Design System

### 4.1 Tokens (`src/design-system/tokens.css`)

CSS variables consumidas pelo Tailwind.

- **Marca:** `--info-red: #E8422C` (primária), `--hub-gray: #4A4A4A` (texto/secundária).
- **Gradiente:** `#F7941E → #E8422C → #7A1E1E` (Logo e acentos).
- **Neutros:** escala de cinzas (fundo, borda, texto muted).
- **Status de tarefa:** `pendente` (cinza), `em_andamento` (azul), `entregue` (índigo), `atrasada` (âmbar), `aprovada` (verde), `ajustar` (vermelho).
- **Etapas (1–6):** paleta sequencial distinta por etapa para o funil.
- **Escalas:** espaçamento, radius, sombra, tipografia (tamanhos/pesos).

### 4.2 Componentes-marca (`src/design-system/components/`)

`Logo` (variações mono/cor), `Button` (variantes primary/secondary/ghost/danger, tamanhos), `Badge` (status de tarefa e etapa), `Card`, `Input`, `Textarea`, `Select`, `FormField` (label+erro+hint), `Avatar`, `EmptyState`, `PageHeader`, `Tabs`.

Cada componente é tipado, sem estado de negócio, e documentado por props. Primitivos shadcn ficam em `components/primitives/` com tema aplicado.

---

## 5. Domínio e dados

### 5.1 Tipos (`src/domain/types.ts`)

Derivados do schema, apenas o necessário para os fluxos:

`Usuario` (id, nome, email, tipo: `admin|mentor|aluno`), `Aluno` (curso, semestre), `Area`, `Etapa` (numero, nome, entregavel), `Ciclo`, `Equipe` (nomeIdeia, slug, descricao, areaId, estagio, mentorId, etapaAtual, status, membros), `EquipeMembro` (usuarioId, papel `lider|integrante`), `HistoricoEtapa`, `AnotacaoInterna`, `ModeloTarefa`, `Tarefa` (titulo, etapaId, dataEntrega, obrigatoria, status), `Entrega` (versao, enviadoPor, comentario, arquivos), `ArquivoEntrega` (tipo `arquivo|link`, nomeOriginal, urlExterna), `AvaliacaoEntrega` (resultado `aprovada|ajustar`, comentario).

Status de tarefa segue o CHECK do schema: `pendente | em_andamento | entregue | atrasada | aprovada | ajustar`.
Status de equipe: `ativa | pronta_inovamf | encaminhada_inovamf | pausada | desistente`.

### 5.2 Fixtures (`src/data/fixtures.ts`)

Estado inicial realista: 6 etapas, ~4 áreas, 1 ciclo ativo, 3–4 usuários (1 admin, 1 mentor, 2 alunos), ~6–8 equipes distribuídas pelas etapas (uma já "pronta p/ InovAMF"), tarefas em vários status (incluindo uma atrasada), pelo menos uma entrega com avaliação. Modelos de tarefa por etapa (ex.: "Enviar Business Model Canvas" na Etapa 5).

### 5.3 Repositório em memória (`src/data/repository.ts`)

Funções **puras sobre estado** (recebem estado, retornam novo estado) — o coração testável em TDD:

- `autenticar(estado, email, senha) → Usuario | null` — valida contra usuários mockados (RF-01).
- `criarEquipeDoFormulario(estado, dados) → { estado, equipe }` — valida obrigatórios (RF-04), cria equipe na Etapa 1, cria conta do aluno líder (RF-02/05).
- `filtrarEquipes(estado, filtros) → Equipe[]` — busca por nome, filtros por curso/área/status de tarefa/mentor (RF-07).
- `avancarEtapa(estado, equipeId, { forcar, autorId }) → estado` — RN-01: bloqueia se houver obrigatórias não aprovadas na etapa atual, salvo `forcar` (RF-09); grava `HistoricoEtapa`; ao concluir a Etapa 6 marca `pronta_inovamf`.
- `retrocederEtapa(estado, equipeId, { autorId }) → estado` — grava histórico.
- `criarTarefa(estado, equipeId, dados | modeloId) → estado` (RF-11/12).
- `enviarEntrega(estado, tarefaId, { enviadoPor, arquivos, comentario }) → estado` — cria `Entrega` versão N+1, tarefa vai a `entregue` (RF-14).
- `avaliarEntrega(estado, entregaId, { resultado, comentario, avaliadorId }) → estado` — `aprovada` → tarefa `aprovada`; `ajustar` → tarefa `ajustar` (RF-15).
- `calcularStatusAtraso(estado, hoje) → estado` — tarefas com `dataEntrega < hoje` e não entregues viram `atrasada` (RN-04).

### 5.4 Store (`src/data/store.tsx`)

React Context + `useReducer` embrulhando o repositório. Ações despachadas pelas telas mutam o estado da sessão; todas as telas leem do mesmo estado, então uma entrega do aluno aparece no admin, e avançar etapa move o card no funil.

---

## 6. Fluxos (rotas e comportamento)

### 6.0 Rotas

`/login` · `/cadastro` · `/admin` (funil) · `/admin/equipes/[slug]` (detalhe) · `/aluno` (área do aluno). Guard simples: sem usuário no contexto → redireciona para `/login`; usuário de tipo errado para a área → redireciona para a sua área.

### 6.1 Login mockado (RF-01)

Tela com e-mail + senha. `autenticar` valida contra usuários mockados. Sucesso: grava usuário atual no contexto e redireciona (admin/mentor → `/admin`, aluno → `/aluno`). Erro: mensagem inline. Link "Esqueci a senha" é stub visual. Link para `/cadastro`.

### 6.2 Aluno · cadastro da ideia (RF-02/04/05)

Form: nome, e-mail, telefone, curso, semestre; **integrantes repetíveis** (nome + curso, adicionar/remover); nome da ideia, descrição, área (Select), estágio (radio: ideia/protótipo/mvp_desenvolvimento/mvp_pronto), origem (opcional). Valida obrigatórios com mensagens. Envio → `criarEquipeDoFormulario` → cria equipe na Etapa 1, loga o aluno e redireciona a `/aluno`. A equipe passa a aparecer no funil do admin.

### 6.3 Admin · funil + detalhe (RF-06/07/08/09)

- **Funil** (`/admin`): kanban com colunas das Etapas 1–6 + coluna "Pronta p/ InovAMF". Card de equipe: nome da ideia, badge de área, mentor, contador de tarefas atrasadas. **Busca** (nome) + **filtros** (curso, área, status de tarefa, mentor). Estado vazio por coluna.
- **Detalhe** (`/admin/equipes/[slug]`): abas/seções — dados cadastrais + membros; histórico de etapas; tarefas (§6.4); entregas; anotações internas. Botões **avançar/retroceder etapa** com confirmação; avançar respeita RN-01 e oferece **forçar** com observação.

### 6.4 Admin · tarefas + avaliação (RF-11/12/15)

Dentro do detalhe: **criar tarefa** (Dialog — título, descrição, etapa, data de entrega, obrigatória; ou escolher um **modelo** da etapa). Lista de tarefas com badge de status. Cada tarefa mostra suas entregas (versões); ações **Aprovar** / **Solicitar ajustes** (com comentário) → `avaliarEntrega` atualiza o status da tarefa.

### 6.5 Aluno · tarefas + entrega (RF-13/14) — mobile-first

`/aluno`: cabeçalho da equipe + etapa atual; lista de **tarefas pendentes e concluídas** com prazo, instruções e badge de status. Ação **Enviar entrega** (Dialog): escolher **arquivo** (mock — captura só o nome) ou **link** (URL real), comentário → `enviarEntrega` cria versão N e a tarefa vai a `entregue`; passa a aparecer para o admin avaliar.

---

## 7. Estados de erro e regras na UI

- Validação de obrigatórios no cadastro e nos forms, com mensagem por campo (RF-04).
- RN-01: avançar etapa bloqueado quando há tarefas obrigatórias não aprovadas; admin pode **forçar** (RF-09), registrando observação no histórico.
- RN-04: tarefas vencidas sem entrega exibidas como `atrasada` (badge âmbar) e contabilizadas no card do funil.
- Estados vazios: coluna do funil sem equipes, aluno sem tarefas, equipe sem entregas.
- Guard de rota: acesso sem sessão → `/login`.

---

## 8. Estratégia de TDD

Ordem red-green-refactor:

1. **Domínio/repositório (funções puras)** — prioridade máxima, alta cobertura: `autenticar`, `criarEquipeDoFormulario` + validação, `filtrarEquipes`, `avancarEtapa` (incl. RN-01 e forçar), `retrocederEtapa`, `criarTarefa`, `enviarEntrega`, `avaliarEntrega`, `calcularStatusAtraso`.
2. **Componentes críticos (RTL)** — cobertura seletiva: validação do form de cadastro, filtro/busca do funil, envio de entrega (Dialog), badge de status por estado.

Não se busca cobertura pixel a pixel dos componentes de apresentação puros do Design System.

---

## 9. Estrutura de diretórios

```
src/
  app/
    login/            cadastro/
    admin/            admin/equipes/[slug]/
    aluno/
    layout.tsx
  design-system/
    tokens.css
    Logo.tsx
    components/       (Button, Badge, Card, Input, ...)
    components/primitives/   (wrappers shadcn com tema)
  domain/
    types.ts
  data/
    fixtures.ts       repository.ts       store.tsx
  features/
    aluno-cadastro/   admin-funil/        admin-detalhe-equipe/
    admin-tarefas/    aluno-tarefas/
```

---

## 10. Critérios de aceite (v1)

- [ ] Login mockado autentica admin e aluno e redireciona à área correta; sem sessão redireciona a `/login`.
- [ ] Cadastro cria uma equipe na Etapa 1 que aparece no funil do admin; obrigatórios validados.
- [ ] Funil mostra as 6 etapas + "Pronta p/ InovAMF"; busca e filtros funcionam.
- [ ] Detalhe permite avançar/retroceder etapa (com RN-01 e forçar) gravando histórico.
- [ ] Admin cria tarefa e avalia entrega (aprovar/ajustar), refletindo no status.
- [ ] Aluno vê tarefas e envia entrega (arquivo mock ou link), que aparece para o admin.
- [ ] Suíte de testes do repositório verde; testes de componentes críticos verdes.
- [ ] Design System aplica os tokens da marca (cores, tipografia) de forma consistente.
