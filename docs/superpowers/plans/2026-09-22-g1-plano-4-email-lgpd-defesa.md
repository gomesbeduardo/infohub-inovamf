# G1 · Plano 4 — E-mail isolado, recuperar senha, LGPD, notificações e defesa

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Fechar o que falta do sistema para o **CP3** (24/09 ~14h): envio real de e-mail (Resend) num **processo worker isolado**, recuperação de senha (RF-01), consentimento e anonimização LGPD (RNF-02), tela de notificações (RF-20/21) e o **roteiro de defesa** versionado.

**Decisões já tomadas (usuário):** upload de arquivo fica **fora do G1** — entrega só por link (Q3 fechada como "link"; aba "Arquivo" desabilitada). E-mail via **Resend do usuário, subdomínio próprio**; a chave vive **só** no Coolify. Todo campo de senha usa `PasswordInput` (olho, segurar para ver) **e** tem "Confirmar senha".

**Architecture:** O worker de e-mail é um **processo separado** (`node dist/worker.js`) subido pelo `scripts/start-all.mjs` no mesmo resource do Coolify: se o Resend cair ou o worker morrer, o login e as entregas continuam no ar (é a resposta ao **Problema 3** das aulas). O worker lê a tabela `emails` (a fila que já existe) com `FOR UPDATE SKIP LOCKED`, respeita as preferências do usuário, tenta de novo com backoff e marca `enviado`/`falha`/`cancelado`. Sem `RESEND_API_KEY`, o worker fica ocioso e o sistema segue com links copiáveis.

**Tech Stack:** backend Express + Prisma 5 + Vitest; `fetch` nativo para a API do Resend (sem SDK); front Next 14 + React Query.

## Global Constraints

- PR para **`staging`**, uma branch por issue, Conventional Commits, **um PR por vez com aprovação do usuário**; comentar "Pegando." na issue.
- `npm test` + `npm run build` verdes (backend e/ou frontend conforme a task). TDD.
- Só `src/env.ts` lê `process.env`. Segredos **nunca** em código, log ou resposta.
- Nenhuma resposta revela se um e-mail existe (recuperar senha responde sempre 204).
- Tokens de senha: bruto `"<id>.<segredo>"`, só o hash bcrypt no banco, uso único, expiração.
- Front: `PasswordInput` + "Confirmar senha" em todo formulário que define senha; tokens do DS, sem hex.
- Commits com a linha de atribuição da sessão; PRs com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

## Ordem

| Task | Onde | Branch | Depende |
|---|---|---|---|
| 1 Porta de e-mail + worker isolado | backend + `scripts/start-all.mjs` | `feat/email-worker` | Planos 1–2 |
| 2 Recuperar senha (API) | backend | `feat/recuperar-senha-api` | T1 |
| 3 LGPD: consentimento + anonimização (API) | backend | `feat/lgpd-api` | — |
| 4 Telas: recuperar/redefinir senha, notificações, LGPD | frontend | `feat/front-senha-notificacoes-lgpd` | T2, T3 + Plano 3 |
| 5 Roteiro de defesa | `docs/defesa-g1.md` | `docs/defesa-g1` | tudo mergeado |

---

## Task 1: Porta de e-mail + worker isolado

**Files:**
- Create: `backend/src/email/provedor.ts`, `backend/src/email/templates.ts`, `backend/src/email/processar.ts`, `backend/src/worker.ts`, `backend/tests/email.test.ts`
- Modify: `backend/src/env.ts`, `backend/.env.example`, `backend/src/models/email.model.ts`, `backend/package.json` (script `worker`), `scripts/start-all.mjs`, `README.md`

**Interfaces (produz):**
- `env.resendApiKey: string | null`, `env.emailFrom: string | null`, `env.appUrl: string` (padrão: `CORS_ORIGIN` ou `http://localhost:3000`).
- `interface Mensagem { para: string; assunto: string; html: string; texto: string }`; `interface ProvedorEmail { nome: string; enviar(m: Mensagem): Promise<{ id: string }> }`; `criarProvedor(): ProvedorEmail | null`.
- `renderizar(tipo: string, dados: Record<string, unknown>, assunto: string): { html: string; texto: string }`.
- `processarLote(provedor: ProvedorEmail, opts?: { limite?: number; agora?: Date }): Promise<{ enviados: number; falhas: number; cancelados: number }>`.
- `MAX_TENTATIVAS = 5`; `TIPOS_OBRIGATORIOS = ['convite_conta', 'recuperacao_senha']` (ignoram preferência).

