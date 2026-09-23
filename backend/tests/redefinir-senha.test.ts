import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { novoIdComSlug } from "../src/utils/slug.js";
import { SENHA, bearer, criarUsuario, limpar, login } from "./helpers.js";

// A3/RF-01: o admin gera um link de uso único (24 h); a pessoa define a senha nova.
const app = createApp();
const sufixo = `rs${Date.now()}`;
const email = (n: string) => `${n}.${sufixo}@teste.local`;
let admin = { id: "", slug: "" };
let alvo = { id: "", slug: "" };
let pendente = { id: "", slug: "" };
let adminAccess = "";
let mentorAccess = "";

beforeAll(async () => {
  admin = await criarUsuario(email("admin"), "admin");
  await criarUsuario(email("mentor"), "mentor");
  alvo = await criarUsuario(email("alvo"), "mentor", { nome: "Alvo Silva" });
  pendente = await criarUsuario(email("pend"), "mentor", { ativado: false });
  adminAccess = await login(app, email("admin"));
  mentorAccess = await login(app, email("mentor"));
});

afterAll(async () => {
  await limpar(sufixo);
  await prisma.$disconnect();
});

const gerar = (slug: string, access = adminAccess) =>
  request(app).post(`/api/v1/usuarios/${slug}/redefinir-senha`).set(bearer(access));
const tokenDo = (link: string) => decodeURIComponent(link.split("token=")[1] ?? "");
const redefinir = (token: string, senha: string) =>
  request(app).post("/api/v1/auth/redefinir-senha").send({ token, senha });
async function novoToken(): Promise<string> {
  const r = await gerar(alvo.slug);
  expect(r.status).toBe(201);
  return tokenDo(r.body.link);
}

describe("POST /usuarios/:slug/redefinir-senha (admin)", () => {
  it("201 com link relativo de 24 h e auditoria sem o segredo", async () => {
    const r = await gerar(alvo.slug);
    expect(r.status).toBe(201);
    expect(r.body.link).toMatch(/^\/redefinir-senha\?token=/);
    const horas = (Date.parse(r.body.expiraEm) - Date.now()) / 3_600_000;
    expect(horas).toBeGreaterThan(23.9);
    expect(horas).toBeLessThanOrEqual(24);

    const log = await prisma.log_auditoria.findMany({
      where: { entidade: "usuario", entidade_id: alvo.id, acao: "redefinicao_senha_gerada" },
    });
    expect(log).toHaveLength(1);
    expect(log[0]?.usuario_id).toBe(admin.id);
    const segredo = tokenDo(r.body.link).split(".")[1] ?? "";
    expect(JSON.stringify(log[0]?.dados_novos)).not.toContain(segredo);
  });

  it("mentor não gera (403)", async () => {
    expect((await gerar(alvo.slug, mentorAccess)).status).toBe(403);
  });

  it("conta com convite pendente → 409 CONVITE_PENDENTE", async () => {
    const r = await gerar(pendente.slug);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("CONVITE_PENDENTE");
  });

  it("conta inativa → 409 CONTA_INATIVA", async () => {
    const inativo = await criarUsuario(email("inativo"), "mentor", { ativo: false });
    const r = await gerar(inativo.slug);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("CONTA_INATIVA");
  });

  it("slug desconhecido → 404 USUARIO_NOT_FOUND", async () => {
    const r = await gerar(novoIdComSlug().slug);
    expect(r.status).toBe(404);
    expect(r.body.error.code).toBe("USUARIO_NOT_FOUND");
  });
});

describe("POST /auth/redefinir-senha (pública)", () => {
  it("senha curta → 400 WEAK_PASSWORD", async () => {
    const r = await redefinir(await novoToken(), "curta");
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("WEAK_PASSWORD");
  });

  it("troca a senha, derruba as sessões e o link não serve de novo", async () => {
    const acessoAntigo = await login(app, email("alvo"));
    const token = await novoToken();
    expect((await redefinir(token, "nova-senha-123")).status).toBe(204);

    expect((await request(app).get("/api/v1/auth/me").set(bearer(acessoAntigo))).status).toBe(401);
    const velha = await request(app).post("/api/v1/auth/login").send({ email: email("alvo"), senha: SENHA });
    expect(velha.status).toBe(401);
    await login(app, email("alvo"), "nova-senha-123");

    const reuso = await redefinir(token, "outra-senha-123");
    expect(reuso.status).toBe(400);
    expect(reuso.body.error.code).toBe("RESET_USED");
  });

  it("um link novo invalida o anterior", async () => {
    const primeiro = await novoToken();
    const segundo = await novoToken();
    expect((await redefinir(primeiro, "senha-do-primeiro")).body.error.code).toBe("RESET_USED");
    expect((await redefinir(segundo, "senha-do-segundo")).status).toBe(204);
  });

  it("link expirado → 400 RESET_EXPIRED", async () => {
    const token = await novoToken();
    await prisma.tokens_senha.update({
      where: { id: token.split(".")[0] ?? "" },
      data: { expira_em: new Date(Date.now() - 1000) },
    });
    const r = await redefinir(token, "qualquer-senha-1");
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("RESET_EXPIRED");
  });

  it("token malformado → 400 INVALID_RESET", async () => {
    const r = await redefinir("nao-e-um-token", "qualquer-senha-1");
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("INVALID_RESET");
  });

  it("token de convite é rejeitado aqui com o erro de redefinição (INVALID_RESET)", async () => {
    const criado = await request(app)
      .post("/api/v1/usuarios")
      .set(bearer(adminAccess))
      .send({ nome: "Convite Cruzado", email: email("cruzado"), tipo: "mentor" });
    expect(criado.status).toBe(201);
    const tokenDeConvite = criado.body.token_dev as string;

    const r = await redefinir(tokenDeConvite, "senha-valida-123");
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("INVALID_RESET");
  });
});

describe("GET /auth/invite (pública) recebendo token de outra finalidade", () => {
  it("token de redefinição é rejeitado aqui com o erro de convite (INVALID_INVITE)", async () => {
    const tokenDeRedefinicao = await novoToken();
    const r = await request(app).get("/api/v1/auth/invite").query({ token: tokenDeRedefinicao });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("INVALID_INVITE");
  });
});
