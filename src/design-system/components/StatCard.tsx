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
}

/** Indicador compacto: número em destaque + rótulo, com um ícone opcional. */
export function StatCard({ label, value, Icon, tone = 'neutral' }: StatCardProps) {
  return (
    <Card>
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
    </Card>
  );
}
