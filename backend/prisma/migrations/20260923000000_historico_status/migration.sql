-- RN-02: entrar/sair de "Pronta para o InovAMF" muda o STATUS da equipe, não a
-- etapa (continua 6). Sem estas colunas o histórico mostraria "6 → 6".
ALTER TABLE "historico_etapas" ADD COLUMN "status_origem" VARCHAR(25);
ALTER TABLE "historico_etapas" ADD COLUMN "status_destino" VARCHAR(25);
