import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { bearer, criarEquipe, criarUsuario, limpar, login } from "./helpers.js";

const app = createApp();
const sufixo = `det${Date.now()}`;
const email = (n: string) => `${n}.${sufixo}@teste.local`;
let liderAccess = "";
let integranteAccess = "";
let equipe = { id: "", slug: "" };

beforeAll(async () => {
  const lider = await criarUsuario(email("lider"), "aluno");
  const integrante = await criarUsuario(email("integrante"), "aluno");
  await prisma.alunos.create({ data: { usuario_id: lider.id, curso: "Direito", semestre: "3º" } });
  equipe = await criarEquipe({
    nome: `D ${sufixo}`,
    etapa: 2,
    membros: [
      { id: lider.id, papel: "lider" },
      { id: integrante.id, papel: "integrante" },
    ],
  });
  await prisma.tarefas.create({
    data: { equipe_id: equipe.id, etapa_id: 2, titulo: "Obrigatória", obrigatoria: true, data_entrega: new Date("2099-01-01T00:00:00Z") },
  });
  liderAccess = await login(app, email("lider"));
  integranteAccess = await login(app, email("integrante"));
});

afterAll(async () => {
  await limpar(sufixo);
  await prisma.$disconnect();
});

describe("GET /equipes/:slug", () => {
  it("membros trazem curso e semestre; pendências para avançar listadas", async () => {
    const r = await request(app).get(`/api/v1/equipes/${equipe.slug}`).set(bearer(liderAccess));
    expect(r.status).toBe(200);
    expect(r.body.membros[0]).toMatchObject({ curso: "Direito", semestre: "3º", pendente: false });
    expect(r.body.pendenciasParaAvancar).toEqual([
      expect.objectContaining({ tipo: "tarefa", titulo: "Obrigatória" }),
    ]);
  });

  it("souLider: true para o líder, false para o integrante", async () => {
    const doLider = await request(app).get(`/api/v1/equipes/${equipe.slug}`).set(bearer(liderAccess));
    expect(doLider.body.souLider).toBe(true);

    const doIntegrante = await request(app)
      .get(`/api/v1/equipes/${equipe.slug}`)
      .set(bearer(integranteAccess));
    expect(doIntegrante.body.souLider).toBe(false);
  });
});
