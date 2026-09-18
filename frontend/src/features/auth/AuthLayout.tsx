import { type ReactNode } from 'react';
import { Logo } from '@/design-system/Logo';
import { cn } from '@/design-system/cn';

export interface AuthLayoutProps {
  children: ReactNode;
  /** Largura do modal: login/recuperar = sm; cadastro = xl. */
  formWidth?: 'sm' | 'xl';
}

/**
 * Casca das telas de acesso: um modal centralizado sobre o fundo da marca
 * (o brilho de ignição do design system), seguindo tema claro/escuro. A marca
 * fica acima do cartão.
 */
export function AuthLayout({ children, formWidth = 'sm' }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-bg bg-hero-glow p-4 sm:p-6">
      <div
        className={cn(
          'flex w-full flex-col items-center gap-6',
          formWidth === 'xl' ? 'max-w-2xl' : 'max-w-sm',
        )}
      >
        <Logo size="lg" />
        {children}
      </div>
    </div>
  );
}
