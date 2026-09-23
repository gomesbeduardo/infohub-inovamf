'use client';

import { cn } from '@/design-system/cn';
import { AlertIcon, CheckIcon } from '@/design-system/icons';

export interface OpcaoSegmentada<T extends string = string> {
  value: T;
  label: string;
  /** Dica curta opcional exibida abaixo do rótulo da opção. */
  descricao?: string;
}

export interface OpcoesSegmentadasProps<T extends string = string> {
  /** Nome compartilhado pelos radios nativos do grupo. */
  name: string;
  /** Rótulo do grupo, renderizado como `<legend>`. */
  legenda: string;
  opcoes: OpcaoSegmentada<T>[];
  value: T | '';
  onChange: (value: T) => void;
  error?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Grupo de opções exclusivas renderizado como "pills"/cartões selecionáveis,
 * mantendo radios nativos (ocultos visualmente, ainda focáveis) para que
 * navegação por setas, semântica de formulário e leitores de tela funcionem
 * normalmente. Segue o mesmo vocabulário visual de `FormField` (legenda,
 * erro) e dos demais controles do design system (raio, borda, anel de foco).
 */
export function OpcoesSegmentadas<T extends string = string>({
  name,
  legenda,
  opcoes,
  value,
  onChange,
  error,
  disabled,
  className,
}: OpcoesSegmentadasProps<T>) {
  const errorId = `${name}-error`;

  return (
    <fieldset className={cn('flex flex-col gap-2', className)} disabled={disabled}>
      <legend className="text-sm font-medium text-text">{legenda}</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {opcoes.map((opcao) => {
          const selecionada = value === opcao.value;
          return (
            <label
              key={opcao.value}
              className={cn(
                'relative flex cursor-pointer flex-col gap-0.5 rounded-[0.625rem] border px-3 py-2.5 text-sm transition-colors has-[:focus-visible]:outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-bg has-[:focus-visible]:ring-[color:var(--focus-ring)]',
                selecionada
                  ? 'border-primary bg-primary-soft text-primary-text'
                  : 'border-border bg-surface text-text hover:border-border-strong',
                disabled && 'cursor-not-allowed opacity-50',
              )}
            >
              <input
                type="radio"
                name={name}
                value={opcao.value}
                checked={selecionada}
                onChange={() => onChange(opcao.value)}
                disabled={disabled}
                aria-describedby={error ? errorId : undefined}
                className="sr-only"
              />
              <span className="flex items-center gap-1.5 font-medium leading-tight">
                {selecionada && <CheckIcon size={14} className="shrink-0" />}
                {opcao.label}
              </span>
              {opcao.descricao && (
                <span
                  className={cn(
                    'text-xs leading-snug',
                    selecionada ? 'text-primary-text' : 'text-text-muted',
                  )}
                >
                  {opcao.descricao}
                </span>
              )}
            </label>
          );
        })}
      </div>
      {error && (
        <p
          id={errorId}
          role="alert"
          className="flex items-center gap-1.5 text-xs font-medium text-danger-text"
        >
          <AlertIcon size={14} className="shrink-0" />
          {error}
        </p>
      )}
    </fieldset>
  );
}
