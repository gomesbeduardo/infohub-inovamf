import type { NextFunction, Request, Response } from "express";
import { httpError } from "../utils/error.js";
import { paginacao } from "../utils/http.js";
import { env } from "../env.js";
import { linkConvite } from "../utils/convite.js";
import * as usuarioModel from "../models/usuario.model.js";
import * as tokenModel from "../models/token.model.js";
import * as emailModel from "../models/email.model.js";

// GET /convites/pendentes — admin lista contas ainda não aceitas.
export async function pendentes(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, perPage, skip } = paginacao(req);
    const [linhas, total] = await Promise.all([
      usuarioModel.listarConvitesPendentes({ skip, take: perPage }),
      usuarioModel.contarConvitesPendentes(),
    ]);
    res.json({
      data: linhas.map((u) => ({
        slug: u.slug,
        nome: u.nome,
        email: u.email,
        role: u.tipo_usuario,
        criadoEm: u.criado_em,
      })),
      page,
      perPage,
      total,
    });
  } catch (err) {
    next(err);
  }
}

// POST /usuarios/:slug/convite — admin reemite o convite (invalida o anterior).
export async function reenviar(req: Request, res: Response, next: NextFunction) {
  try {
    const usuario = await usuarioModel.findParaConviteBySlug(req.params.slug ?? "");
    if (!usuario) throw httpError(404, "USUARIO_NOT_FOUND", "Usuário não encontrado");
    if (usuario.convite_aceito_em) {
      throw httpError(409, "ALREADY_ACCEPTED", "Convite já foi aceito");
    }

    await tokenModel.invalidarConvitesAtivos(usuario.id);
    const convite = await tokenModel.criarConvite({
      usuarioId: usuario.id,
      ttlHoras: env.inviteTtlHoras,
    });
    const link = linkConvite(convite.tokenBruto);

    let enfileirado = true;
    try {
      await emailModel.enfileirar({
        tipo: "convite_conta",
        destinatarioId: usuario.id,
        destinatarioEmail: usuario.email,
        assunto: "Seu convite para o InfoHub",
        template: "convite_conta",
        dadosTemplate: { nome: usuario.nome, link },
      });
    } catch (e) {
      // Em produção depende da CR-001 (convite_conta). Loga e segue.
      enfileirado = false;
      console.warn("[convite] falha ao enfileirar e-mail", e);
    }

    res.status(201).json({
      conviteUrl: link,
      convite: {
        expira_em: convite.expiraEm.toISOString(),
        email_enfileirado: enfileirado,
      },
      ...(env.nodeEnv !== "production" ? { token_dev: convite.tokenBruto } : {}),
    });
  } catch (err) {
    next(err);
  }
}
