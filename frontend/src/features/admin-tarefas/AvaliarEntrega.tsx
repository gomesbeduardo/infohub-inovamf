'use client';

import { useState } from 'react';
import type { Entrega, Tarefa } from '@/data/api/tipos';
import { useAvaliar } from '@/data/api/consultas';
import { Button } from '@/design-system/components/Button';
import { Textarea } from '@/design-system/components/Textarea';
import { useToast } from '@/design-system/components/Toast';

/** Avalia (aprova ou pede ajustes) só a última entrega, e só com a tarefa "entregue". */
export function AvaliarEntrega({
  tarefa,
  entrega,
  equipeSlug,
}: {
  tarefa: Tarefa;
  entrega: Entrega;
  equipeSlug: string;
}) {
  const avaliar = useAvaliar(tarefa.slug, equipeSlug);
  const toast = useToast();
  const [ajustando, setAjustando] = useState(false);
  const [comentario, setComentario] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  if (tarefa.status !== 'entregue') return null;

  function aprovar() {
    setErro(null);
    avaliar.mutate(
      { entregaSlug: entrega.slug, resultado: 'aprovada' },
      {
        onSuccess: () => toast.sucesso('Entrega aprovada.'),
        onError: (err) => setErro(err instanceof Error ? err.message : 'Não foi possível avaliar a entrega.'),
      },
    );
  }

  function solicitarAjustes() {
    const texto = comentario.trim();
    if (!texto) return;
    setErro(null);
    avaliar.mutate(
      { entregaSlug: entrega.slug, resultado: 'ajustar', comentario: texto },
      {
        onSuccess: () => {
          setAjustando(false);
          setComentario('');
          toast.sucesso('Ajustes solicitados à equipe.');
        },
        onError: (err) => setErro(err instanceof Error ? err.message : 'Não foi possível avaliar a entrega.'),
      },
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {!ajustando ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={avaliar.isPending} onClick={aprovar}>
            Aprovar
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={avaliar.isPending}
            onClick={() => setAjustando(true)}
          >
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
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setAjustando(false);
                setComentario('');
                setErro(null);
              }}
            >
              Cancelar
            </Button>
            <Button size="sm" disabled={!comentario.trim() || avaliar.isPending} onClick={solicitarAjustes}>
              Enviar avaliação
            </Button>
          </div>
        </div>
      )}

      {erro && (
        <p
          role="alert"
          className="rounded-[0.625rem] bg-danger-soft px-3 py-2 text-sm font-medium text-danger-text"
        >
          {erro}
        </p>
      )}
    </div>
  );
}
