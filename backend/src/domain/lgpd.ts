// RNF-02 (LGPD). Versão da Política de Privacidade (página /privacidade) que
// vai para consentimentos_lgpd; mudar a política = subir a versão e pedir novo aceite.
export const VERSAO_POLITICA = "2026-09";

// Só o booleano `true` prova o aceite: "true", 1 ou ausente não contam.
export function consentimentoValido(v: unknown): v is true {
  return v === true;
}
