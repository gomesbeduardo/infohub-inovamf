import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { ADMIN_EMAIL, ADMIN_SENHA, CICLO_ATUAL, MODELOS_TAREFA, seedBase } from "../src/seed/base.js";

const app = createApp();

afterAll(async () => {
  await prisma.$disconnect();
});

describe("seedBase", () => {
  it("cria ciclo, modelos e admin — e rodar de novo não duplica", async () => {
    await seedBase(prisma);
    await seedBase(prisma);

    expect(await prisma.ciclos.count({ where: { nome: CICLO_ATUAL.nome } })).toBe(1);
    for (const m of MODELOS_TAREFA) {
      expect(
        await prisma.modelos_tarefa.count({ where: { etapa_id: m.etapa, titulo: m.titulo } }),
      ).toBe(1);
    }
    expect(await prisma.usuarios.count({ where: { email: ADMIN_EMAIL, tipo_usuario: "admin" } })).toBe(1);
  });

  it("o admin inicial consegue logar", async () => {
    const r = await request(app).post("/api/v1/auth/login").send({ email: ADMIN_EMAIL, senha: ADMIN_SENHA });
    expect(r.status).toBe(200);
    expect(r.body.usuario.role).toBe("admin");
  });

  it("etapa 6 tem os entregáveis finais da RN-02", () => {
    expect(MODELOS_TAREFA.filter((m) => m.etapa === 6).map((m) => m.titulo)).toEqual([
      "Pitch vídeo",
      "Business Model Canvas final",
      "Value Proposition Design final",
    ]);
  });
});
