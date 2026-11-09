# Handoff: envio real de e-mail com Resend (worker isolado)

> **Documento histórico.** Este texto foi escrito para o deploy no Coolify, que não existe mais: o projeto roda só localmente. Onde ele manda usar o Coolify, o `nixpacks.toml` ou o `.env.example` da raiz, leia assim: a chave `RESEND_API_KEY` (e `EMAIL_FROM`, `APP_URL`) vai em `backend/.env`, que não é versionado, e o modelo é `backend/.env.example`. Os arquivos `nixpacks.toml`, `railpack.json` e `.env.example` da raiz foram removidos.

> **Configuração (conta Resend, variáveis no Coolify, teste):** ver [`resend-config.md`](resend-config.md).

> **Como trabalhar (obrigatório, ver `AGENTS.md`):** leia este documento inteiro, **explique ao dev** o que foi decidido e por quê (seção "Decisões e porquês"), **escreva um plano** em `docs/superpowers/plans/` e **só programe depois do OK**.
>
> **Para quem vai assumir.** Antes de começar:
> - leia `AGENTS.md`, com as convenções do projeto. Regra crítica: **todo PR mira `staging`**, nunca `main`;
> - suba o ambiente local pelo `README.md`.
>
> A LGPD está em [`lgpd.md`](lgpd.md).

## Objetivo

Os e-mails que o sistema já enfileira devem ser enviados de verdade (RF-18/19). O envio roda num **processo separado da API** (RNF-06, o "Problema 3" das aulas): se o Resend cair ou o worker morrer, login e entregas continuam no ar.

## Decisões e porquês

Estas decisões foram tomadas com o dono do produto. Antes de mudar alguma, converse com ele (veja `AGENTS.md`).

1. **O worker é um processo separado da API, mas no mesmo resource do Coolify.**
   - É a resposta ao "Problema 3" das aulas (falha isolada): se o Resend ou o worker cair, login, entregas e sino continuam no ar.
   - O "mesmo resource" é exigência da avaliação (um resource com front e back). Por isso ele sobe como terceiro processo no `scripts/start-all.mjs`, e não como outro serviço.
2. **A fila é a tabela `emails`, sem Redis nem serviço de fila.**
   - A tabela já existe, é persistente (sobrevive a restart e a deploy) e é a mesma que o sino lê.
   - Uma fila externa seria infraestrutura nova para um volume minúsculo: over-engineering.
3. **`FOR UPDATE SKIP LOCKED` + lease + `Idempotency-Key`.**
   - Dois workers (por exemplo, durante um deploy) nunca pegam o mesmo e-mail.
   - Se o processo morrer no meio, o lease devolve o e-mail à fila.
   - A chave de idempotência impede que o Resend envie duas vezes numa nova tentativa.
4. **Resend via `fetch`, sem SDK.** Uma dependência a menos, e nos testes basta injetar um provedor falso (`ProvedorEmail`).
5. **Sem chave, o worker fica ocioso, não falha.**
   - O ambiente local, a CI e um deploy sem a variável continuam funcionando.
   - Convites e redefinições seguem por link copiável, que é o fluxo de hoje.
6. **Nunca enviar para `@demo.infohub.dev` nem para `admin@infohub.dev`.**
   - São endereços fictícios do seed. Enviar gera bounce, e bounces derrubam a reputação da conta Resend.
   - Nas contas de teste isso ainda tem limite de envio.
7. **Os links saem relativos da API e o worker monta a URL com `APP_URL`.**
   - Ainda não há domínio próprio, e a origem muda entre local e produção.
   - No app, quem copia o link completa com a origem do navegador; no e-mail, a origem vem do `APP_URL`.
8. **Convite e recuperação ignoram a preferência de e-mail.** Sem eles a pessoa não consegue entrar na conta. Os demais tipos respeitam o RF-21.
9. **A chave vive só no Coolify.** É um segredo da conta do dono do produto.
10. **Modo de teste do Resend no G1**, sem bloquear a entrega por falta de domínio verificado. Um envio controlado para o e-mail do dono basta para demonstrar.

## Estado atual

**A fila já existe e já é alimentada.** A API grava linhas na tabela `emails` (`backend/prisma/schema.prisma`, model `emails`), mas **ninguém envia**. Pontos de enfileiramento em `staging`:

