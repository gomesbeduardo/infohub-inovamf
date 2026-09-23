import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { SENHA, criarUsuario, limpar } from "./helpers.js";

// Issue #161: em produção o Express só é alcançado pelo rewrite do Next
// (127.0.0.1), com o IP real do cliente em X-Forwarded-For. O limitador fica
// desligado em NODE_ENV=test; aqui ele é religado só neste arquivo.
const app = createApp();
const sufixo = `rl${Date.now()}`;
const emailA = `a.${sufixo}@teste.local`;
const emailB = `b.${sufixo}@teste.local`;

beforeAll(async () => {
  await criarUsuario(emailA, "aluno");
  await criarUsuario(emailB, "aluno");
  vi.stubEnv("NODE_ENV", "development");
});

afterAll(async () => {
  vi.unstubAllEnvs();
  await limpar(sufixo);
  await prisma.$disconnect();
});

const entrar = (email: string, ip: string, senha = "senha-errada-123") =>
  request(app).post("/api/v1/auth/login").set("X-Forwarded-For", ip).send({ email, senha });

describe("authLimiter atrás do proxy", () => {
  it("dois clientes (IPs diferentes) não dividem o balde", async () => {
    for (let i = 0; i < 5; i++) {
      expect((await entrar(emailA, "203.0.113.10")).status).toBe(401);
    }
    expect((await entrar(emailA, "203.0.113.10")).status).toBe(429);
    expect((await entrar(emailA, "198.51.100.20")).status).toBe(401);
  });

  it("login certo não gasta tentativa", async () => {
    for (let i = 0; i < 6; i++) {
      expect((await entrar(emailB, "203.0.113.30", SENHA)).status).toBe(200);
    }
    expect((await entrar(emailB, "203.0.113.30")).status).toBe(401);
  });
});
