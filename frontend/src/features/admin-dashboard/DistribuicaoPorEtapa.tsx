'use client';

import { useId, useState } from 'react';
import { Card } from '@/design-system/components/Card';
import { Button } from '@/design-system/components/Button';
import { StageTag } from '@/design-system/components/StageTag';

export interface PontoEtapa {
  numero: number;
  nome: string;
  total: number;
}

// Geometria do desenho (unidades do viewBox — o SVG escala uniformemente).
const L = 64; // gutter esquerdo: rótulo "Etapa N"
const R = 36; // folga direita: rótulo do valor no fim da barra
const TOPO = 6;
const LARG = 720;
const ALT_BARRA = 14; // espessura de cada barra (fina, para fechar com as KPIs)
const GAP = 10; // respiro entre barras

/** Ticks "redondos" do eixo de valor a partir do maior total da série. */
function ticksY(max: number): number[] {
  const passo = max <= 4 ? 1 : max <= 10 ? 2 : Math.ceil(max / 5);
  const topo = Math.ceil(max / passo) * passo;
  const ts: number[] = [];
  for (let v = 0; v <= topo; v += passo) ts.push(v);
  return ts;
}

/**
 * Distribuição das equipes ativas ao longo das seis etapas (RF-22).
 *
 * Barras horizontais, uma por etapa, na cor da própria etapa (as mesmas do
 * `StageTag` / do funil). A coordenação lê o volume absoluto de cada etapa e
 * compara os comprimentos de relance; passar o mouse realça a barra e mostra o
 * detalhe, escurecendo as demais.
 */
export function DistribuicaoPorEtapa({ pontos }: { pontos: PontoEtapa[] }) {
  const [ativo, setAtivo] = useState<number | null>(null);
  const [tabela, setTabela] = useState(false);
  const idTabela = useId();

  const max = Math.max(1, ...pontos.map((p) => p.total));
  const ticks = ticksY(max);
  const topoEscala = ticks[ticks.length - 1] || 1;

  const n = Math.max(1, pontos.length);
  const x0 = L;
  const xMax = LARG - R;
  const larguraUtil = xMax - x0;
  const bw = (v: number) => (v / topoEscala) * larguraUtil; // comprimento da barra
  const rowY = (i: number) => TOPO + i * (ALT_BARRA + GAP); // topo da faixa da etapa i
  const baseY = rowY(n - 1) + ALT_BARRA; // fim da última barra
  const ALT = baseY + 26; // + faixa dos rótulos do eixo de valor

  const resumo = pontos
    .map((p) => `etapa ${p.numero} (${p.nome}): ${p.total}`)
    .join('; ');

  return (
    <Card>
      <Card.Body className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-text">
              Distribuição por etapa
            </h3>
            <p className="mt-0.5 text-xs text-text-muted">
              Equipes ativas em cada etapa do funil — o comprimento mostra o
              volume de cada etapa.
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            aria-expanded={tabela}
            aria-controls={idTabela}
            onClick={() => setTabela((v) => !v)}
          >
            {tabela ? 'Ver gráfico' : 'Ver tabela'}
          </Button>
        </div>

        <div key={tabela ? 'tabela' : 'grafico'} className="swap-in">
          {!tabela ? (
            <div className="relative">
            <svg
              viewBox={`0 0 ${LARG} ${ALT}`}
              className="h-auto w-full overflow-visible"
              role="img"
              aria-label={`Equipes ativas por etapa — ${resumo}.`}
            >
              {/* grade vertical e eixo de valor — hairline, recessivos */}
              {ticks.map((t) => (
                <g key={t}>
                  <line
                    x1={x0 + bw(t)}
                    x2={x0 + bw(t)}
                    y1={TOPO}
                    y2={baseY}
                    stroke="var(--border)"
                    strokeWidth={1}
                  />
                  <text
                    x={x0 + bw(t)}
                    y={baseY + 16}
                    textAnchor="middle"
                    className="fill-[color:var(--text-subtle)] text-[11px] tabular-nums"
                  >
                    {t}
                  </text>
                </g>
              ))}

              {pontos.map((p, i) => {
                const comprimento = bw(p.total);
                return (
                  <g key={p.numero}>
                    {/* rótulo da etapa no gutter esquerdo */}
                    <text
                      x={x0 - 10}
                      y={rowY(i) + ALT_BARRA / 2 + 3.5}
                      textAnchor="end"
                      className="fill-[color:var(--text-muted)] text-[11px]"
                    >
                      Etapa {p.numero}
                    </text>
                    {/* barra na cor da etapa; o hover mora aqui — só sobre a
                        barra é que o foco aciona (realça esta, escurece as outras) */}
                    <rect
                      x={x0}
                      y={rowY(i)}
                      width={Math.max(0, comprimento)}
                      height={ALT_BARRA}
                      rx={3}
                      fill={`var(--stage-${p.numero})`}
                      opacity={ativo === null || ativo === i ? 1 : 0.55}
                      onMouseEnter={() => setAtivo(i)}
                      onMouseLeave={() => setAtivo(null)}
                    />
                    <text
                      x={x0 + comprimento + 7}
                      y={rowY(i) + ALT_BARRA / 2 + 3.5}
                      textAnchor="start"
                      className="pointer-events-none fill-[color:var(--text)] text-[11px] font-semibold tabular-nums"
                    >
                      {p.total}
                    </text>
                  </g>
                );
              })}
            </svg>

            {ativo !== null && (
              <div
                className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-[0.625rem] border border-border bg-surface-raised px-3 py-2 shadow-md"
                style={{
                  left: `${(Math.min(xMax, x0 + bw(pontos[ativo].total)) / LARG) * 100}%`,
                  top: `${(rowY(ativo) / ALT) * 100}%`,
                }}
              >
                <p className="whitespace-nowrap text-xs font-medium text-text">
                  {pontos[ativo].nome}
                </p>
                <p className="mt-0.5 whitespace-nowrap text-xs text-text-muted">
                  <span className="font-semibold tabular-nums text-text">
                    {pontos[ativo].total}
                  </span>{' '}
                  {pontos[ativo].total === 1 ? 'equipe ativa' : 'equipes ativas'}
                </p>
              </div>
            )}
            </div>
          ) : (
            <table id={idTabela} className="w-full text-sm">
            <caption className="sr-only">
              Equipes ativas por etapa do funil
            </caption>
            <thead>
              <tr className="border-b border-border text-left text-xs text-text-muted">
                <th scope="col" className="py-2 font-medium">
                  Etapa
                </th>
                <th scope="col" className="py-2 font-medium">
                  Nome
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Equipes ativas
                </th>
              </tr>
            </thead>
            <tbody>
              {pontos.map((p) => (
                <tr key={p.numero} className="border-b border-border last:border-0">
                  <td className="py-2">
                    <StageTag etapaId={p.numero}>{p.numero}</StageTag>
                  </td>
                  <td className="py-2 text-text">{p.nome}</td>
                  <td className="py-2 text-right font-medium tabular-nums text-text">
                    {p.total}
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          )}
        </div>
      </Card.Body>
    </Card>
  );
}
