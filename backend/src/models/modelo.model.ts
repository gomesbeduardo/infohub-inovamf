import { prisma } from "../prisma.js";

const SELECT = {
  id: true,
  titulo: true,
  descricao: true,
  obrigatoria: true,
  prazo_padrao_dias: true,
  etapas: { select: { numero: true } },
} as const;

export function listarAtivos() {
  return prisma.modelos_tarefa.findMany({
    where: { ativo: true },
    orderBy: [{ etapa_id: "asc" }, { ordem: "asc" }],
    select: SELECT,
  });
}

export function findAtivoById(id: number) {
  return prisma.modelos_tarefa.findFirst({ where: { id, ativo: true }, select: SELECT });
}
