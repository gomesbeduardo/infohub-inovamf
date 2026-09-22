import type { NextFunction, Request, Response } from "express";
import { escopoDo } from "../utils/acesso.js";
import { hojeISO, somarDias } from "../domain/atraso.js";
import { ehAvanco, serieSemanal } from "../domain/serie.js";
import * as dashboardModel from "../models/dashboard.model.js";

const SEMANAS = 8;

// GET /dashboard — admin (tudo) e mentor (só as suas equipes). RF-22.
export async function show(req: Request, res: Response, next: NextFunction) {
  try {
    const escopo = escopoDo(req);
    const hoje = hojeISO();
    // Margem de 1 dia: o filtro é em UTC e a janela é contada pela data de SP.
    const desde = somarDias(hoje, -(SEMANAS * 7));
    const [ind, ev] = await Promise.all([
      dashboardModel.indicadores(escopo, hoje),
      dashboardModel.eventosSerie(escopo, desde),
    ]);
    const avancos = ev.historico
      .filter((h) =>
        ehAvanco({
          origem: h.etapas_historico_etapas_etapa_origem_idToetapas?.numero ?? null,
          destino: h.etapas_historico_etapas_etapa_destino_idToetapas.numero,
          statusOrigem: h.status_origem,
          statusDestino: h.status_destino,
        }),
      )
      .map((h) => hojeISO(h.criado_em));
    const entregas = ev.concluidas.map((t) => hojeISO(t.concluida_em as Date));
    res.json({ ...ind, serieSemanal: serieSemanal(hoje, SEMANAS, avancos, entregas) });
  } catch (err) {
    next(err);
  }
}
