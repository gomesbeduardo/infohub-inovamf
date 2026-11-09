# Handoff: configuração completa do Resend (Coolify + conta)

> **Documento histórico.** Este texto foi escrito para o deploy no Coolify, que não existe mais: o projeto roda só localmente. Onde ele manda usar o Coolify, o `nixpacks.toml` ou o `.env.example` da raiz, leia assim: a chave `RESEND_API_KEY` (e `EMAIL_FROM`, `APP_URL`) vai em `backend/.env`, que não é versionado, e o modelo é `backend/.env.example`. Os arquivos `nixpacks.toml`, `railpack.json` e `.env.example` da raiz foram removidos.

> Complementa o [`resend.md`](resend.md), que cobre o código: integrar o worker da branch `feat/email-worker` com a fila de `staging`.
> Este arquivo trata só da **configuração**: conta Resend, variáveis no Coolify, deploy e teste.
>
> Antes de mexer, siga a seção "Handoff" do [`AGENTS.md`](../../AGENTS.md): ler, explicar de volta, planejar e esperar o OK.

## 0. Estado em 24/09

- **Worker ainda fora de `staging` e `main`.** O código do envio está só em `feat/email-worker` (commit `89b0c66`). Enquanto ele não for integrado, os e-mails entram na tabela `emails` com status `pendente` e **nada é enviado**. As variáveis abaixo podem ser cadastradas antes, porque não quebram nada.
- **Chave atual exposta.** Uma chave do Resend foi compartilhada num chat em 24/09 e deve ser tratada como **comprometida**:
  - revogue-a no painel do Resend;
  - gere uma nova (passo 1);
  - cadastre a nova direto no Coolify.
- **Sem domínio próprio.** O projeto ainda não tem domínio de e-mail, então o Resend roda em **modo de teste** (passo 3).

## 1. Conta e chave no Resend

A conta é do dono do produto. O dev recebe acesso ao painel, não a chave em texto.

1. Entre em https://resend.com, em **API Keys** → **Create API Key**:
   - Nome: `infohub-coolify`
   - Permissão: **Sending access** (só envio, não Full access)
   - Domain: *All domains*, enquanto não houver domínio verificado
2. Copie a chave (começa com `re_`). Ela aparece **uma única vez**.
3. Cole **direto no Coolify** (passo 2). Nunca coloque a chave em:
   - repositório, `.env` versionado, commit, PR ou issue;
   - chat, print, log;
   - documento compartilhado.
4. Revogue qualquer chave antiga ou exposta (**API Keys → ⋯ → Revoke**).

## 2. Variáveis de ambiente no Coolify

Onde: projeto do InfoHub → resource da aplicação (**o único resource**, com front e back juntos) → **Environment Variables**.

| Variável | Valor | Segredo? | Para que serve |
|---|---|---|---|
| `RESEND_API_KEY` | a chave `re_…` do passo 1 | **Sim**: marcar *Is Secret* / *Locked* | Autentica o envio. Sem ela, o worker fica ocioso |
| `EMAIL_FROM` | `InfoHub <onboarding@resend.dev>` | Não | Remetente. Sem domínio verificado, **tem** de ser `onboarding@resend.dev` |
| `APP_URL` | a URL pública do app, **sem barra no fim** | Não | Monta os links absolutos dos e-mails (`/convite?token=…`, `/redefinir-senha?token=…`) |

Sobre o `APP_URL`:
- Hoje vale `http://localhost:3000`.
- Se o domínio genérico `http://localhost:3000` estiver ativo no Coolify (Manage Domains), prefira ele. A avaliação é às cegas, então nada com nome da dupla.
- Não confunda com o campo **Domains** do Coolify. Esse campo é só o endereço em que o site responde; o `APP_URL` precisa ser cadastrado à parte.

Sobre as variáveis:
- **Não use `CORS_ORIGIN`** no lugar do `APP_URL`. No deploy ele é `*`, que não é URL, e o `env.ts` do worker ignora esse valor.
- As variáveis que já existem (`DATABASE_URL`, `JWT_SECRET`, `SEED_DEMO` etc.) **não mudam**.
- **Build Variable / Runtime:** as três são de **runtime** (lidas pelo backend no boot). Deixe *Available at Buildtime* desmarcado para a chave.

Depois de salvar, é preciso um **Redeploy** (ou Restart) para o container receber as variáveis.

## 3. Modo de teste (sem domínio verificado)

Com `EMAIL_FROM` = `onboarding@resend.dev`, o Resend **só entrega para o e-mail dono da conta Resend**. Envios para outros destinatários voltam com erro 403 (*"You can only send testing emails to your own email address"*).

Consequências:
- **Na demonstração,** crie a conta de teste (aluno ou convite) com o **e-mail do dono da conta Resend** e mostre o e-mail chegando.
- As contas `@demo.infohub.dev` e `admin@infohub.dev` são fictícias e **devem ser bloqueadas no worker** (ver `resend.md`), para não gastar cota nem gerar falhas em massa.
- O worker deve marcar esses envios como `falha`, com a mensagem do Resend, sem derrubar o lote.

## 4. Quando houver domínio próprio (pós-aprovação)

1. No Resend, em **Domains** → **Add Domain**, use um subdomínio de envio (ex.: `mail.<dominio>`).
2. Crie no DNS os registros que o Resend mostrar (SPF `TXT`, DKIM `TXT`/`CNAME`, MX de retorno) e espere o status **Verified**.
3. Recomendado: registro DMARC (`_dmarc` `TXT`, começando com `p=none`).
4. No Coolify, troque `EMAIL_FROM` para `InfoHub <nao-responda@mail.<dominio>>` e faça redeploy.
5. Opcional: gere uma chave nova restrita a esse domínio e revogue a de *All domains*.

## 5. Checklist de ativação

- [ ] Worker integrado em `staging` (PR revisado), promovido para `main`.
- [ ] Chave nova criada (Sending access) e a antiga exposta revogada.
- [ ] `RESEND_API_KEY` (segredo), `EMAIL_FROM` e `APP_URL` cadastrados no resource.
- [ ] Redeploy concluído (*Success*).
- [ ] Runtime Logs mostram `[worker] enviando a fila de e-mail via resend…`. Se aparecer `[worker] sem RESEND_API_KEY/EMAIL_FROM…`, a variável não chegou ao container.
- [ ] Teste controlado: um convite ou "esqueci a senha" para o **e-mail do dono da conta Resend**. O e-mail chega, e o link abre no `APP_URL` certo.
- [ ] No painel do Resend (**Emails**), o envio aparece como *Delivered*. No banco, a linha em `emails` está `enviado`.
- [ ] **Nada de teste com contas reais de alunos em produção.**

## 6. Problemas comuns

| Sintoma | Causa provável | Correção |
|---|---|---|
| Log diz que o worker está ocioso | Variável ausente ou sem redeploy | Conferir nomes exatos e fazer redeploy |
| `401` / `invalid API key` | Chave revogada, errada ou com espaço | Gerar outra e colar de novo no Coolify |
| `403` "only send testing emails to your own email" | Modo de teste com destinatário ≠ dono da conta | Usar o e-mail do dono, ou verificar um domínio (passo 4) |
| `422` / *invalid from* | `EMAIL_FROM` fora do formato ou de domínio não verificado | `InfoHub <onboarding@resend.dev>` |
| Link do e-mail abre `localhost:3000` | `APP_URL` ausente | Cadastrar `APP_URL` e fazer redeploy |
| Link abre um domínio que dá 404 | `APP_URL` aponta para um domínio que não está no Manage Domains | Usar o domínio ativo, ou adicioná-lo no Coolify e reiniciar |
