-- CreateTable
CREATE TABLE "alunos" (
    "usuario_id" UUID NOT NULL,
    "curso" VARCHAR(120),
    "semestre" VARCHAR(20),
    "matricula" VARCHAR(30),
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alunos_pkey" PRIMARY KEY ("usuario_id")
);

-- CreateTable
CREATE TABLE "anotacoes_internas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "equipe_id" UUID NOT NULL,
    "etapa_id" SMALLINT,
    "autor_id" UUID NOT NULL,
    "conteudo" TEXT NOT NULL,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anotacoes_internas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "areas_ideia" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(80) NOT NULL,
    "ordem" SMALLINT NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "areas_ideia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arquivos_entrega" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entrega_id" UUID NOT NULL,
    "tipo" VARCHAR(10) NOT NULL,
    "nome_original" VARCHAR(255),
    "url_externa" VARCHAR(500),
    "mime_type" VARCHAR(100),
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "arquivos_entrega_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avaliacoes_entrega" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entrega_id" UUID NOT NULL,
    "avaliador_id" UUID NOT NULL,
    "resultado" VARCHAR(15) NOT NULL,
    "comentario" TEXT,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avaliacoes_entrega_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ciclos" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(60) NOT NULL,
    "data_inicio" DATE NOT NULL,
    "data_fim" DATE,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ciclos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consentimentos_lgpd" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "versao_politica" VARCHAR(20) NOT NULL,
    "aceito" BOOLEAN NOT NULL,
    "ip_origem" INET,
    "user_agent" TEXT,
    "registrado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consentimentos_lgpd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emails" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tipo" VARCHAR(40) NOT NULL,
    "destinatario_id" UUID,
    "destinatario_email" VARCHAR(255) NOT NULL,
    "assunto" VARCHAR(255) NOT NULL,
    "template" VARCHAR(80),
    "dados_template" JSONB,
    "equipe_id" UUID,
    "tarefa_id" UUID,
    "status" VARCHAR(15) NOT NULL DEFAULT 'pendente',
    "tentativas" SMALLINT NOT NULL DEFAULT 0,
    "agendado_para" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enviado_em" TIMESTAMPTZ(6),
    "erro" TEXT,
    "provider_message_id" VARCHAR(255),
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encontros" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "equipe_id" UUID NOT NULL,
    "etapa_id" SMALLINT,
    "mentor_id" UUID,
    "data_hora" TIMESTAMPTZ(6) NOT NULL,
    "local_ou_link" VARCHAR(255),
    "status" VARCHAR(20) NOT NULL DEFAULT 'agendado',
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "encontros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entregas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tarefa_id" UUID NOT NULL,
    "versao" SMALLINT NOT NULL,
    "enviado_por" UUID NOT NULL,
    "comentario" TEXT,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entregas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipe_membros" (
    "equipe_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "papel" VARCHAR(15) NOT NULL DEFAULT 'integrante',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "entrou_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "saiu_em" TIMESTAMPTZ(6),

    CONSTRAINT "equipe_membros_pkey" PRIMARY KEY ("equipe_id","usuario_id")
);

-- CreateTable
CREATE TABLE "equipes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nome_ideia" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "descricao_ideia" TEXT NOT NULL,
    "area_id" INTEGER,
    "estagio_ideia" VARCHAR(30) NOT NULL,
    "origem_divulgacao" VARCHAR(120),
    "mentor_id" UUID,
    "ciclo_id" INTEGER,
    "etapa_atual_id" SMALLINT NOT NULL DEFAULT 1,
    "status" VARCHAR(25) NOT NULL DEFAULT 'ativa',
    "pronta_inovamf_em" TIMESTAMPTZ(6),
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etapas" (
    "id" SMALLINT NOT NULL,
    "numero" SMALLINT NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "descricao" TEXT,
    "entregavel" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "etapas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_etapas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "equipe_id" UUID NOT NULL,
    "etapa_origem_id" SMALLINT,
    "etapa_destino_id" SMALLINT NOT NULL,
    "movido_por" UUID,
    "forcado" BOOLEAN NOT NULL DEFAULT false,
    "observacao" TEXT,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historico_etapas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lembretes_tarefa" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tarefa_id" UUID NOT NULL,
    "dias_antes" SMALLINT,
    "data_especifica" DATE,
    "disparado_em" TIMESTAMPTZ(6),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lembretes_tarefa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log_auditoria" (
    "id" BIGSERIAL NOT NULL,
    "usuario_id" UUID,
    "entidade" VARCHAR(50) NOT NULL,
    "entidade_id" VARCHAR(64) NOT NULL,
    "acao" VARCHAR(40) NOT NULL,
    "dados_anteriores" JSONB,
    "dados_novos" JSONB,
    "ip_origem" INET,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modelos_tarefa" (
    "id" SERIAL NOT NULL,
    "etapa_id" SMALLINT NOT NULL,
    "titulo" VARCHAR(150) NOT NULL,
    "descricao" TEXT,
    "obrigatoria" BOOLEAN NOT NULL DEFAULT true,
    "prazo_padrao_dias" SMALLINT DEFAULT 7,
    "ordem" SMALLINT NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "modelos_tarefa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preferencias_notificacao" (
    "usuario_id" UUID NOT NULL,
    "tipo" VARCHAR(40) NOT NULL,
    "habilitado" BOOLEAN NOT NULL DEFAULT true,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "preferencias_notificacao_pkey" PRIMARY KEY ("usuario_id","tipo")
);

