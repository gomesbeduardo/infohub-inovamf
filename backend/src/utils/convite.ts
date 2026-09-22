import { env } from "../env.js";

// Link que a pessoa abre para definir a senha (página /convite do front).
// Sem provedor de e-mail, este link é mostrado para quem convidou copiar.
export function linkConvite(tokenBruto: string): string {
  return `${env.inviteUrlBase}?token=${encodeURIComponent(tokenBruto)}`;
}
