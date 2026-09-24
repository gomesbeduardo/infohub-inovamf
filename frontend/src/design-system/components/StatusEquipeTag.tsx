import type { StatusEquipe } from '@/domain/types';
import { STATUS_EQUIPE_LABEL } from '@/domain/labels';
import { Badge } from '@/design-system/components/Badge';

// Cor do ponto por status. O status usa pílula neutra + ponto semântico para
// nunca ser confundido com a área (que é a pílula tingida).
const PONTO: Record<StatusEquipe, string> = {
  ativa: 'var(--success)',
  pronta_inovamf: 'var(--info-text)',
  encaminhada_inovamf: 'var(--primary)',
  pausada: 'var(--warning-text)',
  desistente: 'var(--text-subtle)',
};

export function StatusEquipeTag({ status, className }: { status: StatusEquipe; className?: string }) {
  return (
    <Badge className={className}>
      <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: PONTO[status] }} />
      {STATUS_EQUIPE_LABEL[status]}
    </Badge>
  );
}
