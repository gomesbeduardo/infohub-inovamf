import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

const LIST_SELECT = {
  id: true,
  versao: true,
  comentario: true,
  criado_em: true,
  usuarios: { select: { slug: true, nome: true } },
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
      equipes: {
        select: {
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

// Cria a entrega e seus arquivos (todos tipo='link' na v1) numa transação.
export function criarComArquivos(data: {
  tarefaId: string;
  versao: number;
  enviadoPor: string;
  comentario?: string | null;
  arquivos: Array<{ url: string; nome?: string | null }>;
}) {
  return prisma.entregas.create({
    data: {
      tarefa_id: data.tarefaId,
      versao: data.versao,
      enviado_por: data.enviadoPor,
      comentario: data.comentario ?? null,
      arquivos_entrega: {
        create: data.arquivos.map((a) => ({
          tipo: "link",
          url_externa: a.url,
          nome_original: a.nome ?? null,
        })),
      },
    },
    select: LIST_SELECT,
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

export function criarAvaliacao(data: {
  entregaId: string;
  avaliadorId: string;
  resultado: string;
  comentario?: string | null;
}) {
  return prisma.avaliacoes_entrega.create({
    data: {
      entrega_id: data.entregaId,
      avaliador_id: data.avaliadorId,
      resultado: data.resultado,
      comentario: data.comentario ?? null,
    },
    select: { resultado: true, comentario: true, criado_em: true },
  });
}
