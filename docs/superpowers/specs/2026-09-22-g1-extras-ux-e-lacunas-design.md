# G1 — Extras de UX e lacunas de requisito (design)

**Data:** 22/09/2026 · **Demo G1:** 24/09 à noite · **Base:** `main` 332a8b8 (em produção)

## Contexto

A auditoria do documento de requisitos contra o código em produção encontrou 47 itens:
- 30 atendidos;
- 8 adiados por decisão (e-mail real, LGPD, upload, backup);
- 7 parciais;
- 2 não atendidos.

Os três requisitos do slide do G1 estão cumpridos.

Este design fecha as lacunas que aparecem numa demo ao vivo e acrescenta melhorias de UX aprovadas com o dono do produto.

**Princípio:** o mínimo que atende, sem over-engineering. **Nenhuma migration nova**: tudo usa tabelas que já existem no banco do professor (`log_auditoria`, `tokens_senha`, `emails`).

## Fora de escopo

- Celebração animada ao avançar de etapa (recusada).
- Datas de lembrete por tarefa (RF-17), que dependem do envio real de e-mail (Plano 4).
- "Lida/não lida" persistida no banco.
- Backup (RNF-07), que vira documentação no roteiro de defesa.

## Parte A: lacunas de requisito

### A1. Gestão da equipe (RF-08/09, Q6, RF-20)
- **Admin**, no detalhe da equipe: card "Gestão" com dois seletores.
  - **Mentor:** mentores ativos, ou "sem mentor".
  - **Status:** `ativa`, `pausada`, `desistente`, `encaminhada_inovamf`.
  - `encaminhada_inovamf` só é aceita quando o status atual é `pronta_inovamf`. Caso contrário, o backend responde 409 `TRANSICAO_INVALIDA`.
  - `pronta_inovamf` não é escolhida aqui: ela continua vindo da movimentação de etapa (RN-01/RN-02).
  - Usa `PATCH /equipes/:slug`, que já existe e é só do admin, ajustado para validar essas transições.
- **Admin e mentor da equipe:** botão "Enviar lembrete", com mensagem opcional de até 500 caracteres, chamando `POST /equipes/:slug/lembrete`, que já existe.
- Toda mudança grava auditoria (A4).

### A2. RN-02 de verdade
- Mover para "pronta" exige duas coisas:
  - as três tarefas da Etapa 6 criadas a partir dos modelos "Pitch vídeo", "Business Model Canvas final" e "Value Proposition Design final" com status `aprovada`;
  - todos os integrantes ativos com convite aceito.
- Se faltar algo, a resposta é **409 `RN02_PENDENCIAS`**, com a lista do que falta, no mesmo formato de `details` da RN-01. O front reusa o `DialogoMover`: mostra as pendências e permite **forçar com observação obrigatória**, exatamente como na RN-01, dentro da mesma transação com `FOR UPDATE`.
- A regra pura fica em `backend/src/domain`, com testes unitários.

### A3. Senha e status da tarefa
- **Redefinição pelo admin (RF-01):**
  - `POST /usuarios/:slug/redefinir-senha` (admin) cria um token de uso único em `tokens_senha` (`finalidade = "recuperacao"`, validade de 24 h) e devolve `{ link, expiraEm }`.
  - O link é relativo (`/redefinir-senha?token=…`) e o `CopiarLink` completa com a origem.
  - `POST /auth/redefinir-senha` recebe `{ token, senha }`, valida o hash, se já foi usado e se expirou, troca a senha e revoga os refresh tokens.
  - A tela `/redefinir-senha` tem `PasswordInput` + confirmação, com mínimo de 8 caracteres.
  - Na tela Contas, cada conta ativa ganha o botão "Redefinir senha".
  - A tela "recuperar senha" continua dizendo "fale com a coordenação", que agora tem como resolver.
- **Tarefa "em andamento" (RF-12):**
  - `POST /tarefas/:slug/iniciar`, só para aluno da equipe e só a partir de `pendente`, leva a tarefa a `em_andamento`.
  - O aluno vê o botão "Comecei" na tarefa pendente.
  - Enviar uma entrega continua levando a `entregue`.

### A4. Log de auditoria (RNF-05)
- Helper `registrarAuditoria(db, { usuarioId, entidade, entidadeId, acao, antes?, depois? })`, chamado **dentro da mesma transação** de cada ação:
  - mudança de etapa ou status (inclusive forçada, com a observação);
  - mentor atribuído;
  - entrega enviada;
  - avaliação (aprovada ou ajustar, com o comentário);
  - lembrete enviado;
  - senha redefinida pelo admin (sem dados sensíveis).
- `ip_origem` é `req.ip`, que já é o IP real (`trust proxy`).