| Tipo | Onde |
|---|---|
| `convite_conta` | `convite.controller.ts`, `equipe.controller.ts` (inscrição e novo integrante), `usuario.controller.ts` (conta criada pelo admin) |
| `novo_cadastro_admin` | `equipe.controller.ts` (nova ideia avisa os admins) |
| `entrega_recebida_admin` | `entrega.controller.ts` |
| `nova_tarefa` | `tarefa.controller.ts` |
| `lembrete_manual` | `notificacao.controller.ts` ("Enviar lembrete" do admin ou mentor) |
| avaliação de entrega, pedido de redefinição | ver `backend/src/models/email.model.ts` |

**Linhas criadas já como `cancelado` nunca devem ser enviadas.** Elas só alimentam o sino de notificações do app:
- as notificações do seed da demo;
- os avisos de "pedido de redefinição de senha" para os admins (`registrarPedidoRedefinicao` em `email.model.ts`).

O worker só deve pegar linhas `pendente`.

**O sino do app** (`GET /notificacoes`) lê essa mesma tabela. Enviar ou não enviar não muda o sino.

**A API de preferências existe** (`GET/PATCH /notificacoes/preferencias`, RF-21), mas o front **não tem tela** para ela.

**Links:** convites e redefinição de senha geram links **relativos** (`/convite?token=…`, `/redefinir-senha?token=…`). No app, quem gera o link o copia com `window.location.origin`. No e-mail, o link precisa ficar absoluto, então **`APP_URL` é obrigatório**.

## O que já está pronto: branch `feat/email-worker`

O commit `89b0c66` está publicado no GitHub, mas foi criado **a partir de um `staging` antigo** (antes dos Planos 3 e 5). Ele traz 13 arquivos e cerca de 800 linhas:

- `backend/src/email/provedor.ts`: adaptador do Resend via `fetch` (sem SDK). Faz `POST https://api.resend.com/emails` com `Idempotency-Key` igual ao id do e-mail. Sem `RESEND_API_KEY` ou `EMAIL_FROM`, devolve `null` e o worker fica ocioso.
- `backend/src/email/templates.ts`: HTML e texto por tipo, com escape de conteúdo. O rodapé diz "Você recebeu este e-mail porque participa do InfoHub. Preferências: `<APP_URL>/conta`".
- `backend/src/email/processar.ts`: processa um lote.
  - Reserva com `FOR UPDATE SKIP LOCKED` e um lease de 5 min em `agendado_para`, para que dois workers nunca peguem o mesmo e-mail.
  - Respeita as preferências. Os tipos obrigatórios (`convite_conta`, `recuperacao_senha`) ignoram a preferência. Preferência desligada vira `cancelado` com motivo `preferencia_desligada`.
  - Em falha, tenta de novo com backoff (2, 4, 8 e 16 min), até `MAX_TENTATIVAS = 5`, e depois marca `falha`.
- `backend/src/worker.ts`: loop a cada 15 s, com encerramento limpo em SIGINT/SIGTERM.
- `backend/src/models/email.model.ts`: `reservarLote`, `carregarParaEnvio`, `preferenciaDesligada`, `marcarEnviado`, `marcarCancelado` e `registrarFalha`.
- `backend/src/env.ts`: `resendApiKey`, `emailFrom` e `appUrl`. O `appUrl` usa `CORS_ORIGIN` como padrão, ou então `http://localhost:3000`.
- `backend/package.json`: `worker` (`node dist/worker.js`) e `worker:dev` (`tsx watch src/worker.ts`).
- `scripts/start-all.mjs`: sobe o worker como terceiro processo, no mesmo resource do Coolify.
- `backend/tests/email.test.ts`: cerca de 230 linhas, com um provedor falso.
- `backend/.env.example` e `README.md` atualizados (o `.env.example` da raiz foi removido). O `nixpacks.toml` também foi alterado, mas **o arquivo foi removido**, então ignore essa mudança.

## O que falta (em ordem)

### 1. Rebase de `feat/email-worker` sobre `staging`

Conflitos esperados:
- `scripts/start-all.mjs`: o de hoje sobe o Express em `127.0.0.1:3333` e o Next em `$PORT`. Acrescente o worker **sem** mudar essas portas.
- `backend/src/models/email.model.ts`: o `staging` ganhou `registrarPedidoRedefinicao` e `JANELA_PEDIDO_REDEFINICAO_MS`. Mantenha os dois.
- `backend/src/env.ts`, `README.md` e `backend/.env.example`: mescle.
- `nixpacks.toml`: descarte; o arquivo não existe mais.

