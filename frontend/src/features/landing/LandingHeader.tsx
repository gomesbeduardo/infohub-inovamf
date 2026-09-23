'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/design-system/Logo';
import { cn } from '@/design-system/cn';

const BOTAO =
  'inline-flex h-9 items-center justify-center rounded-[0.625rem] px-3 text-sm font-medium tracking-[-0.01em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] sm:h-10 sm:px-4';

/**
 * Barra fixa da landing: só a marca e as duas portas de entrada — entrar
 * (quem já participa) e enviar a ideia (quem quer entrar). Transparente sobre
 * o brilho do hero; ganha fundo e borda depois que a página rola. O tema segue
 * o sistema aqui; a troca manual fica no painel, depois do login.
 */
export function LandingHeader() {
  const [rolou, setRolou] = useState(false);

  useEffect(() => {
    const atualizar = () => setRolou(window.scrollY > 8);
    atualizar();
    window.addEventListener('scroll', atualizar, { passive: true });
    return () => window.removeEventListener('scroll', atualizar);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b transition-colors duration-300',
        rolou
          ? 'border-border bg-[color:var(--bg)]/85 backdrop-blur'
          : 'border-transparent bg-transparent',
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link
          href="/"
          aria-label="InfoHub — início"
          className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
        >
          <Logo />
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/login"
            className={cn(BOTAO, 'border border-border bg-surface text-text hover:border-border-strong hover:bg-surface-sunken')}
          >
            Entrar
          </Link>
          <Link href="/cadastro" className={cn(BOTAO, 'bg-primary text-primary-fg shadow-sm hover:bg-primary-hover')}>
            Enviar minha ideia
          </Link>
        </div>
      </div>
    </header>
  );
}
