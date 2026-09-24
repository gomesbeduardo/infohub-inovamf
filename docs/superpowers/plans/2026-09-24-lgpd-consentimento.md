# Plano: aceite dos Termos de Uso + consentimento LGPD no cadastro e no convite

Recorte da **Task 1 (parte de consentimento) + Task 2 (política + checkbox)** de
[`docs/handoff/lgpd.md`](../../handoff/lgpd.md), ampliado com **Termos de Uso
versionados no banco** a pedido do dono do produto (24/09). A anonimização
(`POST /usuarios/:slug/anonimizar`) e a ação em Contas **ficam para outro PR**.

Branch `feat/lgpd-consentimento` (de `staging`), PR para `staging`.

## Mudança de decisão: agora há migration

O handoff dizia "nenhuma migration" (decisão 4). O dono do produto pediu uma
tabela de termos, então entra **uma migration só de criação**
(`20260924000000_termos_uso`): duas tabelas novas, sem alterar nenhuma
existente, e o seed da primeira versão dentro da própria migration (como as
etapas em `seed_referencia`). Ela sobe sozinha no deploy (`prisma migrate deploy`
no `npm start`).

## Modelo

- `termos_uso { id serial, versao unique, titulo, conteudo text, publicado_em }`:
  a vigente é a de `publicado_em` mais recente. Nova versão = novo INSERT.
  - Seed: versão `2026-09`, "Termos de Uso do InfoHub". O conteúdo é texto simples:
    blocos separados por linha em branco, e `## ` abre uma seção.
- `aceites_termos { usuario_id → usuarios (cascade), termo_id → termos_uso (restrict),
  ip_origem inet, user_agent, aceito_em }`, `unique(usuario_id, termo_id)`.
- `consentimentos_lgpd` (já existia): recebe a linha da Política de Privacidade
  (`versao_politica = "2026-09"`).

## Contratos

- `GET /termos/vigente` (pública) → `{ versao, titulo, conteudo, publicadoEm }`;
  404 se não houver versão publicada.
- `POST /equipes/inscricao` (líder) e `POST /auth/register` (aceite de convite,
  qualquer perfil) exigem `consentimento: true`.
  - Sem isso: **400 `CONSENTIMENTO_OBRIGATORIO`**. A checagem vem depois das
    validações que já existiam, então os códigos antigos continuam com prioridade.
  - Sem termos publicados: **503 `TERMOS_INDISPONIVEIS`**.
- Na **mesma transação** que cria (inscrição) ou ativa (aceite) a conta, grava
  1 linha em `aceites_termos` (termo vigente) e 1 em `consentimentos_lgpd`, as
  duas com IP (`ipDoChamador`) e `User-Agent`.
- Colegas cadastrados pelo líder **não** ganham linha na inscrição; consentem no
  próprio aceite (decisão 3 do handoff).

## Arquivos

**Backend:**
- `prisma/migrations/20260924000000_termos_uso/`;
- `schema.prisma`;
- `domain/lgpd.ts`;
- `models/termos.model.ts` (`findVigente`, `opsAceite`);
- `utils/aceite.ts` (`exigirAceite`);
- `controllers/termos.controller.ts`, `routes.ts`;
- alterações em `equipe.controller.ts`/`equipe.model.ts` (inscrição) e em
  `auth.controller.ts`/`token.model.ts` (aceite).

**Frontend:**
- `domain/termos.ts` (`blocosDoTexto`);
- `features/legal/` (`AceiteTermos`, `DocumentoLegal`, `TermosUso`, `Privacidade`);
- rotas `app/termos` e `app/privacidade`;
- checkbox em `CadastroForm` e `AceitarConviteForm`;
- `useTermosVigente`;
- links no rodapé da landing.

## Testes

- Backend:
  - `tests/lgpd.unit.test.ts` e `tests/termos.test.ts` (endpoint público; 400
    sem consentimento e nada gravado; linhas do líder com versão, IP e UA; 0
    linhas para os colegas; aceite do convite com e sem consentimento, sem
    queimar o convite);
  - os testes existentes de inscrição e register passaram a mandar
    `consentimento: true`.
- Frontend:
  - `tests/domain/termos.test.ts`;
  - `tests/components/termos.test.tsx`;
  - casos novos em `cadastro.test.tsx` e `convite.test.tsx` (o checkbox bloqueia o
    envio; o corpo leva `consentimento: true`; os links abrem em nova aba).

## Riscos / fora do escopo

- Contas já existentes (seed e produção) não têm linha de aceite. Não pedimos
  novo aceite no login neste PR; a versão guardada permite fazer isso depois.
- Não há tela de admin para publicar uma nova versão dos termos: por enquanto é
  um INSERT (nova migration).
