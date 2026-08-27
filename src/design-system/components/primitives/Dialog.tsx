'use client';

import * as RD from '@radix-ui/react-dialog';
import { type ReactNode } from 'react';

/**
 * Dialog tematizado sobre o Radix (primitivo shadcn). Controlado por `open`.
 * Usa os tokens `--overlay` e `--surface` para funcionar em light/dark.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <RD.Portal>
        <RD.Overlay
          className="fixed inset-0 z-40"
          style={{ background: 'var(--overlay)' }}
        />
        <RD.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-3 overflow-y-auto rounded-xl border border-border bg-surface p-5 shadow-lg focus:outline-none">
          <RD.Title className="text-lg font-semibold text-text">
            {title}
          </RD.Title>
          {description ? (
            <RD.Description className="text-sm text-text-muted">
              {description}
            </RD.Description>
          ) : (
            <RD.Description className="sr-only">{title}</RD.Description>
          )}
          {children}
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}
