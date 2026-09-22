import type { NextFunction, Request, Response } from "express";
import { httpError } from "../utils/error.js";
import { toSlug } from "../utils/slug.js";
import { idDoChamador, podeGerirEquipe } from "../utils/acesso.js";
import * as equipeModel from "../models/equipe.model.js";
import * as etapaModel from "../models/etapa.model.js";
import * as anotacaoModel from "../models/anotacao.model.js";

// RF-10: anotação interna do mentor. O que impede vazar para o aluno: a rota
// exige role admin/mentor E aqui só o admin ou o mentor DESTA equipe passam.
type Anotacao = Awaited<ReturnType<typeof anotacaoModel.listarPorEquipe>>[number];

function mapAnotacao(a: Anotacao) {
  return {
    slug: toSlug(a.id),
    conteudo: a.conteudo,
    autor: { slug: a.usuarios.slug, nome: a.usuarios.nome },
    etapa: a.etapas?.numero ?? null,
    criadoEm: a.criado_em,
  };
}

async function equipeGerida(req: Request) {
  const controle = await equipeModel.findControleBySlug(req.params.slug ?? "");
  if (!controle) throw httpError(404, "EQUIPE_NOT_FOUND", "Equipe não encontrada");
  if (!podeGerirEquipe(req, controle.mentor_id)) {
    throw httpError(403, "FORBIDDEN", "Equipe fora do seu escopo");
  }
  return controle;
}

export async function index(req: Request, res: Response, next: NextFunction) {
  try {
    const equipe = await equipeGerida(req);
    const rows = await anotacaoModel.listarPorEquipe(equipe.id);
    res.json({ data: rows.map(mapAnotacao) });
  } catch (err) {
    next(err);
  }
}

export async function store(req: Request, res: Response, next: NextFunction) {
  try {
    const equipe = await equipeGerida(req);
    const { conteudo, etapa } = req.body ?? {};
    if (typeof conteudo !== "string" || conteudo.trim().length === 0 || conteudo.length > 5000) {
      throw httpError(400, "INVALID_CONTEUDO", "Escreva a anotação (até 5000 caracteres)");
    }
    let etapaId: number | null = null;
    if (etapa !== undefined && etapa !== null) {
      const row = await etapaModel.findByNumero(Number(etapa));
      if (!row) throw httpError(400, "INVALID_ETAPA", "Etapa inexistente");
      etapaId = row.id;
    }
    const a = await anotacaoModel.criar({
      equipeId: equipe.id,
      autorId: idDoChamador(req),
      conteudo: conteudo.trim(),
      etapaId,
    });
    res.status(201).json(mapAnotacao(a));
  } catch (err) {
    next(err);
  }
}
