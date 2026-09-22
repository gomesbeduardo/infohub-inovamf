import { lerErro } from './erro';

// Sessão real (JWT). Access token SÓ em memória (não sobrevive a reload — é
// reobtido pelo refresh); refresh em localStorage. Várias 401 simultâneas
// disparam UM refresh (single-flight): o backend revoga tudo se um refresh
// usado for reapresentado (TOKEN_REUSE).

export type Papel = 'admin' | 'mentor' | 'aluno';
export interface UsuarioSessao {
  slug: string;
  nome: string;
  role: Papel;
}
export type EstadoSessao =
  | { status: 'carregando' }
  | { status: 'anonimo' }
  | { status: 'autenticado'; usuario: UsuarioSessao };
export interface RespostaSessao {
  access: string;
  refresh: string;
  usuario: UsuarioSessao;
}

const CHAVE = 'infohub-refresh';
let accessAtual: string | null = null;
let estadoAtual: EstadoSessao = { status: 'carregando' };
let renovando: Promise<boolean> | null = null;
const ouvintes = new Set<() => void>();

function lerRefresh(): string | null {
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}
function gravarRefresh(v: string | null): void {
  try {
    if (v) localStorage.setItem(CHAVE, v);
    else localStorage.removeItem(CHAVE);
  } catch {
    /* storage indisponível: sessão dura só a aba */
  }
}
function definir(e: EstadoSessao): void {
  estadoAtual = e;
  ouvintes.forEach((f) => f());
}
function limpar(): void {
  accessAtual = null;
  gravarRefresh(null);
  definir({ status: 'anonimo' });
}
function postar(path: string, body: unknown, bearer?: string): Promise<Response> {
  return fetch(`/api/v1${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

export const sessao = {
  access: (): string | null => accessAtual,
  estado: (): EstadoSessao => estadoAtual,
  assinar(f: () => void): () => void {
    ouvintes.add(f);
    return () => {
      ouvintes.delete(f);
    };
  },
  /** Grava uma sessão recebida (login, cadastro, aceite de convite, troca de senha). */
  aplicar(r: RespostaSessao): void {
    accessAtual = r.access;
    gravarRefresh(r.refresh);
    definir({ status: 'autenticado', usuario: r.usuario });
  },
  async entrar(email: string, senha: string): Promise<UsuarioSessao> {
    const res = await postar('/auth/login', { email, senha });
    if (!res.ok) throw await lerErro(res);
    const r = (await res.json()) as RespostaSessao;
    sessao.aplicar(r);
    return r.usuario;
  },
  renovar(): Promise<boolean> {
    if (!renovando) {
      renovando = (async () => {
        const refresh = lerRefresh();
        if (!refresh) {
          limpar();
          return false;
        }
        const res = await postar('/auth/refresh', { refresh }).catch(() => null);
        if (!res || !res.ok) {
          limpar();
          return false;
        }
        sessao.aplicar((await res.json()) as RespostaSessao);
        return true;
      })().finally(() => {
        renovando = null;
      });
    }
    return renovando;
  },
  /** No carregamento da página: tenta reabrir a sessão pelo refresh guardado. */
  async restaurar(): Promise<void> {
    if (estadoAtual.status !== 'carregando') return;
    await sessao.renovar();
  },
  async sair(): Promise<void> {
    const a = accessAtual;
    limpar();
    if (a) await postar('/auth/logout', {}, a).catch(() => undefined);
  },
};
