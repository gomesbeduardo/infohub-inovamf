import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { SENHA } from "./helpers.js";

// Termos de Uso + consentimento LGPD no cadastro do líder e no aceite do convite.
const app = createApp();
const sufixo = `termos${Date.now()}`;
const emails = {
  lider: `lider.${sufixo}@teste.local`,
  colega: `colega.${sufixo}@teste.local`,
  semAceite: `sem.${sufixo}@teste.local`,
};
const NAVEGADOR = "Mozilla/5.0 (teste de termos)";

function corpoInscricao(email: string, extra: Record<string, unknown> = {}) {
  return {
    lider: { nome: "Líder Termos", email, senha: SENHA, telefone: "55991112222", curso: "Direito" },
    ideia: { nome: `Ideia ${sufixo} ${email}`, descricao: "desc", estagio: "ideia", area: "Educação" },
    colegas: [{ nome: "Colega Termos", email: emails.colega }],
    ...extra,
  };
}

afterAll(async () => {
  await prisma.equipes.deleteMany({ where: { nome_ideia: { contains: sufixo } } });
  await prisma.emails.deleteMany({ where: { destinatario_email: { contains: sufixo } } });
  await prisma.usuarios.deleteMany({ where: { email: { contains: sufixo } } });
  await prisma.$disconnect();
});

describe("GET /termos/vigente", () => {
  it("é pública e devolve a versão semeada", async () => {
    const res = await request(app).get("/api/v1/termos/vigente");
    expect(res.status).toBe(200);
    expect(res.body.versao).toBe("2026-09");
    expect(res.body.titulo).toBe("Termos de Uso do InfoHub");
    expect(res.body.conteudo).toContain("## 1.");
    expect(res.body.id).toBeUndefined();
  });
});

describe("consentimento na inscrição do líder", () => {
  it("sem consentimento → 400 CONSENTIMENTO_OBRIGATORIO e nada é gravado", async () => {
    const res = await request(app)
      .post("/api/v1/equipes/inscricao")
      .send(corpoInscricao(emails.semAceite));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("CONSENTIMENTO_OBRIGATORIO");
    expect(await prisma.usuarios.findUnique({ where: { email: emails.semAceite } })).toBeNull();
  });

  it("consentimento diferente de true também é recusado", async () => {
    const res = await request(app)
      .post("/api/v1/equipes/inscricao")
      .send(corpoInscricao(emails.semAceite, { consentimento: "true" }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("CONSENTIMENTO_OBRIGATORIO");
  });

  let colegaToken = "";

  it("com consentimento → aceite dos termos e da política só para o líder", async () => {
    const res = await request(app)
      .post("/api/v1/equipes/inscricao")
      .set("User-Agent", NAVEGADOR)
      .send(corpoInscricao(emails.lider, { consentimento: true }));
    expect(res.status).toBe(201);
    colegaToken = res.body.colegas[0].token_dev;

    const lider = await prisma.usuarios.findUniqueOrThrow({
      where: { email: emails.lider },
      include: { aceites_termos: { include: { termos_uso: true } }, consentimentos_lgpd: true },
    });
    expect(lider.aceites_termos).toHaveLength(1);
    expect(lider.aceites_termos[0].termos_uso.versao).toBe("2026-09");
    expect(lider.aceites_termos[0].ip_origem).toBeTruthy();
    expect(lider.aceites_termos[0].user_agent).toBe(NAVEGADOR);
    expect(lider.consentimentos_lgpd).toHaveLength(1);
    expect(lider.consentimentos_lgpd[0]).toMatchObject({
      versao_politica: "2026-09",
      aceito: true,
      user_agent: NAVEGADOR,
    });
    expect(lider.consentimentos_lgpd[0].ip_origem).toBeTruthy();

    // O líder não consente pelos colegas (decisão 3 do handoff LGPD).
    const colega = await prisma.usuarios.findUniqueOrThrow({
      where: { email: emails.colega },
      include: { aceites_termos: true, consentimentos_lgpd: true },
    });
    expect(colega.aceites_termos).toHaveLength(0);
    expect(colega.consentimentos_lgpd).toHaveLength(0);
  });

  describe("consentimento no aceite do convite", () => {
    const aceite = { senha: SENHA, curso: "Direito", semestre: "3" };

    it("sem consentimento → 400 e o convite continua valendo", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({ token: colegaToken, ...aceite });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("CONSENTIMENTO_OBRIGATORIO");
      const colega = await prisma.usuarios.findUniqueOrThrow({ where: { email: emails.colega } });
      expect(colega.convite_aceito_em).toBeNull();
    });

    it("com consentimento → 201 e o colega registra o próprio aceite", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .set("User-Agent", NAVEGADOR)
        .send({ token: colegaToken, ...aceite, consentimento: true });
      expect(res.status).toBe(201);

      const colega = await prisma.usuarios.findUniqueOrThrow({
        where: { email: emails.colega },
        include: { aceites_termos: { include: { termos_uso: true } }, consentimentos_lgpd: true },
      });
      expect(colega.aceites_termos).toHaveLength(1);
      expect(colega.aceites_termos[0].termos_uso.versao).toBe("2026-09");
      expect(colega.aceites_termos[0].user_agent).toBe(NAVEGADOR);
      expect(colega.consentimentos_lgpd).toHaveLength(1);
      expect(colega.consentimentos_lgpd[0].versao_politica).toBe("2026-09");
    });
  });
});
