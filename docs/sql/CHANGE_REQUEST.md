# CHANGE_REQUEST — mudanças de schema pendentes de DBA

> **Histórico.** Desde 2026-09-17 o banco é versionado por `prisma migrate`
> (`backend/prisma/migrations/`) e o backend aplica o próprio DDL — não há mais
> fila de CR para o DBA. Mudança de schema agora é model + migration no PR.

---

## CR-001 — Novo valor de enum `emails.tipo`: `convite_conta`

- **Status:** ✅ aplicada em `20260917120100_constraints_triggers_indices`
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

### Nota

O valor `convite_conta` já nasce na constraint criada pela migration
`20260917120100_constraints_triggers_indices`, em qualquer ambiente.
