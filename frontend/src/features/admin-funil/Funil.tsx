'use client';

import { useSearchParams } from 'next/navigation';
import type { StatusTarefa } from '@/domain/types';
import { FunilBoard } from '@/features/funil/FunilBoard';

const STATUS_TAREFA_VALIDOS: StatusTarefa[] = [
  'pendente',
  'em_andamento',
  'entregue',
  'atrasada',
  'aprovada',
  'ajustar',
];

/** Funil do admin: arrastável, com todas as equipes. Lê o preset `?status=`
 *  (deep-link dos KPIs do dashboard) de forma reativa à navegação. */
export function Funil() {
  const status = useSearchParams().get('status');
  const preset =
    status && STATUS_TAREFA_VALIDOS.includes(status as StatusTarefa)
      ? (status as StatusTarefa)
      : undefined;
  return <FunilBoard modo="admin" statusPreset={preset} />;
}
