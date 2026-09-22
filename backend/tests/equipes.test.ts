import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { hashSenha } from "../src/utils/hash.js";
import { novoIdComSlug } from "../src/utils/slug.js";

const app = createApp();

const sufixo = `e${Date.now()}`;
const SENHA = "senha-de-teste-forte";
const emails = {
  admin: `admin.${sufixo}@teste.local`,
  mentor: `mentor.${sufixo}@teste.local`,
  mentor2: `mentor2.${sufixo}@teste.local`,
  outsider: `outsider.${sufixo}@teste.local`,
  lider: `lider.${sufixo}@teste.local`,
  colega: `colega.${sufixo}@teste.local`,
};

let adminAccess = "";
let mentorAccess = "";
let mentor2Access = "";
let outsiderAccess = "";
let mentorSlug = "";

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
  expect(res.status).toBe(200);
  return res.body.access;
}

beforeAll(async () => {
  await criarUsuario(emails.admin, "admin");
  mentorSlug = await criarUsuario(emails.mentor, "mentor");
  await criarUsuario(emails.mentor2, "mentor");
  await criarUsuario(emails.outsider, "aluno");

  adminAccess = await login(emails.admin);
  mentorAccess = await login(emails.mentor);
  mentor2Access = await login(emails.mentor2);
  outsiderAccess = await login(emails.outsider);
});

afterAll(async () => {
  // Equipes primeiro (cascade em membros/histórico); membros usam RESTRICT.
  await prisma.equipes.deleteMany({ where: { nome_ideia: { contains: sufixo } } });
  await prisma.usuarios.deleteMany({ where: { email: { contains: sufixo } } });
  await prisma.emails.deleteMany({
    where: { destinatario_email: { contains: sufixo } },
  });
  await prisma.$disconnect();
});

const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

let inscSlug = "";
let liderAccess = "";
let colegaToken = "";
let storeSlug = "";

describe("referência", () => {
  it("GET /areas-ideia → lista áreas", async () => {
    const res = await request(app).get("/api/v1/areas-ideia");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(4);
  });
  it("GET /etapas-funil → 6 etapas", async () => {
    const res = await request(app).get("/api/v1/etapas-funil");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(6);
  });
});

describe("POST /equipes/inscricao (formulário de ideia)", () => {
  it("201 cria conta do líder + equipe + convite de colega", async () => {
    const res = await request(app)
      .post("/api/v1/equipes/inscricao")
      .send({
        lider: {
          nome: "Líder Um",
          email: emails.lider,
          senha: SENHA,
          telefone: "55991112222",
          curso: "Engenharia",
        },
        ideia: {
          nome: `Ideia insc ${sufixo}`,
          descricao: "Uma ideia crua, mas promissora.",
          estagio: "prototipo",
          area: "Educação",
        },
        colegas: [{ nome: "Colega Um", email: emails.colega }],
      });
    expect(res.status).toBe(201);
    expect(res.body.access).toBeTruthy();
    expect(res.body.usuario.role).toBe("aluno");
    inscSlug = res.body.equipe.slug;
    liderAccess = res.body.access;
    colegaToken = res.body.colegas[0].token_dev;
    expect(colegaToken).toBeTruthy();
  });

  it("líder vê a própria equipe; outsider não (403)", async () => {
    const meu = await request(app)
      .get(`/api/v1/equipes/${inscSlug}`)
      .set(bearer(liderAccess));
    expect(meu.status).toBe(200);
    expect(meu.body.membros.length).toBe(2);

    const alheio = await request(app)
      .get(`/api/v1/equipes/${inscSlug}`)
      .set(bearer(outsiderAccess));
    expect(alheio.status).toBe(403);
  });

  it("colega aceita o convite e define a senha", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ token: colegaToken, senha: "senha-colega-forte", telefone: "55993334444" });
    expect(res.status).toBe(201);
    expect(res.body.usuario.role).toBe("aluno");
  });

  it("409 e-mail já cadastrado", async () => {
    const res = await request(app)
      .post("/api/v1/equipes/inscricao")
      .send({
        lider: {
          nome: "Outro Líder",
          email: emails.lider,
          senha: SENHA,
          telefone: "55990000000",
        },
        ideia: {
          nome: `Ideia dup ${sufixo}`,
          descricao: "desc",
          estagio: "ideia",
        },
      });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EMAIL_TAKEN");
  });

  it("400 estágio inválido", async () => {
    const res = await request(app)
      .post("/api/v1/equipes/inscricao")
      .send({
        lider: {
          nome: "Alguém",
          email: `novo.${sufixo}@teste.local`,
          senha: SENHA,
          telefone: "55990000000",
        },
        ideia: { nome: `Ideia x ${sufixo}`, descricao: "d", estagio: "banana" },
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_ESTAGIO");
  });
});

