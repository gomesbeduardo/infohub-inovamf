import type { NextFunction, Request, Response } from "express";
import { httpError } from "../utils/error.js";
import { fromSlug, toSlug } from "../utils/slug.js";
import {
  idDoChamador,
  podeGerirEquipe,
  podeVerEquipe,
} from "../utils/acesso.js";
import { STATUS_TAREFA } from "../domain/enums.js";
import { hojeISO, statusEfetivo } from "../domain/atraso.js";
import * as tarefaModel from "../models/tarefa.model.js";
import * as equipeModel from "../models/equipe.model.js";
import * as etapaModel from "../models/etapa.model.js";
import * as emailModel from "../models/email.model.js";

function parseDataEntrega(v: unknown): Date {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    throw httpError(400, "INVALID_DATA", "data_entrega deve ser YYYY-MM-DD");
  }
  const d = new Date(`${v}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    throw httpError(400, "INVALID_DATA", "Data inválida");
  }
  return d;
}

interface TarefaDetalhe {
  id: string;
  titulo: string;
  descricao: string | null;
  obrigatoria: boolean;
  data_entrega: Date;
  status: string;
  criado_em: Date;
  concluida_em: Date | null;
  etapas: { numero: number; nome: string };
  equipes: {
    slug: string;
    nome_ideia: string;
    mentor_id: string | null;
    equipe_membros: { usuario_id: string }[];
  };
}

function mapTarefa(t: TarefaDetalhe) {
  return {
    slug: toSlug(t.id),
    titulo: t.titulo,
    descricao: t.descricao,
    obrigatoria: t.obrigatoria,
    dataEntrega: t.data_entrega,
    status: statusEfetivo(t.status, t.data_entrega, hojeISO()),
    etapa: { numero: t.etapas.numero, nome: t.etapas.nome },
    equipe: { slug: t.equipes.slug, nomeIdeia: t.equipes.nome_ideia },
    criadoEm: t.criado_em,
    concluidaEm: t.concluida_em,
  };
}

// GET /equipes/:slug/tarefas — lista as tarefas da equipe (RF-13).
export async function index(req: Request, res: Response, next: NextFunction) {
  try {
    const controle = await equipeModel.findControleBySlug(req.params.slug ?? "");
    if (!controle) throw httpError(404, "EQUIPE_NOT_FOUND", "Equipe não encontrada");

    const membros = controle.equipe_membros.map((m) => m.usuario_id);
    if (!podeVerEquipe(req, controle.mentor_id, membros)) {
      throw httpError(403, "FORBIDDEN", "Equipe fora do seu escopo");
    }

    const status =
      typeof req.query.status === "string" &&
      (STATUS_TAREFA as string[]).includes(req.query.status)
        ? req.query.status
        : undefined;

    const tarefas = await tarefaModel.listarPorEquipe(controle.id, {
      status,
      hoje: hojeISO(),
    });
    res.json({ data: tarefas.map(mapTarefa) });
  } catch (err) {
    next(err);
  }
}

// POST /equipes/:slug/tarefas — admin ou mentor da equipe cria tarefa (RF-11/12).
export async function store(req: Request, res: Response, next: NextFunction) {
  try {
    const { titulo, descricao, etapa, dataEntrega, obrigatoria } = req.body ?? {};
    if (typeof titulo !== "string" || titulo.trim().length < 3) {
      throw httpError(400, "INVALID_TITULO", "Título deve ter ao menos 3 caracteres");
    }
    const numero = Number(etapa);
    if (!Number.isInteger(numero) || numero < 1 || numero > 6) {
      throw httpError(400, "INVALID_ETAPA", "Etapa deve ser um número de 1 a 6");
    }
    const data = parseDataEntrega(dataEntrega);
    if (descricao !== undefined && typeof descricao !== "string") {
      throw httpError(400, "INVALID_DESCRICAO", "Descrição inválida");
    }
    if (obrigatoria !== undefined && typeof obrigatoria !== "boolean") {
      throw httpError(400, "INVALID_OBRIGATORIA", "obrigatoria deve ser booleano");
    }

    const controle = await equipeModel.findControleBySlug(req.params.slug ?? "");
    if (!controle) throw httpError(404, "EQUIPE_NOT_FOUND", "Equipe não encontrada");
    if (!podeGerirEquipe(req, controle.mentor_id)) {
      throw httpError(403, "FORBIDDEN", "Sem permissão para criar tarefas nesta equipe");
    }

    const etapaRow = await etapaModel.findByNumero(numero);
    if (!etapaRow) throw httpError(400, "INVALID_ETAPA", "Etapa inexistente");

    const tarefa = await tarefaModel.criar({
      equipe_id: controle.id,
      etapa_id: etapaRow.id,
      titulo: titulo.trim(),
      descricao: typeof descricao === "string" ? descricao.trim() : null,
      obrigatoria: obrigatoria === undefined ? true : obrigatoria,
      data_entrega: data,
      criado_por: idDoChamador(req),
    });

    // RF-18: notifica os membros da equipe da nova tarefa (best-effort).
    const membros = await equipeModel.listarEmailsMembros(controle.id);
    await emailModel.enfileirarLote(
      membros.map((m) => ({
        tipo: "nova_tarefa",
        destinatarioId: m.usuarios.id,
        destinatarioEmail: m.usuarios.email,
        assunto: "Nova tarefa atribuída",
        template: "nova_tarefa",
        dadosTemplate: {
          titulo: tarefa.titulo,
          data_entrega: tarefa.data_entrega.toISOString().slice(0, 10),
        },
        equipeId: controle.id,
        tarefaId: tarefa.id,
      })),
    );

    res.status(201).json(mapTarefa(tarefa));
  } catch (err) {
    next(err);
  }
}

// GET /tarefas/:slug — detalhe.
export async function show(req: Request, res: Response, next: NextFunction) {
  try {
    const id = fromSlug(req.params.slug ?? "");
    const tarefa = id ? await tarefaModel.findById(id) : null;
    if (!tarefa) throw httpError(404, "TAREFA_NOT_FOUND", "Tarefa não encontrada");

    const membros = tarefa.equipes.equipe_membros.map((m) => m.usuario_id);
    if (!podeVerEquipe(req, tarefa.equipes.mentor_id, membros)) {
      throw httpError(403, "FORBIDDEN", "Tarefa fora do seu escopo");
    }
    res.json(mapTarefa(tarefa));
  } catch (err) {
    next(err);
  }
}

// PATCH /tarefas/:slug — admin ou mentor da equipe (RF-12/15).
export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const id = fromSlug(req.params.slug ?? "");
    const atual = id ? await tarefaModel.findById(id) : null;
    if (!atual) throw httpError(404, "TAREFA_NOT_FOUND", "Tarefa não encontrada");
    if (!podeGerirEquipe(req, atual.equipes.mentor_id)) {
      throw httpError(403, "FORBIDDEN", "Sem permissão para editar esta tarefa");
    }

    const { titulo, descricao, etapa, dataEntrega, obrigatoria, status } =
      req.body ?? {};
    const data: Record<string, unknown> = {};

    if (titulo !== undefined) {
      if (typeof titulo !== "string" || titulo.trim().length < 3) {
        throw httpError(400, "INVALID_TITULO", "Título inválido");
      }
      data.titulo = titulo.trim();
    }
    if (descricao !== undefined) {
      if (typeof descricao !== "string") {
        throw httpError(400, "INVALID_DESCRICAO", "Descrição inválida");
      }
      data.descricao = descricao.trim();
    }
    if (dataEntrega !== undefined) data.data_entrega = parseDataEntrega(dataEntrega);
    if (obrigatoria !== undefined) {
      if (typeof obrigatoria !== "boolean") {
        throw httpError(400, "INVALID_OBRIGATORIA", "obrigatoria deve ser booleano");
      }
      data.obrigatoria = obrigatoria;
    }
    if (etapa !== undefined) {
      const numero = Number(etapa);
      if (!Number.isInteger(numero) || numero < 1 || numero > 6) {
        throw httpError(400, "INVALID_ETAPA", "Etapa deve ser um número de 1 a 6");
      }
      const etapaRow = await etapaModel.findByNumero(numero);
      if (!etapaRow) throw httpError(400, "INVALID_ETAPA", "Etapa inexistente");
      data.etapa_id = etapaRow.id;
    }
    if (status !== undefined) {
      if (typeof status !== "string" || !(STATUS_TAREFA as string[]).includes(status)) {
        throw httpError(400, "INVALID_STATUS", "Status de tarefa inválido");
      }
      data.status = status;
      // Aprovação encerra a tarefa (RF-15).
      data.concluida_em = status === "aprovada" ? new Date() : null;
    }

    if (Object.keys(data).length === 0) {
      throw httpError(400, "EMPTY_UPDATE", "Nada para atualizar");
    }

    const tarefa = await tarefaModel.atualizarPorId(id ?? "", data);
    res.json(mapTarefa(tarefa));
  } catch (err) {
    next(err);
  }
}
