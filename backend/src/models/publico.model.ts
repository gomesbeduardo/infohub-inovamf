import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import { STATUS_EQUIPE_ATIVA } from "../domain/membros.js";

// Filtro do "aluno participando" exibido na landing: conta ativa, convite
// aceito (mesmo critério de `pendente` em equipe.controller.ts, invertido) e
// vínculo ativo numa equipe com status em STATUS_EQUIPE_ATIVA.
const wAlunoElegivel: Prisma.usuariosWhereInput = {
  ativo: true,
  convite_aceito_em: { not: null },
  equipe_membros: { some: { ativo: true, equipes: { status: { in: [...STATUS_EQUIPE_ATIVA] } } } },
};

// Números reais da landing pública (issue #157) — só contagens, nenhum dado
// identificável (LGPD). Tudo agregado no banco (count/distinct), sem carregar
// linhas para contar em memória.
// `db` aceita opcionalmente um `Prisma.TransactionClient` (usado pelos testes
// para ler um "antes/depois" consistente, isolado de outros arquivos de teste
// que escrevem nas mesmas tabelas); em produção o controller chama sem esse
// argumento e cai no client único.
export async function numeros(db: Prisma.TransactionClient = prisma) {
  const [ideias, equipesEmAndamento, alunos, cursos] = await Promise.all([
    db.equipes.count(),
    db.equipes.count({ where: { status: { in: [...STATUS_EQUIPE_ATIVA] } } }),
    db.usuarios.count({ where: wAlunoElegivel }),
    db.alunos.findMany({
      where: { AND: [{ curso: { not: null } }, { curso: { not: "" } }], usuarios: wAlunoElegivel },
      select: { curso: true },
      distinct: ["curso"],
    }),
  ]);
  return { ideias, equipesEmAndamento, alunos, cursos: cursos.length };
}
