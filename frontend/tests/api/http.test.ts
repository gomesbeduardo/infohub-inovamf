import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '@/data/api/http';
import { ApiError } from '@/data/api/erro';
import { sessao } from '@/data/api/sessao';

function resposta(status: number, corpo?: unknown) {
  return new Response(corpo === undefined ? null : JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
const SESSAO = { access: 'A1', refresh: 'R1', usuario: { slug: 's', nome: 'Ana', role: 'admin' as const } };

describe('api()', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    sessao.aplicar(SESSAO);
  });

  it('manda o Bearer da sessão', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockResolvedValue(resposta(200, { ok: 1 }));
    await expect(api('/x')).resolves.toEqual({ ok: 1 });
    expect(f).toHaveBeenCalledWith('/api/v1/x', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer A1' }) }));
  });

  it('em 401 renova UMA vez e repete a requisição', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      if (url === '/api/v1/auth/refresh') return resposta(200, { ...SESSAO, access: 'A2', refresh: 'R2' });
      const auth = (init?.headers as Record<string, string>).Authorization;
      return auth === 'Bearer A2' ? resposta(200, { ok: 2 }) : resposta(401, { error: { code: 'INVALID_TOKEN', message: 'x' } });
    });
    const [a, b] = await Promise.all([api('/x'), api('/y')]);
    expect(a).toEqual({ ok: 2 });
    expect(b).toEqual({ ok: 2 });
    expect(f.mock.calls.filter(([u]) => u === '/api/v1/auth/refresh')).toHaveLength(1);
    expect(localStorage.getItem('infohub-refresh')).toBe('R2');
  });

  it('refresh falhou → sessão anônima e ApiError 401', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(resposta(401, { error: { code: 'INVALID_TOKEN', message: 'expirou' } }));
    await expect(api('/x')).rejects.toMatchObject({ status: 401 });
    expect(sessao.estado().status).toBe('anonimo');
    expect(localStorage.getItem('infohub-refresh')).toBeNull();
  });

  it.each([
    ['5xx', () => resposta(502)],
    ['erro de rede', () => Promise.reject(new TypeError('Failed to fetch'))],
  ])('refresh com %s não apaga a sessão; a próxima tentativa renova', async (_nome, falha) => {
    let backendFora = true;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      if (url === '/api/v1/auth/refresh') {
        return backendFora ? falha() : resposta(200, { ...SESSAO, access: 'A2', refresh: 'R2' });
      }
      const auth = (init?.headers as Record<string, string>).Authorization;
      return auth === 'Bearer A2' ? resposta(200, { ok: 2 }) : resposta(401, { error: { code: 'INVALID_TOKEN', message: 'x' } });
    });
    await expect(api('/x')).rejects.toMatchObject({ status: 401 });
    expect(localStorage.getItem('infohub-refresh')).toBe('R1');
    expect(sessao.estado().status).toBe('autenticado');

    backendFora = false;
    await expect(api('/x')).resolves.toEqual({ ok: 2 });
    expect(localStorage.getItem('infohub-refresh')).toBe('R2');
  });

  it('erro de domínio vira ApiError com code, message e details', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      resposta(409, { error: { code: 'RN01_PENDENCIAS', message: 'Há pendências', details: { pendencias: [] } } }),
    );
    const e = await api('/x', { method: 'POST', body: {} }).catch((x) => x);
    expect(e).toBeInstanceOf(ApiError);
    expect(e).toMatchObject({ status: 409, code: 'RN01_PENDENCIAS', message: 'Há pendências', details: { pendencias: [] } });
  });
});
