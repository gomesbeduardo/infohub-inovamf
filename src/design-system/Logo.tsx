import Image from 'next/image';
import mark from './brand/mark.svg';
import { cn } from '@/design-system/cn';

export interface LogoProps {
  variant?: 'color' | 'mono';
  withTagline?: boolean;
  className?: string;
}

/**
 * Marca InfoHub: o mark "ignição" (faísca da ideia, no gradiente da marca) + o
 * wordmark "InfoHub" na fonte display (duas cores da marca, theme-aware).
 */
export function Logo({
  variant = 'color',
  withTagline = false,
  className,
}: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <Image
        src={mark}
        alt=""
        aria-hidden
        width={32}
        height={32}
        priority
        className="h-8 w-8 object-contain"
      />
      <span className="inline-flex flex-col leading-none">
        <span className="font-display text-lg font-bold tracking-[-0.02em]">
          <span className="text-text">Info</span>
          <span
            className={variant === 'color' ? 'text-primary-text' : 'text-text'}
          >
            Hub
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