- [ ] **Step 1: env**

`backend/src/env.ts`, dentro de `env`:
```ts
  // E-mail (Resend). Sem chave, o worker fica ocioso e o sistema segue com links copiáveis.
  resendApiKey: process.env.RESEND_API_KEY?.trim() || null,
  emailFrom: process.env.EMAIL_FROM?.trim() || null,
  // URL pública do front, usada nos links dos e-mails.
  appUrl: (process.env.APP_URL ?? process.env.CORS_ORIGIN ?? "http://localhost:3000").replace(/\/$/, ""),
```
`.env.example`: `RESEND_API_KEY=` (vazio), `EMAIL_FROM="InfoHub <nao-responda@infohub.seudominio.com>"`, `APP_URL="http://localhost:3000"` com comentário "a chave só no Coolify, nunca no repositório".

- [ ] **Step 2: testes (falham)** — `backend/tests/email.test.ts`

Casos (use `tests/helpers.ts` e um provedor falso em memória, sem rede):
1. `renderizar("convite_conta", { nome: "Ana", link: "https://x/convite?token=t" }, "Seu convite")` → `html` e `texto` contêm "Ana" e o link; o HTML **escapa** `<script>` vindo em `nome`.
2. `renderizar("tipo_desconhecido", {}, "Assunto")` → corpo genérico com o assunto (não lança).
3. `processarLote` com 3 e-mails `pendente` do sufixo do teste: um normal (→ `enviado`, `enviado_em` preenchido, `provider_message_id` = id do falso), um de tipo `nova_tarefa` para usuário com preferência `nova_tarefa` **desligada** (→ `cancelado`), um `convite_conta` com a mesma preferência desligada para `convite_conta` (→ **enviado**, é obrigatório).
4. Provedor falso que lança: e-mail fica `pendente`, `tentativas` = 1, `erro` preenchido, `agendado_para` > agora; após a 5ª tentativa → `falha`.
5. `agendado_para` no futuro não é processado.
Isolamento: filtrar sempre por `destinatario_email` contendo o sufixo do arquivo (a tabela é compartilhada pelos testes); limpar no `afterAll`.

- [ ] **Step 3: provedor Resend** — `backend/src/email/provedor.ts`
```ts
import { env } from "../env.js";

export interface Mensagem { para: string; assunto: string; html: string; texto: string }
export interface ProvedorEmail { nome: string; enviar(m: Mensagem): Promise<{ id: string }> }

// Adaptador do Resend via HTTP (sem SDK). null = envio desligado (sem chave).
export function criarProvedor(): ProvedorEmail | null {
  if (!env.resendApiKey || !env.emailFrom) return null;
  const chave = env.resendApiKey;
  const de = env.emailFrom;
  return {
    nome: "resend",
    async enviar(m) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: de, to: [m.para], subject: m.assunto, html: m.html, text: m.texto }),
        signal: AbortSignal.timeout(10_000),
      });
      const corpo = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
      if (!res.ok || !corpo.id) throw new Error(`Resend ${res.status}: ${corpo.message ?? "sem id"}`);
      return { id: corpo.id };
    },
  };
}
```

