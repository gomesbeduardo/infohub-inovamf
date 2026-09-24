import { type HTMLAttributes } from 'react';
import { cn } from '@/design-system/cn';

/**
 * Tons das pílulas do sistema. Cada tom tem fundo, texto e contorno próprios
 * (tokens em tokens.css). No escuro o contorno aparece e o fundo é tingido —
 * a pílula nunca afunda no card; no claro o contorno é transparente.
 * - neutral: informação sem juízo (estágio, papel, "obrigatória", contagem)
 * - brand: destaque da marca (Líder, papel na conta)
 * - success / warning / info / danger: semântica (ok, atenção, informação, problema)
 */
export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'info' | 'danger';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-[color:var(--chip-bg)] text-[color:var(--chip-text)] border-[color:var(--chip-border)]',
  brand: 'bg-primary-soft text-[color:var(--primary-soft-text)] border-[color:var(--primary-soft-border)]',
  success: 'bg-success-soft text-success-text border-[color:var(--success-border)]',
  warning: 'bg-[color:var(--warning-soft)] text-[color:var(--warning-text)] border-[color:var(--warning-border)]',
  info: 'bg-[color:var(--info-soft)] text-[color:var(--info-text)] border-[color:var(--info-border)]',
  danger: 'bg-danger-soft text-danger-text border-[color:var(--danger-border)]',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}
