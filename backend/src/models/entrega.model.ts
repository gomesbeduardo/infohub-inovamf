import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import type { ResultadoAvaliacao } from "../domain/enums.js";
import { registrarAuditoria } from "./auditoria.model.js";

const LIST_SELECT = {
  id: true,
  versao: true,
  comentario: true,
  criado_em: true,
  usuarios: { select: { id: true, slug: true, nome: true, email: true } },
  arquivos_entrega: {
    select: { tipo: true, nome_original: true, url_externa: true },
  },
  avaliacoes_entrega: {
    orderBy: { criado_em: "desc" },
    select: {
      resultado: true,
      comentario: true,
      criado_em: true,
      usuarios: { select: { slug: true, nome: true } },
    },
  },
} satisfies Prisma.entregasSelect;

// Detalhe traz a cadeia até a equipe para o controle de acesso.
const DETALHE_SELECT = {
  ...LIST_SELECT,
  tarefas: {
    select: {
      id: true,
      titulo: true,
      equipes: {
        select: {
          id: true,
          slug: true,
          mentor_id: true,
          equipe_membros: {
            where: { ativo: true },
            select: { usuario_id: true },
          },
        },
      },
    },
  },
} satisfies Prisma.entregasSelect;

export async function proximaVersao(tarefaId: string): Promise<number> {
  const ultima = await prisma.entregas.findFirst({
    where: { tarefa_id: tarefaId },
    orderBy: { versao: "desc" },
    select: { versao: true },
  });
  return (ultima?.versao ?? 0) + 1;
}

// Entrega (links, v1) + tarefa "entregue" + auditoria numa transação (RNF-05).
export function enviar(p: {
  tarefaId: string;
  tarefaTitulo: string;
  versao: number;
  enviadoPor: string;
  comentario: string | null;
  arquivos: Array<{ url: string; nome: string | null }>;
  ip: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const entrega = await tx.entregas.create({
      data: {
        tarefa_id: p.tarefaId,
        versao: p.versao,
        enviado_por: p.enviadoPor,
        comentario: p.comentario,
        arquivos_entrega: {
          create: p.arquivos.map((a) => ({ tipo: "link", url_externa: a.url, nome_original: a.nome })),
        },
      },
      select: LIST_SELECT,
    });
    await tx.tarefas.update({ where: { id: p.tarefaId }, data: { status: "entregue" } });
    await registrarAuditoria(tx, {
      usuarioId: p.enviadoPor,
      entidade: "entrega",
      entidadeId: entrega.id,
      acao: "entrega_enviada",
      depois: { tarefa: p.tarefaTitulo, versao: p.versao },
      ip: p.ip,
    });
    return entrega;
  });
}

export function listarPorTarefa(tarefaId: string) {
  return prisma.entregas.findMany({
    where: { tarefa_id: tarefaId },
    orderBy: { versao: "desc" },
    select: LIST_SELECT,
  });
}

export function findById(id: string) {
  return prisma.entregas.findUnique({ where: { id }, select: DETALHE_SELECT });
}

// Avaliação + status da tarefa (RF-15) + auditoria numa transação (RNF-05).
export function avaliar(p: {
  entregaId: string;
  tarefaId: string;
  tarefaTitulo: string;
  avaliadorId: string;
  resultado: ResultadoAvaliacao;
  comentario: string | null;
  ip: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const avaliacao = await tx.avaliacoes_entrega.create({
      data: {
        entrega_id: p.entregaId,
        avaliador_id: p.avaliadorId,
        resultado: p.resultado,
        comentario: p.comentario,
      },
      select: { resultado: true, comentario: true, criado_em: true },
    });
    await tx.tarefas.update({
      where: { id: p.tarefaId },
      data: {
        status: p.resultado,
        concluida_em: p.resultado === "aprovada" ? new Date() : null,
      },
    });
    await registrarAuditoria(tx, {
      usuarioId: p.avaliadorId,
      entidade: "entrega",
      entidadeId: p.entregaId,
      acao: "entrega_avaliada",
      depois: { tarefa: p.tarefaTitulo, resultado: p.resultado, comentario: p.comentario },
      ip: p.ip,
    });
    return avaliacao;
  });
}
