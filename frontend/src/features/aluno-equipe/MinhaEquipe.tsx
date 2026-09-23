'use client';

import Link from 'next/link';
import type { StatusTarefa } from '@/domain/types';
import { useEquipe, useEquipes, useEtapas, useTarefas } from '@/data/api/consultas';
import { useUsuario } from '@/data/api/useSessao';
import {
  ESTAGIO_LABEL,
  STATUS_EQUIPE_LABEL,
  formatarData,
} from '@/domain/labels';
import { Card } from '@/design-system/components/Card';
import { Badge } from '@/design-system/components/Badge';
import { StageTag } from '@/design-system/components/StageTag';
import { StageProgress } from '@/design-system/components/StageProgress';
import { EmptyState } from '@/design-system/components/EmptyState';
import { Button } from '@/design-system/components/Button';
import { ChevronRightIcon } from '@/design-system/icons';
import { AdicionarMembroDialog } from '@/features/equipe/AdicionarMembroDialog';
import { LinhaDoTempo } from '@/features/equipe/LinhaDoTempo';
import { MembrosLista } from '@/features/equipe/MembrosLista';
import { ProximoPasso } from '@/features/aluno-equipe/ProximoPasso';
import { POSICAO_PRONTA } from '@/features/funil/DialogoMover';

const PENDENTES: StatusTarefa[] = ['pendente', 'em_andamento', 'atrasada', 'ajustar'];

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

export function MinhaEquipe() {
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
        action={
          <Link href="/cadastro">
            <Button size="sm">Cadastrar ideia</Button>
          </Link>
        }
      />
    );
  }

  return <MinhaEquipeConteudo slug={resumo.slug} />;
}

function MinhaEquipeConteudo({ slug }: { slug: string }) {
  const usuario = useUsuario();
  const equipeConsulta = useEquipe(slug);
  const etapasConsulta = useEtapas();
  const tarefasConsulta = useTarefas(slug);

  if (equipeConsulta.isPending || etapasConsulta.isPending) {
    return (
      <CarregandoOuErro
        isPending
        error={null}
        refetch={() => {}}
      />
    );
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
  if (etapasConsulta.isError) {
    return (
      <CarregandoOuErro
        isPending={false}
        error={etapasConsulta.error}
        refetch={() => void etapasConsulta.refetch()}
      />
    );
  }

  const equipe = equipeConsulta.data;
  const etapas = etapasConsulta.data.map((e) => ({ id: e.numero, numero: e.numero, nome: e.nome }));
  const tarefas = tarefasConsulta.data ?? [];
  const pendentes = tarefas.filter((t) => PENDENTES.includes(t.status));
  const atrasadas = pendentes.filter((t) => t.status === 'atrasada').length;
  const proxima = pendentes
    .map((t) => t.dataEntrega.slice(0, 10))
    .sort()
    .at(0);
  const pronta = equipe.status === 'pronta_inovamf' || equipe.status === 'encaminhada_inovamf';
  const lider = equipe.membros.find((m) => m.papel === 'lider');
  const ehLider = !!usuario && lider?.slug === usuario.slug;

  return (
    <div className="flex flex-col gap-5">
      {/* A ideia */}
      <Card>
        <Card.Body className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-text-muted">Sua ideia</span>
              <h2 className="text-2xl font-semibold text-text">{equipe.nomeIdeia}</h2>
            </div>
            <StageTag etapaId={pronta ? POSICAO_PRONTA : equipe.etapa.numero}>
              {pronta ? 'Pronta' : undefined}
            </StageTag>
          </div>
          <p className="text-sm text-text-muted">{equipe.descricaoIdeia}</p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {equipe.area && <Badge tone="brand">{equipe.area}</Badge>}
            <Badge>{ESTAGIO_LABEL[equipe.estagio]}</Badge>
            <Badge>{STATUS_EQUIPE_LABEL[equipe.status]}</Badge>
          </div>
        </Card.Body>
      </Card>

      <ProximoPasso equipe={equipe} />

      {/* Atalho para tarefas */}
      <Link
        href="/aluno/tarefas"
        className="group flex items-center justify-between gap-3 rounded-[1.25rem] border border-border bg-surface px-5 py-4 shadow-sm transition-colors hover:border-border-strong"
      >
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-text">Minhas tarefas</span>
          <span className="text-sm text-text-muted">
            {pendentes.length === 0
              ? 'Nenhuma tarefa pendente — tudo em dia.'
              : `${pendentes.length} pendente${pendentes.length > 1 ? 's' : ''}${
                  atrasadas > 0 ? ` · ${atrasadas} atrasada${atrasadas > 1 ? 's' : ''}` : ''
                }${proxima ? ` · próxima até ${formatarData(proxima)}` : ''}`}
          </span>
        </div>
        <ChevronRightIcon
          size={20}
          className="shrink-0 text-text-subtle transition-colors group-hover:text-text"
        />
      </Link>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Progresso no funil */}
        <Card>
          <Card.Header>
            <h3 className="text-sm font-semibold text-text">Progresso no funil</h3>
          </Card.Header>
          <Card.Body>
            <StageProgress etapas={etapas} atualId={equipe.etapa.numero} pronta={pronta} />
          </Card.Body>
        </Card>

        {/* Equipe */}
        <Card>
          <Card.Header className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text">Equipe</h3>
            {equipe.mentor && (
              <span className="text-xs text-text-muted">Mentor: {equipe.mentor.nome}</span>
            )}
          </Card.Header>
          <Card.Body className="flex flex-col gap-3">
            <MembrosLista equipeSlug={equipe.slug} membros={equipe.membros} podeGerir={ehLider} />
            {ehLider && <AdicionarMembroDialog equipeSlug={equipe.slug} />}
          </Card.Body>
        </Card>
      </div>

      {/* Linha do tempo (resumida) */}
      <Card>
        <Card.Header>
          <h3 className="text-sm font-semibold text-text">Linha do tempo</h3>
        </Card.Header>
        <Card.Body>
          <LinhaDoTempo equipeSlug={equipe.slug} resumida />
        </Card.Body>
      </Card>
    </div>
  );
}
