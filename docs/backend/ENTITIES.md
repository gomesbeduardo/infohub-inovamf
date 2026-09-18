# ENTITIES.md — inventário do schema InfoHub

> Gerado a partir de [`docs/sql/infohub_schema.sql`](../sql/infohub_schema.sql) (fonte de verdade do banco).
> Passo 1 do [`plan-backend.md`](../../plan-backend.md) §5/§10. **Ainda não foi codada nenhuma rota.**
>
> Convenção de tipos: PK marcada. `Slug` = a tabela tem coluna `slug` própria (o que a API pode
> expor no lugar do id). "NOT NULL sem default" = campos que o controller precisa exigir (senão vira 500 do Postgres).

---

## 1. Inventário de tabelas

| Tabela | Model (db pull) | PK | Slug? | NOT NULL sem default | CHECKs | Relações (FK) | RFs |
| ------ | --------------- | -- | ----- | -------------------- | ------ | ------------- | --- |
| `usuarios` | `usuarios` | `id` UUID | **sim** `slug` VARCHAR(100), único | `nome`, `email`, `senha`, `slug`, `telefone`, `tipo_usuario` | `tipo_usuario ∈ {admin,mentor,aluno}` | — | RF-01, RF-03 |
| `alunos` | `alunos` | `usuario_id` UUID (=PK/FK) | não | `usuario_id` | — | → `usuarios` (1:1, ON DELETE CASCADE) | RF-02 |
| `tokens_senha` | `tokens_senha` | `id` UUID | não | `usuario_id`, `token_hash`, `expira_em` | `finalidade ∈ {recuperacao,convite}` | → `usuarios` | RF-01 (recuperação), convite |
| `tokens_acesso` | `tokens_acesso` | `id` UUID | não | `usuario_id`, `token_hash`(CHAR 64), `expira_em` | `tipo ∈ {acesso,refresh}`; `motivo_revogacao ∈ {logout,refresh,troca_senha,expirado,admin,suspeita}`; `expira_em > criado_em` | → `usuarios`; auto-ref `token_pai_id` | Auth Bearer |
| `consentimentos_lgpd` | `consentimentos_lgpd` | `id` UUID | não | `usuario_id`, `versao_politica`, `aceito` | — | → `usuarios` | RNF-02 |
| `areas_ideia` | `areas_ideia` | `id` **SERIAL** | não | `nome` (único) | — | — | RF-04 (lista configurável) |
| `ciclos` | `ciclos` | `id` **SERIAL** | não | `nome` (único), `data_inicio` | `data_fim IS NULL OR data_fim >= data_inicio` | — | RF-24 |
| `etapas` | `etapas` | `id` **SMALLINT** | não | `id`, `numero` (único), `nome` | — | — | RF-06, RF-09 |
| `equipes` | `equipes` | `id` UUID | **sim** `slug` VARCHAR(120), único | `nome_ideia`, `slug`, `descricao_ideia`, `estagio_ideia` | `estagio_ideia ∈ {ideia,prototipo,mvp_desenvolvimento,mvp_pronto}`; `status ∈ {ativa,pronta_inovamf,encaminhada_inovamf,pausada,desistente}` | → `areas_ideia`, `usuarios`(mentor), `ciclos`, `etapas`(etapa_atual, default 1) | RF-02, RF-05, RF-06, RF-08 |
| `equipe_membros` | `equipe_membros` | (`equipe_id`,`usuario_id`) | não | ambos da PK | `papel ∈ {lider,integrante}` | → `equipes` (CASCADE), `usuarios` (RESTRICT) | RF-02, RNF-03 |
| `historico_etapas` | `historico_etapas` | `id` UUID | não | `equipe_id`, `etapa_destino_id` | — | → `equipes`, `etapas`(origem/destino), `usuarios`(movido_por) | RF-08, RF-09, RNF-05 |
| `anotacoes_internas` | `anotacoes_internas` | `id` UUID | não | `equipe_id`, `autor_id`, `conteudo` | — | → `equipes`, `etapas`, `usuarios`(autor) | RF-10 |
| `encontros` | `encontros` | `id` UUID | não | `equipe_id`, `data_hora` | `status ∈ {agendado,confirmado,realizado,cancelado,remarcado}` | → `equipes`, `etapas`, `usuarios`(mentor) | RF-06 (etapa 2) |
| `modelos_tarefa` | `modelos_tarefa` | `id` **SERIAL** | não | `etapa_id`, `titulo` | — | → `etapas` | RF-11 |
| `tarefas` | `tarefas` | `id` UUID | não | `equipe_id`, `etapa_id`, `titulo`, `data_entrega` | `status ∈ {pendente,em_andamento,entregue,atrasada,aprovada,ajustar}` | → `equipes`, `etapas`, `modelos_tarefa`, `usuarios`(criado_por) | RF-11, RF-12, RF-13 |
| `entregas` | `entregas` | `id` UUID | não | `tarefa_id`, `versao`, `enviado_por` | `UNIQUE(tarefa_id, versao)` | → `tarefas`, `usuarios`(enviado_por) | RF-14, RF-16 |
| `arquivos_entrega` | `arquivos_entrega` | `id` UUID | não | `entrega_id`, `tipo` | `tipo ∈ {arquivo,link}`; **`tipo='link' → url_externa NOT NULL`** | → `entregas` | RF-14, RNF-04 |
| `avaliacoes_entrega` | `avaliacoes_entrega` | `id` UUID | não | `entrega_id`, `avaliador_id`, `resultado` | `resultado ∈ {aprovada,ajustar}` | → `entregas`, `usuarios`(avaliador) | RF-15 |
| `lembretes_tarefa` | `lembretes_tarefa` | `id` UUID | não | `tarefa_id` | **XOR: `dias_antes` XOR `data_especifica`** | → `tarefas` | RF-17 |
| `emails` | `emails` | `id` UUID | não | `tipo`, `destinatario_email`, `assunto` | `tipo ∈ {12 tipos}`; `status ∈ {pendente,enviado,falha,cancelado}` | → `usuarios`(dest, SET NULL), `equipes`, `tarefas` | RF-18, RF-19, RF-20, RNF-06 |
| `preferencias_notificacao` | `preferencias_notificacao` | (`usuario_id`,`tipo`) | não | ambos da PK | — | → `usuarios` | RF-21 |
| `log_auditoria` | `log_auditoria` | `id` **BIGSERIAL** | não | `entidade`, `entidade_id`, `acao` | — | → `usuarios`(SET NULL) | RNF-05 |

