import { prisma } from "../prisma.js";

// ciclos: PK SERIAL → referenciado por `nome` (UNIQUE), como áreas.
export function listarAtivos() {
  return prisma.ciclos.findMany({
    where: { ativo: true },
    orderBy: { data_inicio: "desc" },
    select: { nome: true, data_inicio: true, data_fim: true },
  });
}

export function findIdByNome(nome: string) {
  return prisma.ciclos.findFirst({ where: { nome, ativo: true }, select: { id: true } });
}

// Ciclo "atual" = o ativo mais recente; é onde a inscrição entra.
export function findAtual() {
  return prisma.ciclos.findFirst({
    where: { ativo: true },
    orderBy: { data_inicio: "desc" },
    select: { id: true },
  });
}
