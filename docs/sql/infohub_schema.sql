CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";

CREATE OR REPLACE FUNCTION fn_atualiza_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE usuarios (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome                VARCHAR(150) NOT NULL,
    email               VARCHAR(255) NOT NULL,
    senha               VARCHAR(255) NOT NULL,
    slug                VARCHAR(100) NOT NULL,
    telefone            VARCHAR(20) NOT NULL,
    tipo_usuario        VARCHAR(20) NOT NULL
                        CHECK (tipo_usuario IN ('admin', 'mentor', 'aluno')),
    ativo               BOOLEAN NOT NULL DEFAULT TRUE,
    convite_aceito_em   TIMESTAMPTZ,
    email_verificado_em TIMESTAMPTZ,
    ultimo_login_em     TIMESTAMPTZ,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    excluido_em         TIMESTAMPTZ,
    CONSTRAINT uq_usuarios_email UNIQUE (email),
    CONSTRAINT uq_usuarios_slug  UNIQUE (slug)
);

CREATE INDEX idx_usuarios_tipo ON usuarios (tipo_usuario) WHERE ativo;
CREATE TRIGGER trg_usuarios_ts BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION fn_atualiza_timestamp();

CREATE TABLE alunos (
    usuario_id      UUID PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    curso           VARCHAR(120),
    semestre        VARCHAR(20),
    matricula       VARCHAR(30),
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tokens de recuperação de senha e convite.
-- token_hash guarda apenas o hash (bcrypt) do token; o valor bruto é
-- enviado ao usuário por e-mail e nunca persiste em texto claro.
-- NOTA (bcrypt): o salt é aleatório por hash, então NÃO se busca a linha
-- pelo token_hash. O token bruto entregue ao cliente deve carregar o `id`
-- desta linha; a validação faz SELECT por id e bcrypt.compare(bruto, token_hash).
CREATE TABLE tokens_senha (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token_hash      VARCHAR(255) NOT NULL,
    finalidade      VARCHAR(20) NOT NULL DEFAULT 'recuperacao'
                    CHECK (finalidade IN ('recuperacao', 'convite')),
    ip_origem       INET,
    expira_em       TIMESTAMPTZ NOT NULL,
    usado_em        TIMESTAMPTZ,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tokens_senha_hash UNIQUE (token_hash)
);

CREATE INDEX idx_tokens_senha_usuario ON tokens_senha (usuario_id, expira_em);

-- Tokens de acesso (Bearer): cada linha e uma credencial de login viva.
-- O cliente envia `Authorization: Bearer <token>` e o backend valida aqui,
-- o que permite revogar um dispositivo sem derrubar os demais.
-- Duas naturezas na mesma tabela, distinguidas por `tipo`:
--   'acesso'  -> curta duracao (~15 min), enviado em toda requisicao;
--   'refresh' -> longa duracao (dias), so trocado no endpoint de renovacao.
-- A renovacao insere um novo par apontando `token_pai_id` para o refresh
-- consumido, formando a cadeia de rotacao auditavel.
-- NOTA (hash): SHA-256 (deterministico), nao bcrypt, porque a validacao roda
-- a cada requisicao e precisa de lookup direto pelo indice unico. O token
-- bruto tem 256 bits de entropia aleatoria, entao nao depende de KDF lenta e
-- nunca e persistido.
CREATE TABLE tokens_acesso (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo            VARCHAR(10) NOT NULL DEFAULT 'acesso'
                    CHECK (tipo IN ('acesso', 'refresh')),
    token_pai_id    UUID REFERENCES tokens_acesso(id) ON DELETE SET NULL,
    token_hash      CHAR(64) NOT NULL,
    escopos         TEXT[] NOT NULL DEFAULT ARRAY['app'],
    user_agent      TEXT,
    ip_origem       INET,
    expira_em       TIMESTAMPTZ NOT NULL,
    ultimo_uso_em   TIMESTAMPTZ,
    revogado_em     TIMESTAMPTZ,
    motivo_revogacao VARCHAR(40)
                    CHECK (motivo_revogacao IN ('logout', 'refresh', 'troca_senha',
                                                'expirado', 'admin', 'suspeita')),
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tokens_acesso_hash UNIQUE (token_hash),
    CONSTRAINT ck_tokens_acesso_validade CHECK (expira_em > criado_em)
);

CREATE INDEX idx_tokens_acesso_usuario ON tokens_acesso (usuario_id, tipo)
    WHERE revogado_em IS NULL;
CREATE INDEX idx_tokens_acesso_pai    ON tokens_acesso (token_pai_id);
CREATE INDEX idx_tokens_acesso_expira ON tokens_acesso (expira_em) WHERE revogado_em IS NULL;

CREATE TABLE consentimentos_lgpd (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    versao_politica VARCHAR(20) NOT NULL,
    aceito          BOOLEAN NOT NULL,
    ip_origem       INET,
    user_agent      TEXT,
    registrado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE areas_ideia (
    id              SERIAL PRIMARY KEY,
    nome            VARCHAR(80) NOT NULL UNIQUE,
    ordem           SMALLINT NOT NULL DEFAULT 0,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE ciclos (
    id              SERIAL PRIMARY KEY,
    nome            VARCHAR(60) NOT NULL UNIQUE,
    data_inicio     DATE NOT NULL,
    data_fim        DATE,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_ciclos_periodo CHECK (data_fim IS NULL OR data_fim >= data_inicio)
);

CREATE TABLE etapas (
    id              SMALLINT PRIMARY KEY,
    numero          SMALLINT NOT NULL UNIQUE,
    nome            VARCHAR(100) NOT NULL,
    descricao       TEXT,
    entregavel      TEXT,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE equipes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_ideia          VARCHAR(150) NOT NULL,
    slug                VARCHAR(120) NOT NULL,
    descricao_ideia     TEXT NOT NULL,
    area_id             INTEGER REFERENCES areas_ideia(id),
    estagio_ideia       VARCHAR(30) NOT NULL
                        CHECK (estagio_ideia IN ('ideia', 'prototipo',
                                                 'mvp_desenvolvimento', 'mvp_pronto')),
    origem_divulgacao   VARCHAR(120),
    mentor_id           UUID REFERENCES usuarios(id),
    ciclo_id            INTEGER REFERENCES ciclos(id),
    etapa_atual_id      SMALLINT NOT NULL REFERENCES etapas(id) DEFAULT 1,
    status              VARCHAR(25) NOT NULL DEFAULT 'ativa'
                        CHECK (status IN ('ativa', 'pronta_inovamf',
                                          'encaminhada_inovamf', 'pausada', 'desistente')),
    pronta_inovamf_em   TIMESTAMPTZ,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_equipes_slug UNIQUE (slug)
);

CREATE INDEX idx_equipes_etapa    ON equipes (etapa_atual_id) WHERE status = 'ativa';
CREATE INDEX idx_equipes_mentor   ON equipes (mentor_id);
CREATE INDEX idx_equipes_ciclo    ON equipes (ciclo_id);
CREATE INDEX idx_equipes_busca    ON equipes USING gin (to_tsvector('portuguese', nome_ideia));
CREATE TRIGGER trg_equipes_ts BEFORE UPDATE ON equipes
    FOR EACH ROW EXECUTE FUNCTION fn_atualiza_timestamp();

CREATE TABLE equipe_membros (
    equipe_id       UUID NOT NULL REFERENCES equipes(id) ON DELETE CASCADE,
    usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    papel           VARCHAR(15) NOT NULL DEFAULT 'integrante'
                    CHECK (papel IN ('lider', 'integrante')),
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    entrou_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    saiu_em         TIMESTAMPTZ,
    PRIMARY KEY (equipe_id, usuario_id)
);

CREATE UNIQUE INDEX uq_equipe_lider ON equipe_membros (equipe_id)
    WHERE papel = 'lider' AND ativo;
CREATE INDEX idx_membros_usuario ON equipe_membros (usuario_id) WHERE ativo;

-- RN-03 / Q4: pendente de confirmação da coordenação.
-- CREATE OR REPLACE FUNCTION fn_valida_equipe_unica() RETURNS TRIGGER AS $$
-- BEGIN
--     IF NEW.ativo AND EXISTS (
--         SELECT 1 FROM equipe_membros m
--         JOIN equipes e ON e.id = m.equipe_id
--         WHERE m.usuario_id = NEW.usuario_id AND m.ativo
--           AND e.status = 'ativa' AND m.equipe_id <> NEW.equipe_id
--     ) THEN
--         RAISE EXCEPTION 'Aluno já participa de uma equipe ativa (RN-03)';
--     END IF;
--     RETURN NEW;
-- END; $$ LANGUAGE plpgsql;
--
-- CREATE TRIGGER trg_equipe_unica BEFORE INSERT OR UPDATE ON equipe_membros
--     FOR EACH ROW EXECUTE FUNCTION fn_valida_equipe_unica();

CREATE TABLE historico_etapas (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipe_id           UUID NOT NULL REFERENCES equipes(id) ON DELETE CASCADE,
    etapa_origem_id     SMALLINT REFERENCES etapas(id),
    etapa_destino_id    SMALLINT NOT NULL REFERENCES etapas(id),
    movido_por          UUID REFERENCES usuarios(id),
    forcado             BOOLEAN NOT NULL DEFAULT FALSE,
    observacao          TEXT,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_historico_equipe ON historico_etapas (equipe_id, criado_em DESC);

CREATE TABLE anotacoes_internas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipe_id       UUID NOT NULL REFERENCES equipes(id) ON DELETE CASCADE,
    etapa_id        SMALLINT REFERENCES etapas(id),
    autor_id        UUID NOT NULL REFERENCES usuarios(id),
    conteudo        TEXT NOT NULL,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_anotacoes_equipe ON anotacoes_internas (equipe_id, criado_em DESC);
CREATE TRIGGER trg_anotacoes_ts BEFORE UPDATE ON anotacoes_internas
    FOR EACH ROW EXECUTE FUNCTION fn_atualiza_timestamp();

CREATE TABLE encontros (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipe_id       UUID NOT NULL REFERENCES equipes(id) ON DELETE CASCADE,
    etapa_id        SMALLINT REFERENCES etapas(id),
    mentor_id       UUID REFERENCES usuarios(id),
    data_hora       TIMESTAMPTZ NOT NULL,
    local_ou_link   VARCHAR(255),
    status          VARCHAR(20) NOT NULL DEFAULT 'agendado'
                    CHECK (status IN ('agendado', 'confirmado', 'realizado',
                                      'cancelado', 'remarcado')),
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_encontros_equipe ON encontros (equipe_id, data_hora);

CREATE TABLE modelos_tarefa (
    id                  SERIAL PRIMARY KEY,
    etapa_id            SMALLINT NOT NULL REFERENCES etapas(id),
    titulo              VARCHAR(150) NOT NULL,
    descricao           TEXT,
    obrigatoria         BOOLEAN NOT NULL DEFAULT TRUE,
    prazo_padrao_dias   SMALLINT DEFAULT 7,
    ordem               SMALLINT NOT NULL DEFAULT 0,
    ativo               BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE tarefas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipe_id       UUID NOT NULL REFERENCES equipes(id) ON DELETE CASCADE,
    etapa_id        SMALLINT NOT NULL REFERENCES etapas(id),
    modelo_id       INTEGER REFERENCES modelos_tarefa(id),
    titulo          VARCHAR(150) NOT NULL,
    descricao       TEXT,
    obrigatoria     BOOLEAN NOT NULL DEFAULT TRUE,
    data_entrega    DATE NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'pendente'
                    CHECK (status IN ('pendente', 'em_andamento', 'entregue',
                                      'atrasada', 'aprovada', 'ajustar')),
    criado_por      UUID REFERENCES usuarios(id),
    concluida_em    TIMESTAMPTZ,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tarefas_equipe   ON tarefas (equipe_id, status);
CREATE INDEX idx_tarefas_prazo    ON tarefas (data_entrega)
    WHERE status IN ('pendente', 'em_andamento');
CREATE TRIGGER trg_tarefas_ts BEFORE UPDATE ON tarefas
    FOR EACH ROW EXECUTE FUNCTION fn_atualiza_timestamp();

CREATE TABLE entregas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tarefa_id       UUID NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
    versao          SMALLINT NOT NULL,
    enviado_por     UUID NOT NULL REFERENCES usuarios(id),
    comentario      TEXT,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_entrega_versao UNIQUE (tarefa_id, versao)
);

CREATE INDEX idx_entregas_tarefa ON entregas (tarefa_id, versao DESC);

CREATE TABLE arquivos_entrega (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entrega_id      UUID NOT NULL REFERENCES entregas(id) ON DELETE CASCADE,
    tipo            VARCHAR(10) NOT NULL CHECK (tipo IN ('arquivo', 'link')),
    nome_original   VARCHAR(255),
    url_externa     VARCHAR(500),
    mime_type       VARCHAR(100),
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_arquivo_origem CHECK (
        (tipo = 'link'    AND url_externa IS NOT NULL)
    )
);

CREATE INDEX idx_arquivos_entrega ON arquivos_entrega (entrega_id);

CREATE TABLE avaliacoes_entrega (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entrega_id      UUID NOT NULL REFERENCES entregas(id) ON DELETE CASCADE,
    avaliador_id    UUID NOT NULL REFERENCES usuarios(id),
    resultado       VARCHAR(15) NOT NULL
                    CHECK (resultado IN ('aprovada', 'ajustar')),
    comentario      TEXT,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_avaliacoes_entrega ON avaliacoes_entrega (entrega_id, criado_em DESC);

CREATE TABLE lembretes_tarefa (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tarefa_id       UUID NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
    dias_antes      SMALLINT,
    data_especifica DATE,
    disparado_em    TIMESTAMPTZ,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_lembrete_regra CHECK (
        (dias_antes IS NOT NULL AND data_especifica IS NULL) OR
        (dias_antes IS NULL AND data_especifica IS NOT NULL)
    )
);

CREATE INDEX idx_lembretes_pendentes ON lembretes_tarefa (tarefa_id)
    WHERE ativo AND disparado_em IS NULL;

CREATE TABLE emails (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo                VARCHAR(40) NOT NULL CHECK (tipo IN (
                            'novo_cadastro_admin', 'convite_equipe', 'nova_tarefa',
                            'prazo_proximo', 'prazo_vencido', 'entrega_recebida_admin',
                            'entrega_aprovada', 'entrega_ajustar',
                            'tarefa_atrasada_admin', 'lembrete_manual',
                            'recuperacao_senha', 'boas_vindas')),
    destinatario_id     UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    destinatario_email  VARCHAR(255) NOT NULL,
    assunto             VARCHAR(255) NOT NULL,
    template            VARCHAR(80),
    dados_template      JSONB,
    equipe_id           UUID REFERENCES equipes(id) ON DELETE SET NULL,
    tarefa_id           UUID REFERENCES tarefas(id) ON DELETE SET NULL,
    status              VARCHAR(15) NOT NULL DEFAULT 'pendente'
                        CHECK (status IN ('pendente', 'enviado', 'falha', 'cancelado')),
    tentativas          SMALLINT NOT NULL DEFAULT 0,
    agendado_para       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    enviado_em          TIMESTAMPTZ,
    erro                TEXT,
    provider_message_id VARCHAR(255),
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_emails_fila ON emails (agendado_para) WHERE status = 'pendente';
CREATE INDEX idx_emails_destinatario ON emails (destinatario_id, criado_em DESC);

CREATE TABLE preferencias_notificacao (
    usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo            VARCHAR(40) NOT NULL,
    habilitado      BOOLEAN NOT NULL DEFAULT TRUE,
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (usuario_id, tipo)
);

CREATE TABLE log_auditoria (
    id              BIGSERIAL PRIMARY KEY,
    usuario_id      UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    entidade        VARCHAR(50) NOT NULL,
    entidade_id     VARCHAR(64) NOT NULL,
    acao            VARCHAR(40) NOT NULL,
    dados_anteriores JSONB,
    dados_novos     JSONB,
    ip_origem       INET,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auditoria_entidade ON log_auditoria (entidade, entidade_id, criado_em DESC);
CREATE INDEX idx_auditoria_data     ON log_auditoria (criado_em DESC);
