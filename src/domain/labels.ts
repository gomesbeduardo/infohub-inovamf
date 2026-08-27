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
