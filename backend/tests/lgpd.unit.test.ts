import { describe, expect, it } from "vitest";
import { VERSAO_POLITICA, consentimentoValido } from "../src/domain/lgpd.js";

describe("consentimentoValido (RNF-02)", () => {
  it("só o booleano true conta como aceite", () => {
    expect(consentimentoValido(true)).toBe(true);
  });
  it.each([undefined, null, false, "true", 1, {}])("%j não é aceite", (v) => {
    expect(consentimentoValido(v)).toBe(false);
  });
  it("versão da política é 2026-09", () => {
    expect(VERSAO_POLITICA).toBe("2026-09");
  });
});
