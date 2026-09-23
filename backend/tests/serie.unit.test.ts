import { describe, expect, it } from "vitest";
import { ehAvanco, serieSemanal } from "../src/domain/serie.js";

describe("serieSemanal", () => {
  it("8 janelas de 7 dias terminando hoje, contando as quatro séries por data", () => {
    const s = serieSemanal(
      "2026-09-22",
      8,
      ["2026-09-22", "2026-09-16", "2026-09-15"],
      ["2026-09-17"],
      ["2026-09-18"],
      ["2026-08-01"],
    );
    expect(s).toHaveLength(8);
    expect(s[7]).toEqual({
      semanaInicio: "2026-09-16",
      rotulo: "16/09",
      avancos: 2,
      entregasRecebidas: 1,
      entregasAvaliadas: 1,
      tarefasConcluidas: 0,
      entregas: 0,
    });
    expect(s[6]).toMatchObject({ semanaInicio: "2026-09-09", avancos: 1 });
    expect(s[0]!.semanaInicio).toBe("2026-07-29");
    expect(s[0]!.tarefasConcluidas).toBe(1);
    // `entregas` é alias de `tarefasConcluidas`.
    expect(s[0]!.entregas).toBe(1);
  });
});

describe("ehAvanco", () => {
  it("destino maior que origem, ou entrada em pronta", () => {
    expect(ehAvanco({ origem: 1, destino: 2, statusOrigem: "ativa", statusDestino: "ativa" })).toBe(true);
    expect(ehAvanco({ origem: 3, destino: 2, statusOrigem: "ativa", statusDestino: "ativa" })).toBe(false);
    expect(ehAvanco({ origem: 6, destino: 6, statusOrigem: "ativa", statusDestino: "pronta_inovamf" })).toBe(true);
    expect(ehAvanco({ origem: null, destino: 1, statusOrigem: null, statusDestino: null })).toBe(true);
  });
});
