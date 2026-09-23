import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { Prisma } from "@prisma/client";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { hashSenha } from "../src/utils/hash.js";
import { novoIdComSlug } from "../src/utils/slug.js";
import * as publicoModel from "../src/models/publico.model.js";
import { limpar, SENHA } from "./helpers.js";

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

async function criarAlunoNaTx(
  tx: Prisma.TransactionClient,
  n: string,
  opts: { convitePendente?: boolean } = {},
): Promise<{ id: string }> {
  const ids = novoIdComSlug();
  await tx.usuarios.create({
    data: {
      id: ids.id,
      slug: ids.slug,
      nome: `Aluno ${n}`,
      email: email(n),
      senha: await hashSenha(SENHA),
      telefone: "55990000000",
      tipo_usuario: "aluno",
      ativo: true,
      convite_aceito_em: opts.convitePendente ? null : new Date(),
    },
  });
  await tx.alunos.create({ data: { usuario_id: ids.id, curso: `Curso ${n} ${sufixo}` } });
  return ids;
}

async function criarEquipeNaTx(
  tx: Prisma.TransactionClient,
  p: { nome: string; status?: string; membros: string[] },
): Promise<void> {
  const ids = novoIdComSlug();
  await tx.equipes.create({
    data: {
      id: ids.id,
      slug: ids.slug,
      nome_ideia: p.nome,
      descricao_ideia: "descrição de teste",
      estagio_ideia: "ideia",
      etapa_atual_id: 1,
      status: p.status ?? "ativa",
    },
  });
  for (const usuarioId of p.membros) {
    await tx.equipe_membros.create({ data: { equipe_id: ids.id, usuario_id: usuarioId } });
  }
}

beforeAll(async () => {
  await prisma.$transaction(
    async (tx) => {
      const base = await publicoModel.numeros(tx);

      // Equipe ativa com 2 alunos de cursos distintos: conta em tudo.
      const aluno1 = await criarAlunoNaTx(tx, "a1");
      const aluno2 = await criarAlunoNaTx(tx, "a2");
      await criarEquipeNaTx(tx, { nome: nome("Ativa"), membros: [aluno1.id, aluno2.id] });

      // Equipe desistente (não ativa) com 1 aluno: conta em ideias, não no resto.
      const aluno3 = await criarAlunoNaTx(tx, "a3");
      await criarEquipeNaTx(tx, { nome: nome("Desistente"), status: "desistente", membros: [aluno3.id] });

      // Equipe ativa com aluno de convite pendente: conta em ideias/equipesEmAndamento,
      // não em alunos/cursos.
      const aluno4 = await criarAlunoNaTx(tx, "a4", { convitePendente: true });
      await criarEquipeNaTx(tx, { nome: nome("ComPendente"), membros: [aluno4.id] });

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
