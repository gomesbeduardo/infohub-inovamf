import type { StatusTarefa } from '@/domain/types';
import { STATUS_TAREFA_LABEL } from '@/domain/labels';
import { cn } from '@/design-system/cn';

const CORES: Record<StatusTarefa, { fg: string; bg: string }> = {
  pendente: { fg: 'var(--st-pendente-fg)', bg: 'var(--st-pendente-bg)' },
  em_andamento: { fg: 'var(--st-andamento-fg)', bg: 'var(--st-andamento-bg)' },
  entregue: { fg: 'var(--st-entregue-fg)', bg: 'var(--st-entregue-bg)' },
  atrasada: { fg: 'var(--st-atrasada-fg)', bg: 'var(--st-atrasada-bg)' },
  aprovada: { fg: 'var(--st-aprovada-fg)', bg: 'var(--st-aprovada-bg)' },
  ajustar: { fg: 'var(--st-ajustar-fg)', bg: 'var(--st-ajustar-bg)' },
};

export interface StatusBadgeProps {
  status: StatusTarefa;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const cor = CORES[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        className,
      )}
      style={{ color: cor.fg, background: cor.bg }}
    >
      {STATUS_TAREFA_LABEL[status]}
    </span>
  );
}
