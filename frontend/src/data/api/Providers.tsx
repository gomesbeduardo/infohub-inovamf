'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from './erro';
import { sessao } from './sessao';

export function Providers({ children }: { children: ReactNode }) {
  const [cliente] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            // Erro 4xx é resposta de domínio: não adianta repetir.
            retry: (n, e) => !(e instanceof ApiError && e.status < 500) && n < 2,
          },
        },
      }),
  );
  useEffect(() => {
    void sessao.restaurar();
  }, []);
  return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
}
