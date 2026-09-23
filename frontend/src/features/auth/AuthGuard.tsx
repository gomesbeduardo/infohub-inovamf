'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useSessao } from '@/data/api/useSessao';
import { homeFor } from '@/features/shell/nav';
import type { TipoUsuario } from '@/domain/types';

/**
 * Guarda de rota client-side sobre a sessão real (JWT). Sem sessão → /login;
 * papel incompatível → área correta.
 */
export function AuthGuard({ permitido, children }: { permitido: TipoUsuario[]; children: ReactNode }) {
  const router = useRouter();
  const s = useSessao();
  const papel = s.status === 'autenticado' ? s.usuario.role : null;

  useEffect(() => {
    if (s.status === 'anonimo') router.replace('/login');
    else if (papel && !permitido.includes(papel)) router.replace(homeFor(papel));
  }, [s.status, papel, permitido, router]);

  if (!papel || !permitido.includes(papel)) return null;
  return <>{children}</>;
}
