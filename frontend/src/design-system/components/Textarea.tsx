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
        'w-full rounded-[0.625rem] border border-border bg-surface px-3.5 py-2.5 text-sm text-text transition-colors placeholder:text-text-subtle hover:border-border-strong focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] disabled:opacity-50 aria-[invalid=true]:border-primary',
        className,
      )}
      {...props}
    />
  );
});
