'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useEquipes } from '@/data/api/consultas';
import { STATUS_EQUIPE_LABEL } from '@/domain/labels';
import { Input } from '@/design-system/components/Input';
import { StageTag } from '@/design-system/components/StageTag';
import { Badge } from '@/design-system/components/Badge';
import { Button } from '@/design-system/components/Button';
import { EmptyState } from '@/design-system/components/EmptyState';
import { limparFiltros, useAdiado } from '@/features/funil/filtros';

export interface EquipesListProps {
  /** Base do link do detalhe da equipe (o mentor usa `/orientador/equipes`). */
  baseHref?: string;
}

export function EquipesList({ baseHref = '/admin/equipes' }: EquipesListProps = {}) {
  const [busca, setBusca] = useState('');
  const q = useAdiado(busca);
  const consulta = useEquipes(limparFiltros({ q }));

  const equipes = useMemo(
    () =>
      [...(consulta.data ?? [])].sort(
        (a, b) => a.etapa.numero - b.etapa.numero || a.nomeIdeia.localeCompare(b.nomeIdeia),
      ),
    [consulta.data],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          aria-label="Buscar equipes"
          placeholder="Buscar por nome da ideia…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="sm:max-w-xs"
        />
        {consulta.isSuccess && (
          <span className="text-sm text-text-muted">
            {equipes.length} equipe{equipes.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {consulta.isError ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-10 text-center">
          <p role="alert" className="text-sm font-medium text-danger-text">
            {consulta.error.message}
          </p>
          <Button variant="secondary" size="sm" onClick={() => void consulta.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : consulta.isPending ? (
        <p className="px-1 py-10 text-center text-sm text-text-muted">Carregando…</p>
      ) : equipes.length === 0 ? (
        <EmptyState
          title="Nenhuma equipe encontrada"
          description="Ajuste a busca para ver outras equipes."
        />
      ) : (
        <div className="scroll-suave overflow-x-auto rounded-[1.25rem] border border-border bg-surface shadow-sm">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-text-muted">
                <th className="px-4 py-3 font-medium">Ideia</th>
                <th className="px-4 py-3 font-medium">Área</th>
                <th className="px-4 py-3 font-medium">Etapa</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Mentor</th>
                <th className="px-4 py-3 text-right font-medium">Atrasadas</th>
              </tr>
            </thead>
            <tbody>
              {equipes.map((e) => (
                <tr
                  key={e.slug}
                  data-testid="linha-equipe"
                  className="border-b border-border last:border-0 transition-colors hover:bg-surface-sunken"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`${baseHref}/${e.slug}`}
                      className="font-medium text-text hover:text-primary-text hover:underline"
                    >
                      {e.nomeIdeia}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{e.area ?? '—'}</td>
                  <td className="px-4 py-3">
                    <StageTag etapaId={e.etapa.numero}>
                      {`${e.etapa.numero}. ${e.etapa.nome}`}
                    </StageTag>
                  </td>
                  <td className="px-4 py-3">
                    <Badge>{STATUS_EQUIPE_LABEL[e.status]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{e.mentor?.nome ?? '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {e.tarefasAtrasadas > 0 ? (
                      <span className="font-medium text-danger-text">{e.tarefasAtrasadas}</span>
                    ) : (
                      <span className="text-text-subtle">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
