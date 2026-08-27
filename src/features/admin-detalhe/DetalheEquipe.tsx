'use client';

import { useStore } from '@/data/store';
import {
  ESTAGIO_LABEL,
  STATUS_EQUIPE_LABEL,
} from '@/domain/labels';
import { StageTag } from '@/design-system/components/StageTag';
import { Badge } from '@/design-system/components/Badge';
import { Avatar } from '@/design-system/components/Avatar';
import { Card } from '@/design-system/components/Card';
import { Tabs } from '@/design-system/components/Tabs';
import { EmptyState } from '@/design-system/components/EmptyState';
import { AvancarEtapa } from '@/features/admin-detalhe/AvancarEtapa';
import { HistoricoEtapas } from '@/features/admin-detalhe/HistoricoEtapas';
import { TarefaList } from '@/features/admin-tarefas/TarefaList';

export function DetalheEquipe({ slug }: { slug: string }) {
  const { state } = useStore();
  const equipe = state.equipes.find((e) => e.slug === slug);

  if (!equipe) {
    return (
      <EmptyState
        title="Equipe não encontrada"
        description="Verifique o endereço ou volte ao funil."
      />
    );
  }

  const area = state.areas.find((a) => a.id === equipe.areaId);
  const mentor = state.usuarios.find((u) => u.id === equipe.mentorId);
  const etapa = state.etapas.find((e) => e.id === equipe.etapaAtualId);

  const visaoGeral = (
    <div className="flex flex-col gap-4">
      <Card>
        <Card.Body className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-text">A ideia</h3>
          <p className="text-sm text-text-muted">{equipe.descricaoIdeia}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            {area && <Badge tone="brand">{area.nome}</Badge>}
            <Badge>{ESTAGIO_LABEL[equipe.estagioIdeia]}</Badge>
          </div>
        </Card.Body>
      </Card>
      <Card>
        <Card.Body className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-text">Membros</h3>
          <ul className="flex flex-col gap-2">
            {equipe.membros.map((m) => (
              <li key={m.usuarioId} className="flex items-center gap-3">
                <Avatar nome={m.nome} />
                <div className="flex flex-col">
                  <span className="text-sm text-text">
                    {m.nome}
                    {m.papel === 'lider' && (
                      <span className="ml-2 text-xs text-primary-text">líder</span>
                    )}
                  </span>
                  <span className="text-xs text-text-muted">{m.curso}</span>
                </div>
              </li>
            ))}
          </ul>
        </Card.Body>
      </Card>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-text">{equipe.nomeIdeia}</h1>
          <StageTag etapaId={equipe.etapaAtualId} />
          <Badge>{STATUS_EQUIPE_LABEL[equipe.status]}</Badge>
        </div>
        <p className="text-sm text-text-muted">
          Etapa atual:{' '}
          <span className="font-medium text-text">
            {etapa ? `${etapa.numero}. ${etapa.nome}` : '—'}
          </span>
          {mentor && <> · Mentor: {mentor.nome}</>}
        </p>
        <AvancarEtapa equipe={equipe} />
      </div>

      <Tabs
        tabs={[
          { id: 'visao', label: 'Visão geral', content: visaoGeral },
          {
            id: 'tarefas',
            label: 'Tarefas',
            content: <TarefaList equipe={equipe} />,
          },
          {
            id: 'historico',
            label: 'Histórico',
            content: <HistoricoEtapas equipeId={equipe.id} />,
          },
        ]}
      />
    </div>
  );
}
