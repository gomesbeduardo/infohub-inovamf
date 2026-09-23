import type { NextFunction, Request, Response } from "express";
import { httpError } from "../utils/error.js";
import { fromSlug, toSlug } from "../utils/slug.js";
import { ehUrlHttps } from "../utils/text.js";
import {
  idDoChamador,
  ipDoChamador,
  podeGerirEquipe,
  podeVerEquipe,
} from "../utils/acesso.js";
import { RESULTADOS_AVALIACAO, type ResultadoAvaliacao } from "../domain/enums.js";
import * as entregaModel from "../models/entrega.model.js";
import * as tarefaModel from "../models/tarefa.model.js";
import * as usuarioModel from "../models/usuario.model.js";
import * as equipeModel from "../models/equipe.model.js";
import * as emailModel from "../models/email.model.js";

interface EntregaView {
  id: string;
  versao: number;
  comentario: string | null;
  criado_em: Date;
  usuarios: { slug: string; nome: string };
  arquivos_entrega: Array<{
    tipo: string;
    nome_original: string | null;
    url_externa: string | null;
  }>;
  avaliacoes_entrega: Array<{
    resultado: string;
    comentario: string | null;
    criado_em: Date;
    usuarios: { slug: string; nome: string };
  }>;
}

function mapEntrega(e: EntregaView) {
  return {
    slug: toSlug(e.id),
    versao: e.versao,
    comentario: e.comentario,
    enviadoPor: { slug: e.usuarios.slug, nome: e.usuarios.nome },
    criadoEm: e.criado_em,
    arquivos: e.arquivos_entrega.map((a) => ({
      tipo: a.tipo,
      nome: a.nome_original,
      url: a.url_externa,
    })),
    avaliacoes: e.avaliacoes_entrega.map((av) => ({
      resultado: av.resultado,
      comentario: av.comentario,
      por: { slug: av.usuarios.slug, nome: av.usuarios.nome },
      em: av.criado_em,
    })),
  };
}

// POST /tarefas/:slug/entregas — membro da equipe envia entrega (RF-14/16).
export async function store(req: Request, res: Response, next: NextFunction) {
  try {
    const tarefaId = fromSlug(req.params.slug ?? "");
    const tarefa = tarefaId ? await tarefaModel.findById(tarefaId) : null;
    if (!tarefa) throw httpError(404, "TAREFA_NOT_FOUND", "Tarefa não encontrada");

    const membros = tarefa.equipes.equipe_membros.map((m) => m.usuario_id);
    if (!podeVerEquipe(req, tarefa.equipes.mentor_id, membros)) {
      throw httpError(403, "FORBIDDEN", "Tarefa fora do seu escopo");
    }

    const { links, comentario } = req.body ?? {};
    if (!Array.isArray(links) || links.length === 0) {
      throw httpError(400, "NO_LINKS", "Envie ao menos um link de entrega");
    }
    const arquivos: Array<{ url: string; nome: string | null }> = [];
    for (const l of links) {
      const url = typeof l === "string" ? l : l?.url;
      if (!ehUrlHttps(url)) {
        throw httpError(400, "INVALID_LINK", "Cada link deve ser uma URL https válida");
      }
      const nome =
        typeof l === "object" && l !== null && typeof l.nome === "string"
          ? l.nome.trim().slice(0, 255)
          : null;
      arquivos.push({ url, nome });
    }
    if (comentario !== undefined && typeof comentario !== "string") {
      throw httpError(400, "INVALID_COMENTARIO", "Comentário inválido");
    }

    // Colisão de versão por reenvio simultâneo (P2002) → 409 pelo handler central.
    // Entrega + status "entregue" + auditoria numa transação só (RNF-05).
    const versao = await entregaModel.proximaVersao(tarefaId as string);
    const entrega = await entregaModel.enviar({
      tarefaId: tarefaId as string,
      tarefaTitulo: tarefa.titulo,
      versao,
      enviadoPor: idDoChamador(req),
      comentario: typeof comentario === "string" ? comentario.trim() : null,
      arquivos,
      ip: ipDoChamador(req),
    });

    // Notifica admins (RF-19), best-effort.
    const admins = await usuarioModel.listarEmailsAdminsAtivos().catch(() => []);
    await emailModel.enfileirarLote(
      admins.map((a) => ({
        tipo: "entrega_recebida_admin",
        destinatarioId: a.id,
        destinatarioEmail: a.email,
        assunto: "Nova entrega recebida",
        template: "entrega_recebida_admin",
        dadosTemplate: { tarefa: tarefa.titulo, versao, equipe_slug: tarefa.equipes.slug },
      })),
    );

    res.status(201).json(mapEntrega(entrega));
  } catch (err) {
    next(err);
  }
}

