import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import { newId } from "../utils/slug.js";
import { hashTokenSenha, sha256, tokenAleatorio } from "../utils/hash.js";
import { DIA_MS } from "../utils/time.js";
import type { MotivoRevogacao } from "../domain/enums.js";

// --- Sessão (par access + refresh em tokens_acesso) ---------------------------
// access.token_pai_id → o refresh irmão (permite logout do par por jti).
// refresh.token_pai_id → o refresh consumido na rotação (cadeia auditável §7).
export async function criarPar(params: {
  usuarioId: string;
  refreshTtlDias: number;
  accessTtlMs: number;
  refreshPaiId?: string | null;
  userAgent?: string | null;
}): Promise<{ jti: string; refreshRaw: string; refreshId: string }> {
  const agora = Date.now();
  const refreshId = newId();
  const refreshRaw = tokenAleatorio(32);
  const jti = newId();

  await prisma.$transaction([
    prisma.tokens_acesso.create({
      data: {
        id: refreshId,
        usuario_id: params.usuarioId,
        tipo: "refresh",
        token_hash: sha256(refreshRaw),
        token_pai_id: params.refreshPaiId ?? null,
        expira_em: new Date(agora + params.refreshTtlDias * DIA_MS),
        user_agent: params.userAgent ?? null,
      },
    }),
    prisma.tokens_acesso.create({
      data: {
        id: jti,
        usuario_id: params.usuarioId,
        tipo: "acesso",
        token_hash: sha256(jti),
        token_pai_id: refreshId,
        expira_em: new Date(agora + params.accessTtlMs),
        user_agent: params.userAgent ?? null,
      },
    }),
  ]);

  return { jti, refreshRaw, refreshId };
}

export function findRefreshByHash(hash: string) {
  return prisma.tokens_acesso.findFirst({
    where: { token_hash: hash, tipo: "refresh" },
    select: {
      id: true,
      usuario_id: true,
      revogado_em: true,
      expira_em: true,
    },
  });
}

export function revogarPorId(id: string, motivo: MotivoRevogacao) {
  return prisma.tokens_acesso.updateMany({
    where: { id, revogado_em: null },
    data: { revogado_em: new Date(), motivo_revogacao: motivo },
  });
}

// Revoga o access (por jti) e o refresh irmão apontado por token_pai_id.
export async function revogarParDeAcesso(jti: string, motivo: MotivoRevogacao) {
  const acesso = await prisma.tokens_acesso.findUnique({
    where: { id: jti },
    select: { token_pai_id: true },
  });
  const agora = new Date();
  const ids = [jti, acesso?.token_pai_id].filter(
    (v): v is string => typeof v === "string",
  );
  await prisma.tokens_acesso.updateMany({
    where: { id: { in: ids }, revogado_em: null },
    data: { revogado_em: agora, motivo_revogacao: motivo },
  });
}

// Reuso de refresh rotacionado → derruba todas as sessões vivas do usuário.
export function revogarTodosVivosDoUsuario(
  usuarioId: string,
  motivo: MotivoRevogacao,
) {
  return prisma.tokens_acesso.updateMany({
    where: { usuario_id: usuarioId, revogado_em: null },
    data: { revogado_em: new Date(), motivo_revogacao: motivo },
  });
}

// --- Convite (tokens_senha, finalidade='convite') -----------------------------
// Cria o convite de uso único. token bruto = "<id da linha>.<segredo>"; só o
// hash bcrypt do segredo é persistido (ENTITIES.md §7).
export async function criarConvite(params: {
  usuarioId: string;
  ttlHoras: number;
}): Promise<{ conviteId: string; tokenBruto: string; expiraEm: Date }> {
  const segredo = tokenAleatorio(24);
  const expiraEm = new Date(Date.now() + params.ttlHoras * 3_600_000);
  const row = await prisma.tokens_senha.create({
    data: {
      usuario_id: params.usuarioId,
      token_hash: await hashTokenSenha(segredo),
      finalidade: "convite",
      expira_em: expiraEm,
    },
    select: { id: true },
  });
  return { conviteId: row.id, tokenBruto: `${row.id}.${segredo}`, expiraEm };
}

// Invalida convites ainda não usados do usuário (antes de emitir um novo).
export function invalidarConvitesAtivos(usuarioId: string) {
  return prisma.tokens_senha.updateMany({
    where: { usuario_id: usuarioId, finalidade: "convite", usado_em: null },
    data: { usado_em: new Date() },
  });
}

export function findConviteById(id: string) {
  return prisma.tokens_senha.findUnique({
    where: { id },
    select: {
      id: true,
      usuario_id: true,
      token_hash: true,
      finalidade: true,
      usado_em: true,
      expira_em: true,
    },
  });
}

// Aceita o convite: grava a senha, marca convite/e-mail e queima o token — tudo
// numa transação para não deixar convite consumido sem senha definida.
export function consumirConvite(params: {
  conviteId: string;
  usuarioId: string;
  senhaHash: string;
  perfil?: { nome?: string; telefone?: string };
  // Aluno completa os próprios dados ao aceitar (RN-02: dados de todos os integrantes).
  aluno?: { curso: string; semestre: string; matricula: string | null };
}) {
  const agora = new Date();
  const ops: Prisma.PrismaPromise<unknown>[] = [
    prisma.usuarios.update({
      where: { id: params.usuarioId },
      data: {
        senha: params.senhaHash,
        convite_aceito_em: agora,
        email_verificado_em: agora,
        ...(params.perfil?.nome ? { nome: params.perfil.nome } : {}),
        ...(params.perfil?.telefone ? { telefone: params.perfil.telefone } : {}),
      },
    }),
    prisma.tokens_senha.update({
      where: { id: params.conviteId },
      data: { usado_em: agora },
    }),
  ];
  if (params.aluno) {
    ops.push(
      prisma.alunos.upsert({
        where: { usuario_id: params.usuarioId },
        create: { usuario_id: params.usuarioId, ...params.aluno },
        update: params.aluno,
      }),
    );
  }
  return prisma.$transaction(ops);
}
