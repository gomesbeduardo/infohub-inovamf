# Plano LGPD (RNF-02): consentimento, política, exclusão e retenção

> **Como trabalhar (obrigatório, ver `AGENTS.md`):** leia este documento inteiro, **explique ao dev** o que foi decidido e por quê (seção "Decisões e porquês"), **escreva um plano** em `docs/superpowers/plans/` e **só programe depois do OK**.
>
> **Handoff.** Este documento é para quem vai assumir a LGPD. Antes de começar:
> - leia `AGENTS.md`, com as convenções do projeto. Regra crítica: **todo PR mira `staging`**, nunca `main`;
> - suba o ambiente local pelo `README.md`;
> - rode os testes do backend num schema separado (o banco é compartilhado entre os arquivos de teste). Nunca aponte os testes para o schema de desenvolvimento, porque o `seed.test` apaga a demo.
>
> O trabalho relacionado de e-mail está em [`resend.md`](resend.md). Os dois se encontram em um ponto: a anonimização precisa cancelar os e-mails pendentes da pessoa.

**Origem:** RNF-02 em `docs/Infohub_InovAMF_Requisitos.md:126`: *"Proteção de dados pessoais dos alunos conforme a LGPD (consentimento no cadastro, política de retenção e exclusão de dados)"*.

**Pergunta de defesa** (aula 03): *"aluno pede exclusão (LGPD). O que o modelo faz hoje com as entregas dele?"*

**Escopo:** não é critério do G1 (slides de avaliação: Coolify, banco do professor e seed). É requisito do produto e deve cair na defesa. Este plano é o **mínimo que cumpre o RNF-02**, sem over-engineering. É baseado no desenho do Plano 4 (Tasks 3 e 4), ajustado ao código atual.

**Um PR só** (`feat/lgpd`, base `staging`), com duas tasks e a doc. **Nenhuma migration:** `consentimentos_lgpd`, `usuarios.excluido_em` e as colunas `ip_origem` já existem.

## Estado atual (levantamento de 23/09)

**Já temos:**
- bcrypt com 12 rounds; nenhuma enumeração de conta (pedido de redefinição sempre 202);
- rate limit no acesso;
- auditoria na mesma transação, com IP;
- minimização: membros não veem e-mail nem telefone, e a landing e o CSV não expõem dado pessoal;
- desativação com revogação de sessões.

**Falta:**
- **Consentimento:** checkbox no cadastro e no convite; a tabela `consentimentos_lgpd` não é usada.
- **Política:** não existe `/privacidade`.
- **Exclusão:** não há exclusão nem anonimização; `excluido_em` nunca é gravado.
- **Retenção:** não há prazo definido para logs com IP, tokens e e-mails.

## Decisões e porquês

Estas decisões foram tomadas com o dono do produto. Antes de mudar alguma, converse com ele (veja `AGENTS.md`).

1. **Anonimizar, não apagar.**
   - A conta é referenciada por entregas, avaliações, histórico de etapas e auditoria. As FKs `NO ACTION`/`RESTRICT` impedem o `DELETE`, e apagar em cascata destruiria o trabalho da **equipe**, não só da pessoa.
   - A auditoria (RNF-05) exige saber que "alguém" fez aquela ação.
   - Para a LGPD, dado anonimizado deixa de ser dado pessoal (art. 12). Trocar os dados identificáveis cumpre a exclusão sem quebrar o sistema.
   - Isso também responde à pergunta da aula 03.
2. **Consentimento registrado com versão, data, IP e navegador.**
   - Pela LGPD, quem precisa provar o consentimento é o controlador (art. 8º, §2º). Um checkbox só no front não prova nada.
   - A versão (`2026-09`) permite pedir novo aceite se a política mudar.
3. **Cada colega consente no próprio aceite do convite, não na inscrição.**
   - O líder digita nome e e-mail dos colegas, mas não pode consentir por eles. Até o aceite existem só esses dois dados, e a política diz isso.
