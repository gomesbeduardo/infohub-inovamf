import type { NextFunction, Request, Response } from "express";
import { httpError } from "../utils/error.js";
import { fromSlug, newId, novoIdComSlug } from "../utils/slug.js";
import { hashSenha, hashTokenSenha, tokenAleatorio } from "../utils/hash.js";
import { emitirSessao } from "../utils/sessao.js";
import { EMAIL_RE } from "../utils/text.js";
import { paginacao } from "../utils/http.js";
import {
  escopoDo,
  idDoChamador,
  ipDoChamador,
  podeGerirEquipe,
  podeVerEquipe,
} from "../utils/acesso.js";
import { env } from "../env.js";
import {
  ESTAGIOS_IDEIA,
  STATUS_EQUIPE,
  STATUS_TAREFA,
  type EstagioIdeia,
  type StatusEquipe,
} from "../domain/enums.js";
import { POSICAO_PRONTA, codigoBloqueio } from "../domain/transicao.js";
import { LIMITE_LINHA_DO_TEMPO } from "../domain/linhaDoTempo.js";
import { classificarColega } from "../domain/membros.js";
import { hojeISO } from "../domain/atraso.js";
import { linkConvite } from "../utils/convite.js";
import { exigirAceite } from "../utils/aceite.js";
import { equipesCSV } from "../domain/csv.js";
import * as equipeModel from "../models/equipe.model.js";
import * as areaModel from "../models/area.model.js";
import * as cicloModel from "../models/ciclo.model.js";
import * as usuarioModel from "../models/usuario.model.js";
import * as emailModel from "../models/email.model.js";
import * as tokenModel from "../models/token.model.js";

const MAX_COLEGAS = 9; // Q5 (máx integrantes) em aberto — teto p/ conter abuso no endpoint público.

const MSG_RECUSA = {
  RN03_EQUIPE_ATIVA: (e: string) => `${e} já participa de uma equipe ativa`,
  EMAIL_NAO_ALUNO: (e: string) => `${e} pertence a uma conta de mentor/admin`,
} as const;

// Prepara (hashes prontos) o vínculo de UMA pessoa a uma equipe — RN-03 decide
// entre criar, reaproveitar ou recusar. Usado pela inscrição e por "adicionar membro".
async function prepararColega(
  c: { nome: string; email: string; telefone: string },
  existente: Awaited<ReturnType<typeof usuarioModel.findParaVinculo>>[number] | null,
  expiraConvite: Date,
) {
  const v = classificarColega(existente);
  if (v.acao === "recusar") throw httpError(409, v.codigo, MSG_RECUSA[v.codigo](c.email));

  const precisaConvite = v.acao === "criar" || v.comConvite;
  const segredo = tokenAleatorio(24);
  const conviteId = newId();
  const convite = precisaConvite
    ? { id: conviteId, hash: await hashTokenSenha(segredo), expiraEm: expiraConvite }
    : null;

  if (v.acao === "criar") {
    const ids = novoIdComSlug();
    return {
      usuarioId: ids.id,
      slug: ids.slug,
      nome: c.nome,
      email: c.email,
      criar: {
        slug: ids.slug,
        nome: c.nome,
        email: c.email,
        telefone: c.telefone,
        senhaHash: await hashSenha(tokenAleatorio(32)),
      },
      convite,
      conviteToken: `${conviteId}.${segredo}`,
    };
  }
  return {
    usuarioId: existente!.id,
    slug: existente!.slug,
    nome: c.nome, // o digitado: nunca expor o nome cadastrado de quem já tem conta
    email: c.email,
    criar: null,
    convite,
    conviteToken: convite ? `${conviteId}.${segredo}` : null,
  };
}

