'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { StatusTarefa } from '@/domain/types';
import { useStore } from '@/data/store';
import { getUsuarioAtual } from '@/data/session';
import {
  ESTAGIO_LABEL,
  STATUS_EQUIPE_LABEL,
  formatarData,
} from '@/domain/labels';
import { Card } from '@/design-system/components/Card';
import { Badge } from '@/design-system/components/Badge';
import { Avatar } from '@/design-system/components/Avatar';
import { StageTag } from '@/design-system/components/StageTag';
import { StageProgress } from '@/design-system/components/StageProgress';
import { EmptyState } from '@/design-system/components/EmptyState';
import { Button } from '@/design-system/components/Button';
import { ChevronRightIcon } from '@/design-system/icons';
import { AdicionarMembroDialog } from '@/features/equipe/AdicionarMembroDialog';

const PENDENTES: StatusTarefa[] = ['pendente', 'em_andamento', 'atrasada', 'ajustar'];

export function MinhaEquipe() {
  const { state } = useStore();
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  if (!montado) return null;

  const usuario = getUsuarioAtual(state);
  if (!usuario) {
    return (
      <EmptyState title="Sessão não encontrada" description="Faça login novamente." />
    );
  }

  const equipe = state.equipes.find((e) =>
    e.membros.some((m) => m.usuarioId === usuario.id),
  );
  if (!equipe) {
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

  const area = state.areas.find((a) => a.id === equipe.areaId);
  const mentor = state.usuarios.find((u) => u.id === equipe.mentorId);
  const tarefas = state.tarefas.filter((t) => t.equipeId === equipe.id);
  const pendentes = tarefas.filter((t) => PENDENTES.includes(t.status));
  const atrasadas = pendentes.filter((t) => t.status === 'atrasada').length;
  const proxima = pendentes
    .map((t) => t.dataEntrega)
    .sort()
    .at(0);
  const pronta =
    equipe.status === 'pronta_inovamf' || equipe.status === 'encaminhada_inovamf';
  const ehLider = equipe.membros.some(
    (m) => m.usuarioId === usuario.id && m.papel === 'lider',
  );

  return (
    <div className="flex flex-col gap-5">
      {/* A ideia */}
      <Card>
        <Card.Body className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-text-muted">Sua ideia</span>
              <h2 className="text-2xl font-semibold text-text">
                {equipe.nomeIdeia}
              </h2>
            </div>
            <StageTag etapaId={equipe.etapaAtualId} />
          </div>
          <p className="text-sm text-text-muted">{equipe.descricaoIdeia}</p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {area && <Badge tone="brand">{area.nome}</Badge>}
            <Badge>{ESTAGIO_LABEL[equipe.estagioIdeia]}</Badge>
            <Badge>{STATUS_EQUIPE_LABEL[equipe.status]}</Badge>
          </div>
        </Card.Body>
      </Card>

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
            <StageProgress
              etapas={state.etapas}
              atualId={equipe.etapaAtualId}
              pronta={pronta}
            />
          </Card.Body>
        </Card>

        {/* Equipe */}
        <Card>
          <Card.Header className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text">Equipe</h3>
            {mentor && (
              <span className="text-xs text-text-muted">
                Mentor: {mentor.nome}
              </span>
            )}
          </Card.Header>
          <Card.Body>
            <ul className="flex flex-col gap-3">
              {equipe.membros.map((m) => (
                <li key={m.usuarioId} className="flex items-center gap-3">
                  <Avatar nome={m.nome} />
                  <div className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-2 text-sm text-text">
                      {m.nome}
                      {m.papel === 'lider' && <Badge tone="brand">líder</Badge>}
                    </span>
                    <span className="text-xs text-text-muted">{m.curso}</span>
                  </div>
                </li>
              ))}
            </ul>
            {ehLider && (
              <div className="mt-3">
                <AdicionarMembroDialog equipeId={equipe.id} />
              </div>
            )}
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}
