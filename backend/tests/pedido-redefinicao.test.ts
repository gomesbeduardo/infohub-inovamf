import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { MENSAGEM_PEDIDO_REDEFINICAO } from "../src/controllers/auth.controller.js";
import { bearer, criarUsuario, limpar, login } from "./helpers.js";

// Adendo 23/09 (RF-01): a pessoa pede a redefinição na tela pública. Resposta
// SEMPRE 202 e igual (sem enumeração). Com conta ativa e convite aceito, cada
// admin ativo recebe o aviso no sino (status 'cancelado' — nunca vira e-mail),
// no máximo 1 por conta por hora, auditado na mesma transação.
// Banco compartilhado: CADA admin ativo (de outros arquivos também) recebe o
// aviso, então as asserções filtram pelo e-mail de quem pediu (dados.email).
const app = createApp();
const sufixo = `pr${Date.now()}`;
const email = (n: string) => `${n}.${sufixo}@teste.local`;
let admin = { id: "", slug: "" };
let adminInativo = { id: "", slug: "" };
let alvo = { id: "", slug: "" };
let pendente = { id: "", slug: "" };
let inativo = { id: "", slug: "" };
let adminAccess = "";

beforeAll(async () => {
  admin = await criarUsuario(email("admin"), "admin");
  adminInativo = await criarUsuario(email("admin-off"), "admin", { ativo: false });
  alvo = await criarUsuario(email("alvo"), "mentor", { nome: "Alvo Pedido" });
  pendente = await criarUsuario(email("pend"), "aluno", { ativado: false });
  inativo = await criarUsuario(email("off"), "aluno", { ativo: false });
  adminAccess = await login(app, email("admin"));
});

afterAll(async () => {
  // os avisos também foram para admins de fora deste arquivo (ex.: o da base)
  await prisma.emails.deleteMany({
    where: { tipo: "recuperacao_senha", dados_template: { path: ["email"], string_contains: sufixo } },
  });
  await limpar(sufixo);
  await prisma.$disconnect();
});

const pedir = (e: unknown) => request(app).post("/api/v1/auth/pedido-redefinicao").send({ email: e });
const avisosDe = (e: string) =>
  prisma.emails.findMany({
    where: { tipo: "recuperacao_senha", dados_template: { path: ["email"], equals: e } },
    select: { destinatario_id: true, status: true, assunto: true, dados_template: true },
  });
const pedidosDe = (usuarioId: string) =>
  prisma.log_auditoria.findMany({
    where: { entidade: "usuario", entidade_id: usuarioId, acao: "redefinicao_solicitada" },
    select: { usuario_id: true, dados_novos: true },
  });

describe("POST /auth/pedido-redefinicao", () => {
  it("conta ativa: 202 genérico; cada admin ativo recebe o aviso cancelado; pedido auditado", async () => {
    const r = await pedir(email("alvo"));
    expect(r.status).toBe(202);
    expect(r.body).toEqual({ mensagem: MENSAGEM_PEDIDO_REDEFINICAO });

    const avisos = await avisosDe(email("alvo"));
    const destinos = avisos.map((a) => a.destinatario_id);
    expect(destinos).toContain(admin.id);
    expect(destinos).not.toContain(adminInativo.id);
    expect(avisos.every((a) => a.status === "cancelado")).toBe(true);
    expect(avisos[0]?.assunto).toBe("Pedido de redefinição de senha: Alvo Pedido");
    expect(avisos[0]?.dados_template).toEqual({ nome: "Alvo Pedido", email: email("alvo"), usuario_slug: alvo.slug });

    const log = await pedidosDe(alvo.id);
    expect(log).toHaveLength(1);
    expect(log[0]?.usuario_id).toBeNull();
    const notificados = (log[0]?.dados_novos as { notificados: number }).notificados;
    expect(notificados).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(log[0]?.dados_novos)).not.toContain(email("alvo"));
  });

  it("o admin vê o pedido no sino (GET /notificacoes)", async () => {
    const inbox = await request(app).get("/api/v1/notificacoes").set(bearer(adminAccess));
    expect(inbox.status).toBe(200);
    const aviso = (inbox.body.data as Array<{ tipo: string; status: string; dados: { usuario_slug?: string } }>).find(
      (n) => n.tipo === "recuperacao_senha" && n.dados.usuario_slug === alvo.slug,
    );
    expect(aviso?.status).toBe("cancelado");
  });

  it("repetir dentro de 1 h não duplica aviso nem auditoria (mesmo 202)", async () => {
    const antes = (await avisosDe(email("alvo"))).length;
    const r = await pedir(`  ${email("alvo").toUpperCase()} `);
    expect(r.status).toBe(202);
    expect(r.body).toEqual({ mensagem: MENSAGEM_PEDIDO_REDEFINICAO });
    expect((await avisosDe(email("alvo"))).length).toBe(antes);
    expect(await pedidosDe(alvo.id)).toHaveLength(1);
  });

  it("sem conta, convite pendente ou conta inativa: o MESMO 202 e nada enfileirado nem auditado", async () => {
    for (const e of [email("ninguem"), email("pend"), email("off")]) {
      const r = await pedir(e);
      expect(r.status).toBe(202);
      expect(r.body).toEqual({ mensagem: MENSAGEM_PEDIDO_REDEFINICAO });
      expect(await avisosDe(e)).toHaveLength(0);
    }
    expect(await pedidosDe(pendente.id)).toHaveLength(0);
    expect(await pedidosDe(inativo.id)).toHaveLength(0);
  });

  it("passada 1 h, um novo pedido volta a avisar", async () => {
    const antes = (await avisosDe(email("alvo"))).length;
    await prisma.log_auditoria.updateMany({
      where: { entidade: "usuario", entidade_id: alvo.id, acao: "redefinicao_solicitada" },
      data: { criado_em: new Date(Date.now() - 61 * 60_000) },
    });
    expect((await pedir(email("alvo"))).status).toBe(202);
    expect((await avisosDe(email("alvo"))).length).toBeGreaterThan(antes);
    expect(await pedidosDe(alvo.id)).toHaveLength(2);
  });

  it("e-mail ausente ou malformado → 400 INVALID_EMAIL", async () => {
    for (const e of [undefined, "", "sem-arroba"]) {
      const r = await pedir(e);
      expect(r.status).toBe(400);
      expect(r.body.error.code).toBe("INVALID_EMAIL");
    }
  });
});