// Filtros do funil (RF-07) a partir da query — compartilhado pela lista e pelo CSV.
async function lerFiltros(req: Request) {
  let areaId: number | undefined;
  if (typeof req.query.area === "string" && req.query.area.trim()) {
    const area = await areaModel.findIdByNome(req.query.area.trim());
    if (!area) throw httpError(400, "INVALID_AREA", "Área desconhecida");
    areaId = area.id;
  }
  let cicloId: number | undefined;
  if (typeof req.query.ciclo === "string" && req.query.ciclo.trim()) {
    const ciclo = await cicloModel.findIdByNome(req.query.ciclo.trim());
    if (!ciclo) throw httpError(400, "INVALID_CICLO", "Ciclo desconhecido");
    cicloId = ciclo.id;
  }
  const texto = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  const etapaNumero = req.query.etapa !== undefined ? Number(req.query.etapa) : undefined;
  const status = texto(req.query.status);
  const statusTarefa = texto(req.query.statusTarefa);
  const mentor = texto(req.query.mentor);
  return {
    escopo: escopoDo(req),
    etapaNumero: etapaNumero && etapaNumero >= 1 ? etapaNumero : undefined,
    areaId,
    cicloId,
    status: status && (STATUS_EQUIPE as string[]).includes(status) ? status : undefined,
    statusTarefa:
      statusTarefa && (STATUS_TAREFA as string[]).includes(statusTarefa) ? statusTarefa : undefined,
    mentorId: mentor ? (fromSlug(mentor) ?? undefined) : undefined,
    q: texto(req.query.q),
    curso: texto(req.query.curso),
    hoje: hojeISO(),
  };
}

type LinhaResumo = Awaited<ReturnType<typeof equipeModel.listar>>[number];

// Linha do funil/lista (RF-06). Exportada para o CSV (Task 6) reusar.
export function mapResumo(e: LinhaResumo) {
  const lider = e.equipe_membros[0]?.usuarios ?? null;
  return {
    slug: e.slug,
    nomeIdeia: e.nome_ideia,
    descricaoIdeia: e.descricao_ideia,
    status: e.status,
    estagio: e.estagio_ideia,
    etapa: { numero: e.etapas.numero, nome: e.etapas.nome },
    area: e.areas_ideia?.nome ?? null,
    ciclo: e.ciclos?.nome ?? null,
    mentor: e.usuarios ? { slug: e.usuarios.slug, nome: e.usuarios.nome } : null,
    lider: lider ? { slug: lider.slug, nome: lider.nome, curso: lider.alunos?.curso ?? null } : null,
    membrosCount: e._count.equipe_membros,
    tarefasAtrasadas: e._count.tarefas,
    criadoEm: e.criado_em,
  };
}

