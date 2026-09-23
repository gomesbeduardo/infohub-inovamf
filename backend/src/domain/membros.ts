// RN-03: um aluno integra apenas UMA equipe ativa por vez. Uma pessoa = uma
// linha em `usuarios` (e-mail UNIQUE): quem já participou de outra equipe
// (encerrada) é REUTILIZADO, não duplicado (Q4/Q9 do professor).
export const STATUS_EQUIPE_ATIVA = ["ativa", "pronta_inovamf"] as const;

export interface ColegaExistente {
  id: string;
  slug: string;
  tipo_usuario: string;
  convite_aceito_em: Date | null;
  emEquipeAtiva: boolean;
}

export type Vinculo =
  | { acao: "criar" }
  | { acao: "vincular"; comConvite: boolean }
  | { acao: "recusar"; codigo: "EMAIL_NAO_ALUNO" | "RN03_EQUIPE_ATIVA" };

export function classificarColega(e: ColegaExistente | null): Vinculo {
  if (!e) return { acao: "criar" };
  if (e.tipo_usuario !== "aluno") return { acao: "recusar", codigo: "EMAIL_NAO_ALUNO" };
  if (e.emEquipeAtiva) return { acao: "recusar", codigo: "RN03_EQUIPE_ATIVA" };
  return { acao: "vincular", comConvite: e.convite_aceito_em === null };
}
