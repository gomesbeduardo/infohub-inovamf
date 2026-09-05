'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/design-system/cn';

export interface SerieLinha {
  /** Nome exibido na legenda. */
  nome: string;
  /** Cor da linha (CSS, normalmente uma var de token). */
  cor: string;
  /** Valores, um por rótulo do eixo X. */
  valores: number[];
}

export interface LineChartProps {
  series: SerieLinha[];
  /** Rótulos do eixo X (mesma cardinalidade dos valores de cada série). */
  labels: string[];
  /** Rótulo acessível do gráfico como um todo. */
  ariaLabel: string;
  className?: string;
}

const L = 40; // margem esquerda (eixo Y)
const R = 12; // margem direita
const T = 12; // margem superior
const B = 28; // margem inferior (eixo X)
const H = 240; // altura fixa (unidades = px, largura é medida do container)
const LARGURA_INICIAL = 640; // fallback antes de medir (evita salto no 1º render)
const DIVISOES = 4;

/** Opacidade das séries não focadas — esmaecidas, mas ainda visíveis. */
const OPACIDADE_ESMAECIDA = 0.22;

function coordenadas(valores: number[], max: number, W: number) {
  const n = valores.length;
  const larguraUtil = W - L - R;
  const alturaUtil = H - T - B;
  return valores.map((v, i) => {
    const x = n <= 1 ? L : L + (i * larguraUtil) / (n - 1);
    const y = T + alturaUtil - (max === 0 ? 0 : (v / max) * alturaUtil);
    return { x, y };
  });
}

/** x (unidades do viewBox) do rótulo/coluna de índice `i`. */
function xDoIndice(i: number, n: number, W: number) {
  return n <= 1 ? L : L + (i * (W - L - R)) / (n - 1);
}

/**
 * Gráfico de linha em SVG puro e tokenizado (sem dependências). Preenche a
 * largura do container (medida via `ResizeObserver`) com altura fixa, então
 * mantém círculos redondos e texto sem distorção em qualquer tela.
 *
 * A legenda funciona como seletor (tri-estado): sem foco, ambas as séries
 * aparecem cheias; ao focar uma, a outra esmaece mas continua visível. Cada
 * série tem preenchimento em gradiente abaixo da linha. Passar o mouse sobre uma
 * coluna (semana) realça os pontos daquela coluna e mostra um tooltip com os
 * valores — mesmo padrão de hover do gráfico do Admin.
 */
