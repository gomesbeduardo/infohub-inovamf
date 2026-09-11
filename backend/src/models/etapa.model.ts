import { prisma } from "../prisma.js";

// etapas: reference table SMALLINT, já seeded (1..6), somente leitura pela API.
export function listar() {
  return prisma.etapas.findMany({
    where: { ativo: true },
    orderBy: { numero: "asc" },
    select: { numero: true, nome: true, descricao: true, entregavel: true },
  });
}

export function findByNumero(numero: number) {
  return prisma.etapas.findUnique({
    where: { numero },
    select: { id: true, numero: true },
  });
}
