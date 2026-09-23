import type { NextFunction, Request, Response } from "express";
import { httpError } from "../utils/error.js";
import { novoIdComSlug } from "../utils/slug.js";
import { hashSenha, tokenAleatorio } from "../utils/hash.js";
import { EMAIL_RE } from "../utils/text.js";
import { paginacao } from "../utils/http.js";
import { env } from "../env.js";
import { linkConvite, linkRedefinicao } from "../utils/convite.js";
import { idDoChamador, ipDoChamador } from "../utils/acesso.js";
import * as usuarioModel from "../models/usuario.model.js";
import * as tokenModel from "../models/token.model.js";
import * as emailModel from "../models/email.model.js";

// Convite de conta cria só admin/mentor (RF-03). Aluno entra pelo formulário de ideia.
const TIPOS_CONVIDAVEIS = ["admin", "mentor"];
// Task 17: o filtro de listagem (?tipo=) aceita também "aluno" — a Contas
// admin passou a listar todo mundo, não só quem é convidável.
const TIPOS_LISTAVEIS = ["admin", "mentor", "aluno"];

// POST /usuarios — admin cria conta (sem senha) e dispara convite por e-mail.
export async function store(req: Request, res: Response, next: NextFunction) {
  try {
    const { nome, email, telefone, tipo } = req.body ?? {};
    if (typeof nome !== "string" || nome.trim().length < 3) {
      throw httpError(400, "INVALID_NOME", "Nome deve ter ao menos 3 caracteres");
    }
    if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
      throw httpError(400, "INVALID_EMAIL", "E-mail inválido");
    }
    if (typeof tipo !== "string" || !TIPOS_CONVIDAVEIS.includes(tipo)) {
      throw httpError(400, "INVALID_TIPO", "tipo deve ser 'admin' ou 'mentor'");
    }
    // telefone é preenchido pela pessoa ao aceitar o convite; opcional aqui.
    const tel = typeof telefone === "string" ? telefone.trim() : "";
    const emailNorm = email.toLowerCase().trim();

    if (await usuarioModel.findAnyByEmail(emailNorm)) {
      throw httpError(409, "EMAIL_TAKEN", "Já existe uma conta com este e-mail");
    }

    const { id, slug } = novoIdComSlug();
    // Senha inutilizável até o aceite: hash de valor aleatório.
    const senhaHash = await hashSenha(tokenAleatorio(32));
    await usuarioModel.criarPendente({
      id,
      slug,
      nome: nome.trim(),
      email: emailNorm,
      telefone: tel,
      tipo_usuario: tipo,
      senhaHash,
    });

    const convite = await tokenModel.criarConvite({
      usuarioId: id,
      ttlHoras: env.inviteTtlHoras,
    });
    const link = linkConvite(convite.tokenBruto);

    await emailModel.enfileirar({
      tipo: "convite_conta",
      destinatarioId: id,
      destinatarioEmail: emailNorm,
      assunto: "Seu convite para o InfoHub",
      template: "convite_conta",
      dadosTemplate: {
        nome: nome.trim(),
        link,
        expira_em: convite.expiraEm.toISOString(),
      },
    });

    res.status(201).json({
      slug,
      nome: nome.trim(),
      email: emailNorm,
      telefone: tel,
      role: tipo,
      conviteUrl: link,
      convite: {
        expira_em: convite.expiraEm.toISOString(),
        email_enfileirado: true,
      },
      // Conveniência de DEV: o token só sai por e-mail em produção.
      ...(env.nodeEnv !== "production" ? { token_dev: convite.tokenBruto } : {}),
    });
  } catch (err) {
    next(err);
  }
}

// GET /usuarios — lista paginada com filtros whitelisted.
export async function index(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, perPage, skip } = paginacao(req);
    const tipo =
      typeof req.query.tipo === "string" && TIPOS_LISTAVEIS.includes(req.query.tipo)
        ? req.query.tipo
        : undefined;
    const ativo =
      req.query.ativo === "true"
        ? true
        : req.query.ativo === "false"
          ? false
          : undefined;
    const q = typeof req.query.q === "string" ? req.query.q.trim() || undefined : undefined;

    const filtros = { tipo, ativo, q };
    const [linhas, total] = await Promise.all([
      usuarioModel.listar({ skip, take: perPage, ...filtros }),
      usuarioModel.contar(filtros),
    ]);

    res.json({
      data: linhas.map((u) => ({
        slug: u.slug,
        nome: u.nome,
        email: u.email,
        telefone: u.telefone,
        role: u.tipo_usuario,
        ativo: u.ativo,
        conviteAceito: u.convite_aceito_em !== null,
        ultimoLoginEm: u.ultimo_login_em,
        criadoEm: u.criado_em,
        curso: u.alunos?.curso ?? null,
        semestre: u.alunos?.semestre ?? null,
        equipe: u.equipe_membros[0]
          ? { slug: u.equipe_membros[0].equipes.slug, nomeIdeia: u.equipe_membros[0].equipes.nome_ideia }
          : null,
      })),
      page,
      perPage,
      total,
    });
  } catch (err) {
    next(err);
  }
}

