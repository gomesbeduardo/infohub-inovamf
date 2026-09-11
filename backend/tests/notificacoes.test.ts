import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { hashSenha } from "../src/utils/hash.js";
import { fromSlug, novoIdComSlug } from "../src/utils/slug.js";

const app = createApp();

const sufixo = `n${Date.now()}`;
const SENHA = "senha-de-teste-forte";
const emails = {
  admin: `admin.${sufixo}@teste.local`,
  mentor: `mentor.${sufixo}@teste.local`,
  mentor2: `mentor2.${sufixo}@teste.local`,
  aluno: `aluno.${sufixo}@teste.local`,
};

let adminAccess = "";
let mentorAccess = "";
let mentor2Access = "";
let alunoAccess = "";
let teamSlug = "";

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
  const mentorSlug = await criarUsuario(emails.mentor, "mentor");
  await criarUsuario(emails.mentor2, "mentor");
  const alunoSlug = await criarUsuario(emails.aluno, "aluno");

  adminAccess = await login(emails.admin);
  mentorAccess = await login(emails.mentor);
  mentor2Access = await login(emails.mentor2);
  alunoAccess = await login(emails.aluno);

  const eq = await request(app)
    .post("/api/v1/equipes")
    .set(bearer(adminAccess))
    .send({
      nomeIdeia: `Notif team ${sufixo}`,
      descricaoIdeia: "equipe para testar notificações",
      estagio: "ideia",
      mentor: mentorSlug,
    });
  teamSlug = eq.body.slug;

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
  await prisma.emails.deleteMany({
    where: { destinatario_email: { contains: sufixo } },
  });
  await prisma.$disconnect();
});

describe("preferências (RF-21)", () => {
  it("401 sem auth", async () => {
    const res = await request(app).get("/api/v1/notificacoes/preferencias");
    expect(res.status).toBe(401);
  });

  it("lista todos os tipos como habilitados por padrão", async () => {
    const res = await request(app)
      .get("/api/v1/notificacoes/preferencias")
      .set(bearer(alunoAccess));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(12);
    expect(res.body.data.every((p: { habilitado: boolean }) => p.habilitado)).toBe(true);
  });

  it("desliga um tipo e persiste", async () => {
    const patch = await request(app)
      .patch("/api/v1/notificacoes/preferencias")
      .set(bearer(alunoAccess))
      .send({ tipo: "nova_tarefa", habilitado: false });
    expect(patch.status).toBe(200);
    expect(patch.body.habilitado).toBe(false);

    const lista = await request(app)
      .get("/api/v1/notificacoes/preferencias")
      .set(bearer(alunoAccess));
    const nova = lista.body.data.find((p: { tipo: string }) => p.tipo === "nova_tarefa");
    expect(nova.habilitado).toBe(false);
  });

  it("400 tipo inválido", async () => {
    const res = await request(app)
      .patch("/api/v1/notificacoes/preferencias")
      .set(bearer(alunoAccess))
      .send({ tipo: "inexistente", habilitado: false });
    expect(res.status).toBe(400);
  });
});

describe("lembrete manual (RF-20) e inbox (RF-18)", () => {
  it("mentor da equipe dispara lembrete (201)", async () => {
    const res = await request(app)
      .post(`/api/v1/equipes/${teamSlug}/lembrete`)
      .set(bearer(mentorAccess))
      .send({ mensagem: "Não esqueçam do prazo!" });
    expect(res.status).toBe(201);
    expect(res.body.enfileirados).toBe(1);
  });

  it("outro mentor não dispara (403); aluno também não (403)", async () => {
    const m2 = await request(app)
      .post(`/api/v1/equipes/${teamSlug}/lembrete`)
      .set(bearer(mentor2Access))
      .send({ mensagem: "x" });
    expect(m2.status).toBe(403);

    const al = await request(app)
      .post(`/api/v1/equipes/${teamSlug}/lembrete`)
      .set(bearer(alunoAccess))
      .send({ mensagem: "x" });
    expect(al.status).toBe(403);
  });

  it("aluno vê o lembrete no inbox", async () => {
    const res = await request(app)
      .get("/api/v1/notificacoes")
      .set(bearer(alunoAccess));
    expect(res.status).toBe(200);
    expect(
      res.body.data.some((n: { tipo: string }) => n.tipo === "lembrete_manual"),
    ).toBe(true);
  });
});
