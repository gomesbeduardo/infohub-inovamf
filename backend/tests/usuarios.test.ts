import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { hashSenha } from "../src/utils/hash.js";
import { novoIdComSlug } from "../src/utils/slug.js";
import { criarEquipe, criarUsuario } from "./helpers.js";

const app = createApp();

const SENHA_ADMIN = "senha-admin-forte";
const sufixo = `u${Date.now()}`;
const emailAdmin = `admin.${sufixo}@teste.local`;
const emailConvidado = `mentor.${sufixo}@teste.local`;

let adminAccess = "";

beforeAll(async () => {
  const a = novoIdComSlug();
  await prisma.usuarios.create({
    data: {
      id: a.id,
      slug: a.slug,
      nome: "Admin CRUD",
      email: emailAdmin,
      senha: await hashSenha(SENHA_ADMIN),
      telefone: "55990000000",
      tipo_usuario: "admin",
      ativo: true,
    },
  });
  const res = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: emailAdmin, senha: SENHA_ADMIN });
  expect(res.status).toBe(200);
  adminAccess = res.body.access;
});

afterAll(async () => {
  // Equipes primeiro (mentor_id/equipe_membros referenciam usuarios).
  await prisma.equipes.deleteMany({ where: { nome_ideia: { contains: sufixo } } });
  await prisma.usuarios.deleteMany({ where: { email: { contains: sufixo } } });
  await prisma.emails.deleteMany({
    where: { destinatario_email: { contains: sufixo } },
  });
  await prisma.$disconnect();
});

function comoAdmin(req: request.Test) {
  return req.set("Authorization", `Bearer ${adminAccess}`);
}

let tokenConvite = "";
let slugCriado = "";
let mentorAccess = "";

describe("POST /usuarios (admin cria conta + convite)", () => {
  it("401 sem autenticação", async () => {
    const res = await request(app)
      .post("/api/v1/usuarios")
      .send({ nome: "Fulano", email: emailConvidado, tipo: "mentor" });
    expect(res.status).toBe(401);
  });

  it("400 com tipo inválido (aluno não é convidável)", async () => {
    const res = await comoAdmin(request(app).post("/api/v1/usuarios")).send({
      nome: "Aluno X",
      email: `aluno.${sufixo}@teste.local`,
      tipo: "aluno",
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_TIPO");
  });

  it("201 cria a conta pendente e devolve o convite", async () => {
    const res = await comoAdmin(request(app).post("/api/v1/usuarios")).send({
      nome: "Mentor Convidado",
      email: emailConvidado,
      tipo: "mentor",
    });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe("mentor");
    expect(res.body.convite.email_enfileirado).toBe(true);
    expect(res.body.token_dev).toBeTruthy(); // conveniência de dev
    tokenConvite = res.body.token_dev;
    slugCriado = res.body.slug;
  });

  it("409 com e-mail já usado", async () => {
    const res = await comoAdmin(request(app).post("/api/v1/usuarios")).send({
      nome: "Outro",
      email: emailConvidado,
      tipo: "mentor",
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EMAIL_TAKEN");
  });

  it("enfileirou um e-mail convite_conta pendente", async () => {
    const emails = await prisma.emails.findMany({
      where: { destinatario_email: emailConvidado, tipo: "convite_conta" },
    });
    expect(emails.length).toBeGreaterThanOrEqual(1);
    expect(emails[0]?.status).toBe("pendente");
  });
});

describe("GET /auth/invite (vê os dados) + POST /auth/register", () => {
  it("200 mostra os dados pré-preenchidos", async () => {
    const res = await request(app)
      .get("/api/v1/auth/invite")
      .query({ token: tokenConvite });
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(emailConvidado);
    expect(res.body.role).toBe("mentor");
  });

  it("201 aceita convite, completa telefone e loga", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      token: tokenConvite,
      senha: "minha-senha-forte",
      telefone: "55991234567",
    });
    expect(res.status).toBe(201);
    mentorAccess = res.body.access;

    const me = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${mentorAccess}`);
    expect(me.status).toBe(200);
    expect(me.body.telefone).toBe("55991234567");
  });

  it("400 no preview de convite já usado", async () => {
    const res = await request(app)
      .get("/api/v1/auth/invite")
      .query({ token: tokenConvite });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVITE_USED");
  });
});

describe("controle de acesso e CRUD", () => {
  it("403 mentor tentando criar conta", async () => {
    const res = await request(app)
      .post("/api/v1/usuarios")
      .set("Authorization", `Bearer ${mentorAccess}`)
      .send({ nome: "Hacker", email: `x.${sufixo}@teste.local`, tipo: "mentor" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("200 admin lista e encontra o usuário criado", async () => {
    const res = await comoAdmin(request(app).get("/api/v1/usuarios")).query({
      q: "Mentor Convidado",
    });
    expect(res.status).toBe(200);
    expect(res.body.data.some((u: { slug: string }) => u.slug === slugCriado)).toBe(true);
  });

  it("200 admin desativa e as sessões caem", async () => {
    const res = await comoAdmin(
      request(app).patch(`/api/v1/usuarios/${slugCriado}`),
    ).send({ ativo: false });
    expect(res.status).toBe(200);
    expect(res.body.ativo).toBe(false);

    const me = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${mentorAccess}`);
    expect(me.status).toBe(401);
  });

  it("404 ao atualizar slug inexistente", async () => {
    const res = await comoAdmin(
      request(app).patch("/api/v1/usuarios/slugquenaoexiste123456"),
    ).send({ nome: "Zeca" });
    expect(res.status).toBe(404);
  });
});

