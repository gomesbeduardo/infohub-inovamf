import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { SENHA, bearer, criarEquipe, criarUsuario, limpar, login } from "./helpers.js";

const app = createApp();
const sufixo = `rn03${Date.now()}`;
const email = (n: string) => `${n}.${sufixo}@teste.local`;
let equipeSlug = "";
let liderAccess = "";
let novoSlug = "";
let veteranoSlug = "";
let tokenInicial = "";

function inscricao(liderEmail: string, colegas: Array<{ nome: string; email: string }>) {
  return request(app)
    .post("/api/v1/equipes/inscricao")
    .send({
      lider: { nome: "Líder RN03", email: liderEmail, senha: SENHA, telefone: "55991112222", curso: "ADS", semestre: "4º" },
      ideia: { nome: `Ideia ${liderEmail} ${sufixo}`, descricao: "desc", estagio: "ideia" },
      colegas,
    });
}

beforeAll(async () => {
  const veterano = await criarUsuario(email("veterano"), "aluno", { nome: "Veterano Souza" });
  veteranoSlug = veterano.slug;
  await criarEquipe({ nome: `Antiga ${sufixo}`, status: "encaminhada_inovamf", membros: [{ id: veterano.id, papel: "lider" }] });
  const ocupado = await criarUsuario(email("ocupado"), "aluno");
  await criarEquipe({ nome: `Ocupada ${sufixo}`, membros: [{ id: ocupado.id, papel: "lider" }] });
  await criarUsuario(email("mentor"), "mentor");
});

afterAll(async () => {
  await limpar(sufixo);
  await prisma.$disconnect();
});

describe("inscrição com colegas já cadastrados (RN-03)", () => {
  it("reutiliza o veterano (1 linha) e gera link só para o novo", async () => {
    const r = await inscricao(email("lider"), [
      { nome: "Nome Digitado", email: email("veterano") },
      { nome: "Novo Colega", email: email("novo") },
    ]);
    expect(r.status).toBe(201);
    equipeSlug = r.body.equipe.slug;
    liderAccess = r.body.access;
    const porEmail = Object.fromEntries(r.body.colegas.map((c: { email: string }) => [c.email, c]));
    expect(porEmail[email("veterano")].conviteUrl).toBeNull();
    // Rota pública: devolve o nome digitado, nunca o cadastrado ("Veterano Souza").
    expect(porEmail[email("veterano")].nome).toBe("Nome Digitado");
    expect(porEmail[email("novo")].conviteUrl).toContain("/convite?token=");
    novoSlug = porEmail[email("novo")].slug;
    tokenInicial = decodeURIComponent(porEmail[email("novo")].conviteUrl.split("token=")[1]);
    expect(await prisma.usuarios.count({ where: { email: email("veterano") } })).toBe(1);
  });

  it("líder nasce ativado; membro novo aparece como pendente", async () => {
    const r = await request(app).get(`/api/v1/equipes/${equipeSlug}`).set(bearer(liderAccess));
    const porSlug = Object.fromEntries(r.body.membros.map((m: { slug: string; pendente: boolean }) => [m.slug, m.pendente]));
    expect(porSlug[novoSlug]).toBe(true);
    expect(porSlug[veteranoSlug]).toBe(false);
    expect(r.body.membros.find((m: { papel: string }) => m.papel === "lider").pendente).toBe(false);
  });

  it("409 RN03_EQUIPE_ATIVA para quem já está em equipe ativa", async () => {
    const r = await inscricao(email("lider2"), [{ nome: "Ocupado Lima", email: email("ocupado") }]);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("RN03_EQUIPE_ATIVA");
  });

  it("409 EMAIL_NAO_ALUNO para e-mail de mentor", async () => {
    const r = await inscricao(email("lider3"), [{ nome: "Mentor Mesmo", email: email("mentor") }]);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("EMAIL_NAO_ALUNO");
  });
});

describe("POST /equipes/:slug/membros/:membro/convite", () => {
  it("líder gera link novo; o anterior deixa de valer", async () => {
    const r = await request(app)
      .post(`/api/v1/equipes/${equipeSlug}/membros/${novoSlug}/convite`)
      .set(bearer(liderAccess));
    expect(r.status).toBe(201);
    expect(r.body.conviteUrl).toContain("/convite?token=");
    const antigo = await request(app).get("/api/v1/auth/invite").query({ token: tokenInicial });
    expect(antigo.status).toBe(400);
    expect(antigo.body.error.code).toBe("INVITE_USED");
    const novo = decodeURIComponent(r.body.conviteUrl.split("token=")[1]);
    const ok = await request(app).get("/api/v1/auth/invite").query({ token: novo });
    expect(ok.status).toBe(200);
  });

  it("409 para quem já aceitou; 403 para quem não é da equipe", async () => {
    const aceito = await request(app)
      .post(`/api/v1/equipes/${equipeSlug}/membros/${veteranoSlug}/convite`)
      .set(bearer(liderAccess));
    expect(aceito.status).toBe(409);

    const estranhoAccess = await login(app, email("ocupado"));
    const proibido = await request(app)
      .post(`/api/v1/equipes/${equipeSlug}/membros/${novoSlug}/convite`)
      .set(bearer(estranhoAccess));
    expect(proibido.status).toBe(403);
  });
});

describe("POST /auth/register completa os dados do aluno", () => {
  let token = "";
  beforeAll(async () => {
    const r = await request(app)
      .post(`/api/v1/equipes/${equipeSlug}/membros/${novoSlug}/convite`)
      .set(bearer(liderAccess));
    token = decodeURIComponent(r.body.conviteUrl.split("token=")[1]);
  });

  it("400 sem curso", async () => {
    const r = await request(app).post("/api/v1/auth/register").send({ token, senha: "senha-forte-123" });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("INVALID_CURSO");
  });

  it("201 grava curso/semestre/matrícula em alunos", async () => {
    const r = await request(app)
      .post("/api/v1/auth/register")
      .send({ token, senha: "senha-forte-123", curso: "Direito", semestre: "2º", matricula: "20260001" });
    expect(r.status).toBe(201);
    const u = await prisma.usuarios.findUnique({
      where: { email: email("novo") },
      select: { convite_aceito_em: true, alunos: { select: { curso: true, semestre: true, matricula: true } } },
    });
    expect(u?.convite_aceito_em).toBeTruthy();
    expect(u?.alunos).toEqual({ curso: "Direito", semestre: "2º", matricula: "20260001" });
  });
});
