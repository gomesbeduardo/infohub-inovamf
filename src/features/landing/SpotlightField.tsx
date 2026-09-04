'use client';

import { type MouseEvent, type ReactNode } from 'react';
import { cn } from '@/design-system/cn';

interface SpotlightFieldProps {
  id?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Seção que projeta um brilho ambiente na cor da marca ATRÁS do conteúdo,
 * seguindo o cursor por toda a faixa (entre os separadores). Fica por trás do
 * conteúdo (z-0) e é contido pela própria seção, então o brilho aparece ao
 * redor e nas frestas dos cards — nunca por cima. O rastreio grava --mx/--my
 * direto no elemento (sem re-render); a cor vem do token --primary, então
 * adapta sozinho aos modos claro/escuro. Estilo em `.spotlight-field`.
 */
export function SpotlightField({ id, className, children }: SpotlightFieldProps) {
  function handleMouseMove(event: MouseEvent<HTMLElement>) {
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${event.clientX - rect.left}px`);
    el.style.setProperty('--my', `${event.clientY - rect.top}px`);
  }

  return (
    <section
      id={id}
      className={cn('spotlight-field', className)}
      onMouseMove={handleMouseMove}
    >
      <div aria-hidden className="spotlight-field__glow" />
      {children}
    </section>
  );
}