-- CreateTable
CREATE TABLE "tarefas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "equipe_id" UUID NOT NULL,
    "etapa_id" SMALLINT NOT NULL,
    "modelo_id" INTEGER,
    "titulo" VARCHAR(150) NOT NULL,
    "descricao" TEXT,
    "obrigatoria" BOOLEAN NOT NULL DEFAULT true,
    "data_entrega" DATE NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pendente',
    "criado_por" UUID,
    "concluida_em" TIMESTAMPTZ(6),
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tarefas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens_acesso" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "tipo" VARCHAR(10) NOT NULL DEFAULT 'acesso',
    "token_pai_id" UUID,
    "token_hash" CHAR(64) NOT NULL,
    "escopos" TEXT[] DEFAULT ARRAY['app']::TEXT[],
    "user_agent" TEXT,
    "ip_origem" INET,
    "expira_em" TIMESTAMPTZ(6) NOT NULL,
    "ultimo_uso_em" TIMESTAMPTZ(6),
    "revogado_em" TIMESTAMPTZ(6),
    "motivo_revogacao" VARCHAR(40),
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_acesso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens_senha" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "finalidade" VARCHAR(20) NOT NULL DEFAULT 'recuperacao',
    "ip_origem" INET,
    "expira_em" TIMESTAMPTZ(6) NOT NULL,
    "usado_em" TIMESTAMPTZ(6),
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_senha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nome" VARCHAR(150) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "senha" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "telefone" VARCHAR(20) NOT NULL,
    "tipo_usuario" VARCHAR(20) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "convite_aceito_em" TIMESTAMPTZ(6),
    "email_verificado_em" TIMESTAMPTZ(6),
    "ultimo_login_em" TIMESTAMPTZ(6),
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "excluido_em" TIMESTAMPTZ(6),

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_anotacoes_equipe" ON "anotacoes_internas"("equipe_id", "criado_em" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "areas_ideia_nome_key" ON "areas_ideia"("nome");

-- CreateIndex
CREATE INDEX "idx_arquivos_entrega" ON "arquivos_entrega"("entrega_id");

