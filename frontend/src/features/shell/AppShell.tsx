'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useUsuario } from '@/data/api/useSessao';
import { sessao } from '@/data/api/sessao';
import { Logo } from '@/design-system/Logo';
import { ThemeToggle } from '@/design-system/components/ThemeToggle';
import { ArrowLeftIcon } from '@/design-system/icons';
import { cn } from '@/design-system/cn';
import { navFor, homeFor, type NavItem } from '@/features/shell/nav';
import { SinoNotificacoes } from '@/features/shell/SinoNotificacoes';
import { PerfilMenu } from '@/features/shell/PerfilMenu';
import { BuscaRapida } from '@/features/shell/BuscaRapida';

type Largura = 'estreita' | 'media' | 'ampla';

const LARGURAS: Record<Largura, string> = {
  estreita: 'mx-auto w-full max-w-2xl',
  media: 'mx-auto w-full max-w-4xl',
  ampla: 'w-full',
};

/** Marca ativa o item cujo href é o prefixo mais longo da rota atual. */
function itemAtivo(itens: NavItem[], pathname: string): string | null {
  let ativo: string | null = null;
  let maior = -1;
  for (const it of itens) {
    const casa = pathname === it.href || pathname.startsWith(it.href + '/');
    if (casa && it.href.length > maior) {
      ativo = it.href;
      maior = it.href.length;
    }
  }
  return ativo;
}

export interface AppShellProps {
  children: ReactNode;
  largura?: Largura;
  back?: { href: string; label: string };
}

/**
 * Casca comum das áreas internas: cabeçalho com a marca + ações e uma barra de
 * navegação por perfil. Todas as páginas logadas passam por aqui — é o que dá
 * estrutura e consistência entre as telas.
 */
export function AppShell({ children, largura = 'ampla', back }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const usuario = useUsuario();
  const cliente = useQueryClient();
  const itens = usuario ? navFor(usuario.role) : [];
  const ativo = itemAtivo(itens, pathname);
  const mostrarNav = itens.length >= 2;

  async function sair() {
    await sessao.sair();
    cliente.clear();
    router.replace('/login');
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <div className="sticky top-0 z-30">
        <header className="relative z-10 flex items-center justify-between gap-3 border-b border-border bg-surface/90 px-4 py-3 backdrop-blur sm:px-6">
          <Link
            href={usuario ? homeFor(usuario.role) : '/login'}
            aria-label="InfoHub — início"
            className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
          >
            <Logo />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            {usuario && (usuario.role === 'admin' || usuario.role === 'mentor') && (
              <BuscaRapida papel={usuario.role} />
            )}
            {usuario && <SinoNotificacoes usuario={usuario} />}
            <ThemeToggle />
            {usuario && <PerfilMenu usuario={usuario} onSair={sair} />}
          </div>
        </header>

        {mostrarNav && (
          <nav
            aria-label="Seções"
            className="scroll-suave flex gap-1 overflow-x-auto border-b border-border bg-surface/90 px-2 backdrop-blur sm:px-4"
          >
            {itens.map(({ href, label, Icon }) => {
              const on = ativo === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={on ? 'page' : undefined}
                  className={cn(
                    'flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                    on
                      ? 'border-primary text-text'
                      : 'border-transparent text-text-muted hover:text-text',
                  )}
                >
                  <Icon size={17} />
                  {label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      <main className={cn('motion-fade flex-1 p-4 sm:p-6', LARGURAS[largura])}>
        {back && (
          <Link
            href={back.href}
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text"
          >
            <ArrowLeftIcon size={16} />
            {back.label}
          </Link>
        )}
        {children}
      </main>
    </div>
  );
}
