-- Objetos que o `schema.prisma` não modela (CHECK, índices parciais/expressão e
-- triggers de timestamp). Fonte: docs/sql/infohub_schema.sql.
-- Não use `prisma migrate dev` sem reler este arquivo: o Prisma não conhece
-- estes objetos e pode gerar DROPs deles no diff.

-- ---------------------------------------------------------------- funções
CREATE OR REPLACE FUNCTION fn_atualiza_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------- usuarios
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_tipo_usuario_check"
    CHECK (tipo_usuario IN ('admin', 'mentor', 'aluno'));

CREATE INDEX "idx_usuarios_tipo" ON "usuarios" (tipo_usuario) WHERE ativo;

CREATE TRIGGER trg_usuarios_ts BEFORE UPDATE ON "usuarios"
    FOR EACH ROW EXECUTE FUNCTION fn_atualiza_timestamp();

-- ------------------------------------------------------------ tokens_senha
ALTER TABLE "tokens_senha" ADD CONSTRAINT "tokens_senha_finalidade_check"
    CHECK (finalidade IN ('recuperacao', 'convite'));

-- ----------------------------------------------------------- tokens_acesso
ALTER TABLE "tokens_acesso" ADD CONSTRAINT "tokens_acesso_tipo_check"
    CHECK (tipo IN ('acesso', 'refresh'));
ALTER TABLE "tokens_acesso" ADD CONSTRAINT "tokens_acesso_motivo_revogacao_check"
    CHECK (motivo_revogacao IN ('logout', 'refresh', 'troca_senha',
                                'expirado', 'admin', 'suspeita'));
ALTER TABLE "tokens_acesso" ADD CONSTRAINT "ck_tokens_acesso_validade"
    CHECK (expira_em > criado_em);

CREATE INDEX "idx_tokens_acesso_usuario" ON "tokens_acesso" (usuario_id, tipo)
    WHERE revogado_em IS NULL;
CREATE INDEX "idx_tokens_acesso_expira" ON "tokens_acesso" (expira_em)
    WHERE revogado_em IS NULL;

-- ------------------------------------------------------------------ ciclos
ALTER TABLE "ciclos" ADD CONSTRAINT "ck_ciclos_periodo"
    CHECK (data_fim IS NULL OR data_fim >= data_inicio);

-- ----------------------------------------------------------------- equipes
ALTER TABLE "equipes" ADD CONSTRAINT "equipes_estagio_ideia_check"
    CHECK (estagio_ideia IN ('ideia', 'prototipo',
                             'mvp_desenvolvimento', 'mvp_pronto'));
ALTER TABLE "equipes" ADD CONSTRAINT "equipes_status_check"
    CHECK (status IN ('ativa', 'pronta_inovamf',
                      'encaminhada_inovamf', 'pausada', 'desistente'));

CREATE INDEX "idx_equipes_etapa" ON "equipes" (etapa_atual_id) WHERE status = 'ativa';
CREATE INDEX "idx_equipes_busca" ON "equipes" USING gin (to_tsvector('portuguese', nome_ideia));

CREATE TRIGGER trg_equipes_ts BEFORE UPDATE ON "equipes"
    FOR EACH ROW EXECUTE FUNCTION fn_atualiza_timestamp();

-- ---------------------------------------------------------- equipe_membros
ALTER TABLE "equipe_membros" ADD CONSTRAINT "equipe_membros_papel_check"
    CHECK (papel IN ('lider', 'integrante'));

CREATE UNIQUE INDEX "uq_equipe_lider" ON "equipe_membros" (equipe_id)
    WHERE papel = 'lider' AND ativo;
CREATE INDEX "idx_membros_usuario" ON "equipe_membros" (usuario_id) WHERE ativo;

-- ------------------------------------------------------ anotacoes_internas
CREATE TRIGGER trg_anotacoes_ts BEFORE UPDATE ON "anotacoes_internas"
    FOR EACH ROW EXECUTE FUNCTION fn_atualiza_timestamp();

-- --------------------------------------------------------------- encontros
ALTER TABLE "encontros" ADD CONSTRAINT "encontros_status_check"
    CHECK (status IN ('agendado', 'confirmado', 'realizado',
                      'cancelado', 'remarcado'));

-- ----------------------------------------------------------------- tarefas
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_status_check"
    CHECK (status IN ('pendente', 'em_andamento', 'entregue',
                      'atrasada', 'aprovada', 'ajustar'));

CREATE INDEX "idx_tarefas_prazo" ON "tarefas" (data_entrega)
    WHERE status IN ('pendente', 'em_andamento');

CREATE TRIGGER trg_tarefas_ts BEFORE UPDATE ON "tarefas"
    FOR EACH ROW EXECUTE FUNCTION fn_atualiza_timestamp();

-- -------------------------------------------------------- arquivos_entrega
ALTER TABLE "arquivos_entrega" ADD CONSTRAINT "arquivos_entrega_tipo_check"
    CHECK (tipo IN ('arquivo', 'link'));
ALTER TABLE "arquivos_entrega" ADD CONSTRAINT "ck_arquivo_origem"
    CHECK (tipo = 'link' AND url_externa IS NOT NULL);

-- ------------------------------------------------------ avaliacoes_entrega
ALTER TABLE "avaliacoes_entrega" ADD CONSTRAINT "avaliacoes_entrega_resultado_check"
    CHECK (resultado IN ('aprovada', 'ajustar'));

-- -------------------------------------------------------- lembretes_tarefa
ALTER TABLE "lembretes_tarefa" ADD CONSTRAINT "ck_lembrete_regra"
    CHECK ((dias_antes IS NOT NULL AND data_especifica IS NULL) OR
           (dias_antes IS NULL AND data_especifica IS NOT NULL));

CREATE INDEX "idx_lembretes_pendentes" ON "lembretes_tarefa" (tarefa_id)
    WHERE ativo AND disparado_em IS NULL;

-- ------------------------------------------------------------------ emails
-- Inclui CR-001 (`convite_conta`) — ver docs/sql/CHANGE_REQUEST.md.
ALTER TABLE "emails" ADD CONSTRAINT "emails_tipo_check" CHECK (tipo IN (
    'novo_cadastro_admin', 'convite_equipe', 'nova_tarefa',
    'prazo_proximo', 'prazo_vencido', 'entrega_recebida_admin',
    'entrega_aprovada', 'entrega_ajustar',
    'tarefa_atrasada_admin', 'lembrete_manual',
    'recuperacao_senha', 'boas_vindas', 'convite_conta'));
ALTER TABLE "emails" ADD CONSTRAINT "emails_status_check"
    CHECK (status IN ('pendente', 'enviado', 'falha', 'cancelado'));

CREATE INDEX "idx_emails_fila" ON "emails" (agendado_para) WHERE status = 'pendente';
