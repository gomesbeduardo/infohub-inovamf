# CHANGE_REQUEST — mudanças de schema pendentes de DBA

> O backend **nunca** roda DDL (regra #1–#4 do `plan-backend.md`). Toda necessidade
> de coluna/tabela/valor novo é registrada aqui e aguarda o DBA aplicar na base
> gerenciada. Ao aplicar, o DBA também atualiza `docs/sql/infohub_schema.sql`.

---

## CR-001 — Novo valor de enum `emails.tipo`: `convite_conta`

- **Status:** ⏳ aguardando DBA
- **Solicitado por:** time backend — 2026-09-10
- **Motivo / RF:** RF-03 (admin cria contas de admin/mentor). A criação de conta
  não define senha: gera um **convite de uso único** enviado por e-mail, onde a
  pessoa vê seus dados e define a própria senha. Esse e-mail precisa ser
  enfileirado em `emails`, mas o `CHECK (tipo IN (...))` atual **não tem** um valor
  para "convite de conta". Os valores existentes não servem semanticamente
  (`boas_vindas` é pós-ativação; `recuperacao_senha` é recuperação;
  `convite_equipe` é convite para equipe, não para criar conta).
- **Impacto se não aplicado:** o `INSERT` do e-mail de convite falha no CHECK.
  Em produção, **o convite não é enviado** até esta CR ser aplicada. A criação do
  `usuario` + token de convite funciona; só o enfileiramento do e-mail fica travado.

### DDL proposto

```sql
-- Postgres não altera CHECK in-place: recria a constraint incluindo o novo valor.
ALTER TABLE emails DROP CONSTRAINT emails_tipo_check;
ALTER TABLE emails ADD CONSTRAINT emails_tipo_check CHECK (tipo IN (
    'novo_cadastro_admin', 'convite_equipe', 'nova_tarefa',
    'prazo_proximo', 'prazo_vencido', 'entrega_recebida_admin',
    'entrega_aprovada', 'entrega_ajustar',
    'tarefa_atrasada_admin', 'lembrete_manual',
    'recuperacao_senha', 'boas_vindas',
    'convite_conta'   -- << novo
));
```

### Nota de desenvolvimento local

Enquanto a CR está pendente, o DDL acima foi aplicado **apenas ao Postgres de
dev local** (`docker infohub-dev-db`, ver `backend/README.md`) para permitir
construir e testar o fluxo. Isso **não** toca em nenhuma base gerenciada e não
altera `docs/sql/infohub_schema.sql` — quem faz isso é o DBA ao aprovar a CR.
Como o Prisma não modela `CHECK`, o `db:check` continua verde.