export function LineChart({ series, labels, ariaLabel, className }: LineChartProps) {
  const gradId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  // largura do desenho em px (= largura do container; viewBox 1:1 com pixels)
  const [W, setW] = useState(LARGURA_INICIAL);
  // índice da série em foco (null = ambas cheias)
  const [foco, setFoco] = useState<number | null>(null);
  // índice da coluna (semana) sob o cursor (null = nenhuma)
  const [ativo, setAtivo] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const larg = Math.round(e.contentRect.width);
        if (larg > 0) setW(larg);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const max = Math.max(
    1,
    ...series.flatMap((s) => s.valores),
  );
  // arredonda o topo do eixo para um múltiplo de DIVISOES, para rótulos limpos
  const topo = Math.ceil(max / DIVISOES) * DIVISOES;

  const linhasGrade = Array.from({ length: DIVISOES + 1 }, (_, i) => {
    const y = T + ((H - T - B) * i) / DIVISOES;
    const valor = Math.round(topo - (topo * i) / DIVISOES);
    return { y, valor };
  });

  const n = labels.length;
  const baseY = H - B; // linha de base do preenchimento (eixo X)

  const opacidadeSerie = (i: number) =>
    foco === null || foco === i ? 1 : OPACIDADE_ESMAECIDA;

  const alternarFoco = (i: number) =>
    setFoco((atual) => (atual === i ? null : i));

  return (
    <figure className={cn('flex flex-col gap-3', className)}>
      <figcaption
        role="group"
        aria-label="Selecionar séries do gráfico"
        className="flex flex-wrap items-center gap-2"
      >
        {series.map((s, i) => {
          const ativoFoco = foco === i;
          const esmaecido = foco !== null && foco !== i;
          return (
            <button
              key={s.nome}
              type="button"
              aria-pressed={ativoFoco}
              onClick={() => alternarFoco(i)}
              title={ativoFoco ? 'Mostrar ambas as séries' : `Focar em ${s.nome}`}
              className={cn(
                'inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]',
                ativoFoco
                  ? 'border-primary bg-surface-sunken text-text'
                  : 'border-border text-text-muted hover:border-border-strong hover:text-text',
                esmaecido && 'opacity-60',
              )}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: s.cor }}
                aria-hidden
              />
              {s.nome}
            </button>
          );
        })}
        <span className="ml-1 text-xs text-text-subtle">
          {foco === null ? 'Clique para focar uma série' : 'Clique de novo para ver ambas'}
        </span>
      </figcaption>

      <div ref={wrapRef} className="relative w-full">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          className="h-auto w-full overflow-visible"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={ariaLabel}
        >
          <defs>
            {series.map((s, i) => (
              <linearGradient
                key={s.nome}
                id={`${gradId}-${i}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={s.cor} stopOpacity={0.18} />
                <stop offset="100%" stopColor={s.cor} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>

          {/* grade + rótulos do eixo Y */}
          {linhasGrade.map(({ y, valor }) => (
            <g key={y}>
              <line
                x1={L}
                y1={y}
                x2={W - R}
                y2={y}
                stroke="var(--border)"
                strokeWidth={1}
              />
              <text
                x={L - 8}
                y={y + 4}
                textAnchor="end"
                fontSize={11}
                fill="var(--text-subtle)"
              >
                {valor}
              </text>
            </g>
          ))}

          {/* rótulos do eixo X */}
          {labels.map((lab, i) => (
            <text
              key={`${lab}-${i}`}
              x={xDoIndice(i, n, W)}
              y={H - 8}
              textAnchor="middle"
              fontSize={11}
              fill="var(--text-subtle)"
            >
              {lab}
            </text>
          ))}

          {/* linha-guia vertical da coluna ativa */}
          {ativo !== null && (
            <line
              x1={xDoIndice(ativo, n, W)}
              x2={xDoIndice(ativo, n, W)}
              y1={T}
              y2={baseY}
              stroke="var(--border-strong)"
              strokeWidth={1}
              strokeDasharray="3 3"
              pointerEvents="none"
            />
          )}

          {/* séries: preenchimento + linha + pontos */}
          {series.map((s, i) => {
            const pts = coordenadas(s.valores, topo, W);
            const linha = pts
              .map((p, j) => `${j === 0 ? 'M' : 'L'}${p.x},${p.y}`)
              .join(' ');
            const area =
              pts.length > 0
                ? `M${pts[0].x},${baseY} ` +
                  pts.map((p) => `L${p.x},${p.y}`).join(' ') +
                  ` L${pts[pts.length - 1].x},${baseY} Z`
                : '';
            const op = opacidadeSerie(i);
            return (
              <g key={s.nome} opacity={op} pointerEvents="none">
                {area && <path d={area} fill={`url(#${gradId}-${i})`} stroke="none" />}
                <path
                  d={linha}
                  fill="none"
                  stroke={s.cor}
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {pts.map((p, j) => {
                  const destacado = ativo === j;
                  return destacado ? (
                    <circle
                      key={j}
                      cx={p.x}
                      cy={p.y}
                      r={5}
                      fill={s.cor}
                      stroke="var(--surface-raised)"
                      strokeWidth={2}
                    />
                  ) : (
                    <circle key={j} cx={p.x} cy={p.y} r={3} fill={s.cor} />
                  );
                })}
              </g>
            );
          })}

          {/* zonas de hover invisíveis, uma por coluna (semana) */}
          {labels.map((lab, i) => {
            const x = xDoIndice(i, n, W);
            const larguraCol = n <= 1 ? W - L - R : (W - L - R) / (n - 1);
            return (
              <rect
                key={`hit-${lab}-${i}`}
                x={x - larguraCol / 2}
                y={T}
                width={larguraCol}
                height={baseY - T}
                fill="transparent"
                onMouseEnter={() => setAtivo(i)}
                onMouseLeave={() => setAtivo(null)}
              />
            );
          })}
        </svg>

        {ativo !== null && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-[0.625rem] border border-border bg-surface-raised px-3 py-2 shadow-md"
            style={{
              left: `${(xDoIndice(ativo, n, W) / W) * 100}%`,
              top: `${(Math.min(...series.map((s) => coordenadas(s.valores, topo, W)[ativo].y)) / H) * 100}%`,
            }}
          >
            <p className="whitespace-nowrap text-xs font-medium text-text">
              {labels[ativo]}
            </p>
            <ul className="mt-1 flex flex-col gap-0.5">
              {series.map((s) => (
                <li
                  key={s.nome}
                  className="flex items-center gap-2 whitespace-nowrap text-xs text-text-muted"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: s.cor }}
                    aria-hidden
                  />
                  {s.nome}
                  <span className="ml-auto pl-3 font-semibold tabular-nums text-text">
                    {s.valores[ativo]}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </figure>
  );
}
