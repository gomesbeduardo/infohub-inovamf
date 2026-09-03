import Image from 'next/image';
import mark from './brand/mark.svg';
import { cn } from '@/design-system/cn';

// viewBox do mark.svg
const MARK_W = 664;
const MARK_H = 931;

export interface LogoProps {
  variant?: 'color' | 'mono';
  withTagline?: boolean;
  /** Tamanho do lockup — 'md' no app, 'lg' nas telas de acesso. */
  size?: 'md' | 'lg';
  /** Disposição — 'horizontal' (padrão) ou 'stacked' (marca sobre o wordmark). */
  orientation?: 'horizontal' | 'stacked';
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
  orientation = 'horizontal',
  className,
}: LogoProps) {
  const grande = size === 'lg';
  const stacked = orientation === 'stacked';
  return (
    <span
      className={cn(
        'inline-flex',
        stacked
          ? 'flex-col items-center gap-3 text-center'
          : cn('items-center', grande ? 'gap-3' : 'gap-2.5'),
        className,
      )}
    >
      <Image
        src={mark}
        alt=""
        aria-hidden
        // dimensões literais do mark.svg — o import estático só carrega
        // metadados no bundler do Next (fora dele, `mark` é só o caminho).
        width={MARK_W}
        height={MARK_H}
        priority
        className={cn('w-auto object-contain', grande ? 'h-[72px]' : 'h-8')}
      />
      <span
        className={cn(
          'inline-flex flex-col leading-none',
          stacked && 'items-center',
          // compensação óptica: no lockup horizontal grande, o wordmark em
          // caixa baixa assenta baixo e a parte acesa da lâmpada fica alta —
          // sobe um pouco o texto para centralizar com a marca.
          !stacked && grande && '-translate-y-[6px]',
        )}
      >
        <span
          className={cn(
            'font-display font-bold tracking-[-0.02em]',
            grande ? 'text-4xl' : 'text-lg',
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
              grande ? 'mt-2 text-sm' : 'mt-1 text-[10px]',
            )}
          >
            InovAMF
          </span>
        )}
      </span>
    </span>
  );
}
