import request from "supertest";
import { expect } from "vitest";
import { Prisma } from "@prisma/client";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { hashSenha } from "../src/utils/hash.js";
import { novoIdComSlug } from "../src/utils/slug.js";

// Fábricas compartilhadas pelos testes novos. Tudo que é criado leva o `sufixo`
// do arquivo no nome/e-mail, e `limpar(sufixo)` apaga no afterAll.
//
// Todas aceitam um `db` opcional (Prisma.TransactionClient) como último
// parâmetro, default `prisma`: quem precisa criar dentro de uma transação
// (ex.: publico.test.ts, que lê/escreve numa REPEATABLE READ) passa o `tx`;
// os demais chamadores continuam sem mudar nada.
export type App = ReturnType<typeof createApp>;
export const SENHA = "senha-de-teste-forte";
export const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

export async function criarUsuario(
  email: string,
  tipo: "admin" | "mentor" | "aluno",
  opts: { ativado?: boolean; nome?: string; curso?: string } = {},
  db: Prisma.TransactionClient = prisma,
): Promise<{ id: string; slug: string }> {
  const ids = novoIdComSlug();
  await db.usuarios.create({
    data: {
      id: ids.id,
      slug: ids.slug,
      nome: opts.nome ?? `User ${tipo}`,
      email,
      senha: await hashSenha(SENHA),
      telefone: "55990000000",
      tipo_usuario: tipo,
      ativo: true,
      convite_aceito_em: opts.ativado === false ? null : new Date(),
    },
  });
  if (tipo === "aluno" && opts.curso !== undefined) {
    await db.alunos.create({ data: { usuario_id: ids.id, curso: opts.curso } });
  }
  return ids;
}

export async function login(app: App, email: string, senha = SENHA): Promise<string> {
  const res = await request(app).post("/api/v1/auth/login").send({ email, senha });
  expect(res.status).toBe(200);
  return res.body.access as string;
}

export async function criarEquipe(
  p: {
    nome: string;
    mentorId?: string | null;
    etapa?: number;
    status?: string;
    membros?: Array<{ id: string; papel?: "lider" | "integrante" }>;
  },
  db: Prisma.TransactionClient = prisma,
): Promise<{ id: string; slug: string }> {
  const ids = novoIdComSlug();
  await db.equipes.create({
    data: {
      id: ids.id,
      slug: ids.slug,
      nome_ideia: p.nome,
      descricao_ideia: "descrição de teste",
      estagio_ideia: "ideia",
      mentor_id: p.mentorId ?? null,
      etapa_atual_id: p.etapa ?? 1, // etapas.id == etapas.numero (seed de referência)
      status: p.status ?? "ativa",
    },
  });
  for (const m of p.membros ?? []) {
    await db.equipe_membros.create({
      data: { equipe_id: ids.id, usuario_id: m.id, papel: m.papel },
    });
  }
  return ids;
}

// Equipes primeiro (cascade em tarefas/entregas/histórico/membros), depois e-mails
// e usuários do sufixo.
export async function limpar(sufixo: string): Promise<void> {
  await prisma.equipes.deleteMany({ where: { nome_ideia: { contains: sufixo } } });
  await prisma.emails.deleteMany({ where: { destinatario_email: { contains: sufixo } } });
  await prisma.usuarios.deleteMany({ where: { email: { contains: sufixo } } });
}
