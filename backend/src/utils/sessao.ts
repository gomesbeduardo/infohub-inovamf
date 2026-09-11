import type { Request } from "express";
import { signAccess } from "./jwt.js";
import { parseDurationMs } from "./time.js";
import { env } from "../env.js";
import type { TipoUsuario } from "../domain/enums.js";
import * as tokenModel from "../models/token.model.js";

const ACCESS_TTL_MS = parseDurationMs(env.jwtAccessTtl);

export interface UsuarioSessao {
  id: string;
  slug: string;
  nome: string;
  tipo_usuario: string;
}

// Emite um par access(JWT)+refresh(opaco) e o corpo padrão de sessão.
// Compartilhado por auth (login/register/refresh) e pela inscrição de equipe.
export async function emitirSessao(
  usuario: UsuarioSessao,
  refreshPaiId: string | null,
  req: Request,
) {
  const { jti, refreshRaw } = await tokenModel.criarPar({
    usuarioId: usuario.id,
    refreshTtlDias: env.refreshTtlDays,
    accessTtlMs: ACCESS_TTL_MS,
    refreshPaiId,
    userAgent: req.header("user-agent") ?? null,
  });
  const access = signAccess({
    sub: usuario.slug,
    role: usuario.tipo_usuario as TipoUsuario,
    jti,
  });
  return {
    access,
    refresh: refreshRaw,
    usuario: {
      slug: usuario.slug,
      nome: usuario.nome,
      role: usuario.tipo_usuario,
    },
  };
}
