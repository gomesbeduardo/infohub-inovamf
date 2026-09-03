'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

/** Tema efetivamente aplicado ao documento. */
export type Theme = 'light' | 'dark';
/** Preferência do usuário — `system` segue o tema do sistema operacional. */
export type ThemePreference = Theme | 'system';

const STORAGE_KEY = 'infohub-theme';
/** Cookie auxiliar: tema já resolvido, para o SSR não piscar quando a preferência é `system`. */
const RESOLVED_COOKIE = 'infohub-theme-resolvido';
const MEDIA_DARK = '(prefers-color-scheme: dark)';

function escreverCookie(nome: string, valor: string) {
  try {
    document.cookie = `${nome}=${valor}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    /* ignora */
  }
}

function salvarPreferencia(pref: ThemePreference, resolvido: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    /* ignora */
  }
  // cookies para o servidor aplicar o tema no SSR (sem flash entre sessões)
  escreverCookie(STORAGE_KEY, pref);
  escreverCookie(RESOLVED_COOKIE, resolvido);
}

function lerPreferenciaCliente(): ThemePreference | null {
  try {
    const ls = localStorage.getItem(STORAGE_KEY);
    if (ls === 'light' || ls === 'dark' || ls === 'system') return ls;
  } catch {
    /* ignora */
  }
  return null;
}

/** Tema do sistema operacional (padrão `light` quando não há suporte a matchMedia). */
export function temaDoSistema(): Theme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia?.(MEDIA_DARK)?.matches ? 'dark' : 'light';
}

function resolver(pref: ThemePreference): Theme {
  return pref === 'system' ? temaDoSistema() : pref;
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
  /** Preferência escolhida: `light`, `dark` ou `system`. */
  preference: ThemePreference;
  /** Tema aplicado de fato (`system` já resolvido). */
  theme: Theme;
  /** Alterna entre claro e escuro (fixa a preferência). */
  toggle: () => void;
  /** Percorre o ciclo claro → escuro → sistema. */
  cycle: () => void;
  setPreference: (p: ThemePreference) => void;
  /** @deprecated use `setPreference`. */
  setTheme: (t: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Próxima preferência do ciclo do botão: partindo de `system`, escolhe primeiro
 * o tema oposto ao do SO (a troca é visível), depois o outro e volta a `system`.
 */
function proximaPreferencia(atual: ThemePreference): ThemePreference {
  const sistema = temaDoSistema();
  const oposto: Theme = sistema === 'light' ? 'dark' : 'light';
  if (atual === 'system') return oposto;
  if (atual === oposto) return sistema;
  return 'system';
}

/**
 * Provider de tema. A preferência inicial vem do servidor (cookie) e o tema já
 * resolvido é aplicado como `data-theme` no <html> no SSR — sem flash. Quando a
 * preferência é `system`, o tema acompanha o SO em tempo real.
 */
export function ThemeProvider({
  children,
  initialPreference,
  initialTheme,
}: {
  children: ReactNode;
  initialPreference?: ThemePreference;
  /** Tema resolvido no servidor, usado só como primeiro valor de render. */
  initialTheme?: Theme;
}) {
  const [preference, setPreferenceState] = useState<ThemePreference>(
    initialPreference ?? 'system',
  );
  const [theme, setThemeState] = useState<Theme>(
    initialTheme ?? (initialPreference && initialPreference !== 'system'
      ? initialPreference
      : 'light'),
  );

  // fallback (ex.: testes, ou ausência de cookie): lê a preferência no cliente
  useEffect(() => {
    if (initialPreference) return;
    const stored = lerPreferenciaCliente();
    if (stored) setPreferenceState(stored);
  }, [initialPreference]);

  // aplica o tema resolvido e persiste a preferência
  useEffect(() => {
    const resolvido = resolver(preference);
    setThemeState(resolvido);
    document.documentElement.dataset.theme = resolvido;
    salvarPreferencia(preference, resolvido);
  }, [preference]);

  // acompanha mudanças do SO enquanto a preferência for `system`
  useEffect(() => {
    if (preference !== 'system') return;
    const mq = window.matchMedia?.(MEDIA_DARK);
    if (!mq) return;
    const aoMudar = () => {
      const resolvido = temaDoSistema();
      armarTransicao();
      setThemeState(resolvido);
      document.documentElement.dataset.theme = resolvido;
      escreverCookie(RESOLVED_COOKIE, resolvido);
    };
    mq.addEventListener?.('change', aoMudar);
    return () => mq.removeEventListener?.('change', aoMudar);
  }, [preference]);

  const setPreference = useCallback((p: ThemePreference) => {
    armarTransicao();
    setPreferenceState(p);
  }, []);

  const toggle = useCallback(() => {
    armarTransicao();
    setPreferenceState((p) => (resolver(p) === 'light' ? 'dark' : 'light'));
  }, []);

  const cycle = useCallback(() => {
    armarTransicao();
    setPreferenceState(proximaPreferencia);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        preference,
        theme,
        toggle,
        cycle,
        setPreference,
        setTheme: setPreference,
      }}
    >
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