describe("GET /equipes (escopo por papel)", () => {
  it("401 sem auth", async () => {
    const res = await request(app).get("/api/v1/equipes");
    expect(res.status).toBe(401);
  });
  it("admin vê a equipe inscrita; mentor sem equipe não vê", async () => {
    const adm = await request(app).get("/api/v1/equipes").set(bearer(adminAccess));
    expect(adm.status).toBe(200);
    expect(adm.body.data.some((e: { slug: string }) => e.slug === inscSlug)).toBe(true);

    const men = await request(app).get("/api/v1/equipes").set(bearer(mentorAccess));
    expect(men.status).toBe(200);
    expect(men.body.data.some((e: { slug: string }) => e.slug === inscSlug)).toBe(false);
  });
});

describe("admin cria equipe com mentor + mover etapa (RF-09)", () => {
  it("201 admin cria equipe atribuindo mentor", async () => {
    const res = await request(app)
      .post("/api/v1/equipes")
      .set(bearer(adminAccess))
      .send({
        nomeIdeia: `Ideia store ${sufixo}`,
        descricaoIdeia: "descrição da ideia store",
        estagio: "ideia",
        mentor: mentorSlug,
      });
    expect(res.status).toBe(201);
    storeSlug = res.body.slug;
  });

  it("mentor da equipe a enxerga; move etapa (200); outro mentor não (403)", async () => {
    const men = await request(app).get("/api/v1/equipes").set(bearer(mentorAccess));
    expect(men.body.data.some((e: { slug: string }) => e.slug === storeSlug)).toBe(true);

    const mov = await request(app)
      .post(`/api/v1/equipes/${storeSlug}/etapa`)
      .set(bearer(mentorAccess))
      .send({ etapa: 2, observacao: "avançando" });
    expect(mov.status).toBe(200);
    expect(mov.body.etapa.numero).toBe(2);

    const proibido = await request(app)
      .post(`/api/v1/equipes/${storeSlug}/etapa`)
      .set(bearer(mentor2Access))
      .send({ etapa: 3 });
    expect(proibido.status).toBe(403);
  });

  it("histórico registra a movimentação", async () => {
    const det = await request(app)
      .get(`/api/v1/equipes/${storeSlug}`)
      .set(bearer(adminAccess));
    expect(det.status).toBe(200);
    expect(det.body.etapa.numero).toBe(2);
    expect(det.body.historico.length).toBeGreaterThanOrEqual(1);
    expect(det.body.historico[0].para).toBe(2);
  });

  it("PATCH não marca pronta_inovamf (RN-02 exige a transição)", async () => {
    const res = await request(app)
      .patch(`/api/v1/equipes/${storeSlug}`)
      .set(bearer(adminAccess))
      .send({ status: "pronta_inovamf" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("USE_TRANSICAO");
  });

  it("404 mover etapa de equipe inexistente", async () => {
    const res = await request(app)
      .post("/api/v1/equipes/naoexisteslug1234567890/etapa")
      .set(bearer(adminAccess))
      .send({ etapa: 2 });
    expect(res.status).toBe(404);
  });
});
