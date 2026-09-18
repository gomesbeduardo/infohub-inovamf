'use client';

import { FunilBoard } from '@/features/funil/FunilBoard';

/** Funil do mentor: arrastável, escopado às equipes que ele orienta. */
export function FunilKanban() {
  return <FunilBoard modo="mentor" />;
}
