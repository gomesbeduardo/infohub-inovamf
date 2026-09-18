'use client';

import { useState } from 'react';
import type { Equipe } from '@/domain/types';
import { useStore, useActions } from '@/data/store';
import { tarefasObrigatoriasPendentes } from '@/data/repository';
import { getUsuarioAtual } from '@/data/session';
import { Button } from '@/design-system/components/Button';
import { Textarea } from '@/design-system/components/Textarea';

export function AvancarEtapa({ equipe }: { equipe: Equipe }) {
  const { state } = useStore();
  const { avancar, retroceder } = useActions();
  const [aberto, setAberto] = useState(false);
  const [forcar, setForcar] = useState(false);
  const [obs, setObs] = useState('');

  const pendentes = tarefasObrigatoriasPendentes(
    state,
    equipe.id,
    equipe.etapaAtualId,
  );
  const bloqueado = pendentes.length > 0;
  const autorId = getUsuarioAtual(state)?.id ?? 'u-admin';

  function fechar() {
    setAberto(false);
    setForcar(false);
    setObs('');
  }

  function confirmar() {
    if (bloqueado && !forcar) return;
    avancar(equipe.id, {
      forcar: bloqueado ? forcar : false,
      autorId,
      observacao: obs || undefined,
    });
    fechar();
  }

  function onRetroceder() {
    retroceder(equipe.id, { autorId });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setAberto(true)}>Avançar etapa</Button>
        <Button
          variant="secondary"
          onClick={onRetroceder}
          disabled={equipe.etapaAtualId <= 1}
        >
          Retroceder
        </Button>
      </div>

      {aberto && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-sunken p-4">
          {bloqueado ? (
            <p className="text-sm text-primary-text">
              Há {pendentes.length} tarefa(s) obrigatória(s) ainda não aprovada(s)
              nesta etapa (RN-01). Marque “Forçar” para avançar mesmo assim.
            </p>
          ) : (
            <p className="text-sm text-text-muted">
              Confirmar avanço para a próxima etapa da jornada.
            </p>
          )}

          {bloqueado && (
            <label className="flex items-center gap-2 text-sm text-text">
              <input
                type="checkbox"
                checked={forcar}
                onChange={(e) => setForcar(e.target.checked)}
              />
              Forçar avanço
            </label>
          )}

          <Textarea
            aria-label="Observação"
            placeholder="Observação (opcional)"
            rows={2}
            value={obs}
            onChange={(e) => setObs(e.target.value)}
          />

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={fechar}>
              Cancelar
            </Button>
            <Button onClick={confirmar} disabled={bloqueado && !forcar}>
              Confirmar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
