import { prisma } from "../prisma.js";

// RF-21 — preferências de notificação por usuário. Ausência de linha = habilitado.
export function listarPorUsuario(usuarioId: string) {
  return prisma.preferencias_notificacao.findMany({
    where: { usuario_id: usuarioId },
    select: { tipo: true, habilitado: true },
  });
}

export function definir(usuarioId: string, tipo: string, habilitado: boolean) {
  return prisma.preferencias_notificacao.upsert({
    where: { usuario_id_tipo: { usuario_id: usuarioId, tipo } },
    create: { usuario_id: usuarioId, tipo, habilitado },
    update: { habilitado, atualizado_em: new Date() },
    select: { tipo: true, habilitado: true },
  });
}
