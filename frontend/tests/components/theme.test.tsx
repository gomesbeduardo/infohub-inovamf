import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
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

  it('o ícone mostra o tema atual: monitor no sistema, lua no escuro, sol no claro', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    const botao = screen.getByRole('button', { name: /tema/i });
    const icone = () => botao.querySelector('svg')?.getAttribute('data-icone');

    // sem preferência salva segue o sistema (claro no jsdom)
    expect(icone()).toBe('sistema');
    await user.click(botao);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(icone()).toBe('lua');
    await user.click(botao);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(icone()).toBe('sol');
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

describe('preferência "sistema"', () => {
  const original = window.matchMedia;
  let ouvintes: Array<() => void> = [];
  let escuroNoSistema = true;

  function instalarMatchMedia() {
    ouvintes = [];
    window.matchMedia = ((query: string) => ({
      media: query,
      matches: query.includes('prefers-color-scheme: dark') && escuroNoSistema,
      addEventListener: (_: string, cb: () => void) => ouvintes.push(cb),
      removeEventListener: (_: string, cb: () => void) => {
        ouvintes = ouvintes.filter((o) => o !== cb);
      },
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    })) as unknown as typeof window.matchMedia;
  }

  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    localStorage.clear();
    escuroNoSistema = true;
    instalarMatchMedia();
  });

  afterEach(() => {
    window.matchMedia = original;
    vi.restoreAllMocks();
  });

  it('sem preferência salva, segue o tema escuro do sistema', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('infohub-theme')).toBe('system');
  });

  it('acompanha a mudança do sistema em tempo real', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    escuroNoSistema = false;
    act(() => {
      ouvintes.forEach((cb) => cb());
    });
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('o botão percorre sistema → oposto → igual ao sistema → sistema', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    const botao = screen.getByRole('button', { name: /tema/i });

    await user.click(botao); // sistema (escuro) → claro
    expect(localStorage.getItem('infohub-theme')).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    await user.click(botao); // claro → escuro
    expect(localStorage.getItem('infohub-theme')).toBe('dark');

    await user.click(botao); // escuro → sistema
    expect(localStorage.getItem('infohub-theme')).toBe('system');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('deixa de seguir o sistema quando há preferência explícita', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    await user.click(screen.getByRole('button', { name: /tema/i })); // → claro

    escuroNoSistema = false;
    act(() => {
      ouvintes.forEach((cb) => cb());
    });
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
