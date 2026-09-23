import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import type { TipoEmail } from "../domain/enums.js";
import { registrarAuditoria, type RegistroAuditoria } from "./auditoria.model.js";

export interface NovoEmail {
  tipo: TipoEmail;
  destinatarioId?: string | null;
  destinatarioEmail: string;
  assunto: string;
  template?: string | null;
  dadosTemplate?: Prisma.InputJsonValue;
  equipeId?: string | null;
  tarefaId?: string | null;
}

function linha(data: NovoEmail) {
  return {
    tipo: data.tipo,
    destinatario_id: data.destinatarioId ?? null,
    destinatario_email: data.destinatarioEmail,
    assunto: data.assunto,
    template: data.template ?? null,
    dados_template: data.dadosTemplate,
    equipe_id: data.equipeId ?? null,
    tarefa_id: data.tarefaId ?? null,
  };
}

// Enfileira um e-mail (status='pendente'). O envio real (SMTP/provedor) é feito
// por um worker à parte — Q7 dos requisitos, fora de escopo agora (RNF-06).
export function enfileirar(data: NovoEmail) {
  return prisma.emails.create({ data: linha(data), select: { id: true, status: true } });
}

// Lembrete manual (RF-20): fila + auditoria na MESMA transação — ou tudo, ou
// nada (RNF-05). Devolve quantos e-mails entraram na fila.
export async function enfileirarComAuditoria(
  itens: NovoEmail[],
  auditoria: RegistroAuditoria,
): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const r = await tx.emails.createMany({ data: itens.map(linha) });
    await registrarAuditoria(tx, auditoria);
    return r.count;
  });
}

// Pedido de redefinição feito na tela pública (adendo 23/09, RF-01). No máximo
// UM por conta por hora — a janela é contada pela auditoria. Trava a conta
// (FOR UPDATE) para dois pedidos simultâneos não passarem juntos. Cada admin
// ativo recebe o aviso no sino com status 'cancelado' (o worker de e-mail do
// Plano 4 nunca envia) e o pedido é auditado na MESMA transação (RNF-05).
export const JANELA_PEDIDO_REDEFINICAO_MS = 60 * 60 * 1000;

export function registrarPedidoRedefinicao(p: {
  usuario: { id: string; slug: string; nome: string; email: string };
  ip: string | null;
}): Promise<"registrado" | "repetido"> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM usuarios WHERE id = ${p.usuario.id}::uuid FOR UPDATE`;
    const recente = await tx.log_auditoria.findFirst({
      where: {
        entidade: "usuario",
        entidade_id: p.usuario.id,
        acao: "redefinicao_solicitada",
        criado_em: { gt: new Date(Date.now() - JANELA_PEDIDO_REDEFINICAO_MS) },
      },
      select: { id: true },
    });
    if (recente) return "repetido" as const;

    const admins = await tx.usuarios.findMany({
      where: { tipo_usuario: "admin", ativo: true, excluido_em: null },
      select: { id: true, email: true },
    });
    await tx.emails.createMany({
      data: admins.map((a) => ({
        ...linha({
          tipo: "recuperacao_senha",
          destinatarioId: a.id,
          destinatarioEmail: a.email,
          assunto: `Pedido de redefinição de senha: ${p.usuario.nome}`,
          template: "recuperacao_senha",
          dadosTemplate: { nome: p.usuario.nome, email: p.usuario.email, usuario_slug: p.usuario.slug },
        }),
        status: "cancelado",
      })),
    });
    await registrarAuditoria(tx, {
      usuarioId: null, // pedido anônimo: quem digitou o e-mail não está autenticado
      entidade: "usuario",
      entidadeId: p.usuario.id,
      acao: "redefinicao_solicitada",
      depois: { notificados: admins.length },
      ip: p.ip,
    });
    return "registrado" as const;
  });
}

// Enfileira vários de uma vez, best-effort: um destinatário ruim não derruba os
// demais. Retorna quantos entraram na fila (para o caller reportar/logar).
export async function enfileirarLote(
  itens: Array<Parameters<typeof enfileirar>[0]>,
): Promise<{ enfileirados: number; total: number }> {
  const r = await Promise.allSettled(itens.map(enfileirar));
  return {
    enfileirados: r.filter((x) => x.status === "fulfilled").length,
    total: itens.length,
  };
}

// Inbox do usuário: e-mails endereçados a ele (RF-18 — o aluno vê o que recebeu).
export function listarPorDestinatario(
  usuarioId: string,
  params: { skip: number; take: number },
) {
  return prisma.emails.findMany({
    where: { destinatario_id: usuarioId },
    skip: params.skip,
    take: params.take,
    orderBy: { criado_em: "desc" },
    select: {
      tipo: true,
      assunto: true,
      status: true,
      criado_em: true,
      dados_template: true,
    },
  });
}

export function contarPorDestinatario(usuarioId: string) {
  return prisma.emails.count({ where: { destinatario_id: usuarioId } });
}
