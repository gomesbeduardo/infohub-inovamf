'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/data/store';
import { getUsuarioAtual } from '@/data/session';
import { homeFor } from '@/features/shell/nav';
import type { TipoUsuario } from '@/domain/types';

/**
 * Guarda de rota client-side sobre a sessão mockada. Sem sessão → /login; tipo
 * incompatível → área correta. Lê o sessionStorage só após montar (evita
 * mismatch de hydration entre servidor e cliente).
 */
export function AuthGuard({
  permitido,
  children,
}: {
  permitido: TipoUsuario[];
  children: ReactNode;
}) {
  const router = useRouter();
  const { state } = useStore();
  const [montado, setMontado] = useState(false);

  useEffect(() => setMontado(true), []);

  const usuario = montado ? getUsuarioAtual(state) : null;
  const autorizado = !!usuario && permitido.includes(usuario.tipo);

  useEffect(() => {
    if (!montado) return;
    if (!usuario) {
      router.replace('/login');
    } else if (!permitido.includes(usuario.tipo)) {
      router.replace(homeFor(usuario.tipo));
    }
  }, [montado, usuario, permitido, router]);

  if (!autorizado) return null;
  return <>{children}</>;
}
