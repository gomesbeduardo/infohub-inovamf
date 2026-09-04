'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Equipe, StatusTarefa } from '@/domain/types';
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
import { Button } from '@/design-system/components/Button';
import { EmptyState } from '@/design-system/components/EmptyState';
import { Dialog } from '@/design-system/components/primitives/Dialog';
import { FiltrosBar } from '@/features/admin-funil/FiltrosBar';
import { ExportarCSV } from '@/features/admin-funil/ExportarCSV';
import { cn } from '@/design-system/cn';

type Destino = number | 'pronta';

interface Confirmacao {
  equipe: Equipe;
  destino: Destino;
  pendentes: number;
  etapaNome: string;
}

function ehPronta(status: string) {
  return status === 'pronta_inovamf' || status === 'encaminhada_inovamf';
}

export interface FunilBoardProps {
  /** `admin` vê todas as equipes (com export e âncoras de coluna); `mentor` vê só as suas. */
  modo: 'admin' | 'mentor';
  /** Preset de status vindo de deep-link do dashboard (`/admin?status=…`). */
  statusPreset?: StatusTarefa;
}

/**
 * Funil por etapas com arraste (HTML5 drag-and-drop nativo): arrastar um card
 * para outra coluna move a equipe para aquela etapa (via `mover`, respeitando a
 * RN-01, com confirmação quando forçado). Usado pelo admin e pelo mentor.
 *
 * O caminho acessível por teclado continua sendo os botões Avançar/Retroceder
 * no detalhe da equipe.
 */
export function FunilBoard({ modo, statusPreset }: FunilBoardProps) {
  const { state } = useStore();
  const { mover } = useActions();
  const [montado, setMontado] = useState(false);
  const [filtros, setFiltros] = useState<FiltrosFunil>({});
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<string | null>(null);
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);
  useEffect(() => setMontado(true), []);
  useEffect(() => {
    if (statusPreset) setFiltros((f) => ({ ...f, statusTarefa: statusPreset }));
  }, [statusPreset]);

  if (!montado) return null;

  const ehAdmin = modo === 'admin';
  const usuario = getUsuarioAtual(state);
  if (!ehAdmin && !usuario) {
    return <EmptyState title="Sessão não encontrada" description="Faça login novamente." />;
  }
  const autorId = usuario?.id ?? 'u-admin';

  // escopo por perfil (RNF-03): mentor só vê as suas; admin vê todas
  const scopeIds = usuario
    ? new Set(equipesVisiveis(state, usuario).map((e) => e.id))
    : null;
  const equipes = filtrarEquipes(state, filtros).filter((e) =>
    ehAdmin ? !scopeIds || scopeIds.has(e.id) : scopeIds!.has(e.id),
  );

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

  const testidColuna = ehAdmin ? 'coluna-funil' : 'coluna-kanban';
  const basePath = ehAdmin ? '/admin/equipes' : '/orientador/equipes';

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

    // avançar com obrigatória pendente exige confirmação (RN-01) → abre o modal
    const avancando = typeof destino === 'number' && destino > equipe.etapaAtualId;
    if (avancando) {
      const pendentes = tarefasObrigatoriasPendentes(state, equipe.id, equipe.etapaAtualId);
      if (pendentes.length > 0) {
        setConfirmacao({
          equipe,
          destino,
          pendentes: pendentes.length,
          etapaNome: state.etapas.find((et) => et.id === destino)?.nome ?? `Etapa ${destino}`,
        });
        return;
      }
    }
    mover(equipe.id, { destino, autorId });
  }

  function confirmarMovimento() {
    if (!confirmacao) return;
    mover(confirmacao.equipe.id, {
      destino: confirmacao.destino,
      autorId,
      forcar: true,
    });
    setConfirmacao(null);
  }

  return (
    <div className="flex flex-col gap-4">
      {ehAdmin && (
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-text">Funil de equipes</h2>
          <ExportarCSV equipes={equipes} />
        </div>
      )}
      <FiltrosBar filtros={filtros} onChange={setFiltros} ocultarMentor={!ehAdmin} />

      <div className="scroll-suave flex gap-4 overflow-x-auto pb-4">
        {colunas.map((col) => (
          <section
            key={col.key}
            id={ehAdmin ? `col-${col.key}` : undefined}
            data-testid={testidColuna}
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
              ehAdmin && 'scroll-mt-24',
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
                    basePath={basePath}
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

      <Dialog
        open={confirmacao !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setConfirmacao(null);
        }}
        title="Mover com tarefas pendentes?"
      >
        {confirmacao && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text-muted">
              <span className="font-medium text-text">{confirmacao.equipe.nomeIdeia}</span>{' '}
              tem{' '}
              <span className="font-medium text-text">
                {confirmacao.pendentes} tarefa{confirmacao.pendentes > 1 ? 's' : ''} obrigatória
                {confirmacao.pendentes > 1 ? 's' : ''} pendente
                {confirmacao.pendentes > 1 ? 's' : ''}
              </span>{' '}
              na etapa atual. Mover para{' '}
              <span className="font-medium text-text">{confirmacao.etapaNome}</span> mesmo assim?
              O avanço será registrado como <span className="font-medium text-text">forçado</span>.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmacao(null)}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={confirmarMovimento}>
                Mover mesmo assim
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}

function CardArrastavel({
  equipe,
  basePath,
  arrastando,
  onDragStart,
  onDragEnd,
}: {
  equipe: Equipe;
  basePath: string;
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
        // fixa a imagem de arraste no próprio card — evita o "fantasma" que
        // arrastava o card vizinho junto (default do browser em alguns casos)
        const node = e.currentTarget;
        e.dataTransfer.setDragImage(node, node.offsetWidth / 2, 20);
        // adia a marca visual (opacity) para não entrar no snapshot do ghost
        requestAnimationFrame(onDragStart);
      }}
      onDragEnd={onDragEnd}
      data-testid="equipe-card"
      title="Arraste para mover de etapa"
      className={cn(
        'flex cursor-grab flex-col gap-2 rounded-lg border border-border bg-surface p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md active:cursor-grabbing active:translate-y-0',
        arrastando && 'opacity-50',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`${basePath}/${equipe.slug}`}
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
