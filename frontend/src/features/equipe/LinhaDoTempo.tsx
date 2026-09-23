'use client';

import type { TipoItemLinhaDoTempo } from '@/data/api/tipos';
import { useLinhaDoTempo } from '@/data/api/consultas';
import { formatarDataHora } from '@/domain/labels';
import { Button } from '@/design-system/components/Button';
import { EmptyState } from '@/design-system/components/EmptyState';
import { Skeleton } from '@/design-system/components/Skeleton';
import {
  BellIcon,
  CheckIcon,
  RocketIcon,
  TargetIcon,
  UploadIcon,
  UserIcon,
  type IconProps,
} from '@/design-system/icons';

const ICONE: Record<TipoItemLinhaDoTempo, (p: IconProps) => JSX.Element> = {
  etapa: RocketIcon,
  status: TargetIcon,
  mentor: UserIcon,
  entrega: UploadIcon,
  avaliacao: CheckIcon,
  lembrete: BellIcon,
};

/** Quantos itens a versão resumida (área do aluno) mostra. */
export const ITENS_RESUMO = 5;

/**
 * Linha do tempo da equipe (A5): movimentos no funil, mentor/status, entregas,
 * avaliações e lembretes, do mais novo para o mais antigo. O escopo (o aluno
 * não vê observação de movimento forçado) é do backend. Usada no detalhe
 * (admin/mentor) e, resumida, em "Minha equipe".
 */
export function LinhaDoTempo({ equipeSlug, resumida = false }: { equipeSlug: string; resumida?: boolean }) {
  const consulta = useLinhaDoTempo(equipeSlug);

  if (consulta.isPending) return <Skeleton linhas={resumida ? 2 : 4} />;
  if (consulta.isError) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p
          role="alert"
          className="rounded-[0.625rem] bg-danger-soft px-3 py-2 text-sm font-medium text-danger-text"
        >
          {consulta.error.message}
        </p>
        <Button variant="secondary" size="sm" onClick={() => void consulta.refetch()}>
          Tentar de novo
        </Button>
      </div>
    );
  }

  const itens = resumida ? consulta.data.slice(0, ITENS_RESUMO) : consulta.data;
  if (itens.length === 0) {
    return (
      <EmptyState
        title="Nada por aqui ainda"
        description="Movimentos no funil, entregas e avaliações aparecem aqui."
      />
    );
  }

  return (
    <ol aria-label="Linha do tempo" className="flex flex-col gap-2">
      {itens.map((it, i) => {
        const Icone = ICONE[it.tipo] ?? RocketIcon;
        return (
          <li
            key={`${it.em}-${i}`}
            className="flex gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          >
            <Icone size={18} className="mt-0.5 shrink-0 text-primary-text" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="font-medium text-text">{it.titulo}</span>
              {it.detalhe && <p className="whitespace-pre-line text-text-muted">{it.detalhe}</p>}
              <span className="text-xs text-text-subtle">
                {it.autor ? `${it.autor} · ` : ''}
                {formatarDataHora(it.em)}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
