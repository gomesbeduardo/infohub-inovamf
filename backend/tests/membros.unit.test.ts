import { describe, expect, it } from "vitest";
import { classificarColega } from "../src/domain/membros.js";

const base = { id: "u", slug: "s", tipo_usuario: "aluno", convite_aceito_em: new Date(), emEquipeAtiva: false };

describe("classificarColega (RN-03)", () => {
  it("e-mail novo → criar", () => {
    expect(classificarColega(null)).toEqual({ acao: "criar" });
  });
  it("aluno ativado sem equipe ativa → vincular sem convite", () => {
    expect(classificarColega(base)).toEqual({ acao: "vincular", comConvite: false });
  });
  it("aluno que nunca aceitou convite → vincular com convite novo", () => {
    expect(classificarColega({ ...base, convite_aceito_em: null })).toEqual({ acao: "vincular", comConvite: true });
  });
  it("já em equipe ativa → recusar RN03_EQUIPE_ATIVA", () => {
    expect(classificarColega({ ...base, emEquipeAtiva: true })).toEqual({ acao: "recusar", codigo: "RN03_EQUIPE_ATIVA" });
  });
  it("conta de mentor/admin → recusar EMAIL_NAO_ALUNO", () => {
    expect(classificarColega({ ...base, tipo_usuario: "mentor" })).toEqual({ acao: "recusar", codigo: "EMAIL_NAO_ALUNO" });
  });
});
