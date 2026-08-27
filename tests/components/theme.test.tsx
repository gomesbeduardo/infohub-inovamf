import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/design-system/theme';
import { ThemeToggle } from '@/design-system/components/ThemeToggle';

describe('ThemeProvider + ThemeToggle', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    localStorage.clear();
  });

  it('inicia em light e alterna para dark e volta ao clicar', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    // efeito inicial aplica o tema default (light) no <html>
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    const botao = screen.getByRole('button', { name: /tema/i });

    await user.click(botao);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    await user.click(botao);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('persiste a escolha em localStorage', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    await user.click(screen.getByRole('button', { name: /tema/i }));
    expect(localStorage.getItem('infohub-theme')).toBe('dark');
  });
});
