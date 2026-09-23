import { cn } from '@/design-system/cn';

// Larguras alternadas para a "silhueta" parecer texto (classes literais para o JIT do Tailwind).
const LARGURAS = ['w-full', 'w-11/12', 'w-4/5', 'w-2/3'];

export interface SkeletonProps {
  /** Quantas barras desenhar. */
  linhas?: number;
  className?: string;
}

/**
 * Placeholder de carregamento (B2) no lugar de "Carregando…". O pulso só roda
 * com `motion-safe` (prefers-reduced-motion desliga); o texto fica para leitor de tela.
 */
export function Skeleton({ linhas = 3, className }: SkeletonProps) {
  return (
    <div role="status" className={cn('flex flex-col gap-3 py-2', className)}>
      <span className="sr-only">Carregando…</span>
      {Array.from({ length: linhas }, (_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className={cn(
            'h-4 rounded-md bg-surface-sunken motion-safe:animate-pulse',
            LARGURAS[i % LARGURAS.length],
          )}
        />
      ))}
    </div>
  );
}
