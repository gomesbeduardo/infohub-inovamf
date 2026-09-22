import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { bearer, criarEquipe, criarUsuario, limpar, login } from "./helpers.js";

const app = createApp();
const sufixo = `rn01${Date.now()}`;
const email = (n: string) => `${n}.${sufixo}@teste.local`;
let adminAccess = "";
let mentorAccess = "";
let equipe = { id: "", slug: "" };
let final = { id: "", slug: "" };
let obrigatoriaSlug = "";

async function novaTarefa(slug: string, titulo: string, etapa: number, obrigatoria: boolean) {
  const r = await request(app)
    .post(`/api/v1/equipes/${slug}/tarefas`)
    .set(bearer(adminAccess))
    .send({ titulo, etapa, dataEntrega: "2099-12-31", obrigatoria });
  expect(r.status).toBe(201);
  return r.body.slug as string;
}

beforeAll(async () => {
  await criarUsuario(email("admin"), "admin");
  const mentor = await criarUsuario(email("mentor"), "mentor");
  const lider = await criarUsuario(email("lider"), "aluno");
  const pendente = await criarUsuario(email("pendente"), "aluno", { ativado: false, nome: "Pendente Silva" });
  adminAccess = await login(app, email("admin"));
  mentorAccess = await login(app, email("mentor"));

  equipe = await criarEquipe({ nome: `Equipe ${sufixo}`, mentorId: mentor.id, etapa: 2 });
  obrigatoriaSlug = await novaTarefa(equipe.slug, "Obrigatória E2", 2, true);
  await novaTarefa(equipe.slug, "Opcional E2", 2, false);

  final = await criarEquipe({
    nome: `Final ${sufixo}`,
    mentorId: mentor.id,
    etapa: 6,
    membros: [{ id: lider.id, papel: "lider" }, { id: pendente.id, papel: "integrante" }],
  });
  await prisma.alunos.create({ data: { usuario_id: lider.id, curso: "ADS", semestre: "5º" } });
});

afterAll(async () => {
  await limpar(sufixo);
  await prisma.$disconnect();
});

const mover = (slug: string, body: object) =>
  request(app).post(`/api/v1/equipes/${slug}/etapa`).set(bearer(mentorAccess)).send(body);

describe("RN-01 — avançar etapa", () => {
  it("409 com a obrigatória pendente (a opcional não bloqueia)", async () => {
    const r = await mover(equipe.slug, { etapa: 3 });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("RN01_PENDENCIAS");
    expect(r.body.error.details.pendencias).toEqual([
      { tipo: "tarefa", slug: obrigatoriaSlug, titulo: "Obrigatória E2" },
    ]);
  });

  it("forçar sem observação → 400", async () => {
    const r = await mover(equipe.slug, { etapa: 3, forcado: true });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("OBSERVACAO_OBRIGATORIA");
  });

  it("aprovada a obrigatória, avança sem forçar e registra histórico", async () => {
    const ap = await request(app)
      .patch(`/api/v1/tarefas/${obrigatoriaSlug}`)
      .set(bearer(mentorAccess))
      .send({ status: "aprovada" });
    expect(ap.status).toBe(200);

    const r = await mover(equipe.slug, { etapa: 3 });
    expect(r.status).toBe(200);
    expect(r.body.etapa.numero).toBe(3);
    expect(r.body.forcado).toBe(false);

    const det = await request(app).get(`/api/v1/equipes/${equipe.slug}`).set(bearer(adminAccess));
    expect(det.body.historico[0]).toMatchObject({ de: 2, para: 3, forcado: false });
  });

  it("salto 3 → 5 exige forçar; forçado com observação passa", async () => {
    const bloq = await mover(equipe.slug, { etapa: 5 });
    expect(bloq.status).toBe(409);
    expect(bloq.body.error.code).toBe("RN01_SALTO");

    const ok = await mover(equipe.slug, { etapa: 5, forcado: true, observacao: "equipe já tinha o VPD" });
    expect(ok.status).toBe(200);
    expect(ok.body.forcado).toBe(true);
  });

  it("retroceder não checa nada", async () => {
    const r = await mover(equipe.slug, { etapa: 2 });
    expect(r.status).toBe(200);
    expect(r.body.etapa.numero).toBe(2);
  });
});

describe("RN-02 — Pronta para o InovAMF", () => {
  it("409 lista o integrante com convite pendente", async () => {
    const r = await mover(final.slug, { etapa: "pronta" });
    expect(r.status).toBe(409);
    expect(r.body.error.details.pendencias).toEqual([
      expect.objectContaining({ tipo: "integrante", nome: "Pendente Silva", motivo: "convite_pendente" }),
    ]);
  });

  it("forçado vira pronta_inovamf; histórico mostra 6 → pronta", async () => {
    const r = await mover(final.slug, { etapa: "pronta", forcado: true, observacao: "coordenação liberou" });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("pronta_inovamf");
    const det = await request(app).get(`/api/v1/equipes/${final.slug}`).set(bearer(adminAccess));
    expect(det.body.historico[0]).toMatchObject({ de: 6, para: "pronta", forcado: true });
    expect(det.body.prontaInovamfEm).toBeTruthy();
  });

  it("voltar para a etapa 6 reativa a equipe", async () => {
    const r = await mover(final.slug, { etapa: 6 });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("ativa");
    const det = await request(app).get(`/api/v1/equipes/${final.slug}`).set(bearer(adminAccess));
    expect(det.body.prontaInovamfEm).toBeNull();
    expect(det.body.historico[0]).toMatchObject({ de: "pronta", para: 6 });
  });

  it("PATCH status=pronta_inovamf é recusado (só pela transição)", async () => {
    const r = await request(app)
      .patch(`/api/v1/equipes/${final.slug}`)
      .set(bearer(adminAccess))
      .send({ status: "pronta_inovamf" });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("USE_TRANSICAO");
  });
});
