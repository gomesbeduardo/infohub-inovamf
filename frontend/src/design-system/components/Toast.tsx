'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CheckIcon, CloseIcon } from '@/design-system/icons';

/** Quanto tempo o aviso fica na tela (B2). */
export const DURACAO_TOAST_MS = 4000;

export interface ToastApi {
  /** Confirma uma ação que DEU CERTO. Erro nunca vai para o toast: fica inline, com role="alert". */
  sucesso: (mensagem: string) => void;
}

// Fora do provider (ex.: um componente renderizado sozinho num teste) o toast
// é um no-op — nenhuma tela quebra por falta dele.
const Contexto = createContext<ToastApi>({ sucesso: () => {} });

interface Aviso {
  id: number;
  mensagem: string;
}

/**
 * Avisos de sucesso: somem em 4 s e podem ser fechados. Embaixo no celular, em
 * cima à direita no desktop. A entrada usa `.toast-in` (globals.css), que já é
 * desligada com prefers-reduced-motion — só anima para quem aceita movimento.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const proximo = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const fechar = useCallback((id: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setAvisos((lista) => lista.filter((a) => a.id !== id));
  }, []);

  const sucesso = useCallback(
    (mensagem: string) => {
      proximo.current += 1;
      const id = proximo.current;
      setAvisos((lista) => [...lista, { id, mensagem }]);
      timers.current.set(id, setTimeout(() => fechar(id), DURACAO_TOAST_MS));
    },
    [fechar],
  );

  useEffect(() => {
    const ativos = timers.current;
    return () => ativos.forEach((t) => clearTimeout(t));
  }, []);

  const api = useMemo(() => ({ sucesso }), [sucesso]);

  return (
    <Contexto.Provider value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-20 sm:items-end"
      >
        {avisos.map((a) => (
          <div
            key={a.id}
            className="toast-in pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-[0.625rem] border border-border bg-surface px-4 py-3 text-sm text-text shadow-md"
          >
            <CheckIcon size={18} className="shrink-0 text-success-text" />
            <span className="flex-1">{a.mensagem}</span>
            <button
              type="button"
              aria-label="Fechar aviso"
              onClick={() => fechar(a.id)}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
            >
              <CloseIcon size={16} />
            </button>
          </div>
        ))}
      </div>
    </Contexto.Provider>
  );
}

export function useToast(): ToastApi {
  return useContext(Contexto);
}
