import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { hashSenha } from "../src/utils/hash.js";
import { novoIdComSlug } from "../src/utils/slug.js";

const app = createApp();

const sufixo = `c${Date.now()}`;
const SENHA = "senha-de-teste-forte";
const emails = {
  admin: `admin.${sufixo}@teste.local`,
  mentor: `mentor.${sufixo}@teste.local`,
  convidado: `convidado.${sufixo}@teste.local`,
  lider: `lider.${sufixo}@teste.local`,
};

let adminAccess = "";
let mentorAccess = "";
let convidadoSlug = "";
let inviteA = "";
let liderSlug = "";

async function criarUsuario(email: string, tipo: string): Promise<void> {
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
  await criarUsuario(emails.mentor, "mentor");
  adminAccess = await login(emails.admin);
  mentorAccess = await login(emails.mentor);

  // Conta pendente criada pelo admin (gera convite A).
  const criado = await request(app)
    .post("/api/v1/usuarios")
    .set(bearer(adminAccess))
    .send({ nome: "Convidado C", email: emails.convidado, tipo: "mentor" });
  convidadoSlug = criado.body.slug;
  inviteA = criado.body.token_dev;

  // Líder de auto-cadastro (ativo, sem convite pendente) — não deve aparecer em pendentes.
  const insc = await request(app)
    .post("/api/v1/equipes/inscricao")
    .send({
      lider: {
        nome: "Líder C",
        email: emails.lider,
        senha: SENHA,
        telefone: "55991112222",
      },
      ideia: {
        nome: `Ideia conv ${sufixo}`,
        descricao: "ideia para teste de convite",
        estagio: "ideia",
      },
    });
  liderSlug = insc.body.usuario.slug;
});

afterAll(async () => {
  await prisma.equipes.deleteMany({ where: { nome_ideia: { contains: sufixo } } });
  await prisma.usuarios.deleteMany({ where: { email: { contains: sufixo } } });
  await prisma.emails.deleteMany({
    where: { destinatario_email: { contains: sufixo } },
  });
  await prisma.$disconnect();
});

describe("GET /convites/pendentes", () => {
  it("403 para não-admin", async () => {
    const res = await request(app)
      .get("/api/v1/convites/pendentes")
      .set(bearer(mentorAccess));
    expect(res.status).toBe(403);
  });

  it("inclui a conta pendente e exclui o líder de auto-cadastro", async () => {
    const res = await request(app)
      .get("/api/v1/convites/pendentes")
      .set(bearer(adminAccess));
    expect(res.status).toBe(200);
    const slugs = res.body.data.map((u: { slug: string }) => u.slug);
    expect(slugs).toContain(convidadoSlug);
    expect(slugs).not.toContain(liderSlug);
  });
});

describe("POST /usuarios/:slug/convite (reenviar)", () => {
  it("404 usuário inexistente", async () => {
    const res = await request(app)
      .post("/api/v1/usuarios/naoexisteslug1234/convite")
      .set(bearer(adminAccess));
    expect(res.status).toBe(404);
  });

  it("reemite: invalida o convite anterior e o novo funciona", async () => {
    const res = await request(app)
      .post(`/api/v1/usuarios/${convidadoSlug}/convite`)
      .set(bearer(adminAccess));
    expect(res.status).toBe(201);
    expect(res.body.convite.email_enfileirado).toBe(true);
    const inviteB = res.body.token_dev;
    expect(inviteB).toBeTruthy();
    expect(inviteB).not.toBe(inviteA);

    // Convite antigo invalidado
    const antigo = await request(app)
      .get("/api/v1/auth/invite")
      .query({ token: inviteA });
    expect(antigo.status).toBe(400);
    expect(antigo.body.error.code).toBe("INVITE_USED");

    // Novo convite válido → aceita
    const preview = await request(app)
      .get("/api/v1/auth/invite")
      .query({ token: inviteB });
    expect(preview.status).toBe(200);

    const aceite = await request(app)
      .post("/api/v1/auth/register")
      .send({ token: inviteB, senha: "senha-do-convidado" });
    expect(aceite.status).toBe(201);
  });

  it("409 após aceito", async () => {
    const res = await request(app)
      .post(`/api/v1/usuarios/${convidadoSlug}/convite`)
      .set(bearer(adminAccess));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ALREADY_ACCEPTED");
  });

  it("não aparece mais em pendentes após aceite", async () => {
    const res = await request(app)
      .get("/api/v1/convites/pendentes")
      .set(bearer(adminAccess));
    const slugs = res.body.data.map((u: { slug: string }) => u.slug);
    expect(slugs).not.toContain(convidadoSlug);
  });
});
