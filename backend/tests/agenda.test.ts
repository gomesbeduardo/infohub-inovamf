import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { hojeISO, somarDias } from "../src/domain/atraso.js";
import { LIMITE_AGENDA } from "../src/models/dashboard.model.js";
import { toSlug } from "../src/utils/slug.js";
import { bearer, criarEquipe, criarUsuario, limpar, login } from "./helpers.js";

// Adendo 23/09: GET /dashboard/agenda — "mesa do mentor" (para avaliar, prazos,
// minhas equipes) e os dois primeiros blocos no painel do admin.
// Banco compartilhado: o mentor A só existe neste arquivo, então as listas DELE
// são exatas; as do admin (globais) só são checadas por pertença + teto.
const app = createApp();
const sufixo = `ag${Date.now()}`;
const email = (n: string) => `${n}.${sufixo}@teste.local`;
const dia = (n: number) => somarDias(hojeISO(), n);
let adminAccess = "";
let mentorAAccess = "";
let alunoAccess = "";
let a1 = { id: "", slug: "" };
let b1 = { id: "", slug: "" };
const idsTarefas: string[] = [];

async function tarefa(equipeId: string, titulo: string, status: string, data: Date): Promise<string> {
  const t = await prisma.tarefas.create({
    data: { equipe_id: equipeId, etapa_id: 2, titulo, status, data_entrega: data },
    select: { id: true },
  });
  idsTarefas.push(t.id);
  return t.id;
}

beforeAll(async () => {
  await criarUsuario(email("admin"), "admin");
  const mentorA = await criarUsuario(email("mentora"), "mentor");
  const mentorB = await criarUsuario(email("mentorb"), "mentor");
  const aluno = await criarUsuario(email("aluno"), "aluno");
  const alunoB = await criarUsuario(email("alunob"), "aluno");
  a1 = await criarEquipe({
    nome: `Agenda A1 ${sufixo}`,
    mentorId: mentorA.id,
    etapa: 2,
    membros: [{ id: aluno.id, papel: "lider" }],
  });
  await criarEquipe({ nome: `Agenda A2 ${sufixo}`, mentorId: mentorA.id, etapa: 3, status: "desistente" });
  b1 = await criarEquipe({
    nome: `Agenda B1 ${sufixo}`,
    mentorId: mentorB.id,
    etapa: 2,
    membros: [{ id: alunoB.id, papel: "lider" }],
  });

  // A1 (mentor A): 5 tarefas obrigatórias da Etapa 2, nenhuma aprovada.
  const entregueA = await tarefa(a1.id, "Entregue A1", "entregue", dia(20));
  await prisma.entregas.create({ data: { tarefa_id: entregueA, versao: 1, enviado_por: aluno.id } });
  await tarefa(a1.id, "Atrasada A1", "pendente", new Date("2020-01-01T00:00:00Z"));
  await tarefa(a1.id, "Ajustar amanhã", "ajustar", dia(1));
  await tarefa(a1.id, "Vence em 3 dias", "em_andamento", dia(3));
  await tarefa(a1.id, "Vence em 30 dias", "pendente", dia(30));
  await prisma.historico_etapas.create({
    data: {
      equipe_id: a1.id,
      etapa_origem_id: 1,
      etapa_destino_id: 2,
      movido_por: mentorA.id,
      status_origem: "ativa",
      status_destino: "ativa",
    },
  });

  // B1 (mentor B): datas bem antigas para aparecerem no topo da lista global do admin.
  const entregueB = await tarefa(b1.id, "Entregue B1", "entregue", new Date("1999-01-01T00:00:00Z"));
  await prisma.entregas.create({ data: { tarefa_id: entregueB, versao: 1, enviado_por: alunoB.id } });
  await tarefa(b1.id, "Atrasada B1", "pendente", new Date("1999-01-02T00:00:00Z"));

  adminAccess = await login(app, email("admin"));
  mentorAAccess = await login(app, email("mentora"));
  alunoAccess = await login(app, email("aluno"));
});

afterAll(async () => {
  await limpar(sufixo);
  await prisma.$disconnect();
});

const agenda = (access: string) => request(app).get("/api/v1/dashboard/agenda").set(bearer(access));

describe("GET /dashboard/agenda", () => {
  it("mentor: 'para avaliar' só das suas equipes, com slug, versão e quando foi enviada", async () => {
    const r = await agenda(mentorAAccess);
    expect(r.status).toBe(200);
    const { paraAvaliar } = r.body.data;
    expect(paraAvaliar).toHaveLength(1);
    expect(paraAvaliar[0]).toMatchObject({
      equipe: { slug: a1.slug, nomeIdeia: `Agenda A1 ${sufixo}` },
      tarefa: { slug: toSlug(idsTarefas[0]!), titulo: "Entregue A1" },
      versao: 1,
    });
    expect(Number.isNaN(Date.parse(paraAvaliar[0].entregueEm))).toBe(false);
  });

  it("mentor: prazos = atrasadas + próximos 7 dias, com status efetivo (RN-04), do mais antigo ao mais novo", async () => {
    const r = await agenda(mentorAAccess);
    const prazos = r.body.data.prazos as Array<{ tarefa: { titulo: string }; status: string; dataEntrega: string }>;
    expect(prazos.map((p) => p.tarefa.titulo)).toEqual(["Atrasada A1", "Ajustar amanhã", "Vence em 3 dias"]);
    expect(prazos.map((p) => p.status)).toEqual(["atrasada", "ajustar", "em_andamento"]);
    expect(prazos[2]?.dataEntrega.slice(0, 10)).toBe(dia(3).toISOString().slice(0, 10));
  });

  it("mentor: um cartão por equipe em andamento, com etapa, integrantes, pendências (RN-01) e último evento", async () => {
    const r = await agenda(mentorAAccess);
    expect(r.body.data.equipes).toEqual([
      {
        slug: a1.slug,
        nomeIdeia: `Agenda A1 ${sufixo}`,
        status: "ativa",
        etapa: { numero: 2, nome: expect.any(String) },
        membrosAtivos: 1,
        faltamParaAvancar: 5,
        ultimoEvento: { titulo: "Etapa 1 → Etapa 2", em: expect.any(String) },
      },
    ]);
  });

  it("nunca expõe UUID", async () => {
    const corpo = JSON.stringify((await agenda(mentorAAccess)).body);
    for (const id of [a1.id, ...idsTarefas]) expect(corpo).not.toContain(id);
  });

  it("admin: vê todas as equipes (inclui a do mentor B), listas com teto e sem cartões", async () => {
    const r = await agenda(adminAccess);
    expect(r.status).toBe(200);
    const { paraAvaliar, prazos, equipes } = r.body.data as {
      paraAvaliar: Array<{ equipe: { slug: string }; tarefa: { titulo: string } }>;
      prazos: Array<{ equipe: { slug: string }; tarefa: { titulo: string }; status: string }>;
      equipes: unknown[];
    };
    expect(paraAvaliar.length).toBeLessThanOrEqual(LIMITE_AGENDA);
    expect(prazos.length).toBeLessThanOrEqual(LIMITE_AGENDA);
    expect(paraAvaliar.some((i) => i.equipe.slug === b1.slug && i.tarefa.titulo === "Entregue B1")).toBe(true);
    expect(
      prazos.some((i) => i.equipe.slug === b1.slug && i.tarefa.titulo === "Atrasada B1" && i.status === "atrasada"),
    ).toBe(true);
    expect(equipes).toEqual([]);
  });

  it("aluno → 403", async () => {
    expect((await agenda(alunoAccess)).status).toBe(403);
  });
});
