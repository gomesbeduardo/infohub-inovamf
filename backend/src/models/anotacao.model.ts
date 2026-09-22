import { prisma } from "../prisma.js";

const SELECT = {
  id: true,
  conteudo: true,
  criado_em: true,
  etapas: { select: { numero: true } },
  usuarios: { select: { slug: true, nome: true } },
} as const;

export function listarPorEquipe(equipeId: string) {
  return prisma.anotacoes_internas.findMany({
    where: { equipe_id: equipeId },
    orderBy: { criado_em: "desc" },
    select: SELECT,
  });
}

export function criar(data: { equipeId: string; autorId: string; conteudo: string; etapaId: number | null }) {
  return prisma.anotacoes_internas.create({
    data: { equipe_id: data.equipeId, autor_id: data.autorId, conteudo: data.conteudo, etapa_id: data.etapaId },
    select: SELECT,
  });
}
