import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/design-system/cn';

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 4, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        'w-full rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm text-text placeholder:text-text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] disabled:opacity-50 aria-[invalid=true]:border-primary',
        className,
      )}
      {...props}
    />
  );
});
