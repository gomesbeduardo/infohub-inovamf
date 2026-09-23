import type { MouseEvent, ReactNode } from 'react';
import { ArrowDownIcon } from '@/design-system/icons';
import { cn } from '@/design-system/cn';

/** Botão que leva à próxima seção da landing (âncora com seta para baixo). */
export function ProximaSecao({
  href,
  children,
  destaque = false,
  onClick,
  className,
}: {
  href: string;
  children: ReactNode;
  /** Primário: o passo natural da seção (ex.: última etapa → casos). */
  destaque?: boolean;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
  className?: string;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={cn(
        'group inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]',
        destaque
          ? 'bg-primary text-primary-fg shadow-sm hover:bg-primary-hover'
          : 'border border-border-strong text-text hover:border-primary hover:text-primary-text',
        className,
      )}
    >
      {children}
      <ArrowDownIcon size={16} className="motion-safe:transition-transform motion-safe:group-hover:translate-y-0.5" />
    </a>
  );
}
