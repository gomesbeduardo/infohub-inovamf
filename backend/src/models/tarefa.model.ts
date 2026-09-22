import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import { STATUS_SEM_ENTREGA } from "../domain/atraso.js";

// Traz também dados da equipe (mentor + membros) para o controle de acesso.
const DETALHE_SELECT = {
  id: true,
  titulo: true,
  descricao: true,
  obrigatoria: true,
  data_entrega: true,
  status: true,
  criado_em: true,
  concluida_em: true,
  etapas: { select: { numero: true, nome: true } },
  equipes: {
    select: {
      slug: true,
      nome_ideia: true,
      mentor_id: true,
      equipe_membros: { where: { ativo: true }, select: { usuario_id: true } },
    },
  },
} satisfies Prisma.tarefasSelect;

export function criar(data: {
  equipe_id: string;
  etapa_id: number;
  titulo: string;
  descricao?: string | null;
  obrigatoria: boolean;
  data_entrega: Date;
  criado_por: string;
}) {
  return prisma.tarefas.create({
    data: {
      equipe_id: data.equipe_id,
      etapa_id: data.etapa_id,
      titulo: data.titulo,
      descricao: data.descricao ?? null,
      obrigatoria: data.obrigatoria,
      data_entrega: data.data_entrega,
      criado_por: data.criado_por,
    },
    select: DETALHE_SELECT,
  });
}

export function findById(id: string) {
  return prisma.tarefas.findUnique({ where: { id }, select: DETALHE_SELECT });
}

// Tradução de statusEfetivo para WHERE: mesma regra, do lado do banco.
export function whereStatusEfetivo(
  status: string,
  hoje: string,
): Prisma.tarefasWhereInput {
  const limite = new Date(`${hoje}T00:00:00.000Z`);
  const semEntrega = [...STATUS_SEM_ENTREGA];
  if (status === "atrasada") {
    return {
      OR: [
        { status: "atrasada" }, // legado: valor aceito pelo CHECK, nunca gravado por nós
        { status: { in: semEntrega }, data_entrega: { lt: limite } },
      ],
    };
  }
  if ((semEntrega as string[]).includes(status)) {
    return { status, data_entrega: { gte: limite } };
  }
  return { status };
}

export function listarPorEquipe(
  equipeId: string,
  filtros: { status?: string; hoje: string },
) {
  const where: Prisma.tarefasWhereInput = { equipe_id: equipeId };
  if (filtros.status) Object.assign(where, whereStatusEfetivo(filtros.status, filtros.hoje));
  return prisma.tarefas.findMany({
    where,
    orderBy: { data_entrega: "asc" },
    select: DETALHE_SELECT,
  });
}

export function atualizarPorId(id: string, data: Prisma.tarefasUpdateInput) {
  return prisma.tarefas.update({ where: { id }, data, select: DETALHE_SELECT });
}
