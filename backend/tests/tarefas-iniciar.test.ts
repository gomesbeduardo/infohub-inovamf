import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { novoIdComSlug } from "../src/utils/slug.js";
import { bearer, criarEquipe, criarUsuario, limpar, login } from "./helpers.js";

// A3/RF-12: "Comecei" — o aluno da equipe leva a tarefa de pendente a em_andamento.
const app = createApp();
const sufixo = `ini${Date.now()}`;
const email = (n: string) => `${n}.${sufixo}@teste.local`;
let adminAccess = "";
let mentorAccess = "";
let alunoAccess = "";
let integranteAccess = "";
let foraAccess = "";
let tarefaSlug = "";
let tarefaSlug2 = "";

beforeAll(async () => {
  await criarUsuario(email("admin"), "admin");
  const mentor = await criarUsuario(email("mentor"), "mentor");
  const aluno = await criarUsuario(email("aluno"), "aluno");
  const integrante = await criarUsuario(email("integrante"), "aluno");
  await criarUsuario(email("fora"), "aluno");
  adminAccess = await login(app, email("admin"));
  mentorAccess = await login(app, email("mentor"));
  alunoAccess = await login(app, email("aluno"));
  integranteAccess = await login(app, email("integrante"));
  foraAccess = await login(app, email("fora"));
  const equipe = await criarEquipe({
    nome: `Iniciar ${sufixo}`,
    mentorId: mentor.id,
    membros: [
      { id: aluno.id, papel: "lider" },
      { id: integrante.id, papel: "integrante" },
    ],
  });
  const t = await request(app)
    .post(`/api/v1/equipes/${equipe.slug}/tarefas`)
    .set(bearer(adminAccess))
    .send({ titulo: "Tarefa a começar", etapa: 1, dataEntrega: "2099-12-31" });
  expect(t.status).toBe(201);
  tarefaSlug = t.body.slug;

  const t2 = await request(app)
    .post(`/api/v1/equipes/${equipe.slug}/tarefas`)
    .set(bearer(adminAccess))
    .send({ titulo: "Outra tarefa a começar", etapa: 1, dataEntrega: "2099-12-31" });
  expect(t2.status).toBe(201);
  tarefaSlug2 = t2.body.slug;
});

afterAll(async () => {
  await limpar(sufixo);
  await prisma.$disconnect();
});

const iniciar = (access: string) =>
  request(app).post(`/api/v1/tarefas/${tarefaSlug}/iniciar`).set(bearer(access));

describe("POST /tarefas/:slug/iniciar", () => {
  it("aluno de fora → 403; mentor → 403 (só aluno)", async () => {
    expect((await iniciar(foraAccess)).status).toBe(403);
    expect((await iniciar(mentorAccess)).status).toBe(403);
  });

  it("slug de tarefa desconhecido → 404 TAREFA_NOT_FOUND", async () => {
    const r = await request(app)
      .post(`/api/v1/tarefas/${novoIdComSlug().slug}/iniciar`)
      .set(bearer(alunoAccess));
    expect(r.status).toBe(404);
    expect(r.body.error.code).toBe("TAREFA_NOT_FOUND");
  });

  it("403 APENAS_LIDER: integrante não líder não marca 'Comecei', tarefa continua pendente", async () => {
    const r = await request(app)
      .post(`/api/v1/tarefas/${tarefaSlug2}/iniciar`)
      .set(bearer(integranteAccess));
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe("APENAS_LIDER");

    const det = await request(app).get(`/api/v1/tarefas/${tarefaSlug2}`).set(bearer(alunoAccess));
    expect(det.body.status).toBe("pendente");
  });

  it("aluno da equipe começa a tarefa pendente → em_andamento", async () => {
    const r = await iniciar(alunoAccess);
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("em_andamento");
  });

  it("de novo → 409 TAREFA_NAO_PENDENTE", async () => {
    const r = await iniciar(alunoAccess);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("TAREFA_NAO_PENDENTE");
  });

  it("enviar a entrega continua levando a 'entregue'", async () => {
    const e = await request(app)
      .post(`/api/v1/tarefas/${tarefaSlug}/entregas`)
      .set(bearer(alunoAccess))
      .send({ links: ["https://exemplo.dev/x"] });
    expect(e.status).toBe(201);
    const t = await request(app).get(`/api/v1/tarefas/${tarefaSlug}`).set(bearer(alunoAccess));
    expect(t.body.status).toBe("entregue");
  });
});
