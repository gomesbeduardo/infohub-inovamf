'use client';

import type { Equipe } from '@/domain/types';
import { useStore } from '@/data/store';
import { StatusBadge } from '@/design-system/components/StatusBadge';
import { EmptyState } from '@/design-system/components/EmptyState';
import { AvaliarEntrega } from '@/features/admin-tarefas/AvaliarEntrega';
import { NovaTarefaDialog } from '@/features/admin-tarefas/NovaTarefaDialog';

export function TarefaList({ equipe }: { equipe: Equipe }) {
  const { state } = useStore();
  const tarefas = state.tarefas.filter((t) => t.equipeId === equipe.id);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text">Tarefas da equipe</h3>
        <NovaTarefaDialog equipe={equipe} />
      </div>

      {tarefas.length === 0 ? (
        <EmptyState
          title="Nenhuma tarefa"
          description="Crie a primeira tarefa desta equipe."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {tarefas.map((t) => {
            const entregas = state.entregas
              .filter((e) => e.tarefaId === t.id)
              .slice()
              .sort((a, b) => a.versao - b.versao);
            const ultima = entregas[entregas.length - 1];

            return (
              <li
                key={t.id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="font-medium text-text">
                      {t.titulo}
                      {t.obrigatoria && (
                        <span className="ml-2 text-xs text-primary-text">
                          obrigatória
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-text-muted">
                      Entrega até {t.dataEntrega}
                    </span>
                  </div>
                  <StatusBadge status={t.status} />
                </div>

                {t.descricao && (
                  <p className="text-sm text-text-muted">{t.descricao}</p>
                )}

                {entregas.length > 0 && (
                  <div className="flex flex-col gap-1 rounded-md bg-surface-sunken p-2 text-xs text-text-muted">
                    {entregas.map((e) => (
                      <span key={e.id}>
                        v{e.versao} —{' '}
                        {e.arquivos
                          .map((a) =>
                            a.tipo === 'link' ? a.urlExterna : a.nomeOriginal,
                          )
                          .join(', ')}
                      </span>
                    ))}
                  </div>
                )}

                {ultima && <AvaliarEntrega tarefa={t} entrega={ultima} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
