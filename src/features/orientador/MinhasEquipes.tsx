'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/data/store';
import { getUsuarioAtual } from '@/data/session';
import { equipesVisiveis } from '@/data/repository';
import { StatCard } from '@/design-system/components/StatCard';
import { EmptyState } from '@/design-system/components/EmptyState';
import { EquipeCard } from '@/features/admin-funil/EquipeCard';
import { UsersIcon, ListChecksIcon, AlertIcon } from '@/design-system/icons';

export function MinhasEquipes() {
  const { state } = useStore();
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  if (!montado) return null;

  const usuario = getUsuarioAtual(state);
  if (!usuario) {
    return <EmptyState title="Sessão não encontrada" description="Faça login novamente." />;
  }

  const equipes = [...equipesVisiveis(state, usuario)].sort(
    (a, b) => a.etapaAtualId - b.etapaAtualId || a.nomeIdeia.localeCompare(b.nomeIdeia),
  );
  const ids = new Set(equipes.map((e) => e.id));
  const aAvaliar = state.tarefas.filter(
    (t) => ids.has(t.equipeId) && t.status === 'entregue',
  ).length;
  const atrasadas = state.tarefas.filter(
    (t) => ids.has(t.equipeId) && t.status === 'atrasada',
  ).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Equipes mentoradas" value={equipes.length} Icon={UsersIcon} />
        <StatCard label="Entregas a avaliar" value={aAvaliar} Icon={ListChecksIcon} />
        <StatCard
          label="Tarefas atrasadas"
          value={atrasadas}
          Icon={AlertIcon}
          tone={atrasadas > 0 ? 'danger' : 'neutral'}
        />
      </div>

      {equipes.length === 0 ? (
        <EmptyState
          title="Nenhuma equipe atribuída"
          description="Quando a coordenação lhe atribuir equipes, elas aparecem aqui."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {equipes.map((e) => (
            <EquipeCard key={e.id} equipe={e} basePath="/orientador/equipes" />
          ))}
        </div>
      )}
    </div>
  );
}