- [ ] **Step 4: templates** — `backend/src/email/templates.ts`: função `escapar(texto)` (&, <, >, ", '), layout HTML simples (cabeçalho "InfoHub · AMF", corpo, botão para o link quando houver, rodapé "Você recebeu este e-mail porque participa do InfoHub. Preferências: {appUrl}/conta"), e um mapa por tipo com corpo pt-BR curto usando os campos já gravados em `dados_template` pelos controllers: `convite_conta {nome, link}`, `recuperacao_senha {nome, link}`, `nova_tarefa {titulo, data_entrega}`, `entrega_aprovada {comentario}`, `entrega_ajustar {comentario}`, `novo_cadastro_admin {equipe, lider, equipe_slug}` (link `{appUrl}/admin/equipes/{equipe_slug}`), `lembrete_manual {mensagem?}`; tipo desconhecido → parágrafo com o assunto. `texto` é a versão sem HTML.

- [ ] **Step 5: fila no model** — em `backend/src/models/email.model.ts` acrescentar:
```ts
// Reserva até `limite` e-mails vencidos. SKIP LOCKED: dois workers nunca pegam o mesmo.
export function reservarLote(limite: number, agora: Date) {
  return prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM emails
     WHERE status = 'pendente' AND agendado_para <= ${agora}
     ORDER BY agendado_para
     LIMIT ${limite}
     FOR UPDATE SKIP LOCKED`;
}
export function carregarParaEnvio(ids: string[]) { /* findMany com tipo, destinatario_id, destinatario_email, assunto, template, dados_template, tentativas */ }
export function marcarEnviado(id: string, providerId: string) { /* status enviado, enviado_em now, provider_message_id, erro null */ }
export function marcarCancelado(id: string, motivo: string) { /* status cancelado, erro = motivo */ }
export function registrarFalha(id: string, tentativas: number, erro: string, proxima: Date | null) {
  /* tentativas; erro (máx 500 chars); se proxima === null → status falha; senão agendado_para = proxima */
}
export function preferenciaDesligada(usuarioId: string, tipo: string) { /* preferencias_notificacao habilitado=false existe? */ }
```
(`reservarLote` precisa rodar **dentro** de uma transação para o lock valer; em `processarLote` use `prisma.$transaction(async (tx) => …)` e passe `tx` — ajuste as assinaturas para receber o client.)

- [ ] **Step 6: processar** — `backend/src/email/processar.ts`: `processarLote(provedor, { limite = 20, agora = new Date() })` → numa transação: reserva ids, carrega; para cada um: se tipo ∉ obrigatórios e `destinatario_id` com preferência desligada → `marcarCancelado("preferencia_desligada")`; senão `renderizar` + `provedor.enviar`; sucesso → `marcarEnviado`; erro → `t = tentativas + 1`, `registrarFalha(id, t, msg, t >= MAX_TENTATIVAS ? null : new Date(agora + 2^t minutos))`. Nunca lança por um e-mail individual. Retorna contadores.

- [ ] **Step 7: worker** — `backend/src/worker.ts`:
```ts
import { prisma } from "./prisma.js";
import { criarProvedor } from "./email/provedor.js";
import { processarLote } from "./email/processar.js";

// Processo SEPARADO da API (Problema 3): se o Resend cair ou este processo
// morrer, login e entregas continuam no ar. Sem chave, fica ocioso.
const INTERVALO_MS = 15_000;
let parar = false;
for (const s of ["SIGINT", "SIGTERM"] as const) process.on(s, () => { parar = true; });

