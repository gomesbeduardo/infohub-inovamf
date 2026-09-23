'use client';

import { useState } from 'react';
import type { StatusTarefa } from '@/domain/types';
import type { Tarefa } from '@/data/api/tipos';
import { useEntregas, useEquipe, useEquipes, useIniciarTarefa, useTarefas } from '@/data/api/consultas';
import { formatarData } from '@/domain/labels';
import { StageTag } from '@/design-system/components/StageTag';
import { StatusBadge } from '@/design-system/components/StatusBadge';
import { Badge } from '@/design-system/components/Badge';
import { EmptyState } from '@/design-system/components/EmptyState';
import { Button } from '@/design-system/components/Button';
import { PrazoChip } from '@/design-system/components/PrazoChip';
import { useToast } from '@/design-system/components/Toast';
import { EnviarEntregaDialog } from '@/features/aluno-tarefas/EnviarEntregaDialog';

const PENDENTES: StatusTarefa[] = ['pendente', 'em_andamento', 'atrasada', 'ajustar'];
const CONCLUIDAS: StatusTarefa[] = ['entregue', 'aprovada'];

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

export function MinhasTarefas() {
  const equipesConsulta = useEquipes();

  if (equipesConsulta.isPending || equipesConsulta.isError) {
    return (
      <CarregandoOuErro
        isPending={equipesConsulta.isPending}
        error={equipesConsulta.error}
        refetch={() => void equipesConsulta.refetch()}
      />
    );
  }

  const resumo = equipesConsulta.data[0];
  if (!resumo) {
    return (
      <EmptyState
        title="Você ainda não faz parte de uma equipe"
        description="Cadastre sua ideia para começar."
      />
    );
  }

  return <MinhasTarefasConteudo slug={resumo.slug} />;
}

function MinhasTarefasConteudo({ slug }: { slug: string }) {
  const equipeConsulta = useEquipe(slug);
  const tarefasConsulta = useTarefas(slug);

  if (equipeConsulta.isPending || tarefasConsulta.isPending) {
    return <CarregandoOuErro isPending error={null} refetch={() => {}} />;
  }
  if (equipeConsulta.isError) {
    return (
      <CarregandoOuErro
        isPending={false}
        error={equipeConsulta.error}
        refetch={() => void equipeConsulta.refetch()}
      />
    );
  }
  if (tarefasConsulta.isError) {
    return (
      <CarregandoOuErro
        isPending={false}
        error={tarefasConsulta.error}
        refetch={() => void tarefasConsulta.refetch()}
      />
    );
  }

  const equipe = equipeConsulta.data;
  const tarefas = tarefasConsulta.data;
  const pendentes = tarefas.filter((t) => PENDENTES.includes(t.status));
  const concluidas = tarefas.filter((t) => CONCLUIDAS.includes(t.status));
  const nomeLider = equipe.membros.find((m) => m.papel === 'lider')?.nome ?? '';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-text-muted">{equipe.nomeIdeia}</span>
        <StageTag etapaId={equipe.etapa.numero}>
          {equipe.etapa.numero}. {equipe.etapa.nome}
        </StageTag>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text">A fazer</h2>
        {pendentes.length === 0 ? (
          <EmptyState title="Tudo em dia" description="Nenhuma tarefa pendente." />
        ) : (
          <ul className="flex flex-col gap-3">
            {pendentes.map((t) => (
              <LinhaTarefa
                key={t.slug}
                tarefa={t}
                equipeSlug={equipe.slug}
                souLider={equipe.souLider}
                nomeLider={nomeLider}
              />
            ))}
          </ul>
        )}
      </section>

      {concluidas.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-text">Concluídas</h2>
          <ul className="flex flex-col gap-3">
            {concluidas.map((t) => (
              <LinhaTarefa
                key={t.slug}
                tarefa={t}
                equipeSlug={equipe.slug}
                souLider={equipe.souLider}
                nomeLider={nomeLider}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function LinhaTarefa({
  tarefa,
  equipeSlug,
  souLider,
  nomeLider,
}: {
  tarefa: Tarefa;
  equipeSlug: string;
  souLider: boolean;
  nomeLider: string;
}) {
  const entregavel = tarefa.status !== 'aprovada';
  const entregasConsulta = useEntregas(tarefa.slug);
  const iniciar = useIniciarTarefa(equipeSlug);
  const toast = useToast();
  const [erroInicio, setErroInicio] = useState<string | null>(null);
  const entregas = [...(entregasConsulta.data ?? [])].sort((a, b) => a.versao - b.versao);
  const ultima = entregas[entregas.length - 1];
  const comentarioAjuste =
    tarefa.status === 'ajustar' ? (ultima?.avaliacoes[0]?.comentario ?? null) : null;

  function comecar() {
    setErroInicio(null);
    iniciar.mutate(tarefa.slug, {
      onSuccess: () => toast.sucesso('Tarefa marcada como em andamento.'),
      onError: (err) =>
        setErroInicio(err instanceof Error ? err.message : 'Não foi possível atualizar a tarefa.'),
    });
  }

  return (
    <li
      id={`tarefa-${tarefa.slug}`}
      className="flex scroll-mt-28 flex-col gap-2 rounded-lg border border-border bg-surface p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-2 font-medium text-text">
            {tarefa.titulo}
            {tarefa.obrigatoria && <Badge>obrigatória</Badge>}
          </span>
          <span className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
            Entrega até {formatarData(tarefa.dataEntrega.slice(0, 10))}
            <PrazoChip dataEntrega={tarefa.dataEntrega} status={tarefa.status} />
          </span>
        </div>
        <StatusBadge status={tarefa.status} />
      </div>
      {tarefa.descricao && <p className="text-sm text-text-muted">{tarefa.descricao}</p>}
      {comentarioAjuste && (
        <p
          className="rounded-md px-3 py-2 text-sm"
          style={{ color: 'var(--st-ajustar-fg)', background: 'var(--st-ajustar-bg)' }}
        >
          <span className="font-medium">Ajustes solicitados: </span>
          {comentarioAjuste}
        </p>
      )}
      {erroInicio && (
        <p
          role="alert"
          className="rounded-[0.625rem] bg-danger-soft px-3 py-2 text-sm font-medium text-danger-text"
        >
          {erroInicio}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {souLider ? (
          <>
            {tarefa.status === 'pendente' && (
              <Button size="sm" variant="secondary" disabled={iniciar.isPending} onClick={comecar}>
                Comecei
              </Button>
            )}
            {entregavel && (
              <EnviarEntregaDialog
                tarefaSlug={tarefa.slug}
                equipeSlug={equipeSlug}
                tituloTarefa={tarefa.titulo}
              />
            )}
          </>
        ) : (
          <span className="text-sm text-text-muted">
            Quem envia as entregas é o líder: {nomeLider}
          </span>
        )}
      </div>
    </li>
  );
}
