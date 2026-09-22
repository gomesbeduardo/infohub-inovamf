import type { MovimentoHistorico, Posicao } from '@/data/api/tipos';
import { formatarDataHora } from '@/domain/labels';
import { Badge } from '@/design-system/components/Badge';
import { EmptyState } from '@/design-system/components/EmptyState';

const posicao = (p: Posicao) => (p === 'pronta' ? 'Pronta' : `Etapa ${p}`);

/** Movimentos da equipe no funil (mais recentes primeiro), como a API registra. */
export function HistoricoEtapas({ historico }: { historico: MovimentoHistorico[] }) {
  if (historico.length === 0) {
    return <EmptyState title="Sem histórico" description="Nenhuma mudança de etapa registrada ainda." />;
  }

  const itens = [...historico].sort((a, b) => b.em.localeCompare(a.em));

  return (
    <ol className="flex flex-col gap-2">
      {itens.map((h, i) => (
        <li
          key={`${h.em}-${i}`}
          className="flex flex-col gap-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-text">
              {h.de !== null ? `${posicao(h.de)} → ` : ''}
              {posicao(h.para)}
            </span>
            {h.forcado && <Badge tone="brand">forçado</Badge>}
          </div>
          {h.observacao && <p className="text-text-muted">{h.observacao}</p>}
          <span className="text-xs text-text-subtle">
            {h.por?.nome ? `${h.por.nome} · ` : ''}
            {formatarDataHora(h.em)}
          </span>
        </li>
      ))}
    </ol>
  );
}
