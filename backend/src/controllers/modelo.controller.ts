import type { NextFunction, Request, Response } from "express";
import * as modeloModel from "../models/modelo.model.js";

// GET /modelos-tarefa — RF-11 (admin/mentor). id é SERIAL numérico, não UUID.
export async function index(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await modeloModel.listarAtivos();
    res.json({
      data: rows.map((m) => ({
        id: m.id,
        etapa: m.etapas.numero,
        titulo: m.titulo,
        descricao: m.descricao,
        obrigatoria: m.obrigatoria,
        prazoPadraoDias: m.prazo_padrao_dias ?? 7,
      })),
    });
  } catch (err) {
    next(err);
  }
}
