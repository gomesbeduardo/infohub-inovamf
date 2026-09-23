'use client';

import { useDashboard } from '@/data/api/consultas';
import { StatCard } from '@/design-system/components/StatCard';
import { Button } from '@/design-system/components/Button';
import { DistribuicaoPorEtapa } from '@/features/admin-dashboard/DistribuicaoPorEtapa';
import {
  UsersIcon,
  CheckIcon,
  AlertIcon,
  LightbulbIcon,
} from '@/design-system/icons';

function CarregandoOuErro({
  isPending,
  error,
  refetch,
}: {
  isPending: boolean;
  error: Error | null;
  refetch: () => void;
}) {
  if (isPending) return <p className="text-sm text-text-muted">Carregando…</p>;
  return (
    <div className="flex flex-col items-start gap-3">
      <p
        role="alert"
        className="rounded-[0.625rem] bg-danger-soft px-3 py-2 text-sm font-medium text-danger-text"
      >
        {error?.message}
      </p>
      <Button variant="secondary" onClick={() => refetch()}>
        Tentar de novo
      </Button>
    </div>
  );
}

export function DashboardIndicadores() {
  const dashboard = useDashboard();

  if (dashboard.isPending || dashboard.isError) {
    return (
      <CarregandoOuErro
        isPending={dashboard.isPending}
        error={dashboard.error}
        refetch={() => void dashboard.refetch()}
      />
    );
  }

  const { equipesAtivas, prontasInovamf, tarefasAtrasadas, totalEquipes, porEtapa } = dashboard.data;

  return (
    <section className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Equipes ativas"
          value={equipesAtivas}
          Icon={UsersIcon}
          href="/admin/equipes"
        />
        <StatCard
          label="Prontas p/ InovAMF"
          value={prontasInovamf}
          Icon={CheckIcon}
          tone="success"
          href="/admin#col-pronta"
        />
        <StatCard
          label="Tarefas atrasadas"
          value={tarefasAtrasadas}
          Icon={AlertIcon}
          tone={tarefasAtrasadas > 0 ? 'danger' : 'neutral'}
          href="/admin?status=atrasada"
        />
        <StatCard
          label="Total de equipes"
          value={totalEquipes}
          Icon={LightbulbIcon}
          href="/admin/equipes"
        />
      </div>

      <DistribuicaoPorEtapa pontos={porEtapa} />
    </section>
  );
}
