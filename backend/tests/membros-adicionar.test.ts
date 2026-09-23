import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { bearer, criarEquipe, criarUsuario, limpar, login } from "./helpers.js";

const app = createApp();
const sufixo = `add${Date.now()}`;
const email = (n: string) => `${n}.${sufixo}@teste.local`;
let liderAccess = "";
let mentorAccess = "";
let estranhoAccess = "";
let slug = "";

beforeAll(async () => {
  const mentor = await criarUsuario(email("mentor"), "mentor");
  const lider = await criarUsuario(email("lider"), "aluno");
  await criarUsuario(email("livre"), "aluno", { nome: "Livre Silva" });
  const ocupado = await criarUsuario(email("ocupado"), "aluno");
  await criarEquipe({ nome: `Outra ${sufixo}`, membros: [{ id: ocupado.id, papel: "lider" }] });
  const estranho = await criarUsuario(email("estranho"), "aluno");
  void estranho;
  slug = (await criarEquipe({ nome: `E ${sufixo}`, mentorId: mentor.id, membros: [{ id: lider.id, papel: "lider" }] })).slug;
  liderAccess = await login(app, email("lider"));
  mentorAccess = await login(app, email("mentor"));
  estranhoAccess = await login(app, email("estranho"));
});

afterAll(async () => {
  await limpar(sufixo);
  await prisma.$disconnect();
});

const adicionar = (access: string, body: object) =>
  request(app).post(`/api/v1/equipes/${slug}/membros`).set(bearer(access)).send(body);

describe("POST /equipes/:slug/membros", () => {
  it("líder adiciona pessoa nova → link de convite", async () => {
    const r = await adicionar(liderAccess, { nome: "Nova Pessoa", email: email("nova") });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ nome: "Nova Pessoa", pendente: true });
    expect(r.body.conviteUrl).toContain("/convite?token=");
  });
  it("mentor adiciona aluno já ativado e livre → sem convite", async () => {
    const r = await adicionar(mentorAccess, { nome: "Nome Digitado", email: email("livre") });
    expect(r.status).toBe(201);
    // Devolve o nome digitado, nunca o cadastrado ("Livre Silva").
    expect(r.body).toMatchObject({ nome: "Nome Digitado", conviteUrl: null, pendente: false });
  });
  it("RN-03: quem está em outra equipe ativa → 409", async () => {
    const r = await adicionar(liderAccess, { nome: "Ocupado", email: email("ocupado") });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("RN03_EQUIPE_ATIVA");
  });
  it("aluno de fora → 403", async () => {
    const r = await adicionar(estranhoAccess, { nome: "Qualquer", email: email("qq") });
    expect(r.status).toBe(403);
  });
  it("detalhe mostra os 3 integrantes", async () => {
    const r = await request(app).get(`/api/v1/equipes/${slug}`).set(bearer(liderAccess));
    expect(r.body.membros).toHaveLength(3);
  });
});
