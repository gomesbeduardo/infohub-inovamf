import type { StatusTarefa } from '@/domain/types';
import { textoPrazo } from '@/domain/prazo';
import { cn } from '@/design-system/cn';

export interface PrazoChipProps {
  /** `dataEntrega` como a API manda (ISO; só o dia importa). */
  dataEntrega: string;
  status: StatusTarefa;
  /** Injetável para teste; padrão = hoje no fuso da AMF. */
  hoje?: string;
  className?: string;
}

/** Chip de prazo (B3) nas listas de tarefas. Não renderiza nada quando não há prazo a mostrar. */
export function PrazoChip({ dataEntrega, status, hoje, className }: PrazoChipProps) {
  const texto = textoPrazo(dataEntrega, status, hoje);
  if (!texto) return null;
  const tom =
    status === 'atrasada'
      ? 'bg-danger-soft text-danger-text border-[color:var(--danger-border)]'
      : texto === 'vence hoje'
        ? 'bg-[color:var(--warning-soft)] text-[color:var(--warning-text)] border-[color:var(--warning-border)]'
        : 'bg-[color:var(--chip-bg)] text-[color:var(--chip-text)] border-[color:var(--chip-border)]';
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', tom, className)}>
      {texto}
    </span>
  );
}
