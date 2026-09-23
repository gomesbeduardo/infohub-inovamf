import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { bearer, criarEquipe, criarUsuario, limpar, login } from "./helpers.js";

const app = createApp();
const sufixo = `ano${Date.now()}`;
const email = (n: string) => `${n}.${sufixo}@teste.local`;
let mentorAccess = "";
let outroMentorAccess = "";
let alunoAccess = "";
let slug = "";

beforeAll(async () => {
  const mentor = await criarUsuario(email("mentor"), "mentor", { nome: "Mentora Ana" });
  await criarUsuario(email("outro"), "mentor");
  const aluno = await criarUsuario(email("aluno"), "aluno");
  slug = (await criarEquipe({ nome: `A ${sufixo}`, mentorId: mentor.id, membros: [{ id: aluno.id, papel: "lider" }] })).slug;
  mentorAccess = await login(app, email("mentor"));
  outroMentorAccess = await login(app, email("outro"));
  alunoAccess = await login(app, email("aluno"));
});

afterAll(async () => {
  await limpar(sufixo);
  await prisma.$disconnect();
});

const url = () => `/api/v1/equipes/${slug}/anotacoes`;

describe("anotações internas (RF-10)", () => {
  it("mentor da equipe cria e lista (mais recente primeiro)", async () => {
    for (const conteudo of ["primeira", "segunda"]) {
      const r = await request(app).post(url()).set(bearer(mentorAccess)).send({ conteudo });
      expect(r.status).toBe(201);
      expect(r.body.autor.nome).toBe("Mentora Ana");
    }
    const r = await request(app).get(url()).set(bearer(mentorAccess));
    expect(r.body.data.map((a: { conteudo: string }) => a.conteudo)).toEqual(["segunda", "primeira"]);
  });
  it("aluno nunca vê (403)", async () => {
    const r = await request(app).get(url()).set(bearer(alunoAccess));
    expect(r.status).toBe(403);
  });
  it("mentor de outra equipe não vê (403)", async () => {
    const r = await request(app).get(url()).set(bearer(outroMentorAccess));
    expect(r.status).toBe(403);
  });
  it("conteúdo vazio → 400", async () => {
    const r = await request(app).post(url()).set(bearer(mentorAccess)).send({ conteudo: "  " });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("INVALID_CONTEUDO");
  });
});