// GET /tarefas/:slug/entregas — histórico de versões (RF-16).
export async function index(req: Request, res: Response, next: NextFunction) {
  try {
    const tarefaId = fromSlug(req.params.slug ?? "");
    const tarefa = tarefaId ? await tarefaModel.findById(tarefaId) : null;
    if (!tarefa) throw httpError(404, "TAREFA_NOT_FOUND", "Tarefa não encontrada");

    const membros = tarefa.equipes.equipe_membros.map((m) => m.usuario_id);
    if (!podeVerEquipe(req, tarefa.equipes.mentor_id, membros)) {
      throw httpError(403, "FORBIDDEN", "Tarefa fora do seu escopo");
    }

    const entregas = await entregaModel.listarPorTarefa(tarefaId as string);
    res.json({ data: entregas.map(mapEntrega) });
  } catch (err) {
    next(err);
  }
}

// GET /entregas/:slug — detalhe.
export async function show(req: Request, res: Response, next: NextFunction) {
  try {
    const id = fromSlug(req.params.slug ?? "");
    const entrega = id ? await entregaModel.findById(id) : null;
    if (!entrega) throw httpError(404, "ENTREGA_NOT_FOUND", "Entrega não encontrada");

    const membros = entrega.tarefas.equipes.equipe_membros.map((m) => m.usuario_id);
    if (!podeVerEquipe(req, entrega.tarefas.equipes.mentor_id, membros)) {
      throw httpError(403, "FORBIDDEN", "Entrega fora do seu escopo");
    }
    res.json(mapEntrega(entrega));
  } catch (err) {
    next(err);
  }
}

// POST /entregas/:slug/avaliacoes — admin/mentor aprova ou pede ajuste (RF-15).
export async function avaliar(req: Request, res: Response, next: NextFunction) {
  try {
    const id = fromSlug(req.params.slug ?? "");
    const entrega = id ? await entregaModel.findById(id) : null;
    if (!entrega) throw httpError(404, "ENTREGA_NOT_FOUND", "Entrega não encontrada");

    if (!podeGerirEquipe(req, entrega.tarefas.equipes.mentor_id)) {
      throw httpError(403, "FORBIDDEN", "Sem permissão para avaliar esta entrega");
    }

    const { resultado, comentario } = req.body ?? {};
    if (
      typeof resultado !== "string" ||
      !(RESULTADOS_AVALIACAO as string[]).includes(resultado)
    ) {
      throw httpError(400, "INVALID_RESULTADO", "resultado deve ser 'aprovada' ou 'ajustar'");
    }
    if (comentario !== undefined && typeof comentario !== "string") {
      throw httpError(400, "INVALID_COMENTARIO", "Comentário inválido");
    }

    const texto = typeof comentario === "string" ? comentario.trim() : null;
    // Avaliação + status da tarefa (RF-15) + auditoria numa transação (RNF-05).
    const avaliacao = await entregaModel.avaliar({
      entregaId: id as string,
      tarefaId: entrega.tarefas.id,
      tarefaTitulo: entrega.tarefas.titulo,
      avaliadorId: idDoChamador(req),
      resultado: resultado as ResultadoAvaliacao,
      comentario: texto,
      ip: ipDoChamador(req),
    });

    // RF-18/B1: todos os alunos ativos da equipe ficam sabendo (best-effort).
    const equipe = entrega.tarefas.equipes;
    const aprovada = resultado === "aprovada";
    const membros = await equipeModel.listarEmailsMembros(equipe.id).catch(() => []);
    await emailModel.enfileirarLote(
      membros.map((m) => ({
        tipo: aprovada ? "entrega_aprovada" : "entrega_ajustar",
        destinatarioId: m.usuarios.id,
        destinatarioEmail: m.usuarios.email,
        assunto: aprovada ? "Entrega aprovada" : "Ajustes solicitados",
        template: aprovada ? "entrega_aprovada" : "entrega_ajustar",
        dadosTemplate: {
          tarefa: entrega.tarefas.titulo,
          comentario: texto ?? "",
          equipe_slug: equipe.slug,
        },
        equipeId: equipe.id,
        tarefaId: entrega.tarefas.id,
      })),
    );

    res.status(201).json({
      resultado: avaliacao.resultado,
      comentario: avaliacao.comentario,
      em: avaliacao.criado_em,
    });
  } catch (err) {
    next(err);
  }
}
