import { describe, expect, it } from "vitest";
import { montarLinhaDoTempo, type EventoAuditoria, type MovimentoEtapa } from "../src/domain/linhaDoTempo.js";

const d = (iso: string) => new Date(iso);
const forcado: MovimentoEtapa = {
  de: 2, para: 4, forcado: true, observacao: "combinado com a banca", autor: "Ana Mentora", em: d("2026-09-10T10:00:00Z"),
};
const pronta: MovimentoEtapa = {
  de: 6, para: "pronta", forcado: false, observacao: "tudo certo", autor: null, em: d("2026-09-12T10:00:00Z"),
};
const eventos: EventoAuditoria[] = [
  { acao: "entrega_avaliada", antes: null, depois: { tarefa: "BMC", resultado: "ajustar", comentario: "refazer" }, autor: "Ana Mentora", em: d("2026-09-11T10:00:00Z") },
  { acao: "status_alterado", antes: { status: "ativa" }, depois: { status: "pausada" }, autor: "Coord", em: d("2026-09-09T10:00:00Z") },
  { acao: "etapa_movida", antes: null, depois: null, autor: "Ana Mentora", em: d("2026-09-10T10:00:00Z") },
  { acao: "entrega_enviada", antes: null, depois: { tarefa: "BMC", versao: 2 }, autor: "Lia", em: d("2026-09-08T10:00:00Z") },
  { acao: "mentor_atribuido", antes: { mentor: null }, depois: { mentor: "Ana Mentora" }, autor: "Coord", em: d("2026-09-07T10:00:00Z") },
  { acao: "lembrete_enviado", antes: null, depois: { mensagem: "Pitch na sexta", destinatarios: 3 }, autor: "Coord", em: d("2026-09-06T10:00:00Z") },
];

describe("montarLinhaDoTempo (A5)", () => {
  it("junta histórico e auditoria do mais novo para o mais antigo, sem duplicar o movimento", () => {
    const itens = montarLinhaDoTempo({ movimentos: [forcado, pronta], auditoria: eventos, paraAluno: false });
    expect(itens.map((i) => i.titulo)).toEqual([
      "Etapa 6 → Pronta p/ InovAMF",
      "Ajustes pedidos: BMC",
      "Etapa 2 → Etapa 4 (forçado)",
      "Status: Ativa → Pausada",
      "Entrega enviada: BMC (v2)",
      "Mentor: Ana Mentora",
      "Lembrete enviado à equipe",
    ]);
    expect(itens[1]).toMatchObject({ tipo: "avaliacao", detalhe: "refazer", autor: "Ana Mentora" });
    expect(itens[2]).toMatchObject({ tipo: "etapa", detalhe: "combinado com a banca" });
  });

  it("para o aluno, esconde só a observação de movimento forçado", () => {
    const itens = montarLinhaDoTempo({ movimentos: [forcado, pronta], auditoria: [], paraAluno: true });
    expect(itens[0]?.detalhe).toBe("tudo certo");
    expect(itens[1]?.detalhe).toBeUndefined();
  });

  it("respeita o limite", () => {
    expect(montarLinhaDoTempo({ movimentos: [forcado, pronta], auditoria: eventos, paraAluno: false, limite: 3 })).toHaveLength(3);
  });
});
