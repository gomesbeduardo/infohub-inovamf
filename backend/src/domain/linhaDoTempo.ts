// A5/RF-08: linha do tempo da equipe — histórico de etapas + log de auditoria
// (equipe, tarefas e entregas dela) numa lista só, do mais novo para o mais
// antigo, sem UUID. Regra PURA: o model busca, o controller aplica o escopo.
// O movimento de etapa vem de historico_etapas (tem de/para/forçado); o log
// "etapa_movida" existe para a auditoria (RNF-05) e é ignorado aqui para não
// duplicar. Anotações internas nunca entram (não são auditadas).

export type TipoItem = "etapa" | "status" | "mentor" | "entrega" | "avaliacao" | "lembrete";

export interface ItemLinhaDoTempo {
  tipo: TipoItem;
  titulo: string;
  detalhe?: string;
  autor?: string;
  em: Date;
}

export interface MovimentoEtapa {
  de: number | "pronta" | null;
  para: number | "pronta";
  forcado: boolean;
  observacao: string | null;
  autor: string | null;
  em: Date;
}

export interface EventoAuditoria {
  acao: string;
  antes: unknown;
  depois: unknown;
  autor: string | null;
  em: Date;
}

export const LIMITE_LINHA_DO_TEMPO = 50;

const STATUS_LABEL: Record<string, string> = {
  ativa: "Ativa",
  pronta_inovamf: "Pronta p/ InovAMF",
  encaminhada_inovamf: "Encaminhada ao InovAMF",
  pausada: "Pausada",
  desistente: "Desistente",
};

const posicao = (p: number | "pronta") => (p === "pronta" ? "Pronta p/ InovAMF" : `Etapa ${p}`);

// Lê um campo texto/número de um JSON de auditoria (antes/depois).
function campo(o: unknown, chave: string): string | undefined {
  if (typeof o !== "object" || o === null) return undefined;
  const v = (o as Record<string, unknown>)[chave];
  return typeof v === "string" || typeof v === "number" ? String(v) : undefined;
}

function doMovimento(m: MovimentoEtapa, paraAluno: boolean): ItemLinhaDoTempo {
  const origem = m.de !== null ? `${posicao(m.de)} → ` : "";
  const esconder = paraAluno && m.forcado; // observação de forçado é interna
  return {
    tipo: "etapa",
    titulo: `${origem}${posicao(m.para)}${m.forcado ? " (forçado)" : ""}`,
    detalhe: !esconder && m.observacao ? m.observacao : undefined,
    autor: m.autor ?? undefined,
    em: m.em,
  };
}

function daAuditoria(e: EventoAuditoria): ItemLinhaDoTempo | null {
  const base = { autor: e.autor ?? undefined, em: e.em };
  const tarefa = campo(e.depois, "tarefa") ?? "tarefa";
  switch (e.acao) {
    case "status_alterado": {
      const de = campo(e.antes, "status") ?? "";
      const para = campo(e.depois, "status") ?? "";
      return { tipo: "status", titulo: `Status: ${STATUS_LABEL[de] ?? de} → ${STATUS_LABEL[para] ?? para}`, ...base };
    }
    case "mentor_atribuido":
      return { tipo: "mentor", titulo: `Mentor: ${campo(e.depois, "mentor") ?? "sem mentor"}`, ...base };
    case "entrega_enviada": {
      const versao = campo(e.depois, "versao");
      return { tipo: "entrega", titulo: `Entrega enviada: ${tarefa}${versao ? ` (v${versao})` : ""}`, ...base };
    }
    case "entrega_avaliada": {
      const aprovada = campo(e.depois, "resultado") === "aprovada";
      return {
        tipo: "avaliacao",
        titulo: aprovada ? `Entrega aprovada: ${tarefa}` : `Ajustes pedidos: ${tarefa}`,
        detalhe: campo(e.depois, "comentario") || undefined,
        ...base,
      };
    }
    case "lembrete_enviado":
      return {
        tipo: "lembrete",
        titulo: "Lembrete enviado à equipe",
        detalhe: campo(e.depois, "mensagem") || undefined,
        ...base,
      };
    default:
      return null; // etapa_movida (vem do histórico) e ações que não são da equipe
  }
}

export function montarLinhaDoTempo(i: {
  movimentos: MovimentoEtapa[];
  auditoria: EventoAuditoria[];
  paraAluno: boolean;
  limite?: number;
}): ItemLinhaDoTempo[] {
  const itens = [
    ...i.movimentos.map((m) => doMovimento(m, i.paraAluno)),
    ...i.auditoria.map(daAuditoria).filter((x): x is ItemLinhaDoTempo => x !== null),
  ];
  itens.sort((a, b) => b.em.getTime() - a.em.getTime());
  return itens.slice(0, i.limite ?? LIMITE_LINHA_DO_TEMPO);
}