async function main() {
  const provedor = criarProvedor();
  if (!provedor) console.log("[worker] sem RESEND_API_KEY/EMAIL_FROM — fila de e-mail não será enviada (links copiáveis seguem valendo)");
  while (!parar) {
    if (provedor) {
      try {
        const r = await processarLote(provedor);
        if (r.enviados + r.falhas + r.cancelados > 0) console.log("[worker]", r);
      } catch (e) {
        console.error("[worker] lote falhou — tento de novo no próximo ciclo", e);
      }
    }
    await new Promise((ok) => setTimeout(ok, INTERVALO_MS));
  }
  await prisma.$disconnect();
}
void main();
```
`backend/package.json`: `"worker": "node dist/worker.js"`.

- [ ] **Step 8: start-all** — em `scripts/start-all.mjs`: `subir(nome, dir, env, script = "start")` passa a rodar `npm run <script>` (mantendo `npm start` para os atuais); subir o worker com `subir("worker", "backend", {}, "worker")`. **Política diferente para o worker**: se ele sair, **não** derrubar API/front — logar `[start-all] worker saiu (…) — reiniciando em 5 s` e subir de novo (com teto: se sair 5 vezes em 1 minuto, desiste e loga, sem derrubar o resto). API ou front saindo continua derrubando tudo (política atual). Comentário no topo explicando o porquê (isolamento do Problema 3).

- [ ] **Step 9: README** — seção "E-mail (Resend)": variáveis `RESEND_API_KEY` (segredo, só no Coolify), `EMAIL_FROM`, `APP_URL`; passo a passo do subdomínio no Resend (Domains → Add → registros DNS SPF/DKIM/MX → Verify; API Keys → Sending access restrito ao domínio); e "sem chave o sistema funciona com links copiáveis".

- [ ] **Step 10:** `npm test && npm run build`; smoke local: `npm run build && node dist/worker.js` sem chave → loga a mensagem de ocioso e fica vivo (Ctrl+C encerra). Commit `feat(backend): worker de e-mail isolado com Resend e fila com retry (RF-18/19, RNF-06)`, PR "Closes #86".

---

## Task 2: Recuperar senha (API)

**Files:** Modify `backend/src/models/token.model.ts`, `backend/src/controllers/auth.controller.ts`, `backend/src/controllers/usuario.controller.ts`, `backend/src/routes.ts`, `backend/src/utils/convite.ts`, `backend/src/env.ts`; Create `backend/tests/recuperar-senha.test.ts`.

**Interfaces (produz):**
- `POST /auth/recuperar {email}` → **sempre 204** (rate-limited). Se existe usuário **ativo** com o e-mail: invalida tokens `recuperacao` anteriores, cria um novo (TTL `env.resetTtlMinutos`, padrão 60), enfileira `recuperacao_senha` com `{ nome, link }`.
- `GET /auth/redefinir?token=` → `{ nome, email }`; 400 `INVALID_TOKEN_SENHA` | `TOKEN_USADO` | `TOKEN_EXPIRADO`.
- `POST /auth/redefinir {token, senha}` → senha ≥ 8 (`WEAK_PASSWORD`); grava a senha, queima o token, **revoga todas as sessões** (`troca_senha`) e devolve sessão nova (200).
- `POST /usuarios/:slug/redefinicao` (admin) → 201 `{ url, expiraEm }` e também enfileira o e-mail (fallback quando não há e-mail configurado: o admin copia o link).
- `linkRedefinicao(token) = ${env.appUrl}/redefinir-senha?token=…`.
- Generalizar em `token.model.ts`: `criarTokenSenha({ usuarioId, finalidade, ttlMs })`, `invalidarTokensAtivos(usuarioId, finalidade)`, `abrirTokenSenha(bruto, finalidade)` (reaproveitada por convite e recuperação — o `abrirConvite` do auth.controller passa a usá-la), `consumirRecuperacao({ tokenId, usuarioId, senhaHash })` (transação: senha + usado_em).

**Testes:** e-mail inexistente → 204 e **nenhum** e-mail enfileirado; e-mail existente → 204 e 1 e-mail `recuperacao_senha` com link contendo `/redefinir-senha?token=`; preview ok; redefinir com senha fraca 400; redefinir ok → login com a senha nova funciona, a sessão antiga (access) dá 401, reusar o token → `TOKEN_USADO`; token de **convite** não serve para redefinir (finalidade errada → `INVALID_TOKEN_SENHA`); admin gera link (201) e aluno não pode (403).

Commit `feat(backend): recuperação de senha por link de uso único (RF-01)`.

---

## Task 3: LGPD — consentimento e anonimização (API)

**Files:** Create `backend/src/models/lgpd.model.ts`, `backend/tests/lgpd.test.ts`; Modify `backend/src/controllers/equipe.controller.ts` (inscrição), `backend/src/controllers/auth.controller.ts` (register), `backend/src/controllers/usuario.controller.ts`, `backend/src/routes.ts`, `backend/src/domain/` (constante `VERSAO_POLITICA = "2026-09"`).

**Interfaces (produz):**
- Inscrição e aceite de convite exigem `consentimento: true` → senão 400 `CONSENTIMENTO_OBRIGATORIO`; grava `consentimentos_lgpd { usuario_id, versao_politica: VERSAO_POLITICA, aceito: true, user_agent }` **na mesma transação** da conta (inscrição: só para o líder; os colegas consentem no próprio aceite).
- `POST /usuarios/:slug/anonimizar` (admin) → 200 `{ slug, anonimizadoEm }`. Regras (RNF-02 — "o que o modelo faz com as entregas dele?"):
  - a linha em `usuarios` **fica** (entregas, avaliações e histórico apontam para ela — apagar quebraria a trilha de auditoria RNF-05); os dados pessoais somem: `nome = "Pessoa removida"`, `email = "removido+<slug>@anonimo.invalid"`, `telefone = ""`, `senha` = hash aleatório, `ativo = false`, `excluido_em = now()`;
  - apaga `alunos` (curso/semestre/matrícula), revoga sessões e tokens, cancela e-mails pendentes para ela, marca vínculos `equipe_membros` como `ativo=false, saiu_em=now()`;
  - **entregas ficam** (são da equipe), com autoria "Pessoa removida";
  - `consentimentos_lgpd` ficam (prova do consentimento dado);
  - recusa: a si mesmo (400 `NAO_PODE_SI_MESMO`), o último admin ativo (409 `ULTIMO_ADMIN`), líder de equipe ativa (409 `LIDER_ATIVO` — "transfira a liderança antes");
  - tudo numa transação.

**Testes:** inscrição sem consentimento 400; com consentimento grava 1 linha em `consentimentos_lgpd`; aceite de convite idem; anonimizar integrante → dados pessoais trocados, `alunos` apagado, login com o e-mail antigo falha, entrega dele continua listada com `enviadoPor.nome === "Pessoa removida"`; as três recusas; aluno chamando → 403.

Commit `feat(backend): consentimento LGPD no cadastro e anonimização pelo admin (RNF-02)`, PR "Closes #89".

---

## Task 4: Telas — recuperar/redefinir senha, notificações, LGPD

**Files:** Modify `frontend/src/features/auth/RecuperarSenhaForm.tsx`, `frontend/src/features/aluno-cadastro/CadastroForm.tsx`, `frontend/src/features/auth/AceitarConviteForm.tsx`, `frontend/src/features/admin-contas/ContasAdmin.tsx`, `frontend/src/features/conta/ContaPerfil.tsx` (ou nova aba), `frontend/src/data/api/{tipos.ts,consultas.ts}`; Create `frontend/src/app/redefinir-senha/page.tsx`, `frontend/src/features/auth/RedefinirSenhaForm.tsx`, `frontend/src/app/privacidade/page.tsx`, `frontend/src/features/conta/Notificacoes.tsx`, `frontend/src/design-system/components/Checkbox.tsx` e `Interruptor.tsx` (se não existirem — tokens do DS, acessíveis); testes em `frontend/tests/components/`.

**Contrato:**
- `/recuperar-senha`: e-mail → `POST /auth/recuperar` → sempre a mesma mensagem "Se houver uma conta com este e-mail, enviamos um link para redefinir a senha. Confira também o spam." (nunca diz se existe).
- `/redefinir-senha?token=` (Suspense por `useSearchParams`): preview (nome/e-mail) → `PasswordInput` **senha + confirmar** (≥ 8, iguais) → `POST /auth/redefinir` → sessão aplicada → `homeFor(role)`. Mensagens para token usado/expirado/inválido com link para `/recuperar-senha`.
- Admin (`ContasAdmin`): ação "Gerar link de redefinição" → `CopiarLink`; ação "Anonimizar (LGPD)" com diálogo de confirmação explicando o que é apagado e o que fica; erros 409 com `ApiError.message`.
- Cadastro e `/convite`: `Checkbox` obrigatório "Li e aceito a [Política de Privacidade](/privacidade)" → manda `consentimento: true`; sem marcar, não envia (erro no campo).
- `/privacidade`: página estática curta (dados coletados, finalidade — acompanhar a jornada até o InovAMF, quem vê, retenção, como pedir exclusão: coordenação).
- `/conta` → seção "Notificações": lista `GET /notificacoes` (assunto, tipo legível, status enviado/pendente/cancelado/falha, data) e preferências `GET/PATCH /notificacoes/preferencias` com `Interruptor` por tipo (tipos obrigatórios — convite e recuperação — aparecem travados como "sempre enviado").

Commit `feat(front): recuperar senha, notificações e consentimento LGPD`.

---

## Task 5: Roteiro de defesa (`docs/defesa-g1.md`, versionado)

Escrito **depois** de tudo mergeado, lendo o código final (modelo capaz). Conteúdo:
1. **Como rodar a demo** (contas do seed, ritual do dia: purge + redeploy), roteiro de clique por fluxo: login por papel → funil → mover A (aprovar entrega → avançar) → mover B (409 RN-01 → forçar com observação) → dashboard (1 atrasada) → convite da Letícia (`/convite`) → aluno envia entrega → mentor avalia → CSV → anotação interna → recuperar senha.
2. **Estrutura (aula 03, 5 perguntas)** com caminhos reais: onde vivem contas/jornada/tarefas/notificações; onde mora a RN-01 (`domain/transicao.ts` + `equipe.model.transicionar`); quantos arquivos mudam para renomear um campo de tarefa (contar de verdade); front só via API (rewrite `/api`); README.
3. **Banco × requisitos (16 perguntas)** — cada resposta com tabela/coluna/constraint/`ON DELETE`/query e `arquivo:linha`.
4. **Mudança de requisito (etapas extras por equipe)** — por que foi descartada, o que quebraria (CHECK/`etapa_atual_id`/histórico), e como seria (tabela de jornada por equipe com ordem).
5. **Os 5 problemas no NOSSO monolito** — onde cada um aparece (deploy tudo-ou-nada que vivemos no Coolify; escala acoplada; o worker de e-mail já isolado em processo próprio como mitigação do Problema 3; acoplamento; CSV com teto de linhas e o banco compartilhado — Problema 5) e o que mudaria na migração de novembro.
6. **Checklist do G1** (resource único, banco do professor no schema da dupla, seed com cada item) com evidências.

Commit `docs: roteiro de defesa do G1`.
