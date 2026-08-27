import { cn } from '@/design-system/cn';

export interface LogoProps {
  variant?: 'color' | 'mono';
  withTagline?: boolean;
  className?: string;
}

/**
 * Marca InfoHub: a "faísca" da ideia (quadrado com o gradiente da marca) + o
 * wordmark "info·hub" na fonte display.
 */
export function Logo({
  variant = 'color',
  withTagline = false,
  className,
}: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        aria-hidden
        className={cn(
          'relative inline-flex h-7 w-7 items-center justify-center rounded-[0.55rem] shadow-sm',
          variant === 'color' ? 'bg-brand-gradient' : 'bg-text',
        )}
      >
        <span className="h-2.5 w-2.5 rounded-full bg-white/90" />
      </span>
      <span className="inline-flex flex-col leading-none">
        <span className="font-display text-lg font-bold tracking-[-0.02em]">
          <span className="text-text">info</span>
          <span
            className={variant === 'color' ? 'text-primary-text' : 'text-text'}
          >
            hub
          </span>
        </span>
        {withTagline && (
          <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-text-muted">
            InovAMF
          </span>
        )}
      </span>
    </span>
  );
}
