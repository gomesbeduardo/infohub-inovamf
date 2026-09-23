'use client';

import { useState } from 'react';
import type { EquipeResumo, Pendencia, Posicao } from '@/data/api/tipos';
import { useEquipe, useMoverEtapa } from '@/data/api/consultas';
import { ApiError } from '@/data/api/erro';
import { Button } from '@/design-system/components/Button';
import { FormField } from '@/design-system/components/FormField';
import { Textarea } from '@/design-system/components/Textarea';
import { Dialog } from '@/design-system/components/primitives/Dialog';

/** Posição no funil: etapas 1..6 e "pronta" (7). Só para comparar origem × destino. */
export const POSICAO_PRONTA = 7;

/** O mínimo de uma equipe para movê-la — serve tanto o resumo (funil) quanto o detalhe. */
export type EquipeMovel = Pick<EquipeResumo, 'slug' | 'nomeIdeia' | 'status' | 'etapa'>;

export function posicaoDe(equipe: Pick<EquipeResumo, 'status' | 'etapa'>): number {
  return equipe.status === 'pronta_inovamf' || equipe.status === 'encaminhada_inovamf'
    ? POSICAO_PRONTA
    : equipe.etapa.numero;
}

const numero = (p: Posicao) => (p === 'pronta' ? POSICAO_PRONTA : p);

const MOTIVO: Record<Extract<Pendencia, { tipo: 'integrante' }>['motivo'], string> = {
  convite_pendente: 'convite pendente',
  dados_incompletos: 'dados incompletos',
};

export function textoPendencia(p: Pendencia): string {
  if (p.tipo === 'tarefa') return `tarefa: ${p.titulo}`;
  if (p.tipo === 'entregavel') return `entregável não criado: ${p.titulo}`;
  return `integrante: ${p.nome} — ${MOTIVO[p.motivo]}`;
}

/** Chave estável de uma pendência numa lista (o entregável ausente não tem slug). */
export function chavePendencia(p: Pendencia): string {
  return p.tipo === 'entregavel' ? `entregavel-${p.titulo}` : `${p.tipo}-${p.slug}`;
}

/** 409 que levam o diálogo ao modo "forçar" com as pendências da API (RN-01 e RN-02). */
const CODIGOS_FORCAR = ['RN01_PENDENCIAS', 'RN01_SALTO', 'RN02_PENDENCIAS'];

function pendenciasDoErro(e: ApiError): Pendencia[] {
  const d = e.details as { pendencias?: Pendencia[] } | undefined;
  return Array.isArray(d?.pendencias) ? d.pendencias : [];
}

/**
 * Confirmação de um arraste no funil (RF-09 / RN-01). Mostra origem → destino e,
 * se for avanço, as pendências que a API aponta (`pendenciasParaAvancar`). Com
 * pendência ou salto de etapa, exige observação e envia `forcado: true`. Se a
 * API recusar com 409 `RN01_*`/`RN02_PENDENCIAS`, passa para o modo "forçar" com
 * as pendências devolvidas. A regra é do backend — aqui só se lê o que ele diz.
 */
export function DialogoMover({
  equipe,
  destino,
  origemLabel,
  destinoLabel,
  onClose,
}: {
  equipe: EquipeMovel;
  destino: Posicao;
  origemLabel: string;
  destinoLabel: string;
  onClose: () => void;
}) {
  const detalhe = useEquipe(equipe.slug);
  const mover = useMoverEtapa(equipe.slug);
  const [observacao, setObservacao] = useState('');
  const [erroObs, setErroObs] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  /** Pendências devolvidas por um 409 RN01_* — força o modo "forçar". */
  const [recusa, setRecusa] = useState<Pendencia[] | null>(null);

  const origem = posicaoDe(equipe);
  const avanco = numero(destino) > origem;
  const salto = numero(destino) > origem + 1;
  const pendencias: Pendencia[] =
    recusa ?? (avanco ? detalhe.data?.pendenciasParaAvancar ?? [] : []);
  const forcar = recusa !== null || (avanco && (salto || pendencias.length > 0));
  const carregandoPendencias = avanco && recusa === null && detalhe.isPending;

  function confirmar() {
    setErro(null);
    if (forcar && observacao.trim() === '') {
      setErroObs('Explique o motivo para forçar o movimento.');
      return;
    }
    setErroObs(null);
    const body = forcar
      ? { etapa: destino, forcado: true, observacao: observacao.trim() }
      : { etapa: destino };
    mover.mutate(body, {
      onSuccess: () => onClose(),
      onError: (e) => {
        if (e instanceof ApiError && CODIGOS_FORCAR.includes(e.code)) {
          setRecusa(pendenciasDoErro(e));
          setErro(e.message);
          return;
        }
        setErro(e instanceof Error ? e.message : 'Não foi possível mover a equipe.');
      },
    });
  }

  return (
    <Dialog
      open
      onOpenChange={(aberto) => {
        if (!aberto) onClose();
      }}
      title={forcar ? 'Forçar movimento?' : 'Confirmar movimento'}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-muted">
          Mover <span className="font-medium text-text">{equipe.nomeIdeia}</span> de{' '}
          <span className="font-medium text-text">{origemLabel}</span> para{' '}
          <span className="font-medium text-text">{destinoLabel}</span>?
        </p>

        {carregandoPendencias && (
          <p className="text-xs text-text-subtle">Carregando pendências…</p>
        )}
        {avanco && recusa === null && detalhe.isError && (
          <p className="text-xs text-text-subtle">
            Não foi possível conferir as pendências agora — o servidor valida ao mover.
          </p>
        )}

        {pendencias.length > 0 && (
          <div className="flex flex-col gap-1.5" data-testid="pendencias-mover">
            <p className="text-sm font-medium text-text">Pendências para avançar</p>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-text-muted">
              {pendencias.map((p) => (
                <li key={chavePendencia(p)}>{textoPendencia(p)}</li>
              ))}
            </ul>
          </div>
        )}

        {forcar && (
          <>
            <p className="text-sm text-text-muted">
              {salto && pendencias.length === 0
                ? 'Pular etapas só é possível forçando.'
                : 'Avançar com pendências só é possível forçando.'}{' '}
              O movimento será registrado como <span className="font-medium text-text">forçado</span>.
            </p>
            <FormField label="Observação" htmlFor="observacao-mover" error={erroObs ?? undefined}>
              <Textarea
                id="observacao-mover"
                rows={3}
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Por que mover mesmo assim?"
              />
            </FormField>
          </>
        )}

        {erro && (
          <p
            role="alert"
            className="rounded-[0.625rem] bg-danger-soft px-3 py-2 text-sm font-medium text-danger-text"
          >
            {erro}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" data-testid="cancelar-movimento" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant={forcar ? 'danger' : 'primary'}
            data-testid="confirmar-movimento"
            onClick={confirmar}
            disabled={mover.isPending || carregandoPendencias}
          >
            {mover.isPending ? 'Movendo…' : forcar ? 'Forçar movimento' : 'Mover'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
