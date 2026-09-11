import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { hashSenha } from "../src/utils/hash.js";
import { fromSlug, novoIdComSlug } from "../src/utils/slug.js";

const app = createApp();

const sufixo = `d${Date.now()}`;
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
let teamSlug = "";
let taskSlug = "";
let entregaSlug = "";

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
  await criarUsuario(emails.outsider, "aluno");

  adminAccess = await login(emails.admin);
  mentorAccess = await login(emails.mentor);
  mentor2Access = await login(emails.mentor2);
  alunoAccess = await login(emails.aluno);
  outsiderAccess = await login(emails.outsider);

  const eq = await request(app)
    .post("/api/v1/equipes")
    .set(bearer(adminAccess))
    .send({
      nomeIdeia: `Entrega team ${sufixo}`,
      descricaoIdeia: "equipe para testar entregas",
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

  const t = await request(app)
    .post(`/api/v1/equipes/${teamSlug}/tarefas`)
    .set(bearer(mentorAccess))
    .send({ titulo: "Enviar Pitch Vídeo", etapa: 6, dataEntrega: "2026-12-20" });
  taskSlug = t.body.slug;
});

afterAll(async () => {
  await prisma.equipes.deleteMany({ where: { nome_ideia: { contains: sufixo } } });
  await prisma.usuarios.deleteMany({ where: { email: { contains: sufixo } } });
  await prisma.emails.deleteMany({
    where: { destinatario_email: { contains: sufixo } },
  });
  await prisma.$disconnect();
});

describe("POST /tarefas/:slug/entregas", () => {
  it("401 sem auth", async () => {
    const res = await request(app)
      .post(`/api/v1/tarefas/${taskSlug}/entregas`)
      .send({ links: ["https://drive.google.com/x"] });
    expect(res.status).toBe(401);
  });

  it("aluno membro envia (201) e a tarefa vira 'entregue'", async () => {
    const res = await request(app)
      .post(`/api/v1/tarefas/${taskSlug}/entregas`)
      .set(bearer(alunoAccess))
      .send({
        links: [{ url: "https://youtu.be/pitch", nome: "Pitch" }],
        comentario: "primeira versão",
      });
    expect(res.status).toBe(201);
    expect(res.body.versao).toBe(1);
    entregaSlug = res.body.slug;

    const det = await request(app)
      .get(`/api/v1/tarefas/${taskSlug}`)
      .set(bearer(adminAccess));
    expect(det.body.status).toBe("entregue");
  });

  it("400 link não-https", async () => {
    const res = await request(app)
      .post(`/api/v1/tarefas/${taskSlug}/entregas`)
      .set(bearer(alunoAccess))
      .send({ links: ["http://inseguro.com/x"] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_LINK");
  });

  it("400 sem links", async () => {
    const res = await request(app)
      .post(`/api/v1/tarefas/${taskSlug}/entregas`)
      .set(bearer(alunoAccess))
      .send({ links: [] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("NO_LINKS");
  });

  it("403 outsider não envia", async () => {
    const res = await request(app)
      .post(`/api/v1/tarefas/${taskSlug}/entregas`)
      .set(bearer(outsiderAccess))
      .send({ links: ["https://x.com/y"] });
    expect(res.status).toBe(403);
  });

  it("reenvio gera versão 2 (RF-16)", async () => {
    const res = await request(app)
      .post(`/api/v1/tarefas/${taskSlug}/entregas`)
      .set(bearer(alunoAccess))
      .send({ links: ["https://youtu.be/pitch-v2"] });
    expect(res.status).toBe(201);
    expect(res.body.versao).toBe(2);
  });
});

describe("GET entregas", () => {
  it("lista versões (desc); outsider 403", async () => {
    const res = await request(app)
      .get(`/api/v1/tarefas/${taskSlug}/entregas`)
      .set(bearer(alunoAccess));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data[0].versao).toBe(2);

    const alheio = await request(app)
      .get(`/api/v1/tarefas/${taskSlug}/entregas`)
      .set(bearer(outsiderAccess));
    expect(alheio.status).toBe(403);
  });

  it("detalhe: membro 200; slug ruim 404", async () => {
    const ok = await request(app)
      .get(`/api/v1/entregas/${entregaSlug}`)
      .set(bearer(alunoAccess));
    expect(ok.status).toBe(200);
    expect(ok.body.arquivos.length).toBe(1);

    const ruim = await request(app)
      .get("/api/v1/entregas/slugquebrado")
      .set(bearer(adminAccess));
    expect(ruim.status).toBe(404);
  });
});

describe("POST /entregas/:slug/avaliacoes (RF-15)", () => {
  it("aluno não avalia (403)", async () => {
    const res = await request(app)
      .post(`/api/v1/entregas/${entregaSlug}/avaliacoes`)
      .set(bearer(alunoAccess))
      .send({ resultado: "aprovada" });
    expect(res.status).toBe(403);
  });

  it("outro mentor não avalia (403)", async () => {
    const res = await request(app)
      .post(`/api/v1/entregas/${entregaSlug}/avaliacoes`)
      .set(bearer(mentor2Access))
      .send({ resultado: "aprovada" });
    expect(res.status).toBe(403);
  });

  it("400 resultado inválido", async () => {
    const res = await request(app)
      .post(`/api/v1/entregas/${entregaSlug}/avaliacoes`)
      .set(bearer(mentorAccess))
      .send({ resultado: "talvez" });
    expect(res.status).toBe(400);
  });

  it("mentor pede ajuste → tarefa vira 'ajustar'", async () => {
    const res = await request(app)
      .post(`/api/v1/entregas/${entregaSlug}/avaliacoes`)
      .set(bearer(mentorAccess))
      .send({ resultado: "ajustar", comentario: "melhore o áudio" });
    expect(res.status).toBe(201);
    expect(res.body.resultado).toBe("ajustar");

    const det = await request(app)
      .get(`/api/v1/tarefas/${taskSlug}`)
      .set(bearer(adminAccess));
    expect(det.body.status).toBe("ajustar");

    // RF-18: quem enviou recebe a notificação de ajuste.
    const inbox = await request(app)
      .get("/api/v1/notificacoes")
      .set(bearer(alunoAccess));
    expect(
      inbox.body.data.some((n: { tipo: string }) => n.tipo === "entrega_ajustar"),
    ).toBe(true);
  });
});
