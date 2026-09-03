'use client';

import Link from 'next/link';
import { useStore } from '@/data/store';
import { calcularIndicadores } from '@/data/repository';
import { Card } from '@/design-system/components/Card';
import { StatCard } from '@/design-system/components/StatCard';
import { StageTag } from '@/design-system/components/StageTag';
import {
  UsersIcon,
  CheckIcon,
  AlertIcon,
  LightbulbIcon,
} from '@/design-system/icons';

export function DashboardIndicadores() {
  const { state } = useStore();
  const ind = calcularIndicadores(state);
  const maxEtapa = Math.max(1, ...ind.porEtapa.map((p) => p.total));

  return (
    <section className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Equipes ativas"
          value={ind.equipesAtivas}
          Icon={UsersIcon}
          href="/admin/equipes"
        />
        <StatCard
          label="Prontas p/ InovAMF"
          value={ind.prontasInovamf}
          Icon={CheckIcon}
          tone="success"
          href="/admin#col-pronta"
        />
        <StatCard
          label="Tarefas atrasadas"
          value={ind.tarefasAtrasadas}
          Icon={AlertIcon}
          tone={ind.tarefasAtrasadas > 0 ? 'danger' : 'neutral'}
          href="/admin?status=atrasada"
        />
        <StatCard
          label="Total de equipes"
          value={ind.totalEquipes}
          Icon={LightbulbIcon}
          href="/admin/equipes"
        />
      </div>

      <Card>
        <Card.Body className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-text">
            Distribuição por etapa
          </h3>
          <ul className="flex flex-col gap-1">
            {ind.porEtapa.map((p) => (
              <li key={p.etapaId}>
                <Link
                  href={`/admin#col-etapa-${p.etapaId}`}
                  className="flex items-center gap-3 rounded-lg px-1 py-1 transition-colors hover:bg-surface-sunken"
                >
                  <StageTag etapaId={p.etapaId}>{p.numero}</StageTag>
                  <span className="w-40 shrink-0 truncate text-sm text-text-muted">
                    {p.nome}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(p.total / maxEtapa) * 100}%`,
                        background: `var(--stage-${p.etapaId})`,
                      }}
                    />
                  </div>
                  <span className="w-6 text-right text-sm font-medium tabular-nums text-text">
                    {p.total}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card.Body>
      </Card>
    </section>
  );
}
