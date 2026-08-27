import Link from 'next/link';
import type { Equipe } from '@/domain/types';
import { useStore } from '@/data/store';
import { StageTag } from '@/design-system/components/StageTag';
import { StatusBadge } from '@/design-system/components/StatusBadge';
import { Badge } from '@/design-system/components/Badge';

export function EquipeCard({ equipe }: { equipe: Equipe }) {
  const { state } = useStore();
  const area = state.areas.find((a) => a.id === equipe.areaId);
  const mentor = state.usuarios.find((u) => u.id === equipe.mentorId);
  const atrasadas = state.tarefas.filter(
    (t) => t.equipeId === equipe.id && t.status === 'atrasada',
  ).length;

  return (
    <Link
      href={`/admin/equipes/${equipe.slug}`}
      data-testid="equipe-card"
      className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3 transition-colors hover:border-border-strong"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-text">{equipe.nomeIdeia}</span>
        <StageTag etapaId={equipe.etapaAtualId} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {area && <Badge tone="brand">{area.nome}</Badge>}
        {mentor && <span className="text-xs text-text-muted">{mentor.nome}</span>}
      </div>
      {atrasadas > 0 && (
        <div className="flex items-center gap-1">
          <StatusBadge status="atrasada" />
          <span className="text-xs text-text-muted">
            {atrasadas} tarefa{atrasadas > 1 ? 's' : ''}
          </span>
        </div>
      )}
    </Link>
  );
}
