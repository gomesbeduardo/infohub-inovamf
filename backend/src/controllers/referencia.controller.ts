import type { NextFunction, Request, Response } from "express";
import * as areaModel from "../models/area.model.js";
import * as cicloModel from "../models/ciclo.model.js";
import * as etapaModel from "../models/etapa.model.js";
import { dataISO } from "../domain/atraso.js";

// Dados de referência para popular o formulário de ideia e o funil.

// GET /areas-ideia
export async function areas(_req: Request, res: Response, next: NextFunction) {
  try {
    const linhas = await areaModel.listarAtivas();
    res.json({ data: linhas.map((a) => ({ nome: a.nome, ordem: a.ordem })) });
  } catch (err) {
    next(err);
  }
}

// GET /etapas-funil (seeded, somente leitura)
export async function etapas(_req: Request, res: Response, next: NextFunction) {
  try {
    const linhas = await etapaModel.listar();
    res.json({
      data: linhas.map((e) => ({
        numero: e.numero,
        nome: e.nome,
        descricao: e.descricao,
        entregavel: e.entregavel,
      })),
    });
  } catch (err) {
    next(err);
  }
}

// GET /ciclos — pública (filtro do funil).
export async function ciclos(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await cicloModel.listarAtivos();
    res.json({
      data: rows.map((c) => ({
        nome: c.nome,
        dataInicio: dataISO(c.data_inicio),
        dataFim: c.data_fim ? dataISO(c.data_fim) : null,
      })),
    });
  } catch (err) {
    next(err);
  }
}
