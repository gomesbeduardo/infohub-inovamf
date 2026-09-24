'use client';

import { useState } from 'react';
import { useEquipe } from '@/data/api/consultas';
import { useUsuario } from '@/data/api/useSessao';
import { ApiError } from '@/data/api/erro';
import { ESTAGIO_LABEL } from '@/domain/labels';
import { StageTag } from '@/design-system/components/StageTag';
import { Badge } from '@/design-system/components/Badge';
import { Button } from '@/design-system/components/Button';
import { Card } from '@/design-system/components/Card';
import { Tabs } from '@/design-system/components/Tabs';
import { EmptyState } from '@/design-system/components/EmptyState';
import { AdicionarMembroDialog } from '@/features/equipe/AdicionarMembroDialog';
import { MembrosLista } from '@/features/equipe/MembrosLista';
import { AvancarEtapa } from '@/features/admin-detalhe/AvancarEtapa';
import { LinhaDoTempo } from '@/features/equipe/LinhaDoTempo';
import { AnotacoesInternas } from '@/features/admin-detalhe/AnotacoesInternas';
import { TarefaList } from '@/features/admin-tarefas/TarefaList';
import { POSICAO_PRONTA, posicaoDe } from '@/features/funil/DialogoMover';
import { GestaoEquipe } from '@/features/admin-detalhe/GestaoEquipe';
import { EnviarLembreteDialog } from '@/features/admin-detalhe/EnviarLembreteDialog';
import { Skeleton } from '@/design-system/components/Skeleton';
import { AreaTag } from '@/design-system/components/AreaTag';
import { StatusEquipeTag } from '@/design-system/components/StatusEquipeTag';

/** Detalhe da equipe para admin e mentor (rotas /admin/equipes/:slug e /orientador/equipes/:slug). */
export function DetalheEquipe({ slug, abaInicial }: { slug: string; abaInicial?: string }) {
  // `?aba=tarefas` (mesa do mentor / agenda do admin) abre direto onde se avalia.
  const [aba, setAba] = useState(abaInicial ?? 'visao');
  const consulta = useEquipe(slug);
  const usuario = useUsuario();

  if (consulta.isPending) {
    return <Skeleton linhas={6} />;
  }

  if (consulta.isError) {
    if (consulta.error instanceof ApiError && consulta.error.status === 404) {
      return <EmptyState title="Equipe não encontrada" description="Verifique o endereço ou volte ao funil." />;
    }
    return (
      <div className="flex flex-col items-start gap-3">
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
    );
  }

  const equipe = consulta.data;
  // Quem move a equipe no funil: admin ou o mentor dela. Integrantes/convites:
  // esses e também o líder. O backend confere de novo em cada endpoint.
  const podeMover = !!usuario && (usuario.role === 'admin' || equipe.mentor?.slug === usuario.slug);
  const lider = equipe.membros.find((m) => m.papel === 'lider');
  const podeGerirMembros = podeMover || (!!usuario && lider?.slug === usuario.slug);
  const pronta = posicaoDe(equipe) === POSICAO_PRONTA;
  const ehAdmin = usuario?.role === 'admin';

  const visaoGeral = (
    <div className="flex flex-col gap-4">
      <Card>
        <Card.Body className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-text">A ideia</h3>
          <p className="whitespace-pre-line text-sm text-text-muted">{equipe.descricaoIdeia}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            {equipe.area && <AreaTag area={equipe.area} />}
            <Badge>{ESTAGIO_LABEL[equipe.estagio]}</Badge>
          </div>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-1 pt-2 text-sm sm:grid-cols-2">
            <div className="flex gap-1.5">
              <dt className="text-text-muted">Ciclo:</dt>
              <dd className="text-text">{equipe.ciclo ?? '—'}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-text-muted">Como conheceu:</dt>
              <dd className="text-text">{equipe.origemDivulgacao ?? '—'}</dd>
            </div>
          </dl>
        </Card.Body>
      </Card>
      <Card>
        <Card.Body className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-text">Membros</h3>
            {podeGerirMembros && <AdicionarMembroDialog equipeSlug={equipe.slug} />}
          </div>
          <MembrosLista equipeSlug={equipe.slug} membros={equipe.membros} podeGerir={podeGerirMembros} />
        </Card.Body>
      </Card>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-text">{equipe.nomeIdeia}</h1>
          <StageTag etapaId={pronta ? POSICAO_PRONTA : equipe.etapa.numero}>
            {pronta ? 'Pronta' : undefined}
          </StageTag>
          <StatusEquipeTag status={equipe.status} />
        </div>
        <p className="text-sm text-text-muted">
          Etapa atual:{' '}
          <span className="font-medium text-text">
            {equipe.etapa.numero}. {equipe.etapa.nome}
          </span>
          {' · '}Mentor: <span className="text-text">{equipe.mentor?.nome ?? 'sem mentor'}</span>
        </p>
        {podeMover && (
          <div className="flex flex-col gap-3">
            <AvancarEtapa equipe={equipe} />
            <div>
              <EnviarLembreteDialog equipeSlug={equipe.slug} />
            </div>
          </div>
        )}
      </div>

      <Tabs
        active={aba}
        onChange={setAba}
        tabs={[
          { id: 'visao', label: 'Visão geral', content: visaoGeral },
          { id: 'tarefas', label: 'Tarefas', content: <TarefaList equipe={equipe} /> },
          { id: 'anotacoes', label: 'Anotações', content: <AnotacoesInternas equipeSlug={equipe.slug} /> },
          { id: 'linha', label: 'Linha do tempo', content: <LinhaDoTempo equipeSlug={equipe.slug} /> },
          ...(ehAdmin ? [{ id: 'gestao', label: 'Gestão', content: <GestaoEquipe equipe={equipe} /> }] : []),
        ]}
      />
    </div>
  );
}
