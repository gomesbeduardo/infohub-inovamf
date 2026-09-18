import { prisma } from "../prisma.js";

// Consultas usadas pelo middleware de auth e pelo fluxo de autenticação.
// Model só fala com o Prisma; sem regra de negócio aqui.

export function findUsuarioAtivoBySlug(slug: string) {
  return prisma.usuarios.findFirst({
    where: { slug, ativo: true, excluido_em: null },
    select: { id: true, slug: true, tipo_usuario: true },
  });
}

// Access token só é aceito se a linha correspondente (jti) estiver viva.
export function findAccessTokenVivo(jti: string) {
  return prisma.tokens_acesso.findFirst({
    where: {
      id: jti,
      tipo: "acesso",
      revogado_em: null,
      expira_em: { gt: new Date() },
    },
    select: { id: true },
  });
}