// GET /usuarios/:slug
export async function show(req: Request, res: Response, next: NextFunction) {
  try {
    const slug = req.params.slug ?? "";
    const u = await usuarioModel.findAdminBySlug(slug);
    if (!u) {
      throw httpError(404, "USUARIO_NOT_FOUND", "Usuário não encontrado");
    }
    res.json({
      slug: u.slug,
      nome: u.nome,
      email: u.email,
      telefone: u.telefone,
      role: u.tipo_usuario,
      ativo: u.ativo,
      conviteAceito: u.convite_aceito_em !== null,
      ultimoLoginEm: u.ultimo_login_em,
      criadoEm: u.criado_em,
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /usuarios/:slug — editar / desativar (RF-03).
export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const { nome, telefone, tipo, ativo } = req.body ?? {};
    const data: {
      nome?: string;
      telefone?: string;
      tipo_usuario?: string;
      ativo?: boolean;
    } = {};

    if (nome !== undefined) {
      if (typeof nome !== "string" || nome.trim().length < 3) {
        throw httpError(400, "INVALID_NOME", "Nome deve ter ao menos 3 caracteres");
      }
      data.nome = nome.trim();
    }
    if (telefone !== undefined) {
      if (typeof telefone !== "string") {
        throw httpError(400, "INVALID_TELEFONE", "Telefone inválido");
      }
      data.telefone = telefone.trim();
    }
    if (tipo !== undefined) {
      if (typeof tipo !== "string" || !TIPOS_CONVIDAVEIS.includes(tipo)) {
        throw httpError(400, "INVALID_TIPO", "tipo deve ser 'admin' ou 'mentor'");
      }
      data.tipo_usuario = tipo;
    }
    if (ativo !== undefined) {
      if (typeof ativo !== "boolean") {
        throw httpError(400, "INVALID_ATIVO", "ativo deve ser booleano");
      }
      data.ativo = ativo;
    }
    if (Object.keys(data).length === 0) {
      throw httpError(400, "EMPTY_UPDATE", "Nada para atualizar");
    }

    const slug = req.params.slug ?? "";
    const alvo = await usuarioModel.findIdBySlug(slug);
    if (!alvo) {
      throw httpError(404, "USUARIO_NOT_FOUND", "Usuário não encontrado");
    }
    // Aluno não vira admin/mentor pelo PATCH: o tipo de uma conta de aluno é fixo.
    if (data.tipo_usuario !== undefined && alvo.tipo_usuario === "aluno") {
      throw httpError(400, "TIPO_ALUNO_IMUTAVEL", "Não é possível mudar o perfil de uma conta de aluno");
    }
    // Ninguém tira o próprio acesso: desativar a si mesmo ou sair de admin
    // trancaria a pessoa fora (e, sendo o único admin, o sistema inteiro).
    if (alvo.id === idDoChamador(req) && (data.ativo === false || (data.tipo_usuario && data.tipo_usuario !== "admin"))) {
      throw httpError(409, "PROPRIA_CONTA", "Você não pode desativar nem rebaixar a própria conta");
    }

    const atualizado = await usuarioModel.atualizarPorSlug(slug, data);

    // Desativar derruba as sessões vivas da pessoa.
    if (data.ativo === false) {
      await tokenModel.revogarTodosVivosDoUsuario(alvo.id, "admin");
    }

    res.json({
      slug: atualizado.slug,
      nome: atualizado.nome,
      email: atualizado.email,
      telefone: atualizado.telefone,
      role: atualizado.tipo_usuario,
      ativo: atualizado.ativo,
      conviteAceito: atualizado.convite_aceito_em !== null,
    });
  } catch (err) {
    next(err);
  }
}

// POST /usuarios/:slug/redefinir-senha — admin gera o link de uso único (24 h)
// para a pessoa definir outra senha (RF-01). Sem e-mail configurado, o admin
// copia o link. Só para conta ativa que já aceitou o convite.
export async function gerarRedefinicaoSenha(req: Request, res: Response, next: NextFunction) {
  try {
    const alvo = await usuarioModel.findParaConviteBySlug(req.params.slug ?? "");
    if (!alvo) throw httpError(404, "USUARIO_NOT_FOUND", "Usuário não encontrado");
    if (!alvo.ativo) {
      throw httpError(409, "CONTA_INATIVA", "Conta inativa: ative a conta antes de redefinir a senha");
    }
    if (!alvo.convite_aceito_em) {
      throw httpError(
        409,
        "CONVITE_PENDENTE",
        "A pessoa ainda não aceitou o convite: gere um novo link de convite",
      );
    }
    const r = await tokenModel.emitirRecuperacao({
      usuarioId: alvo.id,
      adminId: idDoChamador(req),
      ip: ipDoChamador(req),
    });
    res.status(201).json({ link: linkRedefinicao(r.tokenBruto), expiraEm: r.expiraEm.toISOString() });
  } catch (err) {
    next(err);
  }
}
