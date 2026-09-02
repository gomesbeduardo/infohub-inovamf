'use client';

import { useEffect, useState } from 'react';
import type { StatusTarefa } from '@/domain/types';
import { useStore } from '@/data/store';
import { formatarData } from '@/domain/labels';
import { getUsuarioAtual } from '@/data/session';
import { StageTag } from '@/design-system/components/StageTag';
import { StatusBadge } from '@/design-system/components/StatusBadge';
import { Badge } from '@/design-system/components/Badge';
import { Card } from '@/design-system/components/Card';
import { EmptyState } from '@/design-system/components/EmptyState';
import { EnviarEntregaDialog } from '@/features/aluno-tarefas/EnviarEntregaDialog';

const PENDENTES: StatusTarefa[] = ['pendente', 'em_andamento', 'atrasada', 'ajustar'];
const CONCLUIDAS: StatusTarefa[] = ['entregue', 'aprovada'];

export function MinhasTarefas() {
  const { state } = useStore();
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  if (!montado) return null;

  const usuario = getUsuarioAtual(state);
  if (!usuario) {
    return <EmptyState title="Sessão não encontrada" description="Faça login novamente." />;
  }

  const equipe = state.equipes.find((e) =>
    e.membros.some((m) => m.usuarioId === usuario.id),
  );
  if (!equipe) {
    return (
      <EmptyState
        title="Você ainda não faz parte de uma equipe"
        description="Cadastre sua ideia para começar."
      />
    );
  }

  const etapa = state.etapas.find((e) => e.id === equipe.etapaAtualId);
  const tarefas = state.tarefas.filter((t) => t.equipeId === equipe.id);
  const pendentes = tarefas.filter((t) => PENDENTES.includes(t.status));
  const concluidas = tarefas.filter((t) => CONCLUIDAS.includes(t.status));

  function LinhaTarefa({
    tarefaId,
  }: {
    tarefaId: string;
  }) {
    const t = tarefas.find((x) => x.id === tarefaId)!;
    const entregavel = t.status !== 'aprovada';
    return (
      <li className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-2 font-medium text-text">
              {t.titulo}
              {t.obrigatoria && <Badge>obrigatória</Badge>}
            </span>
            <span className="text-xs text-text-muted">Entrega até {formatarData(t.dataEntrega)}</span>
          </div>
          <StatusBadge status={t.status} />
        </div>
        {t.descricao && <p className="text-sm text-text-muted">{t.descricao}</p>}
        {entregavel && <EnviarEntregaDialog tarefa={t} enviadoPor={usuario!.id} />}
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <Card.Body className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-sm text-text-muted">Sua equipe</span>
            <span className="text-lg font-semibold text-text">
              {equipe.nomeIdeia}
            </span>
          </div>
          {etapa && (
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs text-text-muted">Etapa atual</span>
              <StageTag etapaId={equipe.etapaAtualId}>
                {etapa.numero}. {etapa.nome}
              </StageTag>
            </div>
          )}
        </Card.Body>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text">A fazer</h2>
        {pendentes.length === 0 ? (
          <EmptyState title="Tudo em dia" description="Nenhuma tarefa pendente." />
        ) : (
          <ul className="flex flex-col gap-3">
            {pendentes.map((t) => (
              <LinhaTarefa key={t.id} tarefaId={t.id} />
            ))}
          </ul>
        )}
      </section>

      {concluidas.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-text">Concluídas</h2>
          <ul className="flex flex-col gap-3">
            {concluidas.map((t) => (
              <LinhaTarefa key={t.id} tarefaId={t.id} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
