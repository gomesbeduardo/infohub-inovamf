'use client';

import { useEffect, useState } from 'react';
import type { FiltrosEquipes } from '@/data/api/tipos';

/** Remove chaves vazias — a chave da query e o CSV ficam estáveis ({} = sem filtro). */
export function limparFiltros(f: FiltrosEquipes): FiltrosEquipes {
  const r: Record<string, unknown> = {};
  for (const [k, bruto] of Object.entries(f)) {
    const v: unknown = typeof bruto === 'string' ? bruto.trim() : bruto;
    if (v !== undefined && v !== '') r[k] = v;
  }
  return r as FiltrosEquipes;
}

/** Valor que só acompanha `valor` depois de `ms` sem mudanças (busca por texto). */
export function useAdiado<T>(valor: T, ms = 300): T {
  const [adiado, setAdiado] = useState(valor);
  useEffect(() => {
    const t = window.setTimeout(() => setAdiado(valor), ms);
    return () => window.clearTimeout(t);
  }, [valor, ms]);
  return adiado;
}
