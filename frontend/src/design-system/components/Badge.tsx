import { type HTMLAttributes } from 'react';
import { cn } from '@/design-system/cn';

export type BadgeTone = 'neutral' | 'brand';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-sunken text-text-muted',
  brand: 'bg-primary-soft text-primary-text',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}
