'use client';

import { cn } from '@/design-system/cn';
import { AlertIcon } from '@/design-system/icons';

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
 * Controle segmentado: opções exclusivas numa barra da altura de um `Input`,
 * com a ativa destacada como uma "pílula" em `surface`. Cores neutras de
 * propósito — a primária da marca é vermelha e, num campo, leria como erro;
 * ela aparece só no anel de foco. Radios nativos (visualmente ocultos) mantêm
 * setas, semântica de formulário e leitor de tela; a descrição de cada opção
 * vai como descrição acessível e, visível, só a da escolhida (linha reservada,
 * sem salto de layout).
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
  const escolhida = opcoes.find((o) => o.value === value);

  return (
    <fieldset className={cn('flex flex-col gap-2', className)} disabled={disabled}>
      <legend className="mb-2 text-sm font-medium text-text">{legenda}</legend>
      <div
        className={cn(
          'grid grid-cols-2 gap-1 rounded-[0.625rem] border bg-surface-sunken p-1 sm:flex',
          error ? 'border-danger' : 'border-border',
          disabled && 'opacity-50',
        )}
      >
        {opcoes.map((opcao) => {
          const selecionada = value === opcao.value;
          const descricaoId = `${name}-${opcao.value}-descricao`;
          const descritores = [opcao.descricao && descricaoId, error && errorId]
            .filter(Boolean)
            .join(' ');
          return (
            <label
              key={opcao.value}
              className={cn(
                'flex min-h-9 cursor-pointer items-center justify-center rounded-[0.5rem] border px-3 py-1.5 text-center text-sm leading-tight [text-wrap:balance] sm:flex-auto sm:whitespace-nowrap motion-safe:transition-[background-color,border-color,color,box-shadow] motion-safe:duration-[var(--duration-fast)] motion-safe:ease-[var(--ease-standard)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[color:var(--focus-ring)]',
                selecionada
                  ? 'border-border bg-surface font-medium text-text shadow-sm'
                  : 'border-transparent text-text-muted hover:text-text',
                disabled && 'cursor-not-allowed',
              )}
            >
              <input
                type="radio"
                name={name}
                value={opcao.value}
                checked={selecionada}
                onChange={() => onChange(opcao.value)}
                disabled={disabled}
                aria-describedby={descritores || undefined}
                className="sr-only"
              />
              {opcao.label}
            </label>
          );
        })}
      </div>
      {/* Fora dos <label> para não entrarem no nome acessível; referenciadas
          pelo aria-describedby de cada radio (elementos ocultos valem). */}
      <div hidden>
        {opcoes.map(
          (opcao) =>
            opcao.descricao && (
              <span key={opcao.value} id={`${name}-${opcao.value}-descricao`}>
                {opcao.descricao}
              </span>
            ),
        )}
      </div>
      {/* Só visual: o leitor de tela já recebe a descrição pelo próprio radio. */}
      <p data-dica aria-hidden="true" className="min-h-4 text-xs leading-4 text-text-muted">
        {escolhida?.descricao}
      </p>
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
