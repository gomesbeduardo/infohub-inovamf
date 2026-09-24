import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import {
  ENTREGAVEIS_FINAIS,
  POSICAO_PRONTA,
  avaliarTransicao,
  juntarPendencias,
  mudancaDeStatusValida,
  pendenciasDeIntegrantes,
  pendenciasEntregaveisFinais,
  type Decisao,
  type Pendencia,
} from "../domain/transicao.js";
import { toSlug } from "../utils/slug.js";
import { whereStatusEfetivo } from "./tarefa.model.js";
import { registrarAuditoria } from "./auditoria.model.js";
import { montarLinhaDoTempo } from "../domain/linhaDoTempo.js";

// --- Escopo por papel (RNF-03) ------------------------------------------------
export type Escopo =
  | { tipo: "admin" }
  | { tipo: "mentor"; usuarioId: string }
  | { tipo: "aluno"; usuarioId: string };

export function whereEscopo(e: Escopo): Prisma.equipesWhereInput {
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

// Sem paginação (export). Teto defensivo para não varrer o banco inteiro (Problema 5).
export const LIMITE_EXPORT = 5000;
export function listarTodas(params: { escopo: Escopo } & FiltrosEquipe) {
  return prisma.equipes.findMany({
    where: { AND: [whereEscopo(params.escopo), whereFiltros(params)] },
    take: LIMITE_EXPORT,
    orderBy: [{ etapa_atual_id: "asc" }, { nome_ideia: "asc" }],
    select: resumoSelect(params.hoje),
  });
}

export function findDetalheBySlug(slug: string) {
  return prisma.equipes.findUnique({
    where: { slug },
    select: {
      id: true,
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
              alunos: { select: { curso: true, semestre: true } },
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

// A1 (gestão pelo admin) como UMA transação: trava a equipe, confere a regra
// de status (pura), grava e audita mentor/status (RNF-05). `campos` são as
// colunas simples já validadas no controller (nome, descrição, estágio, área, origem).
export async function atualizarGestao(p: {
  slug: string;
  campos: Record<string, unknown>;
  status?: string;
  mentor?: { id: string; nome: string } | null; // undefined = não mexe; null = sem mentor
  por: string;
  ip: string | null;
}): Promise<
  | {
      tipo: "ok";
      equipe: { slug: string; nome_ideia: string; status: string; estagio_ideia: string };
    }
  | { tipo: "nao_encontrada" }
  | { tipo: "transicao_invalida" }
> {
  return prisma.$transaction(async (tx) => {
    const [trava] = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM equipes WHERE slug = ${p.slug} FOR UPDATE`;
    if (!trava) return { tipo: "nao_encontrada" as const };

    const atual = await tx.equipes.findUniqueOrThrow({
      where: { id: trava.id },
      select: { status: true, mentor_id: true, usuarios: { select: { nome: true } } },
    });
    if (p.status !== undefined && !mudancaDeStatusValida(atual.status, p.status)) {
      return { tipo: "transicao_invalida" as const };
    }

    const data = { ...p.campos } as Prisma.equipesUncheckedUpdateInput;
    if (p.status !== undefined) data.status = p.status;
    if (p.mentor !== undefined) data.mentor_id = p.mentor?.id ?? null;
    const equipe = await tx.equipes.update({
      where: { id: trava.id },
      data,
      select: { slug: true, nome_ideia: true, status: true, estagio_ideia: true },
    });

    if (p.status !== undefined && p.status !== atual.status) {
      await registrarAuditoria(tx, {
        usuarioId: p.por,
        entidade: "equipe",
        entidadeId: trava.id,
        acao: "status_alterado",
        antes: { status: atual.status },
        depois: { status: p.status },
        ip: p.ip,
      });
    }
    if (p.mentor !== undefined && (p.mentor?.id ?? null) !== atual.mentor_id) {
      await registrarAuditoria(tx, {
        usuarioId: p.por,
        entidade: "equipe",
        entidadeId: trava.id,
        acao: "mentor_atribuido",
        antes: { mentor: atual.usuarios?.nome ?? null },
        depois: { mentor: p.mentor?.nome ?? null },
        ip: p.ip,
      });
    }
    return { tipo: "ok" as const, equipe };
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
  if (posicao !== 6) return pendencias;

  // RN-02: os três entregáveis finais (tarefas nascidas dos modelos da Etapa 6)
  // + os dados de todos os integrantes ativos.
  const finais = await tx.tarefas.findMany({
    where: {
      equipe_id: equipeId,
      modelos_tarefa: { etapas: { numero: 6 }, titulo: { in: [...ENTREGAVEIS_FINAIS] } },
    },
    orderBy: { criado_em: "asc" },
    select: { id: true, titulo: true, status: true, modelos_tarefa: { select: { titulo: true } } },
  });
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
  return juntarPendencias(
    pendencias,
    pendenciasEntregaveisFinais(
      finais.map((t) => ({
        slug: toSlug(t.id),
        titulo: t.titulo,
        status: t.status,
        modelo: t.modelos_tarefa?.titulo ?? "",
      })),
    ),
    pendenciasDeIntegrantes(
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

// Pendências que hoje impedem a equipe de avançar (preview do drag no kanban).
// Mesma função da transação — a regra não é duplicada.
export async function pendenciasParaAvancar(equipeId: string): Promise<Pendencia[]> {
  const eq = await prisma.equipes.findUniqueOrThrow({
    where: { id: equipeId },
    select: { status: true, etapas: { select: { numero: true } } },
  });
  const posicao = eq.status === "pronta_inovamf" ? POSICAO_PRONTA : eq.etapas.numero;
  return pendenciasDaPosicao(prisma, equipeId, posicao);
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
  ip: string | null;
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
  | { tipo: "rejeitada"; decisao: Exclude<Decisao, { tipo: "permitida" }>; origem: number }
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
    if (decisao.tipo !== "permitida") return { tipo: "rejeitada" as const, decisao, origem };

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
    await registrarAuditoria(tx, {
      usuarioId: p.movidoPor,
      entidade: "equipe",
      entidadeId: p.equipeId,
      acao: "etapa_movida",
      antes: { posicao: origem, status: eq.status },
      depois: {
        posicao: p.destino,
        status: atualizada.status,
        forcado: decisao.forcado,
        observacao: p.observacao,
      },
      ip: p.ip,
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

export type ColegaPreparado = DadosInscricao["colegas"][number];

// Operações que ligam UMA pessoa a uma equipe como integrante: cria a conta se
// for nova, o vínculo, e o convite (invalidando o anterior se ela já existia).
function opsVinculoColega(equipeId: string, c: ColegaPreparado): Prisma.PrismaPromise<unknown>[] {
  const ops: Prisma.PrismaPromise<unknown>[] = [];
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
  // upsert (não create): a pessoa pode já ter uma linha inativa nesta equipe
  // (retirada antes — ver removerMembro) e reintegrar precisa reativá-la, não
  // colidir com a PK composta (equipe_id, usuario_id).
  ops.push(
    prisma.equipe_membros.upsert({
      where: { equipe_id_usuario_id: { equipe_id: equipeId, usuario_id: c.usuarioId } },
      update: { ativo: true, saiu_em: null, papel: "integrante", entrou_em: new Date() },
      create: { equipe_id: equipeId, usuario_id: c.usuarioId, papel: "integrante" },
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
  return ops;
}

export function adicionarMembro(equipeId: string, c: ColegaPreparado) {
  return prisma.$transaction(opsVinculoColega(equipeId, c));
}

// Retira um integrante ATIVO da equipe (líder, mentor da equipe ou admin —
// controller decide a permissão; o líder nunca pode ser removido). UMA
// transação: desativa o vínculo (nunca apaga — entregas/histórico continuam),
// invalida convite pendente e audita.
export async function removerMembro(p: {
  equipeId: string;
  membroId: string;
  membroSlug: string;
  removidoPor: string;
  ip: string | null;
}): Promise<
  | { tipo: "ok"; saiuEm: Date }
  | { tipo: "nao_encontrado" }
  | { tipo: "lider" }
> {
  return prisma.$transaction(async (tx) => {
    const vinculo = await tx.equipe_membros.findUnique({
      where: { equipe_id_usuario_id: { equipe_id: p.equipeId, usuario_id: p.membroId } },
      select: { ativo: true, papel: true },
    });
    if (!vinculo || !vinculo.ativo) return { tipo: "nao_encontrado" as const };
    if (vinculo.papel === "lider") return { tipo: "lider" as const };

    const saiuEm = new Date();
    await tx.equipe_membros.update({
      where: { equipe_id_usuario_id: { equipe_id: p.equipeId, usuario_id: p.membroId } },
      data: { ativo: false, saiu_em: saiuEm },
    });
    await tx.tokens_senha.updateMany({
      where: { usuario_id: p.membroId, finalidade: "convite", usado_em: null },
      data: { usado_em: new Date() },
    });
    await registrarAuditoria(tx, {
      usuarioId: p.removidoPor,
      entidade: "equipe",
      entidadeId: p.equipeId,
      acao: "membro_removido",
      depois: { membro: p.membroSlug },
      ip: p.ip,
    });
    return { tipo: "ok" as const, saiuEm };
  });
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

  for (const c of p.colegas) ops.push(...opsVinculoColega(p.equipe.id, c));

  return prisma.$transaction(ops);
}

// A5: o que a linha do tempo junta — histórico de etapas e auditoria da
// equipe, das tarefas dela e das entregas dessas tarefas. Só leitura.
export async function eventosLinhaDoTempo(equipeId: string, limite: number) {
  const tarefas = await prisma.tarefas.findMany({
    where: { equipe_id: equipeId },
    select: { id: true, entregas: { select: { id: true } } },
  });
  const tarefaIds = tarefas.map((t) => t.id);
  const entregaIds = tarefas.flatMap((t) => t.entregas.map((e) => e.id));
  const [historico, auditoria] = await Promise.all([
    prisma.historico_etapas.findMany({
      where: { equipe_id: equipeId },
      orderBy: { criado_em: "desc" },
      take: limite,
      select: {
        forcado: true,
        observacao: true,
        status_origem: true,
        status_destino: true,
        criado_em: true,
        etapas_historico_etapas_etapa_origem_idToetapas: { select: { numero: true } },
        etapas_historico_etapas_etapa_destino_idToetapas: { select: { numero: true } },
        usuarios: { select: { nome: true } },
      },
    }),
    prisma.log_auditoria.findMany({
      where: {
        acao: { not: "etapa_movida" },
        OR: [
          { entidade: "equipe", entidade_id: equipeId },
          { entidade: "tarefa", entidade_id: { in: tarefaIds } },
          { entidade: "entrega", entidade_id: { in: entregaIds } },
        ],
      },
      orderBy: { criado_em: "desc" },
      take: limite,
      select: {
        acao: true,
        dados_anteriores: true,
        dados_novos: true,
        criado_em: true,
        usuarios: { select: { nome: true } },
      },
    }),
  ]);
  return { historico, auditoria };
}

// A5: a linha do tempo pronta (busca + regra pura). Uma função só para o
// endpoint da linha do tempo e para o "último evento" da mesa do mentor.
export async function linhaDoTempo(equipeId: string, o: { paraAluno: boolean; limite: number }) {
  const { historico, auditoria } = await eventosLinhaDoTempo(equipeId, o.limite);
  return montarLinhaDoTempo({
    paraAluno: o.paraAluno,
    limite: o.limite,
    movimentos: historico.map((h) => ({
      de:
        h.status_origem === "pronta_inovamf"
          ? "pronta"
          : (h.etapas_historico_etapas_etapa_origem_idToetapas?.numero ?? null),
      para:
        h.status_destino === "pronta_inovamf"
          ? "pronta"
          : h.etapas_historico_etapas_etapa_destino_idToetapas.numero,
      forcado: h.forcado,
      observacao: h.observacao,
      autor: h.usuarios?.nome ?? null,
      em: h.criado_em,
    })),
    auditoria: auditoria.map((a) => ({
      acao: a.acao,
      antes: a.dados_anteriores,
      depois: a.dados_novos,
      autor: a.usuarios?.nome ?? null,
      em: a.criado_em,
    })),
  });
}
