import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/design-system/cn';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'h-10 w-full rounded-md border border-border bg-surface-sunken px-3 text-sm text-text placeholder:text-text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] disabled:opacity-50 aria-[invalid=true]:border-primary',
          className,
        )}
        {...props}
      />
    );
  },
);
