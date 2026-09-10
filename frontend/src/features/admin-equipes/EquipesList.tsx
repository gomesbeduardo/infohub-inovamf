'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/data/store';
import { filtrarEquipes } from '@/data/repository';
import { STATUS_EQUIPE_LABEL } from '@/domain/labels';
import { Input } from '@/design-system/components/Input';
import { StageTag } from '@/design-system/components/StageTag';
import { Badge } from '@/design-system/components/Badge';
import { EmptyState } from '@/design-system/components/EmptyState';

export function EquipesList() {
  const { state } = useStore();
  const [busca, setBusca] = useState('');

  const equipes = useMemo(() => {
    return [...filtrarEquipes(state, { busca })].sort(
      (a, b) =>
        a.etapaAtualId - b.etapaAtualId || a.nomeIdeia.localeCompare(b.nomeIdeia),
    );
  }, [state, busca]);

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
        <span className="text-sm text-text-muted">
          {equipes.length} equipe{equipes.length === 1 ? '' : 's'}
        </span>
      </div>

      {equipes.length === 0 ? (
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
              {equipes.map((e) => {
                const area = state.areas.find((a) => a.id === e.areaId);
                const etapa = state.etapas.find((et) => et.id === e.etapaAtualId);
                const mentor = state.usuarios.find((u) => u.id === e.mentorId);
                const atrasadas = state.tarefas.filter(
                  (t) => t.equipeId === e.id && t.status === 'atrasada',
                ).length;
                return (
                  <tr
                    key={e.id}
                    className="border-b border-border last:border-0 transition-colors hover:bg-surface-sunken"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/equipes/${e.slug}`}
                        className="font-medium text-text hover:text-primary-text hover:underline"
                      >
                        {e.nomeIdeia}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-text-muted">{area?.nome ?? '—'}</td>
                    <td className="px-4 py-3">
                      <StageTag etapaId={e.etapaAtualId}>
                        {etapa ? `${etapa.numero}. ${etapa.nome}` : `Etapa ${e.etapaAtualId}`}
                      </StageTag>
                    </td>
                    <td className="px-4 py-3">
                      <Badge>{STATUS_EQUIPE_LABEL[e.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-text-muted">{mentor?.nome ?? '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {atrasadas > 0 ? (
                        <span className="font-medium text-danger-text">{atrasadas}</span>
                      ) : (
                        <span className="text-text-subtle">0</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
