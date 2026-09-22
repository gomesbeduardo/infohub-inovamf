'use client';

import { useState } from 'react';
import type { FiltrosEquipes } from '@/data/api/tipos';
import { baixarCSV } from '@/data/api/consultas';
import { Button } from '@/design-system/components/Button';

/** RF-23: o backend gera o CSV com os mesmos filtros do funil; aqui só dispara o download. */
export function ExportarCSV({
  filtros,
  desabilitado = false,
}: {
  filtros: FiltrosEquipes;
  desabilitado?: boolean;
}) {
  const [baixando, setBaixando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function baixar() {
    setErro(null);
    setBaixando(true);
    try {
      await baixarCSV(filtros);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível exportar o CSV.');
    } finally {
      setBaixando(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {erro && (
        <p role="alert" className="text-xs font-medium text-danger-text">
          {erro}
        </p>
      )}
      <Button
        variant="secondary"
        size="sm"
        onClick={() => void baixar()}
        disabled={desabilitado || baixando}
      >
        {baixando ? 'Exportando…' : 'Exportar CSV'}
      </Button>
    </div>
  );
}
