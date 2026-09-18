import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

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
}

function whereFiltros(f: FiltrosEquipe): Prisma.equipesWhereInput {
  const w: Prisma.equipesWhereInput = {};
  if (f.etapaNumero) w.etapas = { numero: f.etapaNumero };
  if (f.areaId) w.area_id = f.areaId;
  if (f.status) w.status = f.status;
  if (f.mentorId) w.mentor_id = f.mentorId;
  // Busca simples por enquanto (ILIKE). O índice GIN full-text de nome_ideia
  // fica como otimização futura (ENTITIES.md §3).
  if (f.q) w.nome_ideia = { contains: f.q, mode: "insensitive" };
  return w;
}

const RESUMO_SELECT = {
  slug: true,
  nome_ideia: true,
  status: true,
  estagio_ideia: true,
  criado_em: true,
  etapas: { select: { numero: true, nome: true } },
  areas_ideia: { select: { nome: true } },
  usuarios: { select: { slug: true, nome: true } },
} satisfies Prisma.equipesSelect;

export function listar(
  params: { skip: number; take: number; escopo: Escopo } & FiltrosEquipe,
) {
  return prisma.equipes.findMany({
    where: { AND: [whereEscopo(params.escopo), whereFiltros(params)] },
    skip: params.skip,
    take: params.take,
    orderBy: { criado_em: "desc" },
    select: RESUMO_SELECT,
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
          usuarios: { select: { slug: true, nome: true, tipo_usuario: true } },
        },
      },
      historico_etapas: {
        orderBy: { criado_em: "desc" },
        select: {
          forcado: true,
          observacao: true,
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
        select: { usuario_id: true },
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

// Move a equipe para outra etapa e registra em historico_etapas (RF-09, RNF-05).
export async function moverEtapa(params: {
  equipeId: string;
  etapaOrigemId: number;
  etapaDestinoId: number;
  movidoPor: string;
  forcado: boolean;
  observacao?: string | null;
}) {
  const [atualizada] = await prisma.$transaction([
    prisma.equipes.update({
      where: { id: params.equipeId },
      data: { etapa_atual_id: params.etapaDestinoId },
      select: {
        slug: true,
        status: true,
        etapas: { select: { numero: true, nome: true } },
      },
    }),
    prisma.historico_etapas.create({
      data: {
        equipe_id: params.equipeId,
        etapa_origem_id: params.etapaOrigemId,
        etapa_destino_id: params.etapaDestinoId,
        movido_por: params.movidoPor,
        forcado: params.forcado,
        observacao: params.observacao ?? null,
      },
    }),
  ]);
  return atualizada;
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
    origem_divulgacao: string | null;
  };
  colegas: Array<{
    id: string;
    slug: string;
    nome: string;
    email: string;
    telefone: string;
    senhaHash: string;
    conviteId: string;
    conviteHash: string;
    conviteExpiraEm: Date;
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
        origem_divulgacao: p.equipe.origem_divulgacao,
      },
    }),
    prisma.equipe_membros.create({
      data: { equipe_id: p.equipe.id, usuario_id: p.lider.id, papel: "lider" },
    }),
  ];

  for (const c of p.colegas) {
    ops.push(
      prisma.usuarios.create({
        data: {
          id: c.id,
          slug: c.slug,
          nome: c.nome,
          email: c.email,
          telefone: c.telefone,
          senha: c.senhaHash,
          tipo_usuario: "aluno",
        },
      }),
      prisma.equipe_membros.create({
        data: {
          equipe_id: p.equipe.id,
          usuario_id: c.id,
          papel: "integrante",
        },
      }),
      prisma.tokens_senha.create({
        data: {
          id: c.conviteId,
          usuario_id: c.id,
          token_hash: c.conviteHash,
          finalidade: "convite",
          expira_em: c.conviteExpiraEm,
        },
      }),
    );
  }

  return prisma.$transaction(ops);
}
