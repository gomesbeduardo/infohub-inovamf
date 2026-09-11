// Uniões de string derivadas dos CHECK do schema (ver docs/backend/ENTITIES.md §2).
// O Prisma não modela CHECK, então estes tipos + as whitelists abaixo são a
// fonte de verdade no lado do backend. Todo INSERT/UPDATE valida contra elas.

export type TipoUsuario = "admin" | "mentor" | "aluno";
export const TIPOS_USUARIO: readonly TipoUsuario[] = ["admin", "mentor", "aluno"];

export type FinalidadeToken = "recuperacao" | "convite";

export type TipoTokenAcesso = "acesso" | "refresh";

export type MotivoRevogacao =
  | "logout"
  | "refresh"
  | "troca_senha"
  | "expirado"
  | "admin"
  | "suspeita";

export type EstagioIdeia =
  | "ideia"
  | "prototipo"
  | "mvp_desenvolvimento"
  | "mvp_pronto";
export const ESTAGIOS_IDEIA: readonly EstagioIdeia[] = [
  "ideia",
  "prototipo",
  "mvp_desenvolvimento",
  "mvp_pronto",
];

export type StatusEquipe =
  | "ativa"
  | "pronta_inovamf"
  | "encaminhada_inovamf"
  | "pausada"
  | "desistente";
export const STATUS_EQUIPE: readonly StatusEquipe[] = [
  "ativa",
  "pronta_inovamf",
  "encaminhada_inovamf",
  "pausada",
  "desistente",
];

export type PapelMembro = "lider" | "integrante";

export type StatusEncontro =
  | "agendado"
  | "confirmado"
  | "realizado"
  | "cancelado"
  | "remarcado";

export type StatusTarefa =
  | "pendente"
  | "em_andamento"
  | "entregue"
  | "atrasada"
  | "aprovada"
  | "ajustar";
export const STATUS_TAREFA: readonly StatusTarefa[] = [
  "pendente",
  "em_andamento",
  "entregue",
  "atrasada",
  "aprovada",
  "ajustar",
];

export type TipoArquivo = "arquivo" | "link";

export type ResultadoAvaliacao = "aprovada" | "ajustar";
export const RESULTADOS_AVALIACAO: readonly ResultadoAvaliacao[] = [
  "aprovada",
  "ajustar",
];

export type StatusEmail = "pendente" | "enviado" | "falha" | "cancelado";

export type TipoEmail =
  | "novo_cadastro_admin"
  | "convite_equipe"
  | "nova_tarefa"
  | "prazo_proximo"
  | "prazo_vencido"
  | "entrega_recebida_admin"
  | "entrega_aprovada"
  | "entrega_ajustar"
  | "tarefa_atrasada_admin"
  | "lembrete_manual"
  | "recuperacao_senha"
  | "boas_vindas"
  | "convite_conta"; // CR-001 (docs/sql/CHANGE_REQUEST.md) — aguarda DBA em prod

export const TIPOS_EMAIL: readonly TipoEmail[] = [
  "novo_cadastro_admin",
  "convite_equipe",
  "nova_tarefa",
  "prazo_proximo",
  "prazo_vencido",
  "entrega_recebida_admin",
  "entrega_aprovada",
  "entrega_ajustar",
  "tarefa_atrasada_admin",
  "lembrete_manual",
  "recuperacao_senha",
  "boas_vindas",
  "convite_conta",
];

export function ehTipoUsuario(v: unknown): v is TipoUsuario {
  return typeof v === "string" && (TIPOS_USUARIO as string[]).includes(v);
}

export function ehTipoEmail(v: unknown): v is TipoEmail {
  return typeof v === "string" && (TIPOS_EMAIL as string[]).includes(v);
}
