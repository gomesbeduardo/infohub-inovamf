import { dataISO } from "./atraso.js";

// Série semanal do painel do mentor: `semanas` janelas de 7 dias, a última
// terminando em `hoje` (datas YYYY-MM-DD no fuso de SP). Conta quantos eventos
// de cada lista caem em cada janela (limites inclusivos).
//
// `entregas` é mantido como alias de `tarefasConcluidas` (nome antigo do
// campo) para não quebrar outros consumidores.
export function serieSemanal(
  hoje: string,
  semanas: number,
  avancos: string[],
  entregasRecebidas: string[],
  entregasAvaliadas: string[],
  tarefasConcluidas: string[],
): Array<{
  semanaInicio: string;
  rotulo: string;
  avancos: number;
  entregasRecebidas: number;
  entregasAvaliadas: number;
  tarefasConcluidas: number;
  entregas: number;
}> {
  const dia = (base: string, n: number) => {
    const d = new Date(`${base}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return dataISO(d);
  };
  const conta = (lista: string[], ini: string, fim: string) =>
    lista.filter((d) => d >= ini && d <= fim).length;

  const r = [];
  for (let i = semanas - 1; i >= 0; i--) {
    const fim = dia(hoje, -7 * i);
    const ini = dia(fim, -6);
    const concluidas = conta(tarefasConcluidas, ini, fim);
    r.push({
      semanaInicio: ini,
      rotulo: `${ini.slice(8, 10)}/${ini.slice(5, 7)}`,
      avancos: conta(avancos, ini, fim),
      entregasRecebidas: conta(entregasRecebidas, ini, fim),
      entregasAvaliadas: conta(entregasAvaliadas, ini, fim),
      tarefasConcluidas: concluidas,
      entregas: concluidas,
    });
  }
  return r;
}

// Movimento que conta como avanço no painel: etapa maior, ou entrada em "pronta".
export function ehAvanco(h: {
  origem: number | null;
  destino: number;
  statusOrigem: string | null;
  statusDestino: string | null;
}): boolean {
  if (h.statusDestino === "pronta_inovamf" && h.statusOrigem !== "pronta_inovamf") return true;
  return h.destino > (h.origem ?? 0);
}