-- CreateIndex
CREATE INDEX "idx_avaliacoes_entrega" ON "avaliacoes_entrega"("entrega_id", "criado_em" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ciclos_nome_key" ON "ciclos"("nome");

-- CreateIndex
CREATE INDEX "idx_emails_destinatario" ON "emails"("destinatario_id", "criado_em" DESC);

-- CreateIndex
CREATE INDEX "idx_encontros_equipe" ON "encontros"("equipe_id", "data_hora");

-- CreateIndex
CREATE INDEX "idx_entregas_tarefa" ON "entregas"("tarefa_id", "versao" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "uq_entrega_versao" ON "entregas"("tarefa_id", "versao");

-- CreateIndex
CREATE UNIQUE INDEX "uq_equipes_slug" ON "equipes"("slug");

-- CreateIndex
CREATE INDEX "idx_equipes_ciclo" ON "equipes"("ciclo_id");

-- CreateIndex
CREATE INDEX "idx_equipes_mentor" ON "equipes"("mentor_id");

-- CreateIndex
CREATE UNIQUE INDEX "etapas_numero_key" ON "etapas"("numero");

-- CreateIndex
CREATE INDEX "idx_historico_equipe" ON "historico_etapas"("equipe_id", "criado_em" DESC);

-- CreateIndex
CREATE INDEX "idx_auditoria_data" ON "log_auditoria"("criado_em" DESC);

-- CreateIndex
CREATE INDEX "idx_auditoria_entidade" ON "log_auditoria"("entidade", "entidade_id", "criado_em" DESC);

-- CreateIndex
CREATE INDEX "idx_tarefas_equipe" ON "tarefas"("equipe_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_tokens_acesso_hash" ON "tokens_acesso"("token_hash");

-- CreateIndex
CREATE INDEX "idx_tokens_acesso_pai" ON "tokens_acesso"("token_pai_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_tokens_senha_hash" ON "tokens_senha"("token_hash");

-- CreateIndex
CREATE INDEX "idx_tokens_senha_usuario" ON "tokens_senha"("usuario_id", "expira_em");

-- CreateIndex
CREATE UNIQUE INDEX "uq_usuarios_email" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "uq_usuarios_slug" ON "usuarios"("slug");

-- AddForeignKey
ALTER TABLE "alunos" ADD CONSTRAINT "alunos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "anotacoes_internas" ADD CONSTRAINT "anotacoes_internas_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "anotacoes_internas" ADD CONSTRAINT "anotacoes_internas_equipe_id_fkey" FOREIGN KEY ("equipe_id") REFERENCES "equipes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "anotacoes_internas" ADD CONSTRAINT "anotacoes_internas_etapa_id_fkey" FOREIGN KEY ("etapa_id") REFERENCES "etapas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "arquivos_entrega" ADD CONSTRAINT "arquivos_entrega_entrega_id_fkey" FOREIGN KEY ("entrega_id") REFERENCES "entregas"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "avaliacoes_entrega" ADD CONSTRAINT "avaliacoes_entrega_avaliador_id_fkey" FOREIGN KEY ("avaliador_id") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "avaliacoes_entrega" ADD CONSTRAINT "avaliacoes_entrega_entrega_id_fkey" FOREIGN KEY ("entrega_id") REFERENCES "entregas"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consentimentos_lgpd" ADD CONSTRAINT "consentimentos_lgpd_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "emails" ADD CONSTRAINT "emails_destinatario_id_fkey" FOREIGN KEY ("destinatario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "emails" ADD CONSTRAINT "emails_equipe_id_fkey" FOREIGN KEY ("equipe_id") REFERENCES "equipes"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "emails" ADD CONSTRAINT "emails_tarefa_id_fkey" FOREIGN KEY ("tarefa_id") REFERENCES "tarefas"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "encontros" ADD CONSTRAINT "encontros_equipe_id_fkey" FOREIGN KEY ("equipe_id") REFERENCES "equipes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "encontros" ADD CONSTRAINT "encontros_etapa_id_fkey" FOREIGN KEY ("etapa_id") REFERENCES "etapas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "encontros" ADD CONSTRAINT "encontros_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_enviado_por_fkey" FOREIGN KEY ("enviado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_tarefa_id_fkey" FOREIGN KEY ("tarefa_id") REFERENCES "tarefas"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "equipe_membros" ADD CONSTRAINT "equipe_membros_equipe_id_fkey" FOREIGN KEY ("equipe_id") REFERENCES "equipes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "equipe_membros" ADD CONSTRAINT "equipe_membros_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "equipes" ADD CONSTRAINT "equipes_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas_ideia"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "equipes" ADD CONSTRAINT "equipes_ciclo_id_fkey" FOREIGN KEY ("ciclo_id") REFERENCES "ciclos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "equipes" ADD CONSTRAINT "equipes_etapa_atual_id_fkey" FOREIGN KEY ("etapa_atual_id") REFERENCES "etapas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "equipes" ADD CONSTRAINT "equipes_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "historico_etapas" ADD CONSTRAINT "historico_etapas_equipe_id_fkey" FOREIGN KEY ("equipe_id") REFERENCES "equipes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "historico_etapas" ADD CONSTRAINT "historico_etapas_etapa_destino_id_fkey" FOREIGN KEY ("etapa_destino_id") REFERENCES "etapas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "historico_etapas" ADD CONSTRAINT "historico_etapas_etapa_origem_id_fkey" FOREIGN KEY ("etapa_origem_id") REFERENCES "etapas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "historico_etapas" ADD CONSTRAINT "historico_etapas_movido_por_fkey" FOREIGN KEY ("movido_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lembretes_tarefa" ADD CONSTRAINT "lembretes_tarefa_tarefa_id_fkey" FOREIGN KEY ("tarefa_id") REFERENCES "tarefas"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "log_auditoria" ADD CONSTRAINT "log_auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "modelos_tarefa" ADD CONSTRAINT "modelos_tarefa_etapa_id_fkey" FOREIGN KEY ("etapa_id") REFERENCES "etapas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "preferencias_notificacao" ADD CONSTRAINT "preferencias_notificacao_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_equipe_id_fkey" FOREIGN KEY ("equipe_id") REFERENCES "equipes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_etapa_id_fkey" FOREIGN KEY ("etapa_id") REFERENCES "etapas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_modelo_id_fkey" FOREIGN KEY ("modelo_id") REFERENCES "modelos_tarefa"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tokens_acesso" ADD CONSTRAINT "tokens_acesso_token_pai_id_fkey" FOREIGN KEY ("token_pai_id") REFERENCES "tokens_acesso"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tokens_acesso" ADD CONSTRAINT "tokens_acesso_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tokens_senha" ADD CONSTRAINT "tokens_senha_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

