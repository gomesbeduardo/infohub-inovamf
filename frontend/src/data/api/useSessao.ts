'use client';
import { useSyncExternalStore } from 'react';
import { sessao, type EstadoSessao, type UsuarioSessao } from './sessao';

const CARREGANDO: EstadoSessao = { status: 'carregando' };

export function useSessao(): EstadoSessao {
  return useSyncExternalStore(sessao.assinar, sessao.estado, () => CARREGANDO);
}

export function useUsuario(): UsuarioSessao | null {
  const s = useSessao();
  return s.status === 'autenticado' ? s.usuario : null;
}
