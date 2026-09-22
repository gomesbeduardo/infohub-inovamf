// RN-04: "tarefas vencidas sem entrega são marcadas como atrasadas".
// Decisão: DERIVADO NA CONSULTA, nunca gravado. Um job no mesmo processo seria
// o Problema 3 (um ponto de falha) e duas fontes de verdade (coluna x prazo
// adiado — RF-17). Esta é a ÚNICA definição de "atrasada" do sistema: listas,
// kanban, dashboard e CSV passam por aqui (ou por whereStatusEfetivo no model).

export const STATUS_SEM_ENTREGA = ["pendente", "em_andamento"] as const;

const FMT_SP = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// "Hoje" no fuso da AMF, como YYYY-MM-DD (en-CA já formata assim).
export function hojeISO(agora: Date = new Date()): string {
  return FMT_SP.format(agora);
}

// Coluna DATE do Postgres chega como 00:00Z do dia — o dia é o prefixo ISO.
export function dataISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function statusEfetivo(status: string, dataEntrega: Date, hoje: string): string {
  const semEntrega = (STATUS_SEM_ENTREGA as readonly string[]).includes(status);
  return semEntrega && dataISO(dataEntrega) < hoje ? "atrasada" : status;
}
