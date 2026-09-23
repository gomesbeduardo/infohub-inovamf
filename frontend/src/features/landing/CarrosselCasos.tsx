'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon } from '@/design-system/icons';
import { cn } from '@/design-system/cn';

const INTERVALO_MS = 5000;

const POSICAO: Record<'-1' | '0' | '1' | 'longe', string> = {
  '0': 'z-30 translate-x-0 scale-100 opacity-100',
  '-1': 'z-20 -translate-x-[62%] scale-[0.84] opacity-50 blur-[3px] cursor-pointer',
  '1': 'z-20 translate-x-[62%] scale-[0.84] opacity-50 blur-[3px] cursor-pointer',
  longe: 'z-10 scale-[0.7] opacity-0 pointer-events-none',
};

const BOTAO_REDONDO =
  'inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-strong bg-surface text-text shadow-sm transition-colors hover:border-primary hover:text-primary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]';

/**
 * Carrossel com foco no card do meio (opção 4): os vizinhos ficam menores e
 * desfocados. Avança a cada 5 s, mas pausa com o mouse ou o foco dentro, fora
 * da tela, com a aba escondida e pelo botão de pausa; com
 * `prefers-reduced-motion` começa pausado e troca sem animação. Setas nas
 * laterais (e embaixo, no celular) e ← → pelo teclado.
 */
export function CarrosselCasos({
  itens,
  rotulo,
}: {
  itens: { chave: string; conteudo: ReactNode }[];
  rotulo: string;
}) {
  const raiz = useRef<HTMLDivElement>(null);
  const [atual, setAtual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [emUso, setEmUso] = useState(false);
  const [visivel, setVisivel] = useState(false);
  const total = itens.length;
  const ir = (n: number) => setAtual(((n % total) + total) % total);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) setPausado(true);
    const el = raiz.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observador = new IntersectionObserver(([e]) => setVisivel(Boolean(e?.isIntersecting)));
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  const rodando = !pausado && !emUso && visivel;
  useEffect(() => {
    if (!rodando) return;
    const id = window.setInterval(() => {
      if (!document.hidden) setAtual((a) => (a + 1) % total);
    }, INTERVALO_MS);
    return () => window.clearInterval(id);
  }, [rodando, total]);

  function posicao(i: number): keyof typeof POSICAO {
    let d = i - atual;
    if (d > total / 2) d -= total;
    if (d < -total / 2) d += total;
    return d === 0 ? '0' : d === -1 ? '-1' : d === 1 ? '1' : 'longe';
  }

  return (
    <div
      ref={raiz}
      role="region"
      aria-roledescription="carrossel"
      aria-label={rotulo}
      onMouseEnter={() => setEmUso(true)}
      onMouseLeave={() => setEmUso(false)}
      onFocus={() => setEmUso(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setEmUso(false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') ir(atual + 1);
        if (e.key === 'ArrowLeft') ir(atual - 1);
      }}
      className="flex flex-col gap-5"
    >
      <div className="relative isolate h-[17rem] overflow-x-clip sm:h-56">
        <div aria-live={rodando ? 'off' : 'polite'} className="absolute inset-0">
          {itens.map((item, i) => {
            const pos = posicao(i);
            return (
              <div
                key={item.chave}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} de ${total}`}
                aria-hidden={pos !== '0'}
                onClick={pos === '-1' || pos === '1' ? () => ir(i) : undefined}
                className={cn(
                  'absolute inset-y-0 left-0 right-0 mx-auto w-[min(28rem,82%)] ease-[cubic-bezier(0.16,1,0.3,1)] motion-safe:transition-[transform,opacity,filter] motion-safe:duration-[600ms]',
                  POSICAO[pos],
                )}
              >
                {item.conteudo}
              </div>
            );
          })}
        </div>
        <button
          type="button"
          aria-label="Caso anterior"
          onClick={() => ir(atual - 1)}
          className={cn(BOTAO_REDONDO, 'absolute left-0 top-1/2 z-40 hidden -translate-y-1/2 md:inline-flex')}
        >
          <ChevronLeftIcon size={18} />
        </button>
        <button
          type="button"
          aria-label="Próximo caso"
          onClick={() => ir(atual + 1)}
          className={cn(BOTAO_REDONDO, 'absolute right-0 top-1/2 z-40 hidden -translate-y-1/2 md:inline-flex')}
        >
          <ChevronRightIcon size={18} />
        </button>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button type="button" aria-label="Caso anterior" onClick={() => ir(atual - 1)} className={cn(BOTAO_REDONDO, 'md:hidden')}>
          <ChevronLeftIcon size={18} />
        </button>
        <div aria-hidden className="flex gap-1.5">
          {itens.map((item, i) => (
            <span
              key={item.chave}
              className={cn(
                'h-2 rounded-full motion-safe:transition-all motion-safe:duration-300',
                i === atual ? 'w-6 bg-primary' : 'w-2 bg-border-strong',
              )}
            />
          ))}
        </div>
        <button
          type="button"
          aria-label={pausado ? 'Retomar a troca automática' : 'Pausar a troca automática'}
          onClick={() => setPausado((p) => !p)}
          className={BOTAO_REDONDO}
        >
          {pausado ? <PlayIcon size={16} /> : <PauseIcon size={16} />}
        </button>
        <button type="button" aria-label="Próximo caso" onClick={() => ir(atual + 1)} className={cn(BOTAO_REDONDO, 'md:hidden')}>
          <ChevronRightIcon size={18} />
        </button>
      </div>
    </div>
  );
}
