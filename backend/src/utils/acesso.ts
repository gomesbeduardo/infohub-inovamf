import type { Request } from "express";
import { fromSlug } from "./slug.js";
import type { Escopo } from "../models/equipe.model.js";

// Nosso slug é bijeção do UUID (slug = base64url(id)), então o id do chamador
// sai direto do slug do token, sem ida ao banco.
export function idDoChamador(req: Request): string {
  return fromSlug(req.auth.slug) ?? "";
}

// Ver equipe/tarefa/entrega: admin sempre; mentor se for o mentor da equipe;
// aluno se for membro ativo.
export function podeVerEquipe(
  req: Request,
  mentorId: string | null,
  membros: string[],
): boolean {
  if (req.auth.role === "admin") return true;
  const id = idDoChamador(req);
  if (req.auth.role === "mentor") return mentorId === id;
  return membros.includes(id);
}

// Gerir (criar tarefa, avaliar entrega, mover etapa): só admin ou mentor da equipe.
export function podeGerirEquipe(req: Request, mentorId: string | null): boolean {
  if (req.auth.role === "admin") return true;
  if (req.auth.role === "mentor") return mentorId === idDoChamador(req);
  return false;
}

// Escopo de leitura por papel (RNF-03), usado por listas, dashboard e CSV.
export function escopoDo(req: Request): Escopo {
  if (req.auth.role === "admin") return { tipo: "admin" };
  if (req.auth.role === "mentor") return { tipo: "mentor", usuarioId: idDoChamador(req) };
  return { tipo: "aluno", usuarioId: idDoChamador(req) };
}

// RNF-05: IP de origem gravado na auditoria. req.ip já é o IP real do cliente
// (app.ts confia no X-Forwarded-For do rewrite do Next — trust proxy).
export function ipDoChamador(req: Request): string | null {
  return req.ip ?? null;
}