4. **Nenhuma migration.**
   - `consentimentos_lgpd`, `usuarios.excluido_em` e as colunas de IP já existem no schema do banco do professor.
   - Evitar migration na véspera da apresentação reduz o risco no banco compartilhado e mantém o seed estável.
5. **A anonimização é feita pelo admin, a pedido, e não pelo próprio aluno.**
   - É o mínimo que cumpre o RNF-02.
   - Deixa uma pessoa conferir os casos que exigem decisão humana: líder de equipe ativa, último admin.
   - O autosserviço (o aluno pedir na própria conta) fica para depois.
6. **Retenção primeiro como política escrita. O script de limpeza é opcional.**
   - O RNF-02 pede uma política de retenção. Para o G1 basta que ela exista e seja pública (`/privacidade`).
   - Um job agendado adicionaria infraestrutura sem ganho para a avaliação: sem over-engineering.
7. **O que ficou fora, e por quê.**
   - HTTPS depende de domínio próprio, que só vem se o projeto for aprovado.
   - O cookie `httpOnly` para o refresh token mexe na sessão inteira: risco alto na véspera.
   - Exportar os próprios dados é desejável, mas não está no RNF-02.

   Todos entram na defesa como "próximos passos".
8. **Contexto:** LGPD **não** é critério de nota do G1 (os slides pedem Coolify, o banco do professor e o seed). Mas é requisito do produto, e a banca pergunta.

## Task 1: Backend (consentimento + anonimização)

**Arquivos:**
- criar `backend/src/models/lgpd.model.ts` e `backend/tests/lgpd.test.ts`;
- `backend/src/domain/lgpd.ts`: `VERSAO_POLITICA = "2026-09"`, mais a regra pura de anonimização (nome, e-mail e telefone substitutos);
- alterar `equipe.controller.ts` (inscrição), `auth.controller.ts` (aceite de convite), `usuario.controller.ts` e `routes.ts`.

**Consentimento:**
- A inscrição (líder) e o aceite de convite (colegas) exigem `consentimento: true`. Sem isso: 400 `CONSENTIMENTO_OBRIGATORIO`.
- Grava `consentimentos_lgpd { usuario_id, versao_politica, aceito: true, ip_origem: ipDoChamador(req), user_agent }` **na mesma transação** que cria ou ativa a conta.
- Os colegas cadastrados pelo líder só consentem no próprio aceite. Até lá existem apenas nome e e-mail, e a política explica isso.

**`POST /usuarios/:slug/anonimizar` (só admin) → 200 `{ slug, anonimizadoEm }`, tudo numa transação:**
- A linha de `usuarios` **fica**: entregas, avaliações, histórico e auditoria apontam para ela. Apagar quebraria a rastreabilidade (RNF-05), e as FKs com NO ACTION/RESTRICT impediriam o DELETE.
- Troca os dados pessoais:
  - `nome = "Pessoa removida"`;
  - `email = "removido+<slug>@anonimo.invalid"`;
  - `telefone = ""`;
  - `senha` = hash aleatório;
  - `ativo = false`;
  - `excluido_em = now()`.
- Apaga `alunos` (curso, semestre, matrícula).
- Revoga `tokens_acesso` e `tokens_senha`.
- Cancela os `emails` pendentes para ela e limpa `dados_template` desses e-mails.
- Encerra os vínculos em `equipe_membros` (`ativo = false`, `saiu_em = now()`).
- **Entregas ficam** (são da equipe), agora com autor "Pessoa removida".
- **Consentimentos ficam**, como prova do consentimento dado.
- Registra auditoria `usuario_anonimizado`, sem dado pessoal em `depois`.
- **Recusas:**
  - a si mesmo: 409 `PROPRIA_CONTA` (já existe);
  - último admin ativo: 409 `ULTIMO_ADMIN`;
  - líder de equipe ativa: 409 `LIDER_ATIVO` ("transfira a liderança antes").
