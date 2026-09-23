import { describe, expect, it } from "vitest";
import {
  POSICAO_PRONTA,
  avaliarTransicao,
  mudancaDeStatusValida,
  pendenciasDeIntegrantes,
  type Pendencia,
} from "../src/domain/transicao.js";

const tarefa: Pendencia = { tipo: "tarefa", slug: "s", titulo: "BMC" };
const base = { pendencias: [] as Pendencia[], forcado: false, observacao: null };

describe("avaliarTransicao (RN-01/RN-02)", () => {
  it("avança uma posição sem pendências", () => {
    expect(avaliarTransicao({ ...base, origem: 2, destino: 3 })).toEqual({
      tipo: "permitida", forcado: false, direcao: "avanco",
    });
  });
  it("bloqueia avanço com pendência", () => {
    expect(avaliarTransicao({ ...base, origem: 2, destino: 3, pendencias: [tarefa] })).toEqual({
      tipo: "bloqueada", motivo: "pendencias", pendencias: [tarefa],
    });
  });
  it("forçar com observação libera e marca forcado", () => {
    expect(
      avaliarTransicao({ origem: 2, destino: 3, pendencias: [tarefa], forcado: true, observacao: "decisão do mentor" }),
    ).toEqual({ tipo: "permitida", forcado: true, direcao: "avanco" });
  });
  it("forçar sem observação é inválido", () => {
    expect(
      avaliarTransicao({ origem: 2, destino: 3, pendencias: [tarefa], forcado: true, observacao: "  " }),
    ).toEqual({ tipo: "invalida", codigo: "OBSERVACAO_OBRIGATORIA" });
  });
  it("salto de etapa exige forçar", () => {
    expect(avaliarTransicao({ ...base, origem: 2, destino: 4 })).toEqual({
      tipo: "bloqueada", motivo: "salto", pendencias: [],
    });
    expect(
      avaliarTransicao({ origem: 2, destino: 4, pendencias: [], forcado: true, observacao: "ok" }),
    ).toEqual({ tipo: "permitida", forcado: true, direcao: "avanco" });
  });
  it("forcado sem nada a forçar é registrado como não forçado", () => {
    expect(
      avaliarTransicao({ origem: 2, destino: 3, pendencias: [], forcado: true, observacao: "x" }),
    ).toEqual({ tipo: "permitida", forcado: false, direcao: "avanco" });
  });
  it("retroceder é sempre permitido e nunca forçado", () => {
    expect(avaliarTransicao({ ...base, origem: 3, destino: 2, pendencias: [tarefa] })).toEqual({
      tipo: "permitida", forcado: false, direcao: "retrocesso",
    });
    expect(avaliarTransicao({ ...base, origem: POSICAO_PRONTA, destino: 6 })).toEqual({
      tipo: "permitida", forcado: false, direcao: "retrocesso",
    });
  });
  it("6 → pronta é um avanço normal; 5 → pronta é salto", () => {
    expect(avaliarTransicao({ ...base, origem: 6, destino: POSICAO_PRONTA }).tipo).toBe("permitida");
    expect(avaliarTransicao({ ...base, origem: 5, destino: POSICAO_PRONTA }).tipo).toBe("bloqueada");
  });
  it("mesma posição e posição fora de 1..7 são inválidas", () => {
    expect(avaliarTransicao({ ...base, origem: 3, destino: 3 })).toEqual({ tipo: "invalida", codigo: "MESMA_POSICAO" });
    expect(avaliarTransicao({ ...base, origem: 3, destino: 8 })).toEqual({ tipo: "invalida", codigo: "POSICAO_INVALIDA" });
  });
});

describe("pendenciasDeIntegrantes (RN-02: dados de todos os integrantes)", () => {
  it("aponta convite pendente e dados incompletos", () => {
    const r = pendenciasDeIntegrantes([
      { slug: "a", nome: "Ana", conviteAceitoEm: new Date(), curso: "ADS", semestre: "3º" },
      { slug: "b", nome: "Bia", conviteAceitoEm: null, curso: null, semestre: null },
      { slug: "c", nome: "Caio", conviteAceitoEm: new Date(), curso: "ADS", semestre: null },
    ]);
    expect(r).toEqual([
      { tipo: "integrante", slug: "b", nome: "Bia", motivo: "convite_pendente" },
      { tipo: "integrante", slug: "c", nome: "Caio", motivo: "dados_incompletos" },
    ]);
  });
});

describe("mudancaDeStatusValida (A1)", () => {
  it("encaminhar ao InovAMF só a partir de pronta", () => {
    expect(mudancaDeStatusValida("pronta_inovamf", "encaminhada_inovamf")).toBe(true);
    expect(mudancaDeStatusValida("encaminhada_inovamf", "encaminhada_inovamf")).toBe(true);
    expect(mudancaDeStatusValida("ativa", "encaminhada_inovamf")).toBe(false);
    expect(mudancaDeStatusValida("pausada", "encaminhada_inovamf")).toBe(false);
  });
  it("ativa, pausada e desistente são livres", () => {
    expect(mudancaDeStatusValida("ativa", "pausada")).toBe(true);
    expect(mudancaDeStatusValida("pausada", "ativa")).toBe(true);
    expect(mudancaDeStatusValida("pronta_inovamf", "desistente")).toBe(true);
  });
});
