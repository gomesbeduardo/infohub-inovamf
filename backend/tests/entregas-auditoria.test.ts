import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { fromSlug } from "../src/utils/slug.js";
import { bearer, criarEquipe, criarUsuario, limpar, login } from "./helpers.js";

// A4: entrega enviada, avaliação e lembrete gravam auditoria na mesma
// transação. B1: a avaliação avisa TODOS os alunos ativos da equipe.
const app = createApp();
const sufixo = `aud${Date.now()}`;
const email = (n: string) => `${n}.${sufixo}@teste.local`;
let admin = { id: "", slug: "" };
let lider = { id: "", slug: "" };
let colega = { id: "", slug: "" };
let equipe = { id: "", slug: "" };
let adminAccess = "";
let mentorAccess = "";
let mentor2Access = "";
let liderAccess = "";
let tarefaSlug = "";
let entregaSlug = "";

beforeAll(async () => {
  admin = await criarUsuario(email("admin"), "admin");
  const mentor = await criarUsuario(email("mentor"), "mentor");
  await criarUsuario(email("mentor2"), "mentor");
  lider = await criarUsuario(email("lider"), "aluno");
  colega = await criarUsuario(email("colega"), "aluno");
  adminAccess = await login(app, email("admin"));
  mentorAccess = await login(app, email("mentor"));
  mentor2Access = await login(app, email("mentor2"));
  liderAccess = await login(app, email("lider"));
  equipe = await criarEquipe({
    nome: `Auditada ${sufixo}`,
    mentorId: mentor.id,
    membros: [{ id: lider.id, papel: "lider" }, { id: colega.id, papel: "integrante" }],
  });
  const t = await request(app)
    .post(`/api/v1/equipes/${equipe.slug}/tarefas`)
    .set(bearer(adminAccess))
    .send({ titulo: "Tarefa auditada", etapa: 1, dataEntrega: "2099-12-31" });
  expect(t.status).toBe(201);
  tarefaSlug = t.body.slug;
});

afterAll(async () => {
  await limpar(sufixo);
  await prisma.$disconnect();
});

const logDe = (entidade: string, id: string) =>
  prisma.log_auditoria.findMany({ where: { entidade, entidade_id: id }, orderBy: { id: "asc" } });

describe("entrega enviada (A4)", () => {
  it("grava entrega_enviada com o título e a versão", async () => {
    const r = await request(app)
      .post(`/api/v1/tarefas/${tarefaSlug}/entregas`)
      .set(bearer(liderAccess))
      .send({ links: ["https://exemplo.dev/entrega"] });
    expect(r.status).toBe(201);
    entregaSlug = r.body.slug;
    const log = await logDe("entrega", fromSlug(entregaSlug)!);
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({
      acao: "entrega_enviada",
      usuario_id: lider.id,
      dados_novos: { tarefa: "Tarefa auditada", versao: 1 },
    });
  });

  it("o aviso aos admins leva o slug da equipe (link do sino)", async () => {
    const aviso = await prisma.emails.findFirst({
      where: { destinatario_id: admin.id, tipo: "entrega_recebida_admin" },
      orderBy: { criado_em: "desc" },
    });
    expect(aviso?.dados_template).toMatchObject({ tarefa: "Tarefa auditada", equipe_slug: equipe.slug });
  });
});

describe("avaliação (A4 + B1)", () => {
  it("outro mentor (403) não avalia nem deixa log", async () => {
    const r = await request(app)
      .post(`/api/v1/entregas/${entregaSlug}/avaliacoes`)
      .set(bearer(mentor2Access))
      .send({ resultado: "aprovada" });
    expect(r.status).toBe(403);
    expect(await logDe("entrega", fromSlug(entregaSlug)!)).toHaveLength(1);
  });

  it("grava entrega_avaliada com o comentário e avisa TODOS os alunos ativos", async () => {
    const r = await request(app)
      .post(`/api/v1/entregas/${entregaSlug}/avaliacoes`)
      .set(bearer(mentorAccess))
      .send({ resultado: "ajustar", comentario: "refazer o áudio" });
    expect(r.status).toBe(201);
    const log = await logDe("entrega", fromSlug(entregaSlug)!);
    expect(log.at(-1)).toMatchObject({
      acao: "entrega_avaliada",
      dados_novos: { tarefa: "Tarefa auditada", resultado: "ajustar", comentario: "refazer o áudio" },
    });
    const avisos = await prisma.emails.findMany({
      where: { tarefa_id: fromSlug(tarefaSlug)!, tipo: "entrega_ajustar" },
      select: { destinatario_id: true, dados_template: true },
    });
    expect(avisos.map((a) => a.destinatario_id).sort()).toEqual([lider.id, colega.id].sort());
    expect(avisos[0]?.dados_template).toMatchObject({ tarefa: "Tarefa auditada", equipe_slug: equipe.slug });
  });
});

describe("lembrete manual (RF-20 + A4)", () => {
  const lembrete = (body: object) =>
    request(app).post(`/api/v1/equipes/${equipe.slug}/lembrete`).set(bearer(mentorAccess)).send(body);
  const logsLembrete = async () =>
    (await logDe("equipe", equipe.id)).filter((l) => l.acao === "lembrete_enviado");

  it("mensagem com mais de 500 caracteres → 400 e sem log", async () => {
    const r = await lembrete({ mensagem: "x".repeat(501) });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("MENSAGEM_LONGA");
    expect(await logsLembrete()).toHaveLength(0);
  });

  it("enfileira para os 2 integrantes e audita a mensagem", async () => {
    const r = await lembrete({ mensagem: "Pitch na sexta" });
    expect(r.status).toBe(201);
    expect(r.body).toEqual({ enfileirados: 2, total: 2 });
    const log = await logsLembrete();
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ dados_novos: { mensagem: "Pitch na sexta", destinatarios: 2 } });
  });
});
