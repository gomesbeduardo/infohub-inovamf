'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/design-system/Logo';
import { Button } from '@/design-system/components/Button';
import { ThemeToggle } from '@/design-system/components/ThemeToggle';
import { MenuIcon, CloseIcon } from '@/design-system/icons';
import { cn } from '@/design-system/cn';

const SECOES = [
  { href: '#o-que-e', rotulo: 'O que é' },
  { href: '#como-funciona', rotulo: 'Como funciona' },
  { href: '#equipes', rotulo: 'Equipes' },
  { href: '#casos', rotulo: 'Casos' },
];

/**
 * Barra fixa da landing: marca, âncoras das seções, tema e as duas ações do
 * programa — entrar (quem já participa) e enviar a ideia (quem quer entrar).
 */
export function LandingHeader() {
  const [aberto, setAberto] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-[color:var(--bg)]/85 backdrop-blur">
      <div className="ignition-rail" />
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="InfoHub — início" className="shrink-0">
          <Logo />
        </Link>

        <nav aria-label="Seções" className="ml-4 hidden gap-1 lg:flex">
          {SECOES.map((s) => (
            <a
              key={s.href}
              href={s.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-sunken hover:text-text"
            >
              {s.rotulo}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className="hidden sm:block">
            <Button variant="secondary">Entrar</Button>
          </Link>
          <Link href="/cadastro" className="hidden sm:block">
            <Button>Enviar minha ideia</Button>
          </Link>
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            aria-expanded={aberto}
            aria-controls="menu-landing"
            aria-label={aberto ? 'Fechar menu' : 'Abrir menu'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-text transition-colors hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] lg:hidden"
          >
            {aberto ? <CloseIcon size={18} /> : <MenuIcon size={18} />}
          </button>
        </div>
      </div>

      <div
        id="menu-landing"
        hidden={!aberto}
        className={cn('border-t border-border bg-surface px-4 py-3 lg:hidden')}
      >
        <nav aria-label="Seções (mobile)" className="flex flex-col">
          {SECOES.map((s) => (
            <a
              key={s.href}
              href={s.href}
              onClick={() => setAberto(false)}
              className="rounded-md px-3 py-2.5 text-sm font-medium text-text-muted hover:bg-surface-sunken hover:text-text"
            >
              {s.rotulo}
            </a>
          ))}
        </nav>
        <div className="mt-3 flex gap-2 sm:hidden">
          <Link href="/login" className="flex-1">
            <Button variant="secondary" className="w-full">
              Entrar
            </Button>
          </Link>
          <Link href="/cadastro" className="flex-1">
            <Button className="w-full">Enviar minha ideia</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
