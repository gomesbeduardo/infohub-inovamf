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

  const Icone =
    preference === 'system' ? MonitorIcon : preference === 'dark' ? SunIcon : MoonIcon;

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
      <Icone size={18} />
    </button>
  );
}
