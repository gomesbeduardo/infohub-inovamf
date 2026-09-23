'use client';

import { Fragment, useEffect, useRef, type CSSProperties } from 'react';
import { cn } from '@/design-system/cn';

/**
 * Título de seção cujas palavras sobem de trás de uma máscara quando a seção
 * entra rolando para baixo, e descem quando ela entra rolando para cima.
 *
 * O estado padrão é VISÍVEL: o JS só esconde os títulos que estão fora da tela
 * depois de montar, então sem JS (ou com `prefers-reduced-motion`) o texto
 * aparece parado. As palavras são só visuais; o nome acessível é o texto
 * inteiro (`aria-label`).
 */
export function TituloRevelado({ texto, className }: { texto: string; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    // Só o que já está abaixo da dobra começa escondido (nada some do 1º quadro).
    if (el.getBoundingClientRect().top > window.innerHeight) el.dataset.revelar = 'abaixo';

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada) return;
        if (entrada.isIntersecting) {
          el.dataset.revelar = 'visivel';
        } else {
          // Saiu por cima: ao voltar (rolando para cima) desce; saiu por baixo: sobe.
          el.dataset.revelar = entrada.boundingClientRect.top < 0 ? 'acima' : 'abaixo';
        }
      },
      { threshold: 0.35 },
    );
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  const palavras = texto.split(' ');
  return (
    <h2 ref={ref} aria-label={texto} className={cn('titulo-revelado', className)}>
      {palavras.map((p, i) => (
        <Fragment key={`${p}-${i}`}>
          <span aria-hidden className="revelar-palavra">
            {/* atraso por palavra, limitado a 6 passos (≈270 ms no total) */}
            <span style={{ '--i': Math.min(i, 6) } as CSSProperties}>{p}</span>
          </span>
          {i < palavras.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </h2>
  );
}
