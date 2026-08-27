import { type ReactNode } from 'react';
import { cn } from '@/design-system/cn';

export interface StageTagProps {
  /** Número da etapa (1..6); fora desse intervalo usa a cor de "pronta". */
  etapaId: number;
  children?: ReactNode;
  className?: string;
}

/** Etiqueta colorida da etapa do funil, usando o gradiente da marca. */
export function StageTag({ etapaId, children, className }: StageTagProps) {
  const bg =
    etapaId >= 1 && etapaId <= 6
      ? `var(--stage-${etapaId})`
      : 'var(--stage-pronta)';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold text-[color:var(--primary-fg)]',
        className,
      )}
      style={{ background: bg }}
    >
      {children ?? `Etapa ${etapaId}`}
    </span>
  );
}
