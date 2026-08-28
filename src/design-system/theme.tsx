'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'infohub-theme';

function salvarTema(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignora */
  }
  try {
    // cookie para o servidor aplicar o tema no SSR (sem flash entre sessões)
    document.cookie = `${STORAGE_KEY}=${theme}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    /* ignora */
  }
}

function lerTemaCliente(): Theme | null {
  try {
    const ls = localStorage.getItem(STORAGE_KEY);
    if (ls === 'light' || ls === 'dark') return ls;
  } catch {
    /* ignora */
  }
  return null;
}

/** Arma o cross-fade de tema por ~320ms em volta da troca (ver globals.css). */
function armarTransicao() {
  if (typeof document === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;
  const html = document.documentElement;
  html.classList.add('theme-trocando');
  window.setTimeout(() => html.classList.remove('theme-trocando'), 320);
}

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Provider de tema. O tema inicial vem do servidor (cookie), aplicado como
 * `data-theme` no <html> já no SSR — sem flash. Persiste em cookie + localStorage.
 */
export function ThemeProvider({
  children,
  initialTheme,
}: {
  children: ReactNode;
  initialTheme?: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(initialTheme ?? 'light');

  // fallback (ex.: testes, ou ausência de cookie): lê a preferência no cliente
  useEffect(() => {
    if (initialTheme) return;
    const stored = lerTemaCliente();
    if (stored) setThemeState(stored);
  }, [initialTheme]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    salvarTema(theme);
  }, [theme]);

  const setTheme = (t: Theme) => {
    armarTransicao();
    setThemeState(t);
  };
  const toggle = () => {
    armarTransicao();
    setThemeState((t) => (t === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme deve ser usado dentro de <ThemeProvider>');
  }
  return ctx;
}
