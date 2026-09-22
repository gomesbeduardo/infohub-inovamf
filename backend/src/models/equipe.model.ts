import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import {
  POSICAO_PRONTA,
  avaliarTransicao,
  pendenciasDeIntegrantes,
  type Decisao,
  type Pendencia,
} from "../domain/transicao.js";
import { toSlug } from "../utils/slug.js";
import { whereStatusEfetivo } from "./tarefa.model.js";

// --- Escopo por papel (RNF-03) ------------------------------------------------
export type Escopo =
  | { tipo: "admin" }
  | { tipo: "mentor"; usuarioId: string }
  | { tipo: "aluno"; usuarioId: string };

function whereEscopo(e: Escopo): Prisma.equipesWhereInput {
  if (e.tipo === "mentor") return { mentor_id: e.usuarioId };
  if (e.tipo === "aluno") {
    return { equipe_membros: { some: { usuario_id: e.usuarioId, ativo: true } } };
  }
  return {};
}

interface FiltrosEquipe {
  etapaNumero?: number;
  areaId?: number;
  status?: string;
  mentorId?: string;
  q?: string;
  curso?: string;
  statusTarefa?: string;
  cicloId?: number;
  hoje: string;
}

function whereFiltros(f: FiltrosEquipe): Prisma.equipesWhereInput {
  const w: Prisma.equipesWhereInput = {};
  if (f.etapaNumero) w.etapas = { numero: f.etapaNumero };
  if (f.areaId) w.area_id = f.areaId;
  if (f.status) w.status = f.status;
  if (f.mentorId) w.mentor_id = f.mentorId;
  if (f.cicloId) w.ciclo_id = f.cicloId;
  // Busca simples por enquanto (ILIKE). O índice GIN full-text de nome_ideia
  // fica como otimização futura (ENTITIES.md §3).
  if (f.q) w.nome_ideia = { contains: f.q, mode: "insensitive" };
  // RF-07: curso de QUALQUER integrante ativo.
  if (f.curso) {
    w.equipe_membros = {
      some: { ativo: true, usuarios: { alunos: { curso: { equals: f.curso, mode: "insensitive" } } } },
    };
  }
  // RF-07: a equipe TEM ao menos uma tarefa com esse status (efetivo — RN-04).
  if (f.statusTarefa) w.tarefas = { some: whereStatusEfetivo(f.statusTarefa, f.hoje) };
  return w;
}

export function resumoSelect(hoje: string) {
  return {
    slug: true,
    nome_ideia: true,
    descricao_ideia: true,
    status: true,
    estagio_ideia: true,
    criado_em: true,
    etapas: { select: { numero: true, nome: true } },
    areas_ideia: { select: { nome: true } },
    ciclos: { select: { nome: true } },
    usuarios: { select: { slug: true, nome: true } },
    equipe_membros: {
      where: { ativo: true, papel: "lider" },
      select: { usuarios: { select: { slug: true, nome: true, alunos: { select: { curso: true } } } } },
    },
    _count: {
      select: {
        equipe_membros: { where: { ativo: true } },
        tarefas: { where: whereStatusEfetivo("atrasada", hoje) },
      },
    },
  } satisfies Prisma.equipesSelect;
}

export function listar(
  params: { skip: number; take: number; escopo: Escopo } & FiltrosEquipe,
) {
  return prisma.equipes.findMany({
    where: { AND: [whereEscopo(params.escopo), whereFiltros(params)] },
    skip: params.skip,
    take: params.take,
    orderBy: { criado_em: "desc" },
    select: resumoSelect(params.hoje),
  });
}

export function contar(params: { escopo: Escopo } & FiltrosEquipe) {
  return prisma.equipes.count({
    where: { AND: [whereEscopo(params.escopo), whereFiltros(params)] },
  });
}

export function findDetalheBySlug(slug: string) {
  return prisma.equipes.findUnique({
    where: { slug },
    select: {
      slug: true,
      nome_ideia: true,
      descricao_ideia: true,
      estagio_ideia: true,
      status: true,
      origem_divulgacao: true,
      pronta_inovamf_em: true,
      criado_em: true,
      etapas: { select: { numero: true, nome: true } },
      areas_ideia: { select: { nome: true } },
      ciclos: { select: { nome: true } },
      usuarios: { select: { slug: true, nome: true } },
      equipe_membros: {
        where: { ativo: true },
        select: {
          papel: true,
          usuarios: {
            select: {
              slug: true,
              nome: true,
              tipo_usuario: true,
              convite_aceito_em: true,
            },
          },
        },
      },
      historico_etapas: {
        orderBy: { criado_em: "desc" },
        select: {
          forcado: true,
          observacao: true,
          status_origem: true,
          status_destino: true,
          criado_em: true,
          etapas_historico_etapas_etapa_origem_idToetapas: {
            select: { numero: true, nome: true },
          },
          etapas_historico_etapas_etapa_destino_idToetapas: {
            select: { numero: true, nome: true },
          },
          usuarios: { select: { slug: true, nome: true } },
        },
      },
    },
  });
}

