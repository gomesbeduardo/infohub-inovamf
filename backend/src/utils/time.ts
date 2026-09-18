// Converte "15m" / "2h" / "30s" / "7d" em milissegundos.
// Usado para alinhar a expiração da linha em tokens_acesso ao TTL do JWT.
const UNIDADES: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export function parseDurationMs(spec: string): number {
  const m = /^(\d+)\s*([smhd])$/.exec(spec.trim());
  if (!m) throw new Error(`Duração inválida: ${spec}`);
  const valor = Number(m[1]);
  const unidade = UNIDADES[m[2] as string];
  if (unidade === undefined) throw new Error(`Unidade inválida: ${spec}`);
  return valor * unidade;
}

export const DIA_MS = 86_400_000;
