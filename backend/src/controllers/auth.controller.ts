import type { NextFunction, Request, Response } from "express";
import { httpError } from "../utils/error.js";
import {
  DUMMY_SENHA_HASH,
  compararTokenSenha,
  hashSenha,
  sha256,
  verificarSenha,
} from "../utils/hash.js";
import { isUuid } from "../utils/slug.js";
import { idDoChamador } from "../utils/acesso.js";
import { emitirSessao } from "../utils/sessao.js";
import type { FinalidadeToken } from "../domain/enums.js";
import * as usuarioModel from "../models/usuario.model.js";
import * as tokenModel from "../models/token.model.js";

// POST /auth/login — pública (rate-limited)
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, senha } = req.body ?? {};
    if (typeof email !== "string" || typeof senha !== "string" || !email || !senha) {
      throw httpError(400, "INVALID_BODY", "Informe e-mail e senha");
    }

    const usuario = await usuarioModel.findAtivoByEmail(email.toLowerCase().trim());
    // Mesma resposta (e mesmo custo de tempo) para e-mail inexistente e senha errada.
    const ok = await verificarSenha(senha, usuario?.senha ?? DUMMY_SENHA_HASH);
    if (!usuario || !ok) {
      throw httpError(401, "INVALID_CREDENTIALS", "E-mail ou senha inválidos");
    }

    await usuarioModel.touchUltimoLogin(usuario.id);
    res.json(await emitirSessao(usuario, null, req));
  } catch (err) {
    next(err);
  }
}

// Mensagens por finalidade: o mesmo formato "<id>.<segredo>" serve ao convite
// (RF-03) e ao link de redefinição gerado pelo admin (RF-01).
const ERROS_TOKEN: Record<
  FinalidadeToken,
  Record<"invalido" | "usado" | "expirado", [string, string]>
> = {
  convite: {
    invalido: ["INVALID_INVITE", "Convite inválido"],
    usado: ["INVITE_USED", "Convite já utilizado"],
    expirado: ["INVITE_EXPIRED", "Convite expirado"],
  },
  recuperacao: {
    invalido: ["INVALID_RESET", "Link de redefinição inválido"],
    usado: ["RESET_USED", "Este link já foi usado"],
    expirado: ["RESET_EXPIRED", "Link expirado: peça um novo à coordenação"],
  },
};

// Valida um token "<id>.<segredo>" de tokens_senha da finalidade pedida e
// devolve a linha, ou lança httpError 400 com o código daquela finalidade.
async function abrirTokenSenha(
  token: unknown,
  finalidade: FinalidadeToken,
): Promise<{ id: string; usuario_id: string }> {
  const erro = (k: "invalido" | "usado" | "expirado") => {
    const [codigo, mensagem] = ERROS_TOKEN[finalidade][k];
    return httpError(400, codigo, mensagem);
  };
  if (typeof token !== "string" || token.length === 0) throw erro("invalido");
  const ponto = token.indexOf(".");
  const tokenId = ponto > 0 ? token.slice(0, ponto) : "";
  const segredo = ponto > 0 ? token.slice(ponto + 1) : "";
  if (!tokenId || !segredo || !isUuid(tokenId)) throw erro("invalido");

  const linha = await tokenModel.findConviteById(tokenId);
  if (!linha || linha.finalidade !== finalidade) throw erro("invalido");
  if (linha.usado_em) throw erro("usado");
  if (linha.expira_em <= new Date()) throw erro("expirado");
  if (!(await compararTokenSenha(segredo, linha.token_hash))) throw erro("invalido");
  return { id: linha.id, usuario_id: linha.usuario_id };
}

// GET /auth/invite?token=... — pública. Mostra os dados pré-preenchidos para a
// tela onde a pessoa confere/completa antes de definir a senha ("vê os dados").
export async function invitePreview(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const convite = await abrirTokenSenha(req.query.token, "convite");
    const dados = await usuarioModel.findDadosConvite(convite.usuario_id);
    if (!dados) {
      throw httpError(400, "INVALID_INVITE", "Convite inválido");
    }
    res.json({
      nome: dados.nome,
      email: dados.email,
      telefone: dados.telefone,
      role: dados.tipo_usuario,
    });
  } catch (err) {
    next(err);
  }
}

// POST /auth/register — pública. A pessoa confirma/completa os dados e define a
// senha; o convite é queimado e ela já entra logada (rate-limited).
export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, senha, nome, telefone, curso, semestre, matricula } = req.body ?? {};
    if (typeof senha !== "string") {
      throw httpError(400, "INVALID_BODY", "Informe token de convite e senha");
    }
    if (senha.length < 8) {
      throw httpError(400, "WEAK_PASSWORD", "Senha deve ter ao menos 8 caracteres");
    }
    if (nome !== undefined && (typeof nome !== "string" || nome.trim().length < 3)) {
      throw httpError(400, "INVALID_NOME", "Nome deve ter ao menos 3 caracteres");
    }
    if (telefone !== undefined && typeof telefone !== "string") {
      throw httpError(400, "INVALID_TELEFONE", "Telefone inválido");
    }

    const convite = await abrirTokenSenha(token, "convite");

    const dados = await usuarioModel.findDadosConvite(convite.usuario_id);
    let aluno: { curso: string; semestre: string; matricula: string | null } | undefined;
    if (dados?.tipo_usuario === "aluno") {
      if (typeof curso !== "string" || curso.trim().length === 0) {
        throw httpError(400, "INVALID_CURSO", "Informe seu curso");
      }
      if (typeof semestre !== "string" || semestre.trim().length === 0) {
        throw httpError(400, "INVALID_SEMESTRE", "Informe seu semestre");
      }
      aluno = {
        curso: curso.trim(),
        semestre: semestre.trim(),
        matricula: typeof matricula === "string" && matricula.trim() ? matricula.trim() : null,
      };
    }

    const senhaHash = await hashSenha(senha);
    await tokenModel.consumirConvite({
      conviteId: convite.id,
      usuarioId: convite.usuario_id,
      senhaHash,
      perfil: {
        ...(typeof nome === "string" ? { nome: nome.trim() } : {}),
        ...(typeof telefone === "string" ? { telefone: telefone.trim() } : {}),
      },
      aluno,
    });

    const usuario = await usuarioModel.findParaSessaoById(convite.usuario_id);
    if (!usuario) {
      throw httpError(400, "INVALID_INVITE", "Usuário do convite indisponível");
    }
    res.status(201).json(await emitirSessao(usuario, null, req));
  } catch (err) {
    next(err);
  }
}

