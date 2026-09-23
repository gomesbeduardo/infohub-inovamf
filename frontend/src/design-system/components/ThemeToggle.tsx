'use client';

import { useTheme } from '@/design-system/theme';
import { cn } from '@/design-system/cn';
import { SunIcon, MoonIcon, MonitorIcon } from '@/design-system/icons';

const ROTULO = {
  light: 'Tema claro',
  dark: 'Tema escuro',
  system: 'Tema do sistema',
} as const;

/** Botão que percorre o ciclo de temas: claro, escuro e o tema do sistema. */
export function ThemeToggle({ className }: { className?: string }) {
  const { preference, theme, cycle } = useTheme();

  // O ícone mostra o tema ATUAL (como o rótulo acessível), não o próximo: o
  // ciclo tem três estados, então "o oposto" nem sempre é para onde o clique leva.
  const [Icone, nomeIcone] =
    preference === 'system'
      ? [MonitorIcon, 'sistema']
      : preference === 'dark'
        ? [MoonIcon, 'lua']
        : [SunIcon, 'sol'];

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Alternar tema (atual: ${ROTULO[preference]}${
        preference === 'system' ? `, ${ROTULO[theme].toLowerCase()}` : ''
      })`}
      title="Alternar tema"
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-text transition-colors hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]',
        className,
      )}
    >
      <Icone size={18} data-icone={nomeIcone} />
    </button>
  );
}
