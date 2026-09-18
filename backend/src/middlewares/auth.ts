import type { NextFunction, Request, Response } from "express";
import { httpError } from "../utils/error.js";
import { verifyAccess } from "../utils/jwt.js";
import {
  findAccessTokenVivo,
  findUsuarioAtivoBySlug,
} from "../models/auth.model.js";
import type { TipoUsuario } from "../domain/enums.js";

// Bearer. Passos §7:
// 1. sem header / fora de "Authorization: Bearer <token>" → 401 MISSING_TOKEN
// 2. assinatura inválida / expirado                       → 401 INVALID_TOKEN
// 3. usuário inativo (ou token revogado)                  → 401 INACTIVE_USER / INVALID_TOKEN
// 4. ok → req.auth = { slug, role, jti }
export async function auth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.header("authorization") ?? "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
      throw httpError(401, "MISSING_TOKEN", "Token de acesso ausente");
    }

    let payload;
    try {
      payload = verifyAccess(token);
    } catch {
      throw httpError(401, "INVALID_TOKEN", "Token inválido ou expirado");
    }

    const usuario = await findUsuarioAtivoBySlug(payload.sub);
    if (!usuario) {
      throw httpError(401, "INACTIVE_USER", "Usuário inativo");
    }

    const tokenVivo = await findAccessTokenVivo(payload.jti);
    if (!tokenVivo) {
      throw httpError(401, "INVALID_TOKEN", "Sessão revogada ou expirada");
    }

    req.auth = {
      slug: usuario.slug,
      role: usuario.tipo_usuario as TipoUsuario,
      jti: payload.jti,
    };
    next();
  } catch (err) {
    next(err);
  }
}
