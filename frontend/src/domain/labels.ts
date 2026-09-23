import type {
  StatusTarefa,
  EstagioIdeia,
  StatusEquipe,
} from '@/domain/types';

/** Rótulos pt-BR dos status de tarefa. */
export const STATUS_TAREFA_LABEL: Record<StatusTarefa, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  entregue: 'Entregue',
  atrasada: 'Atrasada',
  aprovada: 'Aprovada',
  ajustar: 'Ajustar',
};

/** Rótulos pt-BR do estágio da ideia. */
export const ESTAGIO_LABEL: Record<EstagioIdeia, string> = {
  ideia: 'Apenas ideia',
  prototipo: 'Protótipo',
  mvp_desenvolvimento: 'MVP em desenvolvimento',
  mvp_pronto: 'MVP pronto',
};

/** Rótulos pt-BR do status da equipe. */
export const STATUS_EQUIPE_LABEL: Record<StatusEquipe, string> = {
  ativa: 'Ativa',
  pronta_inovamf: 'Pronta p/ InovAMF',
  encaminhada_inovamf: 'Encaminhada ao InovAMF',
  pausada: 'Pausada',
  desistente: 'Desistente',
};

const FMT_DATA = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
});

/** Formata uma data ISO `YYYY-MM-DD` como `dd/mm/aaaa` (Intl, estável no SSR). */
export function formatarData(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return FMT_DATA.format(new Date(Date.UTC(y, m - 1, d)));
}

const FMT_DATA_HORA = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

/** Formata um instante ISO (`criadoEm`, `em`…) como `dd/mm/aaaa, hh:mm` no horário de Brasília. */
export function formatarDataHora(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : FMT_DATA_HORA.format(d);
}

/**
 * Nomes curtos das 6 etapas do funil, indexados pelo número da etapa (1..6).
 * A posição 0 fica vazia para o índice bater com `numero`.
 */
export const ETAPA_NOME: string[] = [
  '',
  'Envio da ideia',
  'Contato com a equipe',
  'Encontro 1',
  'Encontro 2',
  'Encontro 3',
  'Encontro 4',
];
