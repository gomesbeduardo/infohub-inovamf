'use client';

import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useEquipes, useUsuarios } from '@/data/api/consultas';
import { Dialog } from '@/design-system/components/primitives/Dialog';
import { Input } from '@/design-system/components/Input';
import { SearchIcon } from '@/design-system/icons';
import { cn } from '@/design-system/cn';
import { filtrarResultados, type ResultadoBusca } from '@/features/shell/busca';

type Papel = 'admin' | 'mentor';

/**
 * Busca rápida (B4) para admin e mentor: Ctrl+K / ⌘K ou a lupa do topo.
 * Diálogo Radix (foco preso, Esc fecha); setas escolhem, Enter navega.
 */
export function BuscaRapida({ papel }: { papel: Papel }) {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    function atalho(e: globalThis.KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setAberto(true);
      }
    }
    window.addEventListener('keydown', atalho);
    return () => window.removeEventListener('keydown', atalho);
  }, []);

  return (
    <>
      <button
        type="button"
        aria-label="Busca rápida"
        aria-keyshortcuts="Control+K Meta+K"
        title="Busca rápida (Ctrl+K)"
        onClick={() => setAberto(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
      >
        <SearchIcon size={18} />
      </button>
      {aberto && <PainelBusca papel={papel} onFechar={() => setAberto(false)} />}
    </>
  );
}

// Só monta quando aberto: as listas não são buscadas à toa em toda tela.
function PainelBusca({ papel, onFechar }: { papel: Papel; onFechar: () => void }) {
  const router = useRouter();
  const equipes = useEquipes();
  const pessoas = useUsuarios(undefined, { enabled: papel === 'admin' });
  const [termo, setTermo] = useState('');
  const [ativo, setAtivo] = useState(0);
  const listaId = useId();

  const resultados = filtrarResultados({
    termo,
    papel,
    equipes: equipes.data ?? [],
    pessoas: pessoas.data ?? [],
  });
  const idOpcao = (i: number) => `${listaId}-${i}`;

  function ir(r: ResultadoBusca) {
    onFechar();
    router.push(r.href);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAtivo((i) => Math.min(i + 1, resultados.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setAtivo((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      const r = resultados[ativo];
      if (r) {
        e.preventDefault();
        ir(r);
      }
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onFechar();
      }}
      title="Busca rápida"
      description={
        papel === 'admin'
          ? 'Equipes pelo nome da ideia e contas por nome ou e-mail.'
          : 'Suas equipes pelo nome da ideia.'
      }
    >
      <div className="flex flex-col gap-3">
        <Input
          role="combobox"
          aria-label="Buscar"
          aria-expanded={resultados.length > 0}
          aria-controls={listaId}
          aria-autocomplete="list"
          aria-activedescendant={resultados[ativo] ? idOpcao(ativo) : undefined}
          placeholder="Digite para buscar…"
          value={termo}
          onChange={(e) => {
            setTermo(e.target.value);
            setAtivo(0);
          }}
          onKeyDown={onKeyDown}
        />
        {termo.trim() !== '' && resultados.length === 0 && (
          <p role="status" className="px-1 text-sm text-text-muted">
            Nada encontrado para “{termo.trim()}”.
          </p>
        )}
        <ul
          id={listaId}
          role="listbox"
          aria-label="Resultados"
          className="flex max-h-72 flex-col gap-1 overflow-y-auto"
        >
          {resultados.map((r, i) => (
            <li
              key={r.chave}
              id={idOpcao(i)}
              role="option"
              aria-selected={i === ativo}
              onMouseEnter={() => setAtivo(i)}
              onClick={() => ir(r)}
              className={cn(
                'flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm',
                i === ativo ? 'bg-primary-soft text-primary-text' : 'text-text hover:bg-surface-sunken',
              )}
            >
              <span className="truncate font-medium">{r.titulo}</span>
              <span className="shrink-0 text-xs text-text-muted">{r.subtitulo}</span>
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  );
}
