import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import type { TipoEmail } from "../domain/enums.js";

// Enfileira um e-mail (status='pendente'). O envio real (SMTP/provedor) é feito
// por um worker à parte — Q7 dos requisitos, fora de escopo agora (RNF-06).
export function enfileirar(data: {
  tipo: TipoEmail;
  destinatarioId?: string | null;
  destinatarioEmail: string;
  assunto: string;
  template?: string | null;
  dadosTemplate?: Prisma.InputJsonValue;
  equipeId?: string | null;
  tarefaId?: string | null;
}) {
  return prisma.emails.create({
    data: {
      tipo: data.tipo,
      destinatario_id: data.destinatarioId ?? null,
      destinatario_email: data.destinatarioEmail,
      assunto: data.assunto,
      template: data.template ?? null,
      dados_template: data.dadosTemplate,
      equipe_id: data.equipeId ?? null,
      tarefa_id: data.tarefaId ?? null,
    },
    select: { id: true, status: true },
  });
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
