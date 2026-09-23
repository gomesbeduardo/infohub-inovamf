'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckIcon } from '@/design-system/icons';
import { cn } from '@/design-system/cn';
import type { EtapaVitrine } from '@/features/landing/conteudo';
import { ProximaSecao } from '@/features/landing/ProximaSecao';

/** Altura do cabeçalho fixo da landing (h-16): o topo "útil" da tela. */
const TOPO = 64;
const TELA_MEDIA = '(min-width: 768px)';
const COM_MOVIMENTO = '(prefers-reduced-motion: no-preference)';

interface Onda {
  largura: number;
  altura: number;
  d: string;
  pontos: [number, number][];
  /** Comprimento do caminho do começo até o ápice de cada etapa. */
  ate: number[];
  total: number;
}

/**
 * Onda regular: ápices alternados em 38% e 62% da largura, no meio vertical de
 * cada tela, com tangente vertical no ápice. Cada etapa fica num ápice.
 */
function desenhar(largura: number, alturaTela: number, n: number, medidor: SVGPathElement): Onda {
  const pontos = Array.from({ length: n }, (_, i): [number, number] => [
    largura * (i % 2 === 0 ? 0.38 : 0.62),
    alturaTela * (i + 0.5),
  ]);
  const [x0, y0] = pontos[0]!;
  let d = `M ${x0} ${alturaTela * 0.12} C ${x0} ${alturaTela * 0.3}, ${x0} ${y0 - alturaTela * 0.1}, ${x0} ${y0}`;
  const ate: number[] = [];
  medidor.setAttribute('d', d);
  ate.push(medidor.getTotalLength());
  for (let i = 0; i < n - 1; i++) {
    const [xa, ya] = pontos[i]!;
    const [xb, yb] = pontos[i + 1]!;
    d += ` C ${xa} ${ya + alturaTela * 0.5}, ${xb} ${yb - alturaTela * 0.5}, ${xb} ${yb}`;
    medidor.setAttribute('d', d);
    ate.push(medidor.getTotalLength());
  }
  return { largura, altura: alturaTela * n, d, pontos, ate, total: ate[ate.length - 1]! };
}

/**
 * "Como funciona" (opção 3): uma tela por etapa, com a linha em onda
 * desenhando-se até o ápice da etapa atual.
 *
 * - Em tela média ou maior, o scroll para em cada etapa (snap obrigatório,
 *   ligado no `<html>` só enquanto uma etapa ocupa a tela, para não prender o
 *   resto da página). "Pular para os casos" sai a qualquer momento.
 * - O texto da etapa sobe quando você desce e desce quando você sobe
 *   (`data-estado` + CSS em globals.css).
 * - Celular ou `prefers-reduced-motion`: lista comum, sem snap e sem animação.
 * - Sem JS, tudo aparece: os estados só são aplicados depois de montar.
 */
