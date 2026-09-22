// RN-01: a equipe só avança quando as tarefas OBRIGATÓRIAS da etapa atual estão
// aprovadas — ou por decisão do mentor/admin (forçar, com observação gravada).
// RN-02: "Pronta para o InovAMF" (posição 7) exige, além das obrigatórias da
// etapa 6, os dados de todos os integrantes (convite aceito + curso/semestre).
// Regra PURA: quem busca as pendências e grava é equipe.model.transicionar,
// dentro de uma única transação.

export const POSICAO_PRONTA = 7;

export type Pendencia =
  | { tipo: "tarefa"; slug: string; titulo: string }
  | {
      tipo: "integrante";
      slug: string;
      nome: string;
      motivo: "convite_pendente" | "dados_incompletos";
    };

export type Decisao =
  | { tipo: "permitida"; forcado: boolean; direcao: "avanco" | "retrocesso" }
  | { tipo: "bloqueada"; motivo: "pendencias" | "salto"; pendencias: Pendencia[] }
  | { tipo: "invalida"; codigo: "MESMA_POSICAO" | "OBSERVACAO_OBRIGATORIA" | "POSICAO_INVALIDA" };

export function avaliarTransicao(i: {
  origem: number;
  destino: number;
  pendencias: Pendencia[];
  forcado: boolean;
  observacao: string | null;
}): Decisao {
  if (!Number.isInteger(i.destino) || i.destino < 1 || i.destino > POSICAO_PRONTA) {
    return { tipo: "invalida", codigo: "POSICAO_INVALIDA" };
  }
  if (i.destino === i.origem) return { tipo: "invalida", codigo: "MESMA_POSICAO" };
  if (i.forcado && (i.observacao ?? "").trim().length === 0) {
    return { tipo: "invalida", codigo: "OBSERVACAO_OBRIGATORIA" };
  }
  if (i.destino < i.origem) return { tipo: "permitida", forcado: false, direcao: "retrocesso" };

  const salto = i.destino > i.origem + 1;
  if (!i.forcado && i.pendencias.length > 0) {
    return { tipo: "bloqueada", motivo: "pendencias", pendencias: i.pendencias };
  }
  if (!i.forcado && salto) {
    return { tipo: "bloqueada", motivo: "salto", pendencias: i.pendencias };
  }
  return {
    tipo: "permitida",
    forcado: i.forcado && (i.pendencias.length > 0 || salto),
    direcao: "avanco",
  };
}

export function pendenciasDeIntegrantes(
  membros: Array<{
    slug: string;
    nome: string;
    conviteAceitoEm: Date | null;
    curso: string | null;
    semestre: string | null;
  }>,
): Pendencia[] {
  const r: Pendencia[] = [];
  for (const m of membros) {
    if (!m.conviteAceitoEm) {
      r.push({ tipo: "integrante", slug: m.slug, nome: m.nome, motivo: "convite_pendente" });
    } else if (!m.curso || !m.semestre) {
      r.push({ tipo: "integrante", slug: m.slug, nome: m.nome, motivo: "dados_incompletos" });
    }
  }
  return r;
}
