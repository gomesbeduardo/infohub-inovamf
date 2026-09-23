import type { Prisma } from "@prisma/client";

// RNF-05: log de auditoria. SEMPRE chamado com o `tx` da mesma transação da
// ação — se a ação desfaz, o log desfaz junto (nunca há log do que não
// aconteceu, nem ação sem log). Nada sensível (senha/token) em antes/depois;
// nomes em vez de UUID. entidade_id é o UUID da linha (coluna interna, nunca
// sai pela API).

export type EntidadeAuditoria = "equipe" | "tarefa" | "entrega" | "usuario";

export type AcaoAuditoria =
  | "etapa_movida"
  | "status_alterado"
  | "mentor_atribuido"
  | "entrega_enviada"
  | "entrega_avaliada"
  | "lembrete_enviado"
  | "redefinicao_senha_gerada";

export interface RegistroAuditoria {
  usuarioId: string | null;
  entidade: EntidadeAuditoria;
  entidadeId: string;
  acao: AcaoAuditoria;
  antes?: Prisma.InputJsonValue;
  depois?: Prisma.InputJsonValue;
  ip?: string | null;
}

export function registrarAuditoria(db: Prisma.TransactionClient, r: RegistroAuditoria) {
  return db.log_auditoria.create({
    data: {
      usuario_id: r.usuarioId,
      entidade: r.entidade,
      entidade_id: r.entidadeId,
      acao: r.acao,
      dados_anteriores: r.antes,
      dados_novos: r.depois,
      ip_origem: r.ip ?? null,
    },
    select: { id: true },
  });
}
