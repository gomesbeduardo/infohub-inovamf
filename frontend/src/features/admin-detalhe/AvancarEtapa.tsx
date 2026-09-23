'use client';

import { useState } from 'react';
import type { EquipeDetalhe, Posicao } from '@/data/api/tipos';
import { useEtapas } from '@/data/api/consultas';
import { Button } from '@/design-system/components/Button';
import { DialogoMover, POSICAO_PRONTA, chavePendencia, posicaoDe, textoPendencia } from '@/features/funil/DialogoMover';

const TITULO_PRONTA = 'Pronta p/ InovAMF';

/**
 * Avançar / retroceder / marcar como pronta pelo detalhe — o caminho acessível
 * por teclado do funil. Mostra as pendências que a API aponta
 * (`pendenciasParaAvancar`); com pendências o avanço vira "forçar" e exige
 * observação. A confirmação (e o 409 RN01_*) é o mesmo `DialogoMover` do funil.
 */
export function AvancarEtapa({ equipe }: { equipe: EquipeDetalhe }) {
  const etapas = useEtapas();
  const [destino, setDestino] = useState<Posicao | null>(null);

  const atual = posicaoDe(equipe);
  const pendencias = equipe.pendenciasParaAvancar;
  const comPendencias = pendencias.length > 0;
  const proxima: Posicao | null = atual >= POSICAO_PRONTA ? null : atual === 6 ? 'pronta' : atual + 1;
  const anterior: Posicao | null = atual > 1 ? atual - 1 : null;

  function rotulo(p: Posicao): string {
    if (p === 'pronta' || p === POSICAO_PRONTA) return TITULO_PRONTA;
    const nome = etapas.data?.find((e) => e.numero === p)?.nome ?? (p === equipe.etapa.numero ? equipe.etapa.nome : null);
    return nome ? `${p}. ${nome}` : `Etapa ${p}`;
  }

  const rotuloAvanco =
    proxima === 'pronta'
      ? comPendencias
        ? 'Forçar: marcar como pronta'
        : 'Marcar como pronta'
      : comPendencias
        ? 'Forçar avanço'
        : 'Avançar etapa';

  return (
    <div className="flex flex-col gap-3">
      {proxima !== null && comPendencias && (
        <div
          className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface-sunken p-3"
          data-testid="pendencias-avancar"
        >
          <p className="text-sm font-medium text-text">Pendências para avançar</p>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-text-muted">
            {pendencias.map((p) => (
              <li key={chavePendencia(p)}>{textoPendencia(p)}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {proxima !== null && (
          <Button variant={comPendencias ? 'danger' : 'primary'} onClick={() => setDestino(proxima)}>
            {rotuloAvanco}
          </Button>
        )}
        {anterior !== null && (
          <Button variant="secondary" onClick={() => setDestino(anterior)}>
            Retroceder
          </Button>
        )}
      </div>

      {destino !== null && (
        <DialogoMover
          equipe={equipe}
          destino={destino}
          origemLabel={rotulo(atual)}
          destinoLabel={rotulo(destino)}
          onClose={() => setDestino(null)}
        />
      )}
    </div>
  );
}
