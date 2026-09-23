'use client';

import type { EquipeDetalhe, Tarefa } from '@/data/api/tipos';
import { useEntregas, useTarefas } from '@/data/api/consultas';
import { formatarData } from '@/domain/labels';
import { StatusBadge } from '@/design-system/components/StatusBadge';
import { EmptyState } from '@/design-system/components/EmptyState';
import { Button } from '@/design-system/components/Button';
import { PrazoChip } from '@/design-system/components/PrazoChip';
import { AvaliarEntrega } from '@/features/admin-tarefas/AvaliarEntrega';
import { NovaTarefaDialog } from '@/features/admin-tarefas/NovaTarefaDialog';

/** Aba "Tarefas" do detalhe da equipe (admin/mentor): lista, entregas e avaliação. */
export function TarefaList({ equipe }: { equipe: EquipeDetalhe }) {
  const consulta = useTarefas(equipe.slug);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text">Tarefas da equipe</h3>
        <NovaTarefaDialog equipeSlug={equipe.slug} etapaAtual={equipe.etapa.numero} />
      </div>

      {consulta.isPending ? (
        <p className="text-sm text-text-muted">Carregando…</p>
      ) : consulta.isError ? (
        <div className="flex flex-col items-start gap-2">
          <p
            role="alert"
            className="rounded-[0.625rem] bg-danger-soft px-3 py-2 text-sm font-medium text-danger-text"
          >
            {consulta.error.message}
          </p>
          <Button variant="secondary" onClick={() => void consulta.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : consulta.data.length === 0 ? (
        <EmptyState
          title="Nenhuma tarefa"
          description="Crie a primeira tarefa desta equipe."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {consulta.data.map((t) => (
            <TarefaItem key={t.slug} tarefa={t} equipeSlug={equipe.slug} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TarefaItem({ tarefa, equipeSlug }: { tarefa: Tarefa; equipeSlug: string }) {
  const entregasConsulta = useEntregas(tarefa.slug);
  const entregas = [...(entregasConsulta.data ?? [])].sort((a, b) => a.versao - b.versao);
  const ultima = entregas[entregas.length - 1];

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col">
          <span className="font-medium text-text">
            {tarefa.titulo}
            {tarefa.obrigatoria && (
              <span className="ml-2 text-xs text-primary-text">obrigatória</span>
            )}
          </span>
          <span className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
            Entrega até {formatarData(tarefa.dataEntrega.slice(0, 10))}
            <PrazoChip dataEntrega={tarefa.dataEntrega} status={tarefa.status} />
          </span>
        </div>
        <StatusBadge status={tarefa.status} />
      </div>

      {tarefa.descricao && <p className="text-sm text-text-muted">{tarefa.descricao}</p>}

      {entregasConsulta.isPending ? (
        <p className="text-xs text-text-muted">Carregando entregas…</p>
      ) : entregasConsulta.isError ? (
        <div className="flex flex-col items-start gap-1">
          <p
            role="alert"
            className="rounded-[0.625rem] bg-danger-soft px-3 py-2 text-xs font-medium text-danger-text"
          >
            {entregasConsulta.error.message}
          </p>
          <Button size="sm" variant="secondary" onClick={() => void entregasConsulta.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : (
        entregas.length > 0 && (
          <div className="flex flex-col gap-1 rounded-md bg-surface-sunken p-2 text-xs text-text-muted">
            {entregas.map((e) => (
              <div key={e.slug} className="flex flex-wrap items-baseline gap-1">
                <span>v{e.versao} —</span>
                {e.arquivos.map((a, i) => (
                  <span key={i}>
                    {a.url ? (
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary-text underline"
                      >
                        {a.nome ?? a.url}
                      </a>
                    ) : (
                      (a.nome ?? '—')
                    )}
                    {i < e.arquivos.length - 1 ? ',' : ''}
                  </span>
                ))}
              </div>
            ))}
          </div>
        )
      )}

      {ultima && <AvaliarEntrega tarefa={tarefa} entrega={ultima} equipeSlug={equipeSlug} />}
    </li>
  );
}
