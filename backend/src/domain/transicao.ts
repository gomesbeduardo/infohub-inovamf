// RN-01: a equipe só avança quando as tarefas OBRIGATÓRIAS da etapa atual estão
// aprovadas — ou por decisão do mentor/admin (forçar, com observação gravada).
// RN-02: "Pronta para o InovAMF" (posição 7) exige, além das obrigatórias da
// etapa 6, os três entregáveis finais (tarefas criadas dos modelos da Etapa 6)
// APROVADOS e os dados de todos os integrantes (convite aceito + curso/semestre).
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
    }
  // RN-02: entregável final que o mentor ainda nem criou como tarefa.
  | { tipo: "entregavel"; titulo: string };

// RN-02: os entregáveis finais, pelo título do MODELO (RF-11) de onde a tarefa
// nasceu. Mesmos títulos da Etapa 6 em seed/base.ts (o teste unitário garante).
export const ENTREGAVEIS_FINAIS = [
  "Pitch vídeo",
  "Business Model Canvas final",
  "Value Proposition Design final",
] as const;

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

// A1: status que o admin escolhe na gestão (PATCH /equipes/:slug).
// "pronta_inovamf" nunca vem daqui (só da transição — RN-02); encaminhar ao
// InovAMF só a partir de "pronta_inovamf".
export function mudancaDeStatusValida(atual: string, novo: string): boolean {
  if (novo === "encaminhada_inovamf") {
    return atual === "pronta_inovamf" || atual === "encaminhada_inovamf";
  }
  return true;
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

// RN-02: cada entregável final precisa de ao menos UMA tarefa (criada do
// modelo) aprovada. Nenhuma tarefa → pendência "entregavel"; tarefa(s) ainda
// não aprovada(s) → cada uma vira pendência "tarefa" (o aluno vai direto nela).
export function pendenciasEntregaveisFinais(
  tarefas: Array<{ slug: string; titulo: string; status: string; modelo: string }>,
): Pendencia[] {
  const r: Pendencia[] = [];
  for (const titulo of ENTREGAVEIS_FINAIS) {
    const doModelo = tarefas.filter((t) => t.modelo === titulo);
    if (doModelo.some((t) => t.status === "aprovada")) continue;
    if (doModelo.length === 0) {
      r.push({ tipo: "entregavel", titulo });
    } else {
      for (const t of doModelo) r.push({ tipo: "tarefa", slug: t.slug, titulo: t.titulo });
    }
  }
  return r;
}

// Junta listas sem repetir a mesma pendência (a obrigatória da Etapa 6 da
// RN-01 pode ser também um entregável final da RN-02).
export function juntarPendencias(...listas: Pendencia[][]): Pendencia[] {
  const vistas = new Set<string>();
  const r: Pendencia[] = [];
  for (const p of listas.flat()) {
    const chave = p.tipo === "entregavel" ? `entregavel:${p.titulo}` : `${p.tipo}:${p.slug}`;
    if (vistas.has(chave)) continue;
    vistas.add(chave);
    r.push(p);
  }
  return r;
}

// Código do 409 de uma transição bloqueada: salto é RN-01; pendências ao sair
// da Etapa 6 (rumo a "pronta") são RN-02; as demais, RN-01.
export function codigoBloqueio(
  origem: number,
  motivo: "pendencias" | "salto",
): "RN01_SALTO" | "RN01_PENDENCIAS" | "RN02_PENDENCIAS" {
  if (motivo === "salto") return "RN01_SALTO";
  return origem === POSICAO_PRONTA - 1 ? "RN02_PENDENCIAS" : "RN01_PENDENCIAS";
}
