import { prisma } from "../prisma.js";

// areas_ideia tem PK SERIAL (sem UUID) → é referenciada por `nome` (UNIQUE),
// não por slug base64url (que é bijeção de UUID). Ver ENTITIES.md §4.
export function listarAtivas() {
  return prisma.areas_ideia.findMany({
    where: { ativo: true },
    orderBy: { ordem: "asc" },
    select: { nome: true, ordem: true },
  });
}

export function findIdByNome(nome: string) {
  return prisma.areas_ideia.findFirst({
    where: { nome, ativo: true },
    select: { id: true },
  });
}