// POST /auth/refresh — pública. Rotaciona; detecta reuso.
export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refresh: refreshRaw } = req.body ?? {};
    if (typeof refreshRaw !== "string" || !refreshRaw) {
      throw httpError(400, "INVALID_BODY", "Informe o refresh token");
    }

    const row = await tokenModel.findRefreshByHash(sha256(refreshRaw));
    if (!row) {
      throw httpError(401, "INVALID_TOKEN", "Refresh inválido");
    }
    // Refresh já revogado sendo reapresentado → família comprometida.
    if (row.revogado_em) {
      await tokenModel.revogarTodosVivosDoUsuario(row.usuario_id, "suspeita");
      throw httpError(401, "TOKEN_REUSE", "Sessão comprometida; faça login novamente");
    }
    if (row.expira_em <= new Date()) {
      await tokenModel.revogarPorId(row.id, "expirado");
      throw httpError(401, "INVALID_TOKEN", "Refresh expirado");
    }

    await tokenModel.revogarPorId(row.id, "refresh");
    const usuario = await usuarioModel.findParaSessaoById(row.usuario_id);
    if (!usuario) {
      throw httpError(401, "INVALID_TOKEN", "Usuário inativo");
    }
    res.json(await emitirSessao(usuario, row.id, req));
  } catch (err) {
    next(err);
  }
}

// POST /auth/logout — Bearer. Revoga o par (access + refresh irmão).
export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    await tokenModel.revogarParDeAcesso(req.auth.jti, "logout");
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// GET /auth/me — Bearer.
export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const perfil = await usuarioModel.findPerfilBySlug(req.auth.slug);
    if (!perfil) {
      throw httpError(401, "INACTIVE_USER", "Usuário inativo");
    }
    res.json({
      slug: perfil.slug,
      nome: perfil.nome,
      email: perfil.email,
      telefone: perfil.telefone,
      role: perfil.tipo_usuario,
      criadoEm: perfil.criado_em,
      ultimoLoginEm: perfil.ultimo_login_em,
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /auth/me — a pessoa edita o próprio nome/telefone (e-mail e papel não).
export async function atualizarMe(req: Request, res: Response, next: NextFunction) {
  try {
    const { nome, telefone } = req.body ?? {};
    const data: { nome?: string; telefone?: string } = {};
    if (nome !== undefined) {
      if (typeof nome !== "string" || nome.trim().length < 3) {
        throw httpError(400, "INVALID_NOME", "Nome deve ter ao menos 3 caracteres");
      }
      data.nome = nome.trim();
    }
    if (telefone !== undefined) {
      if (typeof telefone !== "string") throw httpError(400, "INVALID_TELEFONE", "Telefone inválido");
      data.telefone = telefone.trim();
    }
    if (Object.keys(data).length === 0) throw httpError(400, "EMPTY_UPDATE", "Nada para atualizar");
    await usuarioModel.atualizarPerfil(idDoChamador(req), data);
    await me(req, res, next);
  } catch (err) {
    next(err);
  }
}

// POST /auth/senha — troca exige a senha ATUAL; revoga todas as sessões e
// devolve uma nova para quem trocou (as outras abas/dispositivos caem).
export async function trocarSenha(req: Request, res: Response, next: NextFunction) {
  try {
    const { atual, nova } = req.body ?? {};
    if (typeof atual !== "string" || typeof nova !== "string") {
      throw httpError(400, "INVALID_BODY", "Informe a senha atual e a nova");
    }
    if (nova.length < 8) throw httpError(400, "WEAK_PASSWORD", "Senha deve ter ao menos 8 caracteres");
    const usuario = await usuarioModel.findSenhaById(idDoChamador(req));
    if (!usuario || !(await verificarSenha(atual, usuario.senha))) {
      throw httpError(401, "SENHA_ATUAL_INVALIDA", "Senha atual incorreta");
    }
    await usuarioModel.definirSenha(usuario.id, await hashSenha(nova));
    await tokenModel.revogarTodosVivosDoUsuario(usuario.id, "troca_senha");
    res.json(await emitirSessao(usuario, null, req));
  } catch (err) {
    next(err);
  }
}

// POST /auth/redefinir-senha — pública (rate-limited). Consome o link gerado
// pelo admin (RF-01): troca a senha e derruba as sessões vivas.
export async function redefinirSenha(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, senha } = req.body ?? {};
    if (typeof senha !== "string" || senha.length < 8) {
      throw httpError(400, "WEAK_PASSWORD", "Senha deve ter ao menos 8 caracteres");
    }
    const linha = await abrirTokenSenha(token, "recuperacao");
    const ok = await tokenModel.consumirRecuperacao({
      tokenId: linha.id,
      usuarioId: linha.usuario_id,
      senhaHash: await hashSenha(senha),
    });
    if (!ok) throw httpError(400, "RESET_USED", "Este link já foi usado");
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
