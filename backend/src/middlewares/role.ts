import type { NextFunction, Request, Response } from "express";
import { httpError } from "../utils/error.js";
import type { TipoUsuario } from "../domain/enums.js";

// Restringe a rota a papéis específicos. Usar sempre DEPOIS de `auth`.
// Autenticado mas sem papel permitido → 403 FORBIDDEN.
export function role(...permitidos: TipoUsuario[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!permitidos.includes(req.auth.role)) {
      next(httpError(403, "FORBIDDEN", "Acesso negado para este papel"));
      return;
    }
    next();
  };
}
