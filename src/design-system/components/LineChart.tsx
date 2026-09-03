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
const W = 640;
const H = 240;
const DIVISOES = 4;

function coordenadas(valores: number[], max: number) {
  const n = valores.length;
  const larguraUtil = W - L - R;
  const alturaUtil = H - T - B;
  return valores.map((v, i) => {
    const x = n <= 1 ? L : L + (i * larguraUtil) / (n - 1);
    const y = T + alturaUtil - (max === 0 ? 0 : (v / max) * alturaUtil);
    return { x, y };
  });
}

/**
 * Gráfico de linha em SVG puro e tokenizado (sem dependências). Responsivo via
 * `viewBox`; múltiplas séries com legenda. O SVG é marcado como `img` com um
 * `aria-label` descritivo.
 */
export function LineChart({ series, labels, ariaLabel, className }: LineChartProps) {
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

  return (
    <figure className={cn('flex flex-col gap-3', className)}>
      <figcaption className="flex flex-wrap items-center gap-4">
        {series.map((s) => (
          <span key={s.nome} className="flex items-center gap-2 text-sm text-text-muted">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: s.cor }}
              aria-hidden
            />
            {s.nome}
          </span>
        ))}
      </figcaption>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={ariaLabel}
      >
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
        {labels.map((lab, i) => {
          const n = labels.length;
          const x = n <= 1 ? L : L + (i * (W - L - R)) / (n - 1);
          return (
            <text
              key={`${lab}-${i}`}
              x={x}
              y={H - 8}
              textAnchor="middle"
              fontSize={11}
              fill="var(--text-subtle)"
            >
              {lab}
            </text>
          );
        })}

        {/* séries */}
        {series.map((s) => {
          const pts = coordenadas(s.valores, topo);
          const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
          return (
            <g key={s.nome}>
              <path d={d} fill="none" stroke={s.cor} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
              {pts.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={3} fill={s.cor} />
              ))}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
