import { env } from "../env.js";

// Link que a pessoa abre para definir a senha (página /convite do front).
// Sem provedor de e-mail, este link é mostrado para quem convidou copiar.
// Relativo por padrão (ver env.inviteUrlBase); absoluto só se configurado.
export function linkConvite(tokenBruto: string, base: string = env.inviteUrlBase): string {
  return `${base}?token=${encodeURIComponent(tokenBruto)}`;
}
