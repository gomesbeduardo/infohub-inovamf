import type { TipoUsuario } from "../domain/enums.js";

// Contexto de autenticação preenchido pelo middleware `auth`. Presente em toda
// rota autenticada; o controller lê req.auth direto (slug, papel, jti).
export interface AuthContext {
  slug: string;
  role: TipoUsuario;
  jti: string;
}

declare global {
  namespace Express {
    interface Request {
      auth: AuthContext;
    }
  }
}

export {};
