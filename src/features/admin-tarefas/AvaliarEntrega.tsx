'use client';

import { useState } from 'react';
import type { Entrega, Tarefa } from '@/domain/types';
import { useStore, useActions } from '@/data/store';
import { getUsuarioAtual } from '@/data/session';
import { Button } from '@/design-system/components/Button';
import { Textarea } from '@/design-system/components/Textarea';

export function AvaliarEntrega({
  tarefa,
  entrega,
}: {
  tarefa: Tarefa;
  entrega: Entrega;
}) {
  const { state } = useStore();
  const { avaliar } = useActions();
  const [ajustando, setAjustando] = useState(false);
  const [comentario, setComentario] = useState('');

  const avaliadorId = getUsuarioAtual(state)?.id ?? 'u-admin';

  function aprovar() {
    avaliar(entrega.id, { resultado: 'aprovada', avaliadorId });
  }

  function solicitarAjustes() {
    avaliar(entrega.id, {
      resultado: 'ajustar',
      comentario: comentario || undefined,
      avaliadorId,
    });
    setAjustando(false);
    setComentario('');
  }

  if (tarefa.status !== 'entregue') return null;

  return (
    <div className="flex flex-col gap-2">
      {!ajustando ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={aprovar}>
            Aprovar
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setAjustando(true)}>
            Solicitar ajustes
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Textarea
            aria-label="Comentário da avaliação"
            placeholder="O que precisa ser ajustado?"
            rows={2}
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setAjustando(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={solicitarAjustes}>
              Enviar avaliação
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
