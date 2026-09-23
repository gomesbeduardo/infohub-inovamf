'use client';

import { useState } from 'react';
import { useDashboard } from '@/data/api/consultas';
import { StatCard } from '@/design-system/components/StatCard';
import { Card } from '@/design-system/components/Card';
import { Tabs } from '@/design-system/components/Tabs';
import { LineChart } from '@/design-system/components/LineChart';
import { EmptyState } from '@/design-system/components/EmptyState';
import { Button } from '@/design-system/components/Button';
import { UsersIcon, ListChecksIcon, AlertIcon, CheckIcon } from '@/design-system/icons';
import { FunilKanban } from '@/features/orientador/FunilKanban';
import { Skeleton } from '@/design-system/components/Skeleton';
import { MesaDoMentor } from '@/features/agenda/Agenda';

function CarregandoOuErro({
  isPending,
  error,
  refetch,
}: {
  isPending: boolean;
  error: Error | null;
  refetch: () => void;
}) {
  if (isPending) return <Skeleton linhas={4} />;
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

export function PainelOrientador() {
  const [aba, setAba] = useState('visao');
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

  const { totalEquipes, aAvaliar, tarefasAtrasadas, prontasInovamf, serieSemanal } = dashboard.data;
  const irParaFunil = () => setAba('funil');

  const visaoGeral = (
    <div className="flex flex-col gap-5">
      <MesaDoMentor />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Equipes mentoradas" value={totalEquipes} Icon={UsersIcon} onClick={irParaFunil} />
        <StatCard label="Entregas a avaliar" value={aAvaliar} Icon={ListChecksIcon} onClick={irParaFunil} />
        <StatCard
          label="Tarefas atrasadas"
          value={tarefasAtrasadas}
          Icon={AlertIcon}
          tone={tarefasAtrasadas > 0 ? 'danger' : 'neutral'}
          onClick={irParaFunil}
        />
        <StatCard
          label="Prontas p/ InovAMF"
          value={prontasInovamf}
          Icon={CheckIcon}
          tone={prontasInovamf > 0 ? 'success' : 'neutral'}
          onClick={irParaFunil}
        />
      </div>

      <Card>
        <Card.Body className="flex flex-col gap-4">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-sm font-semibold text-text">Ritmo das últimas semanas</h3>
            <p className="text-sm text-text-muted">
              Avanços de etapa e entregas concluídas das suas equipes.
            </p>
          </div>
          {totalEquipes === 0 ? (
            <EmptyState title="Sem dados ainda" description="Seus indicadores aparecem quando houver equipes atribuídas." />
          ) : (
            <LineChart
              className="w-full"
              labels={serieSemanal.map((p) => p.rotulo)}
              ariaLabel="Gráfico de linha com avanços de etapa e entregas concluídas por semana"
              series={[
                {
                  nome: 'Avanços de etapa',
                  cor: 'var(--primary)',
                  valores: serieSemanal.map((p) => p.avancos),
                },
                {
                  nome: 'Entregas concluídas',
                  cor: 'var(--accent)',
                  valores: serieSemanal.map((p) => p.entregas),
                },
              ]}
            />
          )}
        </Card.Body>
      </Card>
    </div>
  );

  return (
    <Tabs
      active={aba}
      onChange={setAba}
      tabs={[
        { id: 'visao', label: 'Visão geral', content: visaoGeral },
        { id: 'funil', label: 'Funil', content: <FunilKanban /> },
      ]}
    />
  );
}
