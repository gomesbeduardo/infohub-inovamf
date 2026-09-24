import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import { VERSAO_POLITICA } from "../domain/lgpd.js";

// Vigente = a versão publicada mais recente (publicar uma nova é só um INSERT).
export function findVigente() {
  return prisma.termos_uso.findFirst({
    where: { publicado_em: { lte: new Date() } },
    orderBy: { publicado_em: "desc" },
    select: { id: true, versao: true, titulo: true, conteudo: true, publicado_em: true },
  });
}

export type DadosAceite = { termoId: number; ip: string | null; userAgent: string | null };

// Aceite dos Termos + consentimento da Política, para entrar na MESMA transação
// que cria/ativa a conta (a prova do aceite é do controlador — LGPD art. 8º §2º).
export function opsAceite(usuarioId: string, a: DadosAceite): Prisma.PrismaPromise<unknown>[] {
  return [
    prisma.aceites_termos.create({
      data: { usuario_id: usuarioId, termo_id: a.termoId, ip_origem: a.ip, user_agent: a.userAgent },
    }),
    prisma.consentimentos_lgpd.create({
      data: {
        usuario_id: usuarioId,
        versao_politica: VERSAO_POLITICA,
        aceito: true,
        ip_origem: a.ip,
        user_agent: a.userAgent,
      },
    }),
  ];
}
