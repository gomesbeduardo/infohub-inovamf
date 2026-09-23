import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { bearer, criarUsuario, limpar, login, SENHA } from "./helpers.js";

const app = createApp();
const sufixo = `pc${Date.now()}`;
const email = (n: string) => `${n}.${sufixo}@teste.local`;

let adminSlug = "";
let outroSlug = "";
let access = "";

beforeAll(async () => {
  adminSlug = (await criarUsuario(email("admin"), "admin")).slug;
  outroSlug = (await criarUsuario(email("outro"), "admin")).slug;
  access = await login(app, email("admin"), SENHA);
});

afterAll(() => limpar(sufixo));

describe("admin não mexe no próprio acesso", () => {
  it("não desativa a própria conta (409 PROPRIA_CONTA) e continua ativo", async () => {
    const r = await request(app).patch(`/api/v1/usuarios/${adminSlug}`).set(bearer(access)).send({ ativo: false });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("PROPRIA_CONTA");
    const eu = await prisma.usuarios.findUnique({ where: { email: email("admin") } });
    expect(eu?.ativo).toBe(true);
  });

  it("não rebaixa o próprio perfil de admin", async () => {
    const r = await request(app).patch(`/api/v1/usuarios/${adminSlug}`).set(bearer(access)).send({ tipo: "mentor" });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("PROPRIA_CONTA");
  });

  it("ainda edita o próprio nome e ainda desativa outra conta", async () => {
    const nome = await request(app).patch(`/api/v1/usuarios/${adminSlug}`).set(bearer(access)).send({ nome: "Admin Renomeado", tipo: "admin", ativo: true });
    expect(nome.status).toBe(200);
    const outro = await request(app).patch(`/api/v1/usuarios/${outroSlug}`).set(bearer(access)).send({ ativo: false });
    expect(outro.status).toBe(200);
    expect(outro.body.ativo).toBe(false);
  });
});
