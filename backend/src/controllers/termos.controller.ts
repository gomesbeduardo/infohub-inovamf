import type { NextFunction, Request, Response } from "express";
import { httpError } from "../utils/error.js";
import * as termosModel from "../models/termos.model.js";

// GET /termos/vigente — pública (cadastro e convite mostram antes do aceite).
export async function vigente(_req: Request, res: Response, next: NextFunction) {
  try {
    const t = await termosModel.findVigente();
    if (!t) throw httpError(404, "NOT_FOUND", "Termos de Uso não publicados");
    res.json({
      versao: t.versao,
      titulo: t.titulo,
      conteudo: t.conteudo,
      publicadoEm: t.publicado_em.toISOString(),
    });
  } catch (err) {
    next(err);
  }
}