// Task 17 (#164): Contas passa a listar também alunos, com curso/semestre/equipe.
describe("GET /usuarios — alunos na lista (Task 17)", () => {
  it("aluno com curso, semestre e equipe ativa aparece com esses campos", async () => {
    const aluno = await criarUsuario(`aluna.${sufixo}@teste.local`, "aluno", {
      nome: "Aluna Com Equipe",
      curso: "Engenharia de Software",
      semestre: "3",
    });
    const equipe = await criarEquipe({
      nome: `Equipe Ativa ${sufixo}`,
      status: "ativa",
      membros: [{ id: aluno.id, papel: "lider" }],
    });

    const res = await comoAdmin(request(app).get("/api/v1/usuarios")).query({
      q: "Aluna Com Equipe",
      tipo: "aluno",
    });
    expect(res.status).toBe(200);
    const linha = res.body.data.find((u: { slug: string }) => u.slug === aluno.slug);
    expect(linha).toBeTruthy();
    expect(linha.role).toBe("aluno");
    expect(linha.curso).toBe("Engenharia de Software");
    expect(linha.semestre).toBe("3");
    expect(linha.equipe).toEqual({ slug: equipe.slug, nomeIdeia: `Equipe Ativa ${sufixo}` });
  });

  it("aluno sem equipe ativa aparece com equipe: null", async () => {
    const aluno = await criarUsuario(`aluno-sem-equipe.${sufixo}@teste.local`, "aluno", {
      nome: "Aluno Sem Equipe",
    });

    const res = await comoAdmin(request(app).get("/api/v1/usuarios")).query({
      q: "Aluno Sem Equipe",
    });
    expect(res.status).toBe(200);
    const linha = res.body.data.find((u: { slug: string }) => u.slug === aluno.slug);
    expect(linha).toBeTruthy();
    expect(linha.curso).toBeNull();
    expect(linha.semestre).toBeNull();
    expect(linha.equipe).toBeNull();
  });

  it("admin aparece com curso, semestre e equipe: null", async () => {
    const res = await comoAdmin(request(app).get("/api/v1/usuarios")).query({
      q: "Admin CRUD",
    });
    expect(res.status).toBe(200);
    const linha = res.body.data.find((u: { email: string }) => u.email === emailAdmin);
    expect(linha).toBeTruthy();
    expect(linha.curso).toBeNull();
    expect(linha.semestre).toBeNull();
    expect(linha.equipe).toBeNull();
  });

  it("tipo=aluno filtra só alunos", async () => {
    await criarUsuario(`aluno-filtro.${sufixo}@teste.local`, "aluno", {
      nome: `Aluno Filtro ${sufixo}`,
    });

    const res = await comoAdmin(request(app).get("/api/v1/usuarios")).query({
      q: sufixo,
      tipo: "aluno",
    });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const u of res.body.data as Array<{ role: string }>) {
      expect(u.role).toBe("aluno");
    }
  });

  it("sem tipo a lista continua trazendo todos os papéis", async () => {
    const res = await comoAdmin(request(app).get("/api/v1/usuarios")).query({
      q: sufixo,
    });
    expect(res.status).toBe(200);
    const papeis = new Set((res.body.data as Array<{ role: string }>).map((u) => u.role));
    expect(papeis.has("aluno")).toBe(true);
    expect(papeis.size).toBeGreaterThan(1);
  });
});

// Task 17 (#164): PATCH não deixa mudar o tipo de uma conta de aluno.
describe("PATCH /usuarios/:slug — tipo de aluno é imutável (Task 17)", () => {
  it("400 TIPO_ALUNO_IMUTAVEL ao tentar promover aluno para admin", async () => {
    const aluno = await criarUsuario(`aluno-imutavel.${sufixo}@teste.local`, "aluno", {
      nome: "Aluno Imutável",
    });

    const res = await comoAdmin(
      request(app).patch(`/api/v1/usuarios/${aluno.slug}`),
    ).send({ tipo: "admin" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("TIPO_ALUNO_IMUTAVEL");
  });

  it("200 continua permitindo editar nome/telefone de um aluno", async () => {
    const aluno = await criarUsuario(`aluno-edita.${sufixo}@teste.local`, "aluno", {
      nome: "Aluno Edita",
    });

    const res = await comoAdmin(
      request(app).patch(`/api/v1/usuarios/${aluno.slug}`),
    ).send({ nome: "Aluno Editado" });
    expect(res.status).toBe(200);
    expect(res.body.nome).toBe("Aluno Editado");
    expect(res.body.role).toBe("aluno");
  });
});
