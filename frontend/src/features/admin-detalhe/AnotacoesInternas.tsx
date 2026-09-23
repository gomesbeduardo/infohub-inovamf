'use client';

import { useState, type FormEvent } from 'react';
import { useAnotacoes, useAnotar } from '@/data/api/consultas';
import { formatarDataHora } from '@/domain/labels';
import { Textarea } from '@/design-system/components/Textarea';
import { Button } from '@/design-system/components/Button';
import { EmptyState } from '@/design-system/components/EmptyState';

/** RF-10: anotações internas da coordenação/mentor sobre a equipe. */
export function AnotacoesInternas({ equipeSlug }: { equipeSlug: string }) {
  const consulta = useAnotacoes(equipeSlug);
  const anotar = useAnotar(equipeSlug);
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  function salvar(e: FormEvent) {
    e.preventDefault();
    const conteudo = texto.trim();
    if (!conteudo) return;
    setErro(null);
    anotar.mutate(conteudo, {
      onSuccess: () => setTexto(''),
      onError: (err) => setErro(err instanceof Error ? err.message : 'Não foi possível salvar a anotação.'),
    });
  }

  const itens = [...(consulta.data ?? [])].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-text-muted">Visível só para a coordenação e o mentor.</p>

      <form className="flex flex-col gap-2" onSubmit={salvar}>
        <Textarea
          aria-label="Nova anotação"
          placeholder="Registrar uma observação do encontro…"
          rows={2}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        {erro && (
          <p
            role="alert"
            className="rounded-[0.625rem] bg-danger-soft px-3 py-2 text-sm font-medium text-danger-text"
          >
            {erro}
          </p>
        )}
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={!texto.trim() || anotar.isPending}>
            {anotar.isPending ? 'Salvando…' : 'Adicionar anotação'}
          </Button>
        </div>
      </form>

      {consulta.isPending ? (
        <p className="text-sm text-text-muted">Carregando…</p>
      ) : consulta.isError ? (
        <div className="flex flex-col items-start gap-2">
          <p
            role="alert"
            className="rounded-[0.625rem] bg-danger-soft px-3 py-2 text-sm font-medium text-danger-text"
          >
            {consulta.error.message}
          </p>
          <Button size="sm" variant="secondary" onClick={() => void consulta.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : itens.length === 0 ? (
        <EmptyState title="Sem anotações" />
      ) : (
        <ul className="flex flex-col gap-2">
          {itens.map((a) => (
            <li key={a.slug} className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-3">
              <span className="whitespace-pre-line text-sm text-text">{a.conteudo}</span>
              <span className="text-xs text-text-muted">
                {a.autor.nome} · {formatarDataHora(a.criadoEm)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
