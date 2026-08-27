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
        'h-10 w-full rounded-md border border-border bg-surface-sunken px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] disabled:opacity-50 aria-[invalid=true]:border-primary',
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
