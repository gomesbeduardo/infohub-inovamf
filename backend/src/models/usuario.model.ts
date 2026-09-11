import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

// Só queries. Regra de negócio fica no controller.

interface FiltrosUsuario {
  tipo?: string;
  ativo?: boolean;
  q?: string;
}

function montarWhere(f: FiltrosUsuario): Prisma.usuariosWhereInput {
  const where: Prisma.usuariosWhereInput = { excluido_em: null };
  if (f.tipo) where.tipo_usuario = f.tipo;
  if (f.ativo !== undefined) where.ativo = f.ativo;
  if (f.q) {
    where.OR = [
      { nome: { contains: f.q, mode: "insensitive" } },
      { email: { contains: f.q, mode: "insensitive" } },
    ];
  }
  return where;
}

const PERFIL_ADMIN_SELECT = {
  slug: true,
  nome: true,
  email: true,
  telefone: true,
  tipo_usuario: true,
  ativo: true,
  convite_aceito_em: true,
  ultimo_login_em: true,
  criado_em: true,
} satisfies Prisma.usuariosSelect;

export function listar(params: { skip: number; take: number } & FiltrosUsuario) {
  return prisma.usuarios.findMany({
    where: montarWhere(params),
    skip: params.skip,
    take: params.take,
    orderBy: { criado_em: "desc" },
    select: PERFIL_ADMIN_SELECT,
  });
}

export function contar(filtros: FiltrosUsuario) {
  return prisma.usuarios.count({ where: montarWhere(filtros) });
}

export function findAdminBySlug(slug: string) {
  return prisma.usuarios.findFirst({
    where: { slug, excluido_em: null },
    select: PERFIL_ADMIN_SELECT,
  });
}

export function atualizarPorSlug(
  slug: string,
  data: Prisma.usuariosUpdateInput,
) {
  return prisma.usuarios.update({
    where: { slug },
    data,
    select: PERFIL_ADMIN_SELECT,
  });
}

export function findAtivoByEmail(email: string) {
  return prisma.usuarios.findFirst({
    where: { email, ativo: true, excluido_em: null },
    select: {
      id: true,
      slug: true,
      nome: true,
      tipo_usuario: true,
      senha: true,
    },
  });
}

export function findPerfilBySlug(slug: string) {
  return prisma.usuarios.findFirst({
    where: { slug, ativo: true, excluido_em: null },
    select: {
      slug: true,
      nome: true,
      email: true,
      telefone: true,
      tipo_usuario: true,
      criado_em: true,
      ultimo_login_em: true,
      convite_aceito_em: true,
      email_verificado_em: true,
    },
  });
}

// Convite: dados p/ reenvio e checagem de aceite.
export function findParaConviteBySlug(slug: string) {
  return prisma.usuarios.findFirst({
    where: { slug, excluido_em: null },
    select: { id: true, nome: true, email: true, convite_aceito_em: true },
  });
}

// Pendentes = conta ainda não aceita E com convite ativo (exclui líder de
// auto-cadastro, que já tem senha e nenhum convite pendente).
const WHERE_PENDENTE = {
  convite_aceito_em: null,
  excluido_em: null,
  tokens_senha: {
    some: { finalidade: "convite", usado_em: null },
  },
} as const;

export function listarConvitesPendentes(params: { skip: number; take: number }) {
  return prisma.usuarios.findMany({
    where: WHERE_PENDENTE,
    skip: params.skip,
    take: params.take,
    orderBy: { criado_em: "desc" },
    select: {
      slug: true,
      nome: true,
      email: true,
      tipo_usuario: true,
      criado_em: true,
    },
  });
}

export function contarConvitesPendentes() {
  return prisma.usuarios.count({ where: WHERE_PENDENTE });
}

// Admins ativos — destinatários da notificação de novo cadastro (RF-05).
export function listarEmailsAdminsAtivos() {
  return prisma.usuarios.findMany({
    where: { tipo_usuario: "admin", ativo: true, excluido_em: null },
    select: { id: true, email: true },
  });
}

// Checa colisão de e-mail (a UNIQUE vale independente de ativo/excluído).
export function findAnyByEmail(email: string) {
  return prisma.usuarios.findUnique({
    where: { email },
    select: { id: true },
  });
}

// Quais destes e-mails já existem (uma query só, para a inscrição em lote).
export async function findEmailsExistentes(emails: string[]): Promise<string[]> {
  if (emails.length === 0) return [];
  const rows = await prisma.usuarios.findMany({
    where: { email: { in: emails } },
    select: { email: true },
  });
  return rows.map((r) => r.email);
}

// Cria a conta pendente (sem senha usável): a pessoa define a senha ao aceitar
// o convite. senhaHash aqui é um hash de valor aleatório, impossível de logar.
export function criarPendente(data: {
  id: string;
  slug: string;
  nome: string;
  email: string;
  telefone: string;
  tipo_usuario: string;
  senhaHash: string;
}) {
  return prisma.usuarios.create({
    data: {
      id: data.id,
      slug: data.slug,
      nome: data.nome,
      email: data.email,
      telefone: data.telefone,
      tipo_usuario: data.tipo_usuario,
      senha: data.senhaHash,
    },
    select: { id: true, slug: true },
  });
}

// Dados pré-preenchidos que a tela de convite mostra ("ele vê os dados").
export function findDadosConvite(id: string) {
  return prisma.usuarios.findUnique({
    where: { id },
    select: {
      nome: true,
      email: true,
      telefone: true,
      tipo_usuario: true,
      convite_aceito_em: true,
    },
  });
}

export function findIdBySlug(slug: string) {
  return prisma.usuarios.findFirst({
    where: { slug, excluido_em: null },
    select: { id: true },
  });
}

export function findParaSessaoById(id: string) {
  return prisma.usuarios.findFirst({
    where: { id, ativo: true, excluido_em: null },
    select: { id: true, slug: true, nome: true, tipo_usuario: true },
  });
}

export function touchUltimoLogin(id: string) {
  return prisma.usuarios.update({
    where: { id },
    data: { ultimo_login_em: new Date() },
  });
}