### A5. Linha do tempo (RF-08, RNF-05 visível)
- `GET /equipes/:slug/linha-do-tempo` junta `historico_etapas` e `log_auditoria` da equipe, de suas tarefas e de suas entregas, ordenado do mais novo para o mais antigo.
- Formato: `{ data: [{ tipo, titulo, detalhe?, autor?, em }] }`, sem UUIDs.
- Escopo:
  - admin: tudo;
  - mentor: só as próprias equipes;
  - aluno: só a própria equipe, **sem** anotações internas e sem observações de movimento forçado.

## Parte B: melhorias de UX

### B1. Notificações in-app (sino)
- **Onde:** um sino no `AppShell`, para todos os papéis.
- **Painel:** usa `GET /notificacoes`, que já existe. Mostra ícone por tipo, texto curto, tempo relativo ("há 2 h") e um link para a tela certa.
- **Não lidas:** o contador compara com o horário da última abertura do painel, guardado no `localStorage` com chave por usuário (`infohub-notif-vista:<slug>`), com try/catch. Consulta a cada 60 s e ao focar a janela.
- **Backend:** avaliar entrega passa a enfileirar `entrega_aprovada` ou `entrega_ajustar` para os alunos ativos da equipe.
- **Seed demo:** cria de 3 a 4 notificações realistas por perfil de demo, de forma idempotente, com status `cancelado` para nunca serem enviadas por e-mail.
- **Anotado para o Plano 4:** o worker deve ignorar destinatários `@demo.infohub.dev`.

### B2. Feedback das ações
- **Toast (DS):**
  - `ToastProvider` + `useToast().sucesso(msg)`, com `aria-live="polite"`.
  - Some em 4 s e pode ser fechado. Fica embaixo no celular e em cima à direita no desktop.
  - A animação usa a `.toast-in` que já existe, só com `motion-safe`.
  - É **só para sucesso**; os erros continuam inline.
  - Mensagens específicas, disparadas depois de:
    - criar tarefa;
    - enviar entrega;
    - avaliar;
    - mover etapa;
    - mudar mentor ou status;
    - enviar lembrete;
    - adicionar integrante;
    - salvar perfil;
    - trocar senha;
    - criar conta;
    - gerar link de redefinição.
- **Skeleton (DS):**
  - Um `Skeleton` com pulso `motion-safe`, no lugar de "Carregando…".
  - Telas: funil, detalhe da equipe, tarefas (aluno e mentor), dashboard, minha equipe e contas.

### B3. Clareza de progresso
- **Card "Próximo passo" (aluno, Minha equipe):**
  - Mostra a etapa atual e as pendências para avançar, que vêm do backend (as mesmas da RN-01; na Etapa 6, as da RN-02). Cada item leva direto à tarefa.
  - Sem pendências: "Tudo entregue — aguardando a avaliação do mentor".
- **Chips de prazo** nas listas de tarefas:
  - "vence hoje", "vence em N dias", "atrasada há N dias".
  - O *status* vem do backend (RN-04); o front só formata a diferença de dias.
- **Linha do tempo:**
  - Admin e mentor a veem no detalhe da equipe.
  - O aluno vê a versão resumida em Minha equipe.

### B4. Busca rápida (Ctrl+K / ⌘K)
- **Para quem:** admin e mentor. Abre pelo atalho ou pelo ícone de lupa no topo.
- **O que busca:** equipes (pelo nome da ideia) e, só para o admin, pessoas (nome ou e-mail), usando os endpoints de lista que já existem, com o escopo do papel.
- **Navegação:** setas e Enter, e Esc fecha.
- **Acessibilidade:** diálogo com foco preso e rótulos.

## Erros e acessibilidade
- Os erros da API continuam em `ApiError.message`, via `role="alert"`, perto da ação.
- Toda interação nova funciona por teclado e tem foco visível.
- Novas animações respeitam `prefers-reduced-motion`.
- Cores só por tokens do DS.

## Testes
- **Backend** (supertest + unit), para cada endpoint novo ou alterado:
  - caminho feliz;
  - 403 de escopo;
  - 409 das regras;
  - auditoria gravada na mesma transação;
  - linha do tempo sem dados internos para aluno.
- **Frontend** (Vitest + Testing Library):
  - toast e skeleton;
  - sino (contador, abrir zera);
  - card "Próximo passo";
  - chips de prazo;
  - gestão da equipe;
  - redefinição de senha;
  - Ctrl+K (abrir, filtrar, Enter navega).

## Entrega em blocos (um PR por bloco, com aprovação entre blocos)
- **E1, backend:** A2, A3, A4, A5, notificação de avaliação (B1), ajuste do `PATCH` (A1) e seed de notificações.
- **E2, DS + sino:** toast, skeleton e sino.
- **E3, telas:** gestão da equipe e lembrete, linha do tempo, próximo passo, chips de prazo, redefinição de senha, botão "Comecei", toasts e skeletons aplicados nas telas.
- **E4, busca rápida:** Ctrl+K.

