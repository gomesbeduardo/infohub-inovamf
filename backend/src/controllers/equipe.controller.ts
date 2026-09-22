import type { NextFunction, Request, Response } from "express";
import { httpError } from "../utils/error.js";
import { fromSlug, newId, novoIdComSlug } from "../utils/slug.js";
import { hashSenha, hashTokenSenha, tokenAleatorio } from "../utils/hash.js";
import { emitirSessao } from "../utils/sessao.js";
import { EMAIL_RE } from "../utils/text.js";
import { paginacao } from "../utils/http.js";
import { idDoChamador, podeGerirEquipe } from "../utils/acesso.js";
import { env } from "../env.js";
import {
  ESTAGIOS_IDEIA,
  STATUS_EQUIPE,
  type EstagioIdeia,
  type StatusEquipe,
} from "../domain/enums.js";
import { POSICAO_PRONTA } from "../domain/transicao.js";
import * as equipeModel from "../models/equipe.model.js";
import * as areaModel from "../models/area.model.js";
import * as usuarioModel from "../models/usuario.model.js";
import * as emailModel from "../models/email.model.js";

const MAX_COLEGAS = 9; // Q5 (máx integrantes) em aberto — teto p/ conter abuso no endpoint público.

function escopoDo(req: Request): equipeModel.Escopo {
  if (req.auth.role === "admin") return { tipo: "admin" };
  if (req.auth.role === "mentor") return { tipo: "mentor", usuarioId: idDoChamador(req) };
  return { tipo: "aluno", usuarioId: idDoChamador(req) };
}