export function JornadaOnda({ etapas, hrefDepois }: { etapas: EtapaVitrine[]; hrefDepois: string }) {
  const lista = useRef<HTMLOListElement>(null);
  const medidor = useRef<SVGPathElement>(null);
  const [ativo, setAtivo] = useState(0);
  const [animar, setAnimar] = useState(false);
  const [onda, setOnda] = useState<Onda | null>(null);

  // Etapa ativa: a que cruza a linha do meio da tela.
  useEffect(() => {
    const el = lista.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    setAnimar(Boolean(window.matchMedia?.(`${TELA_MEDIA} and ${COM_MOVIMENTO}`).matches));
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) setAtivo(Number((e.target as HTMLElement).dataset.indice));
        }
      },
      { rootMargin: '-50% 0px -50% 0px' },
    );
    el.querySelectorAll('[data-indice]').forEach((li) => observador.observe(li));
    return () => observador.disconnect();
  }, []);

  // Geometria da onda (só em tela média ou maior; refeita ao redimensionar).
  useEffect(() => {
    const el = lista.current;
    const path = medidor.current;
    if (!el || !path || typeof ResizeObserver === 'undefined' || !path.getTotalLength) return;
    const medir = () => {
      const primeira = el.querySelector<HTMLElement>('[data-indice]');
      if (!primeira || !window.matchMedia?.(TELA_MEDIA).matches) return setOnda(null);
      setOnda(desenhar(el.clientWidth, primeira.offsetHeight, etapas.length, path));
    };
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => observador.disconnect();
  }, [etapas.length]);

  // Snap obrigatório só enquanto a lista de etapas cobre a tela inteira.
  useEffect(() => {
    const el = lista.current;
    if (!el || !window.matchMedia) return;
    const html = document.documentElement;
    const pode = window.matchMedia(`${TELA_MEDIA} and ${COM_MOVIMENTO}`);
    const atualizar = () => {
      const r = el.getBoundingClientRect();
      const dentro = pode.matches && r.top <= TOPO + 2 && r.bottom >= window.innerHeight - 2;
      html.classList.toggle('jornada-snap', dentro);
    };
    atualizar();
    window.addEventListener('scroll', atualizar, { passive: true });
    window.addEventListener('resize', atualizar);
    return () => {
      window.removeEventListener('scroll', atualizar);
      window.removeEventListener('resize', atualizar);
      html.classList.remove('jornada-snap');
    };
  }, []);

  // Sair da jornada pelo botão: solta o snap antes de pular.
  const soltar = () => document.documentElement.classList.remove('jornada-snap');
  const ultima = etapas.length - 1;

  return (
    <ol ref={lista} className="relative">
      <svg aria-hidden className="absolute h-0 w-0 overflow-hidden">
        <path ref={medidor} />
      </svg>

      {onda && (
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 hidden overflow-visible md:block"
          width={onda.largura}
          height={onda.altura}
          viewBox={`0 0 ${onda.largura} ${onda.altura}`}
          fill="none"
        >
          <path d={onda.d} stroke="var(--border-strong)" strokeWidth={3} strokeLinecap="round" />
          <path
            className="jornada-trilha-ativa"
            d={onda.d}
            stroke="var(--primary)"
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={onda.total}
            strokeDashoffset={onda.total - (onda.ate[ativo] ?? 0)}
          />
          {onda.pontos.map(([x, y], i) => {
            const aceso = i <= ativo;
            return (
              <g key={i}>
                <circle
                  className="jornada-marco"
                  cx={x}
                  cy={y}
                  r={18}
                  fill={aceso ? `var(--stage-${i + 1})` : 'var(--surface)'}
                  stroke={aceso ? `var(--stage-${i + 1})` : 'var(--border-strong)'}
                  strokeWidth={2.5}
                />
                <text
                  x={x}
                  y={y + 5}
                  textAnchor="middle"
                  className="font-display text-sm font-bold"
                  fill={aceso ? 'var(--primary-fg)' : 'var(--text-muted)'}
                >
                  {i + 1}
                </text>
              </g>
            );
          })}
        </svg>
      )}

      {etapas.map((etapa, i) => (
        <li
          key={etapa.numero}
          data-indice={i}
          data-estado={animar ? (i === ativo ? 'visivel' : i < ativo ? 'acima' : 'abaixo') : undefined}
          className="jornada-tela relative flex flex-col items-start gap-4 py-6 md:py-0"
        >
          <div
            className={cn(
              'jornada-conteudo flex flex-col gap-3 md:absolute md:top-1/2 md:w-[32%] md:-translate-y-1/2',
              i % 2 === 0
                ? 'md:right-[calc(62%+2.5rem)] md:items-end md:text-right'
                : 'md:left-[calc(62%+2.5rem)] md:items-start',
            )}
          >
            <h3 className="flex items-center gap-3 font-display text-xl font-bold leading-tight tracking-tight text-text md:text-3xl">
              <span
                aria-hidden
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm text-[color:var(--primary-fg)] md:hidden"
                style={{ background: `var(--stage-${etapa.numero})` }}
              >
                {etapa.numero}
              </span>
              <span>
                <span className="sr-only">Etapa {etapa.numero}: </span>
                {etapa.nome}
              </span>
            </h3>
            <p className="max-w-[42ch] text-[0.95rem] leading-relaxed text-text-muted md:text-base">{etapa.descricao}</p>
            {i === ultima ? (
              <ProximaSecao href={hrefDepois} destaque onClick={soltar} className="mt-1">
                Veja quem já chegou lá
              </ProximaSecao>
            ) : (
              <ProximaSecao href={hrefDepois} onClick={soltar} className="mt-1 hidden md:inline-flex">
                Pular para os casos
              </ProximaSecao>
            )}
          </div>

          {/* o que a equipe entrega: do outro lado da curva, na altura do ápice */}
          <div
            className={cn(
              'jornada-conteudo jornada-entregavel w-full max-w-sm md:absolute md:top-1/2 md:w-[24%] md:-translate-y-1/2',
              i % 2 === 0 ? 'md:left-[calc(38%+3rem)]' : 'md:right-[calc(38%+3rem)]',
            )}
          >
            <p className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-sm">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success-soft text-success-text">
                <CheckIcon size={16} />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-text-muted">Entregável</span>
                <span className="text-sm font-medium leading-snug text-text">{etapa.entregavel}</span>
              </span>
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
