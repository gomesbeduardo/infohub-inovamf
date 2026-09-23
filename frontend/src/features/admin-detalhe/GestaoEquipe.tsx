'use client';

import { useState } from 'react';
import type { StatusEquipe } from '@/domain/types';
import type { EquipeDetalhe } from '@/data/api/tipos';
import { useAtualizarEquipe, useUsuarios } from '@/data/api/consultas';
import { STATUS_EQUIPE_LABEL } from '@/domain/labels';
import { Card } from '@/design-system/components/Card';
import { FormField } from '@/design-system/components/FormField';
import { Select, type SelectOption } from '@/design-system/components/Select';
import { useToast } from '@/design-system/components/Toast';

/** Status que o admin escolhe à mão (A1). "Pronta" só vem do avanço de etapa (RN-02). */
const STATUS_GESTAO: StatusEquipe[] = ['ativa', 'pausada', 'desistente', 'encaminhada_inovamf'];

/**
 * Card "Gestão" (só admin): mentor e status da equipe via PATCH /equipes/:slug.
 * Quem decide se a transição vale é o backend — o 409 TRANSICAO_INVALIDA
 * aparece inline; o sucesso vira toast.
 */
export function GestaoEquipe({ equipe }: { equipe: EquipeDetalhe }) {
  const mentores = useUsuarios('mentor');
  const atualizar = useAtualizarEquipe(equipe.slug);
  const toast = useToast();
  const [erro, setErro] = useState<string | null>(null);

  const opcoesMentor: SelectOption[] = [
    { value: '', label: 'Sem mentor' },
    ...(mentores.data ?? []).filter((u) => u.ativo).map((u) => ({ value: u.slug, label: u.nome })),
  ];
  // O mentor atual pode não estar na lista (ex.: um admin mentorando) — mantém a opção dele.
  if (equipe.mentor && !opcoesMentor.some((o) => o.value === equipe.mentor?.slug)) {
    opcoesMentor.push({ value: equipe.mentor.slug, label: equipe.mentor.nome });
  }
  const opcoesStatus: SelectOption[] = STATUS_GESTAO.map((s) => ({ value: s, label: STATUS_EQUIPE_LABEL[s] }));
  if (!STATUS_GESTAO.includes(equipe.status)) {
    opcoesStatus.unshift({ value: equipe.status, label: STATUS_EQUIPE_LABEL[equipe.status] });
  }

  function salvar(body: { mentor?: string | null; status?: StatusEquipe }, mensagem: string) {
    setErro(null);
    atualizar.mutate(body, {
      onSuccess: () => toast.sucesso(mensagem),
      onError: (err) => setErro(err instanceof Error ? err.message : 'Não foi possível atualizar a equipe.'),
    });
  }

  return (
    <Card>
      <Card.Header>
        <h3 className="text-sm font-semibold text-text">Gestão</h3>
      </Card.Header>
      <Card.Body className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Mentor" htmlFor="gestao-mentor">
            <Select
              id="gestao-mentor"
              options={opcoesMentor}
              value={equipe.mentor?.slug ?? ''}
              disabled={atualizar.isPending}
              onChange={(e) => {
                const v = e.target.value;
                salvar({ mentor: v || null }, v ? 'Mentor atualizado.' : 'A equipe ficou sem mentor.');
              }}
            />
          </FormField>
          <FormField
            label="Status"
            htmlFor="gestao-status"
            hint="“Pronta p/ InovAMF” vem do avanço de etapa; encaminhar só a partir dela."
          >
            <Select
              id="gestao-status"
              options={opcoesStatus}
              value={equipe.status}
              disabled={atualizar.isPending}
              onChange={(e) => {
                const v = e.target.value as StatusEquipe;
                if (v === equipe.status) return;
                salvar({ status: v }, `Status alterado para ${STATUS_EQUIPE_LABEL[v]}.`);
              }}
            />
          </FormField>
        </div>
        {erro && (
          <p
            role="alert"
            className="rounded-[0.625rem] bg-danger-soft px-3 py-2 text-sm font-medium text-danger-text"
          >
            {erro}
          </p>
        )}
      </Card.Body>
    </Card>
  );
}
