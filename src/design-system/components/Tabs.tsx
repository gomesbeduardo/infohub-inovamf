'use client';

import { useState, type ReactNode } from 'react';
import { cn } from '@/design-system/cn';

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

export function Tabs({ tabs }: { tabs: TabItem[] }) {
  const [ativo, setAtivo] = useState(tabs[0]?.id ?? '');
  const atual = tabs.find((t) => t.id === ativo) ?? tabs[0];

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={ativo === t.id}
            onClick={() => setAtivo(t.id)}
            className={cn(
              'px-3 py-2 text-sm transition-colors',
              ativo === t.id
                ? 'border-b-2 border-primary font-medium text-text'
                : 'text-text-muted hover:text-text',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">{atual?.content}</div>
    </div>
  );
}
