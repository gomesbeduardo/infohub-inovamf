import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import { STATUS_SEM_ENTREGA, somarDias } from "../domain/atraso.js";
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
  const [historico, entregasCriadas, avaliacoes, concluidas] = await Promise.all([
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
    // Entregas recebidas: quando a entrega foi enviada (entregas.criado_em).
    prisma.entregas.findMany({
      where: { criado_em: { gte: desde }, tarefas: { equipes: wEq } },
      select: { criado_em: true },
    }),
    // Entregas avaliadas: quando a avaliação foi registrada (avaliacoes_entrega.criado_em).
    prisma.avaliacoes_entrega.findMany({
      where: { criado_em: { gte: desde }, entregas: { tarefas: { equipes: wEq } } },
      select: { criado_em: true },
    }),
    // Tarefas concluídas (nome antigo "entregas" no front — ver domain/serie.ts).
    prisma.tarefas.findMany({
      where: { concluida_em: { gte: desde }, equipes: wEq },
      select: { concluida_em: true },
    }),
  ]);
  return { historico, entregasCriadas, avaliacoes, concluidas };
}

// --- Agenda (adendo 23/09): "mesa do mentor" e blocos do painel do admin ------
// Listas com teto, filtradas e ordenadas NO BANCO, com o escopo do papel.
export const LIMITE_AGENDA = 20;
export const JANELA_PRAZOS_DIAS = 7;

const TAREFA_AGENDA = {
  id: true,
  titulo: true,
  status: true,
  data_entrega: true,
  equipes: { select: { slug: true, nome_ideia: true } },
} satisfies Prisma.tarefasSelect;

// Entregas esperando avaliação: tarefa "entregue" + a última versão enviada.
// Prazo mais antigo primeiro.
export function aguardandoAvaliacao(escopo: Escopo) {
  return prisma.tarefas.findMany({
    where: { status: "entregue", equipes: whereEscopo(escopo) },
    orderBy: [{ data_entrega: "asc" }, { criado_em: "asc" }],
    take: LIMITE_AGENDA,
    select: {
      ...TAREFA_AGENDA,
      entregas: { orderBy: { versao: "desc" }, take: 1, select: { versao: true, criado_em: true } },
    },
  });
}

// Prazos: atrasadas (RN-04 — a MESMA regra de whereStatusEfetivo) + as sem
// entrega que vencem de hoje até hoje + 7 (dia de SP). Mais antiga primeiro.
export function prazosDaSemana(escopo: Escopo, hoje: string) {
  return prisma.tarefas.findMany({
    where: {
      equipes: whereEscopo(escopo),
      OR: [
        whereStatusEfetivo("atrasada", hoje),
        {
          status: { in: [...STATUS_SEM_ENTREGA, "ajustar"] },
          data_entrega: { gte: somarDias(hoje, 0), lte: somarDias(hoje, JANELA_PRAZOS_DIAS) },
        },
      ],
    },
    orderBy: [{ data_entrega: "asc" }, { criado_em: "asc" }],
    take: LIMITE_AGENDA,
    select: TAREFA_AGENDA,
  });
}

// Equipes em andamento do mentor para os cartões da mesa (desistentes e já
// encaminhadas ao InovAMF ficam de fora). Integrantes ativos contados no banco.
export function equipesDoMentor(mentorId: string) {
  return prisma.equipes.findMany({
    where: {
      AND: [
        whereEscopo({ tipo: "mentor", usuarioId: mentorId }),
        { status: { notIn: ["desistente", "encaminhada_inovamf"] } },
      ],
    },
    orderBy: { nome_ideia: "asc" },
    take: LIMITE_AGENDA,
    select: {
      id: true,
      slug: true,
      nome_ideia: true,
      status: true,
      etapas: { select: { numero: true, nome: true } },
      _count: { select: { equipe_membros: { where: { ativo: true } } } },
    },
  });
}
