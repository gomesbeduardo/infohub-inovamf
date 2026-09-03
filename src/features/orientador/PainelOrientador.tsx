'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/data/store';
import { getUsuarioAtual } from '@/data/session';
import { equipesVisiveis, serieSemanalMentor, hojeISO } from '@/data/repository';
import { StatCard } from '@/design-system/components/StatCard';
import { Card } from '@/design-system/components/Card';
import { Tabs } from '@/design-system/components/Tabs';
import { LineChart } from '@/design-system/components/LineChart';
import { EmptyState } from '@/design-system/components/EmptyState';
import { UsersIcon, ListChecksIcon, AlertIcon, CheckIcon } from '@/design-system/icons';
import { FunilKanban } from '@/features/orientador/FunilKanban';

export function PainelOrientador() {
  const { state } = useStore();
  const [montado, setMontado] = useState(false);
  const [aba, setAba] = useState('visao');
  useEffect(() => setMontado(true), []);

  if (!montado) return null;

  const usuario = getUsuarioAtual(state);
  if (!usuario) {
    return <EmptyState title="Sessão não encontrada" description="Faça login novamente." />;
  }

  const equipes = equipesVisiveis(state, usuario);
  const ids = new Set(equipes.map((e) => e.id));
  const daMinhas = state.tarefas.filter((t) => ids.has(t.equipeId));
  const aAvaliar = daMinhas.filter((t) => t.status === 'entregue').length;
  const atrasadas = daMinhas.filter((t) => t.status === 'atrasada').length;
  const prontas = equipes.filter(
    (e) => e.status === 'pronta_inovamf' || e.status === 'encaminhada_inovamf',
  ).length;

  const serie = serieSemanalMentor(state, usuario, hojeISO(), 8);
  const irParaFunil = () => setAba('funil');

  const visaoGeral = (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Equipes mentoradas" value={equipes.length} Icon={UsersIcon} onClick={irParaFunil} />
        <StatCard label="Entregas a avaliar" value={aAvaliar} Icon={ListChecksIcon} onClick={irParaFunil} />
        <StatCard
          label="Tarefas atrasadas"
          value={atrasadas}
          Icon={AlertIcon}
          tone={atrasadas > 0 ? 'danger' : 'neutral'}
          onClick={irParaFunil}
        />
        <StatCard
          label="Prontas p/ InovAMF"
          value={prontas}
          Icon={CheckIcon}
          tone={prontas > 0 ? 'success' : 'neutral'}
          onClick={irParaFunil}
        />
      </div>

      <Card>
        <Card.Body className="flex flex-col gap-4">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-sm font-semibold text-text">Ritmo das últimas 8 semanas</h3>
            <p className="text-sm text-text-muted">
              Avanços de etapa e entregas concluídas das suas equipes.
            </p>
          </div>
          {equipes.length === 0 ? (
            <EmptyState title="Sem dados ainda" description="Seus indicadores aparecem quando houver equipes atribuídas." />
          ) : (
            <LineChart
              labels={serie.map((p) => p.rotulo)}
              ariaLabel="Gráfico de linha com avanços de etapa e entregas concluídas por semana"
              series={[
                {
                  nome: 'Avanços de etapa',
                  cor: 'var(--primary)',
                  valores: serie.map((p) => p.avancos),
                },
                {
                  nome: 'Entregas concluídas',
                  cor: 'var(--accent)',
                  valores: serie.map((p) => p.entregas),
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
