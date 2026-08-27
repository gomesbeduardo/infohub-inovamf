'use client';

import { useState } from 'react';
import type { Equipe } from '@/domain/types';
import { useStore, useActions } from '@/data/store';
import { getUsuarioAtual } from '@/data/session';
import { Textarea } from '@/design-system/components/Textarea';
import { Button } from '@/design-system/components/Button';
import { EmptyState } from '@/design-system/components/EmptyState';

export function AnotacoesInternas({ equipe }: { equipe: Equipe }) {
  const { state } = useStore();
  const { anotar } = useActions();
  const [texto, setTexto] = useState('');

  const autorId = getUsuarioAtual(state)?.id ?? 'u-admin';
  const itens = state.anotacoes
    .filter((a) => a.equipeId === equipe.id)
    .slice()
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));

  function salvar() {
    if (!texto.trim()) return;
    anotar(equipe.id, { conteudo: texto.trim(), autorId });
    setTexto('');
  }

  function nomeAutor(id: string) {
    return state.usuarios.find((u) => u.id === id)?.nome ?? 'Mentor';
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-text-muted">
        Anotações internas do mentor — não visíveis ao aluno.
      </p>

      <div className="flex flex-col gap-2">
        <Textarea
          aria-label="Nova anotação"
          placeholder="Registrar uma observação do encontro…"
          rows={2}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={salvar} disabled={!texto.trim()}>
            Adicionar anotação
          </Button>
        </div>
      </div>

      {itens.length === 0 ? (
        <EmptyState title="Sem anotações" />
      ) : (
        <ul className="flex flex-col gap-2">
          {itens.map((a) => (
            <li
              key={a.id}
              className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-3"
            >
              <span className="text-sm text-text">{a.conteudo}</span>
              <span className="text-xs text-text-muted">
                {nomeAutor(a.autorId)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
