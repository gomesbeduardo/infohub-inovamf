import type { PrismaClient } from "@prisma/client";
import { DEMO_DOMINIO } from "./demo.js";

// Remove a camada DEMO (contas DEMO_DOMINIO e as equipes que elas LIDERAM),
// preservando a base e qualquer dado real. Equipe real que tinha mentor demo
// fica sem mentor. Tudo numa transação: se algo real referenciar uma conta demo
// de um jeito não previsto (FK), nada é apagado e o erro aparece.
export async function purgeDemo(db: PrismaClient): Promise<{ equipes: number; usuarios: number }> {
  return db.$transaction(
    async (tx) => {
      const ids = (
        await tx.usuarios.findMany({ where: { email: { endsWith: DEMO_DOMINIO } }, select: { id: true } })
      ).map((u) => u.id);
      if (ids.length === 0) return { equipes: 0, usuarios: 0 };

      const equipeIds = (
        await tx.equipes.findMany({
          where: { equipe_membros: { some: { papel: "lider", usuario_id: { in: ids } } } },
          select: { id: true },
        })
      ).map((e) => e.id);

      await tx.equipes.updateMany({
        where: { mentor_id: { in: ids }, id: { notIn: equipeIds } },
        data: { mentor_id: null },
      });
      await tx.emails.deleteMany({
        where: { OR: [{ destinatario_id: { in: ids } }, { equipe_id: { in: equipeIds } }] },
      });
      await tx.equipes.deleteMany({ where: { id: { in: equipeIds } } });
      await tx.equipe_membros.deleteMany({ where: { usuario_id: { in: ids } } });
      const u = await tx.usuarios.deleteMany({ where: { id: { in: ids } } });
      return { equipes: equipeIds.length, usuarios: u.count };
    },
    { timeout: 30_000 },
  );
}
