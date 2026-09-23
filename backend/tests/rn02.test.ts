import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { seedBase } from "../src/seed/base.js";
import { bearer, criarEquipe, criarUsuario, limpar, login } from "./helpers.js";

// RN-02: "Pronta p/ InovAMF" exige os 3 entregáveis finais (tarefas dos modelos
// da Etapa 6) aprovados + todos os integrantes com convite aceito e dados.
const app = createApp();
const sufixo = `rn02${Date.now()}`;
const email = (n: string) => `${n}.${sufixo}@teste.local`;
let adminAccess = "";
let mentorAccess = "";
let pendente = { id: "", slug: "" };
let equipe = { id: "", slug: "" };

beforeAll(async () => {
  await seedBase(prisma); // garante os modelos da Etapa 6 (idempotente)
  await criarUsuario(email("admin"), "admin");
  const mentor = await criarUsuario(email("mentor"), "mentor");
  const lider = await criarUsuario(email("lider"), "aluno");
  pendente = await criarUsuario(email("pendente"), "aluno", { ativado: false, nome: "Pendente Souza" });
  adminAccess = await login(app, email("admin"));
  mentorAccess = await login(app, email("mentor"));
  equipe = await criarEquipe({
    nome: `Final ${sufixo}`,
    mentorId: mentor.id,
    etapa: 6,
    membros: [{ id: lider.id, papel: "lider" }, { id: pendente.id, papel: "integrante" }],
  });
  await prisma.alunos.create({ data: { usuario_id: lider.id, curso: "Direito", semestre: "5" } });
});

afterAll(async () => {
  await limpar(sufixo);
  await prisma.$disconnect();
});

const mover = () =>
  request(app).post(`/api/v1/equipes/${equipe.slug}/etapa`).set(bearer(mentorAccess)).send({ etapa: "pronta" });

describe("RN-02 — Pronta p/ InovAMF", () => {
  it("sem os entregáveis e com convite pendente → 409 RN02_PENDENCIAS com a lista", async () => {
    const r = await mover();
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("RN02_PENDENCIAS");
    expect(r.body.error.details.pendencias).toEqual([
      { tipo: "entregavel", titulo: "Pitch vídeo" },
      { tipo: "entregavel", titulo: "Business Model Canvas final" },
      { tipo: "entregavel", titulo: "Value Proposition Design final" },
      expect.objectContaining({ tipo: "integrante", nome: "Pendente Souza", motivo: "convite_pendente" }),
    ]);
  });

  it("o detalhe mostra as mesmas pendências (preview do drag e do Próximo passo)", async () => {
    const det = await request(app).get(`/api/v1/equipes/${equipe.slug}`).set(bearer(adminAccess));
    expect(det.body.pendenciasParaAvancar).toHaveLength(4);
  });

  it("com as 3 tarefas dos modelos aprovadas, só o integrante bloqueia", async () => {
    const modelos = await request(app).get("/api/v1/modelos-tarefa").set(bearer(adminAccess));
    const finais = (modelos.body.data as Array<{ id: number; etapa: number }>).filter((m) => m.etapa === 6);
    expect(finais).toHaveLength(3);
    for (const m of finais) {
      const t = await request(app)
        .post(`/api/v1/equipes/${equipe.slug}/tarefas`)
        .set(bearer(adminAccess))
        .send({ modelo: m.id });
      expect(t.status).toBe(201);
      const ap = await request(app)
        .patch(`/api/v1/tarefas/${t.body.slug}`)
        .set(bearer(adminAccess))
        .send({ status: "aprovada" });
      expect(ap.status).toBe(200);
    }
    const r = await mover();
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("RN02_PENDENCIAS");
    expect(r.body.error.details.pendencias).toEqual([
      expect.objectContaining({ tipo: "integrante", nome: "Pendente Souza" }),
    ]);
  });

  it("todos os integrantes em dia → vira pronta sem forçar", async () => {
    await prisma.usuarios.update({ where: { id: pendente.id }, data: { convite_aceito_em: new Date() } });
    await prisma.alunos.create({ data: { usuario_id: pendente.id, curso: "Pedagogia", semestre: "2" } });
    const r = await mover();
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("pronta_inovamf");
    expect(r.body.forcado).toBe(false);
  });
});
