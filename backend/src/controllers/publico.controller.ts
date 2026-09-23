import type { NextFunction, Request, Response } from "express";
import * as publicoModel from "../models/publico.model.js";

// GET /publico/numeros — agregados reais para o hero da landing (issue #157).
// Pública (sem auth): só contagens, cacheável por 1 minuto.
export async function numeros(_req: Request, res: Response, next: NextFunction) {
  try {
    const dados = await publicoModel.numeros();
    res.setHeader("Cache-Control", "public, max-age=60");
    res.json({ data: dados });
  } catch (err) {
    next(err);
  }
}
