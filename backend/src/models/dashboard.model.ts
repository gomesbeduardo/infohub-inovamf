import { prisma } from "../prisma.js";
import { whereEscopo, type Escopo } from "./equipe.model.js";
import { whereStatusEfetivo } from "./tarefa.model.js";

// Agregados do dashboard (RF-22) — COUNT/GROUP BY no banco, com o escopo do papel.
// Nota (Prisma 5.22): testamos aqui o groupBy com filtro por relação (o caso
// de escopo "aluno", { equipe_membros: { some: { ... } } }) combinado com
// `by` e ele funcionou normalmente — não precisou do fallback de 6 counts
// que o brief previa para essa combinação.
export async function indicadores(escopo: Escopo, hoje: string) {
  const wEq = whereEscopo(escopo);
  const [equipesAtivas, prontasInovamf, totalEquipes, porEtapaRaw, tarefasAtrasadas, aAvaliar, etapas] =
    await Promise.all([
      prisma.equipes.count({ where: { AND: [wEq, { status: "ativa" }] } }),
      prisma.equipes.count({
        where: { AND: [wEq, { status: { in: ["pronta_inovamf", "encaminhada_inovamf"] } }] },
      }),
      prisma.equipes.count({ where: wEq }),
      prisma.equipes.groupBy({
        by: ["etapa_atual_id"],
        where: { AND: [wEq, { status: "ativa" }] },
        _count: { _all: true },
      }),
      prisma.tarefas.count({ where: { AND: [whereStatusEfetivo("atrasada", hoje), { equipes: wEq }] } }),
      prisma.tarefas.count({ where: { status: "entregue", equipes: wEq } }),
      prisma.etapas.findMany({
        where: { ativo: true },
        orderBy: { numero: "asc" },
        select: { id: true, numero: true, nome: true },
      }),
    ]);
  const porEtapa = etapas.map((e) => ({
    numero: e.numero,
    nome: e.nome,
    total: porEtapaRaw.find((g) => g.etapa_atual_id === e.id)?._count._all ?? 0,
  }));
  return { equipesAtivas, prontasInovamf, totalEquipes, tarefasAtrasadas, aAvaliar, porEtapa };
}

// Eventos crus da série semanal (desde uma data), no escopo do papel.
export async function eventosSerie(escopo: Escopo, desde: Date) {
  const wEq = whereEscopo(escopo);
  const [historico, concluidas] = await Promise.all([
    prisma.historico_etapas.findMany({
      where: { criado_em: { gte: desde }, equipes: wEq },
      select: {
        criado_em: true,
        status_origem: true,
        status_destino: true,
        etapas_historico_etapas_etapa_origem_idToetapas: { select: { numero: true } },
        etapas_historico_etapas_etapa_destino_idToetapas: { select: { numero: true } },
      },
    }),
    prisma.tarefas.findMany({
      where: { concluida_em: { gte: desde }, equipes: wEq },
      select: { concluida_em: true },
    }),
  ]);
  return { historico, concluidas };
}
