import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { SENHA, bearer, criarUsuario, limpar, login } from "./helpers.js";

const app = createApp();
const sufixo = `cta${Date.now()}`;
const email = `aluno.${sufixo}@teste.local`;
let access = "";

beforeAll(async () => {
  await criarUsuario(email, "aluno");
  access = await login(app, email);
});

afterAll(async () => {
  await limpar(sufixo);
  await prisma.$disconnect();
});

describe("PATCH /auth/me", () => {
  it("edita nome e telefone", async () => {
    const r = await request(app).patch("/api/v1/auth/me").set(bearer(access)).send({ nome: "Nome Novo", telefone: "51988887777" });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ nome: "Nome Novo", telefone: "51988887777", email });
  });
  it("nome curto → 400", async () => {
    const r = await request(app).patch("/api/v1/auth/me").set(bearer(access)).send({ nome: "A" });
    expect(r.status).toBe(400);
  });
});

describe("POST /auth/senha", () => {
  it("senha atual errada → 401", async () => {
    const r = await request(app).post("/api/v1/auth/senha").set(bearer(access)).send({ atual: "errada-123", nova: "nova-senha-123" });
    expect(r.status).toBe(401);
    expect(r.body.error.code).toBe("SENHA_ATUAL_INVALIDA");
  });
  it("troca, devolve sessão nova e derruba a antiga", async () => {
    const r = await request(app).post("/api/v1/auth/senha").set(bearer(access)).send({ atual: SENHA, nova: "nova-senha-123" });
    expect(r.status).toBe(200);
    expect(r.body.access).toBeTruthy();
    const velho = await request(app).get("/api/v1/auth/me").set(bearer(access));
    expect(velho.status).toBe(401);
    const novo = await request(app).get("/api/v1/auth/me").set(bearer(r.body.access));
    expect(novo.status).toBe(200);
    await login(app, email, "nova-senha-123");
  });
});
