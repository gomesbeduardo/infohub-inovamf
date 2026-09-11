import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../env.js";
import { ehTipoUsuario, type TipoUsuario } from "../domain/enums.js";

// Access token = JWT curto (§7). Payload carrega slug (nunca id numérico/UUID),
// papel e jti. O jti referencia a linha em tokens_acesso (tipo='acesso'), o que
// permite revogar/auditar mesmo sendo JWT.
export interface AccessPayload {
  sub: string; // slug do usuário
  role: TipoUsuario;
  jti: string; // id (uuid) da linha tokens_acesso correspondente
}

export function signAccess(payload: AccessPayload): string {
  const opts: SignOptions = { expiresIn: env.jwtAccessTtl as SignOptions["expiresIn"] };
  return jwt.sign(payload, env.jwtSecret, opts);
}

// Lança se assinatura inválida/expirada (o middleware traduz em 401).
export function verifyAccess(token: string): AccessPayload {
  const decoded = jwt.verify(token, env.jwtSecret);
  if (
    typeof decoded !== "object" ||
    decoded === null ||
    typeof decoded.sub !== "string" ||
    typeof decoded.jti !== "string" ||
    !ehTipoUsuario((decoded as { role?: unknown }).role)
  ) {
    throw new Error("payload de access inválido");
  }
  return {
    sub: decoded.sub,
    role: (decoded as { role: TipoUsuario }).role,
    jti: decoded.jti,
  };
}
