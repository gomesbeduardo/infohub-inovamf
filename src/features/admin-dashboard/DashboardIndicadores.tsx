'use client';

import { useStore } from '@/data/store';
import { calcularIndicadores } from '@/data/repository';
import { StatCard } from '@/design-system/components/StatCard';
import { DistribuicaoPorEtapa } from '@/features/admin-dashboard/DistribuicaoPorEtapa';
import {
  UsersIcon,
  CheckIcon,
  AlertIcon,
  LightbulbIcon,
} from '@/design-system/icons';

export function DashboardIndicadores() {
  const { state } = useStore();
  const ind = calcularIndicadores(state);

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

      <DistribuicaoPorEtapa pontos={ind.porEtapa} />
    </section>
  );
}
