'use client';

import { type MouseEvent, type ReactNode } from 'react';
import { Card } from '@/design-system/components/Card';
import { cn } from '@/design-system/cn';

interface SpotlightCardProps {
  className?: string;
  children: ReactNode;
}

/**
 * Card com um brilho radial na cor da marca que segue o cursor (mais lift
 * sutil no hover). O rastreio grava --spot-x/--spot-y direto no elemento — sem
 * re-render — e o estilo vive em `.spotlight-card` (globals.css), que usa o
 * token --primary e por isso adapta sozinho aos modos claro/escuro.
 */
export function SpotlightCard({ className, children }: SpotlightCardProps) {
  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    el.style.setProperty(
      '--spot-x',
      `${((event.clientX - rect.left) / rect.width) * 100}%`,
    );
    el.style.setProperty(
      '--spot-y',
      `${((event.clientY - rect.top) / rect.height) * 100}%`,
    );
  }

  return (
    <Card className={cn('spotlight-card', className)} onMouseMove={handleMouseMove}>
      {children}
    </Card>
  );
}