// GET /equipes — funil/lista com escopo por papel (RF-06, RNF-03).
export async function index(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, perPage, skip } = paginacao(req);

    let areaId: number | undefined;
    if (typeof req.query.area === "string" && req.query.area.trim()) {
      const area = await areaModel.findIdByNome(req.query.area.trim());
      if (!area) throw httpError(400, "INVALID_AREA", "Área desconhecida");
      areaId = area.id;
    }

    const etapaNumero =
      req.query.etapa !== undefined ? Number(req.query.etapa) : undefined;
    const status =
      typeof req.query.status === "string" &&
      (STATUS_EQUIPE as string[]).includes(req.query.status)
        ? req.query.status
        : undefined;
    const mentorId =
      typeof req.query.mentor === "string" && req.query.mentor.trim()
        ? (fromSlug(req.query.mentor.trim()) ?? undefined)
        : undefined;
    const q = typeof req.query.q === "string" ? req.query.q.trim() || undefined : undefined;

    const filtros = {
      escopo: escopoDo(req),
      etapaNumero: etapaNumero && etapaNumero >= 1 ? etapaNumero : undefined,
      areaId,
      status,
      mentorId,
      q,
    };

    const [linhas, total] = await Promise.all([
      equipeModel.listar({ skip, take: perPage, ...filtros }),
      equipeModel.contar(filtros),
    ]);

    res.json({
      data: linhas.map((e) => ({
        slug: e.slug,
        nomeIdeia: e.nome_ideia,
        status: e.status,
        estagio: e.estagio_ideia,
        etapa: { numero: e.etapas.numero, nome: e.etapas.nome },
        area: e.areas_ideia?.nome ?? null,
        mentor: e.usuarios ? { slug: e.usuarios.slug, nome: e.usuarios.nome } : null,
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

// GET /equipes/:slug — detalhe (RF-08) com controle de acesso.
export async function show(req: Request, res: Response, next: NextFunction) {
  try {
    const equipe = await equipeModel.findDetalheBySlug(req.params.slug ?? "");
    if (!equipe) throw httpError(404, "EQUIPE_NOT_FOUND", "Equipe não encontrada");

    const meuSlug = req.auth.slug;
    const ehMentorDela = equipe.usuarios?.slug === meuSlug;
    const ehMembro = equipe.equipe_membros.some(
      (m) => m.usuarios.slug === meuSlug,
    );
    if (req.auth.role === "mentor" && !ehMentorDela) {
      throw httpError(403, "NOT_TEAM_MENTOR", "Equipe fora do seu escopo");
    }
    if (req.auth.role === "aluno" && !ehMembro) {
      throw httpError(403, "NOT_TEAM_MEMBER", "Você não participa desta equipe");
    }

    res.json({
      slug: equipe.slug,
      nomeIdeia: equipe.nome_ideia,
      descricaoIdeia: equipe.descricao_ideia,
      estagio: equipe.estagio_ideia,
      status: equipe.status,
      origemDivulgacao: equipe.origem_divulgacao,
      prontaInovamfEm: equipe.pronta_inovamf_em,
      criadoEm: equipe.criado_em,
      etapa: { numero: equipe.etapas.numero, nome: equipe.etapas.nome },
      area: equipe.areas_ideia?.nome ?? null,
      ciclo: equipe.ciclos?.nome ?? null,
      mentor: equipe.usuarios
        ? { slug: equipe.usuarios.slug, nome: equipe.usuarios.nome }
        : null,
      membros: equipe.equipe_membros.map((m) => ({
        slug: m.usuarios.slug,
        nome: m.usuarios.nome,
        papel: m.papel,
        tipo: m.usuarios.tipo_usuario,
        pendente: m.usuarios.convite_aceito_em === null,
      })),
      historico: equipe.historico_etapas.map((h) => ({
        de:
          h.status_origem === "pronta_inovamf"
            ? "pronta"
            : (h.etapas_historico_etapas_etapa_origem_idToetapas?.numero ?? null),
        para:
          h.status_destino === "pronta_inovamf"
            ? "pronta"
            : h.etapas_historico_etapas_etapa_destino_idToetapas.numero,
        forcado: h.forcado,
        observacao: h.observacao,
        por: h.usuarios ? { slug: h.usuarios.slug, nome: h.usuarios.nome } : null,
        em: h.criado_em,
      })),
    });
  } catch (err) {
    next(err);
  }
}

function validarEstagio(v: unknown): EstagioIdeia {
  if (typeof v !== "string" || !(ESTAGIOS_IDEIA as string[]).includes(v)) {
    throw httpError(400, "INVALID_ESTAGIO", "Estágio da ideia inválido");
  }
  return v as EstagioIdeia;
}

// POST /equipes — admin cria equipe manualmente.
export async function store(req: Request, res: Response, next: NextFunction) {
  try {
    const { nomeIdeia, descricaoIdeia, estagio, area, mentor, origem } = req.body ?? {};
    if (typeof nomeIdeia !== "string" || nomeIdeia.trim().length < 3) {
      throw httpError(400, "INVALID_NOME", "Nome da ideia inválido");
    }
    if (typeof descricaoIdeia !== "string" || descricaoIdeia.trim().length === 0) {
      throw httpError(400, "INVALID_DESCRICAO", "Descrição obrigatória");
    }
    const estagioIdeia = validarEstagio(estagio);

    let areaId: number | null = null;
    if (typeof area === "string" && area.trim()) {
      const a = await areaModel.findIdByNome(area.trim());
      if (!a) throw httpError(400, "INVALID_AREA", "Área desconhecida");
      areaId = a.id;
    }

    let mentorId: string | null = null;
    if (typeof mentor === "string" && mentor.trim()) {
      const id = fromSlug(mentor.trim());
      const u = id ? await usuarioModel.findParaSessaoById(id) : null;
      if (!u || (u.tipo_usuario !== "mentor" && u.tipo_usuario !== "admin")) {
        throw httpError(400, "INVALID_MENTOR", "Mentor inválido");
      }
      mentorId = id;
    }

    const { id, slug } = novoIdComSlug();
    const equipe = await equipeModel.criar({
      id,
      slug,
      nome_ideia: nomeIdeia.trim(),
      descricao_ideia: descricaoIdeia.trim(),
      estagio_ideia: estagioIdeia,
      area_id: areaId,
      mentor_id: mentorId,
      origem_divulgacao: typeof origem === "string" ? origem.trim() : null,
    });

    res.status(201).json({ slug: equipe.slug, nomeIdeia: equipe.nome_ideia });
  } catch (err) {
    next(err);
  }
}

// PATCH /equipes/:slug — admin edita.
export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const { nomeIdeia, descricaoIdeia, estagio, status, area, mentor, origem } =
      req.body ?? {};
    const data: Record<string, unknown> = {};

    if (nomeIdeia !== undefined) {
      if (typeof nomeIdeia !== "string" || nomeIdeia.trim().length < 3) {
        throw httpError(400, "INVALID_NOME", "Nome da ideia inválido");
      }
      data.nome_ideia = nomeIdeia.trim();
    }
    if (descricaoIdeia !== undefined) {
      if (typeof descricaoIdeia !== "string" || descricaoIdeia.trim().length === 0) {
        throw httpError(400, "INVALID_DESCRICAO", "Descrição inválida");
      }
      data.descricao_ideia = descricaoIdeia.trim();
    }
    if (estagio !== undefined) data.estagio_ideia = validarEstagio(estagio);
    if (status !== undefined) {
      if (typeof status !== "string" || !(STATUS_EQUIPE as string[]).includes(status)) {
        throw httpError(400, "INVALID_STATUS", "Status inválido");
      }
      if ((status as StatusEquipe) === "pronta_inovamf") {
        throw httpError(
          400,
          "USE_TRANSICAO",
          "Use POST /equipes/:slug/etapa com etapa 'pronta' (RN-02)",
        );
      }
      data.status = status;
    }
    if (origem !== undefined) {
      data.origem_divulgacao = typeof origem === "string" ? origem.trim() : null;
    }
    if (area !== undefined) {
      if (typeof area === "string" && area.trim()) {
        const a = await areaModel.findIdByNome(area.trim());
        if (!a) throw httpError(400, "INVALID_AREA", "Área desconhecida");
        data.area_id = a.id;
      } else {
        data.area_id = null;
      }
    }
    if (mentor !== undefined) {
      if (typeof mentor === "string" && mentor.trim()) {
        const id = fromSlug(mentor.trim());
        const u = id ? await usuarioModel.findParaSessaoById(id) : null;
        if (!u || (u.tipo_usuario !== "mentor" && u.tipo_usuario !== "admin")) {
          throw httpError(400, "INVALID_MENTOR", "Mentor inválido");
        }
        data.mentor_id = id;
      } else {
        data.mentor_id = null;
      }
    }

    if (Object.keys(data).length === 0) {
      throw httpError(400, "EMPTY_UPDATE", "Nada para atualizar");
    }

    const controle = await equipeModel.findControleBySlug(req.params.slug ?? "");
    if (!controle) throw httpError(404, "EQUIPE_NOT_FOUND", "Equipe não encontrada");

    const atualizada = await equipeModel.atualizarPorSlug(
      req.params.slug ?? "",
      data,
    );
    res.json({
      slug: atualizada.slug,
      nomeIdeia: atualizada.nome_ideia,
      status: atualizada.status,
      estagio: atualizada.estagio_ideia,
    });
  } catch (err) {
    next(err);
  }
}

const MENSAGEM_INVALIDA: Record<string, string> = {
  MESMA_POSICAO: "A equipe já está nessa etapa",
  OBSERVACAO_OBRIGATORIA: "Para forçar, explique o motivo na observação",
  POSICAO_INVALIDA: "Etapa deve ser um número de 1 a 6 ou 'pronta'",
};

// POST /equipes/:slug/etapa — avançar/retroceder (RF-09, RN-01, RN-02).
export async function moverEtapa(req: Request, res: Response, next: NextFunction) {
  try {
    const { etapa, observacao, forcado } = req.body ?? {};
    const destino = etapa === "pronta" ? POSICAO_PRONTA : Number(etapa);
    if (!Number.isInteger(destino) || destino < 1 || destino > POSICAO_PRONTA) {
      throw httpError(400, "INVALID_ETAPA", MENSAGEM_INVALIDA.POSICAO_INVALIDA ?? "");
    }
    if (forcado !== undefined && typeof forcado !== "boolean") {
      throw httpError(400, "INVALID_FORCADO", "forcado deve ser booleano");
    }

    const controle = await equipeModel.findControleBySlug(req.params.slug ?? "");
    if (!controle) throw httpError(404, "EQUIPE_NOT_FOUND", "Equipe não encontrada");
    if (!podeGerirEquipe(req, controle.mentor_id)) {
      throw httpError(403, "NOT_TEAM_MENTOR", "Equipe fora do seu escopo");
    }

    const r = await equipeModel.transicionar({
      equipeId: controle.id,
      destino,
      movidoPor: idDoChamador(req),
      forcado: forcado === true,
      observacao: typeof observacao === "string" && observacao.trim() ? observacao.trim() : null,
    });

    if (r.tipo === "rejeitada") {
      if (r.decisao.tipo === "invalida") {
        throw httpError(400, r.decisao.codigo, MENSAGEM_INVALIDA[r.decisao.codigo] ?? "");
      }
      throw httpError(
        409,
        r.decisao.motivo === "salto" ? "RN01_SALTO" : "RN01_PENDENCIAS",
        r.decisao.motivo === "salto"
          ? "Pular etapas exige forçar com observação"
          : "Há pendências obrigatórias nesta etapa",
        { pendencias: r.decisao.pendencias },
      );
    }
    res.json(r.equipe);
  } catch (err) {
    next(err);
  }
}

// POST /equipes/inscricao — pública (rate-limited). Formulário de ideia (RF-02/05).
export async function inscricao(req: Request, res: Response, next: NextFunction) {
  try {
    const { lider, ideia, colegas } = req.body ?? {};
    if (typeof lider !== "object" || lider === null) {
      throw httpError(400, "INVALID_BODY", "Dados do líder ausentes");
    }
    if (typeof ideia !== "object" || ideia === null) {
      throw httpError(400, "INVALID_BODY", "Dados da ideia ausentes");
    }

    // Líder
    if (typeof lider.nome !== "string" || lider.nome.trim().length < 3) {
      throw httpError(400, "INVALID_NOME", "Nome do líder inválido");
    }
    if (typeof lider.email !== "string" || !EMAIL_RE.test(lider.email.trim())) {
      throw httpError(400, "INVALID_EMAIL", "E-mail do líder inválido");
    }
    if (typeof lider.senha !== "string" || lider.senha.length < 8) {
      throw httpError(400, "WEAK_PASSWORD", "Senha deve ter ao menos 8 caracteres");
    }
    if (typeof lider.telefone !== "string" || lider.telefone.trim().length === 0) {
      throw httpError(400, "INVALID_TELEFONE", "Telefone obrigatório");
    }

    // Ideia
    if (typeof ideia.nome !== "string" || ideia.nome.trim().length < 3) {
      throw httpError(400, "INVALID_NOME", "Nome da ideia inválido");
    }
    if (typeof ideia.descricao !== "string" || ideia.descricao.trim().length === 0) {
      throw httpError(400, "INVALID_DESCRICAO", "Descrição da ideia obrigatória");
    }
    const estagioIdeia = validarEstagio(ideia.estagio);

    let areaId: number | null = null;
    if (typeof ideia.area === "string" && ideia.area.trim()) {
      const a = await areaModel.findIdByNome(ideia.area.trim());
      if (!a) throw httpError(400, "INVALID_AREA", "Área desconhecida");
      areaId = a.id;
    }

    // Colegas
    const listaColegas: Array<{ nome: string; email: string; telefone: string }> = [];
    if (colegas !== undefined) {
      if (!Array.isArray(colegas)) {
        throw httpError(400, "INVALID_COLEGAS", "colegas deve ser uma lista");
      }
      if (colegas.length > MAX_COLEGAS) {
        throw httpError(400, "TOO_MANY_COLEGAS", `Máximo de ${MAX_COLEGAS} colegas`);
      }
      for (const c of colegas) {
        if (typeof c !== "object" || c === null) {
          throw httpError(400, "INVALID_COLEGA", "Colega inválido");
        }
        if (typeof c.nome !== "string" || c.nome.trim().length < 3) {
          throw httpError(400, "INVALID_COLEGA", "Nome de colega inválido");
        }
        if (typeof c.email !== "string" || !EMAIL_RE.test(c.email.trim())) {
          throw httpError(400, "INVALID_COLEGA", "E-mail de colega inválido");
        }
        listaColegas.push({
          nome: c.nome.trim(),
          email: c.email.toLowerCase().trim(),
          telefone: typeof c.telefone === "string" ? c.telefone.trim() : "",
        });
      }
    }

    // E-mails únicos (dentro do lote e contra o banco)
    const emailLider = lider.email.toLowerCase().trim();
    const todosEmails = [emailLider, ...listaColegas.map((c) => c.email)];
    if (new Set(todosEmails).size !== todosEmails.length) {
      throw httpError(400, "DUP_EMAIL", "E-mails repetidos na inscrição");
    }
    const jaExistem = await usuarioModel.findEmailsExistentes(todosEmails);
    if (jaExistem.length > 0) {
      throw httpError(409, "EMAIL_TAKEN", `E-mail já cadastrado: ${jaExistem[0]}`);
    }

    // Preparar dados (hashes prontos; model só grava)
    const liderIds = novoIdComSlug();
    const equipeIds = novoIdComSlug();
    const expiraConvite = new Date(Date.now() + env.inviteTtlHoras * 3_600_000);

    const colegasPrep = await Promise.all(
      listaColegas.map(async (c) => {
        const ids = novoIdComSlug();
        const conviteId = newId();
        const segredo = tokenAleatorio(24);
        return {
          id: ids.id,
          slug: ids.slug,
          nome: c.nome,
          email: c.email,
          telefone: c.telefone,
          senhaHash: await hashSenha(tokenAleatorio(32)),
          conviteId,
          conviteHash: await hashTokenSenha(segredo),
          conviteExpiraEm: expiraConvite,
          conviteToken: `${conviteId}.${segredo}`,
        };
      }),
    );

    await equipeModel.inscrever({
      lider: {
        id: liderIds.id,
        slug: liderIds.slug,
        nome: lider.nome.trim(),
        email: emailLider,
        telefone: lider.telefone.trim(),
        senhaHash: await hashSenha(lider.senha),
      },
      aluno: {
        curso: typeof lider.curso === "string" ? lider.curso.trim() : undefined,
        semestre:
          typeof lider.semestre === "string" ? lider.semestre.trim() : undefined,
        matricula:
          typeof lider.matricula === "string" ? lider.matricula.trim() : undefined,
      },
      equipe: {
        id: equipeIds.id,
        slug: equipeIds.slug,
        nome_ideia: ideia.nome.trim(),
        descricao_ideia: ideia.descricao.trim(),
        estagio_ideia: estagioIdeia,
        area_id: areaId,
        origem_divulgacao:
          typeof ideia.origem === "string" ? ideia.origem.trim() : null,
      },
      colegas: colegasPrep,
    });

    // E-mails (best-effort; não derruba a inscrição já gravada).
    const link = (token: string) =>
      `${env.inviteUrlBase}?token=${encodeURIComponent(token)}`;
    const admins = await usuarioModel.listarEmailsAdminsAtivos().catch(() => []);
    await emailModel.enfileirarLote(
      admins.map((a) => ({
        tipo: "novo_cadastro_admin",
        destinatarioId: a.id,
        destinatarioEmail: a.email,
        assunto: "Novo cadastro no InfoHub",
        template: "novo_cadastro_admin",
        dadosTemplate: {
          equipe: ideia.nome.trim(),
          lider: lider.nome.trim(),
          equipe_slug: equipeIds.slug,
        },
        equipeId: equipeIds.id,
      })),
    );
    for (const c of colegasPrep) {
      try {
        await emailModel.enfileirar({
          tipo: "convite_conta",
          destinatarioId: c.id,
          destinatarioEmail: c.email,
          assunto: "Você foi adicionado a uma equipe no InfoHub",
          template: "convite_conta",
          dadosTemplate: { nome: c.nome, link: link(c.conviteToken) },
          equipeId: equipeIds.id,
        });
      } catch (e) {
        // Em produção depende da CR-001 (convite_conta). Loga e segue.
        console.error("[inscricao] falha ao enfileirar convite de colega", e);
      }
    }

    const sessao = await emitirSessao(
      {
        id: liderIds.id,
        slug: liderIds.slug,
        nome: lider.nome.trim(),
        tipo_usuario: "aluno",
      },
      null,
      req,
    );

    res.status(201).json({
      ...sessao,
      equipe: { slug: equipeIds.slug, nomeIdeia: ideia.nome.trim() },
      colegas: colegasPrep.map((c) => ({
        slug: c.slug,
        email: c.email,
        ...(env.nodeEnv !== "production" ? { token_dev: c.conviteToken } : {}),
      })),
    });
  } catch (err) {
    next(err);
  }
}
