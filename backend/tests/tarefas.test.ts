import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { hashSenha } from "../src/utils/hash.js";
import { fromSlug, novoIdComSlug } from "../src/utils/slug.js";

const app = createApp();

const sufixo = `t${Date.now()}`;
const SENHA = "senha-de-teste-forte";
const emails = {
  admin: `admin.${sufixo}@teste.local`,
  mentor: `mentor.${sufixo}@teste.local`,
  mentor2: `mentor2.${sufixo}@teste.local`,
  aluno: `aluno.${sufixo}@teste.local`,
  outsider: `outsider.${sufixo}@teste.local`,
};

let adminAccess = "";
let mentorAccess = "";
let mentor2Access = "";
let alunoAccess = "";
let outsiderAccess = "";
let mentorSlug = "";
let teamSlug = "";
let tarefaSlug = "";

async function criarUsuario(email: string, tipo: string): Promise<string> {
  const ids = novoIdComSlug();
  await prisma.usuarios.create({
    data: {
      id: ids.id,
      slug: ids.slug,
      nome: `User ${tipo}`,
      email,
      senha: await hashSenha(SENHA),
      telefone: "55990000000",
      tipo_usuario: tipo,
      ativo: true,
    },
  });
  return ids.slug;
}

async function login(email: string): Promise<string> {
  const res = await request(app)
    .post("/api/v1/auth/login")
    .send({ email, senha: SENHA });
  return res.body.access;
}

const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

beforeAll(async () => {
  await criarUsuario(emails.admin, "admin");
  mentorSlug = await criarUsuario(emails.mentor, "mentor");
  await criarUsuario(emails.mentor2, "mentor");
  const alunoSlug = await criarUsuario(emails.aluno, "aluno");
  await criarUsuario(emails.outsider, "aluno");

  adminAccess = await login(emails.admin);
  mentorAccess = await login(emails.mentor);
  mentor2Access = await login(emails.mentor2);
  alunoAccess = await login(emails.aluno);
  outsiderAccess = await login(emails.outsider);

  // Equipe com esse mentor, criada pelo admin.
  const eq = await request(app)
    .post("/api/v1/equipes")
    .set(bearer(adminAccess))
    .send({
      nomeIdeia: `Tarefa team ${sufixo}`,
      descricaoIdeia: "equipe para testar tarefas",
      estagio: "ideia",
      mentor: mentorSlug,
    });
  teamSlug = eq.body.slug;

  // Adiciona o aluno como membro.
  const teamId = fromSlug(teamSlug);
  const alunoId = fromSlug(alunoSlug);
  if (teamId && alunoId) {
    await prisma.equipe_membros.create({
      data: { equipe_id: teamId, usuario_id: alunoId, papel: "integrante" },
    });
  }
});

afterAll(async () => {
  await prisma.equipes.deleteMany({ where: { nome_ideia: { contains: sufixo } } });
  await prisma.usuarios.deleteMany({ where: { email: { contains: sufixo } } });
  await prisma.$disconnect();
});

describe("POST /equipes/:slug/tarefas", () => {
  it("mentor da equipe cria tarefa (201)", async () => {
    const res = await request(app)
      .post(`/api/v1/equipes/${teamSlug}/tarefas`)
      .set(bearer(mentorAccess))
      .send({
        titulo: "Enviar Business Model Canvas",
        etapa: 5,
        dataEntrega: "2026-12-01",
      });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("pendente");
    expect(res.body.equipe.slug).toBe(teamSlug);
    tarefaSlug = res.body.slug;
  });

  it("outro mentor não pode criar nessa equipe (403)", async () => {
    const res = await request(app)
      .post(`/api/v1/equipes/${teamSlug}/tarefas`)
      .set(bearer(mentor2Access))
      .send({ titulo: "Tarefa intrusa", etapa: 1, dataEntrega: "2026-12-01" });
    expect(res.status).toBe(403);
  });

  it("aluno não pode criar tarefa (403)", async () => {
    const res = await request(app)
      .post(`/api/v1/equipes/${teamSlug}/tarefas`)
      .set(bearer(alunoAccess))
      .send({ titulo: "Tarefa do aluno", etapa: 1, dataEntrega: "2026-12-01" });
    expect(res.status).toBe(403);
  });

  it("400 data inválida", async () => {
    const res = await request(app)
      .post(`/api/v1/equipes/${teamSlug}/tarefas`)
      .set(bearer(adminAccess))
      .send({ titulo: "Tarefa", etapa: 1, dataEntrega: "01/12/2026" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_DATA");
  });

  it("400 etapa fora de 1..6", async () => {
    const res = await request(app)
      .post(`/api/v1/equipes/${teamSlug}/tarefas`)
      .set(bearer(adminAccess))
      .send({ titulo: "Tarefa", etapa: 9, dataEntrega: "2026-12-01" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_ETAPA");
  });
});

describe("GET /equipes/:slug/tarefas e /tarefas/:slug", () => {
  it("401 sem auth", async () => {
    const res = await request(app).get(`/api/v1/equipes/${teamSlug}/tarefas`);
    expect(res.status).toBe(401);
  });

  it("aluno membro lista (200); outsider não (403)", async () => {
    const membro = await request(app)
      .get(`/api/v1/equipes/${teamSlug}/tarefas`)
      .set(bearer(alunoAccess));
    expect(membro.status).toBe(200);
    expect(membro.body.data.length).toBeGreaterThanOrEqual(1);

    const alheio = await request(app)
      .get(`/api/v1/equipes/${teamSlug}/tarefas`)
      .set(bearer(outsiderAccess));
    expect(alheio.status).toBe(403);
  });

  it("detalhe: membro 200, outsider 403, slug ruim 404", async () => {
    const ok = await request(app)
      .get(`/api/v1/tarefas/${tarefaSlug}`)
      .set(bearer(alunoAccess));
    expect(ok.status).toBe(200);

    const alheio = await request(app)
      .get(`/api/v1/tarefas/${tarefaSlug}`)
      .set(bearer(outsiderAccess));
    expect(alheio.status).toBe(403);

    const ruim = await request(app)
      .get("/api/v1/tarefas/slugquebrado")
      .set(bearer(adminAccess));
    expect(ruim.status).toBe(404);
  });
});

describe("PATCH /tarefas/:slug", () => {
  it("mentor aprova a tarefa (200, concluidaEm setado)", async () => {
    const res = await request(app)
      .patch(`/api/v1/tarefas/${tarefaSlug}`)
      .set(bearer(mentorAccess))
      .send({ status: "aprovada" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("aprovada");
    expect(res.body.concluidaEm).toBeTruthy();
  });

  it("filtro por status retorna a aprovada", async () => {
    const res = await request(app)
      .get(`/api/v1/equipes/${teamSlug}/tarefas`)
      .set(bearer(adminAccess))
      .query({ status: "aprovada" });
    expect(res.status).toBe(200);
    expect(res.body.data.every((t: { status: string }) => t.status === "aprovada")).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("outro mentor não edita (403)", async () => {
    const res = await request(app)
      .patch(`/api/v1/tarefas/${tarefaSlug}`)
      .set(bearer(mentor2Access))
      .send({ titulo: "Renomeada" });
    expect(res.status).toBe(403);
  });
});
