-- Termos de Uso versionados + aceite de cada pessoa (prova do aceite, com IP e
-- navegador). A versão vigente é a mais recente em `publicado_em`; uma versão
-- nova é só um INSERT, e quem aceitou a anterior continua com a linha dela.
CREATE TABLE "termos_uso" (
    "id" SERIAL NOT NULL,
    "versao" VARCHAR(20) NOT NULL,
    "titulo" VARCHAR(150) NOT NULL,
    "conteudo" TEXT NOT NULL,
    "publicado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "termos_uso_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "uq_termos_uso_versao" ON "termos_uso"("versao");

CREATE TABLE "aceites_termos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "termo_id" INTEGER NOT NULL,
    "ip_origem" INET,
    "user_agent" TEXT,
    "aceito_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aceites_termos_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "uq_aceites_termos_usuario_termo" ON "aceites_termos"("usuario_id", "termo_id");

-- Mesmo comportamento de consentimentos_lgpd: a conta é anonimizada, não apagada.
ALTER TABLE "aceites_termos" ADD CONSTRAINT "aceites_termos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
-- Uma versão aceita por alguém não pode sumir.
ALTER TABLE "aceites_termos" ADD CONSTRAINT "aceites_termos_termo_id_fkey" FOREIGN KEY ("termo_id") REFERENCES "termos_uso"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- Seed: primeira versão dos Termos de Uso. Idempotente.
-- Formato do conteúdo: blocos separados por linha em branco; "## " abre seção.
INSERT INTO "termos_uso" ("versao", "titulo", "conteudo", "publicado_em") VALUES (
    '2026-09',
    'Termos de Uso do InfoHub',
    $termos$## 1. O que é o InfoHub

O InfoHub é a plataforma da AMF para acompanhar as equipes do programa de ideação até a inscrição no InovAMF: etapas do funil, tarefas, entregas e mentoria.

## 2. Quem pode usar

Alunos inscritos no programa, mentores e a coordenação da AMF. O cadastro da ideia é feito pelo líder da equipe; os colegas entram pelo convite que recebem e aceitam estes termos no próprio aceite.

## 3. Sua conta

Você é responsável pelos dados que informa e por manter sua senha em sigilo. A conta é pessoal: não compartilhe o acesso. Avise a coordenação se suspeitar de uso indevido.

## 4. Uso adequado

Use a plataforma apenas para as atividades do programa. Não envie conteúdo ofensivo, ilegal ou que viole direitos de terceiros, e não tente acessar dados de outras equipes.

## 5. Conteúdo das equipes

As ideias e entregas pertencem à equipe que as produziu. Ao enviá-las, a equipe autoriza a AMF a armazená-las e a mostrá-las ao mentor e à coordenação para avaliação e acompanhamento. Se você sair da equipe, o conteúdo já entregue continua com ela.

## 6. Dados pessoais

O tratamento dos seus dados pessoais segue a Política de Privacidade do InfoHub, que faz parte destes termos.

## 7. Suspensão da conta

A coordenação pode desativar contas que descumprirem estes termos ou que não participem mais do programa.

## 8. Alterações

Se estes termos mudarem, publicaremos uma nova versão e pediremos um novo aceite.

## 9. Contato

Dúvidas sobre estes termos: fale com a coordenação do programa pelo contato da AMF no rodapé do site.$termos$,
    '2026-09-24T00:00:00Z'
)
ON CONFLICT ("versao") DO NOTHING;
