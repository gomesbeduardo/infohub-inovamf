import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';
import { cn } from '@/design-system/cn';
import { AlertIcon } from '@/design-system/icons';

export interface FormFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Envolve um controle de formulário com label, dica e mensagem de erro,
 * cuidando das associações de acessibilidade (`aria-describedby`,
 * `aria-invalid`) por clonagem do filho.
 */
export function FormField({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: FormFieldProps) {
  const errorId = htmlFor ? `${htmlFor}-error` : undefined;
  const hintId = htmlFor ? `${htmlFor}-hint` : undefined;
  const describedBy =
    [error ? errorId : null, hint && !error ? hintId : null]
      .filter(Boolean)
      .join(' ') || undefined;

  const control = isValidElement(children)
    ? cloneElement(children as ReactElement, {
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
      })
    : children;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-text">
        {label}
      </label>
      {control}
      {hint && !error && (
        <p id={hintId} className="text-xs text-text-muted">
          {hint}
        </p>
      )}
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
    </div>
  );
}
