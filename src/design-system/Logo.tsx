import { cn } from '@/design-system/cn';

export interface LogoProps {
  variant?: 'color' | 'mono';
  withTagline?: boolean;
  className?: string;
}

/** Wordmark da marca: "info" (texto) + "hub" (primária na variante color). */
export function Logo({
  variant = 'color',
  withTagline = false,
  className,
}: LogoProps) {
  return (
    <span className={cn('inline-flex flex-col leading-none', className)}>
      <span className="text-lg font-bold tracking-tight">
        <span className="text-text">info</span>
        <span className={variant === 'color' ? 'text-primary-text' : 'text-text'}>
          hub
        </span>
      </span>
      {withTagline && (
        <span className="text-[10px] font-medium uppercase tracking-wide text-text-muted">
          InovAMF
        </span>
      )}
    </span>
  );
}
