import type { StatusTarefa } from '@/domain/types';

// B3: chips de prazo. O STATUS (inclusive "atrasada", RN-04) vem do backend;
// aqui só se formata a diferença de dias entre hoje (fuso da AMF) e o prazo.

const FMT_SP = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** "Hoje" no fuso da AMF, como YYYY-MM-DD (o mesmo critério do backend). */
export function hojeISO(agora: Date = new Date()): string {
  return FMT_SP.format(agora);
}

const DIA_MS = 86_400_000;
const diasEntre = (de: string, ate: string) =>
  Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / DIA_MS);

const SEM_ENTREGA: StatusTarefa[] = ['pendente', 'em_andamento', 'ajustar'];

/** "vence hoje", "vence em N dias", "atrasada há N dias" — ou null (sem chip). */
export function textoPrazo(dataEntrega: string, status: StatusTarefa, hoje: string = hojeISO()): string | null {
  const data = dataEntrega.slice(0, 10);
  if (status === 'atrasada') {
    const n = Math.max(1, diasEntre(data, hoje));
    return n === 1 ? 'atrasada há 1 dia' : `atrasada há ${n} dias`;
  }
  if (!SEM_ENTREGA.includes(status)) return null;
  const n = diasEntre(hoje, data);
  if (n < 0) return null; // atraso quem decide é o backend
  if (n === 0) return 'vence hoje';
  return n === 1 ? 'vence em 1 dia' : `vence em ${n} dias`;
}
