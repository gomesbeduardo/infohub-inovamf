'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/data/store';
import {
  filtrarEquipes,
  equipesVisiveis,
  type FiltrosFunil,
} from '@/data/repository';
import { getUsuarioAtual } from '@/data/session';
import { EmptyState } from '@/design-system/components/EmptyState';
import { EquipeCard } from '@/features/admin-funil/EquipeCard';
import { FiltrosBar } from '@/features/admin-funil/FiltrosBar';
import { ExportarCSV } from '@/features/admin-funil/ExportarCSV';

export function Funil() {
  const { state } = useStore();
  const [filtros, setFiltros] = useState<FiltrosFunil>({});
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  // escopo por perfil (RNF-03): mentor vê só as suas equipes; admin vê todas
  const usuario = montado ? getUsuarioAtual(state) : null;
  const visiveisIds = usuario
    ? new Set(equipesVisiveis(state, usuario).map((e) => e.id))
    : null;

  const filtradas = filtrarEquipes(state, filtros).filter(
    (e) => !visiveisIds || visiveisIds.has(e.id),
  );
  const ehPronta = (status: string) =>
    status === 'pronta_inovamf' || status === 'encaminhada_inovamf';

  const etapas = [...state.etapas].sort((a, b) => a.numero - b.numero);
  const colunas = [
    ...etapas.map((et) => ({
      key: `etapa-${et.id}`,
      titulo: `${et.numero}. ${et.nome}`,
      equipes: filtradas.filter(
        (e) => !ehPronta(e.status) && e.etapaAtualId === et.id,
      ),
    })),
    {
      key: 'pronta',
      titulo: 'Pronta p/ InovAMF',
      equipes: filtradas.filter((e) => ehPronta(e.status)),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-text">Funil de equipes</h2>
        <ExportarCSV equipes={filtradas} />
      </div>
      <FiltrosBar filtros={filtros} onChange={setFiltros} />

      <div className="flex gap-4 overflow-x-auto pb-4">
        {colunas.map((col) => (
          <section
            key={col.key}
            data-testid="coluna-funil"
            className="flex w-72 shrink-0 flex-col gap-3 rounded-xl bg-surface-sunken p-3"
          >
            <header className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text">{col.titulo}</h2>
              <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-text-muted">
                {col.equipes.length}
              </span>
            </header>
            <div className="flex flex-col gap-2">
              {col.equipes.length === 0 ? (
                <EmptyState title="Nenhuma equipe" />
              ) : (
                col.equipes.map((e) => <EquipeCard key={e.id} equipe={e} />)
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
