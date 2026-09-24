import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { bearer, criarEquipe, criarUsuario, limpar, login } from "./helpers.js";

const app = createApp();
const sufixo = `rem${Date.now()}`;
const email = (n: string) => `${n}.${sufixo}@teste.local`;

let adminAccess = "";
let mentorAccess = "";
let mentorOutraAccess = "";
let liderAccess = "";
let integranteAccess = "";

let equipe = { id: "", slug: "" };
let lider = { id: "", slug: "" };
let integrante = { id: "", slug: "" };
let integrante2 = { id: "", slug: "" };
let integrante3 = { id: "", slug: "" };
let integrante4 = { id: "", slug: "" };

beforeAll(async () => {
  await criarUsuario(email("admin"), "admin");
  const mentor = await criarUsuario(email("mentor"), "mentor");
  const mentorOutra = await criarUsuario(email("mentor-outra"), "mentor");
  lider = await criarUsuario(email("lider"), "aluno");
  integrante = await criarUsuario(email("integrante"), "aluno");
  integrante2 = await criarUsuario(email("integrante2"), "aluno");
  integrante3 = await criarUsuario(email("integrante3"), "aluno");
  integrante4 = await criarUsuario(email("integrante4"), "aluno", { ativado: false });

  equipe = await criarEquipe({
    nome: `Equipe ${sufixo}`,
    mentorId: mentor.id,
    membros: [
      { id: lider.id, papel: "lider" },
      { id: integrante.id, papel: "integrante" },
      { id: integrante2.id, papel: "integrante" },
      { id: integrante3.id, papel: "integrante" },
      { id: integrante4.id, papel: "integrante" },
    ],
  });

  // Convite pendente para integrante4 (deve ser invalidado ao ser retirado).
  await prisma.tokens_senha.create({
    data: {
      usuario_id: integrante4.id,
      token_hash: `hash-${sufixo}`,
      finalidade: "convite",
      expira_em: new Date(Date.now() + 3_600_000),
    },
  });

  adminAccess = await login(app, email("admin"));
  mentorAccess = await login(app, email("mentor"));
  mentorOutraAccess = await login(app, email("mentor-outra"));
  liderAccess = await login(app, email("lider"));
  integranteAccess = await login(app, email("integrante"));
  void mentorOutra;
});

afterAll(async () => {
  await limpar(sufixo);
  await prisma.$disconnect();
});

const remover = (access: string, membroSlug: string) =>
  request(app).delete(`/api/v1/equipes/${equipe.slug}/membros/${membroSlug}`).set(bearer(access));

const auditoria = () =>
  prisma.log_auditoria.findMany({
    where: { entidade: "equipe", entidade_id: equipe.id, acao: "membro_removido" },
    orderBy: { id: "asc" },
  });

const vinculo = (usuarioId: string) =>
  prisma.equipe_membros.findUnique({
    where: { equipe_id_usuario_id: { equipe_id: equipe.id, usuario_id: usuarioId } },
  });

describe("DELETE /equipes/:slug/membros/:membro", () => {
  it("integrante tentando retirar outro → 403", async () => {
    const r = await remover(integranteAccess, integrante2.slug);
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe("FORBIDDEN");
  });

  it("mentor de outra equipe → 403", async () => {
    const r = await remover(mentorOutraAccess, integrante2.slug);
    expect(r.status).toBe(403);
  });

  it("retirar o líder → 409 LIDER_NAO_REMOVIVEL", async () => {
    const r = await remover(adminAccess, lider.slug);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("LIDER_NAO_REMOVIVEL");
    expect(r.body.error.message).toBe("O líder não pode ser retirado da equipe.");
  });

  it("membro inexistente/já retirado → 404", async () => {
    const r = await remover(adminAccess, "aaaaaaaaaaaaaaaaaaaaaa");
    expect(r.status).toBe(404);
    expect(r.body.error.code).toBe("MEMBRO_NOT_FOUND");
  });

  it("admin retira integrante → 200, vínculo inativo, 1 linha de auditoria", async () => {
    const antes = new Date();
    const r = await remover(adminAccess, integrante.slug);
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ slug: integrante.slug });
    expect(typeof r.body.removidoEm).toBe("string");

    const v = await vinculo(integrante.id);
    expect(v?.ativo).toBe(false);
    expect(v?.saiu_em).not.toBeNull();
    expect(v!.saiu_em!.getTime()).toBeGreaterThanOrEqual(antes.getTime() - 1000);

    const log = await auditoria();
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ acao: "membro_removido" });
    expect(log[0]?.dados_novos).toMatchObject({ membro: integrante.slug });
    expect(log[0]?.usuario_id).not.toBeNull();
  });

  it("mentor da equipe retira integrante → 200", async () => {
    const r = await remover(mentorAccess, integrante2.slug);
    expect(r.status).toBe(200);
    const v = await vinculo(integrante2.id);
    expect(v?.ativo).toBe(false);
  });

  it("líder (aluno) retira integrante → 200", async () => {
    const r = await remover(liderAccess, integrante3.slug);
    expect(r.status).toBe(200);
    const v = await vinculo(integrante3.id);
    expect(v?.ativo).toBe(false);
  });

  it("convite pendente do retirado fica invalidado", async () => {
    const r = await remover(adminAccess, integrante4.slug);
    expect(r.status).toBe(200);
    const tokens = await prisma.tokens_senha.findMany({
      where: { usuario_id: integrante4.id, finalidade: "convite" },
    });
    expect(tokens.length).toBeGreaterThan(0);
    for (const t of tokens) expect(t.usado_em).not.toBeNull();
  });

  it("detalhe da equipe não lista mais os retirados", async () => {
    const r = await request(app).get(`/api/v1/equipes/${equipe.slug}`).set(bearer(adminAccess));
    const slugs = r.body.membros.map((m: { slug: string }) => m.slug);
    expect(slugs).not.toContain(integrante.slug);
    expect(slugs).not.toContain(integrante2.slug);
    expect(slugs).not.toContain(integrante3.slug);
    expect(slugs).not.toContain(integrante4.slug);
    expect(slugs).toContain(lider.slug);
  });

  it("readicionar a mesma pessoa depois → 201 e volta ativo", async () => {
    const r = await request(app)
      .post(`/api/v1/equipes/${equipe.slug}/membros`)
      .set(bearer(adminAccess))
      .send({ nome: "Integrante Volta", email: email("integrante") });
    expect(r.status).toBe(201);

    const v = await vinculo(integrante.id);
    expect(v?.ativo).toBe(true);
    expect(v?.saiu_em).toBeNull();
    expect(v?.papel).toBe("integrante");

    const det = await request(app).get(`/api/v1/equipes/${equipe.slug}`).set(bearer(adminAccess));
    const slugs = det.body.membros.map((m: { slug: string }) => m.slug);
    expect(slugs).toContain(integrante.slug);
  });
});
