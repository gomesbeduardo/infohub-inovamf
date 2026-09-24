import type { Request } from "express";
import { httpError } from "./error.js";
import { ipDoChamador } from "./acesso.js";
import { consentimentoValido } from "../domain/lgpd.js";
import * as termosModel from "../models/termos.model.js";
import type { DadosAceite } from "../models/termos.model.js";

// Cadastro do líder e aceite de convite: exige `consentimento: true` (Termos de
// Uso + Política de Privacidade) e devolve o que vai gravado como prova.
export async function exigirAceite(req: Request): Promise<DadosAceite> {
  if (!consentimentoValido(req.body?.consentimento)) {
    throw httpError(
      400,
      "CONSENTIMENTO_OBRIGATORIO",
      "Aceite os Termos de Uso e a Política de Privacidade para continuar",
    );
  }
  const termo = await termosModel.findVigente();
  if (!termo) {
    throw httpError(503, "TERMOS_INDISPONIVEIS", "Termos de Uso indisponíveis; tente mais tarde");
  }
  return { termoId: termo.id, ip: ipDoChamador(req), userAgent: req.get("user-agent") ?? null };
}
