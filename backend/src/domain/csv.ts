// RF-23: exportação CSV das equipes — mesmo formato que o front gerava.
// Labels idênticos a frontend/src/domain/labels.ts (STATUS_EQUIPE_LABEL).
export const STATUS_EQUIPE_LABEL: Record<string, string> = {
  ativa: "Ativa",
  pronta_inovamf: "Pronta p/ InovAMF",
  encaminhada_inovamf: "Encaminhada ao InovAMF",
  pausada: "Pausada",
  desistente: "Desistente",
};

const CABECALHO = ["Ideia", "Área", "Etapa", "Status", "Mentor", "Curso do líder", "Tarefas atrasadas"];

// CSV injection (OWASP): célula que começa com = + - @ tab ou CR vira texto
// com um ' na frente, senão o Excel/Sheets executa como fórmula.
export function celulaCSV(v: string): string {
  const s = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function equipesCSV(
  linhas: Array<{
    nomeIdeia: string;
    area: string | null;
    etapa: { numero: number; nome: string };
    status: string;
    mentor: string | null;
    cursoLider: string | null;
    tarefasAtrasadas: number;
  }>,
): string {
  const corpo = linhas.map((e) => [
    e.nomeIdeia,
    e.area ?? "",
    `${e.etapa.numero}. ${e.etapa.nome}`,
    STATUS_EQUIPE_LABEL[e.status] ?? e.status,
    e.mentor ?? "",
    e.cursoLider ?? "",
    String(e.tarefasAtrasadas),
  ]);
  // BOM: o Excel só lê acentos em UTF-8 com ele.
  return "﻿" + [CABECALHO, ...corpo].map((r) => r.map(celulaCSV).join(",")).join("\n");
}
