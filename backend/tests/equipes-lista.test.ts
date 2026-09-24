import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { bearer, criarEquipe, criarUsuario, limpar, login } from "./helpers.js";

const app = createApp();
const sufixo = `lst${Date.now()}`;
const email = (n: string) => `${n}.${sufixo}@teste.local`;
const CICLO = `C${sufixo}`.slice(0, 60);
let adminAccess = "";
let x = { id: "", slug: "" };
let y = { id: "", slug: "" };

beforeAll(async () => {
  await criarUsuario(email("admin"), "admin");
  adminAccess = await login(app, email("admin"));
  const lider = await criarUsuario(email("lider"), "aluno", { nome: "Lia Líder" });
  const membro = await criarUsuario(email("membro"), "aluno");
  await prisma.alunos.create({ data: { usuario_id: lider.id, curso: "Direito", semestre: "3º" } });
  await prisma.alunos.create({ data: { usuario_id: membro.id, curso: "ADS", semestre: "2º" } });
  x = await criarEquipe({
    nome: `X ${sufixo}`,
    membros: [{ id: lider.id, papel: "lider" }, { id: membro.id, papel: "integrante" }],
  });
  await prisma.tarefas.create({
    data: { equipe_id: x.id, etapa_id: 1, titulo: "Vencida", data_entrega: new Date("2020-01-01T00:00:00Z") },
  });
  const ciclo = await prisma.ciclos.create({
    data: { nome: CICLO, data_inicio: new Date("2000-01-01T00:00:00Z") },
  });
  y = await criarEquipe({ nome: `Y ${sufixo}` });
  await prisma.equipes.update({ where: { id: y.id }, data: { ciclo_id: ciclo.id } });
});

afterAll(async () => {
  await limpar(sufixo);
  await prisma.ciclos.deleteMany({ where: { nome: CICLO } });
  await prisma.$disconnect();
});

const listar = (qs: string) =>
  request(app).get(`/api/v1/equipes?q=${sufixo}&${qs}`).set(bearer(adminAccess));
const nomes = (r: request.Response) =>
  (r.body.data as Array<{ nomeIdeia: string }>).map((e) => e.nomeIdeia).sort();

describe("GET /equipes — linha do funil", () => {
  it("traz líder com curso, contagem de membros e de atrasadas", async () => {
    const r = await listar("");
    expect(r.status).toBe(200);
    const lx = r.body.data.find((e: { nomeIdeia: string }) => e.nomeIdeia === `X ${sufixo}`);
    expect(lx).toMatchObject({
      lider: { nome: "Lia Líder", curso: "Direito" },
      membrosCount: 2,
      tarefasAtrasadas: 1,
      ciclo: null,
    });
    const ly = r.body.data.find((e: { nomeIdeia: string }) => e.nomeIdeia === `Y ${sufixo}`);
    expect(ly).toMatchObject({ lider: null, membrosCount: 0, tarefasAtrasadas: 0, ciclo: CICLO });
  });
});

describe("GET /equipes — filtros RF-07", () => {
  it("curso casa com QUALQUER membro, sem diferenciar maiúsculas", async () => {
    expect(nomes(await listar("curso=ads"))).toEqual([`X ${sufixo}`]);
  });
  it("statusTarefa usa o status efetivo (RN-04)", async () => {
    expect(nomes(await listar("statusTarefa=atrasada"))).toEqual([`X ${sufixo}`]);
    expect(nomes(await listar("statusTarefa=aprovada"))).toEqual([]);
  });
  it("ciclo por nome; ciclo desconhecido → 400", async () => {
    expect(nomes(await listar(`ciclo=${encodeURIComponent(CICLO)}`))).toEqual([`Y ${sufixo}`]);
    const r = await listar("ciclo=nao-existe");
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("INVALID_CICLO");
  });
});

describe("ciclos", () => {
  it("GET /ciclos lista os ativos", async () => {
    const r = await request(app).get("/api/v1/ciclos");
    expect(r.status).toBe(200);
    expect(r.body.data.some((c: { nome: string }) => c.nome === CICLO)).toBe(true);
  });
  it("inscrição entra no ciclo atual (ativo mais recente)", async () => {
    const r = await request(app).post("/api/v1/equipes/inscricao").send({
      consentimento: true,
      lider: { nome: "Líder Ciclo", email: email("lciclo"), senha: "senha-forte-1", telefone: "5199" },
      ideia: { nome: `Z ${sufixo}`, descricao: "d", estagio: "ideia" },
    });
    expect(r.status).toBe(201);
    const atual = await prisma.ciclos.findFirst({ where: { ativo: true }, orderBy: { data_inicio: "desc" } });
    const eq = await prisma.equipes.findUnique({ where: { slug: r.body.equipe.slug }, select: { ciclo_id: true } });
    expect(eq?.ciclo_id).toBe(atual?.id ?? null);
  });
});
