'use client';

import { useStore } from '@/data/store';
import { calcularIndicadores } from '@/data/repository';
import { Card } from '@/design-system/components/Card';
import { StageTag } from '@/design-system/components/StageTag';

function Indicador({ label, valor }: { label: string; valor: number }) {
  return (
    <Card>
      <Card.Body className="flex flex-col gap-1">
        <span className="font-display text-4xl font-bold tabular-nums tracking-tight text-text">
          {valor}
        </span>
        <span className="text-sm text-text-muted">{label}</span>
      </Card.Body>
    </Card>
  );
}

export function DashboardIndicadores() {
  const { state } = useStore();
  const ind = calcularIndicadores(state);
  const maxEtapa = Math.max(1, ...ind.porEtapa.map((p) => p.total));

  return (
    <section className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador label="Equipes ativas" valor={ind.equipesAtivas} />
        <Indicador label="Prontas p/ InovAMF" valor={ind.prontasInovamf} />
        <Indicador label="Tarefas atrasadas" valor={ind.tarefasAtrasadas} />
        <Indicador label="Total de equipes" valor={ind.totalEquipes} />
      </div>

      <Card>
        <Card.Body className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-text">
            Distribuição por etapa
          </h3>
          <ul className="flex flex-col gap-2">
            {ind.porEtapa.map((p) => (
              <li key={p.etapaId} className="flex items-center gap-3">
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
              </li>
            ))}
          </ul>
        </Card.Body>
      </Card>
    </section>
  );
}
