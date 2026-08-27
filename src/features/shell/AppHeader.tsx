'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/data/store';
import { getUsuarioAtual, logout } from '@/data/session';
import { Logo } from '@/design-system/Logo';
import { Button } from '@/design-system/components/Button';
import { ThemeToggle } from '@/design-system/components/ThemeToggle';

export function AppHeader() {
  const router = useRouter();
  const { state } = useStore();
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  const usuario = montado ? getUsuarioAtual(state) : null;

  function sair() {
    logout();
    router.replace('/login');
  }

  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
      <Logo />
      <div className="flex items-center gap-3">
        {usuario && (
          <span className="hidden text-sm text-text-muted sm:inline">
            {usuario.nome}
          </span>
        )}
        <ThemeToggle />
        <Button variant="ghost" size="sm" onClick={sair}>
          Sair
        </Button>
      </div>
    </header>
  );
}
