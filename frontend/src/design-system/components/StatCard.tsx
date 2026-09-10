import Link from 'next/link';
import { Card } from '@/design-system/components/Card';
import type { IconProps } from '@/design-system/icons';
import { cn } from '@/design-system/cn';

export type StatTone = 'neutral' | 'danger' | 'success';

const TONES: Record<StatTone, string> = {
  neutral: 'bg-primary-soft text-primary-text',
  danger: 'bg-danger-soft text-danger-text',
  success: 'bg-success-soft text-success-text',
};

export interface StatCardProps {
  label: string;
  value: number | string;
  Icon?: (p: IconProps) => JSX.Element;
  tone?: StatTone;
  /** Quando presente, o cartão vira um link para este destino. */
  href?: string;
  /** Ação ao clicar (usada quando não há `href`); torna o cartão um botão. */
  onClick?: () => void;
}

/** Indicador compacto: número em destaque + rótulo, com um ícone opcional. */
export function StatCard({ label, value, Icon, tone = 'neutral', href, onClick }: StatCardProps) {
  const conteudo = (
    <Card.Body className="flex items-center gap-4">
      {Icon && (
        <span
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
            TONES[tone],
          )}
        >
          <Icon size={22} />
        </span>
      )}
      <div className="flex flex-col">
        <span className="font-display text-3xl font-bold tabular-nums tracking-tight text-text">
          {value}
        </span>
        <span className="text-sm text-text-muted">{label}</span>
      </div>
    </Card.Body>
  );

  if (href) {
    return (
      <Link href={href} className="group block rounded-[1.25rem]">
        <Card className="h-full transition-all group-hover:-translate-y-px group-hover:border-border-strong group-hover:shadow-md group-focus-visible:-translate-y-px group-focus-visible:border-border-strong group-focus-visible:shadow-md group-active:translate-y-0">
          {conteudo}
        </Card>
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="group block w-full text-left">
        <Card className="h-full transition-all group-hover:-translate-y-px group-hover:border-border-strong group-hover:shadow-md group-focus-visible:-translate-y-px group-focus-visible:border-border-strong group-focus-visible:shadow-md group-active:translate-y-0">
          {conteudo}
        </Card>
      </button>
    );
  }

  return <Card>{conteudo}</Card>;
}
