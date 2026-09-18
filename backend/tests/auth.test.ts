import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Request, Response } from "express";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { hashSenha, hashTokenSenha, tokenAleatorio } from "../src/utils/hash.js";
import { novoIdComSlug } from "../src/utils/slug.js";
import { role } from "../src/middlewares/role.js";
import type { HttpError } from "../src/utils/error.js";

const app = createApp();

const SENHA_ADMIN = "senha-super-secreta";
const sufixo = Date.now();
const emailAdmin = `admin.${sufixo}@teste.local`;
const emailConvidado = `convidado.${sufixo}@teste.local`;

let adminId = "";
let convidadoId = "";
let inviteToken = "";

beforeAll(async () => {
  const a = novoIdComSlug();
  adminId = a.id;
  await prisma.usuarios.create({
    data: {
      id: a.id,
      slug: a.slug,
      nome: "Admin Teste",
      email: emailAdmin,
      senha: await hashSenha(SENHA_ADMIN),
      telefone: "55999990000",
      tipo_usuario: "admin",
      ativo: true,
    },
  });

  const c = novoIdComSlug();
  convidadoId = c.id;
  await prisma.usuarios.create({
    data: {
      id: c.id,
      slug: c.slug,
      nome: "Convidado Teste",
      email: emailConvidado,
      senha: "PENDENTE",
      telefone: "55999991111",
      tipo_usuario: "mentor",
      ativo: true,
    },
  });

  const segredo = tokenAleatorio(24);
  const convite = await prisma.tokens_senha.create({
    data: {
      usuario_id: c.id,
      token_hash: await hashTokenSenha(segredo),
      finalidade: "convite",
      expira_em: new Date(Date.now() + 3_600_000),
    },
  });
  inviteToken = `${convite.id}.${segredo}`;
});

afterAll(async () => {
  // CASCADE remove tokens_acesso e tokens_senha dos usuários.
  await prisma.usuarios.deleteMany({
    where: { id: { in: [adminId, convidadoId] } },
  });
  await prisma.$disconnect();
});

async function loginAdmin() {
  const res = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: emailAdmin, senha: SENHA_ADMIN });
  expect(res.status).toBe(200);
  return res.body as {
    access: string;
    refresh: string;
    usuario: { slug: string; nome: string; role: string };
  };
}

describe("POST /auth/login", () => {
  it("400 sem corpo válido", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_BODY");
  });

  it("401 com senha errada (mesma mensagem de e-mail inexistente)", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: emailAdmin, senha: "errada" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("401 com e-mail inexistente, mesma resposta", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "ninguem@teste.local", senha: "errada" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("200 devolve access, refresh e usuário sem campos sensíveis", async () => {
    const body = await loginAdmin();
    expect(body.access).toBeTruthy();
    expect(body.refresh).toBeTruthy();
    expect(body.usuario.role).toBe("admin");
    expect(JSON.stringify(body.usuario)).not.toContain("senha");
  });
});

describe("GET /auth/me", () => {
  it("401 sem header Authorization", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("MISSING_TOKEN");
  });

  it("401 com token inválido", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer lixo.invalido.token");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_TOKEN");
  });

  it("200 com access válido, sem vazar senha", async () => {
    const { access } = await loginAdmin();
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${access}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(emailAdmin);
    expect(res.body).not.toHaveProperty("senha");
    expect(res.body).not.toHaveProperty("id");
  });
});

describe("POST /auth/refresh", () => {
  it("400 sem refresh", async () => {
    const res = await request(app).post("/api/v1/auth/refresh").send({});
    expect(res.status).toBe(400);
  });

  it("200 rotaciona e reuso do antigo → 401 TOKEN_REUSE", async () => {
    const { refresh } = await loginAdmin();

    const rot = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refresh });
    expect(rot.status).toBe(200);
    expect(rot.body.refresh).toBeTruthy();
    expect(rot.body.refresh).not.toBe(refresh);

    // Reapresentar o refresh já rotacionado → sessão comprometida.
    const reuse = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refresh });
    expect(reuse.status).toBe(401);
    expect(reuse.body.error.code).toBe("TOKEN_REUSE");
  });
});

describe("POST /auth/logout", () => {
  it("204 e o access revogado deixa de valer em /me", async () => {
    const { access } = await loginAdmin();

    const out = await request(app)
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${access}`);
    expect(out.status).toBe(204);

    const me = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${access}`);
    expect(me.status).toBe(401);
  });
});

describe("POST /auth/register (aceite de convite)", () => {
  it("400 com convite inválido", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ token: "id-falso.segredo-falso", senha: "senha12345" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_INVITE");
  });

  it("400 com senha fraca", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ token: inviteToken, senha: "123" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("WEAK_PASSWORD");
  });

  it("201 aceita o convite, faz auto-login e o convite não serve duas vezes", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ token: inviteToken, senha: "senha-nova-forte" });
    expect(res.status).toBe(201);
    expect(res.body.access).toBeTruthy();
    expect(res.body.usuario.role).toBe("mentor");

    const me = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${res.body.access}`);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(emailConvidado);

    // Reuso do convite → 400 INVITE_USED
    const dup = await request(app)
      .post("/api/v1/auth/register")
      .send({ token: inviteToken, senha: "outra-senha-forte" });
    expect(dup.status).toBe(400);
    expect(dup.body.error.code).toBe("INVITE_USED");
  });
});

describe("middleware role() — 403", () => {
  it("nega papel não permitido com 403 FORBIDDEN", () => {
    const req = {
      auth: { role: "aluno", slug: "s", jti: "j" },
    } as unknown as Request;
    const res = {} as unknown as Response;
    let capturado: unknown;
    role("admin")(req, res, (err?: unknown) => {
      capturado = err;
    });
    expect(capturado).toBeDefined();
    expect((capturado as HttpError).status).toBe(403);
    expect((capturado as HttpError).code).toBe("FORBIDDEN");
  });

  it("deixa passar papel permitido", () => {
    const req = {
      auth: { role: "admin", slug: "s", jti: "j" },
    } as unknown as Request;
    const res = {} as unknown as Response;
    let chamou = false;
    let capturado: unknown = "nao-chamado";
    role("admin", "mentor")(req, res, (err?: unknown) => {
      chamou = true;
      capturado = err;
    });
    expect(chamou).toBe(true);
    expect(capturado).toBeUndefined();
  });
});