### 2. Não enviar para contas de demonstração (obrigatório)

Todo o seed de demo usa o domínio `@demo.infohub.dev` (`DEMO_DOMINIO` em `backend/src/seed/demo.ts`), que não existe de verdade.
- No worker, antes de enviar, cancele com o motivo `destinatario_demo` quando o `destinatario_email` terminar em `@demo.infohub.dev`. Faça o mesmo para o admin base `admin@infohub.dev` (`backend/src/seed/base.ts`).
- Teste: um e-mail para `x@demo.infohub.dev` fica `cancelado` e o provedor falso **não** é chamado.

### 3. Links absolutos nos templates

Monte `${env.appUrl}${caminho}` para os links relativos de convite e redefinição. Teste que o HTML contém `APP_URL + /convite?token=`.

### 4. Tipos novos desde o branch

Confirme que `templates.ts` tem um template para **todos** os tipos que o `staging` enfileira (tabela acima), inclusive `lembrete_manual` e o de avaliação de entrega. Tipo sem template deve virar `falha` com mensagem clara, e não derrubar o lote.

### 5. Resend

- **Conta e chave:** a conta Resend é do dono do produto. A chave (`RESEND_API_KEY`) **vive só no Coolify**, em Environment Variables e marcada como segredo. **Nunca** no repositório, em issue, PR ou chat.
- **Remetente (`EMAIL_FROM`):** sem domínio verificado, o Resend só entrega do remetente de teste (`onboarding@resend.dev`) e **apenas para o e-mail da própria conta Resend**. Isso serve para a demonstração, mandando para o e-mail do dono.
  - Para enviar a qualquer aluno, é preciso verificar um domínio ou subdomínio (registros DNS SPF/DKIM no Resend).
  - Hoje **não há domínio próprio**: ele só existirá se o projeto for aprovado.
  - Conclusão: para o G1, use o modo de teste. Não bloqueie a entrega por causa do domínio.
- **`APP_URL` no Coolify:** a URL pública, hoje `http://localhost:3000`, sem barra no fim.

### 6. Deploy

- O worker sobe junto pelo `start-all.mjs`, no **mesmo resource** do Coolify. É requisito da avaliação: um resource só, com front e back.
- Nos Runtime Logs do Coolify, procure `[worker] enviando a fila de e-mail via resend…`. Se aparecer `[worker] sem RESEND_API_KEY/EMAIL_FROM…`, o worker está ocioso e o sistema segue normal.
- **Não faça teste em produção** com contas reais de alunos. Teste local com o provedor falso, e depois um envio controlado para o e-mail do dono.

### 7. Opcional (RF-21, desejável)

Tela de preferências em `/conta`, com um interruptor por tipo. Os tipos obrigatórios aparecem travados como "sempre enviado". A API já existe.

## Critérios de pronto

- [ ] `feat/email-worker` rebaseado sobre `staging`, com `npm test` e `npm run typecheck` do backend e `npm test` e `npm run build` do front verdes.
- [ ] Contas `@demo.infohub.dev` e `admin@infohub.dev` nunca chamam o Resend, com teste.
- [ ] Links absolutos com `APP_URL`, com teste.
- [ ] Todo tipo enfileirado tem template, ou vira `falha` sem derrubar o lote.
- [ ] Linhas `cancelado` (sino e seed) nunca são enviadas.
- [ ] PR para `staging` descrevendo as variáveis do Coolify (`RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`), **sem os valores**.
- [ ] Depois do merge e da promoção: nos logs, o worker aparece ativo, e um e-mail de teste chega ao endereço do dono.

## Para a defesa

- **"E se o Resend cair?"** O worker é um processo separado que só lê a fila. A API apenas enfileira, então login, entregas e o sino seguem funcionando. O e-mail tenta de novo com backoff e, depois de 5 falhas, fica marcado como `falha`, com a mensagem de erro guardada.
- **"E se dois workers rodarem ao mesmo tempo?"** O `FOR UPDATE SKIP LOCKED` e o lease impedem que dois workers peguem o mesmo e-mail, e a `Idempotency-Key` impede envio duplicado no Resend.
