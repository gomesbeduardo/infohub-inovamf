import { lerErro } from './erro';
import { sessao } from './sessao';

export interface Opcoes {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Rota pública: não manda Bearer nem tenta refresh. */
  publica?: boolean;
}

function enviar(path: string, o: Opcoes, access: string | null): Promise<Response> {
  const headers: Record<string, string> = {};
  if (o.body !== undefined) headers['Content-Type'] = 'application/json';
  if (access && !o.publica) headers.Authorization = `Bearer ${access}`;
  return fetch(`/api/v1${path}`, {
    method: o.method ?? 'GET',
    headers,
    body: o.body === undefined ? undefined : JSON.stringify(o.body),
  });
}

/** Resposta crua (ex.: CSV). Em 401 renova a sessão uma vez e repete. */
export async function requisicao(path: string, o: Opcoes = {}): Promise<Response> {
  let res = await enviar(path, o, sessao.access());
  if (res.status === 401 && !o.publica && (await sessao.renovar())) {
    res = await enviar(path, o, sessao.access());
  }
  if (!res.ok) throw await lerErro(res);
  return res;
}

export async function api<T>(path: string, o: Opcoes = {}): Promise<T> {
  const res = await requisicao(path, o);
  return (res.status === 204 ? undefined : await res.json()) as T;
}
