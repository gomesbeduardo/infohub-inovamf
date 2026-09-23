'use client';

import { useNumerosPublicos } from '@/data/api/consultas';

type ChaveNumero = 'ideias' | 'equipesEmAndamento' | 'alunos' | 'cursos';

const ORDEM: ChaveNumero[] = ['ideias', 'equipesEmAndamento', 'alunos', 'cursos'];

const ROTULOS: Record<ChaveNumero, string> = {
  ideias: 'ideias recebidas',
  equipesEmAndamento: 'equipes em andamento',
  alunos: 'alunos participando',
  cursos: 'cursos representados',
};

const formatador = new Intl.NumberFormat('pt-BR');

/**
 * Números reais do hero da landing (issue #157), vindos de GET /publico/numeros.
 * Nunca mostra valor inventado: carregando, um placeholder do mesmo tamanho
 * (sem salto de layout); em erro, o `<dl>` inteiro some.
 */
export function NumerosVitrine() {
  const numeros = useNumerosPublicos();

  if (numeros.isError) return null;

  if (numeros.isPending) {
    return (
      <dl
        className="mt-10 grid grid-cols-2 gap-4 border-t border-border pt-6 sm:grid-cols-4"
        aria-busy="true"
      >
        {ORDEM.map((chave) => (
          <div key={chave}>
            <dt className="sr-only">{ROTULOS[chave]}</dt>
            <dd>
              <span
                aria-hidden
                className="block h-8 w-16 motion-safe:animate-pulse rounded-[0.375rem] bg-surface-sunken"
              />
              <span className="mt-0.5 block text-xs leading-snug text-text-muted">
                {ROTULOS[chave]}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  const valores = numeros.data;

  return (
    <dl className="mt-10 grid grid-cols-2 gap-4 border-t border-border pt-6 sm:grid-cols-4">
      {ORDEM.map((chave) => (
        <div key={chave}>
          <dt className="sr-only">{ROTULOS[chave]}</dt>
          <dd>
            <span className="block font-display text-2xl font-bold tabular-nums text-text">
              {formatador.format(valores[chave])}
            </span>
            <span className="mt-0.5 block text-xs leading-snug text-text-muted">
              {ROTULOS[chave]}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
