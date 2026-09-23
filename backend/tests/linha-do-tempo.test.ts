import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { bearer, criarEquipe, criarUsuario, limpar, login } from "./helpers.js";

// A5: GET /equipes/:slug/linha-do-tempo — escopo por papel, sem UUID, e o
// aluno não vê a observação de movimento forçado.
const app = createApp();
const sufixo = `ldt${Date.now()}`;
const email = (n: string) => `${n}.${sufixo}@teste.local`;
const OBS = "combinado com a banca";
let adminAccess = "";
let mentor2Access = "";
let alunoAccess = "";
let foraAccess = "";
let equipe = { id: "", slug: "" };

beforeAll(async () => {
  await criarUsuario(email("admin"), "admin");
  const mentor = await criarUsuario(email("mentor"), "mentor", { nome: "Ana Mentora" });
  await criarUsuario(email("mentor2"), "mentor");
  const aluno = await criarUsuario(email("aluno"), "aluno", { nome: "Lia Líder" });
  await criarUsuario(email("fora"), "aluno");
  adminAccess = await login(app, email("admin"));
  const mentorAccess = await login(app, email("mentor"));
  mentor2Access = await login(app, email("mentor2"));
  alunoAccess = await login(app, email("aluno"));
  foraAccess = await login(app, email("fora"));
  equipe = await criarEquipe({
    nome: `Linha ${sufixo}`,
    mentorId: mentor.id,
    etapa: 2,
    membros: [{ id: aluno.id, papel: "lider" }],
  });

  const t = await request(app)
    .post(`/api/v1/equipes/${equipe.slug}/tarefas`)
    .set(bearer(adminAccess))
    .send({ titulo: "Tarefa da linha", etapa: 2, dataEntrega: "2099-12-31" });
  const e = await request(app)
    .post(`/api/v1/tarefas/${t.body.slug}/entregas`)
    .set(bearer(alunoAccess))
    .send({ links: ["https://exemplo.dev/linha"] });
  await request(app)
    .post(`/api/v1/entregas/${e.body.slug}/avaliacoes`)
    .set(bearer(mentorAccess))
    .send({ resultado: "aprovada", comentario: "ótimo" });
  await request(app)
    .post(`/api/v1/equipes/${equipe.slug}/etapa`)
    .set(bearer(mentorAccess))
    .send({ etapa: 4, forcado: true, observacao: OBS });
  await request(app).patch(`/api/v1/equipes/${equipe.slug}`).set(bearer(adminAccess)).send({ status: "pausada" });
  await request(app)
    .post(`/api/v1/equipes/${equipe.slug}/lembrete`)
    .set(bearer(mentorAccess))
    .send({ mensagem: "Reunião sexta" });
});

afterAll(async () => {
  await limpar(sufixo);
  await prisma.$disconnect();
});

const linha = (access: string) =>
  request(app).get(`/api/v1/equipes/${equipe.slug}/linha-do-tempo`).set(bearer(access));

describe("GET /equipes/:slug/linha-do-tempo", () => {
  it("admin vê tudo, do mais novo para o mais antigo, sem UUID", async () => {
    const r = await linha(adminAccess);
    expect(r.status).toBe(200);
    const itens = r.body.data as Array<{ tipo: string; titulo: string; detalhe?: string; em: string }>;
    expect(itens.map((i) => i.tipo).sort()).toEqual(["avaliacao", "entrega", "etapa", "lembrete", "status"]);
    const datas = itens.map((i) => i.em);
    expect([...datas].sort().reverse()).toEqual(datas);
    expect(itens.find((i) => i.tipo === "etapa")?.detalhe).toBe(OBS);
    expect(itens.find((i) => i.tipo === "avaliacao")).toMatchObject({ titulo: "Entrega aprovada: Tarefa da linha", detalhe: "ótimo", autor: "Ana Mentora" });
    expect(JSON.stringify(r.body)).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-/i);
  });

  it("aluno da equipe vê a linha sem a observação do movimento forçado", async () => {
    const r = await linha(alunoAccess);
    expect(r.status).toBe(200);
    const itens = r.body.data as Array<{ tipo: string; detalhe?: string }>;
    expect(itens.find((i) => i.tipo === "etapa")?.detalhe).toBeUndefined();
    expect(JSON.stringify(r.body)).not.toContain(OBS);
    expect(itens.find((i) => i.tipo === "avaliacao")?.detalhe).toBe("ótimo");
  });

  it("mentor de outra equipe e aluno de fora → 403", async () => {
    expect((await linha(mentor2Access)).status).toBe(403);
    expect((await linha(foraAccess)).status).toBe(403);
  });
});
