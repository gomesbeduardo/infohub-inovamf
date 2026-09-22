import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useEquipes, useMoverEtapa } from '@/data/api/consultas';
import { sessao } from '@/data/api/sessao';

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });

describe('consultas', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessao.aplicar({ access: 'A', refresh: 'R', usuario: { slug: 's', nome: 'x', role: 'admin' } });
  });

  it('useEquipes percorre as páginas e junta tudo', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) =>
      String(url).includes('page=1')
        ? json({ data: new Array(100).fill({ slug: 'a' }), page: 1, perPage: 100, total: 101 })
        : json({ data: [{ slug: 'b' }], page: 2, perPage: 100, total: 101 }),
    );
    const { result } = renderHook(() => useEquipes({ q: 'x' }), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(101);
    expect(String(f.mock.calls[0]![0])).toContain('q=x');
  });

  it('useMoverEtapa expõe o 409 da RN-01 com as pendências', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      json({ error: { code: 'RN01_PENDENCIAS', message: 'Há pendências', details: { pendencias: [{ tipo: 'tarefa', slug: 't', titulo: 'BMC' }] } } }, 409),
    );
    const { result } = renderHook(() => useMoverEtapa('eq'), { wrapper: wrapper() });
    result.current.mutate({ etapa: 3 });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ code: 'RN01_PENDENCIAS', details: { pendencias: [{ titulo: 'BMC' }] } });
  });
});