---

## 2. DOMAINs → uniões de string TS

Não há `CREATE DOMAIN`; os valores vêm de `CHECK (... IN (...))`. Modelar como union literal:

```ts
export type TipoUsuario = "admin" | "mentor" | "aluno";
export type FinalidadeToken = "recuperacao" | "convite";
export type TipoTokenAcesso = "acesso" | "refresh";
export type MotivoRevogacao =
  | "logout" | "refresh" | "troca_senha" | "expirado" | "admin" | "suspeita";
export type EstagioIdeia = "ideia" | "prototipo" | "mvp_desenvolvimento" | "mvp_pronto";
export type StatusEquipe =
  | "ativa" | "pronta_inovamf" | "encaminhada_inovamf" | "pausada" | "desistente";
export type PapelMembro = "lider" | "integrante";
export type StatusEncontro =
  | "agendado" | "confirmado" | "realizado" | "cancelado" | "remarcado";
export type StatusTarefa =
  | "pendente" | "em_andamento" | "entregue" | "atrasada" | "aprovada" | "ajustar";
export type TipoArquivo = "arquivo" | "link";
export type ResultadoAvaliacao = "aprovada" | "ajustar";
export type StatusEmail = "pendente" | "enviado" | "falha" | "cancelado";
export type TipoEmail =
  | "novo_cadastro_admin" | "convite_equipe" | "nova_tarefa" | "prazo_proximo"
  | "prazo_vencido" | "entrega_recebida_admin" | "entrega_aprovada" | "entrega_ajustar"
  | "tarefa_atrasada_admin" | "lembrete_manual" | "recuperacao_senha" | "boas_vindas";
```

