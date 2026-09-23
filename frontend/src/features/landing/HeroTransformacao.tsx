import { Caveat } from 'next/font/google';

// Letra de mão só para o esboço: é o rabisco de quem ainda está pensando.
const rascunho = Caveat({ subsets: ['latin'], weight: ['500'], display: 'swap' });

type Ponto = [number, number];

// A seta sai da borda direita do esboço, arqueia pelo espaço vazio de cima e
// desce até o topo do pitch (coordenadas do viewBox 400×330).
const P: [Ponto, Ponto, Ponto, Ponto] = [
  [198, 62],
  [262, -4],
  [338, 34],
  [318, 150],
];
const CURVA = `M${P[0].join(' ')} C ${P[1].join(' ')}, ${P[2].join(' ')}, ${P[3].join(' ')}`;

function naCurva(t: number): Ponto {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return [
    a * P[0][0] + b * P[1][0] + c * P[2][0] + d * P[3][0],
    a * P[0][1] + b * P[1][1] + c * P[2][1] + d * P[3][1],
  ];
}

/** As seis marcas, uma por etapa, sobre a curva e na cor da etapa (--stage-N). */
const MARCAS = Array.from({ length: 6 }, (_, i) => naCurva((i + 1) / 7.2));

// Ponta da seta alinhada à tangente final (P2 → P3).
const ANGULO = (Math.atan2(P[3][1] - P[2][1], P[3][0] - P[2][0]) * 180) / Math.PI;

/**
 * Visual do hero (opção A): o esboço vira pitch por uma seta curva com seis
 * marcas, uma por etapa da jornada. Tudo é decorativo (`aria-hidden`); o texto
 * do hero já diz o mesmo. Movimento: a seta se desenha uma vez ao abrir a
 * página, as marcas acendem em sequência e o pitch assenta — só com
 * `prefers-reduced-motion: no-preference` (ver `.hero-seta-*` no globals.css);
 * sem isso, tudo já aparece no lugar.
 */
export function HeroTransformacao() {
  return (
    <div aria-hidden className="relative mx-auto aspect-[1/0.82] w-full max-w-[520px] select-none">
      {/* esboço: post-it pautado com o rabisco da ideia */}
      <div
        className="hero-esboco absolute left-0 top-[7%] w-[46%] -rotate-[4deg] rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-md"
        style={{
          backgroundImage:
            'repeating-linear-gradient(180deg, transparent 0 25px, color-mix(in srgb, var(--border-strong) 55%, transparent) 25px 26px)',
        }}
      >
        <p className={`${rascunho.className} text-[1.35rem] leading-[26px] text-text-muted`}>
          app pra dividir
          <br />
          energia solar
          <br />
          entre vizinhos??
        </p>
        <svg viewBox="0 0 80 28" className="mt-1 h-7 w-20 text-primary-text" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="14" r="6" />
          <path d="M12 3v3M12 22v3M1 14h3M20 14h3M4.5 6.5l2 2M17.5 19.5l2 2M4.5 21.5l2-2M17.5 8.5l2-2" />
          <path d="M34 14h26m-6-5 6 5-6 5" />
          <path d="M70 7c-4 0-5 3-2 4.5s3 5-2 5M68 5v14" />
        </svg>
      </div>

      {/* a seta: tracejada, desenhada por uma máscara (a animação corre na máscara) */}
      <svg viewBox="0 0 400 330" className="absolute inset-0 h-full w-full overflow-visible" fill="none">
        <defs>
          <mask id="hero-seta-mascara" maskUnits="userSpaceOnUse">
            <path className="hero-seta-traco" d={CURVA} pathLength={1} stroke="#fff" strokeWidth="14" strokeLinecap="round" />
          </mask>
        </defs>
        <g mask="url(#hero-seta-mascara)">
          <path d={CURVA} stroke="var(--primary)" strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round" />
        </g>
        <path
          className="hero-seta-ponta"
          d="M-9 -7 L0 0 L-9 7"
          transform={`translate(${P[3][0]} ${P[3][1]}) rotate(${ANGULO})`}
          stroke="var(--primary)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {MARCAS.map(([cx, cy], i) => (
          <circle
            key={i}
            className="hero-seta-marca"
            style={{ ['--i' as string]: i, fill: `var(--stage-${i + 1})` }}
            cx={cx}
            cy={cy}
            r="5"
            stroke="var(--surface)"
            strokeWidth="2"
          />
        ))}
      </svg>

      <span className="absolute left-[2%] top-0 font-display text-xs font-bold uppercase tracking-[0.14em] text-primary-text">
        Esboço
      </span>

      {/* pitch: o vídeo pronto, com o selo de quem chega ao fim */}
      <div className="hero-pitch absolute bottom-[5%] right-0 w-[52%] rounded-[var(--radius-lg)] border border-border bg-surface p-3.5 shadow-md">
        <div className="relative grid aspect-video place-items-center overflow-hidden rounded-[var(--radius)] bg-[image:var(--rail)]">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-white/90 shadow-sm">
            <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5" fill="var(--grad-ember)">
              <path d="M8 5.5v13l10.5-6.5z" />
            </svg>
          </span>
          <span className="absolute bottom-2 left-2 right-2 h-1 overflow-hidden rounded-full bg-white/30">
            <span className="block h-full w-2/3 rounded-full bg-white/90" />
          </span>
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <span className="font-display text-sm font-bold tracking-tight text-text">SolarGrid</span>
          <span className="rounded-full bg-success-soft px-2 py-0.5 text-[0.7rem] font-semibold text-success-text">
            Pronta p/ InovAMF
          </span>
        </div>
      </div>

      <span className="absolute -bottom-1 right-[2%] font-display text-xs font-bold uppercase tracking-[0.14em] text-primary-text">
        Pitch
      </span>
    </div>
  );
}
