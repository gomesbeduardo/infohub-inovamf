import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { seedBase } from "../src/seed/base.js";
import { dataISO, hojeISO, somarDias } from "../src/domain/atraso.js";
import { bearer, criarEquipe, criarUsuario, limpar, login } from "./helpers.js";

const app = createApp();
const sufixo = `mod${Date.now()}`;
let mentorAccess = "";
let alunoAccess = "";
let slug = "";

beforeAll(async () => {
  await seedBase(prisma);
  const mentor = await criarUsuario(`mentor.${sufixo}@teste.local`, "mentor");
  await criarUsuario(`aluno.${sufixo}@teste.local`, "aluno");
  slug = (await criarEquipe({ nome: `M ${sufixo}`, mentorId: mentor.id })).slug;
  mentorAccess = await login(app, `mentor.${sufixo}@teste.local`);
  alunoAccess = await login(app, `aluno.${sufixo}@teste.local`);
});

afterAll(async () => {
  await limpar(sufixo);
  await prisma.$disconnect();
});

describe("modelos de tarefa (RF-11)", () => {
  it("somarDias", () => {
    expect(dataISO(somarDias("2026-09-28", 5))).toBe("2026-10-03");
  });

  it("mentor lista; aluno não (403)", async () => {
    const r = await request(app).get("/api/v1/modelos-tarefa").set(bearer(mentorAccess));
    expect(r.status).toBe(200);
    expect(r.body.data.filter((m: { etapa: number }) => m.etapa === 6)).toHaveLength(3);
    const a = await request(app).get("/api/v1/modelos-tarefa").set(bearer(alunoAccess));
    expect(a.status).toBe(403);
  });

  it("cria tarefa do modelo com prazo padrão", async () => {
    const lista = await request(app).get("/api/v1/modelos-tarefa").set(bearer(mentorAccess));
    const bmc = lista.body.data.find((m: { titulo: string }) => m.titulo === "Business Model Canvas (BMC)");
    const r = await request(app)
      .post(`/api/v1/equipes/${slug}/tarefas`)
      .set(bearer(mentorAccess))
      .send({ modelo: bmc.id });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ titulo: "Business Model Canvas (BMC)", obrigatoria: true, etapa: { numero: 5 } });
    expect(dataISO(new Date(r.body.dataEntrega))).toBe(dataISO(somarDias(hojeISO(), bmc.prazoPadraoDias)));
    const row = await prisma.tarefas.findFirst({ where: { equipes: { slug } }, select: { modelo_id: true } });
    expect(row?.modelo_id).toBe(bmc.id);
  });

  it("modelo inexistente → 400", async () => {
    const r = await request(app).post(`/api/v1/equipes/${slug}/tarefas`).set(bearer(mentorAccess)).send({ modelo: 999999 });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("INVALID_MODELO");
  });
});
