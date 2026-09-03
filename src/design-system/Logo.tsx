import Image from 'next/image';
import mark from './brand/mark.svg';
import { cn } from '@/design-system/cn';

export interface LogoProps {
  variant?: 'color' | 'mono';
  withTagline?: boolean;
  /** Tamanho do lockup — 'md' no app, 'lg' nas telas de acesso. */
  size?: 'md' | 'lg';
  className?: string;
}

/**
 * Marca InfoHub: o mark oficial (a lâmpada-rede vetorizada da marca) + o
 * wordmark "infohub" em caixa baixa, nas duas cores da marca (info neutro +
 * hub vermelho), theme-aware.
 */
export function Logo({
  variant = 'color',
  withTagline = false,
  size = 'md',
  className,
}: LogoProps) {
  const grande = size === 'lg';
  const px = grande ? 48 : 32;
  return (
    <span
      className={cn(
        'inline-flex items-center',
        grande ? 'gap-3' : 'gap-2.5',
        className,
      )}
    >
      <Image
        src={mark}
        alt=""
        aria-hidden
        width={px}
        height={px}
        priority
        className={cn('object-contain', grande ? 'h-12 w-12' : 'h-8 w-8')}
      />
      <span className="inline-flex flex-col leading-none">
        <span
          className={cn(
            'font-display font-bold tracking-[-0.02em]',
            grande ? 'text-2xl' : 'text-lg',
          )}
        >
          <span className="text-text">info</span>
          <span
            className={variant === 'color' ? 'text-primary-text' : 'text-text'}
          >
            hub
          </span>
        </span>
        {withTagline && (
          <span
            className={cn(
              'font-medium uppercase tracking-[0.2em] text-text-muted',
              grande ? 'mt-1.5 text-[11px]' : 'mt-1 text-[10px]',
            )}
          >
            InovAMF
          </span>
        )}
      </span>
    </span>
  );
}
