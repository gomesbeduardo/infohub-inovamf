'use client';

import type { Equipe } from '@/domain/types';
import { useStore } from '@/data/store';
import { equipesParaCSV } from '@/data/repository';
import { Button } from '@/design-system/components/Button';

export function ExportarCSV({ equipes }: { equipes: Equipe[] }) {
  const { state } = useStore();

  function baixar() {
    const csv = equipesParaCSV(state, equipes);
    // BOM (U+FEFF) para o Excel abrir em UTF-8
    const bom = String.fromCharCode(0xfeff);
    const blob = new Blob([bom + csv], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'equipes-infohub.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="secondary" size="sm" onClick={baixar} disabled={equipes.length === 0}>
      Exportar CSV
    </Button>
  );
}
