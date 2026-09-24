'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { StatusTarefa } from '@/domain/types';
import type { EquipeResumo, FiltrosEquipes, Posicao } from '@/data/api/tipos';
import { useEquipes, useEtapas } from '@/data/api/consultas';
import { useUsuario } from '@/data/api/useSessao';
import { StageTag } from '@/design-system/components/StageTag';
import { StatusBadge } from '@/design-system/components/StatusBadge';
import { Button } from '@/design-system/components/Button';
import { FiltrosBar } from '@/features/admin-funil/FiltrosBar';
import { ExportarCSV } from '@/features/admin-funil/ExportarCSV';
import { DialogoMover, posicaoDe } from '@/features/funil/DialogoMover';
import { limparFiltros, useAdiado } from '@/features/funil/filtros';
import { Skeleton } from '@/design-system/components/Skeleton';
import { cn } from '@/design-system/cn';
import { AreaTag } from '@/design-system/components/AreaTag';

const TITULO_PRONTA = 'Pronta p/ InovAMF';

/**
 * Classes do card de item do kanban — reusadas pela agenda (Task 18) para o
 * mesmo visual (borda, sombra, hover). `motion-safe:` nas classes de
 * transform/transição, então o funil também passa a respeitar
 * `prefers-reduced-motion`.
 */
export const CARTAO_KANBAN =
  'rounded-lg border border-border bg-surface p-3 shadow-sm motion-safe:transition-all motion-safe:hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md';

export interface FunilBoardProps {
  /** `admin` vê todas as equipes (com export e âncoras de coluna); `mentor` vê só as suas. */
  modo: 'admin' | 'mentor';
  /** Preset de status vindo de deep-link do dashboard (`/admin?status=…`). */
  statusPreset?: StatusTarefa;
}

interface Coluna {
  key: string;
  titulo: string;
  cor: string;
  destino: Posicao;
  equipes: EquipeResumo[];
}

interface Movimento {
  equipe: EquipeResumo;
  destino: Posicao;
  origemLabel: string;
  destinoLabel: string;
}

/**
 * Funil por etapas com arraste (HTML5 drag-and-drop nativo), na API real.
 * Soltar um card em outra coluna abre o `DialogoMover` (RN-01 vem do backend).
 * O escopo por papel também vem do backend (mentor recebe só as suas equipes).
 *
 * O caminho acessível por teclado continua sendo os botões Avançar/Retroceder
 * no detalhe da equipe.
 */
export function FunilBoard({ modo, statusPreset }: FunilBoardProps) {
  const usuario = useUsuario();
  const ehAdmin = modo === 'admin';
  // filtro de mentor só para quem é admin de fato (useUsuarios('mentor') é só admin)
  const mostrarMentor = ehAdmin && usuario?.role === 'admin';

  const [filtros, setFiltros] = useState<FiltrosEquipes>(() =>
    statusPreset ? { statusTarefa: statusPreset } : {},
  );
  useEffect(() => {
    if (statusPreset) setFiltros((f) => ({ ...f, statusTarefa: statusPreset }));
  }, [statusPreset]);

  const qAdiado = useAdiado(filtros.q);
  const filtrosApi = useMemo(
    () => limparFiltros({ ...filtros, q: qAdiado, mentor: mostrarMentor ? filtros.mentor : undefined }),
    [filtros, qAdiado, mostrarMentor],
  );

  const consulta = useEquipes(filtrosApi);
  const etapasQ = useEtapas();

  const [arrastando, setArrastando] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<string | null>(null);
  const [movimento, setMovimento] = useState<Movimento | null>(null);

  const equipes = useMemo(() => consulta.data ?? [], [consulta.data]);
  const colunas: Coluna[] = useMemo(() => {
    const etapas = [...(etapasQ.data ?? [])].sort((a, b) => a.numero - b.numero);
    return [
      ...etapas.map((et) => ({
        key: `etapa-${et.numero}`,
        titulo: `${et.numero}. ${et.nome}`,
        cor: `var(--stage-${et.numero})`,
        destino: et.numero as Posicao,
        equipes: equipes.filter((e) => posicaoDe(e) === et.numero),
      })),
      {
        key: 'pronta',
        titulo: TITULO_PRONTA,
        cor: 'var(--stage-pronta)',
        destino: 'pronta' as Posicao,
        equipes: equipes.filter((e) => posicaoDe(e) === 7),
      },
    ];
  }, [equipes, etapasQ.data]);

  const testidColuna = ehAdmin ? 'coluna-funil' : 'coluna-kanban';
  const basePath = ehAdmin ? '/admin/equipes' : '/orientador/equipes';

  function rotulo(e: EquipeResumo) {
    return posicaoDe(e) === 7 ? TITULO_PRONTA : `${e.etapa.numero}. ${e.etapa.nome}`;
  }

  function soltarEm(col: Coluna) {
    const slug = arrastando;
    setArrastando(null);
    setAlvo(null);
    const equipe = equipes.find((e) => e.slug === slug);
    if (!equipe) return;
    const destino = col.destino === 'pronta' ? 7 : col.destino;
    if (destino === posicaoDe(equipe)) return; // mesma coluna → nada a fazer
    setMovimento({ equipe, destino: col.destino, origemLabel: rotulo(equipe), destinoLabel: col.titulo });
  }

  const carregando = consulta.isPending || etapasQ.isPending;
  const erro = consulta.isError ? consulta.error : etapasQ.isError ? etapasQ.error : null;

  return (
    <div className="flex flex-col gap-4">
      {ehAdmin && (
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-text">Funil de equipes</h2>
          <ExportarCSV filtros={filtrosApi} desabilitado={equipes.length === 0} />
        </div>
      )}
      <FiltrosBar filtros={filtros} onChange={setFiltros} ocultarMentor={!mostrarMentor} />

      {erro ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-10 text-center">
          <p role="alert" className="text-sm font-medium text-danger-text">
            {erro.message}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (consulta.isError) void consulta.refetch();
              if (etapasQ.isError) void etapasQ.refetch();
            }}
          >
            Tentar de novo
          </Button>
        </div>
      ) : carregando ? (
        <Skeleton linhas={5} className="px-1 py-6" />
      ) : (
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
              onDrop={() => soltarEm(col)}
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
                      key={e.slug}
                      equipe={e}
                      basePath={basePath}
                      arrastando={arrastando === e.slug}
                      onDragStart={() => setArrastando(e.slug)}
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
      )}

      {movimento && (
        <DialogoMover
          key={`${movimento.equipe.slug}-${String(movimento.destino)}`}
          equipe={movimento.equipe}
          destino={movimento.destino}
          origemLabel={movimento.origemLabel}
          destinoLabel={movimento.destinoLabel}
          onClose={() => setMovimento(null)}
        />
      )}
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
  equipe: EquipeResumo;
  basePath: string;
  arrastando: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const atrasadas = equipe.tarefasAtrasadas;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', equipe.slug);
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
        CARTAO_KANBAN,
        'flex cursor-grab flex-col gap-2 active:cursor-grabbing active:translate-y-0',
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
        <StageTag etapaId={equipe.etapa.numero} variante="ponto" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {equipe.area && <AreaTag area={equipe.area} />}
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
