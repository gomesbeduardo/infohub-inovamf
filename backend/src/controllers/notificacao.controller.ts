import type { NextFunction, Request, Response } from "express";
import { httpError } from "../utils/error.js";
import { idDoChamador, ipDoChamador, podeGerirEquipe } from "../utils/acesso.js";
import { paginacao } from "../utils/http.js";
import { TIPOS_EMAIL, ehTipoEmail } from "../domain/enums.js";
import * as preferenciaModel from "../models/preferencia.model.js";
import * as emailModel from "../models/email.model.js";
import * as equipeModel from "../models/equipe.model.js";

// GET /notificacoes/preferencias — do próprio usuário (ausência de linha = habilitado).
export async function preferencias(req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await preferenciaModel.listarPorUsuario(idDoChamador(req));
    const map = new Map(rows.map((r) => [r.tipo, r.habilitado]));
    res.json({
      data: TIPOS_EMAIL.map((tipo) => ({
        tipo,
        habilitado: map.get(tipo) ?? true,
      })),
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /notificacoes/preferencias — liga/desliga um tipo (RF-21).
export async function definirPreferencia(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { tipo, habilitado } = req.body ?? {};
    if (!ehTipoEmail(tipo)) {
      throw httpError(400, "INVALID_TIPO", "Tipo de notificação inválido");
    }
    if (typeof habilitado !== "boolean") {
      throw httpError(400, "INVALID_HABILITADO", "habilitado deve ser booleano");
    }
    const pref = await preferenciaModel.definir(idDoChamador(req), tipo, habilitado);
    res.json({ tipo: pref.tipo, habilitado: pref.habilitado });
  } catch (err) {
    next(err);
  }
}

// GET /notificacoes — inbox do próprio usuário (RF-18).
export async function index(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, perPage, skip } = paginacao(req);
    const id = idDoChamador(req);
    const [linhas, total] = await Promise.all([
      emailModel.listarPorDestinatario(id, { skip, take: perPage }),
      emailModel.contarPorDestinatario(id),
    ]);
    res.json({
      data: linhas.map((e) => ({
        tipo: e.tipo,
        assunto: e.assunto,
        status: e.status,
        dados: e.dados_template,
        criadoEm: e.criado_em,
      })),
      page,
      perPage,
      total,
    });
  } catch (err) {
    next(err);
  }
}

// Teto da mensagem do lembrete manual — o front usa o mesmo limite.
const LIMITE_MENSAGEM = 500;

// POST /equipes/:slug/lembrete — admin/mentor dispara lembrete manual (RF-20).
// Fila de e-mails + auditoria na mesma transação (RNF-05).
export async function lembrete(req: Request, res: Response, next: NextFunction) {
  try {
    const controle = await equipeModel.findControleBySlug(req.params.slug ?? "");
    if (!controle) throw httpError(404, "EQUIPE_NOT_FOUND", "Equipe não encontrada");
    if (!podeGerirEquipe(req, controle.mentor_id)) {
      throw httpError(403, "FORBIDDEN", "Equipe fora do seu escopo");
    }

    const { assunto, mensagem } = req.body ?? {};
    if (mensagem !== undefined && typeof mensagem !== "string") {
      throw httpError(400, "INVALID_MENSAGEM", "Mensagem inválida");
    }
    const texto = typeof mensagem === "string" ? mensagem.trim() : "";
    if (texto.length > LIMITE_MENSAGEM) {
      throw httpError(400, "MENSAGEM_LONGA", `A mensagem pode ter até ${LIMITE_MENSAGEM} caracteres`);
    }
    const titulo =
      typeof assunto === "string" && assunto.trim()
        ? assunto.trim().slice(0, 255)
        : "Lembrete da equipe InfoHub";

    const membros = await equipeModel.listarEmailsMembros(controle.id);
    const enfileirados = await emailModel.enfileirarComAuditoria(
      membros.map((m) => ({
        tipo: "lembrete_manual",
        destinatarioId: m.usuarios.id,
        destinatarioEmail: m.usuarios.email,
        assunto: titulo,
        template: "lembrete_manual",
        dadosTemplate: { mensagem: texto },
        equipeId: controle.id,
      })),
      {
        usuarioId: idDoChamador(req),
        entidade: "equipe",
        entidadeId: controle.id,
        acao: "lembrete_enviado",
        depois: { mensagem: texto, destinatarios: membros.length },
        ip: ipDoChamador(req),
      },
    );
    res.status(201).json({ enfileirados, total: membros.length });
  } catch (err) {
    next(err);
  }
}
