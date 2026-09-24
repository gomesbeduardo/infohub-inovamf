import { type ReactNode } from 'react';
import Link from 'next/link';
import { Logo } from '@/design-system/Logo';
import { ArrowLeftIcon } from '@/design-system/icons';

export interface DocumentoLegalProps {
  titulo: string;
  /** Ex.: "Versão 2026-09". */
  subtitulo?: ReactNode;
  children: ReactNode;
}

/** Casca das páginas públicas de texto legal (/termos e /privacidade). */
export function DocumentoLegal({ titulo, subtitulo, children }: DocumentoLegalProps) {
  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" aria-label="InfoHub — início">
            <Logo />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text"
          >
            <ArrowLeftIcon size={16} />
            Voltar ao início
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <article className="flex flex-col gap-4 text-sm leading-relaxed text-text-muted sm:text-base [&_h2]:mt-6 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-text">
          <header className="mb-2 flex flex-col gap-1">
            <h1 className="font-display text-2xl font-bold tracking-tight text-text sm:text-3xl">{titulo}</h1>
            {subtitulo && <p className="text-sm text-text-subtle">{subtitulo}</p>}
          </header>
          {children}
        </article>
      </main>
    </div>
  );
}
