import { useStore } from '@/data/store';
import { ETAPA_NOME } from '@/domain/labels';
import { EmptyState } from '@/design-system/components/EmptyState';

export function HistoricoEtapas({ equipeId }: { equipeId: string }) {
  const { state } = useStore();
  const itens = state.historico
    .filter((h) => h.equipeId === equipeId)
    .slice()
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));

  if (itens.length === 0) {
    return (
      <EmptyState
        title="Sem histórico"
        description="Nenhuma mudança de etapa registrada ainda."
      />
    );
  }

  return (
    <ol className="flex flex-col gap-2">
      {itens.map((h) => (
        <li
          key={h.id}
          className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          <span className="text-text">
            {h.etapaOrigemId ? `${ETAPA_NOME[h.etapaOrigemId] ?? h.etapaOrigemId} → ` : ''}
            {ETAPA_NOME[h.etapaDestinoId] ?? `Etapa ${h.etapaDestinoId}`}
          </span>
          {h.forcado && (
            <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs text-primary-text">
              forçado
            </span>
          )}
          {h.observacao && (
            <span className="text-text-muted">— {h.observacao}</span>
          )}
        </li>
      ))}
    </ol>
  );
}
