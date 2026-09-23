import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { bearer, criarEquipe, criarUsuario, limpar, login } from "./helpers.js";

const app = createApp();
const sufixo = `dsh${Date.now()}`;
const email = (n: string) => `${n}.${sufixo}@teste.local`;
let mentorAccess = "";
let alunoAccess = "";

beforeAll(async () => {
  const mentor = await criarUsuario(email("mentor"), "mentor");
  const aluno = await criarUsuario(email("aluno"), "aluno");
  const eq = await criarEquipe({ nome: `D ${sufixo}`, mentorId: mentor.id, etapa: 2, membros: [{ id: aluno.id, papel: "lider" }] });
  await prisma.tarefas.createMany({
    data: [
      { equipe_id: eq.id, etapa_id: 2, titulo: "Atrasada", data_entrega: new Date("2020-01-01T00:00:00Z") },
      { equipe_id: eq.id, etapa_id: 2, titulo: "Entregue", status: "entregue", data_entrega: new Date("2099-01-01T00:00:00Z") },
      { equipe_id: eq.id, etapa_id: 1, titulo: "Aprovada", status: "aprovada", concluida_em: new Date(), data_entrega: new Date("2099-01-01T00:00:00Z") },
    ],
  });
  await prisma.historico_etapas.create({
    data: { equipe_id: eq.id, etapa_origem_id: 1, etapa_destino_id: 2, movido_por: mentor.id, status_origem: "ativa", status_destino: "ativa" },
  });
  await criarEquipe({ nome: `Pronta ${sufixo}`, mentorId: mentor.id, etapa: 6, status: "pronta_inovamf" });
  mentorAccess = await login(app, email("mentor"));
  alunoAccess = await login(app, email("aluno"));
});

afterAll(async () => {
  await limpar(sufixo);
  await prisma.$disconnect();
});

describe("GET /dashboard", () => {
  it("mentor vê só as suas equipes", async () => {
    const r = await request(app).get("/api/v1/dashboard").set(bearer(mentorAccess));
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({
      equipesAtivas: 1,
      prontasInovamf: 1,
      totalEquipes: 2,
      tarefasAtrasadas: 1,
      aAvaliar: 1,
    });
    expect(r.body.porEtapa).toHaveLength(6);
    expect(r.body.porEtapa[1]).toMatchObject({ numero: 2, total: 1 });
    expect(r.body.serieSemanal).toHaveLength(8);
    expect(r.body.serieSemanal[7]).toMatchObject({ avancos: 1, entregas: 1 });
  });
  it("aluno → 403", async () => {
    const r = await request(app).get("/api/v1/dashboard").set(bearer(alunoAccess));
    expect(r.status).toBe(403);
  });
});
