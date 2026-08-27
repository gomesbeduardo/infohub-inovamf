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

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Provider de tema. Aplica `data-theme` no <html> e persiste em localStorage.
 * Hydration-safe: renderiza sempre com o default 'light' no servidor; a
 * preferência salva é lida só no cliente, após montar.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  // lê a preferência persistida só no cliente (evita mismatch de hydration)
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      stored = null;
    }
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored);
    }
  }, []);

  // aplica o tema no <html> e persiste
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ambiente sem localStorage: ignora persistência */
    }
  }, [theme]);

  const toggle = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

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