---

## 3. Índices que definem busca (GIN) e leitura

- **Único GIN:** `idx_equipes_busca ON equipes USING gin(to_tsvector('portuguese', nome_ideia))`.
  → RF-07 busca por nome da ideia é **full-text português** (`plainto_tsquery('portuguese', $q)`), **não** `unaccent`/`pg_trgm`.
- Não existem `pg_trgm` nem `citext` no schema. Extensões criadas: **`pgcrypto`** (gen_random_uuid) e **`unaccent`**.
- Índices parciais relevantes ao controller: líder único por equipe (`uq_equipe_lider WHERE papel='lider' AND ativo`),
  usuário ativo por tipo, tokens não-revogados, fila de e-mails pendentes, lembretes não disparados.

---

## 4. Tabelas de referência / seeded (somente leitura pela API)

- **`etapas`** — PK SMALLINT 1..6, **já vem seeded** (as 6 etapas da cartilha). A API só **lê**; nunca cria/edita.
- **`areas_ideia`**, **`ciclos`**, **`modelos_tarefa`** — dados de referência/templates; escrita só por admin (RF-04, RF-11, RF-24), se e quando houver rota. Populados pelo DBA/admin, não pelo fluxo do aluno.

---

## 5. Mapa recurso do plano → tabela(s) real(is)

| Recurso no plano §10 | Tabela(s) reais |
| -------------------- | --------------- |
| `usuarios` | `usuarios` (+ `alunos` para o subtipo aluno) |
| `equipes` | `equipes` (+ `equipe_membros`, `historico_etapas`, `anotacoes_internas`) |
| `etapas-funil` | `etapas` (SMALLINT, seeded, read-only) |
| `tarefas` | `tarefas` (+ `modelos_tarefa`, `lembretes_tarefa`) |
| `links-entrega` | `entregas` + `arquivos_entrega` (+ `avaliacoes_entrega`) |
| `convites` | **`tokens_senha` com `finalidade='convite'`** — não há tabela `convites` |
| `notificacoes` | `emails` (fila) + `preferencias_notificacao` |

---

## 6. Contratos do schema que o controller precisa espelhar (para falhar em 400, não 500)

- `arquivos_entrega`: se `tipo='link'`, `url_externa` obrigatória e **https** (plan §8). Não há storage de path para `tipo='arquivo'`.
- `lembretes_tarefa`: **exatamente um** de `dias_antes`/`data_especifica` (XOR).
- `ciclos`: `data_fim >= data_inicio`.
- `tokens_acesso`: `expira_em > criado_em`.
- `entregas`: `(tarefa_id, versao)` único → controller calcula próxima versão.
- Todo enum acima → whitelist no controller antes do INSERT/UPDATE.

---

## 7. Notas de autenticação vindas direto do schema (importantes)

- **`tokens_senha` (convite + recuperação): hash é bcrypt.** Salt aleatório ⇒ **não** dá para buscar linha por `token_hash`.
  O token bruto entregue ao cliente carrega o **`id` da linha**; validação = `SELECT by id` + `bcrypt.compare(bruto, token_hash)`.
- **`tokens_acesso` (acesso/refresh): hash é SHA-256** (determinístico) ⇒ lookup direto pelo índice único `uq_tokens_acesso_hash`.
  Rotação registra `token_pai_id` apontando para o refresh consumido (cadeia auditável).
- Sessão persistida em `tokens_acesso` (uma linha por credencial viva) permite revogar um dispositivo sem derrubar os demais.
