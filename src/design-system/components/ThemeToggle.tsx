'use client';

import { useTheme } from '@/design-system/theme';
import { cn } from '@/design-system/cn';

/** Botão que alterna entre tema claro e escuro. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Mudar para o tema claro' : 'Mudar para o tema escuro'}
      title="Alternar tema"
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-text transition-colors hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]',
        className,
      )}
    >
      <span aria-hidden>{isDark ? '☀️' : '🌙'}</span>
    </button>
  );
}