- Aluno ou mentor chamando: 403.

**Testes** (dados do próprio arquivo, sem contagem global):
- sem consentimento: 400; com consentimento: 1 linha, com versão e IP, na inscrição e no convite;
- anonimizar integrante:
  - dados trocados e `alunos` apagado;
  - login com o e-mail antigo falha;
  - a entrega continua listada com autor "Pessoa removida";
  - a auditoria não guarda o nome;
- as três recusas e o 403.

## Task 2: Front (política + checkbox + ação em Contas)

**`/privacidade`:** página estática no visual da landing, com link no rodapé e nos formulários. Seções:
- dados coletados (conta, dados acadêmicos, conteúdo da ideia e das entregas, IP e navegador em logs);
- finalidade (acompanhar a jornada até o InovAMF);
- base legal: execução do programa e consentimento no cadastro; legítimo interesse para auditoria e segurança;
- quem vê (equipe, mentor da equipe, coordenação);
- retenção (tabela abaixo);
- direitos do titular (acesso, correção, exclusão) e como pedir: pela coordenação, com o contato da AMF que já está no rodapé;
- versão `2026-09`.

**Cadastro (`CadastroForm`) e convite (`AceitarConviteForm`):**
- checkbox obrigatório "Li e aceito a [Política de Privacidade](/privacidade)";
- sem marcar, erro no campo e nada é enviado;
- marcado, envia `consentimento: true`.

**Contas (`ContasAdmin`, no diálogo Editar):**
- ação "Anonimizar (LGPD)" com confirmação que explica o que some e o que fica;
- erro 409 inline com `ApiError.message`; toast só no sucesso.

**Testes:** o checkbox bloqueia o envio; o corpo leva `consentimento: true`; a página tem as seções; o diálogo de anonimizar chama a API e mostra o 409.

## Política de retenção (vai para `/privacidade`; script de limpeza opcional)

| Dado | Prazo | Como |
|---|---|---|
| Conta e dados acadêmicos | Enquanto o aluno participa do programa, e até a anonimização a pedido | `POST /usuarios/:slug/anonimizar` |
| Conteúdo da ideia e das entregas | Enquanto a equipe existir (é da equipe, não da pessoa) | Mantido, com autor anonimizado |
| `log_auditoria` (com IP) | 12 meses | Opcional: `npm run lgpd:expurgo` zera `ip_origem` com mais de 12 meses |
| Tokens de sessão e de senha expirados | Até expirar, mais 30 dias | Mesmo script opcional |
| Fila de `emails` | 90 dias depois de enviado ou cancelado | Mesmo script opcional |
| `consentimentos_lgpd` | Enquanto a conta existir (prova do consentimento) | Mantido |

Para o G1 basta a política escrita. O script `lgpd:expurgo` fica como tarefa pós-G1, a menos que sobre tempo.

## Fora do escopo: próximos passos para citar na defesa

- HTTPS em produção (hoje é HTTP no sslip.io).
- Refresh token em cookie `httpOnly`/`secure` em vez de `localStorage`.
- Cabeçalhos de segurança (helmet/HSTS) e `CORS_ORIGIN` explícito.
- Autosserviço do titular: exportar os próprios dados, corrigir curso/semestre e pedir exclusão pela própria conta.
- Tela de preferências de e-mail (a API `/notificacoes/preferencias` existe).

## Ordem e estimativa

1. Task 1 (backend): cerca de 1 bloco de subagente, mais review.
2. Task 2 (front): cerca de 1 bloco, mais review.
3. PR único para `staging`; depois, promoção para `main` e deploy (as fontes já são locais, então o build não depende de rede externa).

**Resposta de defesa pronta:** "Anonimizamos em vez de apagar. Os dados pessoais somem, mas as entregas continuam, porque são da equipe e sustentam a auditoria (RNF-05). O consentimento fica como prova."
