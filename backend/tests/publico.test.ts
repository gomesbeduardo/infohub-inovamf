import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { Prisma } from "@prisma/client";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import * as publicoModel from "../src/models/publico.model.js";
import { criarEquipe, criarUsuario, limpar } from "./helpers.js";

const app = createApp();
const sufixo = `pub${Date.now()}`;
const nome = (n: string) => `${n} ${sufixo}`;
const email = (n: string) => `${n}.${sufixo}@teste.local`;

// O banco de teste é compartilhado com os demais arquivos, que rodam em paralelo
// e escrevem nas mesmas tabelas (equipes/usuarios). Por isso o "antes"/"depois"
// não usa dois GETs soltos (o intervalo entre eles seria contaminado pelos outros
// arquivos) — lê e escreve dentro da MESMA transação REPEATABLE READ: o snapshot
// fica congelado no início, então só enxerga commits de fora que já existiam
// antes dela abrir, mais as próprias escritas. O delta sai limpo.
let delta: { ideias: number; equipesEmAndamento: number; alunos: number; cursos: number };

beforeAll(async () => {
  await prisma.$transaction(
    async (tx) => {
      const base = await publicoModel.numeros(tx);

      // Equipe ativa com 2 alunos de cursos distintos: conta em tudo.
      const aluno1 = await criarUsuario(email("a1"), "aluno", { curso: `Curso a1 ${sufixo}` }, tx);
      const aluno2 = await criarUsuario(email("a2"), "aluno", { curso: `Curso a2 ${sufixo}` }, tx);
      await criarEquipe(
        { nome: nome("Ativa"), membros: [{ id: aluno1.id }, { id: aluno2.id }] },
        tx,
      );

      // Equipe desistente (não ativa) com 1 aluno: conta em ideias, não no resto.
      const aluno3 = await criarUsuario(email("a3"), "aluno", { curso: `Curso a3 ${sufixo}` }, tx);
      await criarEquipe(
        { nome: nome("Desistente"), status: "desistente", membros: [{ id: aluno3.id }] },
        tx,
      );

      // Equipe ativa com aluno de convite pendente: conta em ideias/equipesEmAndamento,
      // não em alunos/cursos.
      const aluno4 = await criarUsuario(
        email("a4"),
        "aluno",
        { curso: `Curso a4 ${sufixo}`, ativado: false },
        tx,
      );
      await criarEquipe({ nome: nome("ComPendente"), membros: [{ id: aluno4.id }] }, tx);

      const atual = await publicoModel.numeros(tx);
      delta = {
        ideias: atual.ideias - base.ideias,
        equipesEmAndamento: atual.equipesEmAndamento - base.equipesEmAndamento,
        alunos: atual.alunos - base.alunos,
        cursos: atual.cursos - base.cursos,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 20_000 },
  );
});

afterAll(async () => {
  await limpar(sufixo);
  await prisma.$disconnect();
});

describe("GET /publico/numeros", () => {
  it("responde sem token, só com as 4 chaves numéricas, e com cache público", async () => {
    const r = await request(app).get("/api/v1/publico/numeros");
    expect(r.status).toBe(200);
    expect(Object.keys(r.body.data).sort()).toEqual(
      ["alunos", "cursos", "equipesEmAndamento", "ideias"].sort(),
    );
    for (const v of Object.values(r.body.data)) {
      expect(Number.isInteger(v)).toBe(true);
    }
    expect(r.headers["cache-control"]).toBe("public, max-age=60");
  });

  it("ideias soma toda equipe nova (ativa, desistente e com convite pendente)", () => {
    expect(delta.ideias).toBe(3);
  });

  it("equipesEmAndamento soma só as equipes com status em STATUS_EQUIPE_ATIVA (exclui a desistente)", () => {
    expect(delta.equipesEmAndamento).toBe(2);
  });

  it("alunos conta só quem tem conta ativa, convite aceito e está em equipe ativa (exclui desistente e convite pendente)", () => {
    expect(delta.alunos).toBe(2);
  });

  it("cursos conta só os cursos distintos entre os alunos elegíveis", () => {
    expect(delta.cursos).toBe(2);
  });
});
