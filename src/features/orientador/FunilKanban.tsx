'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Equipe } from '@/domain/types';
import { useStore, useActions } from '@/data/store';
import { getUsuarioAtual } from '@/data/session';
import {
  equipesVisiveis,
  filtrarEquipes,
  tarefasObrigatoriasPendentes,
  type FiltrosFunil,
} from '@/data/repository';
import { StageTag } from '@/design-system/components/StageTag';
import { StatusBadge } from '@/design-system/components/StatusBadge';
import { Badge } from '@/design-system/components/Badge';
import { EmptyState } from '@/design-system/components/EmptyState';
import { FiltrosBar } from '@/features/admin-funil/FiltrosBar';
import { cn } from '@/design-system/cn';

type Destino = number | 'pronta';

function ehPronta(status: string) {
  return status === 'pronta_inovamf' || status === 'encaminhada_inovamf';
}

/**
 * Funil do mentor com arraste (HTML5 drag-and-drop nativo): arrastar um card
 * para outra coluna move a equipe para aquela etapa. O caminho acessível por
 * teclado continua sendo os botões Avançar/Retroceder no detalhe da equipe.
 */
export function FunilKanban() {
  const { state } = useStore();
  const { mover } = useActions();
  const [montado, setMontado] = useState(false);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosFunil>({});
  useEffect(() => setMontado(true), []);

  if (!montado) return null;

  const usuario = getUsuarioAtual(state);
  if (!usuario) {
    return <EmptyState title="Sessão não encontrada" description="Faça login novamente." />;
  }
  const autorId = usuario.id;

  // escopo do mentor ∩ filtros da barra (busca, área, curso, status, ciclo)
  const visiveis = new Set(equipesVisiveis(state, usuario).map((e) => e.id));
  const equipes = filtrarEquipes(state, filtros).filter((e) => visiveis.has(e.id));
  const etapas = [...state.etapas].sort((a, b) => a.numero - b.numero);

  const colunas: { key: string; titulo: string; cor: string; destino: Destino; equipes: Equipe[] }[] = [
    ...etapas.map((et) => ({
      key: `etapa-${et.id}`,
      titulo: `${et.numero}. ${et.nome}`,
      cor: `var(--stage-${et.id})`,
      destino: et.id as Destino,
      equipes: equipes.filter((e) => !ehPronta(e.status) && e.etapaAtualId === et.id),
    })),
    {
      key: 'pronta',
      titulo: 'Pronta p/ InovAMF',
      cor: 'var(--stage-pronta)',
      destino: 'pronta' as Destino,
      equipes: equipes.filter((e) => ehPronta(e.status)),
    },
  ];

  function soltarEm(destino: Destino) {
    const equipeId = arrastando;
    setArrastando(null);
    setAlvo(null);
    if (!equipeId) return;
    const equipe = equipes.find((e) => e.id === equipeId);
    if (!equipe) return;

    // mesma coluna → nada a fazer
    if (destino === 'pronta' && ehPronta(equipe.status)) return;
    if (typeof destino === 'number' && destino === equipe.etapaAtualId && !ehPronta(equipe.status)) {
      return;
    }

    // avançar com obrigatória pendente exige confirmação (RN-01)
    const avancando = typeof destino === 'number' && destino > equipe.etapaAtualId;
    if (avancando) {
      const pendentes = tarefasObrigatoriasPendentes(state, equipe.id, equipe.etapaAtualId);
      if (pendentes.length > 0) {
        const ok = window.confirm(
          `"${equipe.nomeIdeia}" tem ${pendentes.length} tarefa(s) obrigatória(s) pendente(s) na etapa atual. Mover mesmo assim (forçado)?`,
        );
        if (!ok) return;
        mover(equipe.id, { destino, autorId, forcar: true });
        return;
      }
    }
    mover(equipe.id, { destino, autorId });
  }

  return (
    <div className="flex flex-col gap-4">
      <FiltrosBar filtros={filtros} onChange={setFiltros} ocultarMentor />

      <div className="scroll-suave flex gap-4 overflow-x-auto pb-4">
        {colunas.map((col) => (
        <section
          key={col.key}
          data-testid="coluna-kanban"
          onDragOver={(e) => {
            e.preventDefault();
            if (alvo !== col.key) setAlvo(col.key);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setAlvo(null);
          }}
          onDrop={() => soltarEm(col.destino)}
          className={cn(
            'flex w-72 shrink-0 flex-col gap-3 overflow-hidden rounded-2xl border bg-surface-sunken transition-colors',
            alvo === col.key ? 'border-border-strong ring-2 ring-primary/40' : 'border-border',
          )}
        >
          <header className="flex items-center justify-between gap-2 border-b border-border px-3 pb-2.5 pt-3">
            <span className="flex items-center gap-2">
              <span className="h-4 w-1 rounded-full" style={{ background: col.cor }} aria-hidden />
              <h3 className="text-sm font-semibold text-text">{col.titulo}</h3>
            </span>
            <span className="rounded-full bg-surface px-2 py-0.5 font-display text-xs text-text-muted">
              {col.equipes.length}
            </span>
          </header>
          <div className="flex min-h-[3rem] flex-col gap-2 px-3 pb-3">
            {col.equipes.length === 0 ? (
              <p className="px-1 py-4 text-center text-xs text-text-subtle">Arraste equipes para cá</p>
            ) : (
              col.equipes.map((e) => (
                <CardArrastavel
                  key={e.id}
                  equipe={e}
                  arrastando={arrastando === e.id}
                  onDragStart={() => setArrastando(e.id)}
                  onDragEnd={() => {
                    setArrastando(null);
                    setAlvo(null);
                  }}
                />
              ))
            )}
          </div>
        </section>
        ))}
      </div>
    </div>
  );
}

function CardArrastavel({
  equipe,
  arrastando,
  onDragStart,
  onDragEnd,
}: {
  equipe: Equipe;
  arrastando: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const { state } = useStore();
  const area = state.areas.find((a) => a.id === equipe.areaId);
  const atrasadas = state.tarefas.filter(
    (t) => t.equipeId === equipe.id && t.status === 'atrasada',
  ).length;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', equipe.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      data-testid="equipe-card"
      className={cn(
        'flex cursor-grab flex-col gap-2 rounded-lg border border-border bg-surface p-3 transition-colors hover:border-border-strong active:cursor-grabbing',
        arrastando && 'opacity-50',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/orientador/equipes/${equipe.slug}`}
          draggable={false}
          className="font-medium text-text hover:underline"
        >
          {equipe.nomeIdeia}
        </Link>
        <StageTag etapaId={equipe.etapaAtualId} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {area && <Badge tone="brand">{area.nome}</Badge>}
      </div>
      {atrasadas > 0 && (
        <div className="flex items-center gap-1">
          <StatusBadge status="atrasada" />
          <span className="text-xs text-text-muted">
            {atrasadas} tarefa{atrasadas > 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