Depois de E4: promoção `staging` → `main`, *purge* da demo + redeploy (o cenário volta limpo, já com as notificações), e smoke.

## Adendo (23/09)

Aprovado com o dono do produto depois do merge do E1. Os princípios são os mesmos:
- o mínimo que atende;
- **nenhuma migration nova**;
- regra de negócio só no backend;
- nunca UUID na API.

### Mesa do mentor (RF-22, B3)
- **Onde:** em `/orientador`, no topo da "Visão geral", acima dos indicadores. São três blocos:
  - **Para avaliar:**
    - Mostra as tarefas com status `entregue` das equipes do mentor.
    - Cada item traz o nome da equipe, o título da tarefa, a versão e há quanto tempo foi enviada ("v2 enviada há 2 h").
    - Um clique abre o detalhe da equipe já na aba Tarefas (`?aba=tarefas`), onde se avalia.
  - **Prazos:**
    - Mostra as tarefas atrasadas e as que vencem nos próximos 7 dias.
    - O status vem do backend: RN-04 na consulta, com "hoje" em America/Sao_Paulo.
    - A tela mostra os chips de prazo do B3.
  - **Minhas equipes:** um cartão por equipe em andamento (sem desistentes e sem as já encaminhadas ao InovAMF), com:
    - a etapa, no `StageProgress`;
    - os integrantes ativos;
    - "faltam N itens para avançar", que é a contagem das pendências que o backend já calcula para a RN-01/RN-02;
    - o título e a data do último evento da linha do tempo.
- **Admin:** o painel `/admin` ganha "Para avaliar" e "Prazos" de todas as equipes, acima dos indicadores.
- **Backend:** um endpoint só, `GET /dashboard/agenda`.
  - Serve admin e mentor. O mentor só vê as próprias equipes, pelo mesmo escopo do dashboard.
  - Responde `{ data: { paraAvaliar, prazos, equipes } }`, só com slugs.
  - Cada lista tem **no máximo 20 itens**, filtrados e ordenados no banco (prazo mais antigo primeiro).
  - Os cartões reaproveitam as funções do detalhe (pendências) e da linha do tempo (último evento), fazendo algumas consultas por equipe. Isso é aceitável porque um mentor tem poucas equipes e a lista tem teto.
  - Pelo mesmo motivo, o admin recebe `equipes` vazia.

### Pedido de redefinição de senha (RF-01)
- **Tela:**
  - "Recuperar senha" ganha o campo de e-mail e o botão "Pedir redefinição".
  - Depois de enviar, a tela mostra a confirmação genérica e mantém a orientação "a coordenação vai te enviar um link".
  - Isso substitui o "fale com a coordenação" de A3.
- **Backend:** `POST /auth/pedido-redefinicao` recebe `{ email }` e responde **sempre 202 com o mesmo corpo**, exista ou não a conta, sem enumeração.
  - Uma falha interna ao registrar também responde 202.
  - O e-mail malformado recebe 400.
  - Tem limite de 5 pedidos por 15 min por IP + e-mail, contando os 202 (o limitador do login ignora respostas de sucesso).
- **Com conta ativa e convite aceito:**
  - cada admin ativo recebe uma notificação `recuperacao_senha` com status `cancelado` (nunca vira e-mail);
  - os `dados` levam nome, e-mail e slug de quem pediu;
  - ela aparece no sino, e o link leva a `/admin/contas`, onde o admin usa "Redefinir senha" (A3).
- **Dedupe:** no máximo um pedido por conta por hora.
- **Auditoria:** a ação `redefinicao_solicitada` é gravada na **mesma transação** dos avisos, sem autor (o pedido é anônimo) e sem dados sensíveis.
- **Nenhum e-mail é enviado:** o envio real fica para o Bloco C / Plano 4.

### Testes do adendo
- **Backend** (supertest, `tests/helpers.ts`):
  - agenda: escopo do mentor, a ordem e o status efetivo dos prazos, o cartão (pendências, integrantes, último evento), nenhum UUID, a visão do admin (pertença + teto) e 403 do aluno;
  - pedido: 202 idêntico para conta existente, inexistente, pendente e inativa, aviso cancelado para admins ativos, dedupe de 1 h, auditoria e 400;
  - rate limit contando os 202.
- **Frontend:** os três blocos e os estados de carregamento, erro e vazio, os links `?aba=tarefas`, o painel do admin só com dois blocos, a aba inicial do detalhe e o formulário do pedido.

### Entrega
- **Backend:** num PR próprio e pequeno para `staging`, antes do E2 ou junto com ele. Não toca arquivos do E2.
- **Telas:** no E3, depois dos toasts e skeletons, dentro do PR do E3.