// Dados mínimos para controle de acesso e movimentação de etapa.
export function findControleBySlug(slug: string) {
  return prisma.equipes.findUnique({
    where: { slug },
    select: {
      id: true,
      mentor_id: true,
      etapa_atual_id: true,
      equipe_membros: {
        where: { ativo: true },
        select: { usuario_id: true, papel: true },
      },
    },
  });
}

// Membros ativos (id + e-mail) — destinatários do lembrete manual (RF-20).
export function listarEmailsMembros(equipeId: string) {
  return prisma.equipe_membros.findMany({
    where: { equipe_id: equipeId, ativo: true },
    select: { usuarios: { select: { id: true, email: true } } },
  });
}

export function criar(data: {
  id: string;
  slug: string;
  nome_ideia: string;
  descricao_ideia: string;
  estagio_ideia: string;
  area_id?: number | null;
  mentor_id?: string | null;
  ciclo_id?: number | null;
  origem_divulgacao?: string | null;
}) {
  return prisma.equipes.create({
    data: {
      id: data.id,
      slug: data.slug,
      nome_ideia: data.nome_ideia,
      descricao_ideia: data.descricao_ideia,
      estagio_ideia: data.estagio_ideia,
      area_id: data.area_id ?? null,
      mentor_id: data.mentor_id ?? null,
      ciclo_id: data.ciclo_id ?? null,
      origem_divulgacao: data.origem_divulgacao ?? null,
    },
    select: { slug: true, nome_ideia: true },
  });
}

export function atualizarPorSlug(slug: string, data: Prisma.equipesUpdateInput) {
  return prisma.equipes.update({
    where: { slug },
    data,
    select: {
      slug: true,
      nome_ideia: true,
      status: true,
      estagio_ideia: true,
    },
  });
}

// Pendências que impedem SAIR da posição atual para frente (RN-01/RN-02).
async function pendenciasDaPosicao(
  tx: Prisma.TransactionClient,
  equipeId: string,
  posicao: number,
): Promise<Pendencia[]> {
  if (posicao >= POSICAO_PRONTA) return [];
  const tarefas = await tx.tarefas.findMany({
    where: {
      equipe_id: equipeId,
      obrigatoria: true,
      status: { not: "aprovada" },
      etapas: { numero: posicao },
    },
    orderBy: { data_entrega: "asc" },
    select: { id: true, titulo: true },
  });
  const pendencias: Pendencia[] = tarefas.map((t) => ({
    tipo: "tarefa",
    slug: toSlug(t.id),
    titulo: t.titulo,
  }));
  if (posicao === 6) {
    const membros = await tx.equipe_membros.findMany({
      where: { equipe_id: equipeId, ativo: true },
      select: {
        usuarios: {
          select: {
            slug: true,
            nome: true,
            convite_aceito_em: true,
            alunos: { select: { curso: true, semestre: true } },
          },
        },
      },
    });
    pendencias.push(
      ...pendenciasDeIntegrantes(
        membros.map((m) => ({
          slug: m.usuarios.slug,
          nome: m.usuarios.nome,
          conviteAceitoEm: m.usuarios.convite_aceito_em,
          curso: m.usuarios.alunos?.curso ?? null,
          semestre: m.usuarios.alunos?.semestre ?? null,
        })),
      ),
    );
  }
  return pendencias;
}

// RN-01 como UMA transação ACID: trava a equipe, lê a posição, busca pendências,
// decide (regra pura) e grava equipe + histórico. Duas transições simultâneas
// na mesma equipe ficam em fila no FOR UPDATE — nenhuma lê estado velho.
export async function transicionar(p: {
  equipeId: string;
  destino: number;
  movidoPor: string;
  forcado: boolean;
  observacao: string | null;
}): Promise<
  | {
      tipo: "ok";
      equipe: {
        slug: string;
        status: string;
        etapa: { numero: number; nome: string };
        forcado: boolean;
      };
    }
  | { tipo: "rejeitada"; decisao: Exclude<Decisao, { tipo: "permitida" }> }
> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM equipes WHERE id = ${p.equipeId}::uuid FOR UPDATE`;
    const eq = await tx.equipes.findUniqueOrThrow({
      where: { id: p.equipeId },
      select: { status: true, etapa_atual_id: true, etapas: { select: { numero: true } } },
    });
    const origem = eq.status === "pronta_inovamf" ? POSICAO_PRONTA : eq.etapas.numero;
    const pendencias =
      p.destino > origem ? await pendenciasDaPosicao(tx, p.equipeId, origem) : [];

    const decisao = avaliarTransicao({
      origem,
      destino: p.destino,
      pendencias,
      forcado: p.forcado,
      observacao: p.observacao,
    });
    if (decisao.tipo !== "permitida") return { tipo: "rejeitada" as const, decisao };

    const etapaDestino = await tx.etapas.findUniqueOrThrow({
      where: { numero: Math.min(p.destino, 6) },
      select: { id: true },
    });
    const data: Prisma.equipesUncheckedUpdateInput = { etapa_atual_id: etapaDestino.id };
    if (p.destino === POSICAO_PRONTA) {
      data.status = "pronta_inovamf";
      data.pronta_inovamf_em = new Date();
    } else if (origem === POSICAO_PRONTA) {
      data.status = "ativa";
      data.pronta_inovamf_em = null;
    }

    const atualizada = await tx.equipes.update({
      where: { id: p.equipeId },
      data,
      select: { slug: true, status: true, etapas: { select: { numero: true, nome: true } } },
    });
    await tx.historico_etapas.create({
      data: {
        equipe_id: p.equipeId,
        etapa_origem_id: eq.etapa_atual_id,
        etapa_destino_id: etapaDestino.id,
        status_origem: eq.status,
        status_destino: atualizada.status,
        movido_por: p.movidoPor,
        forcado: decisao.forcado,
        observacao: p.observacao,
      },
    });

    return {
      tipo: "ok" as const,
      equipe: {
        slug: atualizada.slug,
        status: atualizada.status,
        etapa: { numero: atualizada.etapas.numero, nome: atualizada.etapas.nome },
        forcado: decisao.forcado,
      },
    };
  });
}

// --- Inscrição do aluno (RF-02/05) --------------------------------------------
// Cria, numa única transação: conta ativa do líder (senha já definida) + aluno,
// equipe na Etapa 1, membro líder, e para cada colega uma conta pendente +
// membro integrante + convite (tokens_senha). Hashes vêm prontos do controller.
export interface DadosInscricao {
  lider: {
    id: string;
    slug: string;
    nome: string;
    email: string;
    telefone: string;
    senhaHash: string;
  };
  aluno: { curso?: string; semestre?: string; matricula?: string };
  equipe: {
    id: string;
    slug: string;
    nome_ideia: string;
    descricao_ideia: string;
    estagio_ideia: string;
    area_id: number | null;
    ciclo_id: number | null;
    origem_divulgacao: string | null;
  };
  colegas: Array<{
    usuarioId: string;
    // null = pessoa já existe (RN-03): só ganha o vínculo com a equipe.
    criar: { slug: string; nome: string; email: string; telefone: string; senhaHash: string } | null;
    convite: { id: string; hash: string; expiraEm: Date } | null;
  }>;
}

export function inscrever(p: DadosInscricao) {
  const ops: Prisma.PrismaPromise<unknown>[] = [
    prisma.usuarios.create({
      data: {
        id: p.lider.id,
        slug: p.lider.slug,
        nome: p.lider.nome,
        email: p.lider.email,
        telefone: p.lider.telefone,
        senha: p.lider.senhaHash,
        tipo_usuario: "aluno",
        convite_aceito_em: new Date(),
      },
    }),
    prisma.alunos.create({
      data: {
        usuario_id: p.lider.id,
        curso: p.aluno.curso,
        semestre: p.aluno.semestre,
        matricula: p.aluno.matricula,
      },
    }),
    prisma.equipes.create({
      data: {
        id: p.equipe.id,
        slug: p.equipe.slug,
        nome_ideia: p.equipe.nome_ideia,
        descricao_ideia: p.equipe.descricao_ideia,
        estagio_ideia: p.equipe.estagio_ideia,
        area_id: p.equipe.area_id,
        ciclo_id: p.equipe.ciclo_id,
        origem_divulgacao: p.equipe.origem_divulgacao,
      },
    }),
    prisma.equipe_membros.create({
      data: { equipe_id: p.equipe.id, usuario_id: p.lider.id, papel: "lider" },
    }),
  ];

  for (const c of p.colegas) {
    if (c.criar) {
      ops.push(
        prisma.usuarios.create({
          data: {
            id: c.usuarioId,
            slug: c.criar.slug,
            nome: c.criar.nome,
            email: c.criar.email,
            telefone: c.criar.telefone,
            senha: c.criar.senhaHash,
            tipo_usuario: "aluno",
          },
        }),
      );
    }
    ops.push(
      prisma.equipe_membros.create({
        data: { equipe_id: p.equipe.id, usuario_id: c.usuarioId, papel: "integrante" },
      }),
    );
    if (c.convite) {
      if (!c.criar) {
        ops.push(
          prisma.tokens_senha.updateMany({
            where: { usuario_id: c.usuarioId, finalidade: "convite", usado_em: null },
            data: { usado_em: new Date() },
          }),
        );
      }
      ops.push(
        prisma.tokens_senha.create({
          data: {
            id: c.convite.id,
            usuario_id: c.usuarioId,
            token_hash: c.convite.hash,
            finalidade: "convite",
            expira_em: c.convite.expiraEm,
          },
        }),
      );
    }
  }

  return prisma.$transaction(ops);
}