// GET /equipes/export.csv — RF-23, com os mesmos filtros e escopo da lista.
export async function exportarCSV(req: Request, res: Response, next: NextFunction) {
  try {
    const filtros = await lerFiltros(req);
    const linhas = (await equipeModel.listarTodas(filtros)).map(mapResumo);
    const csv = equipesCSV(
      linhas.map((e) => ({
        nomeIdeia: e.nomeIdeia,
        area: e.area,
        etapa: e.etapa,
        status: e.status,
        mentor: e.mentor?.nome ?? null,
        cursoLider: e.lider?.curso ?? null,
        tarefasAtrasadas: e.tarefasAtrasadas,
      })),
    );
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="equipes-infohub.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
}

// GET /equipes — funil/lista com escopo por papel (RF-06, RNF-03).
export async function index(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, perPage, skip } = paginacao(req);
    const filtros = await lerFiltros(req);
    const [linhas, total] = await Promise.all([
      equipeModel.listar({ skip, take: perPage, ...filtros }),
      equipeModel.contar(filtros),
    ]);
    res.json({ data: linhas.map(mapResumo), page, perPage, total });
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
    const meuMembro = equipe.equipe_membros.find((m) => m.usuarios.slug === meuSlug);
    const ehMembro = meuMembro !== undefined;
    // souLider: só o próprio líder ativo, para o front decidir "Enviar entrega"/"Comecei".
    const souLider = req.auth.role === "aluno" && meuMembro?.papel === "lider";
    if (req.auth.role === "mentor" && !ehMentorDela) {
      throw httpError(403, "NOT_TEAM_MENTOR", "Equipe fora do seu escopo");
    }
    if (req.auth.role === "aluno" && !ehMembro) {
      throw httpError(403, "NOT_TEAM_MEMBER", "Você não participa desta equipe");
    }

    const pendencias = await equipeModel.pendenciasParaAvancar(equipe.id);

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
      souLider,
      membros: equipe.equipe_membros.map((m) => ({
        slug: m.usuarios.slug,
        nome: m.usuarios.nome,
        papel: m.papel,
        tipo: m.usuarios.tipo_usuario,
        pendente: m.usuarios.convite_aceito_em === null,
        curso: m.usuarios.alunos?.curso ?? null,
        semestre: m.usuarios.alunos?.semestre ?? null,
      })),
      pendenciasParaAvancar: pendencias,
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

// PATCH /equipes/:slug — admin edita e faz a gestão (A1): mentor e status.
// "pronta_inovamf" só vem da transição (RN-02); "encaminhada_inovamf" só a
// partir de "pronta_inovamf" (409). Mentor/status mudados são auditados (RNF-05).
export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const { nomeIdeia, descricaoIdeia, estagio, status, area, mentor, origem } =
      req.body ?? {};
    const campos: Record<string, unknown> = {};

    if (nomeIdeia !== undefined) {
      if (typeof nomeIdeia !== "string" || nomeIdeia.trim().length < 3) {
        throw httpError(400, "INVALID_NOME", "Nome da ideia inválido");
      }
      campos.nome_ideia = nomeIdeia.trim();
    }
    if (descricaoIdeia !== undefined) {
      if (typeof descricaoIdeia !== "string" || descricaoIdeia.trim().length === 0) {
        throw httpError(400, "INVALID_DESCRICAO", "Descrição inválida");
      }
      campos.descricao_ideia = descricaoIdeia.trim();
    }
    if (estagio !== undefined) campos.estagio_ideia = validarEstagio(estagio);
    if (origem !== undefined) {
      campos.origem_divulgacao = typeof origem === "string" ? origem.trim() : null;
    }
    if (area !== undefined) {
      if (typeof area === "string" && area.trim()) {
        const a = await areaModel.findIdByNome(area.trim());
        if (!a) throw httpError(400, "INVALID_AREA", "Área desconhecida");
        campos.area_id = a.id;
      } else {
        campos.area_id = null;
      }
    }

    let novoStatus: StatusEquipe | undefined;
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
      novoStatus = status as StatusEquipe;
    }

    // undefined = não mexe; null = "sem mentor".
    let novoMentor: { id: string; nome: string } | null | undefined;
    if (mentor !== undefined) {
      if (typeof mentor === "string" && mentor.trim()) {
        const id = fromSlug(mentor.trim());
        const u = id ? await usuarioModel.findParaSessaoById(id) : null;
        if (!id || !u || (u.tipo_usuario !== "mentor" && u.tipo_usuario !== "admin")) {
          throw httpError(400, "INVALID_MENTOR", "Mentor inválido");
        }
        novoMentor = { id, nome: u.nome };
      } else {
        novoMentor = null;
      }
    }

    if (
      Object.keys(campos).length === 0 &&
      novoStatus === undefined &&
      novoMentor === undefined
    ) {
      throw httpError(400, "EMPTY_UPDATE", "Nada para atualizar");
    }

    const r = await equipeModel.atualizarGestao({
      slug: req.params.slug ?? "",
      campos,
      status: novoStatus,
      mentor: novoMentor,
      por: idDoChamador(req),
      ip: ipDoChamador(req),
    });
    if (r.tipo === "nao_encontrada") {
      throw httpError(404, "EQUIPE_NOT_FOUND", "Equipe não encontrada");
    }
    if (r.tipo === "transicao_invalida") {
      throw httpError(
        409,
        "TRANSICAO_INVALIDA",
        "Só dá para encaminhar ao InovAMF uma equipe que está Pronta p/ InovAMF",
      );
    }
    res.json({
      slug: r.equipe.slug,
      nomeIdeia: r.equipe.nome_ideia,
      status: r.equipe.status,
      estagio: r.equipe.estagio_ideia,
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

const MENSAGEM_BLOQUEIO: Record<ReturnType<typeof codigoBloqueio>, string> = {
  RN01_SALTO: "Pular etapas exige forçar com observação",
  RN01_PENDENCIAS: "Há pendências obrigatórias nesta etapa",
  RN02_PENDENCIAS: "Faltam entregáveis finais ou dados de integrantes para ficar Pronta p/ InovAMF",
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
      ip: ipDoChamador(req),
    });

    if (r.tipo === "rejeitada") {
      if (r.decisao.tipo === "invalida") {
        throw httpError(400, r.decisao.codigo, MENSAGEM_INVALIDA[r.decisao.codigo] ?? "");
      }
      const codigo = codigoBloqueio(r.origem, r.decisao.motivo);
      throw httpError(409, codigo, MENSAGEM_BLOQUEIO[codigo], {
        pendencias: r.decisao.pendencias,
      });
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
    if (await usuarioModel.findAnyByEmail(emailLider)) {
      throw httpError(409, "EMAIL_TAKEN", "Você já tem conta: entre com seu e-mail e senha");
    }
    const aceite = await exigirAceite(req);
    const existentes = new Map(
      (await usuarioModel.findParaVinculo(listaColegas.map((c) => c.email))).map((u) => [u.email, u]),
    );

    // Preparar dados (hashes prontos; model só grava)
    const liderIds = novoIdComSlug();
    const equipeIds = novoIdComSlug();
    const expiraConvite = new Date(Date.now() + env.inviteTtlHoras * 3_600_000);

    const colegasPrep = await Promise.all(
      listaColegas.map((c) => prepararColega(c, existentes.get(c.email) ?? null, expiraConvite)),
    );

    const cicloAtual = await cicloModel.findAtual();

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
        ciclo_id: cicloAtual?.id ?? null,
        origem_divulgacao:
          typeof ideia.origem === "string" ? ideia.origem.trim() : null,
      },
      colegas: colegasPrep.map((c) => ({ usuarioId: c.usuarioId, criar: c.criar, convite: c.convite })),
      aceite,
    });

    // E-mails (best-effort; não derruba a inscrição já gravada).
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
    for (const c of colegasPrep.filter((x) => x.conviteToken)) {
      try {
        await emailModel.enfileirar({
          tipo: "convite_conta",
          destinatarioId: c.usuarioId,
          destinatarioEmail: c.email,
          assunto: "Você foi adicionado a uma equipe no InfoHub",
          template: "convite_conta",
          dadosTemplate: { nome: c.nome, link: linkConvite(c.conviteToken!) },
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
        nome: c.nome,
        email: c.email,
        conviteUrl: c.conviteToken ? linkConvite(c.conviteToken) : null,
        ...(env.nodeEnv !== "production" && c.conviteToken ? { token_dev: c.conviteToken } : {}),
      })),
    });
  } catch (err) {
    next(err);
  }
}

