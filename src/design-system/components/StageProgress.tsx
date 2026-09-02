import { cn } from '@/design-system/cn';
import { CheckIcon } from '@/design-system/icons';

export interface StageProgressEtapa {
  id: number;
  numero: number;
  nome: string;
}

export interface StageProgressProps {
  etapas: StageProgressEtapa[];
  /** Número da etapa atual da equipe. */
  atualId: number;
  /** Equipe já concluiu o funil (pronta/encaminhada ao InovAMF). */
  pronta?: boolean;
  className?: string;
}

/**
 * Trilha vertical do funil: mostra em que ponto a equipe está. Etapas
 * concluídas com check, a atual destacada e as futuras esmaecidas — mais o nó
 * final do programa InovAMF.
 */
export function StageProgress({
  etapas,
  atualId,
  pronta = false,
  className,
}: StageProgressProps) {
  const ordenadas = [...etapas].sort((a, b) => a.numero - b.numero);

  return (
    <ol className={cn('relative flex flex-col', className)}>
      {ordenadas.map((et, i) => {
        const concluida = pronta || et.numero < atualId;
        const atual = !pronta && et.numero === atualId;
        const ultimo = i === ordenadas.length - 1;
        return (
          <li key={et.id} className="relative flex gap-3 pb-5 last:pb-0">
            {!ultimo && (
              <span
                aria-hidden
                className={cn(
                  'absolute left-[13px] top-7 h-[calc(100%-1.25rem)] w-0.5 rounded',
                  concluida ? 'bg-primary/40' : 'bg-border',
                )}
              />
            )}
            <span
              aria-hidden
              className={cn(
                'z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
                concluida && 'text-[color:var(--primary-fg)]',
                atual &&
                  'text-[color:var(--primary-fg)] ring-2 ring-[color:var(--focus-ring)] ring-offset-2 ring-offset-surface',
                !concluida && !atual && 'border border-border bg-surface text-text-subtle',
              )}
              style={
                concluida || atual
                  ? { background: `var(--stage-${et.numero})` }
                  : undefined
              }
            >
              {concluida ? <CheckIcon size={15} strokeWidth={3} /> : et.numero}
            </span>
            <div className="flex flex-col pt-0.5">
              <span
                className={cn(
                  'text-sm',
                  atual ? 'font-semibold text-text' : concluida ? 'text-text' : 'text-text-subtle',
                )}
              >
                {et.nome}
              </span>
              {atual && (
                <span className="text-xs font-medium text-primary-text">
                  Etapa atual
                </span>
              )}
            </div>
          </li>
        );
      })}

      <li className="relative flex gap-3">
        <span
          aria-hidden
          className={cn(
            'z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
            pronta
              ? 'text-white'
              : 'border border-dashed border-border bg-surface text-text-subtle',
          )}
          style={pronta ? { background: 'var(--stage-pronta)' } : undefined}
        >
          <CheckIcon size={15} strokeWidth={3} />
        </span>
        <div className="flex flex-col pt-0.5">
          <span className={cn('text-sm', pronta ? 'font-semibold text-text' : 'text-text-subtle')}>
            Programa InovAMF
          </span>
          {pronta && (
            <span className="text-xs font-medium text-success-text">Concluído</span>
          )}
        </div>
      </li>
    </ol>
  );
}
