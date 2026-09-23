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
