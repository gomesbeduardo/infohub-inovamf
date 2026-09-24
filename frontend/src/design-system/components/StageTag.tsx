import { type ReactNode } from 'react';
import { cn } from '@/design-system/cn';

export interface StageTagProps {
  /** Número da etapa (1..6); fora desse intervalo usa a cor de "pronta". */
  etapaId: number;
  children?: ReactNode;
  className?: string;
  /**
   * `solida` (padrão): etiqueta na cor da etapa, texto branco, tom fechado
   * para contraste AA. `ponto`: pílula neutra com o ponto na cor da etapa —
   * para onde a etapa já está implícita (ex.: a coluna do kanban).
   */
  variante?: 'solida' | 'ponto';
}

/** Etiqueta da etapa do funil, usando o gradiente da marca. */
export function StageTag({ etapaId, children, className, variante = 'solida' }: StageTagProps) {
  const chave = etapaId >= 1 && etapaId <= 6 ? String(etapaId) : 'pronta';
  const cor = `var(--stage-${chave})`;
  const texto = children ?? `Etapa ${etapaId}`;
  if (variante === 'ponto') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border border-[color:var(--chip-border)] bg-[color:var(--chip-bg)] px-2.5 py-0.5 text-xs font-medium text-[color:var(--chip-text)]',
          className,
        )}
      >
        <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: cor }} />
        {texto}
      </span>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 font-display text-xs font-semibold tracking-tight text-white shadow-sm',
        className,
      )}
      style={{ background: `var(--stage-${chave}-tag, ${cor})` }}
    >
      {texto}
    </span>
  );
}
