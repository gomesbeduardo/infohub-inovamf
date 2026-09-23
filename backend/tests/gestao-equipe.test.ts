import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { bearer, criarEquipe, criarUsuario, limpar, login } from "./helpers.js";

// A1 (gestão pelo admin via PATCH) + A4 (auditoria na MESMA transação da ação).
const app = createApp();
const sufixo = `gest${Date.now()}`;
const email = (n: string) => `${n}.${sufixo}@teste.local`;
let adminAccess = "";
let mentorAccess = "";
let mentorNovo = { id: "", slug: "" };
let equipe = { id: "", slug: "" };
let pronta = { id: "", slug: "" };
let movel = { id: "", slug: "" };

beforeAll(async () => {
  await criarUsuario(email("admin"), "admin");
  const mentor = await criarUsuario(email("mentor"), "mentor", { nome: "Mentora Antiga" });
  mentorNovo = await criarUsuario(email("mentor2"), "mentor", { nome: "Mentor Novo" });
  adminAccess = await login(app, email("admin"));
  mentorAccess = await login(app, email("mentor"));
  equipe = await criarEquipe({ nome: `Gestao ${sufixo}`, mentorId: mentor.id, etapa: 2 });
  pronta = await criarEquipe({ nome: `Pronta ${sufixo}`, mentorId: mentor.id, etapa: 6, status: "pronta_inovamf" });
  movel = await criarEquipe({ nome: `Movel ${sufixo}`, mentorId: mentor.id, etapa: 2 });
});

afterAll(async () => {
  await limpar(sufixo);
  await prisma.$disconnect();
});

const auditoria = (equipeId: string) =>
  prisma.log_auditoria.findMany({
    where: { entidade: "equipe", entidade_id: equipeId },
    orderBy: { id: "asc" },
  });
const patch = (slug: string, body: object, access = adminAccess) =>
  request(app).patch(`/api/v1/equipes/${slug}`).set(bearer(access)).send(body);

describe("PATCH /equipes/:slug — gestão (A1) auditada (A4)", () => {
  it("troca o mentor e audita com os nomes (sem UUID)", async () => {
    const r = await patch(equipe.slug, { mentor: mentorNovo.slug });
    expect(r.status).toBe(200);
    const log = await auditoria(equipe.id);
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({
      acao: "mentor_atribuido",
      dados_anteriores: { mentor: "Mentora Antiga" },
      dados_novos: { mentor: "Mentor Novo" },
    });
    expect(log[0]?.usuario_id).not.toBeNull();
    expect(log[0]?.ip_origem).toBeTruthy();
  });

  it("status ativa → pausada é auditado", async () => {
    const r = await patch(equipe.slug, { status: "pausada" });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("pausada");
    const log = await auditoria(equipe.id);
    expect(log.at(-1)).toMatchObject({
      acao: "status_alterado",
      dados_anteriores: { status: "ativa" },
      dados_novos: { status: "pausada" },
    });
  });

  it("encaminhar sem estar pronta → 409 TRANSICAO_INVALIDA; nada muda nem é auditado", async () => {
    const antes = (await auditoria(equipe.id)).length;
    const r = await patch(equipe.slug, { status: "encaminhada_inovamf" });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("TRANSICAO_INVALIDA");
    expect(await auditoria(equipe.id)).toHaveLength(antes);
    const eq = await prisma.equipes.findUniqueOrThrow({ where: { id: equipe.id }, select: { status: true } });
    expect(eq.status).toBe("pausada");
  });

  it("pronta_inovamf → encaminhada_inovamf é aceita", async () => {
    const r = await patch(pronta.slug, { status: "encaminhada_inovamf" });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("encaminhada_inovamf");
  });

  it("mentor: null tira o mentor e audita 'sem mentor'", async () => {
    const r = await patch(equipe.slug, { mentor: null });
    expect(r.status).toBe(200);
    const log = await auditoria(equipe.id);
    expect(log.at(-1)).toMatchObject({ acao: "mentor_atribuido", dados_novos: { mentor: null } });
  });

  it("o PATCH é só do admin (mentor → 403)", async () => {
    const r = await patch(equipe.slug, { status: "ativa" }, mentorAccess);
    expect(r.status).toBe(403);
  });
});

describe("POST /equipes/:slug/etapa — auditoria na mesma transação (A4)", () => {
  const mover = (body: object) =>
    request(app).post(`/api/v1/equipes/${movel.slug}/etapa`).set(bearer(adminAccess)).send(body);

  it("movimento recusado (409) não deixa log", async () => {
    const r = await mover({ etapa: 4 });
    expect(r.status).toBe(409);
    expect(await auditoria(movel.id)).toHaveLength(0);
  });

  it("movimento forçado grava etapa_movida com a observação", async () => {
    const r = await mover({ etapa: 4, forcado: true, observacao: "banca pediu" });
    expect(r.status).toBe(200);
    const log = await auditoria(movel.id);
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({
      acao: "etapa_movida",
      dados_anteriores: { posicao: 2, status: "ativa" },
      dados_novos: { posicao: 4, status: "ativa", forcado: true, observacao: "banca pediu" },
    });
  });
});
