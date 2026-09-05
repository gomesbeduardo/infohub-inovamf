'use client';

import { useId, useState } from 'react';
import { Card } from '@/design-system/components/Card';
import { Button } from '@/design-system/components/Button';
import { StageTag } from '@/design-system/components/StageTag';

export interface PontoEtapa {
  etapaId: number;
  numero: number;
  nome: string;
  total: number;
}

// Geometria do desenho (unidades do viewBox — o SVG escala uniformemente).
const L = 34; // margem esquerda (rótulos do eixo Y)
const R = 16;
const TOPO = 18;
const BASE = 214; // linha do zero
const LARG = 720;
const ALT = 250;

/** Ticks "redondos" do eixo Y a partir do maior valor da série. */
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
 * Barras verticais, uma por etapa, na cor da própria etapa (as mesmas do
 * `StageTag` / do funil). A coordenação lê o **volume absoluto** em cada etapa e
 * compara as alturas de relance; a cor amarra cada barra à etapa correspondente
 * no kanban.
 */
export function DistribuicaoPorEtapa({ pontos }: { pontos: PontoEtapa[] }) {
  const [ativo, setAtivo] = useState<number | null>(null);
  const [tabela, setTabela] = useState(false);
  const idTabela = useId();

  const max = Math.max(1, ...pontos.map((p) => p.total));
  const ticks = ticksY(max);
  const topoEscala = ticks[ticks.length - 1] || 1;

  const n = Math.max(1, pontos.length);
  const faixa = (LARG - L - R) / n; // largura da faixa reservada a cada etapa
  const larguraBarra = Math.min(56, faixa * 0.6); // barra centrada na faixa, com teto
  const cx = (i: number) => L + faixa * (i + 0.5); // centro da faixa da etapa i
  const y = (v: number) => BASE - (v / topoEscala) * (BASE - TOPO);

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
              Equipes ativas em cada etapa do funil — a inclinação mostra onde a
              jornada aperta.
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

        {!tabela && (
          <div className="relative">
            <svg
              viewBox={`0 0 ${LARG} ${ALT}`}
              className="h-auto w-full overflow-visible"
              role="img"
              aria-label={`Equipes ativas por etapa — ${resumo}.`}
            >
              {/* grade e eixo Y — hairline, recessivos */}
              {ticks.map((t) => (
                <g key={t}>
                  <line
                    x1={L}
                    x2={LARG - R}
                    y1={y(t)}
                    y2={y(t)}
                    stroke="var(--border)"
                    strokeWidth={1}
                  />
                  <text
                    x={L - 10}
                    y={y(t) + 4}
                    textAnchor="end"
                    className="fill-[color:var(--text-subtle)] text-[11px] tabular-nums"
                  >
                    {t}
                  </text>
                </g>
              ))}

              {pontos.map((p, i) => {
                const altura = BASE - y(p.total);
                return (
                  <g key={p.etapaId}>
                    {/* barra na cor da etapa; realça um tom quando é a ativa */}
                    <rect
                      x={cx(i) - larguraBarra / 2}
                      y={y(p.total)}
                      width={larguraBarra}
                      height={Math.max(0, altura)}
                      rx={4}
                      fill={`var(--stage-${p.etapaId})`}
                      opacity={ativo === null || ativo === i ? 1 : 0.55}
                    />
                    <text
                      x={cx(i)}
                      y={y(p.total) - 8}
                      textAnchor="middle"
                      className="fill-[color:var(--text)] text-[12px] font-semibold tabular-nums"
                    >
                      {p.total}
                    </text>
                    <text
                      x={cx(i)}
                      y={BASE + 22}
                      textAnchor="middle"
                      className="fill-[color:var(--text-muted)] text-[11px]"
                    >
                      Etapa {p.numero}
                    </text>
                    {/* faixa de hover: alvo cobre toda a coluna, não só a barra */}
                    <rect
                      x={L + faixa * i}
                      y={TOPO - 10}
                      width={faixa}
                      height={BASE - TOPO + 30}
                      fill="transparent"
                      onMouseEnter={() => setAtivo(i)}
                      onMouseLeave={() => setAtivo(null)}
                    />
                  </g>
                );
              })}
            </svg>

            {ativo !== null && (
              <div
                className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-[0.625rem] border border-border bg-surface-raised px-3 py-2 shadow-md"
                style={{
                  left: `${(cx(ativo) / LARG) * 100}%`,
                  top: `${(y(pontos[ativo].total) / ALT) * 100 - 4}%`,
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
        )}

        {tabela && (
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
                <tr key={p.etapaId} className="border-b border-border last:border-0">
                  <td className="py-2">
                    <StageTag etapaId={p.etapaId}>{p.numero}</StageTag>
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
      </Card.Body>
    </Card>
  );
}
