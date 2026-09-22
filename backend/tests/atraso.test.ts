import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { dataISO, hojeISO, statusEfetivo } from "../src/domain/atraso.js";
import { bearer, criarEquipe, criarUsuario, limpar, login } from "./helpers.js";

describe("statusEfetivo (RN-04, puro)", () => {
  const ontem = new Date("2026-09-21T00:00:00.000Z");
  const hoje = "2026-09-22";
  it("pendente com prazo passado → atrasada", () => {
    expect(statusEfetivo("pendente", ontem, hoje)).toBe("atrasada");
  });
  it("em_andamento com prazo passado → atrasada", () => {
    expect(statusEfetivo("em_andamento", ontem, hoje)).toBe("atrasada");
  });
  it("prazo = hoje ainda não está atrasada", () => {
    expect(statusEfetivo("pendente", new Date("2026-09-22T00:00:00.000Z"), hoje)).toBe("pendente");
  });
  it("entregue/aprovada/ajustar nunca viram atrasada", () => {
    for (const s of ["entregue", "aprovada", "ajustar"]) {
      expect(statusEfetivo(s, ontem, hoje)).toBe(s);
    }
  });
  it("hojeISO usa o fuso de São Paulo", () => {
    // 02:00 UTC do dia 23 ainda é 23:00 do dia 22 em SP (UTC-3).
    expect(hojeISO(new Date("2026-09-23T02:00:00.000Z"))).toBe("2026-09-22");
  });
  it("dataISO corta a data do DATE do Postgres", () => {
    expect(dataISO(ontem)).toBe("2026-09-21");
  });
});

const app = createApp();
const sufixo = `atr${Date.now()}`;
let adminAccess = "";
let equipeSlug = "";

function diaRelativo(n: number): string {
  const d = new Date(`${hojeISO()}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return dataISO(d);
}

beforeAll(async () => {
  await criarUsuario(`admin.${sufixo}@teste.local`, "admin");
  adminAccess = await login(app, `admin.${sufixo}@teste.local`);
  equipeSlug = (await criarEquipe({ nome: `Equipe ${sufixo}` })).slug;
  for (const [titulo, dia] of [["Vencida", -2], ["No prazo", 3]] as const) {
    const r = await request(app)
      .post(`/api/v1/equipes/${equipeSlug}/tarefas`)
      .set(bearer(adminAccess))
      .send({ titulo, etapa: 1, dataEntrega: diaRelativo(dia), obrigatoria: true });
    expect(r.status).toBe(201);
  }
});

afterAll(async () => {
  await limpar(sufixo);
  await prisma.$disconnect();
});

describe("GET /equipes/:slug/tarefas (RN-04 na API)", () => {
  it("devolve 'atrasada' para a vencida e 'pendente' para a do prazo", async () => {
    const res = await request(app)
      .get(`/api/v1/equipes/${equipeSlug}/tarefas`)
      .set(bearer(adminAccess));
    expect(res.status).toBe(200);
    const porTitulo = Object.fromEntries(
      res.body.data.map((t: { titulo: string; status: string }) => [t.titulo, t.status]),
    );
    expect(porTitulo).toEqual({ Vencida: "atrasada", "No prazo": "pendente" });
  });

  it("?status=atrasada traz só a vencida; ?status=pendente só a do prazo", async () => {
    const atr = await request(app)
      .get(`/api/v1/equipes/${equipeSlug}/tarefas?status=atrasada`)
      .set(bearer(adminAccess));
    expect(atr.body.data.map((t: { titulo: string }) => t.titulo)).toEqual(["Vencida"]);

    const pen = await request(app)
      .get(`/api/v1/equipes/${equipeSlug}/tarefas?status=pendente`)
      .set(bearer(adminAccess));
    expect(pen.body.data.map((t: { titulo: string }) => t.titulo)).toEqual(["No prazo"]);
  });

  it("o banco NÃO grava 'atrasada' (derivado na leitura)", async () => {
    const n = await prisma.tarefas.count({
      where: { equipes: { slug: equipeSlug }, status: "atrasada" },
    });
    expect(n).toBe(0);
  });
});
