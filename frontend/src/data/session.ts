import type { AppState, Usuario } from '@/domain/types';

const KEY = 'infohub-usuario-id';

/** Id do usuário logado (mock), guardado em sessionStorage. */
export function getUsuarioIdAtual(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setUsuarioAtual(usuario: { id: string }): void {
  try {
    sessionStorage.setItem(KEY, usuario.id);
  } catch {
    /* ambiente sem sessionStorage: ignora */
  }
}

export function logout(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignora */
  }
}

/** Resolve o objeto do usuário logado a partir do estado. */
export function getUsuarioAtual(state: AppState): Usuario | null {
  const id = getUsuarioIdAtual();
  if (!id) return null;
  return state.usuarios.find((u) => u.id === id) ?? null;
}
