import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/design-system/cn';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, placeholder, className, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(
        'h-11 w-full rounded-[0.625rem] border border-border bg-surface px-3.5 text-sm text-text transition-colors hover:border-border-strong focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] disabled:opacity-50 aria-[invalid=true]:border-primary',
        className,
      )}
      {...props}
    >
      {placeholder !== undefined && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
});