// POST /equipes/:slug/membros/:membro/convite — gera um link NOVO para um
// integrante que ainda não aceitou (o anterior é invalidado). Líder da equipe,
// mentor da equipe ou admin. Sem e-mail configurado, quem pede copia o link.
export async function gerarConviteMembro(req: Request, res: Response, next: NextFunction) {
  try {
    const controle = await equipeModel.findControleBySlug(req.params.slug ?? "");
    if (!controle) throw httpError(404, "EQUIPE_NOT_FOUND", "Equipe não encontrada");

    const eu = idDoChamador(req);
    const ehLider = controle.equipe_membros.some((m) => m.usuario_id === eu && m.papel === "lider");
    if (!podeGerirEquipe(req, controle.mentor_id) && !(req.auth.role === "aluno" && ehLider)) {
      throw httpError(403, "FORBIDDEN", "Só o líder, o mentor ou o admin geram convites");
    }

    const membroId = fromSlug(req.params.membro ?? "");
    if (!membroId || !controle.equipe_membros.some((m) => m.usuario_id === membroId)) {
      throw httpError(404, "MEMBRO_NOT_FOUND", "Integrante não encontrado nesta equipe");
    }
    const dados = await usuarioModel.findDadosConvite(membroId);
    if (!dados) throw httpError(404, "MEMBRO_NOT_FOUND", "Integrante não encontrado");
    if (dados.convite_aceito_em) {
      throw httpError(409, "ALREADY_ACCEPTED", "Esta pessoa já ativou a conta");
    }

    await tokenModel.invalidarConvitesAtivos(membroId);
    const convite = await tokenModel.criarConvite({ usuarioId: membroId, ttlHoras: env.inviteTtlHoras });
    res.status(201).json({
      conviteUrl: linkConvite(convite.tokenBruto),
      expiraEm: convite.expiraEm.toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

// POST /equipes/:slug/membros — líder, mentor da equipe ou admin adicionam um
// integrante por nome + e-mail. RN-03 igual à inscrição; devolve o link.
export async function adicionarMembro(req: Request, res: Response, next: NextFunction) {
  try {
    const controle = await equipeModel.findControleBySlug(req.params.slug ?? "");
    if (!controle) throw httpError(404, "EQUIPE_NOT_FOUND", "Equipe não encontrada");
    const eu = idDoChamador(req);
    const ehLider = controle.equipe_membros.some((m) => m.usuario_id === eu && m.papel === "lider");
    if (!podeGerirEquipe(req, controle.mentor_id) && !(req.auth.role === "aluno" && ehLider)) {
      throw httpError(403, "FORBIDDEN", "Só o líder, o mentor ou o admin adicionam integrantes");
    }

    const { nome, email } = req.body ?? {};
    if (typeof nome !== "string" || nome.trim().length < 3) {
      throw httpError(400, "INVALID_NOME", "Nome deve ter ao menos 3 caracteres");
    }
    if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
      throw httpError(400, "INVALID_EMAIL", "E-mail inválido");
    }
    const emailNorm = email.toLowerCase().trim();
    const [existente] = await usuarioModel.findParaVinculo([emailNorm]);
    const expira = new Date(Date.now() + env.inviteTtlHoras * 3_600_000);
    const c = await prepararColega({ nome: nome.trim(), email: emailNorm, telefone: "" }, existente ?? null, expira);

    await equipeModel.adicionarMembro(controle.id, { usuarioId: c.usuarioId, criar: c.criar, convite: c.convite });
    if (c.conviteToken) {
      await emailModel
        .enfileirar({
          tipo: "convite_conta",
          destinatarioId: c.usuarioId,
          destinatarioEmail: c.email,
          assunto: "Você foi adicionado a uma equipe no InfoHub",
          template: "convite_conta",
          dadosTemplate: { nome: c.nome, link: linkConvite(c.conviteToken) },
          equipeId: controle.id,
        })
        .catch((e) => console.error("[adicionarMembro] falha ao enfileirar convite", e));
    }
    res.status(201).json({
      slug: c.slug,
      nome: c.nome,
      email: c.email,
      conviteUrl: c.conviteToken ? linkConvite(c.conviteToken) : null,
      pendente: c.conviteToken !== null,
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /equipes/:slug/membros/:membro — líder, mentor da equipe ou admin
// retiram um integrante ATIVO. O líder não pode ser retirado (nem por si
// mesmo). Desativa o vínculo (não apaga: entregas/histórico continuam).
export async function removerMembro(req: Request, res: Response, next: NextFunction) {
  try {
    const controle = await equipeModel.findControleBySlug(req.params.slug ?? "");
    if (!controle) throw httpError(404, "EQUIPE_NOT_FOUND", "Equipe não encontrada");

    const eu = idDoChamador(req);
    const ehLider = controle.equipe_membros.some((m) => m.usuario_id === eu && m.papel === "lider");
    if (!podeGerirEquipe(req, controle.mentor_id) && !(req.auth.role === "aluno" && ehLider)) {
      throw httpError(403, "FORBIDDEN", "Só o líder, o mentor ou o admin retiram integrantes");
    }

    const membroId = fromSlug(req.params.membro ?? "");
    if (!membroId || !controle.equipe_membros.some((m) => m.usuario_id === membroId)) {
      throw httpError(404, "MEMBRO_NOT_FOUND", "Integrante não encontrado nesta equipe");
    }

    const resultado = await equipeModel.removerMembro({
      equipeId: controle.id,
      membroId,
      membroSlug: req.params.membro ?? "",
      removidoPor: eu,
      ip: ipDoChamador(req),
    });
    if (resultado.tipo === "nao_encontrado") {
      throw httpError(404, "MEMBRO_NOT_FOUND", "Integrante não encontrado nesta equipe");
    }
    if (resultado.tipo === "lider") {
      throw httpError(409, "LIDER_NAO_REMOVIVEL", "O líder não pode ser retirado da equipe.");
    }

    res.json({ slug: req.params.membro, removidoEm: resultado.saiuEm.toISOString() });
  } catch (err) {
    next(err);
  }
}

// GET /equipes/:slug/linha-do-tempo — A5 (RF-08, RNF-05 visível). Admin vê
// tudo; mentor só as próprias equipes; aluno a própria, sem a observação de
// movimento forçado. Nunca devolve UUID.
export async function linhaDoTempo(req: Request, res: Response, next: NextFunction) {
  try {
    const controle = await equipeModel.findControleBySlug(req.params.slug ?? "");
    if (!controle) throw httpError(404, "EQUIPE_NOT_FOUND", "Equipe não encontrada");
    const membros = controle.equipe_membros.map((m) => m.usuario_id);
    if (!podeVerEquipe(req, controle.mentor_id, membros)) {
      throw httpError(403, "FORBIDDEN", "Equipe fora do seu escopo");
    }
    const data = await equipeModel.linhaDoTempo(controle.id, {
      paraAluno: req.auth.role === "aluno",
      limite: LIMITE_LINHA_DO_TEMPO,
    });
    res.json({ data });
  } catch (err) {
    next(err);
  }
}
